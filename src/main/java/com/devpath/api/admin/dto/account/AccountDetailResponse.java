package com.devpath.api.admin.dto.account;

import com.devpath.domain.user.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "관리자 회원 상세 응답")
public class AccountDetailResponse {

  @Schema(description = "회원 ID", example = "15")
  private Long userId;

  @Schema(description = "이메일", example = "learner1@devpath.com")
  private String email;

  @Schema(description = "닉네임", example = "김태형")
  private String nickname;

  @Schema(description = "권한", example = "ROLE_LEARNER")
  private String role;

  @Schema(
      description = "계정 상태",
      example = "ACTIVE",
      allowableValues = {"ACTIVE", "INACTIVE"})
  private AccountStatus accountStatus;

  @Schema(description = "가입 시각")
  private LocalDateTime createdAt;

  @Schema(description = "마지막 로그인 시각")
  private LocalDateTime lastLoginAt;

  // 현재는 users.is_active 기반으로 응답 enum을 구성한다.
  public static AccountDetailResponse from(User user) {
    return AccountDetailResponse.builder()
        .userId(user.getId())
        .email(user.getEmail())
        .nickname(user.getName())
        .role(user.getRole().name())
        .accountStatus(
            Boolean.TRUE.equals(user.getIsActive()) ? AccountStatus.ACTIVE : AccountStatus.INACTIVE)
        .createdAt(user.getCreatedAt())
        .lastLoginAt(user.getLastLoginAt())
        .build();
  }
}
