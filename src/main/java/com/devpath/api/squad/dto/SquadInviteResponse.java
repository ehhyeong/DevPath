package com.devpath.api.squad.dto;

import com.devpath.domain.squad.entity.SquadInvitation;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "스쿼드 초대 응답")
public class SquadInviteResponse {

  @Schema(description = "초대 ID", example = "1")
  private Long invitationId;

  @Schema(description = "스쿼드 ID", example = "1")
  private Long squadId;

  @Schema(description = "스쿼드 이름", example = "DevPath A Squad")
  private String squadName;

  @Schema(description = "초대한 사용자 ID", example = "1")
  private Long inviterId;

  @Schema(description = "초대 대상 사용자 ID", example = "2")
  private Long inviteeId;

  @Schema(description = "초대 대상 이메일", example = "teammate@example.com")
  private String inviteEmail;

  @Schema(description = "초대 메시지", example = "DevPath A팀 프로젝트에 같이 참여해 주세요.")
  private String message;

  @Schema(description = "초대 토큰", example = "550e8400-e29b-41d4-a716-446655440000")
  private String invitationToken;

  @Schema(description = "초대 URL", example = "/squad-invites/550e8400-e29b-41d4-a716-446655440000")
  private String inviteUrl;

  @Schema(description = "초대 상태", example = "PENDING")
  private String status;

  @Schema(description = "초대 만료 일시")
  private LocalDateTime expiresAt;

  @Schema(description = "초대 수락 일시")
  private LocalDateTime acceptedAt;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  @Builder
  private SquadInviteResponse(
      Long invitationId,
      Long squadId,
      String squadName,
      Long inviterId,
      Long inviteeId,
      String inviteEmail,
      String message,
      String invitationToken,
      String inviteUrl,
      String status,
      LocalDateTime expiresAt,
      LocalDateTime acceptedAt,
      LocalDateTime createdAt) {
    this.invitationId = invitationId;
    this.squadId = squadId;
    this.squadName = squadName;
    this.inviterId = inviterId;
    this.inviteeId = inviteeId;
    this.inviteEmail = inviteEmail;
    this.message = message;
    this.invitationToken = invitationToken;
    this.inviteUrl = inviteUrl;
    this.status = status;
    this.expiresAt = expiresAt;
    this.acceptedAt = acceptedAt;
    this.createdAt = createdAt;
  }

  public static SquadInviteResponse from(SquadInvitation invitation, String inviteUrl) {
    return SquadInviteResponse.builder()
        .invitationId(invitation.getId())
        .squadId(invitation.getSquad().getId())
        .squadName(invitation.getSquad().getName())
        .inviterId(invitation.getInviterId())
        .inviteeId(invitation.getInviteeId())
        .inviteEmail(invitation.getInviteEmail())
        .message(invitation.getMessage())
        .invitationToken(invitation.getInvitationToken())
        .inviteUrl(inviteUrl)
        .status(invitation.getStatus().name())
        .expiresAt(invitation.getExpiresAt())
        .acceptedAt(invitation.getAcceptedAt())
        .createdAt(invitation.getCreatedAt())
        .build();
  }
}
