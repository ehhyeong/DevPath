package com.devpath.bootstrap.seed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

class LocalSeedSqlExecutorTest {

  private EmbeddedDatabase database;

  @AfterEach
  void tearDown() {
    if (database != null) {
      database.shutdown();
    }
  }

  @Test
  void querySeedResourcesRemainExecutableAndKeepRequiredRowCounts() {
    database =
        new EmbeddedDatabaseBuilder()
            .generateUniqueName(true)
            .setType(EmbeddedDatabaseType.H2)
            .build();
    LocalSeedSqlExecutor executor = new LocalSeedSqlExecutor(new JdbcTemplate(database));
    Map<String, Integer> expectedRows = new LinkedHashMap<>();
    expectedRows.put("db/local/workspace-hub-project-seeds.sql", 3);
    expectedRows.put("db/local/legacy-seed-password-accounts.sql", 13);
    expectedRows.put("db/local/learner-workspace-accounts.sql", 6);
    expectedRows.put("db/local/mentoring-hub-seeds.sql", 7);
    expectedRows.put("db/local/lounge-user-seeds.sql", 9);
    expectedRows.put("db/local/lounge-post-seeds.sql", 13);
    expectedRows.put("db/local/project-experience-users.sql", 4);
    expectedRows.put("db/local/project-experience-projects.sql", 3);
    expectedRows.put("db/local/project-experience-showcases.sql", 3);
    expectedRows.put("db/local/test-accounts.sql", 3);
    expectedRows.put("db/local/learner-workspace/hub-squad-accounts.sql", 2);
    expectedRows.put("db/local/learner-workspace/hub-squad-milestones.sql", 3);
    expectedRows.put("db/local/learner-workspace/hub-squad-tasks.sql", 5);
    expectedRows.put("db/local/learner-workspace/hub-squad-calendar-events.sql", 3);
    expectedRows.put("db/local/learner-workspace/hub-squad-docs.sql", 3);
    expectedRows.put("db/local/learner-workspace/hub-squad-files.sql", 2);
    expectedRows.put("db/local/learner-workspace/hub-squad-meeting-notes.sql", 2);
    expectedRows.put("db/local/learner-workspace/hub-squad-notices.sql", 2);
    expectedRows.put("db/local/learner-workspace/hub-squad-qna.sql", 1);
    expectedRows.put("db/local/learner-workspace/hub-squad-activity-logs.sql", 5);

    expectedRows.forEach(
        (resource, expectedCount) -> {
          List<String> rows =
              executor.query(resource, (resultSet, rowNumber) -> resultSet.getString(1));
          assertThat(rows).as(resource).hasSize(expectedCount);
        });
  }

  @Test
  void executeLoadsUtf8SqlWithoutChangingItsContent() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    LocalSeedSqlExecutor executor = new LocalSeedSqlExecutor(jdbcTemplate);

    executor.execute("db/local/frontend-draft-course.sql");

    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).execute(sqlCaptor.capture());
    assertThat(sqlCaptor.getValue())
        .startsWith("DO $$")
        .contains("HTML CSS JavaScript 렌더링 입문")
        .contains("assignment_rubrics");
  }

  @Test
  void executeSeparatedRunsEveryStatementWithTheConfiguredSeparator() {
    database =
        new EmbeddedDatabaseBuilder()
            .generateUniqueName(true)
            .setType(EmbeddedDatabaseType.H2)
            .build();
    JdbcTemplate jdbcTemplate = new JdbcTemplate(database);
    LocalSeedSqlExecutor executor = new LocalSeedSqlExecutor(jdbcTemplate);

    executor.executeSeparated("db/local/separated-seed.sql", "^^^ END OF SCRIPT ^^^");

    assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM separated_seed", Integer.class))
        .isEqualTo(2);
  }

  @Test
  void missingSeedResourceStopsInitialization() {
    LocalSeedSqlExecutor executor = new LocalSeedSqlExecutor(mock(JdbcTemplate.class));

    assertThatThrownBy(() -> executor.execute("db/local/missing-seed.sql"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("missing-seed.sql");
  }
}
