package com.devpath.api.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

class AssignmentFormatMigrationTest {
  @ParameterizedTest
  @ValueSource(strings = {"postgresql", "oracle"})
  void repairsOnlyOverwrittenDemoRulesWithoutDependingOnIds(String vendor) throws Exception {
    try (var connection = DriverManager.getConnection("jdbc:h2:mem:formats_" + vendor)) {
      try (var statement = connection.createStatement()) {
        statement.execute("CREATE TABLE users (user_id BIGINT, email VARCHAR(200))");
        statement.execute(
            "CREATE TABLE courses (course_id BIGINT, instructor_id BIGINT, title VARCHAR(200))");
        statement.execute("CREATE TABLE course_sections (section_id BIGINT, course_id BIGINT)");
        statement.execute(
            "CREATE TABLE lessons (section_id BIGINT, assignment_node_id BIGINT, title VARCHAR(200))");
        statement.execute(
            "CREATE TABLE assignments (node_id BIGINT, allowed_file_formats VARCHAR(300), updated_at TIMESTAMP)");
        statement.execute(
            "INSERT INTO users VALUES (58, 'frontend@devpath.com'), (59, 'other@devpath.com')");
        statement.execute(
            "INSERT INTO courses VALUES (501, 58, 'HTML CSS JavaScript 렌더링 입문'), (502, 59, 'HTML CSS JavaScript 렌더링 입문')");
        statement.execute("INSERT INTO course_sections VALUES (81, 501), (82, 502)");
        statement.execute(
            "INSERT INTO lessons VALUES (81, 801, '과제: 렌더링 흐름 미니 페이지 만들기'), (81, 802, '다른 과제'), (82, 803, '과제: 렌더링 흐름 미니 페이지 만들기')");
        statement.execute(
            "INSERT INTO assignments VALUES (801, 'pdf,zip,png,jpg,jpeg', NULL), (801, 'html,pdf,md', NULL), (802, 'pdf,zip,png,jpg,jpeg', NULL), (803, 'pdf,zip,png,jpg,jpeg', NULL)");
      }
      String resource =
          "/db/migration/" + vendor + "/V2__repair_rendering_assignment_file_formats.sql";
      ScriptUtils.executeSqlScript(
          connection, new EncodedResource(new ClassPathResource(resource), StandardCharsets.UTF_8));
      try (var statement = connection.createStatement();
          var rows =
              statement.executeQuery(
                  "SELECT allowed_file_formats FROM assignments ORDER BY node_id, allowed_file_formats")) {
        rows.next();
        assertThat(rows.getString(1)).isEqualTo("html");
        rows.next();
        assertThat(rows.getString(1)).isEqualTo("html,pdf,md");
        rows.next();
        assertThat(rows.getString(1)).isEqualTo("pdf,zip,png,jpg,jpeg");
        rows.next();
        assertThat(rows.getString(1)).isEqualTo("pdf,zip,png,jpg,jpeg");
      }
    }
  }
}
