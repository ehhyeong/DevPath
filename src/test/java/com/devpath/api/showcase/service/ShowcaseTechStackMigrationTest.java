package com.devpath.api.showcase.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.DriverManager;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

class ShowcaseTechStackMigrationTest {
  @Test
  void postgresMigrationSupportsEmptyAndExistingSchemasAndRepeatedRuns() throws Exception {
    try (var connection =
        DriverManager.getConnection("jdbc:h2:mem:showcase_migration;MODE=PostgreSQL")) {
      var resource =
          new ClassPathResource("db/migration/postgresql/V4__add_showcase_tech_stack.sql");
      ScriptUtils.executeSqlScript(connection, resource);
      try (var statement = connection.createStatement()) {
        statement.execute(
            "CREATE TABLE showcase (id BIGINT PRIMARY KEY, description VARCHAR(100))");
        statement.execute("INSERT INTO showcase VALUES (72, '기존 게시물')");
      }
      ScriptUtils.executeSqlScript(connection, resource);
      ScriptUtils.executeSqlScript(connection, resource);
      try (var statement = connection.createStatement();
          var rows = statement.executeQuery("SELECT id, description, tech_stack FROM showcase")) {
        assertThat(rows.next()).isTrue();
        assertThat(rows.getLong("id")).isEqualTo(72);
        assertThat(rows.getString("description")).isEqualTo("기존 게시물");
        assertThat(rows.getString("tech_stack")).isNull();
      }
    }
  }
}
