package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
class EvaluationSwaggerFinalInspectionIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper = new ObjectMapper();

  private Long instructorId;
  private Long learnerId;
  private Long roadmapNodeId;

  @BeforeEach
  void setUp() {
    instructorId =
        jdbcTemplate.queryForObject(
            "select user_id from users where email = ?", Long.class, "instructor@devpath.com");
    learnerId =
        jdbcTemplate.queryForObject(
            "select user_id from users where email = ?", Long.class, "learner@devpath.com");
    roadmapNodeId =
        jdbcTemplate.queryForObject(
            "select min(node_id) from roadmap_nodes where title = ?",
            Long.class,
            "Security and JWT");
  }

  @Test
  void swaggerFinalInspectionFlowCoversEvaluationApis() throws Exception {
    String suffix = String.valueOf(System.nanoTime());

    JsonNode createdQuiz =
        postAsInstructor(
            "/api/instructor/quizzes",
            Map.ofEntries(
                Map.entry("roadmapNodeId", roadmapNodeId),
                Map.entry("title", "Swagger Final Quiz " + suffix),
                Map.entry("description", "Swagger final inspection quiz"),
                Map.entry("quizType", "MANUAL"),
                Map.entry("totalScore", 10),
                Map.entry("isPublished", true),
                Map.entry("isActive", true),
                Map.entry("exposeAnswer", true),
                Map.entry("exposeExplanation", true)));

    long quizId = createdQuiz.get("quizId").asLong();

    JsonNode quizWithQuestion =
        postAsInstructor(
            "/api/instructor/quizzes/{quizId}/questions",
            Map.ofEntries(
                Map.entry("questionType", "MULTIPLE_CHOICE"),
                Map.entry("questionText", "JWT filter should usually run in which layer?"),
                Map.entry("explanation", "JWT validation is typically handled in the security filter chain."),
                Map.entry("points", 10),
                Map.entry("displayOrder", 1),
                Map.entry(
                    "options",
                    List.of(
                        Map.of(
                            "optionText", "Security filter chain",
                            "isCorrect", true,
                            "displayOrder", 1),
                        Map.of(
                            "optionText", "CSS rendering layer",
                            "isCorrect", false,
                            "displayOrder", 2),
                        Map.of(
                            "optionText", "Database schema migration",
                            "isCorrect", false,
                            "displayOrder", 3)))),
            quizId);

    JsonNode createdQuestion = quizWithQuestion.get("questions").get(0);
    long questionId = createdQuestion.get("questionId").asLong();
    long correctOptionId = 0L;
    long wrongOptionId = 0L;

    for (JsonNode option : createdQuestion.get("options")) {
      if (option.get("isCorrect").asBoolean()) {
        correctOptionId = option.get("optionId").asLong();
      } else if (wrongOptionId == 0L) {
        wrongOptionId = option.get("optionId").asLong();
      }
    }

    assertThat(correctOptionId).isPositive();
    assertThat(wrongOptionId).isPositive();

    JsonNode createdAssignment =
        postAsInstructor(
            "/api/instructor/assignments",
            Map.ofEntries(
                Map.entry("roadmapNodeId", roadmapNodeId),
                Map.entry("title", "Swagger Final Assignment " + suffix),
                Map.entry("description", "Implement a JWT login flow"),
                Map.entry("submissionType", "MULTIPLE"),
                Map.entry("dueAt", LocalDateTime.now().plusDays(7).withNano(0).toString()),
                Map.entry("allowedFileFormats", "zip,md"),
                Map.entry("readmeRequired", true),
                Map.entry("testRequired", true),
                Map.entry("lintRequired", true),
                Map.entry(
                    "submissionRuleDescription",
                    "Include README, passing tests, and a zipped project."),
                Map.entry("totalScore", 100),
                Map.entry("isPublished", true),
                Map.entry("isActive", true),
                Map.entry("allowLateSubmission", false)));

    long assignmentId = createdAssignment.get("assignmentId").asLong();

    JsonNode createdRubric =
        postAsInstructor(
            "/api/instructor/assignments/{assignmentId}/rubrics",
            Map.ofEntries(
                Map.entry("criteriaName", "JWT filter implementation"),
                Map.entry(
                    "criteriaDescription",
                    "Checks whether the submission validates tokens in a request filter."),
                Map.entry("maxPoints", 100),
                Map.entry("displayOrder", 1)),
            assignmentId);

    long rubricId = createdRubric.get("rubricId").asLong();

    JsonNode submittedAttempt =
        postAsLearner(
            "/api/evaluation/learner/quizzes/{quizId}/attempts",
            Map.of(
                "answers", List.of(Map.of("questionId", questionId, "selectedOptionId", wrongOptionId)),
                "timeSpentSeconds", 42),
            quizId);

    long attemptId = submittedAttempt.get("attemptId").asLong();
    assertThat(submittedAttempt.get("quizId").asLong()).isEqualTo(quizId);
    assertThat(submittedAttempt.get("questionResults").get(0).get("correct").asBoolean()).isFalse();

    JsonNode fetchedAttemptResult =
        getAsLearner("/api/evaluation/learner/quizzes/attempts/{attemptId}/result", attemptId);

    assertThat(fetchedAttemptResult.get("attemptId").asLong()).isEqualTo(attemptId);
    assertThat(fetchedAttemptResult.get("questionResults")).hasSize(1);
    assertThat(fetchedAttemptResult.get("questionResults").get(0).get("correctAnswerText").asText())
        .isEqualTo("Security filter chain");

    JsonNode wrongAnswerNote =
        postAsLearner(
            "/api/evaluation/learner/wrong-answer-notes/attempts/{attemptId}",
            Map.of(
                "questionId", questionId,
                "noteContent", "Review why JWT validation belongs in the filter chain."),
            attemptId);

    assertThat(wrongAnswerNote.get("attemptId").asLong()).isEqualTo(attemptId);
    assertThat(wrongAnswerNote.get("questionId").asLong()).isEqualTo(questionId);

    List<Map<String, Object>> submissionFiles =
        List.of(
            Map.of(
                "fileName", "README.md",
                "fileUrl", "https://example.com/swagger-final/README.md",
                "fileSize", 1024,
                "fileType", "md"),
            Map.of(
                "fileName", "project.zip",
                "fileUrl", "https://example.com/swagger-final/project.zip",
                "fileSize", 4096,
                "fileType", "zip"));

    Map<String, Object> submissionPayload =
        Map.ofEntries(
            Map.entry("submissionText", "Implemented JWT login, refresh, and filter validation."),
            Map.entry("submissionUrl", "https://github.com/example/swagger-final-" + suffix),
            Map.entry("hasReadme", true),
            Map.entry("testPassed", true),
            Map.entry("lintPassed", true),
            Map.entry("files", submissionFiles));

    JsonNode precheckResult =
        postAsLearner(
            "/api/evaluation/learner/assignments/{assignmentId}/precheck",
            submissionPayload,
            assignmentId);

    assertThat(precheckResult.get("passed").asBoolean()).isTrue();
    assertThat(precheckResult.get("qualityScore").asInt()).isEqualTo(100);

    JsonNode createdSubmission =
        postAsLearner(
            "/api/evaluation/learner/assignments/{assignmentId}/submissions",
            submissionPayload,
            assignmentId);

    long submissionId = createdSubmission.get("submissionId").asLong();
    assertThat(createdSubmission.get("submissionStatus").asText()).isEqualTo("SUBMITTED");

    JsonNode submissionList =
        getAsInstructor(
            "/api/evaluation/instructor/assignments/{assignmentId}/submissions",
            Map.of("status", "SUBMITTED"),
            assignmentId);

    assertThat(submissionList.isArray()).isTrue();
    assertThat(containsId(submissionList, "submissionId", submissionId)).isTrue();

    JsonNode submissionDetail =
        getAsInstructor("/api/evaluation/instructor/submissions/{submissionId}", submissionId);

    assertThat(submissionDetail.get("submissionId").asLong()).isEqualTo(submissionId);
    assertThat(submissionDetail.get("files")).hasSize(2);
    assertThat(submissionDetail.get("rubrics")).hasSize(1);
    assertThat(submissionDetail.get("qualityScore").asInt()).isEqualTo(100);

    JsonNode gradedSubmission =
        postAsInstructor(
            "/api/evaluation/instructor/submissions/{submissionId}/grade",
            Map.of(
                "rubricScores",
                List.of(Map.of("rubricId", rubricId, "earnedPoints", 85))),
            submissionId);

    assertThat(gradedSubmission.get("submissionId").asLong()).isEqualTo(submissionId);
    assertThat(gradedSubmission.get("submissionStatus").asText()).isEqualTo("GRADED");
    assertThat(gradedSubmission.get("totalScore").asInt()).isEqualTo(85);

    JsonNode feedback =
        postAsInstructor(
            "/api/evaluation/instructor/submissions/{submissionId}/feedback",
            Map.of(
                "feedbackType", "INDIVIDUAL",
                "content", "JWT validation flow is correct, but error handling can be clearer."),
            submissionId);

    assertThat(feedback.get("submissionId").asLong()).isEqualTo(submissionId);
    assertThat(feedback.get("feedbackType").asText()).isEqualTo("INDIVIDUAL");
    assertThat(feedback.get("totalScore").asInt()).isEqualTo(85);

    JsonNode draftForAdoption =
        postAsInstructor(
            "/api/evaluation/instructor/ai-quiz-drafts",
            Map.ofEntries(
                Map.entry("nodeId", roadmapNodeId),
                Map.entry("title", "Swagger AI Draft Adopt " + suffix),
                Map.entry("description", "AI draft prepared for adoption"),
                Map.entry("quizType", "AI_VIDEO"),
                Map.entry(
                    "sourceText",
                    "Spring Security handles authentication and authorization through a filter chain."),
                Map.entry("sourceTimestamp", "12:10-13:20"),
                Map.entry("questionCount", 2),
                Map.entry("preferredQuestionType", "MULTIPLE_CHOICE")));

    long adoptDraftId = draftForAdoption.get("draftId").asLong();

    JsonNode adoptedDraft =
        postAsInstructor(
            "/api/evaluation/instructor/ai-quiz-drafts/{draftId}/adopt",
            Map.of(
                "title", "Swagger AI Final Quiz " + suffix,
                "description", "Adopted AI-generated quiz",
                "publish", true,
                "exposeAnswer", true,
                "exposeExplanation", true),
            adoptDraftId);

    long adoptedQuizId = adoptedDraft.get("adoptedQuizId").asLong();
    assertThat(adoptedDraft.get("status").asText()).isEqualTo("ADOPTED");
    assertThat(adoptedQuizId).isPositive();

    JsonNode draftForRejection =
        postAsInstructor(
            "/api/evaluation/instructor/ai-quiz-drafts",
            Map.ofEntries(
                Map.entry("nodeId", roadmapNodeId),
                Map.entry("title", "Swagger AI Draft Reject " + suffix),
                Map.entry("description", "AI draft prepared for rejection"),
                Map.entry("quizType", "AI_TOPIC"),
                Map.entry(
                    "sourceText",
                    "JWT can be generated after successful authentication and used on subsequent requests."),
                Map.entry("sourceTimestamp", "08:00-09:00"),
                Map.entry("questionCount", 1),
                Map.entry("preferredQuestionType", "MULTIPLE_CHOICE")));

    JsonNode rejectedDraft =
        postAsInstructor(
            "/api/evaluation/instructor/ai-quiz-drafts/{draftId}/reject",
            Map.of("reason", "Need stronger distractors and more precise wording."),
            draftForRejection.get("draftId").asLong());

    assertThat(rejectedDraft.get("status").asText()).isEqualTo("REJECTED");
    assertThat(rejectedDraft.get("rejectedReason").asText())
        .isEqualTo("Need stronger distractors and more precise wording.");

    JsonNode draftForUpdate =
        postAsInstructor(
            "/api/evaluation/instructor/ai-quiz-drafts",
            Map.ofEntries(
                Map.entry("nodeId", roadmapNodeId),
                Map.entry("title", "Swagger AI Draft Update " + suffix),
                Map.entry("description", "AI draft prepared for update and evidence lookup"),
                Map.entry("quizType", "AI_VIDEO"),
                Map.entry(
                    "sourceText",
                    "Spring Security provides authentication and authorization support for backend services."),
                Map.entry("sourceTimestamp", "15:00-16:00"),
                Map.entry("questionCount", 1),
                Map.entry("preferredQuestionType", "MULTIPLE_CHOICE")));

    long updateDraftId = draftForUpdate.get("draftId").asLong();

    JsonNode updatedDraft =
        putAsInstructor(
            "/api/evaluation/instructor/ai-quiz-drafts/{draftId}",
            Map.ofEntries(
                Map.entry("title", "Swagger AI Draft Updated " + suffix),
                Map.entry("description", "Instructor-reviewed AI draft"),
                Map.entry(
                    "questions",
                    List.of(
                        Map.of(
                            "questionType", "MULTIPLE_CHOICE",
                            "questionText", "What is Spring Security mainly responsible for?",
                            "explanation", "It focuses on authentication and authorization.",
                            "points", 5,
                            "displayOrder", 1,
                            "sourceTimestamp", "15:10-15:40",
                            "options",
                            List.of(
                                Map.of(
                                    "optionText", "Authentication and authorization",
                                    "correct", true,
                                    "displayOrder", 1),
                                Map.of(
                                    "optionText", "CSS styling",
                                    "correct", false,
                                    "displayOrder", 2)))))),
            updateDraftId);

    assertThat(updatedDraft.get("draftId").asLong()).isEqualTo(updateDraftId);
    assertThat(updatedDraft.get("title").asText()).startsWith("Swagger AI Draft Updated");
    assertThat(updatedDraft.get("questions")).hasSize(1);

    JsonNode evidence =
        getAsInstructor(
            "/api/evaluation/instructor/ai-quiz-drafts/{draftId}/evidence", updateDraftId);

    assertThat(evidence.get("draftId").asLong()).isEqualTo(updateDraftId);
    assertThat(evidence.get("evidences")).hasSize(1);
    assertThat(evidence.get("evidences").get(0).get("questionText").asText())
        .isEqualTo("What is Spring Security mainly responsible for?");

    JsonNode questionBankStats =
        getAsInstructor("/api/evaluation/instructor/question-bank/stats");

    assertThat(questionBankStats.get("adoptedAiDraftCount").asLong()).isGreaterThanOrEqualTo(1L);
    assertThat(questionBankStats.get("totalQuestionCount").asLong()).isGreaterThanOrEqualTo(3L);
    assertThat(containsId(questionBankStats.get("quizzes"), "quizId", quizId)).isTrue();
    assertThat(containsId(questionBankStats.get("quizzes"), "quizId", adoptedQuizId)).isTrue();
  }

  private JsonNode postAsInstructor(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(
        post(url, uriVariables), instructorAuthentication(), instructorId, body, null);
  }

  private JsonNode putAsInstructor(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(
        put(url, uriVariables), instructorAuthentication(), instructorId, body, null);
  }

  private JsonNode getAsInstructor(String url, Object... uriVariables) throws Exception {
    return performAndReadData(get(url, uriVariables), instructorAuthentication(), instructorId, null, null);
  }

  private JsonNode getAsInstructor(String url, Map<String, String> queryParams, Object... uriVariables)
      throws Exception {
    return performAndReadData(get(url, uriVariables), instructorAuthentication(), instructorId, null, queryParams);
  }

  private JsonNode postAsLearner(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(post(url, uriVariables), learnerAuthentication(), learnerId, body, null);
  }

  private JsonNode getAsLearner(String url, Object... uriVariables) throws Exception {
    return performAndReadData(get(url, uriVariables), learnerAuthentication(), learnerId, null, null);
  }

  private JsonNode performAndReadData(
      MockHttpServletRequestBuilder builder,
      UsernamePasswordAuthenticationToken authenticationToken,
      Long actingUserId,
      Object body,
      Map<String, String> queryParams)
      throws Exception {
    builder =
        builder
            .with(authentication(authenticationToken))
            .param("userId", String.valueOf(actingUserId));

    if (queryParams != null) {
      for (Map.Entry<String, String> queryParam : queryParams.entrySet()) {
        builder = builder.param(queryParam.getKey(), queryParam.getValue());
      }
    }

    if (body != null) {
      builder =
          builder
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(body));
    }

    MvcResult result =
        mockMvc
            .perform(builder)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andReturn();

    JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
    return root.get("data");
  }

  private boolean containsId(JsonNode items, String fieldName, long expectedId) {
    for (JsonNode item : items) {
      if (item.has(fieldName) && item.get(fieldName).asLong() == expectedId) {
        return true;
      }
    }
    return false;
  }

  private UsernamePasswordAuthenticationToken instructorAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        instructorId, null, AuthorityUtils.createAuthorityList("ROLE_INSTRUCTOR"));
  }

  private UsernamePasswordAuthenticationToken learnerAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        learnerId, null, AuthorityUtils.createAuthorityList("ROLE_LEARNER"));
  }
}
