package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.GradeSubmissionRequest;
import com.devpath.api.evaluation.dto.response.SubmissionGradeResponse;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionFile;
import com.devpath.domain.learning.repository.RubricRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SubmissionGradingService {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final UserRepository userRepository;
  private final SubmissionRepository submissionRepository;
  private final RubricRepository rubricRepository;
  private final GeminiProvider geminiProvider;
  private final NotificationEventService notificationEventService;

  // 제출 직후 자동으로 호출되는 AI 채점 메서드.
  public void autoGradeOnSubmit(Submission submission) {
    List<Rubric> rubrics =
        rubricRepository.findAllByAssignmentIdAndIsDeletedFalseOrderByDisplayOrderAsc(
            submission.getAssignment().getId());

    if (rubrics.isEmpty()) {
      log.warn("[SubmissionGradingService] 루브릭 없음, AI 채점 생략. submissionId={}", submission.getId());
      return;
    }

    String prompt = buildGradingPrompt(submission, rubrics);
    String raw = geminiProvider.generate(prompt);

    List<SubmissionGradeResponse.RubricGradeItem> rubricGradeItems;
    if (raw != null) {
      rubricGradeItems = parseGradingResponse(raw, rubrics);
    } else {
      log.warn(
          "[SubmissionGradingService] Gemini API 응답 없음. Fallback 채점 실행. submissionId={}",
          submission.getId());
      rubricGradeItems = fallbackGradeItems(rubrics);
    }

    int totalScore =
        rubricGradeItems.stream()
            .mapToInt(SubmissionGradeResponse.RubricGradeItem::getEarnedPoints)
            .sum();

    submission.startGrading(null);
    submission.grade(null, totalScore, null, null);

    notificationEventService.notifyAssignmentGraded(
        submission.getLearner().getId(),
        submission.getAssignment().getTitle(),
        totalScore);
  }

  public SubmissionGradeResponse gradeSubmission(
      Long userId, Long submissionId, GradeSubmissionRequest request) {
    User instructor = validateInstructor(userId);
    Submission submission =
        submissionRepository
            .findByIdAndIsDeletedFalse(submissionId)
            .orElseThrow(
                () -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "제출물을 찾을 수 없습니다."));

    List<Rubric> rubrics =
        rubricRepository.findAllByAssignmentIdAndIsDeletedFalseOrderByDisplayOrderAsc(
            submission.getAssignment().getId());
    Map<Long, Rubric> rubricMap =
        rubrics.stream().collect(Collectors.toMap(Rubric::getId, Function.identity()));

    List<SubmissionGradeResponse.RubricGradeItem> rubricGradeItems = new ArrayList<>();
    for (GradeSubmissionRequest.RubricScoreRequest score : request.getRubricScores()) {
      Rubric rubric = rubricMap.get(score.getRubricId());
      if (rubric == null) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "해당 과제에 포함되지 않은 루브릭입니다.");
      }
      if (score.getEarnedPoints() > rubric.getMaxPoints()) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "루브릭 최대 점수를 초과할 수 없습니다.");
      }

      rubricGradeItems.add(
          SubmissionGradeResponse.RubricGradeItem.builder()
              .rubricId(rubric.getId())
              .criteriaName(rubric.getCriteriaName())
              .maxPoints(rubric.getMaxPoints())
              .earnedPoints(score.getEarnedPoints())
              .build());
    }

    int totalScore =
        rubricGradeItems.stream()
            .mapToInt(SubmissionGradeResponse.RubricGradeItem::getEarnedPoints)
            .sum();

    submission.startGrading(instructor);
    submission.grade(instructor, totalScore, null, null);

    notificationEventService.notifyAssignmentGraded(
        submission.getLearner().getId(),
        submission.getAssignment().getTitle(),
        totalScore);

    return SubmissionGradeResponse.builder()
        .submissionId(submission.getId())
        .graderId(instructor.getId())
        .totalScore(submission.getTotalScore())
        .submissionStatus(submission.getSubmissionStatus())
        .gradedAt(submission.getGradedAt())
        .rubricGrades(rubricGradeItems)
        .build();
  }

  private String buildSubmissionContent(Submission submission) {
    StringBuilder sb = new StringBuilder();
    if (submission.getSubmissionText() != null && !submission.getSubmissionText().isBlank()) {
      sb.append(submission.getSubmissionText());
    }
    if (submission.getSubmissionUrl() != null && !submission.getSubmissionUrl().isBlank()) {
      if (!sb.isEmpty()) sb.append("\n");
      sb.append("제출 URL: ").append(submission.getSubmissionUrl());
    }
    if (submission.getFiles() != null && !submission.getFiles().isEmpty()) {
      if (!sb.isEmpty()) sb.append("\n");
      sb.append("첨부 파일:\n");
      for (SubmissionFile file : submission.getFiles()) {
        if (Boolean.TRUE.equals(file.getIsDeleted())) {
          continue;
        }
        String fileType =
            file.getFileType() == null || file.getFileType().isBlank()
                ? "형식 미상"
                : file.getFileType();
        sb.append("- ")
            .append(file.getFileName())
            .append(" (")
            .append(fileType)
            .append(", ")
            .append(formatFileSize(file.getFileSize()));
        if (file.getFileUrl() != null
            && !file.getFileUrl().isBlank()
            && !file.getFileUrl().startsWith("local-upload://")) {
          sb.append(", url=").append(file.getFileUrl());
        }
        sb.append(")\n");
      }
    }
    return sb.isEmpty() ? "(제출 내용 없음)" : sb.toString();
  }

  private String buildGradingPrompt(Submission submission, List<Rubric> rubrics) {
    Assignment assignment = submission.getAssignment();
    String submissionContent = buildSubmissionContent(submission);
    StringBuilder rubricSection = new StringBuilder();
    for (Rubric rubric : rubrics) {
      rubricSection
          .append("- rubricId: ")
          .append(rubric.getId())
          .append(", 기준명: ")
          .append(rubric.getCriteriaName())
          .append(", 최대점수: ")
          .append(rubric.getMaxPoints());
      if (rubric.getCriteriaDescription() != null && !rubric.getCriteriaDescription().isBlank()) {
        rubricSection.append(", 평가키워드: ").append(rubric.getCriteriaDescription());
      }
      rubricSection.append("\n");
    }

    return "당신은 IT 교육 과제 채점 전문가입니다. 아래 제출물을 루브릭 기준에 따라 채점하세요.\n\n"
        + "[과제 정보]\n"
        + "과제명: "
        + assignment.getTitle()
        + "\n"
        + "과제 설명: "
        + assignment.getDescription()
        + "\n"
        + "제출 규칙: "
        + (assignment.getSubmissionRuleDescription() == null
                || assignment.getSubmissionRuleDescription().isBlank()
            ? "(없음)"
            : assignment.getSubmissionRuleDescription())
        + "\n"
        + "허용 형식: "
        + (assignment.getAllowedFileFormats() == null || assignment.getAllowedFileFormats().isBlank()
            ? "(제한 없음)"
            : assignment.getAllowedFileFormats())
        + "\n\n"
        + "[제출물 내용]\n"
        + submissionContent
        + "\n\n"
        + "[루브릭 목록]\n"
        + rubricSection
        + "\n"
        + "[출력 형식]\n"
        + "아래 JSON 배열만 반환하세요. 설명, 코드블록(```), 기타 텍스트 없이 순수 JSON 배열만 출력하세요.\n\n"
        + "[\n"
        + "  { \"rubricId\": 1, \"earnedPoints\": 8 }\n"
        + "]\n\n"
        + "[제약사항]\n"
        + "- earnedPoints는 0 이상 해당 루브릭의 최대점수 이하여야 합니다.\n"
        + "- 모든 루브릭에 대해 점수를 반드시 포함하세요.\n"
        + "- 평가키워드가 제출물에 포함되어 있으면 가산 요소로 반영하세요.\n"
        + "- 첨부 파일 메타데이터만 있고 구현 내용 확인이 불가능하면 루브릭별로 보수적으로 감점하세요.";
  }

  private String formatFileSize(Long fileSize) {
    if (fileSize == null || fileSize <= 0) {
      return "크기 미상";
    }
    if (fileSize < 1024) {
      return fileSize + "B";
    }
    long kilobytes = Math.max(1, (fileSize + 1023) / 1024);
    return kilobytes + "KB";
  }

  private List<SubmissionGradeResponse.RubricGradeItem> parseGradingResponse(
      String raw, List<Rubric> rubrics) {
    try {
      int start = raw.indexOf('[');
      int end = raw.lastIndexOf(']');
      if (start == -1 || end == -1 || start >= end) {
        log.warn("[SubmissionGradingService] Gemini 응답에서 JSON 배열 추출 실패. Fallback 실행.");
        return fallbackGradeItems(rubrics);
      }

      JsonNode rootNode = MAPPER.readTree(raw.substring(start, end + 1));
      if (!rootNode.isArray()) {
        return fallbackGradeItems(rubrics);
      }

      Map<Long, Rubric> rubricMap =
          rubrics.stream().collect(Collectors.toMap(Rubric::getId, Function.identity()));
      List<SubmissionGradeResponse.RubricGradeItem> items = new ArrayList<>();

      for (JsonNode node : rootNode) {
        long rubricId = node.path("rubricId").asLong(-1);
        int earnedPoints = node.path("earnedPoints").asInt(0);
        Rubric rubric = rubricMap.get(rubricId);
        if (rubric == null) continue;

        int clamped = Math.max(0, Math.min(earnedPoints, rubric.getMaxPoints()));
        items.add(
            SubmissionGradeResponse.RubricGradeItem.builder()
                .rubricId(rubric.getId())
                .criteriaName(rubric.getCriteriaName())
                .maxPoints(rubric.getMaxPoints())
                .earnedPoints(clamped)
                .build());
      }

      if (items.size() != rubrics.size()) {
        log.warn("[SubmissionGradingService] Gemini 응답 루브릭 수 불일치. Fallback 실행.");
        return fallbackGradeItems(rubrics);
      }

      return items;

    } catch (Exception e) {
      log.warn("[SubmissionGradingService] Gemini 응답 파싱 실패: {}. Fallback 실행.", e.getMessage());
      return fallbackGradeItems(rubrics);
    }
  }

  // Gemini 실패 시 각 루브릭의 절반 점수를 부여한다.
  private List<SubmissionGradeResponse.RubricGradeItem> fallbackGradeItems(List<Rubric> rubrics) {
    return rubrics.stream()
        .map(
            rubric ->
                SubmissionGradeResponse.RubricGradeItem.builder()
                    .rubricId(rubric.getId())
                    .criteriaName(rubric.getCriteriaName())
                    .maxPoints(rubric.getMaxPoints())
                    .earnedPoints(rubric.getMaxPoints() / 2)
                .build())
        .toList();
  }

  private User validateInstructor(Long userId) {
    User instructor =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    if (instructor.getRole() != UserRole.ROLE_INSTRUCTOR) {
      throw new CustomException(ErrorCode.FORBIDDEN, "강사만 제출물을 채점할 수 있습니다.");
    }

    if (!Boolean.TRUE.equals(instructor.getIsActive())) {
      throw new CustomException(ErrorCode.FORBIDDEN, "비활성 사용자입니다.");
    }

    return instructor;
  }
}
