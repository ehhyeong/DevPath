package com.devpath.api.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;

public class TagDto {

  @Getter
  @Schema(description = "태그 생성 및 수정 요청 DTO")
  public static class CreateRequest {
    @NotBlank(message = "태그 이름은 필수입니다.")
    @Schema(description = "태그 이름", example = "Spring Boot")
    private String name;

    @Schema(description = "태그 카테고리", example = "Backend")
    private String category;
  }

  @Getter
  @Builder
  @Schema(description = "태그 응답 DTO")
  public static class Response {
    @Schema(description = "태그 ID", example = "1")
    private Long tagId;

    @Schema(description = "태그 이름", example = "Spring Boot")
    private String name;

    @Schema(description = "태그 카테고리", example = "Backend")
    private String category;

    @Schema(description = "공식(오피셜) 태그 여부", example = "true")
    private Boolean isOfficial;
  }
}
