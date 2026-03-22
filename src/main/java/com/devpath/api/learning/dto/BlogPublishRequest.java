package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class BlogPublishRequest {

    @Getter
    @NoArgsConstructor
    @Schema(description = "외부 블로그 발행 요청 DTO")
    public static class Publish {

        @NotBlank(message = "플랫폼은 필수입니다.")
        @Schema(description = "발행 플랫폼", example = "MOCK")
        private String platform;

        @NotBlank(message = "발행 제목은 필수입니다.")
        @Schema(description = "발행 제목", example = "Spring Security 학습 정리")
        private String title;

        @NotBlank(message = "발행 본문은 필수입니다.")
        @Schema(description = "발행 본문", example = "# Spring Security\n인증과 인가를 학습했다.")
        private String content;

        @Schema(description = "발행 태그", example = "spring-security,backend,til")
        private String tags;

        @Schema(description = "비공개 초안 여부", example = "true")
        private Boolean draft;

        @Schema(description = "대표 이미지 URL", example = "https://cdn.devpath.ai/images/spring-security-cover.png")
        private String thumbnailUrl;
    }
}
