package com.devpath;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:instructor-learning-analytics-smoke;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
      "spring.sql.init.mode=always",
      "spring.jpa.defer-datasource-initialization=true"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InstructorLearningAnalyticsSmokeIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private Long instructorId;

  @BeforeEach
  void setUp() {
    instructorId =
        jdbcTemplate.queryForObject(
            "select user_id from users where email = ?", Long.class, "instructor@devpath.com");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/api/instructor/analytics/overview",
        "/api/instructor/analytics/students",
        "/api/instructor/analytics/progress",
        "/api/instructor/analytics/completion-rate",
        "/api/instructor/analytics/average-watch-time",
        "/api/instructor/analytics/assignment-stats",
        "/api/instructor/analytics/quiz-stats",
        "/api/instructor/analytics/drop-off",
        "/api/instructor/analytics/difficulty",
        "/api/instructor/analytics/student-progress",
        "/api/instructor/analytics/question-performance",
        "/api/instructor/analytics/funnel",
        "/api/instructor/analytics/weak-points"
      })
  void analyticsDetailEndpointLoads(String path) throws Exception {
    mockMvc
        .perform(get(path).with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").exists());
  }

  private UsernamePasswordAuthenticationToken instructorAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        instructorId, null, AuthorityUtils.createAuthorityList("ROLE_INSTRUCTOR"));
  }
}
