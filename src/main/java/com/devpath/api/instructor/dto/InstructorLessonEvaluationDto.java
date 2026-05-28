package com.devpath.api.instructor.dto;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class InstructorLessonEvaluationDto {

  @Getter
  @Builder
  public static class QuizEditorResponse {
    private Long lessonId;
    private Long nodeId;
    private Long quizId;
    private String title;
    private String description;
    private String quizType;
    private Integer totalScore;
    private Integer passScore;
    private Integer timeLimitMinutes;
    private Boolean exposeAnswer;
    private Boolean exposeExplanation;
    private Boolean isPublished;
    private List<QuizQuestionItem> questions;
  }

  @Getter
  @Builder
  public static class QuizQuestionItem {
    private Long questionId;
    private String questionType;
    private String questionText;
    private String explanation;
    private Integer points;
    private Integer displayOrder;
    private String sourceTimestamp;
    private List<QuizOptionItem> options;
  }

  @Getter
  @Builder
  public static class QuizOptionItem {
    private Long optionId;
    private String optionText;
    private Boolean isCorrect;
    private Integer displayOrder;
  }

  @Getter
  public static class SaveQuizEditorRequest {
    private String title;
    private String description;
    private String quizType;
    private Integer passScore;
    private Integer timeLimitMinutes;
    private Boolean exposeAnswer;
    private Boolean exposeExplanation;
    private Boolean isPublished;

    @Valid private List<QuizQuestionInput> questions = new ArrayList<>();
  }

  @Getter
  public static class QuizQuestionInput {
    private Long questionId;
    private String questionType;
    private String questionText;
    private String explanation;
    private Integer points;
    private Integer displayOrder;
    private String sourceTimestamp;

    @Valid private List<QuizOptionInput> options = new ArrayList<>();
  }

  @Getter
  public static class QuizOptionInput {
    private Long optionId;
    private String optionText;
    private Boolean isCorrect;
    private Integer displayOrder;
  }

  @Getter
  public static class GenerateQuizRequest {
    private String mode;
    private String videoFileName;
    private String videoMimeType;
    private String videoBase64Content;
    private String scriptText;
    private Integer questionCount;
    private Integer difficultyLevel;
    private List<String> keywords = new ArrayList<>();
  }

  @Getter
  @Builder
  public static class AssignmentEditorResponse {
    private Long lessonId;
    private Long nodeId;
    private Long assignmentId;
    private String title;
    private String description;
    private Integer totalScore;
    private Integer passScore;
    private Boolean aiReviewEnabled;
    private Boolean allowTextSubmission;
    private Boolean allowFileSubmission;
    private Boolean allowUrlSubmission;
    private List<AssignmentRubricItem> rubrics;
    private List<AssignmentReferenceFileItem> referenceFiles;
  }

  @Getter
  @Builder
  public static class AssignmentRubricItem {
    private Long rubricId;
    private String criteriaName;
    private String criteriaKeywords;
    private Integer maxPoints;
    private Integer displayOrder;
  }

  @Getter
  @Builder
  public static class AssignmentReferenceFileItem {
    private Long fileId;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private Integer displayOrder;
    private LocalDateTime createdAt;
  }

  @Getter
  public static class SaveAssignmentEditorRequest {
    private String title;
    private String description;
    private Integer totalScore;
    private Integer passScore;
    private Boolean aiReviewEnabled;
    private Boolean allowTextSubmission;
    private Boolean allowFileSubmission;
    private Boolean allowUrlSubmission;

    @Valid private List<AssignmentRubricInput> rubrics = new ArrayList<>();
    @Valid private List<AssignmentReferenceFileInput> referenceFiles = new ArrayList<>();
  }

  @Getter
  public static class AssignmentRubricInput {
    private Long rubricId;
    private String criteriaName;
    private String criteriaKeywords;
    private Integer maxPoints;
    private Integer displayOrder;
  }

  @Getter
  public static class AssignmentReferenceFileInput {
    private Long fileId;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private Integer displayOrder;
    private String base64Content;
  }
}
