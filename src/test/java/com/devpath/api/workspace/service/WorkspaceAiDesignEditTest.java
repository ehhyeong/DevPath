package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.devpath.api.workspace.dto.WorkspaceAiDesignEditRequest;
import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.domain.workspace.entity.*;
import com.devpath.domain.workspace.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceAiDesignEditTest {
  private final WorkspaceAiDesignRepository designs = mock(WorkspaceAiDesignRepository.class);
  private final WorkspaceRepository workspaces = mock(WorkspaceRepository.class);
  private final WorkspaceMemberRepository members = mock(WorkspaceMemberRepository.class);
  private final MilestoneRepository milestones = mock(MilestoneRepository.class);
  private final WorkspaceTaskRepository tasks = mock(WorkspaceTaskRepository.class);
  private final CalendarEventRepository calendar = mock(CalendarEventRepository.class);
  private final ObjectMapper mapper = new ObjectMapper();
  private final WorkspaceAiDesignWorkspaceService service =
      new WorkspaceAiDesignWorkspaceService(
          mock(WorkspaceAiDesignJobStore.class),
          designs,
          workspaces,
          members,
          milestones,
          tasks,
          mapper,
          calendar,
          mock(WorkspaceDemoScenario.class));
  private WorkspaceAiDesign saved;
  private WorkspaceAiDesignResponse original;
  private final Workspace workspace =
      Workspace.builder().name("기존 프로젝트").description("기존 설명").ownerId(7L).build();

  @BeforeEach
  void setup() throws Exception {
    original =
        new WorkspaceAiDesignResponse(
            "기존 프로젝트",
            "기존 설명",
            "mvp",
            new WorkspaceAiDesignResponse.RecommendedStack(
                "React", "Spring", "Postgres", List.of(), "정합성"),
            new WorkspaceAiDesignResponse.Scenario(
                List.of(new WorkspaceAiDesignResponse.UserFlow("사용자", "로그인")),
                List.of("로그인", "신고")),
            new WorkspaceAiDesignResponse.Architecture(
                "모놀리스", "계층 구조", List.of(), "erDiagram", List.of(), List.of()),
            List.of(
                new WorkspaceAiDesignResponse.ApiSpec(
                    "GET", "/reports", "신고 조회", "JWT", "", "{}", "REPORTS")),
            List.of(
                new WorkspaceAiDesignResponse.RoadmapPhase(
                    1, "기초 구현", "로그인 구현", 2, List.of("로그인 API"))),
            List.of());
    saved = new WorkspaceAiDesign(42L, UUID.randomUUID(), mapper.writeValueAsString(original));
    when(members.existsByWorkspaceIdAndLearnerId(42L, 7L)).thenReturn(true);
    when(designs.findForUpdateByWorkspaceId(42L)).thenReturn(Optional.of(saved));
    when(designs.findByWorkspaceId(42L)).thenReturn(Optional.of(saved));
    when(workspaces.findByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(workspace));
  }

  private WorkspaceAiDesignEditRequest planning(
      WorkspaceAiDesignResponse expected, List<WorkspaceAiDesignEditRequest.Feature> features) {
    return new WorkspaceAiDesignEditRequest(
        expected,
        new WorkspaceAiDesignEditRequest.Planning(
            "변경한 프로젝트",
            "변경 설명",
            List.of(new WorkspaceAiDesignEditRequest.Flow("주민", "신고 등록")),
            features),
        null,
        null);
  }

  @Test
  void preservesFeatureIdsAfterMiddleDeletionAndDoesNotReuseRemovedNumbers() throws Exception {
    var updated =
        service
            .update(
                7L,
                42L,
                planning(
                    original,
                    List.of(
                        new WorkspaceAiDesignEditRequest.Feature("F2", "신고 변경"),
                        new WorkspaceAiDesignEditRequest.Feature(null, "조회"))))
            .design();
    assertThat(updated.scenario().featureIds()).containsExactly("F2", "F3");
    assertThat(updated.scenario().nextFeatureNumber()).isEqualTo(4);
    assertThat(workspace.getName()).isEqualTo("변경한 프로젝트");
    var afterDelete =
        service
            .update(
                7L,
                42L,
                planning(updated, List.of(new WorkspaceAiDesignEditRequest.Feature("F2", "신고 변경"))))
            .design();
    var added =
        service
            .update(
                7L,
                42L,
                planning(
                    afterDelete,
                    List.of(
                        new WorkspaceAiDesignEditRequest.Feature("F2", "신고 변경"),
                        new WorkspaceAiDesignEditRequest.Feature(null, "알림"))))
            .design();
    assertThat(added.scenario().featureIds()).containsExactly("F2", "F4");
    assertThat(mapper.readValue(saved.getDesignJson(), WorkspaceAiDesignResponse.class))
        .isEqualTo(added);
    assertThat(service.get(7L, 42L).design()).isEqualTo(added);
    verify(tasks, never()).save(any());
    verifyNoInteractions(milestones, calendar);
  }

  @Test
  void rejectsDeletionOfFeatureWithLinkedTaskAndLeavesSavedDesignUnchanged() {
    var task =
        WorkspaceTask.builder()
            .title("신고 API")
            .mvpFeatureIds("F2")
            .status(WorkspaceTaskStatus.DONE)
            .assigneeId(88L)
            .build();
    when(tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(List.of(task));
    var json = saved.getDesignJson();
    assertThatThrownBy(
            () ->
                service.update(
                    7L,
                    42L,
                    planning(
                        original, List.of(new WorkspaceAiDesignEditRequest.Feature("F1", "로그인")))))
        .hasMessageContaining("연결을 먼저 해제");
    assertThat(saved.getDesignJson()).isEqualTo(json);
    assertThat(task.getAssigneeId()).isEqualTo(88L);
    assertThat(task.getStatus()).isEqualTo(WorkspaceTaskStatus.DONE);
  }

  @Test
  void rejectsUnknownAndDuplicateFeatureIds() {
    for (var ids : List.of(List.of("F99"), List.of("F1", "F1"))) {
      assertThatThrownBy(
              () ->
                  service.update(
                      7L,
                      42L,
                      planning(
                          original,
                          ids.stream()
                              .map(id -> new WorkspaceAiDesignEditRequest.Feature(id, "기능"))
                              .toList())))
          .isInstanceOf(com.devpath.common.exception.CustomException.class);
    }
  }

  @Test
  void rejectsStaleEditorWithoutOverwritingOtherMembersChanges() {
    var request =
        planning(
            original,
            List.of(
                new WorkspaceAiDesignEditRequest.Feature("F1", "변경"),
                new WorkspaceAiDesignEditRequest.Feature("F2", "신고")));
    service.update(7L, 42L, request);
    var json = saved.getDesignJson();
    assertThatThrownBy(() -> service.update(7L, 42L, request)).hasMessageContaining("다른 곳에서 수정");
    assertThat(saved.getDesignJson()).isEqualTo(json);
  }

  @Test
  void rejectsNonMemberBeforeReadingDesign() {
    when(members.existsByWorkspaceIdAndLearnerId(42L, 7L)).thenReturn(false);
    assertThatThrownBy(() -> service.update(7L, 42L, planning(original, List.of())))
        .hasMessageContaining("접근할 권한");
    verifyNoInteractions(designs, tasks, workspaces, milestones, calendar);
  }

  @Test
  void changesArchitectureDescriptionWithoutOverwritingErdOrApi() {
    var edit =
        new WorkspaceAiDesignEditRequest.Architecture(
            "Vue",
            "Spring",
            "Postgres",
            List.of("Redis"),
            "캐싱",
            "레이어드",
            "변경 구조",
            List.of(new WorkspaceAiDesignEditRequest.Component("캐시", "조회 캐싱")),
            List.of("정합성"));
    var result =
        service
            .update(7L, 42L, new WorkspaceAiDesignEditRequest(original, null, edit, null))
            .design();
    assertThat(result.stack().frontend()).isEqualTo("Vue");
    assertThat(result.architecture().description()).isEqualTo("변경 구조");
    assertThat(result.architecture().erdMermaid()).isEqualTo(original.architecture().erdMermaid());
    assertThat(result.apis()).isEqualTo(original.apis());
    verifyNoInteractions(tasks, milestones, calendar, workspaces);
  }

  @Test
  void syncsPhaseNameAndGoalButPreservesDatesStatusAndExistingTasks() {
    var start = LocalDate.of(2026, 10, 1);
    var milestone =
        Milestone.builder()
            .title("1. 기초 구현")
            .description("로그인 구현")
            .startDate(start)
            .dueDate(start.plusDays(13))
            .status(MilestoneStatus.DONE)
            .build();
    var event =
        CalendarEvent.builder()
            .title("Phase 1. 기초 구현")
            .description("[schedule-category:milestone]\n로그인 구현")
            .startAt(start.atStartOfDay())
            .endAt(start.plusDays(13).atTime(23, 59))
            .build();
    when(milestones.findAllByWorkspaceIdAndIsDeletedFalseOrderByDueDateAsc(42L))
        .thenReturn(List.of(milestone));
    when(calendar.findAllByWorkspaceIdAndIsDeletedFalseOrderByStartAtAsc(42L))
        .thenReturn(List.of(event));
    var result =
        service
            .update(
                7L,
                42L,
                new WorkspaceAiDesignEditRequest(
                    original,
                    null,
                    null,
                    List.of(
                        new WorkspaceAiDesignEditRequest.Phase(
                            1, "신고 구현", "신고 등록", List.of("신고 API")))))
            .design();
    assertThat(milestone.getTitle()).isEqualTo("1. 신고 구현");
    assertThat(milestone.getStartDate()).isEqualTo(start);
    assertThat(milestone.getStatus()).isEqualTo(MilestoneStatus.DONE);
    assertThat(event.getTitle()).isEqualTo("Phase 1. 신고 구현");
    assertThat(event.getDescription()).endsWith("신고 등록");
    assertThat(event.getEndAt()).isEqualTo(start.plusDays(13).atTime(23, 59));
    assertThat(result.roadmap().getFirst().estimatedWeeks()).isEqualTo(2);
    verifyNoInteractions(tasks, workspaces);
  }

  @Test
  void rejectsChangedPhaseNumbersAndMultipleSections() {
    assertThatThrownBy(
            () ->
                service.update(
                    7L,
                    42L,
                    new WorkspaceAiDesignEditRequest(
                        original,
                        null,
                        null,
                        List.of(new WorkspaceAiDesignEditRequest.Phase(2, "수정", "목표", List.of())))))
        .isInstanceOf(com.devpath.common.exception.CustomException.class);
    var request = planning(original, List.of());
    assertThatThrownBy(
            () ->
                service.update(
                    7L,
                    42L,
                    new WorkspaceAiDesignEditRequest(
                        original, request.planning(), null, List.of())))
        .isInstanceOf(com.devpath.common.exception.CustomException.class);
  }

  @Test
  void validatesBlankFieldsNullExpectedAndEmptyFeatureList() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      var invalid =
          new WorkspaceAiDesignEditRequest(
              null,
              new WorkspaceAiDesignEditRequest.Planning(
                  " ", "", List.of(new WorkspaceAiDesignEditRequest.Flow("", "")), List.of()),
              null,
              null);
      assertThat(validator.validate(invalid)).hasSizeGreaterThanOrEqualTo(6);
    }
  }
}
