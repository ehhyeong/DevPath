package com.devpath.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@org.springframework.context.annotation.Profile({"local", "dev"})
@RequiredArgsConstructor
public class LocalLegacySeedInitializer implements CommandLineRunner {

  private static final String PROJECT_SEED_SEPARATOR = "^^^ END OF SCRIPT ^^^";

  private final JdbcTemplate jdbcTemplate;
  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    if (isLegacyDatasetMissing()) {
      log.info("Legacy local seed data is missing. Restoring db/legacy/seed-data.sql.");
      seedSqlExecutor.execute("db/local/legacy-seed-prepare.sql");
      seedSqlExecutor.execute("db/legacy/seed-data.sql");
      // The pre-Hibernate pass creates auxiliary tables on a blank database, but its guarded
      // data blocks need the legacy baseline. Reapply only for that first restoration.
      seedSqlExecutor.executeSeparated("db/local/project-schema-prep.sql", PROJECT_SEED_SEPARATOR);
      log.info("Legacy local seed data restore completed.");
    } else {
      log.debug("Legacy local seed data is already present. Skipping restore.");
    }
  }

  private boolean isLegacyDatasetMissing() {
    return countRows("users") == 0
        || countRows("courses") == 0
        || countRows("roadmaps") == 0
        || countRows("course_enrollments") == 0
        || countRows("qna_questions") == 0;
  }

  private long countRows(String tableName) {
    if (!tableExists(tableName)) {
      return 0;
    }

    Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableName, Long.class);
    return count == null ? 0 : count;
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
