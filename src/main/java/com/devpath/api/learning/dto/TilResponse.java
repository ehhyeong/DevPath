package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.TilDraft;
import com.devpath.domain.learning.entity.TilDraftStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "TIL 응답 DTO")
public class TilResponse {

  @Schema(description = "TIL ID", example = "1")
  private Long tilId;

  @Schema(description = "레슨 ID", example = "10")
  private Long lessonId;

  @Schema(description = "TIL 제목", example = "Spring Security 학습 정리")
  private String title;

  @Schema(description = "TIL 본문", example = "# Spring Security\n인증과 인가를 학습했다.")
  private String content;

  @Schema(
      description = "자동 생성 목차",
      example = "[{\"level\":1,\"title\":\"Spring Security\",\"anchor\":\"spring-security\"}]")
  private String tableOfContents;

  @Schema(description = "목차 생성 여부", example = "true")
  private Boolean hasTableOfContents;

  @Schema(description = "TIL 상태", example = "DRAFT")
  private TilDraftStatus status;

  @Schema(description = "발행 URL", example = "https://mock.blog.devpath/posts/mock-post-1")
  private String publishedUrl;

  @Schema(description = "생성 시각", example = "2026-03-23T11:00:00")
  private LocalDateTime createdAt;

  @Schema(description = "수정 시각", example = "2026-03-23T11:10:00")
  private LocalDateTime updatedAt;

  public static TilResponse from(TilDraft til) {
    String toc = til.getTableOfContents() == null ? "[]" : til.getTableOfContents();

    return TilResponse.builder()
        .tilId(til.getId())
        .lessonId(til.getLesson() != null ? til.getLesson().getLessonId() : null)
        .title(til.getTitle())
        .content(til.getContent())
        .tableOfContents(toc)
        .hasTableOfContents(!"[]".equals(toc) && !toc.isBlank())
        .status(til.getStatus())
        .publishedUrl(til.getPublishedUrl())
        .createdAt(til.getCreatedAt())
        .updatedAt(til.getUpdatedAt())
        .build();
  }
}
