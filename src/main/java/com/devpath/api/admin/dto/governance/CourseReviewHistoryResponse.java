package com.devpath.api.admin.dto.governance;

import com.devpath.api.admin.entity.CourseReviewHistory;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CourseReviewHistoryResponse {

  private Long id;
  private Long courseId;
  private Long instructorId;
  private Long adminId;
  private String action;
  private String reason;
  private LocalDateTime processedAt;

  public static CourseReviewHistoryResponse from(CourseReviewHistory history) {
    return CourseReviewHistoryResponse.builder()
        .id(history.getId())
        .courseId(history.getCourseId())
        .instructorId(history.getInstructorId())
        .adminId(history.getAdminId())
        .action(history.getAction())
        .reason(history.getReason())
        .processedAt(history.getProcessedAt())
        .build();
  }
}
