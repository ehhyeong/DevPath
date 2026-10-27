package com.devpath.common.config;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

  // 빈 스키마는 Hibernate와 시드가 최신 상태로 만들므로 기존 DB 보정용 마이그레이션은 건너뛰고 기준선만 남긴다.
  @Bean
  public FlywayMigrationStrategy flywayMigrationStrategy() {
    return flyway -> {
      MigrationInfo[] pending = flyway.info().pending();
      if (pending.length == 0 || !isEmptySchema(flyway.getConfiguration().getDataSource())) {
        flyway.migrate();
        return;
      }
      Flyway.configure()
          .configuration(flyway.getConfiguration())
          .baselineVersion(pending[pending.length - 1].getVersion())
          .baselineDescription("Fresh schema created by Hibernate")
          .load()
          .baseline();
    };
  }

  private boolean isEmptySchema(DataSource dataSource) {
    try (Connection connection = dataSource.getConnection();
        ResultSet tables =
            connection
                .getMetaData()
                .getTables(
                    connection.getCatalog(), connection.getSchema(), "%", new String[] {"TABLE"})) {
      return !tables.next();
    } catch (SQLException ex) {
      throw new IllegalStateException("Failed to inspect schema before Flyway migration", ex);
    }
  }
}