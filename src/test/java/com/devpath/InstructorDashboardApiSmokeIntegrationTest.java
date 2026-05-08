package com.devpath;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
      "spring.datasource.url=jdbc:h2:mem:instructor-dashboard-smoke;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
      "spring.sql.init.mode=always",
      "spring.jpa.defer-datasource-initialization=true"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InstructorDashboardApiSmokeIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private Long instructorId;
  private Long answeredQuestionId;

  @BeforeEach
  void setUp() {
    instructorId =
        jdbcTemplate.queryForObject(
            "select user_id from users where email = ?", Long.class, "instructor@devpath.com");
    answeredQuestionId =
        jdbcTemplate.queryForObject(
            "select question_id from qna_questions where qna_status = 'ANSWERED' order by created_at desc limit 1",
            Long.class);
  }

  @Test
  void coursesEndpointLoads() throws Exception {
    mockMvc
        .perform(get("/api/instructor/courses").with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data[0].thumbnailUrl").exists())
        .andExpect(jsonPath("$.data[0].reviewCount").isNumber());
  }

  @Test
  void notificationsEndpointLoads() throws Exception {
    performOk("/api/instructor/notifications");
  }

  @Test
  void reviewSummaryEndpointLoads() throws Exception {
    performOk("/api/instructor/reviews/summary");
  }

  @Test
  void reviewsEndpointLoads() throws Exception {
    mockMvc
        .perform(get("/api/instructor/reviews").with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data[0].learnerName").exists())
        .andExpect(jsonPath("$.data[2].reply.authorName").exists());
  }

  @Test
  void qnaInboxEndpointLoads() throws Exception {
    mockMvc
        .perform(
            get("/api/instructor/qna-inbox?status=UNANSWERED")
                .with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data[0].title").exists())
        .andExpect(jsonPath("$.data[0].content").exists());
  }

  @Test
  void qnaTimelineEndpointLoads() throws Exception {
    mockMvc
        .perform(
            get("/api/instructor/qna-inbox/" + answeredQuestionId + "/timeline")
                .with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.question.title").exists())
        .andExpect(jsonPath("$.data.publishedAnswer.authorName").exists());
  }

  @Test
  void revenueEndpointLoads() throws Exception {
    mockMvc
        .perform(get("/api/instructor/revenues").with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.monthlyTrend[0].key").exists())
        .andExpect(jsonPath("$.data.courseBreakdown[0].courseTitle").exists())
        .andExpect(jsonPath("$.data.recentTransactions[0].grossAmount").isNumber())
        .andExpect(jsonPath("$.data.recentTransactions[0].netAmount").isNumber())
        .andExpect(jsonPath("$.data.recentTransactions[0].courseTitle").exists());
  }

  @Test
  void marketingCouponsEndpointLoads() throws Exception {
    mockMvc
        .perform(
            get("/api/instructor/marketing/coupons")
                .with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data[0].couponTitle").exists())
        .andExpect(jsonPath("$.data[0].couponCode").exists())
        .andExpect(jsonPath("$.data[0].targetCourseTitle").exists());
  }

  @Test
  void marketingPromotionsEndpointLoads() throws Exception {
    mockMvc
        .perform(
            get("/api/instructor/marketing/promotions")
                .with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data[0].courseTitle").exists())
        .andExpect(jsonPath("$.data[0].promotionType").exists());
  }

  @Test
  void mentoringBoardEndpointLoads() throws Exception {
    performOk("/api/instructor/mentoring/board");
  }

  private void performOk(String path) throws Exception {
    mockMvc
        .perform(get(path).with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));
  }

  private UsernamePasswordAuthenticationToken instructorAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        instructorId, null, AuthorityUtils.createAuthorityList("ROLE_INSTRUCTOR"));
  }
}
