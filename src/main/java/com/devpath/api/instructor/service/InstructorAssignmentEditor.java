package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.AssignmentReferenceFile;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.SubmissionType;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class InstructorAssignmentEditor {

  private static final String DEFAULT_FILE_FORMATS = "pdf,zip,png,jpg,jpeg";

  private final AssignmentRepository assignmentRepository;

  InstructorAssignmentEditor(AssignmentRepository assignmentRepository) {
    this.assignmentRepository = assignmentRepository;
  }

  InstructorLessonEvaluationDto.AssignmentEditorResponse get(Lesson lesson, RoadmapNode node) {
    Assignment assignment =
        node == null
            ? null
            : assignmentRepository
                .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
                .orElse(null);

    return mapAssignmentEditor(lesson, node, assignment);
  }

  InstructorLessonEvaluationDto.AssignmentEditorResponse save(
      Lesson lesson,
      RoadmapNode node,
      InstructorLessonEvaluationDto.SaveAssignmentEditorRequest request) {
    Assignment assignment =
        assignmentRepository
            .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
            .orElse(null);

    boolean allowTextSubmission = resolveFlag(request.getAllowTextSubmission(), true);
    boolean allowFileSubmission = resolveFlag(request.getAllowFileSubmission(), true);
    boolean allowUrlSubmission = resolveFlag(request.getAllowUrlSubmission(), false);
    boolean aiReviewEnabled = resolveFlag(request.getAiReviewEnabled(), true);

    List<InstructorLessonEvaluationDto.AssignmentRubricInput> rubricInputs =
        request.getRubrics() == null
            ? List.of()
            : request.getRubrics().stream().filter(this::hasRubricContent).toList();

    int totalScore =
        rubricInputs.stream().mapToInt(item -> defaultNumber(item.getMaxPoints(), 0)).sum();
    int passScore =
        Math.min(defaultNumber(request.getPassScore(), Math.min(totalScore, 80)), totalScore);

    if (assignment == null) {
      assignment =
          Assignment.builder()
              .roadmapNode(node)
              .title(defaultIfBlank(request.getTitle(), lesson.getTitle()))
              .description(defaultIfBlank(request.getDescription(), ""))
              .submissionType(
                  resolveSubmissionType(
                      allowTextSubmission, allowFileSubmission, allowUrlSubmission))
              .dueAt(null)
              .allowedFileFormats(allowFileSubmission ? DEFAULT_FILE_FORMATS : null)
              .readmeRequired(false)
              .testRequired(false)
              .lintRequired(false)
              .submissionRuleDescription(null)
              .totalScore(totalScore)
              .passScore(passScore)
              .isPublished(true)
              .isActive(true)
              .allowLateSubmission(false)
              .aiReviewEnabled(aiReviewEnabled)
              .allowTextSubmission(allowTextSubmission)
              .allowFileSubmission(allowFileSubmission)
              .allowUrlSubmission(allowUrlSubmission)
              .build();
    }

    node.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        normalizeText(request.getDescription()),
        "COURSE_ASSIGNMENT");

    assignment.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        defaultIfBlank(request.getDescription(), ""),
        resolveSubmissionType(allowTextSubmission, allowFileSubmission, allowUrlSubmission),
        assignment.getDueAt(),
        totalScore);
    assignment.updateSubmissionRule(
        allowFileSubmission ? DEFAULT_FILE_FORMATS : null,
        false,
        false,
        false,
        assignment.getSubmissionRuleDescription(),
        false);
    assignment.updateEditorSettings(
        passScore, aiReviewEnabled, allowTextSubmission, allowFileSubmission, allowUrlSubmission);

    Map<Long, AssignmentReferenceFile> existingFiles =
        assignment.getReferenceFiles().stream()
            .filter(file -> file.getId() != null)
            .collect(
                Collectors.toMap(
                    AssignmentReferenceFile::getId,
                    file -> file,
                    (left, right) -> left,
                    LinkedHashMap::new));

    assignment.getRubrics().clear();
    for (int rubricIndex = 0; rubricIndex < rubricInputs.size(); rubricIndex += 1) {
      InstructorLessonEvaluationDto.AssignmentRubricInput rubricInput =
          rubricInputs.get(rubricIndex);
      assignment.addRubric(
          Rubric.builder()
              .criteriaName(defaultIfBlank(rubricInput.getCriteriaName(), "평가 항목"))
              .criteriaDescription(normalizeText(rubricInput.getCriteriaKeywords()))
              .maxPoints(defaultNumber(rubricInput.getMaxPoints(), 0))
              .displayOrder(defaultNumber(rubricInput.getDisplayOrder(), rubricIndex + 1))
              .build());
    }

    assignment.getReferenceFiles().clear();
    List<InstructorLessonEvaluationDto.AssignmentReferenceFileInput> fileInputs =
        request.getReferenceFiles() == null ? List.of() : request.getReferenceFiles();

    for (int fileIndex = 0; fileIndex < fileInputs.size(); fileIndex += 1) {
      InstructorLessonEvaluationDto.AssignmentReferenceFileInput fileInput =
          fileInputs.get(fileIndex);
      if (!hasReferenceFileContent(fileInput)) {
        continue;
      }

      assignment.addReferenceFile(
          AssignmentReferenceFile.builder()
              .fileName(defaultIfBlank(fileInput.getFileName(), "reference-file"))
              .contentType(normalizeText(fileInput.getContentType()))
              .fileSize(fileInput.getFileSize() == null ? 0L : fileInput.getFileSize())
              .displayOrder(defaultNumber(fileInput.getDisplayOrder(), fileIndex + 1))
              .fileData(resolveReferenceFileBytes(fileInput, existingFiles))
              .build());
    }

    Assignment savedAssignment = assignmentRepository.save(assignment);
    return mapAssignmentEditor(lesson, node, savedAssignment);
  }

  private InstructorLessonEvaluationDto.AssignmentEditorResponse mapAssignmentEditor(
      Lesson lesson, RoadmapNode node, Assignment assignment) {
    if (assignment == null) {
      return InstructorLessonEvaluationDto.AssignmentEditorResponse.builder()
          .lessonId(lesson.getLessonId())
          .nodeId(node == null ? null : node.getNodeId())
          .assignmentId(null)
          .title(defaultIfBlank(lesson.getTitle(), "새 과제"))
          .description(defaultIfBlank(lesson.getDescription(), ""))
          .totalScore(100)
          .passScore(80)
          .aiReviewEnabled(true)
          .allowTextSubmission(true)
          .allowFileSubmission(true)
          .allowUrlSubmission(false)
          .rubrics(List.of())
          .referenceFiles(List.of())
          .build();
    }

    SubmissionFlags submissionFlags = resolveSubmissionFlags(assignment);
    List<Rubric> activeRubrics =
        assignment.getRubrics().stream()
            .filter(rubric -> !Boolean.TRUE.equals(rubric.getIsDeleted()))
            .sorted(Comparator.comparing(Rubric::getDisplayOrder))
            .toList();

    return InstructorLessonEvaluationDto.AssignmentEditorResponse.builder()
        .lessonId(lesson.getLessonId())
        .nodeId(assignment.getRoadmapNode().getNodeId())
        .assignmentId(assignment.getId())
        .title(assignment.getTitle())
        .description(assignment.getDescription())
        .totalScore(defaultNumber(assignment.getTotalScore(), 100))
        .passScore(
            assignment.getPassScore() == null
                ? Math.min(defaultNumber(assignment.getTotalScore(), 100), 80)
                : assignment.getPassScore())
        .aiReviewEnabled(
            assignment.getAiReviewEnabled() == null
                || Boolean.TRUE.equals(assignment.getAiReviewEnabled()))
        .allowTextSubmission(submissionFlags.allowTextSubmission())
        .allowFileSubmission(submissionFlags.allowFileSubmission())
        .allowUrlSubmission(submissionFlags.allowUrlSubmission())
        .rubrics(
            activeRubrics.stream()
                .map(
                    rubric ->
                        InstructorLessonEvaluationDto.AssignmentRubricItem.builder()
                            .rubricId(rubric.getId())
                            .criteriaName(rubric.getCriteriaName())
                            .criteriaKeywords(rubric.getCriteriaDescription())
                            .maxPoints(rubric.getMaxPoints())
                            .displayOrder(rubric.getDisplayOrder())
                            .build())
                .toList())
        .referenceFiles(
            assignment.getReferenceFiles().stream()
                .sorted(Comparator.comparing(AssignmentReferenceFile::getDisplayOrder))
                .map(
                    file ->
                        InstructorLessonEvaluationDto.AssignmentReferenceFileItem.builder()
                            .fileId(file.getId())
                            .fileName(file.getFileName())
                            .contentType(file.getContentType())
                            .fileSize(file.getFileSize())
                            .displayOrder(file.getDisplayOrder())
                            .createdAt(null)
                            .build())
                .toList())
        .build();
  }

  private boolean hasRubricContent(InstructorLessonEvaluationDto.AssignmentRubricInput input) {
    if (input == null) {
      return false;
    }

    return !isBlank(input.getCriteriaName())
        || !isBlank(input.getCriteriaKeywords())
        || defaultNumber(input.getMaxPoints(), 0) > 0;
  }

  private boolean hasReferenceFileContent(
      InstructorLessonEvaluationDto.AssignmentReferenceFileInput input) {
    if (input == null) {
      return false;
    }

    return input.getFileId() != null
        || !isBlank(input.getFileName())
        || !isBlank(input.getBase64Content());
  }

  private byte[] resolveReferenceFileBytes(
      InstructorLessonEvaluationDto.AssignmentReferenceFileInput input,
      Map<Long, AssignmentReferenceFile> existingFiles) {
    if (!isBlank(input.getBase64Content())) {
      return Base64.getDecoder().decode(input.getBase64Content());
    }

    if (input.getFileId() != null) {
      AssignmentReferenceFile existing = existingFiles.get(input.getFileId());
      if (existing != null) {
        return existing.getFileData();
      }
    }

    return new byte[0];
  }

  private SubmissionType resolveSubmissionType(
      boolean allowTextSubmission, boolean allowFileSubmission, boolean allowUrlSubmission) {
    int enabledCount = 0;
    enabledCount += allowTextSubmission ? 1 : 0;
    enabledCount += allowFileSubmission ? 1 : 0;
    enabledCount += allowUrlSubmission ? 1 : 0;

    if (enabledCount > 1) {
      return SubmissionType.MULTIPLE;
    }
    if (allowFileSubmission) {
      return SubmissionType.FILE;
    }
    if (allowUrlSubmission) {
      return SubmissionType.URL;
    }
    return SubmissionType.TEXT;
  }

  private SubmissionFlags resolveSubmissionFlags(Assignment assignment) {
    if (assignment.getAllowTextSubmission() != null
        || assignment.getAllowFileSubmission() != null
        || assignment.getAllowUrlSubmission() != null) {
      return new SubmissionFlags(
          Boolean.TRUE.equals(assignment.getAllowTextSubmission()),
          Boolean.TRUE.equals(assignment.getAllowFileSubmission()),
          Boolean.TRUE.equals(assignment.getAllowUrlSubmission()));
    }

    SubmissionType submissionType = assignment.getSubmissionType();
    if (submissionType == null) {
      return new SubmissionFlags(true, true, false);
    }

    return switch (submissionType) {
      case FILE -> new SubmissionFlags(false, true, false);
      case URL -> new SubmissionFlags(false, false, true);
      case TEXT -> new SubmissionFlags(true, false, false);
      case MULTIPLE -> new SubmissionFlags(true, true, true);
    };
  }

  private boolean resolveFlag(Boolean value, boolean fallback) {
    return value == null ? fallback : value;
  }

  private String defaultIfBlank(String value, String fallback) {
    return isBlank(value) ? fallback : value.trim();
  }

  private String normalizeText(String value) {
    return isBlank(value) ? null : value.trim();
  }

  private Integer defaultNumber(Integer value, int fallback) {
    return value == null ? fallback : Math.max(value, 0);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private record SubmissionFlags(
      boolean allowTextSubmission, boolean allowFileSubmission, boolean allowUrlSubmission) {}
}
