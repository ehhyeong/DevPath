package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiDesignEditRequest;
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
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
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

  @Transactional
  public WorkspaceAiDesignWorkspaceResponse update(
      Long userId, Long workspaceId, WorkspaceAiDesignEditRequest request) {
    validateWorkspaceMember(workspaceId, userId);
    if (!request.isSingleSection() || request.expectedDesign() == null)
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    // 행 잠금과 편집 시작 시의 값 비교로 다른 팀원이 저장한 설계를 덮어쓰지 않는다.
    WorkspaceAiDesign saved =
        designRepository
            .findForUpdateByWorkspaceId(workspaceId)
            .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_NOT_FOUND));
    WorkspaceAiDesignResponse previous = readDesign(saved.getDesignJson());
    if (!previous.equals(request.expectedDesign()))
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_CONFLICT);
    var scenario = previous.scenario();
    var stack = previous.stack();
    var architecture = previous.architecture();
    var roadmap = previous.roadmap();
    String title = previous.title();
    String summary = previous.summary();
    if (request.planning() != null) {
      var planning = request.planning();
      title = planning.title().trim();
      summary = planning.summary().trim();
      List<String> ids = new ArrayList<>();
      int nextNumber = scenario.nextFeatureNumber();
      for (var feature : planning.features()) {
        if (feature.id() == null) ids.add("F" + nextNumber++);
        else {
          if (!scenario.featureIds().contains(feature.id()) || ids.contains(feature.id()))
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
          ids.add(feature.id());
        }
      }
      var removed = new HashSet<>(scenario.featureIds());
      removed.removeAll(ids);
      if (!removed.isEmpty()
          && taskRepository
              .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId)
              .stream()
              .anyMatch(task -> task.getFeatureIds().stream().anyMatch(removed::contains))) {
        throw new CustomException(ErrorCode.WORKSPACE_AI_FEATURE_IN_USE);
      }
      scenario =
          new WorkspaceAiDesignResponse.Scenario(
              planning.userFlows().stream()
                  .map(
                      flow ->
                          new WorkspaceAiDesignResponse.UserFlow(
                              flow.actor().trim(), flow.action().trim()))
                  .toList(),
              planning.features().stream().map(feature -> feature.title().trim()).toList(),
              ids,
              nextNumber);
      var workspace =
          workspaceRepository
              .findByIdAndIsDeletedFalse(workspaceId)
              .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
      workspace.updateSettings(title, summary);
    }
    if (request.architecture() != null) {
      var edit = request.architecture();
      stack =
          new WorkspaceAiDesignResponse.RecommendedStack(
              edit.frontend().trim(),
              edit.backend().trim(),
              edit.database().trim(),
              edit.libraries(),
              edit.selectionReason().trim());
      // 실제 ERD와 API는 각 편집 페이지에서 관리하므로 설명 수정으로 덮어쓰지 않는다.
      architecture =
          new WorkspaceAiDesignResponse.Architecture(
              edit.style().trim(),
              edit.description().trim(),
              edit.components().stream()
                  .map(
                      component ->
                          new WorkspaceAiDesignResponse.ArchitectureComponent(
                              component.name().trim(), component.responsibility().trim()))
                  .toList(),
              architecture.erdMermaid(),
              architecture.entities(),
              edit.technicalChallenges());
    }
    if (request.roadmap() != null) {
      if (request.roadmap().size() != roadmap.size())
        throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
      List<WorkspaceAiDesignResponse.RoadmapPhase> phases = new ArrayList<>();
      for (int i = 0; i < roadmap.size(); i++) {
        var old = roadmap.get(i);
        var edit = request.roadmap().get(i);
        if (edit.phase() != old.phase()) throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        phases.add(
            new WorkspaceAiDesignResponse.RoadmapPhase(
                old.phase(),
                edit.title().trim(),
                edit.goal().trim(),
                old.estimatedWeeks(),
                edit.tasks()));
      }
      syncRoadmap(workspaceId, roadmap, phases);
      roadmap = phases;
    }
    var updated =
        new WorkspaceAiDesignResponse(
            title,
            summary,
            previous.difficulty(),
            stack,
            scenario,
            architecture,
            previous.apis(),
            roadmap,
            previous.interviewQuestions());
    try {
      saved.updateDesign(objectMapper.writeValueAsString(updated));
    } catch (JsonProcessingException exception) {
      throw new CustomException(ErrorCode.WORKSPACE_AI_DESIGN_FAILED);
    }
    return toResponse(saved, updated);
  }

  private void syncRoadmap(
      Long workspaceId,
      List<WorkspaceAiDesignResponse.RoadmapPhase> previous,
      List<WorkspaceAiDesignResponse.RoadmapPhase> updated) {
    var milestones =
        milestoneRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByDueDateAsc(workspaceId);
    var events =
        calendarRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByStartAtAsc(workspaceId);
    for (int i = 0; i < previous.size(); i++) {
      var old = previous.get(i);
      var phase = updated.get(i);
      String oldTitle = old.phase() + ". " + old.title();
      String newTitle = phase.phase() + ". " + phase.title();
      milestones.stream()
          .filter(m -> m.getTitle().equals(oldTitle))
          .forEach(
              m ->
                  m.update(
                      newTitle,
                      Objects.equals(m.getDescription(), old.goal())
                          ? phase.goal()
                          : m.getDescription(),
                      m.getStartDate(),
                      m.getDueDate(),
                      m.getStatus()));
      // 일정의 날짜와 팀이 별도로 작성한 설명을 유지하며 자동 생성된 Phase 제목만 갱신한다.
      String oldDescription = "[schedule-category:milestone]\n" + old.goal();
      events.stream()
          .filter(
              e ->
                  e.getTitle().equals("Phase " + oldTitle)
                      && e.getDescription() != null
                      && e.getDescription().contains("[schedule-category:milestone]"))
          .forEach(
              e ->
                  e.update(
                      "Phase " + newTitle,
                      oldDescription.equals(e.getDescription())
                          ? "[schedule-category:milestone]\n" + phase.goal()
                          : e.getDescription(),
                      e.getStartAt(),
                      e.getEndAt()));
    }
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
