package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.TilDraft;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

public class BlogPublishResponse {

    @Getter
    @Builder
    @Schema(description = "외부 블로그 발행 응답 DTO")
    public static class Publish {

        @Schema(description = "TIL ID", example = "1")
        private Long tilId;

        @Schema(description = "발행 플랫폼", example = "MOCK")
        private String platform;

        @Schema(description = "발행 성공 여부", example = "true")
        private Boolean published;

        @Schema(description = "발행 URL", example = "https://mock.blog.devpath/posts/1")
        private String publishedUrl;

        @Schema(description = "발행 제목", example = "Spring Security 학습 정리")
        private String title;

        @Schema(description = "발행 시각", example = "2026-03-23T14:30:00")
        private LocalDateTime publishedAt;

        @Schema(description = "외부 게시글 ID", example = "mock-post-1")
        private String externalPostId;

        @Schema(description = "결과 메시지", example = "블로그 발행이 완료되었습니다.")
        private String message;
    }

    @Getter
    @Builder
    @Schema(description = "블로그 발행 내부 결과 DTO")
    public static class ProviderResult {

        @Schema(description = "외부 게시글 ID", example = "mock-post-1")
        private String externalPostId;

        @Schema(description = "외부 게시글 URL", example = "https://mock.blog.devpath/posts/1")
        private String publishedUrl;

        @Schema(description = "발행 성공 여부", example = "true")
        private Boolean success;

        @Schema(description = "provider 메시지", example = "MOCK 발행이 완료되었습니다.")
        private String message;
    }

    public static Publish of(
            TilDraft tilDraft,
            String platform,
            String resolvedTitle,
            ProviderResult providerResult
    ) {
        return Publish.builder()
                .tilId(tilDraft.getId())
                .platform(platform)
                .published(providerResult.getSuccess())
                .publishedUrl(providerResult.getPublishedUrl())
                .title(resolvedTitle)
                .publishedAt(LocalDateTime.now())
                .externalPostId(providerResult.getExternalPostId())
                .message(providerResult.getMessage())
                .build();
    }
}
