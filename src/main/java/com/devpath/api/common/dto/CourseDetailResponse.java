package com.devpath.api.common.dto;

import com.devpath.domain.course.entity.CourseStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Week 2 common course detail response")
public class CourseDetailResponse {

  @Schema(description = "Course ID", example = "1")
  private Long courseId;

  @Schema(description = "Course title", example = "Spring Boot 입문")
  private String title;

  @Schema(description = "Course subtitle", nullable = true, example = "실무형 API 서버를 만드는 가장 빠른 경로")
  private String subtitle;

  @Schema(description = "Course description")
  private String description;

  @Schema(description = "Thumbnail URL", nullable = true)
  private String thumbnailUrl;

  @Schema(description = "Trailer URL", nullable = true)
  private String trailerUrl;

  @Schema(description = "Instructor summary")
  private InstructorSummary instructor;

  @Schema(description = "Regular price", example = "99000")
  private Integer price;

  @Schema(description = "Discounted price", nullable = true, example = "69000")
  private Integer discountPrice;

  @Schema(description = "Course status")
  private CourseStatus status;

  @Schema(description = "Course objectives")
  private List<String> objectives;

  @Schema(description = "Target audiences")
  private List<String> targetAudiences;

  @Schema(description = "Prerequisites")
  private List<String> prerequisites;

  @Schema(description = "Job relevance")
  private List<String> jobRelevance;

  @Schema(description = "Tag names")
  private List<String> tags;

  @Schema(description = "Course sections")
  private List<SectionSummary> sections;

  @Schema(description = "Course news summaries")
  private List<NewsSummary> news;

  @Getter
  @Builder
  @Schema(description = "Instructor summary")
  public static class InstructorSummary {

    @Schema(description = "Instructor ID", example = "2")
    private Long instructorId;

    @Schema(description = "Instructor name", example = "홍길동")
    private String name;

    @Schema(description = "Channel name", nullable = true, example = "홍길동 백엔드 연구소")
    private String channelName;

    @Schema(description = "Profile image URL", nullable = true)
    private String profileImageUrl;

    @Schema(description = "Specialty tags")
    private List<String> specialties;
  }

  @Getter
  @Builder
  @Schema(description = "Section summary")
  public static class SectionSummary {

    @Schema(description = "Section ID", example = "10")
    private Long sectionId;

    @Schema(description = "Section title", example = "Spring Core")
    private String title;

    @Schema(description = "Section order", example = "1")
    private Integer order;

    @Schema(description = "Lesson count", example = "3")
    private Integer lessonCount;

    @Schema(description = "Lessons")
    private List<LessonSummary> lessons;
  }

  @Getter
  @Builder
  @Schema(description = "Lesson summary")
  public static class LessonSummary {

    @Schema(description = "Lesson ID", example = "101")
    private Long lessonId;

    @Schema(description = "Lesson title", example = "DI와 IoC 이해하기")
    private String title;

    @Schema(description = "Lesson order", example = "1")
    private Integer order;

    @Schema(description = "Previewable", example = "true")
    private Boolean previewable;

    @Schema(description = "Duration in seconds", nullable = true, example = "780")
    private Integer durationSeconds;
  }

  @Getter
  @Builder
  @Schema(description = "Course news summary")
  public static class NewsSummary {

    @Schema(description = "News ID", example = "9001")
    private Long newsId;

    @Schema(description = "News title", example = "실습 자료 업데이트")
    private String title;

    @Schema(description = "News type", example = "UPDATE")
    private String type;

    @Schema(description = "Pinned", example = "true")
    private Boolean pinned;

    @Schema(description = "Created at")
    private LocalDateTime createdAt;
  }
}
