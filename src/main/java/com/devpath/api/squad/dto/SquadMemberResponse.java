package com.devpath.api.squad.dto;

import com.devpath.domain.squad.entity.SquadMember;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "스쿼드 멤버 응답")
public class SquadMemberResponse {

  @Schema(description = "스쿼드 멤버 ID", example = "1")
  private Long memberId;

  @Schema(description = "스쿼드 ID", example = "1")
  private Long squadId;

  @Schema(description = "사용자 ID", example = "2")
  private Long userId;

  @Schema(description = "사용자 이름", example = "김태형")
  private String userName;

  @Schema(description = "스쿼드 역할", example = "MEMBER")
  private String role;

  @Schema(description = "참여 일시")
  private LocalDateTime joinedAt;

  @Schema(description = "삭제 여부", example = "false")
  private boolean deleted;

  @Builder
  private SquadMemberResponse(
      Long memberId,
      Long squadId,
      Long userId,
      String userName,
      String role,
      LocalDateTime joinedAt,
      boolean deleted) {
    this.memberId = memberId;
    this.squadId = squadId;
    this.userId = userId;
    this.userName = userName;
    this.role = role;
    this.joinedAt = joinedAt;
    this.deleted = deleted;
  }

  public static SquadMemberResponse from(SquadMember member) {
    return SquadMemberResponse.builder()
        .memberId(member.getId())
        .squadId(member.getSquad().getId())
        .userId(member.getUser().getId())
        .userName(member.getUser().getName())
        .role(member.getRole().name())
        .joinedAt(member.getJoinedAt())
        .deleted(Boolean.TRUE.equals(member.getIsDeleted()))
        .build();
  }
}
