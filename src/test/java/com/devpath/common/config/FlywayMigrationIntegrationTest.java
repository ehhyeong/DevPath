package com.devpath.common.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class FlywayMigrationIntegrationTest {

  private JdbcTemplate jdbcTemplate;
  private ApplicationContextRunner contextRunner;

  @BeforeEach
  void setUp() {
    String databaseUrl = System.getenv("DEVPATH_MIGRATION_TEST_URL");
    DriverManagerDataSource dataSource = new DriverManagerDataSource();
    if (databaseUrl == null) {
      dataSource.setUrl(
          "jdbc:h2:mem:flyway-"
              + UUID.randomUUID()
              + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
      dataSource.setUsername("sa");
      dataSource.setPassword("");
    } else {
      dataSource.setUrl(databaseUrl);
      dataSource.setUsername(System.getenv("DEVPATH_MIGRATION_TEST_USER"));
      dataSource.setPassword(System.getenv("DEVPATH_MIGRATION_TEST_PASSWORD"));
      // 실제 PostgreSQL 검증도 테스트마다 별도 스키마를 사용하여 실행 간 영향을 차단한다.
      String schema = "flyway_test_" + UUID.randomUUID().toString().replace("-", "");
      new JdbcTemplate(dataSource).execute("CREATE SCHEMA " + schema);
      dataSource.setSchema(schema);
    }
    jdbcTemplate = new JdbcTemplate(dataSource);
    contextRunner =
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(FlywayAutoConfiguration.class))
            .withUserConfiguration(FlywayConfig.class)
            .withBean(DataSource.class, () -> dataSource)
            .withInitializer(
                context -> {
                  try {
                    new YamlPropertySourceLoader()
                        .load("application", new ClassPathResource("application.yaml"))
                        .forEach(context.getEnvironment().getPropertySources()::addLast);
                  } catch (IOException ex) {
                    throw new IllegalStateException("Failed to read application.yaml", ex);
                  }
                });
  }

  @Test
  void explicitDisableLeavesLegacyInitializationAndDataUntouched() {
    prepareExistingData();

    contextRunner
        .withPropertyValues("SPRING_FLYWAY_ENABLED=false")
        .run(
            context -> {
              assertThat(context).hasNotFailed().doesNotHaveBean(Flyway.class);
              assertExistingData();
              assertThat(tableCount("flyway_schema_history")).isZero();
            });
  }

  @Test
  void existingDatabaseRequiresExplicitBaseline() {
    prepareExistingData();

    enabledRunner()
        .withPropertyValues("spring.flyway.baseline-on-migrate=false")
        .run(
            context -> {
              assertThat(context).hasFailed();
              assertThat(context.getStartupFailure())
                  .hasStackTraceContaining("non-empty schema")
                  .hasStackTraceContaining("baseline");
              assertExistingData();
              assertThat(tableCount("flyway_schema_history")).isZero();
            });
  }

  @Test
  void baselinePreservesDataAndNewMigrationRunsOnlyOnce() {
    prepareExistingData();

    enabledRunner()
        .withPropertyValues(
            "spring.flyway.baseline-on-migrate=true",
            "spring.flyway.locations=classpath:db/migration-fixtures")
        .run(
            context -> {
              assertThat(context).hasNotFailed().hasSingleBean(Flyway.class);
              assertExistingData();
              assertThat(
                      jdbcTemplate.queryForObject(
                          "SELECT type FROM flyway_schema_history WHERE version = '1'",
                          String.class))
                  .isEqualTo("BASELINE");
              assertThat(
                      jdbcTemplate.queryForObject(
                          "SELECT COUNT(*) FROM migration_probe", Long.class))
                  .isEqualTo(1);
              assertThatThrownBy(() -> context.getBean(Flyway.class).clean())
                  .hasMessageContaining("cleanDisabled");
              assertExistingData();
            });

    enabledRunner()
        .withPropertyValues(
            "spring.flyway.baseline-on-migrate=false",
            "spring.flyway.locations=classpath:db/migration-fixtures")
        .run(
            context -> {
              assertThat(context).hasNotFailed();
              assertExistingData();
              assertThat(
                      jdbcTemplate.queryForObject(
                          "SELECT COUNT(*) FROM flyway_schema_history WHERE version IS NOT NULL",
                          Long.class))
                  .isEqualTo(2);
              assertThat(
                      jdbcTemplate.queryForObject(
                          "SELECT COUNT(*) FROM migration_probe", Long.class))
                  .isEqualTo(1);
              assertThat(context.getBean(Flyway.class).info().pending()).isEmpty();
            });

    enabledRunner()
        .withPropertyValues(
            "spring.flyway.locations=classpath:db/migration-changed-fixtures")
        .run(
            context -> {
              assertThat(context).hasFailed();
              assertThat(context.getStartupFailure())
                  .hasStackTraceContaining("Migration checksum mismatch for migration version 900");
              assertExistingData();
            });
  }

  @Test
  void emptyDatabaseRecordsLatestVersionAsBaselineWithoutRunningMigrations() {
    enabledRunner()
        .run(
            context -> {
              assertThat(context).hasNotFailed();
              Flyway flyway = context.getBean(Flyway.class);
              assertThat(flyway.info().current().getType().name()).isEqualTo("BASELINE");
              assertThat(flyway.info().current().getVersion())
                  .isEqualTo(flyway.info().all()[flyway.info().all().length - 1].getVersion());
              assertThat(flyway.info().pending()).isEmpty();
              assertThat(tableCount("legacy_record")).isZero();
            });
  }

  private ApplicationContextRunner enabledRunner() {
    ApplicationContextRunner runner =
        contextRunner.withPropertyValues("spring.flyway.enabled=true");
    // H2는 PostgreSQL SQL을 검증하고, 실제 PostgreSQL은 운영 설정의 {vendor} 치환도 검증한다.
    return System.getenv("DEVPATH_MIGRATION_TEST_URL") == null
        ? runner.withPropertyValues("spring.flyway.locations=classpath:db/migration/postgresql")
        : runner;
  }

  private void prepareExistingData() {
    jdbcTemplate.execute(
        "CREATE TABLE legacy_record (id bigint PRIMARY KEY, content varchar(100))");
    jdbcTemplate.update("INSERT INTO legacy_record VALUES (1, ?)", "기존 데이터");
  }

  private void assertExistingData() {
    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT content FROM legacy_record WHERE id = 1", String.class))
        .isEqualTo("기존 데이터");
    assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM legacy_record", Long.class))
        .isEqualTo(1);
  }

  private long tableCount(String tableName) {
    return jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ?",
        Long.class,
        tableName);
  }
}
