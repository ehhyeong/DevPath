package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.devpath.api.workspace.dto.UpdateWorkspaceMemberPositionRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.repository.MentoringApplicationRepository;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.*;
import com.devpath.domain.workspace.repository.*;
import jakarta.validation.Validation;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;

class WorkspaceMemberPositionTest {
  final WorkspaceRepository workspaces = mock(WorkspaceRepository.class);
  final WorkspaceMemberRepository members = mock(WorkspaceMemberRepository.class);
  final WorkspaceService service =
      new WorkspaceService(
          workspaces,
          members,
          mock(WorkspaceTaskRepository.class),
          mock(MilestoneRepository.class),
          mock(CalendarEventRepository.class),
          mock(UserRepository.class),
          mock(UserProfileRepository.class),
          mock(MentoringApplicationRepository.class));
  final WorkspaceMember owner =
      WorkspaceMember.builder().workspaceId(42L).learnerId(7L).positionLabel("OWNER").build();
  final WorkspaceMember teammate = WorkspaceMember.builder().workspaceId(42L).learnerId(8L).build();

  @BeforeEach
  void setup() {
    var workspace =
        Workspace.builder().id(42L).ownerId(7L).name("예약 플랫폼").type(WorkspaceType.SQUAD).build();
    ReflectionTestUtils.setField(owner, "id", 9L);
    ReflectionTestUtils.setField(teammate, "id", 10L);
    when(workspaces.findByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(workspace));
    when(members.findById(9L)).thenReturn(Optional.of(owner));
    when(members.findById(10L)).thenReturn(Optional.of(teammate));
    when(members.findAllByWorkspaceId(42L)).thenReturn(List.of(owner, teammate));
    when(members.existsByWorkspaceIdAndLearnerId(42L, 7L)).thenReturn(true);
    when(members.existsByWorkspaceIdAndLearnerId(42L, 8L)).thenReturn(true);
  }

  @ParameterizedTest
  @CsvSource({
    "FE,Frontend 개발자",
    "BE,Backend 개발자",
    "FS,Fullstack 개발자",
    "DES,UI/UX 디자이너",
    "OPS,DevOps 엔지니어",
    "PM,PM 기획자"
  })
  void ownerChangesOwnPositionWithoutChangingOwnership(String key, String position) {
    var result =
        service.updateMemberPosition(42L, 9L, 7L, new UpdateWorkspaceMemberPositionRequest(key));
    assertThat(owner.getPositionLabel()).isEqualTo(position);
    assertThat(result.getOwnerId()).isEqualTo(7L);
    assertThat(result.isCanManage()).isTrue();
    assertThat(result.getMembers().getFirst().getRoleLabel()).isEqualTo(key);
    assertThat(service.getWorkspaceSettings(42L, 7L).getMembers().getFirst().getPosition())
        .isEqualTo(position);
  }

  @Test
  void ownerChangesTeammatePositionAndCanClearIt() {
    service.updateMemberPosition(42L, 10L, 7L, new UpdateWorkspaceMemberPositionRequest("BE"));
    assertThat(teammate.getPositionLabel()).isEqualTo("Backend 개발자");
    service.updateMemberPosition(42L, 10L, 7L, new UpdateWorkspaceMemberPositionRequest(""));
    assertThat(teammate.getPositionLabel()).isNull();
    assertThat(owner.getPositionLabel()).isEqualTo("OWNER");
  }

  @Test
  void rejectsNonOwnerBeforeChangingMember() {
    assertThatThrownBy(
            () ->
                service.updateMemberPosition(
                    42L, 10L, 8L, new UpdateWorkspaceMemberPositionRequest("FE")))
        .isInstanceOfSatisfying(
            CustomException.class,
            error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.WORKSPACE_FORBIDDEN));
    verify(members, never()).findById(anyLong());
    assertThat(teammate.getPositionLabel()).isNull();
  }

  @Test
  void rejectsMemberFromDifferentWorkspace() {
    when(members.findById(11L))
        .thenReturn(Optional.of(WorkspaceMember.builder().workspaceId(43L).learnerId(8L).build()));
    assertThatThrownBy(
            () ->
                service.updateMemberPosition(
                    42L, 11L, 7L, new UpdateWorkspaceMemberPositionRequest("FE")))
        .isInstanceOfSatisfying(
            CustomException.class,
            error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.INVALID_INPUT_VALUE));
  }

  @Test
  void legacyOwnerPositionDoesNotAppearAsJob() {
    var result = service.getWorkspaceSettings(42L, 7L);
    assertThat(result.getMembers().getFirst().getPosition()).isNull();
    assertThat(result.getMembers().getFirst().getRoleLabel()).isNull();
    assertThat(result.getOwnerId()).isEqualTo(7L);
  }

  @Test
  void validatesPositionKeys() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      for (String value : List.of("", "FE", "BE", "FS", "DES", "OPS", "PM")) {
        assertThat(factory.getValidator().validate(new UpdateWorkspaceMemberPositionRequest(value)))
            .isEmpty();
      }
      for (String value : List.of("OWNER", "ADMIN", "anything")) {
        assertThat(factory.getValidator().validate(new UpdateWorkspaceMemberPositionRequest(value)))
            .isNotEmpty();
      }
      assertThat(factory.getValidator().validate(new UpdateWorkspaceMemberPositionRequest(null)))
          .isNotEmpty();
    }
  }
}
