package com.devpath.api.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ApplicationMessageRequest {

  private ApplicationMessageRequest() {}

  @Schema(name = "ApplicationMessageCreateRequest", description = "라운지 신청 메시지 작성 요청")
  public record Create(

      // 인증 연동 전 Swagger 테스트를 위해 메시지 작성자 ID를 요청으로 받는다.
      @Schema(description = "메시지 작성자 ID", example = "2") @NotNull(message = "메시지 작성자 ID는 필수입니다.")
          Long senderId,

      // 신청서 또는 제안서 기반 대화 메시지 본문이다.
      @Schema(description = "메시지 내용", example = "지원서 확인 부탁드립니다. 백엔드 API 작업을 맡고 싶습니다.")
          @NotBlank(message = "메시지 내용은 필수입니다.")
          @Size(max = 2000, message = "메시지 내용은 2000자 이하여야 합니다.")
          String content) {}
}
