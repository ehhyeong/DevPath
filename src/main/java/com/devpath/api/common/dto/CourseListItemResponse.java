package com.devpath.api.common.dto;

import com.devpath.domain.course.entity.CourseDifficulty;
import com.devpath.domain.course.entity.CourseStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Week 2 common course list item response")
public class CourseListItemResponse {

  @Schema(description = "Course ID", example = "1")
  private Long courseId;

  @Schema(description = "Course title", example = "Spring Boot 입문")
  private String title;

  @Schema(description = "Thumbnail URL", nullable = true, example = "/images/courses/spring-boot.png")
  private String thumbnailUrl;

  @Schema(description = "Instructor name", example = "홍길동")
  private String instructorName;

  @Schema(description = "Instructor channel name", nullable = true, example = "홍길동 백엔드 연구소")
  private String instructorChannelName;

  @Schema(description = "Regular price", example = "99000")
  private Integer price;

  @Schema(description = "Discounted price", nullable = true, example = "69000")
  private Integer discountPrice;

  @Schema(description = "Difficulty")
  private CourseDifficulty difficulty;

  @Schema(description = "Tag names")
  private List<String> tags;

  @Schema(description = "Bookmarked by current user", example = "false")
  private Boolean isBookmarked;

  @Schema(description = "Enrolled by current user", example = "false")
  private Boolean isEnrolled;

  @Schema(description = "Course status")
  private CourseStatus status;
}
