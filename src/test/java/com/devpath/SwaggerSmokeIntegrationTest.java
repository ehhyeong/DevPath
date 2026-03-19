package com.devpath;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.notNullValue;
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
      "spring.sql.init.mode=always",
      "spring.jpa.defer-datasource-initialization=true"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SwaggerSmokeIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private Long instructorId;
  private Long courseId;

  @BeforeEach
  void setUp() {
    instructorId =
        jdbcTemplate.queryForObject(
            "select user_id from users where email = ?", Long.class, "instructor@devpath.com");
    courseId =
        jdbcTemplate.queryForObject(
            "select course_id from courses where title = ?", Long.class, "Spring Boot Intro");
  }

  @Test
  void openApiSpecIncludesRecentCourseEndpoints() throws Exception {
    mockMvc
        .perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/instructor/courses/{courseId}']").exists())
        .andExpect(
            jsonPath("$.paths['/api/instructor/courses/{courseId}/announcements']").exists())
        .andExpect(
            jsonPath("$.paths['/api/instructor/courses/{courseId}/node-classifications']").exists())
        .andExpect(
            jsonPath("$.paths['/api/instructor/courses/{courseId}/node-coverages']").exists())
        .andExpect(jsonPath("$.paths['/api/instructors/{instructorId}/profile']").exists())
        .andExpect(jsonPath("$.paths['/api/instructors/{instructorId}/channel']").exists())
        .andExpect(jsonPath("$.paths['/api/courses/{courseId}/news']").exists())
        .andExpect(jsonPath("$.paths['/api/courses'].get.summary").value("강의 목록 조회"))
        .andExpect(
            jsonPath("$.paths['/api/me/roadmaps/{roadmapId}/recommendations/init'].post.summary")
                .value("AI 추천 노드 생성"))
        .andExpect(jsonPath("$.paths['/api/me/skills/check'].post.summary").value("보유 스킬 등록"))
        .andExpect(
            jsonPath("$.tags[?(@.name=='학습자 강의 조회')].description")
                .value(hasItem("학습자 강의 조회 API")))
        .andExpect(
            jsonPath("$.tags[?(@.name=='학습자 노드 추천')].description")
                .value(hasItem("AI 기반 로드맵 노드 추천 관리 API")))
        .andExpect(
            jsonPath("$.tags[?(@.name=='학습자 스킬 체크')].description")
                .value(hasItem("학습자의 보유 스킬 관리 및 로드맵 추천 API")));
  }

  @Test
  void swaggerUiConfigExposesGroupedApiDocs() throws Exception {
    mockMvc
        .perform(get("/v3/api-docs/swagger-config"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.urls[*].name")
                .value(hasItems("학습자", "강사", "관리자")));
  }

  @Test
  void groupedOpenApiSpecsSplitEndpointsByAudience() throws Exception {
    mockMvc
        .perform(get("/v3/api-docs/learner"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/courses']").exists())
        .andExpect(jsonPath("$.paths['/api/me/skills/check']").exists())
        .andExpect(jsonPath("$.paths['/api/instructor/courses/{courseId}']").doesNotExist())
        .andExpect(jsonPath("$.paths['/api/admin/tags']").doesNotExist());

    mockMvc
        .perform(get("/v3/api-docs/instructor"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/instructor/courses/{courseId}']").exists())
        .andExpect(jsonPath("$.paths['/api/instructors/{instructorId}/profile']").exists())
        .andExpect(
            jsonPath("$.tags[*].name")
                .value(
                    hasItems(
                        "강사 공개 채널 API",
                        "강의 기본 관리 API",
                        "강의 커리큘럼 구성 API",
                        "강의 메타데이터/자료 관리 API",
                        "강의 공지/새소식 API",
                        "태그 기반 노드 분류 API")))
        .andExpect(jsonPath("$.paths['/api/me/skills/check']").doesNotExist())
        .andExpect(jsonPath("$.paths['/api/admin/tags']").doesNotExist());

    mockMvc
        .perform(get("/v3/api-docs/admin"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/admin/tags']").exists())
        .andExpect(jsonPath("$.paths['/api/admin/courses/pending']").exists())
        .andExpect(jsonPath("$.paths['/api/courses']").doesNotExist())
        .andExpect(jsonPath("$.paths['/api/instructor/courses/{courseId}']").doesNotExist());
  }

  @Test
  void seededCourseApisRespondWithSampleData() throws Exception {
    mockMvc
        .perform(
            get("/api/instructor/courses/{courseId}", courseId)
                .with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.courseId").value(courseId))
        .andExpect(jsonPath("$.data.instructor.instructorId").value(instructorId))
        .andExpect(jsonPath("$.data.instructor.channelApiPath").value("/api/instructors/" + instructorId + "/channel"))
        .andExpect(jsonPath("$.data.instructor.headline").isNotEmpty());

    mockMvc
        .perform(
            get("/api/instructor/courses/{courseId}/announcements", courseId)
                .with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.length()").value(greaterThanOrEqualTo(2)));

    mockMvc
        .perform(
            get("/api/instructor/courses/{courseId}/node-classifications", courseId)
                .with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.totalMatchedNodes").value(greaterThanOrEqualTo(2)))
        .andExpect(jsonPath("$.data.matchedNodes.length()").value(greaterThanOrEqualTo(2)));

    mockMvc
        .perform(
            get("/api/instructor/courses/{courseId}/node-coverages", courseId)
                .with(authentication(instructorAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.totalNodes").value(greaterThanOrEqualTo(4)))
        .andExpect(jsonPath("$.data.nodeCoverages[0].coveragePercent").value(notNullValue()));

    mockMvc
        .perform(get("/api/courses/{courseId}/news", courseId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.length()").value(greaterThanOrEqualTo(2)));

    mockMvc
        .perform(get("/api/instructors/{instructorId}/profile", instructorId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.instructorId").value(instructorId))
        .andExpect(jsonPath("$.data.headline").isNotEmpty());

    mockMvc
        .perform(get("/api/instructors/{instructorId}/channel", instructorId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.profile.instructorId").value(instructorId))
        .andExpect(jsonPath("$.data.featuredCourses.length()").value(greaterThanOrEqualTo(1)));
  }

  private UsernamePasswordAuthenticationToken instructorAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        instructorId, null, AuthorityUtils.createAuthorityList("ROLE_INSTRUCTOR"));
  }
}
