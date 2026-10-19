package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.api.workspace.dto.WorkspaceAiDesignWorkspaceResponse;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceAiDesign;
import com.devpath.domain.workspace.entity.WorkspaceAiDesignJob;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class WorkspaceAiDesignWorkspaceServiceTest {

  @ParameterizedTest
  @ValueSource(ints = {1, 2})
  void createsWorkspaceMemberMilestonesTasksAndDesign(int estimatedWeeks) throws Exception {
    WorkspaceAiDesignJobStore jobStore = mock(WorkspaceAiDesignJobStore.class);
    WorkspaceAiDesignRepository designRepository = mock(WorkspaceAiDesignRepository.class);
    WorkspaceRepository workspaceRepository = mock(WorkspaceRepository.class);
    WorkspaceMemberRepository memberRepository = mock(WorkspaceMemberRepository.class);
    MilestoneRepository milestoneRepository = mock(MilestoneRepository.class);
    WorkspaceTaskRepository taskRepository = mock(WorkspaceTaskRepository.class);
    ObjectMapper objectMapper = new ObjectMapper();
    WorkspaceAiDesignResponse design = design(estimatedWeeks);
    WorkspaceAiDesignJob job = new WorkspaceAiDesignJob(7L, "{}");
    job.complete(objectMapper.writeValueAsString(design));
    when(designRepository.findByJobId(job.getId())).thenReturn(Optional.empty());
    when(jobStore.findOwnedForUpdate(job.getId(), 7L)).thenReturn(Optional.of(job));
    when(jobStore.readResult(job)).thenReturn(design);
    when(workspaceRepository.save(any(Workspace.class)))
        .thenAnswer(
            invocation -> {
              Workspace workspace = invocation.getArgument(0);
              ReflectionTestUtils.setField(workspace, "id", 42L);
              return workspace;
            });
    when(designRepository.save(any(WorkspaceAiDesign.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    WorkspaceDemoScenario demoScenario = mock(WorkspaceDemoScenario.class);
    when(demoScenario.isDemoWorkspace(42L)).thenReturn(true);
    WorkspaceAiDesignWorkspaceService service =
        new WorkspaceAiDesignWorkspaceService(
            jobStore,
            designRepository,
            workspaceRepository,
            memberRepository,
            milestoneRepository,
            taskRepository,
            objectMapper,
            mock(com.devpath.domain.workspace.repository.CalendarEventRepository.class),
            demoScenario);

    WorkspaceAiDesignWorkspaceResponse response = service.create(7L, job.getId().toString());

    assertThat(response.workspaceId()).isEqualTo(42L);
    assertThat(response.demoWorkspace()).isTrue();
    verify(demoScenario).initialize(any(Workspace.class), org.mockito.ArgumentMatchers.eq(design));
    assertThat(response.dashboardUrl()).isEqualTo("/squad-dashboard?workspaceId=42&ai=1");
    assertThat(response.design().title()).isEqualTo("예약 플랫폼");
    var memberCaptor = ArgumentCaptor.forClass(WorkspaceMember.class);
    verify(memberRepository).save(memberCaptor.capture());
    assertThat(memberCaptor.getValue().getLearnerId()).isEqualTo(7L);
    assertThat(memberCaptor.getValue().getPositionLabel()).isNull();
    var workspaceCaptor = ArgumentCaptor.forClass(Workspace.class);
    verify(workspaceRepository).save(workspaceCaptor.capture());
    assertThat(workspaceCaptor.getValue().getOwnerId()).isEqualTo(7L);
    var milestoneCaptor = ArgumentCaptor.forClass(Milestone.class);
    verify(milestoneRepository, times(2)).save(milestoneCaptor.capture());
    LocalDate start = LocalDate.now();
    assertThat(milestoneCaptor.getAllValues().get(0).getStartDate()).isEqualTo(start);
    assertThat(milestoneCaptor.getAllValues().get(0).getDueDate())
        .isEqualTo(start.plusWeeks(estimatedWeeks).minusDays(1));
    assertThat(milestoneCaptor.getAllValues().get(1).getStartDate())
        .isEqualTo(start.plusWeeks(estimatedWeeks));
    assertThat(milestoneCaptor.getAllValues().get(1).getDueDate())
        .isEqualTo(start.plusWeeks(estimatedWeeks + 1).minusDays(1));
    var taskCaptor = ArgumentCaptor.forClass(WorkspaceTask.class);
    verify(taskRepository, times(2)).save(taskCaptor.capture());
    assertThat(taskCaptor.getAllValues())
        .extracting(WorkspaceTask::getTitle)
        .containsExactly("예약 API 구현", "예약 프론트 화면 구현");
    assertThat(taskCaptor.getAllValues())
        .allSatisfy(
            task -> {
              assertThat(task.getAssigneeId()).isNull();
              assertThat(task.getCreatedById()).isEqualTo(7L);
              assertThat(task.getStatus()).isEqualTo(WorkspaceTaskStatus.TODO);
              assertThat(task.getDueDate()).isEqualTo(start.plusWeeks(estimatedWeeks).minusDays(1));
            });
    verify(designRepository).save(any());
  }

  private WorkspaceAiDesignResponse design(int estimatedWeeks) {
    return new WorkspaceAiDesignResponse(
        "예약 플랫폼",
        "예약을 관리합니다.",
        "mvp",
        new WorkspaceAiDesignResponse.RecommendedStack(
            "React", "Spring Boot", "PostgreSQL", List.of("Redis"), "정합성"),
        new WorkspaceAiDesignResponse.Scenario(
            List.of(new WorkspaceAiDesignResponse.UserFlow("사용자", "예약합니다.")), List.of("예약")),
        new WorkspaceAiDesignResponse.Architecture(
            "모듈형 모놀리스", "도메인 분리", List.of(), "erDiagram", List.of(), List.of()),
        List.of(),
        List.of(
            new WorkspaceAiDesignResponse.RoadmapPhase(
                1, "예약 구현", "예약 생성", estimatedWeeks, List.of("예약 API 구현", "예약 프론트 화면 구현")),
            new WorkspaceAiDesignResponse.RoadmapPhase(2, "배포", "서비스 배포", 1, List.of())),
        List.of());
  }
}
