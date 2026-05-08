package com.devpath.api.review.dto;

import com.devpath.api.instructor.entity.ReviewReply;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "리뷰 공식 답글 응답")
public class ReviewOfficialReplyResponse {

  @Schema(description = "답글 ID", example = "5")
  private Long id;

  @Schema(description = "답글 작성 강사 ID", example = "3")
  private Long instructorId;

  @Schema(description = "답글 내용", example = "불편을 드려 죄송합니다. 예제를 보강하겠습니다.")
  private String content;

  @Schema(description = "작성 시각")
  private LocalDateTime createdAt;

  @Schema(description = "수정 시각")
  private LocalDateTime updatedAt;

  public static ReviewOfficialReplyResponse from(ReviewReply reply) {
    return ReviewOfficialReplyResponse.builder()
        .id(reply.getId())
        .instructorId(reply.getInstructorId())
        .content(reply.getContent())
        .createdAt(reply.getCreatedAt())
        .updatedAt(reply.getUpdatedAt())
        .build();
  }
}
