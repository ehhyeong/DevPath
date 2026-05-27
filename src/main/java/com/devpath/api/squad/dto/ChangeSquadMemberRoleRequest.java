package com.devpath.api.squad.dto;

import com.devpath.domain.squad.entity.SquadRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "스쿼드 멤버 역할 변경 요청")
public class ChangeSquadMemberRoleRequest {

  @NotNull(message = "변경할 역할은 필수입니다.")
  @Schema(
      description = "변경할 스쿼드 역할",
      example = "MEMBER",
      allowableValues = {"LEADER", "MEMBER"})
  private SquadRole role;
}
