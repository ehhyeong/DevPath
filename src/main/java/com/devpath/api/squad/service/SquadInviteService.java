package com.devpath.api.squad.service;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.squad.dto.CreateSquadInviteLinkResponse;
import com.devpath.api.squad.dto.SendSquadInviteEmailRequest;
import com.devpath.api.squad.dto.SquadInviteResponse;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SquadInviteService {

  private static final long INVITE_EXPIRE_DAYS = 7L;
  private static final String INVITE_URL_PREFIX = "/squad-invites/";

  private final SquadRepository squadRepository;
  private final SquadInvitationRepository squadInvitationRepository;
  private final SquadMemberRepository squadMemberRepository;
  private final UserRepository userRepository;
  private final NotificationEventService notificationEventService;

  @Transactional
  public CreateSquadInviteLinkResponse createInviteLink(Long squadId, Long inviterId) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, inviterId);

    String token = createToken();
    LocalDateTime expiresAt = LocalDateTime.now().plusDays(INVITE_EXPIRE_DAYS);

    SquadInvitation invitation =
        SquadInvitation.builder()
            .squad(squad)
            .inviterId(inviterId)
            .invitationToken(token)
            .expiresAt(expiresAt)
            .status(SquadInvitationStatus.PENDING)
            .build();

    squadInvitationRepository.save(invitation);
    return CreateSquadInviteLinkResponse.from(invitation, buildInviteUrl(token));
  }

  @Transactional
  public SquadInviteResponse sendEmailInvite(
      Long squadId, Long inviterId, SendSquadInviteEmailRequest request) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, inviterId);

    String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
    if (squadInvitationRepository.existsBySquadAndInviteEmailAndStatus(
        squad, normalizedEmail, SquadInvitationStatus.PENDING)) {
      throw new CustomException(ErrorCode.SQUAD_INVITATION_ALREADY_PENDING);
    }

    String token = createToken();
    LocalDateTime expiresAt = LocalDateTime.now().plusDays(INVITE_EXPIRE_DAYS);

    SquadInvitation invitation =
        SquadInvitation.builder()
            .squad(squad)
            .inviterId(inviterId)
            .inviteEmail(normalizedEmail)
            .message(request.getMessage())
            .invitationToken(token)
            .expiresAt(expiresAt)
            .status(SquadInvitationStatus.PENDING)
            .build();

    squadInvitationRepository.save(invitation);

    // 초대 이메일이 DevPath 가입자인 경우에만 인앱 알림 발송
    userRepository
        .findByEmail(normalizedEmail)
        .ifPresent(
            invitee ->
                notificationEventService.notifySquadInvited(invitee.getId(), squad.getName()));

    return SquadInviteResponse.from(invitation, buildInviteUrl(token));
  }

  public List<SquadInviteResponse> getInvites(
      Long squadId, Long userId, SquadInvitationStatus status) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, userId);

    List<SquadInvitation> invitations =
        status == null
            ? squadInvitationRepository.findBySquadOrderByCreatedAtDesc(squad)
            : squadInvitationRepository.findBySquadAndStatusOrderByCreatedAtDesc(squad, status);

    return invitations.stream()
        .map(
            invitation ->
                SquadInviteResponse.from(
                    invitation, buildInviteUrl(invitation.getInvitationToken())))
        .toList();
  }

  private Squad findActiveSquad(Long squadId) {
    return squadRepository
        .findByIdAndIsDeletedFalseAndIsArchivedFalse(squadId)
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

  private String createToken() {
    return UUID.randomUUID().toString();
  }

  private String buildInviteUrl(String token) {
    if (token == null || token.isBlank()) {
      return null;
    }
    return INVITE_URL_PREFIX + token;
  }
}
