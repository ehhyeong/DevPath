package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
    properties = {
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
  }

  private Integer count(String tableName) {
    return jdbcTemplate.queryForObject("select count(*) from " + tableName, Integer.class);
  }
}
