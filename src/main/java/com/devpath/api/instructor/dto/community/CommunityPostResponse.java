package com.devpath.api.instructor.dto.community;

import com.devpath.api.instructor.entity.InstructorPost;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommunityPostResponse {

  private Long id;
  private Long instructorId;
  private String title;
  private String content;
  private String postType;
  private int likeCount;
  private int commentCount;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static CommunityPostResponse from(InstructorPost post) {
    return CommunityPostResponse.builder()
        .id(post.getId())
        .instructorId(post.getInstructorId())
        .title(post.getTitle())
        .content(post.getContent())
        .postType(post.getPostType())
        .likeCount(post.getLikeCount())
        .commentCount(post.getCommentCount())
        .createdAt(post.getCreatedAt())
        .updatedAt(post.getUpdatedAt())
        .build();
  }
}
