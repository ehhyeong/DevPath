package com.devpath.api.community.dto;

import com.devpath.domain.community.entity.Post;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "내 게시글 목록 응답 DTO")
public class MyPostResponse {

    @Schema(description = "게시글 ID", example = "10")
    private Long id;

    @Schema(description = "게시판 카테고리", example = "TECH_SHARE")
    private String category;

    @Schema(description = "게시글 제목", example = "Spring Security JWT 정리")
    private String title;

    @Schema(description = "게시글 조회수", example = "12")
    private int viewCount;

    @Schema(description = "게시글 좋아요 수", example = "3")
    private int likeCount;

    @Schema(description = "게시글 생성 일시", example = "2026-03-23T14:30:00")
    private LocalDateTime createdAt;

    @Schema(description = "게시글 수정 일시", example = "2026-03-23T15:00:00")
    private LocalDateTime updatedAt;

    public static MyPostResponse from(Post post) {
        return MyPostResponse.builder()
                .id(post.getId())
                .category(post.getCategory().name())
                .title(post.getTitle())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
