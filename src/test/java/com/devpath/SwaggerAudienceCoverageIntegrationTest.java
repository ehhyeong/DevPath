package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(
    properties = {"spring.sql.init.mode=always", "spring.jpa.defer-datasource-initialization=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SwaggerAudienceCoverageIntegrationTest {

  @Autowired private MockMvc mockMvc;

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void learnerGroupIncludesWeek3LearnerFacingApis() throws Exception {
    JsonNode learnerDoc = getOpenApi("learner");

    assertOperationsPresent(
        learnerDoc,
        List.of(
            new ExpectedOperation("post", "/api/evaluation/learner/quizzes/{quizId}/attempts"),
            new ExpectedOperation(
                "get", "/api/evaluation/learner/quizzes/attempts/{attemptId}/result"),
            new ExpectedOperation(
                "post", "/api/evaluation/learner/assignments/{assignmentId}/precheck"),
            new ExpectedOperation(
                "post", "/api/evaluation/learner/assignments/{assignmentId}/submissions"),
            new ExpectedOperation("get", "/api/evaluation/learner/assignments/submissions/history"),
            new ExpectedOperation(
                "post", "/api/evaluation/learner/wrong-answer-notes/attempts/{attemptId}"),
            new ExpectedOperation("post", "/api/learning/sessions/{lessonId}/start"),
            new ExpectedOperation("put", "/api/learning/sessions/{lessonId}/progress"),
            new ExpectedOperation("get", "/api/learning/sessions/{lessonId}/progress"),
            new ExpectedOperation("get", "/api/learning/player/{lessonId}/config"),
            new ExpectedOperation("put", "/api/learning/player/{lessonId}/config"),
            new ExpectedOperation("patch", "/api/learning/player/{lessonId}/config/pip"),
            new ExpectedOperation("post", "/api/learning/lessons/{lessonId}/notes"),
            new ExpectedOperation("get", "/api/learning/lessons/{lessonId}/notes"),
            new ExpectedOperation("get", "/api/learning/lessons/{lessonId}/materials"),
            new ExpectedOperation(
                "get", "/api/learning/lessons/{lessonId}/materials/{materialId}/download"),
            new ExpectedOperation("post", "/api/learning/lessons/{lessonId}/ocr"),
            new ExpectedOperation("get", "/api/learning/ocr/{ocrId}"),
            new ExpectedOperation("get", "/api/learning/lessons/{lessonId}/ocr/search"),
            new ExpectedOperation("get", "/api/learning/lessons/{lessonId}/ocr/mappings"),
            new ExpectedOperation("post", "/api/learning/til/draft"),
            new ExpectedOperation("get", "/api/learning/til/{tilId}"),
            new ExpectedOperation("get", "/api/learning/til"),
            new ExpectedOperation("post", "/api/learning/til/convert"),
            new ExpectedOperation("post", "/api/learning/til/{tilId}/publish"),
            new ExpectedOperation("post", "/api/learning/til/{tilId}/toc"),
            new ExpectedOperation("get", "/api/learning/weakness-analysis/results/{resultId}"),
            new ExpectedOperation(
                "get", "/api/learning/weakness-analysis/roadmaps/{roadmapId}/latest"),
            new ExpectedOperation("post", "/api/learning/supplement-recommendations"),
            new ExpectedOperation("get", "/api/learning/supplement-recommendations"),
            new ExpectedOperation("get", "/api/learning/supplement-recommendations/histories"),
            new ExpectedOperation("get", "/api/learning/supplement-recommendations/risk-warnings"),
            new ExpectedOperation("post", "/api/me/roadmaps/{roadmapId}/recommendations/init"),
            new ExpectedOperation("get", "/api/me/roadmaps/{roadmapId}/recommendations"),
            new ExpectedOperation("get", "/api/recommendations/history"),
            new ExpectedOperation("get", "/api/recommendations/risk-warnings"),
            new ExpectedOperation("post", "/api/qna/questions"),
            new ExpectedOperation("get", "/api/qna/questions"),
            new ExpectedOperation("get", "/api/qna/questions/{questionId}"),
            new ExpectedOperation("get", "/api/qna/questions/duplicate-suggestions"),
            new ExpectedOperation("post", "/api/qna/questions/{questionId}/answers"),
            new ExpectedOperation(
                "patch", "/api/qna/questions/{questionId}/answers/{answerId}/adopt"),
            new ExpectedOperation("get", "/api/qna/templates"),
            new ExpectedOperation("post", "/api/posts"),
            new ExpectedOperation("get", "/api/posts"),
            new ExpectedOperation("get", "/api/posts/{postId}"),
            new ExpectedOperation("put", "/api/posts/{postId}"),
            new ExpectedOperation("delete", "/api/posts/{postId}"),
            new ExpectedOperation("get", "/api/posts/me"),
            new ExpectedOperation("post", "/api/posts/{postId}/comments"),
            new ExpectedOperation("post", "/api/posts/{postId}/comments/{commentId}/replies"),
            new ExpectedOperation("get", "/api/posts/{postId}/comments"),
            new ExpectedOperation("delete", "/api/comments/{commentId}"),
            new ExpectedOperation("post", "/api/posts/{postId}/likes"),
            new ExpectedOperation("delete", "/api/posts/{postId}/likes")));
  }

  @Test
  void instructorGroupIncludesWeek3InstructorFacingApis() throws Exception {
    JsonNode instructorDoc = getOpenApi("instructor");

    assertOperationsPresent(
        instructorDoc,
        List.of(
            new ExpectedOperation("post", "/api/instructor/assignments"),
            new ExpectedOperation(
                "patch", "/api/instructor/assignments/{assignmentId}/submission-rule"),
            new ExpectedOperation("post", "/api/instructor/assignments/{assignmentId}/rubrics"),
            new ExpectedOperation("patch", "/api/instructor/rubrics/{rubricId}"),
            new ExpectedOperation("post", "/api/instructor/quizzes"),
            new ExpectedOperation("post", "/api/instructor/quizzes/{quizId}/questions"),
            new ExpectedOperation(
                "patch",
                "/api/instructor/quizzes/{quizId}/questions/{questionId}/answer-explanation"),
            new ExpectedOperation("post", "/api/evaluation/instructor/ai-quiz-drafts"),
            new ExpectedOperation(
                "post", "/api/evaluation/instructor/ai-quiz-drafts/{draftId}/adopt"),
            new ExpectedOperation(
                "post", "/api/evaluation/instructor/ai-quiz-drafts/{draftId}/reject"),
            new ExpectedOperation("put", "/api/evaluation/instructor/ai-quiz-drafts/{draftId}"),
            new ExpectedOperation(
                "get", "/api/evaluation/instructor/ai-quiz-drafts/{draftId}/evidence"),
            new ExpectedOperation("get", "/api/evaluation/instructor/question-bank/stats"),
            new ExpectedOperation(
                "get", "/api/evaluation/instructor/assignments/{assignmentId}/submissions"),
            new ExpectedOperation("get", "/api/evaluation/instructor/submissions/{submissionId}"),
            new ExpectedOperation(
                "get", "/api/evaluation/instructor/submissions/{submissionId}/precheck"),
            new ExpectedOperation(
                "post", "/api/evaluation/instructor/submissions/{submissionId}/grade"),
            new ExpectedOperation(
                "post", "/api/evaluation/instructor/submissions/{submissionId}/feedback")));
  }

  @Test
  void rootOpenApiUsesKoreanEvaluationTags() throws Exception {
    JsonNode rootDoc = getOpenApi();
    List<String> tagNames =
        StreamSupport.stream(rootDoc.path("tags").spliterator(), false)
            .map(tag -> tag.path("name").asText())
            .toList();

    assertThat(tagNames)
        .contains(
            "강의 평가 - AI 퀴즈 초안",
            "강의 평가 - 과제 관리",
            "강의 평가 - 제출물 피드백",
            "강의 평가 - 퀴즈 출제",
            "강의 평가 - 루브릭",
            "강의 평가 - 제출물 채점",
            "강의 평가 - 과제 제출",
            "강의 평가 - 퀴즈 응시",
            "강의 평가 - 문제 은행",
            "강의 평가 - 오답 노트")
        .doesNotContain(
            "Instructor - AI Quiz Draft",
            "Instructor - Assignment",
            "Instructor - Feedback",
            "Instructor - Quiz",
            "Instructor - Rubric",
            "Instructor - Submission",
            "Learner - Assignment",
            "Learner - Quiz",
            "Instructor - Question Bank",
            "Learner - Wrong Answer Note");
  }

  private JsonNode getOpenApi(String group) throws Exception {
    MvcResult result =
        mockMvc.perform(get("/v3/api-docs/{group}", group)).andExpect(status().isOk()).andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString());
  }

  private JsonNode getOpenApi() throws Exception {
    MvcResult result = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString());
  }

  private void assertOperationsPresent(JsonNode openApi, List<ExpectedOperation> operations) {
    JsonNode paths = openApi.path("paths");
    for (ExpectedOperation operation : operations) {
      JsonNode pathNode = paths.path(operation.path());
      assertThat(pathNode.isMissingNode())
          .as("missing swagger path %s", operation.path())
          .isFalse();
      assertThat(pathNode.has(operation.method()))
          .as("missing swagger operation %s %s", operation.method().toUpperCase(), operation.path())
          .isTrue();
    }
  }

  private record ExpectedOperation(String method, String path) {}
}
