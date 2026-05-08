package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "외부 블로그 발행 요청 DTO")
public class TilPublishRequest {

  // 발행 플랫폼 식별자다. 우선 문자열로 받고, 서비스에서 정규화한다.
  @NotBlank(message = "발행 플랫폼은 필수입니다.")
  @Schema(description = "발행 플랫폼", example = "VELLOG")
  private String platform;

  // 외부 발행 시 사용할 제목이다.
  @NotBlank(message = "발행 제목은 필수입니다.")
  @Schema(description = "외부 발행 제목", example = "Spring Security 학습 정리")
  private String title;

  // 외부 발행 시 사용할 본문이다.
  @NotBlank(message = "발행 본문은 필수입니다.")
  @Schema(description = "외부 발행 본문", example = "# Spring Security\n인증과 인가를 학습했다.")
  private String content;

  // 외부 블로그 태그 목록이다.
  @Schema(description = "외부 블로그 태그 목록", example = "[\"spring-security\", \"jwt\", \"backend\"]")
  private List<String> tags;

  // 외부 발행 시 임시 저장 여부다.
  @Schema(description = "외부 플랫폼에 draft 로 발행할지 여부", example = "false")
  private Boolean draft;

  // 썸네일 이미지 URL이다.
  @Schema(
      description = "썸네일 이미지 URL",
      example = "https://cdn.devpath.ai/thumbnails/spring-security.png")
  private String thumbnailUrl;
}
