package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.api.workspace.dto.WorkspaceAiDesignWorkspaceResponse;
import com.devpath.api.workspace.dto.WorkspaceInterviewRequest.*;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.common.provider.GeminiQuotaExceededException;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.WorkspaceAiDesign;
import com.devpath.domain.workspace.entity.WorkspaceDoc;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import com.devpath.domain.workspace.entity.WorkspaceInterviewPractice;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceInterviewServiceTest {
  final WorkspaceMemberRepository members = mock(WorkspaceMemberRepository.class);
  final WorkspaceInterviewPracticeRepository practices =
      mock(WorkspaceInterviewPracticeRepository.class);
  final WorkspaceDocRepository docs = mock(WorkspaceDocRepository.class);
  final WorkspaceAiDesignRepository designs = mock(WorkspaceAiDesignRepository.class);
  final WorkspaceAiDesignWorkspaceService designService =
      mock(WorkspaceAiDesignWorkspaceService.class);
  final GeminiProvider gemini = mock(GeminiProvider.class);
  final WorkspaceTaskRepository tasks = mock(WorkspaceTaskRepository.class);
  WorkspaceInterviewService service;

  @BeforeEach
  void setUp() {
    service =
        new WorkspaceInterviewService(
            members,
            practices,
            docs,
            designs,
            designService,
            gemini,
            new ObjectMapper(),
            Validation.buildDefaultValidatorFactory().getValidator(),
            mock(UserRepository.class),
            tasks);
  }

  @Test
  void practiceIsOnlyReadForTheAuthenticatedUser() {
    when(members.existsByWorkspaceIdAndLearnerId(42L, 77L)).thenReturn(true);
    when(practices.findByWorkspaceIdAndUserId(42L, 77L))
        .thenReturn(
            Optional.of(
                new WorkspaceInterviewPractice(42L, 77L, "{\"answers\":{},\"sessions\":[]}")));
    assertThat(service.getPractice(42L, 77L).content()).contains("answers");
    assertThatThrownBy(() -> service.getPractice(42L, 88L)).isInstanceOf(CustomException.class);
    verify(practices, never()).findByWorkspaceIdAndUserId(42L, 88L);
  }

  @Test
  void onlyExplicitlySharedAnswersAreVisibleToOtherMembers() {
    when(members.existsByWorkspaceIdAndLearnerId(42L, 77L)).thenReturn(true);
    when(members.findForUpdateByWorkspaceIdAndLearnerId(42L, 77L))
        .thenReturn(Optional.of(WorkspaceMember.builder().build()));
    var practice =
        new WorkspaceInterviewPractice(
            42L, 77L, "{\"answers\":{\"Q2\":{\"text\":\"비공개 답변\"}},\"sessions\":[]}");
    when(practices.findByWorkspaceIdAndUserId(42L, 77L)).thenReturn(Optional.of(practice));
    when(practices.findAllByWorkspaceId(42L)).thenReturn(List.of(practice));
    assertThat(service.getSharedAnswers(42L, 77L)).isEmpty();
    var result = service.shareAnswer(42L, 77L, new Share("Q1", "공유 답변"));
    assertThat(result).hasSize(1);
    assertThat(result.get(0).text()).isEqualTo("공유 답변");
    assertThat(practice.getContent()).contains("비공개 답변");
  }

  @Test
  void saveUpdatesOwnedRecordAndRejectsInvalidJson() {
    when(members.existsByWorkspaceIdAndLearnerId(42L, 77L)).thenReturn(true);
    when(members.findForUpdateByWorkspaceIdAndLearnerId(42L, 77L))
        .thenReturn(Optional.of(WorkspaceMember.builder().build()));
    var owned = new WorkspaceInterviewPractice(42L, 77L, "{}");
    when(practices.findByWorkspaceIdAndUserId(42L, 77L)).thenReturn(Optional.of(owned));
    var value = new Practice("{\"answers\":{\"Q1\":{\"text\":\"내 답변\"}},\"sessions\":[]}");
    service.savePractice(42L, 77L, value);
    assertThat(owned.getContent()).isEqualTo(value.content());
    assertThatThrownBy(() -> service.savePractice(42L, 77L, new Practice("[]")))
        .isInstanceOf(CustomException.class);
    verify(practices, never()).save(any());
  }

  @Test
  void evaluationReturnsActualAiScoreAndRejectsMalformedOutput() {
    when(designService.get(77L, 42L))
        .thenReturn(new WorkspaceAiDesignWorkspaceResponse(42L, "", null, null));
    when(gemini.generateJson(anyString()))
        .thenReturn("{\"score\":82,\"feedback\":\"동시성 사례를 보강하세요.\"}");
    assertThat(service.evaluate(42L, 77L, new Evaluation("질문", "답변")).score()).isEqualTo(82);
    when(gemini.generateJson(anyString())).thenReturn("not json");
    assertThatThrownBy(() -> service.evaluate(42L, 77L, new Evaluation("질문", "답변")))
        .isInstanceOf(CustomException.class);
  }

  @Test
  void generatedQuestionsExcludeExistingAndRepeatedTextAndPreserveSource() {
    prepareGeneration();
    when(gemini.generateJson(anyString()))
        .thenReturn(
            """
        {"questions":[
          {"id":"G1","category":"설계","question":"중복 신고는 어떻게 막나요 ?","answer":"기존 답안","keywords":[],"level":2},
          {"id":"G2","category":"보안","question":"신고 소유권 검증은?","answer":"작성자 ID 비교","keywords":["인가"],"level":2,"from":"PATCH /reports/{id}"},
          {"id":"G3","category":"보안","question":"신고 소유권 검증은!","answer":"중복 답안","keywords":[],"level":2}
        ]}
        """);
    var generated = service.generateQuestions(42L, 77L);
    assertThat(generated.questions()).hasSize(1);
    var question = generated.questions().getFirst();
    assertThat(question.id()).startsWith("G").isNotEqualTo("G2");
    assertThat(question.from()).isEqualTo("PATCH /reports/{id}");
    assertThat(question.source()).isEqualTo("generated");
    verify(gemini).generateJson(contains("중복 신고는 어떻게 막나요?"));
    when(designs.findForUpdateByWorkspaceId(42L))
        .thenReturn(Optional.of(mock(WorkspaceAiDesign.class)));
    service.saveQuestions(42L, 77L, generated);
    assertThat(service.getQuestions(42L, 77L).questions().getFirst().from())
        .isEqualTo("PATCH /reports/{id}");
  }

  @Test
  void generatedBlankAnswersAndDuplicateOnlyOutputAreRejected() {
    prepareGeneration();
    when(gemini.generateJson(anyString()))
        .thenReturn(
            """
        {"questions":[{"id":"G1","category":"설계","question":"새 질문","answer":" ","keywords":[],"level":2}]}
        """);
    assertThatThrownBy(() -> service.generateQuestions(42L, 77L))
        .isInstanceOfSatisfying(
            CustomException.class,
            exception ->
                assertThat(exception.getErrorCode())
                    .isEqualTo(ErrorCode.WORKSPACE_AI_DESIGN_FAILED));
    when(gemini.generateJson(anyString()))
        .thenReturn(
            """
        {"questions":[{"id":"G1","category":"설계","question":"중복 신고는 어떻게 막나요?","answer":"기존 답안","keywords":[],"level":2}]}
        """);
    assertThatThrownBy(() -> service.generateQuestions(42L, 77L))
        .isInstanceOf(CustomException.class);
  }

  @Test
  void generationQuotaErrorUsesRetryableApiErrorWithoutMockQuestions() {
    prepareGeneration();
    when(gemini.generateJson(anyString())).thenThrow(new GeminiQuotaExceededException());
    assertThatThrownBy(() -> service.generateQuestions(42L, 77L))
        .isInstanceOfSatisfying(
            CustomException.class,
            exception ->
                assertThat(exception.getErrorCode())
                    .isEqualTo(ErrorCode.WORKSPACE_AI_QUOTA_EXCEEDED));
  }

  private void prepareGeneration() {
    when(members.existsByWorkspaceIdAndLearnerId(42L, 77L)).thenReturn(true);
    when(designService.get(77L, 42L))
        .thenReturn(new WorkspaceAiDesignWorkspaceResponse(42L, "", null, null));
    when(docs.findByWorkspaceIdAndDocType(42L, WorkspaceDocType.INTERVIEW_QUESTIONS))
        .thenReturn(
            Optional.of(
                WorkspaceDoc.builder()
                    .content(
                        """
            {"questions":[{"id":"Q1","category":"설계","question":"중복 신고는 어떻게 막나요?","answer":"요청 검증","keywords":[],"level":2,"source":"ai"}]}
            """)
                    .build()));
  }

  @Test
  void questionEvidenceMapsRoadmapNamesToActualTasksAndSurvivesSave() {
    prepareGeneration();
    when(tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(
            List.of(WorkspaceTask.builder().id(101L).workspaceId(42L).title("신고 저장").build()));
    when(designs.findForUpdateByWorkspaceId(42L))
        .thenReturn(Optional.of(mock(WorkspaceAiDesign.class)));
    var question =
        new Question(
            "Q1",
            "핵심 난제",
            "중복 방지는?",
            "검증",
            List.of("정합성"),
            3,
            "ai",
            "신고 저장",
            List.of("신고 저장", "DP-999"),
            List.of("POST /reports"),
            "REPORTS");
    var saved = service.saveQuestions(42L, 77L, new Questions(List.of(question)));
    assertThat(saved.questions().getFirst().tasks()).containsExactly("DP-101");
    var loaded = service.getQuestions(42L, 77L).questions().getFirst();
    assertThat(loaded.category()).isEqualTo("핵심 난제");
    assertThat(loaded.apis()).containsExactly("POST /reports");
    assertThat(loaded.erd()).isEqualTo("REPORTS");
    assertThat(loaded.tasks()).containsExactly("DP-101");
  }

  @Test
  void oldQuestionWithoutEvidenceDoesNotAcquireUnrelatedTasks() {
    prepareGeneration();
    when(tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(
            List.of(WorkspaceTask.builder().id(101L).workspaceId(42L).title("신고 저장").build()));
    assertThat(service.getQuestions(42L, 77L).questions().getFirst().tasks()).isEmpty();
  }

  @Test
  void initialDesignEvidenceLinksToActualTasksWithoutRequiringSavedQuestionDocument()
      throws Exception {
    when(members.existsByWorkspaceIdAndLearnerId(42L, 77L)).thenReturn(true);
    var design =
        new ObjectMapper()
            .readValue(
                """
        {"interviewQuestions":[{"category":"보안","question":"신고 인가는?","answer":"작성자 확인","keywords":[],"tasks":["인가 구현"],"apis":["POST /reports"],"erd":"REPORTS"}]}
        """,
                WorkspaceAiDesignResponse.class);
    when(designService.get(77L, 42L))
        .thenReturn(new WorkspaceAiDesignWorkspaceResponse(42L, "", null, design));
    when(tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(
            List.of(WorkspaceTask.builder().id(101L).workspaceId(42L).title("인가 구현").build()));
    var question = service.getQuestions(42L, 77L).questions().getFirst();
    assertThat(question.tasks()).containsExactly("DP-101");
    assertThat(question.apis()).containsExactly("POST /reports");
    assertThat(question.erd()).isEqualTo("REPORTS");
  }

  @Test
  void generatedEvidenceUsesCurrentTaskIdsAndSavedApiSpecification() {
    prepareGeneration();
    when(tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(
            List.of(WorkspaceTask.builder().id(101L).workspaceId(42L).title("인가 구현").build()));
    when(docs.findByWorkspaceIdAndDocType(42L, WorkspaceDocType.API_SPEC))
        .thenReturn(Optional.of(WorkspaceDoc.builder().content("POST /reports").build()));
    when(gemini.generateJson(anyString()))
        .thenReturn(
            """
        {"questions":[{"id":"G1","category":"보안","question":"인가 검증은?","answer":"작성자 확인","keywords":[],"level":2,"tasks":["DP-101"],"apis":["POST /reports"],"erd":"REPORTS"}]}
        """);
    var question = service.generateQuestions(42L, 77L).questions().getFirst();
    assertThat(question.tasks()).containsExactly("DP-101");
    assertThat(question.apis()).containsExactly("POST /reports");
    assertThat(question.erd()).isEqualTo("REPORTS");
    verify(gemini)
        .generateJson(
            argThat(
                prompt ->
                    prompt.contains("현재 작업 데이터=")
                        && prompt.contains("\"id\":\"DP-101\"")
                        && prompt.contains("\"title\":\"인가 구현\"")
                        && prompt.contains("저장된 API 명세서 데이터=POST /reports")));
  }
}
