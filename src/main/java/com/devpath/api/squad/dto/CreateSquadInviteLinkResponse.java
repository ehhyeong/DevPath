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
@Schema(description = "스쿼드 초대 링크 생성 응답")
public class CreateSquadInviteLinkResponse {

  @Schema(description = "초대 ID", example = "1")
  private Long invitationId;

  @Schema(description = "스쿼드 ID", example = "1")
  private Long squadId;

  @Schema(description = "초대 토큰", example = "550e8400-e29b-41d4-a716-446655440000")
  private String invitationToken;

  @Schema(description = "초대 URL", example = "/squad-invites/550e8400-e29b-41d4-a716-446655440000")
  private String inviteUrl;

  @Schema(description = "초대 상태", example = "PENDING")
  private String status;

  @Schema(description = "초대 만료 일시")
  private LocalDateTime expiresAt;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  @Builder
  private CreateSquadInviteLinkResponse(
      Long invitationId,
      Long squadId,
      String invitationToken,
      String inviteUrl,
      String status,
      LocalDateTime expiresAt,
      LocalDateTime createdAt) {
    this.invitationId = invitationId;
    this.squadId = squadId;
    this.invitationToken = invitationToken;
    this.inviteUrl = inviteUrl;
    this.status = status;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
  }

  public static CreateSquadInviteLinkResponse from(SquadInvitation invitation, String inviteUrl) {
    return CreateSquadInviteLinkResponse.builder()
        .invitationId(invitation.getId())
        .squadId(invitation.getSquad().getId())
        .invitationToken(invitation.getInvitationToken())
        .inviteUrl(inviteUrl)
        .status(invitation.getStatus().name())
        .expiresAt(invitation.getExpiresAt())
        .createdAt(invitation.getCreatedAt())
        .build();
  }
}
