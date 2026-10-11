package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.api.workspace.dto.WorkspaceErdRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.entity.WorkspaceAiDesign;
import com.devpath.domain.workspace.entity.WorkspaceDoc;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignRepository;
import com.devpath.domain.workspace.repository.WorkspaceDocRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceAiWorkspaceInitializationService {
  private final WorkspaceAiDesignRepository designRepository;
  private final WorkspaceMemberRepository memberRepository;
  private final WorkspaceDocRepository docRepository;
  private final CalendarEventRepository calendarRepository;
  private final MilestoneRepository milestoneRepository;
  private final WorkspaceTaskRepository taskRepository;
  private final WorkspaceErdDocumentService erdService;
  private final ObjectMapper objectMapper;

  @Transactional
  public void initialize(Long workspaceId, Long userId) {
    if (!memberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
    // 설계 행을 잠가 여러 서버가 동시에 초기 문서와 일정을 중복 생성하지 못하게 한다.
    WorkspaceAiDesign saved =
        designRepository
            .findForUpdateByWorkspaceId(workspaceId)
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_NOT_FOUND));
    if (saved.isAssetsInitialized()) return;
    WorkspaceAiDesignResponse design;
    try {
      design = objectMapper.readValue(saved.getDesignJson(), WorkspaceAiDesignResponse.class);
      if (docRepository
          .findByWorkspaceIdAndDocType(workspaceId, WorkspaceDocType.API_SPEC)
          .isEmpty()) {
        docRepository.save(
            WorkspaceDoc.builder()
                .workspaceId(workspaceId)
                .docType(WorkspaceDocType.API_SPEC)
                .content(
                    objectMapper.writeValueAsString(
                        Map.of("format", "devpath-ai-api-v1", "endpoints", design.apis())))
                .updatedById(userId)
                .build());
      }
    } catch (JsonProcessingException exception) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_FAILED);
    }
    String currentCode = erdService.findMermaidCodeForRead(workspaceId, userId);
    // 이전 화면이 빈 ERD를 생성했어도 초기화하되 팀이 편집한 설계는 보존한다.
    if (currentCode == null || currentCode.trim().equals("erDiagram")) {
      erdService.saveDocument(
          workspaceId,
          userId,
          new WorkspaceErdRequest.Save(
              design.architecture().erdMermaid(), null, "AI 설계서 데이터 모델 반영"));
    }
    if (calendarRepository
        .findAllByWorkspaceIdAndIsDeletedFalseOrderByStartAtAsc(workspaceId)
        .isEmpty()) {
      milestoneRepository
          .findAllByWorkspaceIdAndIsDeletedFalseOrderByDueDateAsc(workspaceId)
          .forEach(
              phase -> {
                if (phase.getStartDate() != null && phase.getDueDate() != null) {
                  calendarRepository.save(
                      CalendarEvent.builder()
                          .workspaceId(workspaceId)
                          .title("Phase " + phase.getTitle())
                          .description("[schedule-category:milestone]\n" + phase.getDescription())
                          .startAt(phase.getStartDate().atStartOfDay())
                          .endAt(phase.getDueDate().atTime(23, 59))
                          .createdById(userId)
                          .build());
                }
              });
      taskRepository
          .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId)
          .forEach(
              task -> {
                if (task.getDueDate() != null) {
                  calendarRepository.save(
                      CalendarEvent.builder()
                          .workspaceId(workspaceId)
                          .title(task.getTitle())
                          .description(
                              "[schedule-category:task-be]\n[schedule-deadline:true]\nDP-"
                                  + task.getId())
                          .startAt(task.getDueDate().atTime(18, 0))
                          .endAt(task.getDueDate().atTime(18, 30))
                          .createdById(userId)
                          .build());
                }
              });
    }
    saved.markAssetsInitialized();
  }
}
