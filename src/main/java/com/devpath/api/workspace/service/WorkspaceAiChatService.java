package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiAction;
import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.api.workspace.dto.WorkspaceAiAssistResponse;
import com.devpath.api.workspace.dto.WorkspaceAiChatMessageResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.WorkspaceAiChatActionStatus;
import com.devpath.domain.workspace.entity.WorkspaceAiChatMessage;
import com.devpath.domain.workspace.repository.WorkspaceAiChatMessageRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 팀원이 함께 쓰는 워크스페이스 AI 에이전트 대화. 질문·답변·실행 결과를 저장해 기기와 팀원 사이에서 이어지게 한다. */
@Service
@RequiredArgsConstructor
public class WorkspaceAiChatService {

  private static final TypeReference<List<WorkspaceAiAction>> ACTION_LIST =
      new TypeReference<>() {};

  private final WorkspaceAiChatMessageRepository workspaceAiChatMessageRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final UserRepository userRepository;
  private final WorkspaceAiAssistService workspaceAiAssistService;
  private final WorkspaceAiActionService workspaceAiActionService;
  private final ObjectMapper objectMapper;

  @Transactional(readOnly = true)
  public List<WorkspaceAiChatMessageResponse> getMessages(Long workspaceId, Long userId) {
    validateMember(workspaceId, userId);
    List<WorkspaceAiChatMessage> messages =
        new ArrayList<>(
            workspaceAiChatMessageRepository.findTop50ByWorkspaceIdAndIsDeletedFalseOrderByIdDesc(
                workspaceId));
    Collections.reverse(messages);
    return toResponses(messages);
  }

  // AI 호출이 길어 트랜잭션을 열지 않는다. 답변을 받은 뒤 질문과 답변을 함께 저장하고, 실패하면 아무것도 남기지 않는다.
  public WorkspaceAiChatMessageResponse ask(
      Long workspaceId, Long userId, WorkspaceAiAssistRequest request) {
    validateMember(workspaceId, userId);
    WorkspaceAiAssistResponse answer = workspaceAiAssistService.ask(workspaceId, userId, request);
    String actionsJson = answer.getActions().isEmpty() ? null : writeActions(answer.getActions());
    List<WorkspaceAiChatMessage> saved =
        workspaceAiChatMessageRepository.saveAll(
            List.of(
                WorkspaceAiChatMessage.question(workspaceId, userId, request.getQuestion()),
                WorkspaceAiChatMessage.answer(workspaceId, userId, answer.getAnswer(), actionsJson)));
    return toResponses(List.of(saved.get(1))).get(0);
  }

  /** 저장된 제안을 실행 완료로 바꾼 뒤 실행한다. 실행이 실패하면 상태도 함께 되돌아가고, 이미 실행된 제안은 거부한다. */
  @Transactional
  public WorkspaceAiChatMessageResponse executeActions(
      Long workspaceId, Long userId, Long messageId, List<WorkspaceAiAction> actions) {
    validateMember(workspaceId, userId);
    int changed =
        workspaceAiChatMessageRepository.changeActionStatus(
            messageId,
            workspaceId,
            WorkspaceAiChatActionStatus.PENDING,
            WorkspaceAiChatActionStatus.EXECUTED);

    if (changed == 0) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_CHAT_ACTION_UNAVAILABLE);
    }

    List<String> results =
        workspaceAiActionService.execute(workspaceId, userId, actions).getResults();
    String content =
        Stream.concat(Stream.of("변경을 반영했습니다."), results.stream().map(result -> "- " + result))
            .collect(Collectors.joining("\n"));
    WorkspaceAiChatMessage saved =
        workspaceAiChatMessageRepository.save(
            WorkspaceAiChatMessage.answer(workspaceId, userId, content, null));
    return toResponses(List.of(saved)).get(0);
  }

  @Transactional
  public void clearMessages(Long workspaceId, Long userId) {
    validateMember(workspaceId, userId);
    workspaceAiChatMessageRepository.softDeleteAllByWorkspaceId(workspaceId);
  }

  // --- 내부 헬퍼 ---

  private List<WorkspaceAiChatMessageResponse> toResponses(List<WorkspaceAiChatMessage> messages) {
    Map<Long, String> authorNames =
        userRepository
            .findAllById(
                messages.stream().map(WorkspaceAiChatMessage::getUserId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(User::getId, User::getName));

    return messages.stream()
        .map(
            message ->
                WorkspaceAiChatMessageResponse.builder()
                    .id(message.getId())
                    .role(message.getRole().name())
                    .authorId(message.getUserId())
                    .authorName(authorNames.get(message.getUserId()))
                    .content(message.getContent())
                    .actions(readActions(message.getActionsJson()))
                    .actionStatus(
                        message.getActionStatus() == null
                            ? null
                            : message.getActionStatus().name())
                    .build())
        .toList();
  }

  private String writeActions(List<WorkspaceAiAction> actions) {
    try {
      return objectMapper.writeValueAsString(actions);
    } catch (JsonProcessingException e) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_ASSIST_FAILED);
    }
  }

  private List<WorkspaceAiAction> readActions(String actionsJson) {
    if (actionsJson == null) {
      return List.of();
    }

    try {
      return objectMapper.readValue(actionsJson, ACTION_LIST);
    } catch (JsonProcessingException e) {
      return List.of();
    }
  }

  private void validateMember(Long workspaceId, Long userId) {
    workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));

    if (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)
        || workspaceRepository.existsByIdAndOwnerIdAndIsDeletedFalse(workspaceId, userId)) {
      return;
    }

    throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
  }
}
