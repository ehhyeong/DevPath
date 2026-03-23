package com.devpath.api.community.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "게시글 좋아요 응답 DTO")
public class PostLikeResponse {

    @Schema(description = "게시글 ID", example = "10")
    private Long postId;

    @Schema(description = "현재 게시글 좋아요 수", example = "7")
    private int likeCount;

    @Schema(description = "현재 사용자의 좋아요 여부", example = "true")
    private boolean liked;

    public static PostLikeResponse of(Long postId, int likeCount, boolean liked) {
        return PostLikeResponse.builder()
                .postId(postId)
                .likeCount(likeCount)
                .liked(liked)
                .build();
    }
}
