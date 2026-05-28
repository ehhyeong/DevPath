package com.devpath.api.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
@Schema(description = "Course detail response DTO")
public class CourseDetailResponse {

  @Schema(description = "Course ID", example = "1")
  private Long courseId;

  @Schema(description = "Course title")
  private String title;

  @Schema(description = "Course subtitle")
  private String subtitle;

  @Schema(description = "Course description")
  private String description;

  @Schema(description = "Course status", example = "DRAFT")
  private String status;

  @Schema(description = "Price", example = "99000")
  private BigDecimal price;

  @Schema(description = "Original price", example = "129000")
  private BigDecimal originalPrice;

  @Schema(description = "Currency code", example = "KRW")
  private String currency;

  @Schema(description = "Difficulty level", example = "BEGINNER")
  private String difficultyLevel;

  @Schema(description = "Course language", example = "ko")
  private String language;

  @Schema(description = "Certificate availability", example = "true")
  private Boolean hasCertificate;

  @Schema(description = "Thumbnail URL")
  private String thumbnailUrl;

  @Schema(description = "Intro video URL")
  private String introVideoUrl;

  @Schema(description = "Video asset key")
  private String videoAssetKey;

  @Schema(description = "Video duration seconds", example = "95")
  private Integer durationSeconds;

  @Schema(description = "Prerequisites")
  private List<String> prerequisites;

  @Schema(description = "Job relevance")
  private List<String> jobRelevance;

  @Schema(description = "Objectives")
  private List<ObjectiveItem> objectives;

  @Schema(description = "Target audiences")
  private List<TargetAudienceItem> targetAudiences;

  @Schema(description = "Learner-facing course info sections")
  private List<InfoSectionItem> infoSections;

  @Schema(description = "Course tags")
  private List<TagItem> tags;

  @Schema(description = "Bookmarked by current user", example = "false")
  private Boolean isBookmarked;

  @Schema(description = "Enrolled by current user", example = "false")
  private Boolean isEnrolled;

  @Schema(description = "Instructor info")
  private InstructorInfo instructor;

  @Schema(description = "Course sections")
  private List<SectionItem> sections;

  @Schema(description = "Course news")
  private List<NewsItem> news;

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Objective item")
  public static class ObjectiveItem {

    @Schema(description = "Objective ID", example = "10")
    private Long objectiveId;

    @Schema(description = "Objective text")
    private String objectiveText;

    @Schema(description = "Display order", example = "0")
    private Integer displayOrder;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Target audience item")
  public static class TargetAudienceItem {

    @Schema(description = "Target audience ID", example = "20")
    private Long targetAudienceId;

    @Schema(description = "Audience description")
    private String audienceDescription;

    @Schema(description = "Display order", example = "0")
    private Integer displayOrder;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Course info section")
  public static class InfoSectionItem {

    @Schema(description = "Section key", example = "OBJECTIVES")
    private String sectionKey;

    @Schema(description = "Section title")
    private String title;

    @Schema(description = "Display order", example = "0")
    private Integer displayOrder;

    @Schema(description = "Bullet items")
    private List<String> items;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Tag item")
  public static class TagItem {

    @Schema(description = "Tag ID", example = "3")
    private Long tagId;

    @Schema(description = "Tag name")
    private String tagName;

    @Schema(description = "Proficiency level", example = "3")
    private Integer proficiencyLevel;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Instructor info")
  public static class InstructorInfo {

    @Schema(description = "Instructor user ID", example = "7")
    private Long instructorId;

    @Schema(description = "Channel name")
    private String channelName;

    @Schema(description = "Profile image URL")
    private String profileImage;

    @Schema(description = "Headline")
    private String headline;

    @Schema(description = "Specialties")
    private List<String> specialties;

    @Schema(description = "Instructor channel API path")
    private String channelApiPath;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Section item")
  public static class SectionItem {

    @Schema(description = "Section ID", example = "101")
    private Long sectionId;

