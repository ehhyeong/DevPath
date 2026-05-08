package com.devpath.api.squad.service;

import com.devpath.api.squad.dto.CreateSquadRequest;
import com.devpath.api.squad.dto.InviteSquadMemberRequest;
import com.devpath.api.squad.dto.SquadInvitationResponse;
import com.devpath.api.squad.dto.SquadResponse;
import com.devpath.api.squad.dto.SquadSettingsResponse;
import com.devpath.api.squad.dto.UpdateSquadSettingsRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadInvitation;
import com.devpath.domain.squad.entity.SquadInvitationStatus;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import com.devpath.domain.squad.repository.SquadInvitationRepository;
import com.devpath.domain.squad.repository.SquadMemberRepository;
import com.devpath.domain.squad.repository.SquadRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SquadService {

  private final SquadRepository squadRepository;
  private final SquadMemberRepository squadMemberRepository;
  private final SquadInvitationRepository squadInvitationRepository;
  private final UserRepository userRepository;

  @Transactional
  public SquadResponse createSquad(Long userId, CreateSquadRequest request) {
    User leader = getUser(userId);

    Squad squad =
        Squad.builder().name(request.getName()).description(request.getDescription()).build();
    squadRepository.save(squad);

    SquadMember leaderMember =
        SquadMember.builder().squad(squad).user(leader).role(SquadRole.LEADER).build();
    squadMemberRepository.save(leaderMember);

    return SquadResponse.from(squad, List.of(leaderMember));
  }

  public SquadResponse getSquad(Long squadId) {
    Squad squad = findNonDeletedSquad(squadId);
    List<SquadMember> members = squadMemberRepository.findBySquadWithUser(squad);
    return SquadResponse.from(squad, members);
  }

  public SquadSettingsResponse getSettings(Long squadId, Long userId) {
    Squad squad = findNonDeletedSquad(squadId);
    validateLeader(squad, userId);

    List<SquadMember> members = squadMemberRepository.findBySquadWithUser(squad);
    return SquadSettingsResponse.from(squad, members);
  }

  @Transactional
  public SquadInvitationResponse inviteMember(
      Long squadId, Long inviterId, InviteSquadMemberRequest request) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, inviterId);

    User invitee = getUser(request.getInviteeId());

    if (squadMemberRepository.existsBySquadAndUser(squad, invitee)) {
      throw new CustomException(ErrorCode.SQUAD_ALREADY_MEMBER);
    }
    if (squadInvitationRepository.existsBySquadAndInviteeIdAndStatus(
        squad, invitee.getId(), SquadInvitationStatus.PENDING)) {
      throw new CustomException(ErrorCode.SQUAD_INVITATION_ALREADY_PENDING);
    }

    SquadInvitation invitation =
        SquadInvitation.builder()
            .squad(squad)
            .inviterId(inviterId)
            .inviteeId(invitee.getId())
            .status(SquadInvitationStatus.PENDING)
            .build();
    squadInvitationRepository.save(invitation);

    return SquadInvitationResponse.from(invitation);
  }

  @Transactional
  public SquadResponse updateSettings(
      Long squadId, Long userId, UpdateSquadSettingsRequest request) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, userId);

    squad.updateSettings(request.getName(), request.getDescription());

    List<SquadMember> members = squadMemberRepository.findBySquadWithUser(squad);
    return SquadResponse.from(squad, members);
  }

  @Transactional
  public SquadResponse archiveSquad(Long squadId, Long userId) {
    Squad squad = findNonDeletedSquad(squadId);
    validateLeader(squad, userId);

    if (squad.getIsArchived()) {
      throw new CustomException(ErrorCode.SQUAD_ALREADY_ARCHIVED);
    }
    squad.archive();

    List<SquadMember> members = squadMemberRepository.findBySquadWithUser(squad);
    return SquadResponse.from(squad, members);
  }

  @Transactional
  public SquadResponse restoreSquad(Long squadId, Long userId) {
    Squad squad = findNonDeletedSquad(squadId);
    validateLeader(squad, userId);

    if (!squad.getIsArchived()) {
      throw new CustomException(ErrorCode.SQUAD_NOT_ARCHIVED);
    }
    squad.restore();

    List<SquadMember> members = squadMemberRepository.findBySquadWithUser(squad);
    return SquadResponse.from(squad, members);
  }

  @Transactional
  public void deleteSquad(Long squadId, Long userId) {
    Squad squad = findNonDeletedSquad(squadId);
    validateLeader(squad, userId);

    squad.delete();
  }

  // --- 내부 헬퍼 ---

  private Squad findActiveSquad(Long squadId) {
    return squadRepository
        .findByIdAndIsDeletedFalseAndIsArchivedFalse(squadId)
        .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_NOT_FOUND));
  }

  private Squad findNonDeletedSquad(Long squadId) {
    return squadRepository
        .findByIdAndIsDeletedFalse(squadId)
        .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_NOT_FOUND));
  }

  private void validateLeader(Squad squad, Long userId) {
    User user = getUser(userId);
    SquadMember member =
        squadMemberRepository
            .findBySquadAndUser(squad, user)
            .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_MEMBER_NOT_FOUND));
    if (member.getRole() != SquadRole.LEADER) {
      throw new CustomException(ErrorCode.SQUAD_FORBIDDEN);
    }
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }
}
