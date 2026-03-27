package com.devpath.api.instructor.dto.review;

import com.devpath.api.instructor.entity.ReviewReply;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReviewReplyResponse {

    private Long id;
    private Long reviewId;
    private Long instructorId;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ReviewReplyResponse from(ReviewReply reply) {
        return ReviewReplyResponse.builder()
                .id(reply.getId())
                .reviewId(reply.getReviewId())
                .instructorId(reply.getInstructorId())
                .content(reply.getContent())
                .createdAt(reply.getCreatedAt())
                .updatedAt(reply.getUpdatedAt())
                .build();
    }
}