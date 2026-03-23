package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "외부 블로그 발행 응답 DTO")
public class TilPublishResponse {

    @Schema(description = "TIL ID", example = "1")
    private Long tilId;

    @Schema(description = "발행 성공 여부", example = "true")
    private Boolean published;

    @Schema(description = "발행 플랫폼", example = "VELLOG")
    private String platform;

    @Schema(description = "외부 게시글 ID", example = "velog-20260323-1001")
    private String externalPostId;

    @Schema(description = "외부 게시글 URL", example = "https://velog.io/@devpath/spring-security-study")
    private String publishedUrl;

    @Schema(description = "외부 플랫폼 draft 발행 여부", example = "false")
    private Boolean draft;

    @Schema(description = "발행 완료 시각", example = "2026-03-23T11:30:00")
    private LocalDateTime publishedAt;
}
