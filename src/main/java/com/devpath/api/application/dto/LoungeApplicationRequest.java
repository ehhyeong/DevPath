package com.devpath.api.application.dto;

import com.devpath.domain.application.entity.LoungeApplicationType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class LoungeApplicationRequest {

  private LoungeApplicationRequest() {}

  @Schema(name = "LoungeApplicationCreateRequest", description = "라운지 신청서/제안서 작성 요청")
  public record Create(

      // 인증 연동 전 Swagger 테스트를 위해 발신자 ID를 요청으로 받는다.
      @Schema(description = "보낸 사용자 ID", example = "2") @NotNull(message = "보낸 사용자 ID는 필수입니다.")
          Long senderId,

      // 신청서 또는 제안서를 받을 사용자 ID다.
      @Schema(description = "받는 사용자 ID", example = "1") @NotNull(message = "받는 사용자 ID는 필수입니다.")
          Long receiverId,

      // 스쿼드 지원서인지 제안서인지 구분한다.
      @Schema(description = "신청 타입", example = "SQUAD_APPLICATION")
          @NotNull(message = "신청 타입은 필수입니다.")
          LoungeApplicationType type,

      // 스쿼드 또는 라운지 대상 ID다.
      @Schema(description = "대상 ID", example = "1") @NotNull(message = "대상 ID는 필수입니다.")
          Long targetId,

      // 대상 이름 또는 모집글 제목이다.
      @Schema(description = "대상 제목", example = "DevPath 백엔드 스쿼드")
          @NotBlank(message = "대상 제목은 필수입니다.")
          @Size(max = 150, message = "대상 제목은 150자 이하여야 합니다.")
          String targetTitle,

      // 신청서 또는 제안서 제목이다.
      @Schema(description = "신청 제목", example = "백엔드 역할로 스쿼드에 지원합니다.")
          @NotBlank(message = "신청 제목은 필수입니다.")
          @Size(max = 150, message = "신청 제목은 150자 이하여야 합니다.")
          String title,

      // 신청 동기 또는 제안 내용을 작성한다.
      @Schema(description = "신청 내용", example = "Spring Boot와 JPA 작업 경험이 있어 백엔드 역할로 참여하고 싶습니다.")
          @NotBlank(message = "신청 내용은 필수입니다.")
          @Size(max = 3000, message = "신청 내용은 3000자 이하여야 합니다.")
          String content) {}

  @Schema(name = "LoungeApplicationApproveRequest", description = "라운지 신청 승인 요청")
  public record Approve(

      // 받은 사용자 본인만 승인할 수 있도록 검증한다.
      @Schema(description = "받는 사용자 ID", example = "1") @NotNull(message = "받는 사용자 ID는 필수입니다.")
          Long receiverId) {}

  @Schema(name = "LoungeApplicationRejectRequest", description = "라운지 신청 거절 요청")
  public record Reject(

      // 받은 사용자 본인만 거절할 수 있도록 검증한다.
      @Schema(description = "받는 사용자 ID", example = "1") @NotNull(message = "받는 사용자 ID는 필수입니다.")
          Long receiverId,

      // 거절 사유를 신청자에게 전달한다.
      @Schema(description = "거절 사유", example = "현재 백엔드 포지션이 마감되었습니다.")
          @Size(max = 500, message = "거절 사유는 500자 이하여야 합니다.")
          String rejectReason) {}
}
