package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.api.workspace.dto.WorkspaceAiDesignWorkspaceResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceAiDesign;
import com.devpath.domain.workspace.entity.WorkspaceAiDesignJob;
import com.devpath.domain.workspace.entity.WorkspaceAiDesignJobStatus;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceAiDesignWorkspaceService {

  private final WorkspaceAiDesignJobStore jobStore;
  private final WorkspaceAiDesignRepository designRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository memberRepository;
  private final MilestoneRepository milestoneRepository;
  private final WorkspaceTaskRepository taskRepository;
  private final ObjectMapper objectMapper;
  private final CalendarEventRepository calendarRepository;

  @Transactional
  public synchronized WorkspaceAiDesignWorkspaceResponse create(Long userId, String jobId) {
    UUID parsedJobId = parseJobId(jobId);
    WorkspaceAiDesignJob job =
        jobStore
            .findOwnedForUpdate(parsedJobId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_JOB_NOT_FOUND));
    WorkspaceAiDesign existing = designRepository.findByJobId(parsedJobId).orElse(null);
    if (existing != null) {
      validateWorkspaceMember(existing.getWorkspaceId(), userId);
      return toResponse(existing);
    }

    if (job.getStatus() != WorkspaceAiDesignJobStatus.COMPLETED) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_NOT_COMPLETED);
    }

    WorkspaceAiDesignResponse design = jobStore.readResult(job);
    Workspace workspace =
        workspaceRepository.save(
            Workspace.builder()
                .ownerId(userId)
                .name(design.title())
                .description(design.summary())
                .type(WorkspaceType.SQUAD)
                .build());
    memberRepository.save(
        WorkspaceMember.builder().workspaceId(workspace.getId()).learnerId(userId).build());
    createRoadmap(workspace.getId(), userId, design);

    WorkspaceAiDesign savedDesign =
        designRepository.save(
            new WorkspaceAiDesign(workspace.getId(), parsedJobId, job.getResultJson()));
    return toResponse(savedDesign, design);
  }

  @Transactional(readOnly = true)
  public WorkspaceAiDesignWorkspaceResponse get(Long userId, Long workspaceId) {
    validateWorkspaceMember(workspaceId, userId);
    WorkspaceAiDesign design =
        designRepository
            .findByWorkspaceId(workspaceId)
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_NOT_FOUND));
    return toResponse(design);
  }

  private void createRoadmap(Long workspaceId, Long userId, WorkspaceAiDesignResponse design) {
    LocalDate phaseStart = LocalDate.now();
    for (WorkspaceAiDesignResponse.RoadmapPhase phase : design.roadmap()) {
      // 종료일도 일정에 포함되므로 1주가 시작일 포함 7일이 되도록 하루를 뺀다.
      LocalDate dueDate = phaseStart.plusWeeks(Math.max(1, phase.estimatedWeeks())).minusDays(1);
      milestoneRepository.save(
          Milestone.builder()
              .workspaceId(workspaceId)
              .title(phase.phase() + ". " + phase.title())
              .description(phase.goal())
              .startDate(phaseStart)
              .dueDate(dueDate)
              .status(MilestoneStatus.OPEN)
              .createdById(userId)
              .build());
      // AI 로드맵은 팀 전체 작업이므로 초기 담당자를 생성자로 일괄 지정하지 않는다.
      for (String task : phase.tasks()) {
        taskRepository.save(
            WorkspaceTask.builder()
                .workspaceId(workspaceId)
                .title(task)
                .description(phase.title() + " · " + phase.goal())
                .status(WorkspaceTaskStatus.TODO)
                .priority(WorkspaceTaskPriority.MEDIUM)
                .dueDate(dueDate)
                .createdById(userId)
                .build());
      }
      phaseStart = dueDate.plusDays(1);
    }
  }

  private WorkspaceAiDesignWorkspaceResponse toResponse(WorkspaceAiDesign savedDesign) {
    return toResponse(savedDesign, readDesign(savedDesign.getDesignJson()));
  }

  private WorkspaceAiDesignWorkspaceResponse toResponse(
      WorkspaceAiDesign savedDesign, WorkspaceAiDesignResponse design) {
    Long workspaceId = savedDesign.getWorkspaceId();
    return new WorkspaceAiDesignWorkspaceResponse(
        workspaceId,
        "/squad-dashboard?workspaceId=" + workspaceId + "&ai=1",
        savedDesign.getCreatedAt(),
        design);
  }

  private void validateWorkspaceMember(Long workspaceId, Long userId) {
    if (!memberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }

  private UUID parseJobId(String jobId) {
    try {
      return UUID.fromString(jobId);
    } catch (IllegalArgumentException exception) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_JOB_NOT_FOUND);
    }
  }

  private WorkspaceAiDesignResponse readDesign(String value) {
    try {
      return objectMapper.readValue(value, WorkspaceAiDesignResponse.class);
    } catch (JsonProcessingException exception) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_FAILED);
    }
  }
}
