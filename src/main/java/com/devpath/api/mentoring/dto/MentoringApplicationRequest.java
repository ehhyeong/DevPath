package com.devpath.api.mentoring.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MentoringApplicationRequest {

  private MentoringApplicationRequest() {}

  @Schema(name = "MentoringApplicationCreateRequest", description = "멘토링 신청 요청")
  public record Create(
      @Schema(hidden = true) Long applicantId,

      // 멘토에게 전달할 신청 메시지다.
      @Schema(description = "신청 메시지", example = "Spring Boot 포트폴리오 리뷰를 받고 싶습니다.")
          @NotBlank(message = "신청 메시지는 필수입니다.")
          @Size(max = 2000, message = "신청 메시지는 2000자 이하여야 합니다.")
          String message,
      @Schema(description = "팀 프로젝트형 신청 시 희망 직군", example = "Frontend 개발자")
          @Size(max = 80, message = "희망 직군은 80자 이하여야 합니다.")
          String desiredPosition) {}

  @Schema(name = "MentoringApplicationApproveRequest", description = "멘토링 신청 승인 요청")
  public record Approve(@Schema(hidden = true) Long mentorId) {}

  @Schema(name = "MentoringApplicationRejectRequest", description = "멘토링 신청 거절 요청")
  public record Reject(
      @Schema(hidden = true) Long mentorId,

      // 신청자에게 전달할 거절 사유다.
      @Schema(description = "거절 사유", example = "이번 기수 모집 인원이 마감되었습니다.")
          @Size(max = 500, message = "거절 사유는 500자 이하여야 합니다.")
          String rejectReason) {}
}
