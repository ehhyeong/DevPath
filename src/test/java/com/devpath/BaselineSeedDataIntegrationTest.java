package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:baseline-seed-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
      "spring.sql.init.mode=always",
      "spring.jpa.defer-datasource-initialization=true"
    })
@ActiveProfiles("test")
class BaselineSeedDataIntegrationTest {

  @Autowired private JdbcTemplate jdbcTemplate;

  @Test
  void week2BaselineSeedIsLoaded() {
    assertThat(count("users")).isGreaterThanOrEqualTo(3);
    assertThat(count("user_profiles")).isGreaterThanOrEqualTo(2);
    assertThat(count("courses")).isGreaterThanOrEqualTo(2);
    assertThat(count("roadmaps")).isGreaterThanOrEqualTo(2);
    assertThat(count("roadmap_nodes")).isGreaterThanOrEqualTo(6);
    assertThat(count("tags")).isGreaterThanOrEqualTo(10);
    assertThat(count("node_required_tags")).isGreaterThanOrEqualTo(6);
    assertThat(count("course_tag_maps")).isGreaterThanOrEqualTo(5);
    assertThat(count("course_announcements")).isGreaterThanOrEqualTo(2);
  }

  private Integer count(String tableName) {
    return jdbcTemplate.queryForObject("select count(*) from " + tableName, Integer.class);
  }
}
