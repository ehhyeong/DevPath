package com.devpath.api.community.dto;

import com.devpath.domain.community.entity.Post;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "게시글 상세/목록 응답 DTO")
public class PostResponse {

  @Schema(description = "게시글 ID", example = "10")
  private Long id;

  @Schema(description = "작성자 이름", example = "김태형")
  private String authorName;

  @Schema(description = "게시판 카테고리", example = "TECH_SHARE")
  private String category;

  @Schema(description = "게시글 제목", example = "Spring Boot N+1 문제 해결기")
  private String title;

  @Schema(description = "게시글 본문", example = "FetchType.LAZY를 적용하여...")
  private String content;

  @Schema(description = "게시글 조회수", example = "15")
  private int viewCount;

  @Schema(description = "게시글 좋아요 수", example = "4")
  private int likeCount;

  @Schema(description = "게시글 생성 일시", example = "2026-03-23T14:30:00")
  private LocalDateTime createdAt;

  public static PostResponse from(Post post) {
    return PostResponse.builder()
        .id(post.getId())
        .authorName(post.getUser().getName())
        .category(post.getCategory().name())
        .title(post.getTitle())
        .content(post.getContent())
        .viewCount(post.getViewCount())
        .likeCount(post.getLikeCount())
        .createdAt(post.getCreatedAt())
        .build();
  }
}
