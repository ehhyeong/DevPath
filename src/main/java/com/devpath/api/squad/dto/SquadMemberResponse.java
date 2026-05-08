package com.devpath.api.squad.dto;

import com.devpath.domain.squad.entity.SquadMember;
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
public class SquadMemberResponse {

  private Long userId;
  private String userName;
  private String role;
  private LocalDateTime joinedAt;

  public static SquadMemberResponse from(SquadMember member) {
    return SquadMemberResponse.builder()
        .userId(member.getUser().getId())
        .userName(member.getUser().getName())
        .role(member.getRole().name())
        .joinedAt(member.getJoinedAt())
        .build();
  }
}
