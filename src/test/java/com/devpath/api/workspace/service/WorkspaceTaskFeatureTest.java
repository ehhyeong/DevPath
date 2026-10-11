package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.workspace.dto.CreateTaskRequest;
import com.devpath.api.workspace.dto.UpdateTaskRequest;
import com.devpath.api.workspace.dto.UpdateTaskStatusRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceAiDesign;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class WorkspaceTaskFeatureTest {
  final WorkspaceTaskRepository tasks = mock(WorkspaceTaskRepository.class);
  final WorkspaceRepository workspaces = mock(WorkspaceRepository.class);
  final WorkspaceMemberRepository members = mock(WorkspaceMemberRepository.class);
  final WorkspaceAiDesignRepository designs = mock(WorkspaceAiDesignRepository.class);
  final ObjectMapper mapper = new ObjectMapper();
  final WorkspaceTaskService service =
      new WorkspaceTaskService(
          tasks, workspaces, members, mock(NotificationEventService.class), designs, mapper);
  final WorkspaceTask task =
      WorkspaceTask.builder().id(9L).workspaceId(42L).title("로그인").createdById(77L).build();

  @BeforeEach
  void setup() {
    when(workspaces.findByIdAndIsDeletedFalse(42L))
        .thenReturn(Optional.of(Workspace.builder().ownerId(77L).name("설계").build()));
    when(members.existsByWorkspaceIdAndLearnerId(42L, 77L)).thenReturn(true);
    when(tasks.findByIdAndIsDeletedFalse(9L)).thenReturn(Optional.of(task));
    when(designs.findForUpdateByWorkspaceId(42L))
        .thenReturn(
            Optional.of(
                new WorkspaceAiDesign(
                    42L, UUID.randomUUID(), "{\"scenario\":{\"coreFeatures\":[\"로그인\",\"신고\"]}}")));
    when(tasks.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void createsAndReadsDistinctFeatureLinks() throws Exception {
    var request =
        mapper.readValue(
            "{\"title\":\"로그인\",\"featureIds\":[\"F1\",\"F2\",\"F1\"]}", CreateTaskRequest.class);
    assertThat(service.createTask(42L, 77L, request).getFeatureIds()).containsExactly("F1", "F2");
    task.changeFeatureIds(List.of("F1", "F2"));
    when(tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(List.of(task));
    assertThat(service.getTasks(42L, 77L).getFirst().getFeatureIds()).containsExactly("F1", "F2");
  }

  @Test
  void oldClientsKeepLinksOnBothUpdateRoutesAndEmptyArrayClearsThem() throws Exception {
    task.changeFeatureIds(List.of("F1"));
    var omitted = mapper.readValue("{\"title\":\"수정\"}", UpdateTaskRequest.class);
    assertThat(service.updateTask(42L, 9L, 77L, omitted).getFeatureIds()).containsExactly("F1");
    assertThat(service.updateTaskById(9L, 77L, omitted).getFeatureIds()).containsExactly("F1");
    var linked =
        mapper.readValue("{\"title\":\"수정\",\"featureIds\":[\"F2\"]}", UpdateTaskRequest.class);
    assertThat(service.updateTaskById(9L, 77L, linked).getFeatureIds()).containsExactly("F2");
    var cleared = mapper.readValue("{\"title\":\"수정\",\"featureIds\":[]}", UpdateTaskRequest.class);
    assertThat(service.updateTask(42L, 9L, 77L, cleared).getFeatureIds()).isEmpty();
  }

  @Test
  void statusChangePreservesLinksAndOldCreateNeedsNoDesign() throws Exception {
    task.changeFeatureIds(List.of("F1"));
    var status = mapper.readValue("{\"status\":\"DONE\"}", UpdateTaskStatusRequest.class);
    assertThat(service.updateTaskStatus(42L, 9L, 77L, status).getFeatureIds())
        .containsExactly("F1");
    clearInvocations(designs);
    var request = mapper.readValue("{\"title\":\"일반 작업\"}", CreateTaskRequest.class);
    assertThat(service.createTask(42L, 77L, request).getFeatureIds()).isEmpty();
    verifyNoInteractions(designs);
  }

  @Test
  void acceptsPersistentFeatureIdsAfterDeletionInsteadOfArrayPosition() throws Exception {
    when(designs.findForUpdateByWorkspaceId(42L))
        .thenReturn(
            Optional.of(
                new WorkspaceAiDesign(
                    42L,
                    UUID.randomUUID(),
                    "{\"scenario\":{\"coreFeatures\":[\"신고\"],\"featureIds\":[\"F3\"]}}")));
    var request =
        mapper.readValue("{\"title\":\"신고 API\",\"featureIds\":[\"F3\"]}", UpdateTaskRequest.class);
    assertThat(service.updateTask(42L, 9L, 77L, request).getFeatureIds()).containsExactly("F3");
    var removed =
        mapper.readValue("{\"title\":\"신고 API\",\"featureIds\":[\"F1\"]}", UpdateTaskRequest.class);
    assertThatThrownBy(() -> service.updateTask(42L, 9L, 77L, removed))
        .isInstanceOf(CustomException.class);
  }

  @Test
  void rejectsFeatureOutsideThisDesignOrWithoutAnAiDesign() throws Exception {
    var outside =
        mapper.readValue("{\"title\":\"작업\",\"featureIds\":[\"F3\"]}", CreateTaskRequest.class);
    assertThatThrownBy(() -> service.createTask(42L, 77L, outside))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INVALID_INPUT_VALUE);
    when(designs.findForUpdateByWorkspaceId(42L)).thenReturn(Optional.empty());
    var request =
        mapper.readValue("{\"title\":\"작업\",\"featureIds\":[\"F1\"]}", CreateTaskRequest.class);
    assertThatThrownBy(() -> service.createTask(42L, 77L, request))
        .isInstanceOf(CustomException.class);
    verify(tasks, never()).save(any());
  }

  @Test
  void membershipIsCheckedBeforeDesignOrFeatureMutation() throws Exception {
    when(members.existsByWorkspaceIdAndLearnerId(42L, 77L)).thenReturn(false);
    var request =
        mapper.readValue("{\"title\":\"작업\",\"featureIds\":[\"F1\"]}", UpdateTaskRequest.class);
    assertThatThrownBy(() -> service.updateTask(42L, 9L, 77L, request))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.WORKSPACE_FORBIDDEN);
    verifyNoInteractions(designs);
    assertThat(task.getFeatureIds()).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"\"F0\"", "\"F01\"", "\"F-1\"", "\"AUTH\"", "null"})
  void rejectsMalformedIdsInBothRequestDtos(String id) throws Exception {
    String json = "{\"title\":\"작업\",\"featureIds\":[" + id + "]}";
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      assertThat(validator.validate(mapper.readValue(json, CreateTaskRequest.class))).isNotEmpty();
      assertThat(validator.validate(mapper.readValue(json, UpdateTaskRequest.class))).isNotEmpty();
    }
  }
}
