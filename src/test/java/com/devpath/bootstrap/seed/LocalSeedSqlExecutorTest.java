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
    expectedRows.put("db/local/project-experience-showcases.sql", 6);
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
  void mentoringSeedsProvideRecruitmentDetailsWithoutChangingRecruitmentSettings() {
    database =
        new EmbeddedDatabaseBuilder()
            .generateUniqueName(true)
            .setType(EmbeddedDatabaseType.H2)
            .build();
    LocalSeedSqlExecutor executor = new LocalSeedSqlExecutor(new JdbcTemplate(database));
    List<String> settings =
        executor.query(
            "db/local/mentoring-hub-seeds.sql",
            (row, rowNumber) -> {
              String content = row.getString("content");
              String[] sections = content.split("\\n\\n## ");
              assertThat(sections).as(row.getString("title")).hasSize(5);
              assertThat(sections[0]).isNotBlank();
              List<String> headings = List.of("참여 대상", "준비 지식", "진행 및 피드백 방식", "최종 결과물");
              for (int i = 0; i < headings.size(); i++) {
                assertThat(sections[i + 1]).startsWith(headings.get(i) + "\n");
                assertThat(sections[i + 1].substring(headings.get(i).length()).trim())
                    .hasSizeGreaterThan(10);
              }
              assertThat(row.getString("curriculum").split("\\n")).hasSize(4);
              return String.join(
                  "|",
                  row.getString("title"),
                  row.getString("category"),
                  row.getString("mentoring_type"),
                  row.getString("duration_weeks"),
                  row.getString("current_participants"),
                  row.getString("max_participants"),
                  String.valueOf(row.getBoolean("closed")));
            });

    assertThat(settings)
        .containsExactly(
            "대용량 이커머스 주문 서버 멘토링|Backend|study|4|5|10|false",
            "Next.js 블로그 플랫폼 팀 프로젝트|Frontend|team|4|3|4|false",
            "추천 시스템 데이터 파이프라인|AI|study|5|2|6|false",
            "React Native 출시형 사이드 프로젝트|App|team|5|4|5|false",
            "AWS와 Kubernetes 무중단 배포 실습|DevOps|team|6|3|6|false",
            "PM 포트폴리오용 문제 정의 스터디|PM|study|3|6|8|false",
            "디자인 시스템 접근성 리디자인|Design|team|4|5|5|true");
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
