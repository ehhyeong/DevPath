package com.devpath.api.squad.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InviteSquadMemberRequest {

  @NotNull(message = "초대할 사용자 ID는 필수입니다.")
  private Long inviteeId;
}
