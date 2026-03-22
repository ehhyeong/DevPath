package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(
    properties = {
      "spring.sql.init.mode=always",
      "spring.jpa.defer-datasource-initialization=true"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LearningRecommendationSwaggerFinalInspectionIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private Long learnerId;
  private Long lessonId;
  private Long roadmapId;

  @BeforeEach
  void setUp() {
    learnerId =
        jdbcTemplate.queryForObject(
            "select user_id from users where email = ?", Long.class, "learner@devpath.com");
    lessonId =
        jdbcTemplate.queryForObject(
            """
            select min(l.lesson_id)
            from lessons l
            join course_materials cm on cm.lesson_id = l.lesson_id
            """,
            Long.class);
    roadmapId =
        jdbcTemplate.queryForObject(
            "select roadmap_id from roadmaps where title = ?",
            Long.class,
            "Backend Master Roadmap");
  }

  @Test
  void swaggerFinalInspectionFlowCoversLearningAndRecommendationApis() throws Exception {
    JsonNode startedSession = postAsLearner("/api/learning/sessions/{lessonId}/start", null, lessonId);
    assertThat(startedSession.get("lessonId").asLong()).isEqualTo(lessonId);
    assertThat(startedSession.get("progressPercent").asInt()).isZero();
    assertThat(startedSession.get("progressSeconds").asInt()).isZero();
    assertThat(startedSession.get("defaultPlaybackRate").asDouble()).isEqualTo(1.0D);

    JsonNode savedProgress =
        putAsLearner(
            "/api/learning/sessions/{lessonId}/progress",
            Map.of("progressPercent", 42, "progressSeconds", 315),
            lessonId);
    assertThat(savedProgress.get("progressPercent").asInt()).isEqualTo(42);
    assertThat(savedProgress.get("progressSeconds").asInt()).isEqualTo(315);

    JsonNode progress = getAsLearner("/api/learning/sessions/{lessonId}/progress", lessonId);
    assertThat(progress.get("progressPercent").asInt()).isEqualTo(42);
    assertThat(progress.get("progressSeconds").asInt()).isEqualTo(315);

    JsonNode playerConfig = getAsLearner("/api/learning/player/{lessonId}/config", lessonId);
    assertThat(playerConfig.get("defaultPlaybackRate").asDouble()).isEqualTo(1.0D);

    JsonNode updatedPlayerConfig =
        putAsLearner(
            "/api/learning/player/{lessonId}/config",
            Map.of("defaultPlaybackRate", 1.25D),
            lessonId);
    assertThat(updatedPlayerConfig.get("defaultPlaybackRate").asDouble()).isEqualTo(1.25D);

    JsonNode createdNote =
        postAsLearner(
            "/api/learning/lessons/{lessonId}/notes",
            Map.of("timestampSecond", 125, "content", "Spring Security 인증 흐름 다시 보기"),
            HttpStatus.CREATED,
            lessonId);
    long noteId = createdNote.get("noteId").asLong();
    assertThat(createdNote.get("timestampSecond").asInt()).isEqualTo(125);

    JsonNode noteList = getAsLearner("/api/learning/lessons/{lessonId}/notes", lessonId);
    assertThat(noteList.isArray()).isTrue();
    assertThat(findById(noteList, "noteId", noteId)).isNotNull();

    JsonNode updatedNote =
        putAsLearner(
            "/api/learning/lessons/{lessonId}/notes/{noteId}",
            Map.of("timestampSecond", 140, "content", "여기서 필터 체인 동작 확인"),
            lessonId,
            noteId);
    assertThat(updatedNote.get("noteId").asLong()).isEqualTo(noteId);
    assertThat(updatedNote.get("timestampSecond").asInt()).isEqualTo(140);

    JsonNode notesAfterUpdate = getAsLearner("/api/learning/lessons/{lessonId}/notes", lessonId);
    JsonNode updatedNoteInList = findById(notesAfterUpdate, "noteId", noteId);
    assertThat(updatedNoteInList).isNotNull();
    assertThat(updatedNoteInList.get("timestampSecond").asInt()).isEqualTo(140);

    JsonNode materials = getAsLearner("/api/learning/lessons/{lessonId}/materials", lessonId);
    assertThat(materials.isArray()).isTrue();
    assertThat(materials.size()).isGreaterThan(0);
    JsonNode firstMaterial = materials.get(0);
    assertThat(firstMaterial.get("materialId").asLong()).isPositive();
    assertThat(firstMaterial.get("materialType").asText()).isNotBlank();
    assertThat(firstMaterial.get("originalFileName").asText()).isNotBlank();
    assertThat(firstMaterial.get("materialUrl").asText()).isNotBlank();
    assertThat(firstMaterial.get("displayOrder").asInt()).isGreaterThanOrEqualTo(0);

    JsonNode createdTilDraft =
        postAsLearner(
            "/api/learning/til/draft",
            Map.of(
                "title", "Spring Security 학습 정리",
                "content", "# Spring Security\n인증과 인가를 학습했다.",
                "lessonId", lessonId),
            HttpStatus.CREATED);
    long tilId = createdTilDraft.get("tilId").asLong();
    assertThat(createdTilDraft.get("title").asText()).isEqualTo("Spring Security 학습 정리");

    JsonNode convertedTil =
        postAsLearner(
            "/api/learning/til/convert",
            Map.of("noteIds", List.of(noteId), "title", "노트 기반 Spring Security TIL", "lessonId", lessonId),
            HttpStatus.CREATED);
    long convertedTilId = convertedTil.get("tilId").asLong();
    assertThat(convertedTilId).isPositive();
    assertThat(convertedTil.get("content").asText()).contains("여기서 필터 체인 동작 확인");
    assertThat(convertedTil.get("content").asText()).contains("## [02:20]");

    JsonNode tocGenerated = postAsLearner("/api/learning/til/{tilId}/toc", null, tilId);
    assertThat(tocGenerated.get("tilId").asLong()).isEqualTo(tilId);
    assertThat(tocGenerated.get("hasTableOfContents").asBoolean()).isTrue();
    assertThat(tocGenerated.get("tableOfContents").asText()).contains("Spring Security");

    JsonNode tilAfterToc = getAsLearner("/api/learning/til/{tilId}", tilId);
    assertThat(tilAfterToc.get("hasTableOfContents").asBoolean()).isTrue();
    assertThat(tilAfterToc.get("tableOfContents").asText()).contains("Spring Security");

    JsonNode publishedTil =
        postAsLearner(
            "/api/learning/til/{tilId}/publish",
            Map.of(
                "platform", "MOCK",
                "title", "Spring Security 학습 정리",
                "content", "# Spring Security\n인증과 인가를 학습했다.",
                "tags", "spring-security,backend,til",
                "draft", true,
                "thumbnailUrl", "https://cdn.devpath.ai/images/spring-security-cover.png"),
            HttpStatus.CREATED,
            tilId);
    assertThat(publishedTil.get("published").asBoolean()).isTrue();
    assertThat(publishedTil.get("publishedUrl").asText()).contains("mock.blog.devpath");
    assertThat(publishedTil.get("externalPostId").asText()).startsWith("mock-post-");

    JsonNode generatedRecommendations =
        postAsLearner("/api/me/roadmaps/{roadmapId}/recommendations/init", null, roadmapId);
    assertThat(generatedRecommendations.get("generatedCount").asInt()).isGreaterThan(0);
    JsonNode recommendationItems = generatedRecommendations.get("recommendations");
    assertThat(recommendationItems.isArray()).isTrue();
    assertThat(recommendationItems.size()).isGreaterThan(0);
    long recommendationId = recommendationItems.get(0).get("recommendationId").asLong();
    assertThat(recommendationItems.get(0).get("reason").asText()).isNotBlank();

    JsonNode pendingRecommendations =
        getAsLearner(
            "/api/me/roadmaps/{roadmapId}/recommendations",
            Map.of("pendingOnly", "true"),
            roadmapId);
    assertThat(pendingRecommendations.get("pendingCount").asInt()).isGreaterThan(0);
    assertThat(findById(pendingRecommendations.get("recommendations"), "recommendationId", recommendationId))
        .isNotNull();

    JsonNode allRecommendations =
        getAsLearner(
            "/api/me/roadmaps/{roadmapId}/recommendations",
            Map.of("pendingOnly", "false"),
            roadmapId);
    assertThat(allRecommendations.get("totalRecommendations").asInt()).isGreaterThan(0);

    JsonNode acceptedRecommendation =
        patchAsLearner("/api/me/recommendations/{recommendationId}/accept", null, recommendationId);
    assertThat(acceptedRecommendation.get("recommendationId").asLong()).isEqualTo(recommendationId);
    assertThat(acceptedRecommendation.get("status").asText()).isEqualTo("ACCEPTED");

    JsonNode recommendationHistory =
        getAsLearner(
            "/api/recommendations/history",
            Map.of("recommendationId", String.valueOf(recommendationId)));
    assertThat(recommendationHistory.get("totalCount").asInt()).isGreaterThanOrEqualTo(2);
    List<String> actionTypes = collectTexts(recommendationHistory.get("histories"), "actionType");
    assertThat(actionTypes).contains("GENERATED", "ACCEPTED");
    JsonNode acceptedHistory = findByFieldValue(recommendationHistory.get("histories"), "actionType", "ACCEPTED");
    assertThat(acceptedHistory).isNotNull();
    assertThat(acceptedHistory.get("beforeStatus").asText()).isEqualTo("PENDING");
    assertThat(acceptedHistory.get("afterStatus").asText()).isEqualTo("ACCEPTED");

    JsonNode riskWarnings = getAsLearner("/api/recommendations/risk-warnings");
    assertThat(riskWarnings.get("totalCount").asInt()).isGreaterThan(0);
    JsonNode firstWarning = riskWarnings.get("warnings").get(0);
    assertThat(firstWarning.get("warningType").asText()).isNotBlank();
    assertThat(firstWarning.get("riskLevel").asText()).isNotBlank();
    assertThat(firstWarning.get("message").asText()).isNotBlank();

    JsonNode unacknowledgedWarnings =
        getAsLearner(
            "/api/recommendations/risk-warnings", Map.of("onlyUnacknowledged", "true"));
    assertThat(unacknowledgedWarnings.get("totalCount").asInt()).isGreaterThan(0);

    JsonNode createdOcr =
        postAsLearner(
            "/api/learning/lessons/{lessonId}/ocr",
            Map.of(
                "frameTimestampSecond", 120,
                "sourceImageUrl", "https://cdn.devpath.ai/frames/lesson-10-120.png",
                "sourceTextHint", "Spring Security는 인증과 인가를 담당한다."),
            HttpStatus.CREATED,
            lessonId);
    long ocrId = createdOcr.get("ocrId").asLong();
    assertThat(createdOcr.get("status").asText()).isEqualTo("COMPLETED");
    assertThat(createdOcr.get("extractedText").asText()).contains("Spring Security");

    JsonNode ocrDetail = getAsLearner("/api/learning/ocr/{ocrId}", ocrId);
    assertThat(ocrDetail.get("ocrId").asLong()).isEqualTo(ocrId);
    assertThat(ocrDetail.get("frameTimestampSecond").asInt()).isEqualTo(120);
    assertThat(ocrDetail.get("confidence").asDouble()).isEqualTo(0.97D);

    JsonNode searchedOcr =
        getAsLearner(
            "/api/learning/lessons/{lessonId}/ocr/search",
            Map.of("keyword", "security"),
            lessonId);
    assertThat(searchedOcr.get("totalCount").asInt()).isGreaterThan(0);
    assertThat(collectTexts(searchedOcr.get("results"), "extractedText"))
        .anyMatch(text -> text.toLowerCase().contains("security"));

    JsonNode mappingResult = getAsLearner("/api/learning/lessons/{lessonId}/ocr/mappings", lessonId);
    assertThat(mappingResult.get("totalCount").asInt()).isGreaterThan(0);
    JsonNode mapping = findById(mappingResult.get("mappings"), "ocrId", ocrId);
    assertThat(mapping).isNotNull();
    assertThat(mapping.get("frameTimestampSecond").asInt()).isEqualTo(120);
    assertThat(mapping.get("timestampMappings").asText()).contains("\"second\":120");
  }

  private JsonNode postAsLearner(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(post(url, uriVariables), body, HttpStatus.OK);
  }

  private JsonNode postAsLearner(String url, Object body, HttpStatus expectedStatus, Object... uriVariables)
      throws Exception {
    return performAndReadData(post(url, uriVariables), body, expectedStatus);
  }

  private JsonNode putAsLearner(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(put(url, uriVariables), body, HttpStatus.OK);
  }

  private JsonNode patchAsLearner(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(patch(url, uriVariables), body, HttpStatus.OK);
  }

  private JsonNode getAsLearner(String url, Object... uriVariables) throws Exception {
    return performAndReadData(get(url, uriVariables), null, HttpStatus.OK);
  }

  private JsonNode getAsLearner(String url, Map<String, String> queryParams, Object... uriVariables)
      throws Exception {
    MockHttpServletRequestBuilder builder = get(url, uriVariables);
    for (Map.Entry<String, String> entry : queryParams.entrySet()) {
      builder = builder.param(entry.getKey(), entry.getValue());
    }
    return performAndReadData(builder, null, HttpStatus.OK);
  }

  private JsonNode performAndReadData(
      MockHttpServletRequestBuilder builder, Object body, HttpStatus expectedStatus) throws Exception {
    builder = builder.with(authentication(learnerAuthentication()));

    if (body != null) {
      builder =
          builder
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(body));
    }

    MvcResult result =
        mockMvc
            .perform(builder)
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().is(expectedStatus.value()))
            .andExpect(jsonPath("$.success").value(true))
            .andReturn();

    JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
    return root.get("data");
  }

  private JsonNode findById(JsonNode items, String fieldName, long expectedId) {
    if (items == null || !items.isArray()) {
      return null;
    }

    for (JsonNode item : items) {
      if (item.has(fieldName) && item.get(fieldName).asLong() == expectedId) {
        return item;
      }
    }

    return null;
  }

  private JsonNode findByFieldValue(JsonNode items, String fieldName, String expectedValue) {
    if (items == null || !items.isArray()) {
      return null;
    }

    for (JsonNode item : items) {
      if (item.has(fieldName) && expectedValue.equals(item.get(fieldName).asText())) {
        return item;
      }
    }

    return null;
  }

  private List<String> collectTexts(JsonNode items, String fieldName) {
    List<String> values = new ArrayList<>();
    if (items == null || !items.isArray()) {
      return values;
    }

    for (JsonNode item : items) {
      if (item.has(fieldName)) {
        values.add(item.get(fieldName).asText());
      }
    }

    return values;
  }

  private UsernamePasswordAuthenticationToken learnerAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        learnerId, null, AuthorityUtils.createAuthorityList("ROLE_LEARNER"));
  }
}
