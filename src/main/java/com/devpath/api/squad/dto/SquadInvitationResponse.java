package com.devpath.api.squad.dto;

import com.devpath.domain.squad.entity.SquadInvitation;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SquadInvitationResponse {

  private Long invitationId;
  private Long squadId;
  private String squadName;
  private Long inviterId;
  private Long inviteeId;
  private String status;
  private LocalDateTime createdAt;

  public static SquadInvitationResponse from(SquadInvitation invitation) {
    return SquadInvitationResponse.builder()
        .invitationId(invitation.getId())
        .squadId(invitation.getSquad().getId())
        .squadName(invitation.getSquad().getName())
        .inviterId(invitation.getInviterId())
        .inviteeId(invitation.getInviteeId())
        .status(invitation.getStatus().name())
        .createdAt(invitation.getCreatedAt())
        .build();
  }
}
