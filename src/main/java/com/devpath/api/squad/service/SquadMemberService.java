package com.devpath.api.squad.service;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.squad.dto.SquadMemberResponse;
import com.devpath.api.squad.dto.SquadResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import com.devpath.domain.squad.repository.SquadMemberRepository;
import com.devpath.domain.squad.repository.SquadRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SquadMemberService {

  private final SquadRepository squadRepository;
  private final SquadMemberRepository squadMemberRepository;
  private final UserRepository userRepository;
  private final NotificationEventService notificationEventService;

  public List<SquadResponse> getMySquads(Long userId) {
    User user = getUser(userId);

    return squadMemberRepository.findActiveMembershipsByUser(user).stream()
        .map(SquadMember::getSquad)
        .map(squad -> SquadResponse.from(squad, squadMemberRepository.findBySquadWithUser(squad)))
        .toList();
  }

  @Transactional
  public SquadMemberResponse addMember(Long squadId, Long leaderId, Long targetUserId) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, leaderId);

    User targetUser = getUser(targetUserId);
    if (squadMemberRepository.existsBySquadAndUser(squad, targetUser)) {
      throw new CustomException(ErrorCode.SQUAD_ALREADY_MEMBER);
    }

    SquadMember member =
        SquadMember.builder().squad(squad).user(targetUser).role(SquadRole.MEMBER).build();

    squadMemberRepository.save(member);
    return SquadMemberResponse.from(member);
  }

  @Transactional
  public SquadMemberResponse changeMemberRole(
      Long squadId, Long leaderId, Long memberId, SquadRole role) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, leaderId);

    SquadMember targetMember = findActiveMember(squad, memberId);
    if (targetMember.getRole() == SquadRole.LEADER && role != SquadRole.LEADER) {
      validateNotLastLeader(squad);
    }

    targetMember.changeRole(role);
    return SquadMemberResponse.from(targetMember);
  }

  @Transactional
  public void removeMember(Long squadId, Long leaderId, Long memberId) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, leaderId);

    SquadMember targetMember = findActiveMember(squad, memberId);
    if (Objects.equals(targetMember.getUser().getId(), leaderId)) {
      throw new CustomException(ErrorCode.SQUAD_LEADER_CANNOT_REMOVE_SELF);
    }
    if (targetMember.getRole() == SquadRole.LEADER) {
      validateNotLastLeader(squad);
    }

    Long kickedUserId = targetMember.getUser().getId();
    String squadName = squad.getName();
    targetMember.delete();

    notificationEventService.notifySquadKicked(kickedUserId, squadName);
  }

  private Squad findActiveSquad(Long squadId) {
    return squadRepository
        .findByIdAndIsDeletedFalseAndIsArchivedFalse(squadId)
        .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_NOT_FOUND));
  }

  private SquadMember findActiveMember(Squad squad, Long memberId) {
    return squadMemberRepository
        .findByIdAndSquadAndIsDeletedFalse(memberId, squad)
        .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_MEMBER_NOT_FOUND));
  }

  private SquadMember validateLeader(Squad squad, Long userId) {
    User user = getUser(userId);
    SquadMember member =
        squadMemberRepository
            .findBySquadAndUser(squad, user)
            .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_MEMBER_NOT_FOUND));

    if (member.getRole() != SquadRole.LEADER) {
      throw new CustomException(ErrorCode.SQUAD_FORBIDDEN);
    }

    return member;
  }

  private void validateNotLastLeader(Squad squad) {
    long leaderCount =
        squadMemberRepository.countBySquadAndRoleAndIsDeletedFalse(squad, SquadRole.LEADER);

    if (leaderCount <= 1) {
      throw new CustomException(ErrorCode.SQUAD_LAST_LEADER_CANNOT_BE_CHANGED);
    }
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }
}
