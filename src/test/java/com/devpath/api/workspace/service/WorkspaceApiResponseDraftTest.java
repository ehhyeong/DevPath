package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.api.workspace.dto.WorkspaceAiDesignWorkspaceResponse;
import com.devpath.api.workspace.dto.WorkspaceApiResponseDraft;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.common.provider.GeminiQuotaExceededException;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class WorkspaceApiResponseDraftTest {
  final WorkspaceDocRepository docs = mock(WorkspaceDocRepository.class);
  final WorkspaceAiDesignWorkspaceService designs = mock(WorkspaceAiDesignWorkspaceService.class);
  final GeminiProvider gemini = mock(GeminiProvider.class);
  final ObjectMapper mapper = new ObjectMapper();
  final WorkspaceDocService service =
      new WorkspaceDocService(
          docs,
          mock(MeetingNoteRepository.class),
          mock(WorkspaceRepository.class),
          mock(WorkspaceMemberRepository.class),
          mock(ActivityLogRepository.class),
          mock(UserRepository.class),
          mock(TeamWorkspaceHeaderNotificationService.class),
          designs,
          gemini,
          mapper);
  final WorkspaceApiResponseDraft.Request request =
      new WorkspaceApiResponseDraft.Request("POST", "/reports", "신고 생성", "신고", "{}");

  void givenDesign() throws Exception {
    var design =
        mapper.readValue(
            "{\"title\":\"신고 플랫폼\",\"architecture\":{\"entities\":[]}}",
            WorkspaceAiDesignResponse.class);
    when(designs.get(7L, 12L))
        .thenReturn(new WorkspaceAiDesignWorkspaceResponse(12L, "", null, design));
  }

  @Test
  void generatesValidatedDraftWithoutSavingDocument() throws Exception {
    givenDesign();
    when(gemini.generateJsonOrThrowOnQuota(anyString(), anyMap(), eq(4096)))
        .thenReturn(mapper.writeValueAsString(Map.of("status", 201, "body", "{\"id\":1}")));
    assertThat(service.generateApiResponseDraft(12L, 7L, request))
        .isEqualTo(new WorkspaceApiResponseDraft.Response(201, "{\"id\":1}"));
    verify(designs).get(7L, 12L);
    verify(gemini).generateJsonOrThrowOnQuota(contains("신고 플랫폼"), anyMap(), eq(4096));
    verifyNoInteractions(docs);
  }

  @Test
  void rejectsNonMemberBeforeCallingGemini() {
    when(designs.get(7L, 12L)).thenThrow(new CustomException(ErrorCode.WORKSPACE_FORBIDDEN));
    assertThatThrownBy(() -> service.generateApiResponseDraft(12L, 7L, request))
        .isInstanceOfSatisfying(
            CustomException.class,
            error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.WORKSPACE_FORBIDDEN));
    verifyNoInteractions(gemini, docs);
  }

  @Test
  void mapsQuotaToRetryableError() throws Exception {
    givenDesign();
    when(gemini.generateJsonOrThrowOnQuota(anyString(), anyMap(), eq(4096)))
        .thenThrow(new GeminiQuotaExceededException());
    assertThatThrownBy(() -> service.generateApiResponseDraft(12L, 7L, request))
        .isInstanceOfSatisfying(
            CustomException.class,
            error ->
                assertThat(error.getErrorCode()).isEqualTo(ErrorCode.WORKSPACE_AI_QUOTA_EXCEEDED));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "",
        "null",
        "{}",
        "{\"status\":200.5,\"body\":\"{}\"}",
        "{\"status\":600,\"body\":\"{}\"}",
        "{\"status\":200,\"body\":\"broken\"}",
        "{\"status\":204,\"body\":\"{}\"}",
        "{\"status\":200,\"body\":\"{} {}\"}"
      })
  void rejectsMalformedAiDraft(String raw) throws Exception {
    givenDesign();
    when(gemini.generateJsonOrThrowOnQuota(anyString(), anyMap(), eq(4096))).thenReturn(raw);
    assertThatThrownBy(() -> service.generateApiResponseDraft(12L, 7L, request))
        .isInstanceOfSatisfying(
            CustomException.class,
            error ->
                assertThat(error.getErrorCode())
                    .isEqualTo(ErrorCode.WORKSPACE_AI_RESPONSE_DRAFT_FAILED));
    verifyNoInteractions(docs);
  }

  @ParameterizedTest
  @ValueSource(ints = {204, 304})
  void acceptsResponseWithoutBody(int status) throws Exception {
    givenDesign();
    when(gemini.generateJsonOrThrowOnQuota(anyString(), anyMap(), eq(4096)))
        .thenReturn(mapper.writeValueAsString(Map.of("status", status, "body", "")));
    assertThat(service.generateApiResponseDraft(12L, 7L, request).body()).isEmpty();
  }

  @Test
  void validatesRequestBeforeGeneration() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertThat(factory.getValidator().validate(request)).isEmpty();
      assertThat(
              factory
                  .getValidator()
                  .validate(
                      new WorkspaceApiResponseDraft.Request(
                          "HEAD", "https://invalid", " ", "신고", "")))
          .hasSize(3);
    }
  }
}
