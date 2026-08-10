package com.devpath.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 6)
@RequiredArgsConstructor
public class LocalFrontendDraftCourseSeedInitializer implements CommandLineRunner {

  private final JdbcTemplate jdbcTemplate;
  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    if (!requiredTablesExist()) {
      return;
    }

    seedSqlExecutor.execute("db/local/frontend-draft-course.sql");
  }

  private boolean requiredTablesExist() {
    return tableExists("users")
        && tableExists("courses")
        && tableExists("tags")
        && tableExists("course_tag_maps")
        && tableExists("course_prerequisites")
        && tableExists("course_job_relevance")
        && tableExists("course_objectives")
        && tableExists("course_target_audiences")
        && tableExists("course_info_section_items")
        && tableExists("course_sections")
        && tableExists("lessons")
        && tableExists("roadmaps")
        && tableExists("roadmap_nodes")
        && tableExists("course_node_mappings")
        && tableExists("quizzes")
        && tableExists("quiz_questions")
        && tableExists("quiz_question_options")
        && tableExists("assignments")
        && tableExists("assignment_rubrics");
  }

  private boolean tableExists(String tableName) {
    try {
      Integer count =
          jdbcTemplate.queryForObject(
              """
              SELECT COUNT(*)
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_name = ?
              """,
              Integer.class,
              tableName);
      return count != null && count > 0;
    } catch (DataAccessException ex) {
      return false;
    }
  }
}
