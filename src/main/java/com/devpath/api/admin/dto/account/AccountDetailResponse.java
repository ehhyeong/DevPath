package com.devpath.api.admin.dto.account;

import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.InstructorStatus;
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
      allowableValues = {"ACTIVE", "RESTRICTED", "DEACTIVATED", "WITHDRAWN"})
  private AccountStatus accountStatus;

  @Schema(description = "강사 승인 상태", example = "PENDING")
  private InstructorStatus instructorStatus;

  @Schema(description = "강사 등급", example = "STANDARD")
  private String instructorGrade;

  @Schema(description = "가입 시각")
  private LocalDateTime createdAt;

  @Schema(description = "마지막 로그인 시각")
  private LocalDateTime lastLoginAt;

  public static AccountDetailResponse from(User user) {
    AccountStatus accountStatus = user.getAccountStatus();
    if (accountStatus == null) {
      accountStatus =
          Boolean.TRUE.equals(user.getIsActive())
              ? AccountStatus.ACTIVE
              : AccountStatus.DEACTIVATED;
    }

    return AccountDetailResponse.builder()
        .userId(user.getId())
        .email(user.getEmail())
        .nickname(user.getName())
        .role(user.getRole().name())
        .accountStatus(accountStatus)
        .instructorStatus(user.getInstructorStatus())
        .instructorGrade(user.getInstructorGrade())
        .createdAt(user.getCreatedAt())
        .lastLoginAt(user.getLastLoginAt())
        .build();
  }
}
