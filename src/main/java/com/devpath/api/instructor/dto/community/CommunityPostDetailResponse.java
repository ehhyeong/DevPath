package com.devpath.api.instructor.dto.community;

import com.devpath.api.instructor.entity.InstructorPost;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommunityPostDetailResponse {

    private Long id;
    private Long instructorId;
    private String title;
    private String content;
    private String postType;
    private int likeCount;
    private int commentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<CommunityCommentDetailResponse> comments;

    public static CommunityPostDetailResponse from(
            InstructorPost post,
            List<CommunityCommentDetailResponse> comments
    ) {
        return CommunityPostDetailResponse.builder()
                .id(post.getId())
                .instructorId(post.getInstructorId())
                .title(post.getTitle())
                .content(post.getContent())
                .postType(post.getPostType())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .comments(comments)
                .build();
    }
}
