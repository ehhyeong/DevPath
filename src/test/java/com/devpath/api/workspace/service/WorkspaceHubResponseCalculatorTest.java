package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.entity.WorkspaceType;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class WorkspaceHubResponseCalculatorTest {

  private final WorkspaceHubProgressCalculator progressCalculator =
      new WorkspaceHubProgressCalculator();
  private final WorkspaceHubRoleResolver roleResolver = new WorkspaceHubRoleResolver();

  @Test
  void mentoringAssignmentProgressUsesCompletedWeeks() {
    Workspace workspace = workspace(WorkspaceType.MENTORING, "Backend Mentoring");
    WorkspaceTask completedWeek =
        task("1주차 과제", WorkspaceTaskStatus.TODO, LocalDate.now().minusDays(1));
    WorkspaceTask upcomingWeek =
        task("2주차 과제", WorkspaceTaskStatus.TODO, LocalDate.now().plusDays(1));

    int progress =
        progressCalculator.calculate(
            workspace, List.of(completedWeek, upcomingWeek), List.of(), null);

    assertThat(progress).isEqualTo(50);
  }

  @Test
  void roleResolverUsesTaskRoleWhenMemberPositionIsMissing() {
    Workspace workspace = workspace(WorkspaceType.MENTORING, "React Team");
    WorkspaceTask frontendTask = task("[Frontend] 결제 화면 구현", WorkspaceTaskStatus.TODO, null);

    String role = roleResolver.resolve(workspace, List.of(), 2L, List.of(frontendTask));

    assertThat(role).isEqualTo("🎨 Frontend");
  }

  private Workspace workspace(WorkspaceType type, String name) {
    return Workspace.builder().ownerId(1L).name(name).type(type).build();
  }

  private WorkspaceTask task(String title, WorkspaceTaskStatus status, LocalDate dueDate) {
    return WorkspaceTask.builder()
        .workspaceId(10L)
        .title(title)
        .status(status)
        .dueDate(dueDate)
        .createdById(1L)
        .build();
  }
}
