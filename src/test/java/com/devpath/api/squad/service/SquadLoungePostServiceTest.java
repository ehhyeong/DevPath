package com.devpath.api.squad.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.squad.dto.SquadWorkspaceLinkRequest;
import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import com.devpath.domain.squad.repository.SquadMemberRepository;
import com.devpath.domain.squad.repository.SquadRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SquadLoungePostServiceTest {

  @Mock private SquadRepository squadRepository;
  @Mock private SquadMemberRepository squadMemberRepository;
  @Mock private UserRepository userRepository;
  @Mock private UserProfileRepository userProfileRepository;
  @Mock private WorkspaceRepository workspaceRepository;
  @Mock private WorkspaceMemberRepository workspaceMemberRepository;

  private SquadLoungePostService service;

  @BeforeEach
  void setUp() {
    service =
        new SquadLoungePostService(
            squadRepository,
            squadMemberRepository,
            userRepository,
            userProfileRepository,
            workspaceRepository,
            workspaceMemberRepository);
  }

  @Test
  void linkWorkspaceCopiesSquadMembersToWorkspaceMembers() throws Exception {
    long leaderId = 1L;
    long applicantId = 2L;
    long squadId = 10L;
    long workspaceId = 99L;

    User leader = user(leaderId, "leader@example.com", "Leader");
    User applicant = user(applicantId, "applicant@example.com", "Applicant");
    Squad squad = squad(squadId);
    SquadMember leaderMember = member(squad, leader, SquadRole.LEADER);
    SquadMember applicantMember = member(squad, applicant, SquadRole.MEMBER);
    Workspace workspace =
        Workspace.builder()
            .id(workspaceId)
            .ownerId(leaderId)
            .name("Dev Squad")
            .type(WorkspaceType.SQUAD)
            .build();
    SquadWorkspaceLinkRequest request = linkRequest(workspaceId);

    when(squadRepository.findByIdAndIsDeletedFalse(squadId)).thenReturn(Optional.of(squad));
    when(userRepository.findById(leaderId)).thenReturn(Optional.of(leader));
    when(squadMemberRepository.findBySquadAndUser(squad, leader))
        .thenReturn(Optional.of(leaderMember));
    when(workspaceRepository.findByIdAndIsDeletedFalse(workspaceId)).thenReturn(Optional.of(workspace));
    when(squadMemberRepository.findBySquadWithUser(squad))
        .thenReturn(List.of(leaderMember, applicantMember));
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, leaderId))
        .thenReturn(true);
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, applicantId))
        .thenReturn(false);
    when(userProfileRepository.findAllByUserIdIn(any())).thenReturn(List.of());

    service.linkWorkspace(squadId, leaderId, request);

    ArgumentCaptor<WorkspaceMember> memberCaptor = ArgumentCaptor.forClass(WorkspaceMember.class);
    verify(workspaceMemberRepository).save(memberCaptor.capture());
    assertThat(memberCaptor.getValue().getWorkspaceId()).isEqualTo(workspaceId);
    assertThat(memberCaptor.getValue().getLearnerId()).isEqualTo(applicantId);
  }

  private User user(Long id, String email, String name) {
    User user = User.builder().email(email).password("encoded").name(name).build();
    ReflectionTestUtils.setField(user, "id", id);
    return user;
  }

  private Squad squad(Long id) {
    Squad squad = Squad.builder().name("Dev Squad").description("Build together").build();
    ReflectionTestUtils.setField(squad, "id", id);
    return squad;
  }

  private SquadMember member(Squad squad, User user, SquadRole role) {
    return SquadMember.builder().squad(squad).user(user).role(role).build();
  }

  private SquadWorkspaceLinkRequest linkRequest(Long workspaceId) throws Exception {
    var constructor = SquadWorkspaceLinkRequest.class.getDeclaredConstructor();
    constructor.setAccessible(true);
    SquadWorkspaceLinkRequest request = constructor.newInstance();
    ReflectionTestUtils.setField(request, "workspaceId", workspaceId);
    return request;
  }
}
