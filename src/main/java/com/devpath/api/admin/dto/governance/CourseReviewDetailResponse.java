package com.devpath.api.admin.dto.governance;

import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.Lesson;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CourseReviewDetailResponse {

  private Long courseId;
  private String title;
  private String subtitle;
  private String description;
  private String status;
  private BigDecimal price;
  private BigDecimal originalPrice;
  private String currency;
  private String difficultyLevel;
  private String language;
  private Boolean hasCertificate;
  private String thumbnailUrl;
  private String introVideoUrl;
  private Integer durationSeconds;
  private List<String> prerequisites;
  private List<String> jobRelevance;
  private LocalDateTime submittedAt;
  private Long instructorId;
  private String instructorName;
  private String instructorEmail;
  private int sectionCount;
  private int lessonCount;
  private int publishedLessonCount;
  private int previewLessonCount;
  private int totalDurationSeconds;
  private List<SectionItem> sections;
  private List<CourseReviewHistoryResponse> reviewHistory;

  public static CourseReviewDetailResponse from(
      Course course,
      List<CourseSection> sections,
      Map<Long, List<Lesson>> lessonsBySectionId,
      List<CourseReviewHistoryResponse> reviewHistory,
      Function<Lesson, String> playbackUrlResolver) {
    List<Lesson> lessons =
        sections.stream()
            .flatMap(
                section ->
                    lessonsBySectionId.getOrDefault(section.getSectionId(), List.of()).stream())
            .toList();
    return CourseReviewDetailResponse.builder()
        .courseId(course.getCourseId())
        .title(course.getTitle())
        .subtitle(course.getSubtitle())
        .description(course.getDescription())
        .status(course.getStatus() == null ? null : course.getStatus().name())
        .price(course.getPrice())
        .originalPrice(course.getOriginalPrice())
        .currency(course.getCurrency())
        .difficultyLevel(
            course.getDifficultyLevel() == null ? null : course.getDifficultyLevel().name())
        .language(course.getLanguage())
        .hasCertificate(course.getHasCertificate())
        .thumbnailUrl(course.getThumbnailUrl())
        .introVideoUrl(course.getIntroVideoUrl())
        .durationSeconds(course.getDurationSeconds())
        .prerequisites(course.getPrerequisites())
        .jobRelevance(course.getJobRelevance())
        .submittedAt(course.getUpdatedAt() != null ? course.getUpdatedAt() : course.getCreatedAt())
        .instructorId(course.getInstructorId())
        .instructorName(course.getInstructor() == null ? null : course.getInstructor().getName())
        .instructorEmail(course.getInstructor() == null ? null : course.getInstructor().getEmail())
        .sectionCount(sections.size())
        .lessonCount(lessons.size())
        .publishedLessonCount(
            (int)
                lessons.stream()
                    .filter(lesson -> Boolean.TRUE.equals(lesson.getIsPublished()))
                    .count())
        .previewLessonCount(
            (int)
                lessons.stream()
                    .filter(lesson -> Boolean.TRUE.equals(lesson.getIsPreview()))
                    .count())
        .totalDurationSeconds(
            lessons.stream()
                .map(Lesson::getDurationSeconds)
                .filter(java.util.Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum())
        .sections(
            sections.stream()
                .map(
                    section ->
                        SectionItem.from(
                            section,
                            lessonsBySectionId.getOrDefault(section.getSectionId(), List.of()),
                            playbackUrlResolver))
                .toList())
        .reviewHistory(reviewHistory)
        .build();
  }

  @Getter
  @Builder
  public static class SectionItem {
    private Long sectionId;
    private String title;
    private String description;
    private Integer sortOrder;
    private Boolean published;
    private List<LessonItem> lessons;

    private static SectionItem from(
        CourseSection section, List<Lesson> lessons, Function<Lesson, String> playbackUrlResolver) {
      return SectionItem.builder()
          .sectionId(section.getSectionId())
          .title(section.getTitle())
          .description(section.getDescription())
          .sortOrder(section.getOrderIndex())
          .published(section.getIsPublished())
          .lessons(
              lessons.stream().map(lesson -> LessonItem.from(lesson, playbackUrlResolver)).toList())
          .build();
    }
  }

  @Getter
  @Builder
  public static class LessonItem {
    private Long lessonId;
    private String title;
    private String description;
    private String lessonType;
    private String playbackUrl;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Boolean preview;
    private Boolean published;
    private Integer sortOrder;

    private static LessonItem from(Lesson lesson, Function<Lesson, String> playbackUrlResolver) {
      return LessonItem.builder()
          .lessonId(lesson.getLessonId())
          .title(lesson.getTitle())
          .description(lesson.getDescription())
          .lessonType(lesson.getLessonType() == null ? null : lesson.getLessonType().name())
          .playbackUrl(playbackUrlResolver.apply(lesson))
          .thumbnailUrl(lesson.getThumbnailUrl())
          .durationSeconds(lesson.getDurationSeconds())
          .preview(lesson.getIsPreview())
          .published(lesson.getIsPublished())
          .sortOrder(lesson.getOrderIndex())
          .build();
    }
  }
}