    @Schema(description = "Section title")
    private String title;

    @Schema(description = "Section description")
    private String description;

    @Schema(description = "Sort order", example = "1")
    private Integer sortOrder;

    @Schema(description = "Published", example = "true")
    private Boolean isPublished;

    @Schema(description = "Lessons")
    private List<LessonItem> lessons;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Lesson item")
  public static class LessonItem {

    @Schema(description = "Lesson ID", example = "1001")
    private Long lessonId;

    @Schema(description = "Lesson title")
    private String title;

    @Schema(description = "Lesson description")
    private String description;

    @Schema(description = "Lesson type", example = "VIDEO")
    private String lessonType;

    @Schema(description = "Video URL")
    private String videoUrl;

    @Schema(description = "Video asset key")
    private String videoAssetKey;

    @Schema(description = "Thumbnail URL")
    private String thumbnailUrl;

    @Schema(description = "Duration seconds", example = "780")
    private Integer durationSeconds;

    @Schema(description = "Preview lesson", example = "false")
    private Boolean isPreview;

    @Schema(description = "Published", example = "true")
    private Boolean isPublished;

    @Schema(description = "Sort order", example = "1")
    private Integer sortOrder;

    @Schema(description = "Materials")
    private List<MaterialItem> materials;

    @Schema(description = "Assignment summary")
    private AssignmentItem assignment;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Material item")
  public static class MaterialItem {

    @Schema(description = "Material ID", example = "5001")
    private Long materialId;

    @Schema(description = "Material type", example = "SLIDE")
    private String materialType;

    @Schema(description = "Material URL")
    private String materialUrl;

    @Schema(description = "Asset key")
    private String assetKey;

    @Schema(description = "Original file name")
    private String originalFileName;

    @Schema(description = "Sort order", example = "0")
    private Integer sortOrder;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Assignment item")
  public static class AssignmentItem {

    @Schema(description = "Assignment ID", example = "20")
    private Long assignmentId;

    @Schema(description = "Roadmap node ID", example = "301")
    private Long roadmapNodeId;

    @Schema(description = "Assignment title")
    private String title;

    @Schema(description = "Assignment description")
    private String description;

    @Schema(description = "Submission rule description")
    private String submissionRuleDescription;

    @Schema(description = "Total score", example = "100")
    private Integer totalScore;

    @Schema(description = "Pass score", example = "80")
    private Integer passScore;

    @Schema(description = "AI review enabled", example = "false")
    private Boolean aiReviewEnabled;

    @Schema(description = "Allow text submission", example = "true")
    private Boolean allowTextSubmission;

    @Schema(description = "Allow file submission", example = "true")
    private Boolean allowFileSubmission;

    @Schema(description = "Allow URL submission", example = "false")
    private Boolean allowUrlSubmission;

    @Schema(description = "README required", example = "true")
    private Boolean readmeRequired;

    @Schema(description = "Test required", example = "true")
    private Boolean testRequired;

    @Schema(description = "Lint required", example = "true")
    private Boolean lintRequired;

    @Schema(description = "Allow late submission", example = "false")
    private Boolean allowLateSubmission;

    @Schema(description = "Due date time")
    private LocalDateTime dueAt;

    @Schema(description = "Allowed file formats")
    private List<String> allowedFileFormats;

    @Schema(description = "Rubrics")
    private List<AssignmentRubricItem> rubrics;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "Assignment rubric item")
  public static class AssignmentRubricItem {

    @Schema(description = "Rubric ID", example = "501")
    private Long rubricId;

    @Schema(description = "Criteria name")
    private String criteriaName;

    @Schema(description = "Criteria description")
    private String criteriaDescription;

    @Schema(description = "Max points", example = "30")
    private Integer maxPoints;

    @Schema(description = "Display order", example = "1")
    private Integer displayOrder;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "News item")
  public static class NewsItem {

    @Schema(description = "News title")
    private String title;

    @Schema(description = "News URL")
    private String url;
  }
}
