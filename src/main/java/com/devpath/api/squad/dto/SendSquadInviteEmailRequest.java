package com.devpath.api.squad.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "스쿼드 이메일 초대 요청")
public class SendSquadInviteEmailRequest {

  @NotBlank(message = "초대 이메일은 필수입니다.")
  @Email(message = "올바른 이메일 형식이어야 합니다.")
  @Size(max = 255, message = "이메일은 255자를 초과할 수 없습니다.")
  @Schema(description = "초대 대상 이메일", example = "teammate@example.com")
  private String email;

  @Size(max = 500, message = "초대 메시지는 500자를 초과할 수 없습니다.")
  @Schema(description = "초대 메시지", example = "DevPath A팀 프로젝트에 같이 참여해 주세요.")
  private String message;
}
