package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

class WorkspaceDemoTaskBoardMigrationTest {
  private final ObjectMapper mapper = new ObjectMapper();
  private final List<String> presets =
      List.of("routinecare", "studymate", "pantryshare", "sprintdesk");
  private final Map<String, Long> userIds =
      Map.of(
          "kim.hakseup@devpath.com", 101L,
          "park.juseung@devpath.com", 102L,
          "kim.taehyung@devpath.com", 103L);

  @ParameterizedTest
  @ValueSource(strings = {"postgresql", "oracle"})
  void assignsOnlyUntouchedDemoTasksAndPreservesOtherWorkspacesAndManualChanges(String vendor)
      throws Exception {
    try (var connection = DriverManager.getConnection("jdbc:h2:mem:demo_task_boards_" + vendor)) {
      var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
      boolean oracle = vendor.equals("oracle");
      String booleanType = oracle ? "INTEGER" : "BOOLEAN";
      Object active = oracle ? 0 : false;
      Object deleted = oracle ? 1 : true;
      jdbc.execute("CREATE TABLE users (user_id BIGINT PRIMARY KEY, email VARCHAR(200))");
      jdbc.execute(
          "CREATE TABLE workspace (id BIGINT PRIMARY KEY, owner_id BIGINT, type VARCHAR(20), is_deleted "
              + booleanType
              + ")");
      jdbc.execute(
          "CREATE TABLE workspace_member (workspace_id BIGINT, learner_id BIGINT, position_label VARCHAR(80))");
      jdbc.execute(
          "CREATE TABLE workspace_code_reviews (workspace_id BIGINT, external_provider VARCHAR(20), external_id VARCHAR(200), is_deleted "
              + booleanType
              + ")");
      jdbc.execute(
          "CREATE TABLE workspace_task (id BIGINT PRIMARY KEY, workspace_id BIGINT, title VARCHAR(500), assignee_id BIGINT, status VARCHAR(30), created_by_id BIGINT, is_deleted "
              + booleanType
              + ", updated_at TIMESTAMP)");
      for (var user : userIds.entrySet()) {
        jdbc.update("INSERT INTO users VALUES (?, ?)", user.getValue(), user.getKey());
      }
      jdbc.update("INSERT INTO users VALUES (104, 'other@devpath.com')");
      long taskId = 1;
      for (int index = 0; index < presets.size(); index++) {
        long workspaceId = 11L + index;
        String preset = presets.get(index);
        seedWorkspace(jdbc, workspaceId, 101L, "DEMO", reviewKey(preset), active, active);
        for (JsonNode task : board(preset)) {
          jdbc.update(
              "INSERT INTO workspace_task VALUES (?, ?, ?, NULL, 'TODO', 101, ?, NULL)",
              taskId++,
              workspaceId,
              task.path("title").asText(),
              active);
        }
      }
      String title = board("routinecare").get(0).path("title").asText();
      String key = reviewKey("routinecare");
      seedWorkspace(jdbc, 21, 104, "DEMO", key, active, active);
      seedWorkspace(jdbc, 22, 101, "GITHUB", key, active, active);
      seedWorkspace(jdbc, 23, 101, "DEMO", key, deleted, active);
      seedWorkspace(jdbc, 24, 101, "DEMO", key, active, deleted);
      seedWorkspace(jdbc, 25, 101, "DEMO", "unrelated-review", active, active);
      seedWorkspace(jdbc, 26, 101, "DEMO", key, active, active);
      jdbc.update("DELETE FROM workspace_member WHERE workspace_id=26 AND learner_id=103");
      for (long id = 21; id <= 26; id++) {
        jdbc.update(
            "INSERT INTO workspace_task VALUES (?, ?, ?, NULL, 'TODO', 101, ?, NULL)",
            100 + id,
            id,
            title,
            active);
      }
      jdbc.update(
          "INSERT INTO workspace_task VALUES (201,11,?,102,'TODO',101,?,NULL)", title, active);
      jdbc.update(
          "INSERT INTO workspace_task VALUES (202,11,?,NULL,'IN_PROGRESS',101,?,NULL)",
          title,
          active);
      jdbc.update(
          "INSERT INTO workspace_task VALUES (203,11,?,NULL,'TODO',101,?,NULL)", title, deleted);
      jdbc.update(
          "INSERT INTO workspace_task VALUES (204,11,?,NULL,'TODO',104,?,NULL)", title, active);
      jdbc.update(
          "INSERT INTO workspace_task VALUES (205,11,'직접 만든 작업',NULL,'TODO',101,?,NULL)", active);
      jdbc.update(
          "UPDATE workspace_member SET position_label='프론트 리드' WHERE workspace_id=12 AND learner_id=101");
      var resource =
          new EncodedResource(
              new ClassPathResource(
                  "db/migration/" + vendor + "/V5__assign_demo_project_task_boards.sql"),
              StandardCharsets.UTF_8);

      ScriptUtils.executeSqlScript(connection, resource);
      var firstRun = jdbc.queryForList("SELECT * FROM workspace_task ORDER BY id");
      ScriptUtils.executeSqlScript(connection, resource);
      assertThat(jdbc.queryForList("SELECT * FROM workspace_task ORDER BY id")).isEqualTo(firstRun);

      taskId = 1;
      for (String preset : presets) {
        for (JsonNode task : board(preset)) {
          var actual =
              jdbc.queryForMap(
                  "SELECT assignee_id, status FROM workspace_task WHERE id=?", taskId++);
          assertThat(actual.get("ASSIGNEE_ID"))
              .isEqualTo(userIds.get(task.path("assigneeEmail").asText()));
          assertThat(actual.get("STATUS")).isEqualTo(task.path("status").asText());
        }
      }
      assertThat(
              jdbc.queryForObject(
                  "SELECT count(*) FROM workspace_task WHERE id BETWEEN 121 AND 126 AND assignee_id IS NULL AND status='TODO' AND updated_at IS NULL",
                  Integer.class))
          .isEqualTo(6);
      assertThat(
              jdbc.queryForObject(
                  "SELECT assignee_id FROM workspace_task WHERE id=201", Long.class))
          .isEqualTo(102L);
      assertThat(
              jdbc.queryForObject("SELECT status FROM workspace_task WHERE id=202", String.class))
          .isEqualTo("IN_PROGRESS");
      assertThat(
              jdbc.queryForObject(
                  "SELECT count(*) FROM workspace_task WHERE id BETWEEN 201 AND 205 AND updated_at IS NULL",
                  Integer.class))
          .isEqualTo(5);
      assertThat(
              jdbc.queryForObject(
                  "SELECT position_label FROM workspace_member WHERE workspace_id=11 AND learner_id=101",
                  String.class))
          .isEqualTo("Frontend 개발자");
      assertThat(
              jdbc.queryForObject(
                  "SELECT position_label FROM workspace_member WHERE workspace_id=11 AND learner_id=102",
                  String.class))
          .isEqualTo("QA·테스트");
      assertThat(
              jdbc.queryForObject(
                  "SELECT position_label FROM workspace_member WHERE workspace_id=11 AND learner_id=103",
                  String.class))
          .isEqualTo("Backend·인프라");
      assertThat(
              jdbc.queryForObject(
                  "SELECT position_label FROM workspace_member WHERE workspace_id=12 AND learner_id=101",
                  String.class))
          .isEqualTo("프론트 리드");
      assertThat(
              jdbc.queryForObject(
                  "SELECT count(*) FROM workspace_member WHERE workspace_id BETWEEN 21 AND 25 AND learner_id=101 AND position_label='OWNER'",
                  Integer.class))
          .isEqualTo(5);
    }
  }

  private void seedWorkspace(
      JdbcTemplate jdbc,
      long id,
      long ownerId,
      String provider,
      String reviewKey,
      Object deleted,
      Object reviewDeleted) {
    jdbc.update("INSERT INTO workspace VALUES (?, ?, 'SQUAD', ?)", id, ownerId, deleted);
    jdbc.update(
        "INSERT INTO workspace_code_reviews VALUES (?, ?, ?, ?)",
        id,
        provider,
        reviewKey,
        reviewDeleted);
    jdbc.update("INSERT INTO workspace_member VALUES (?,101,'OWNER')", id);
    jdbc.update("INSERT INTO workspace_member VALUES (?,102,NULL)", id);
    jdbc.update("INSERT INTO workspace_member VALUES (?,103,NULL)", id);
  }

  private JsonNode board(String preset) throws Exception {
    try (var input =
        new ClassPathResource("demo/workspace/" + preset + "-board.json").getInputStream()) {
      return mapper.readTree(input);
    }
  }

  private String reviewKey(String preset) throws Exception {
    try (var input =
        new ClassPathResource("demo/workspace/" + preset + "-review.json").getInputStream()) {
      return mapper.readTree(input).path("key").asText();
    }
  }
}
