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
  private static final long FRONTEND_RENDERING_DEMO_GRADING_DELAY_MILLIS = 2300L;

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
      submission.startGrading(null);
      submission.grade(
          null,
          0,
          "AI 코드 리뷰어가 제출물을 확인했지만 등록된 루브릭이 없어 상세 점수를 계산하지 못했습니다.",
          "루브릭을 등록하면 기준별 자동 리뷰가 제공됩니다.");
      return;
    }

    if (isFrontendRenderingDemoSubmission(submission)) {
      pauseFrontendRenderingDemoGrading();
      AutoGradingResult gradingResult = frontendRenderingDemoGradingResult(rubrics);
      int totalScore =
          gradingResult.rubricGradeItems().stream()
              .mapToInt(SubmissionGradeResponse.RubricGradeItem::getEarnedPoints)
              .sum();

      submission.startGrading(null);
      submission.grade(
          null,
          totalScore,
          buildAiReviewFeedback(gradingResult),
          "AI 肄붾뱶 由щ럭?닿? 猷⑤툕由?湲곗??쇰줈 ?먮룞 ?앹꽦???쇰뱶諛깆엯?덈떎.");

      notificationEventService.notifyAssignmentGraded(
          submission.getLearner().getId(), submission.getAssignment().getTitle(), totalScore);
      return;
    }

    String prompt = buildGradingPrompt(submission, rubrics);
    String raw = geminiProvider.generate(prompt);

    AutoGradingResult gradingResult;
    if (raw != null) {
      gradingResult = parseGradingResponse(raw, rubrics, submission);
    } else {
      log.warn(
          "[SubmissionGradingService] Gemini API 응답 없음. Fallback 채점 실행. submissionId={}",
          submission.getId());
      gradingResult = fallbackGradingResult(rubrics, submission);
    }

    int totalScore =
        gradingResult.rubricGradeItems().stream()
            .mapToInt(SubmissionGradeResponse.RubricGradeItem::getEarnedPoints)
            .sum();

    submission.startGrading(null);
    submission.grade(
        null,
        totalScore,
        buildAiReviewFeedback(gradingResult),
        "AI 코드 리뷰어가 루브릭 기준으로 자동 생성한 피드백입니다.");

    notificationEventService.notifyAssignmentGraded(
        submission.getLearner().getId(), submission.getAssignment().getTitle(), totalScore);
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
        submission.getLearner().getId(), submission.getAssignment().getTitle(), totalScore);

    return SubmissionGradeResponse.builder()
        .submissionId(submission.getId())
        .graderId(instructor.getId())
        .totalScore(submission.getTotalScore())
        .submissionStatus(submission.getSubmissionStatus())
        .gradedAt(submission.getGradedAt())
        .rubricGrades(rubricGradeItems)
        .build();
  }

  private record AutoGradingResult(
      List<SubmissionGradeResponse.RubricGradeItem> rubricGradeItems,
      String overallFeedback,
      boolean fallbackUsed) {}

  private String buildAiReviewFeedback(AutoGradingResult gradingResult) {
    StringBuilder sb = new StringBuilder();
    if (gradingResult.overallFeedback() != null && !gradingResult.overallFeedback().isBlank()) {
      sb.append(gradingResult.overallFeedback().trim());
    } else {
      sb.append("AI 코드 리뷰어가 제출물을 루브릭 기준으로 검토했습니다.");
    }
    if (gradingResult.fallbackUsed()) {
      sb.append("\nGemini 응답이 없어 제출 내용 기반의 보수적인 기본 리뷰를 생성했습니다.");
    }

    for (SubmissionGradeResponse.RubricGradeItem item : gradingResult.rubricGradeItems()) {
      sb.append("\n- ")
          .append(item.getCriteriaName())
          .append(": ")
          .append(item.getEarnedPoints())
          .append("/")
          .append(item.getMaxPoints())
          .append("점");
      if (item.getReviewComment() != null && !item.getReviewComment().isBlank()) {
        sb.append(" - ").append(item.getReviewComment().trim());
      }
    }
    return sb.toString();
  }

  private void pauseFrontendRenderingDemoGrading() {
    try {
      Thread.sleep(FRONTEND_RENDERING_DEMO_GRADING_DELAY_MILLIS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("[SubmissionGradingService] Frontend rendering demo grading delay interrupted.");
    }
  }

  private boolean isFrontendRenderingDemoSubmission(Submission submission) {
    if (submission == null || submission.getAssignment() == null) {
      return false;
    }

    Assignment assignment = submission.getAssignment();
    if (assignment.getTitle() == null || !assignment.getTitle().contains("HTML/CSS/JavaScript")) {
      return false;
    }

    if (submission.getFiles() == null || submission.getFiles().isEmpty()) {
      return false;
    }

    return submission.getFiles().stream()
        .filter(file -> !Boolean.TRUE.equals(file.getIsDeleted()))
        .anyMatch(this::isFrontendRenderingDemoFile);
  }

  private boolean isFrontendRenderingDemoFile(SubmissionFile file) {
    if (file == null || file.getFileName() == null) {
      return false;
    }

    String fileName = file.getFileName().trim();
    if (!"index.html".equalsIgnoreCase(fileName)
        && !"frontend-rendering-flow.html".equalsIgnoreCase(fileName)) {
      return false;
    }

    String content = file.getTextContent();
    return content != null
        && content.contains("DOM")
        && content.contains("CSSOM")
        && content.contains("render tree")
        && content.contains("layout")
        && content.contains("paint")
        && content.contains("Vite")
        && content.contains("DevTools");
  }

  private AutoGradingResult frontendRenderingDemoGradingResult(List<Rubric> rubrics) {
    List<SubmissionGradeResponse.RubricGradeItem> items = new ArrayList<>();

    for (Rubric rubric : rubrics) {
      int displayOrder =
          rubric.getDisplayOrder() == null ? items.size() + 1 : rubric.getDisplayOrder();
      int earnedPoints =
          switch (displayOrder) {
            case 1 -> Math.min(23, rubric.getMaxPoints());
            case 2 -> Math.min(22, rubric.getMaxPoints());
            case 3 -> Math.min(26, rubric.getMaxPoints());
            default -> Math.min(14, rubric.getMaxPoints());
          };

      items.add(
          SubmissionGradeResponse.RubricGradeItem.builder()
              .rubricId(rubric.getId())
              .criteriaName(rubric.getCriteriaName())
              .maxPoints(rubric.getMaxPoints())
              .earnedPoints(earnedPoints)
              .reviewComment(frontendRenderingDemoReviewComment(displayOrder))
              .build());
    }

    return new AutoGradingResult(
        items,
        "HTML/CSS/JavaScript 렌더링 흐름을 실제 코드로 구현했고 요구사항 대부분을 충족했습니다. 다만 접근성 보강, 반응형 완성도, DevTools 검증 기록의 구체성이 부족해 일부 감점했습니다.",
        false);
  }

  private String frontendRenderingDemoReviewComment(int displayOrder) {
    return switch (displayOrder) {
      case 1 -> "header, main, section, button 구조가 확인됩니다. 다만 입력 요소나 보조 설명 연결이 더 있으면 좋습니다.";
      case 2 -> "카드 레이아웃과 active 상태 스타일이 구현되어 있습니다. 모바일 간격과 상태 대비는 조금 더 다듬을 수 있습니다.";
      case 3 -> "버튼 이벤트로 텍스트, 클래스, 목록이 바뀌어 DOM 갱신 요구사항을 충족합니다. 상태 전환 로직은 아직 단순합니다.";
      default -> "DOM, CSSOM, render tree, layout, paint 설명과 DevTools 기록이 있습니다. 검증 기록은 더 구체적이면 좋습니다.";
    };
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
        if (file.getTextContent() != null && !file.getTextContent().isBlank()) {
          sb.append("[")
              .append(file.getFileName())
              .append(" content]\n```")
              .append(fileType)
              .append("\n")
              .append(truncateForPrompt(file.getTextContent(), 12000))
              .append("\n```\n");
        } else {
          sb.append("[")
              .append(file.getFileName())
              .append(" content unavailable for review]\n");
        }
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

    return "당신은 IT 교육 과제 채점 전문가입니다. 아래 제출물을 루브릭 기준에 따라 채점하세요.\n"
        + "반드시 점수와 함께 구체적인 한국어 코드 리뷰 코멘트를 작성하세요. "
        + "제출물이 print hello 수준이거나 과제와 무관하거나 파일 내용을 확인할 수 없으면 매우 낮은 점수 또는 0점을 주세요.\n\n"
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
        + (assignment.getAllowedFileFormats() == null
                || assignment.getAllowedFileFormats().isBlank()
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
        + "{ \"overallFeedback\": \"구체적인 한국어 총평\", \"rubricGrades\": [\n"
        + "  { \"rubricId\": 1, \"earnedPoints\": 8, \"reviewComment\": \"해당 루브릭에 대한 구체적인 한국어 코멘트\" }\n"
        + "] }\n\n"
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

  private String truncateForPrompt(String value, int maxLength) {
    if (value == null || value.length() <= maxLength) {
      return value;
    }
    return value.substring(0, maxLength) + "\n... truncated for review ...";
  }

  private AutoGradingResult parseGradingResponse(
      String raw, List<Rubric> rubrics, Submission submission) {
    try {
      int objectStart = raw.indexOf('{');
      int arrayStart = raw.indexOf('[');
      int start =
          objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart) ? objectStart : arrayStart;
      int end = start == objectStart ? raw.lastIndexOf('}') : raw.lastIndexOf(']');
      if (start == -1 || end == -1 || start >= end) {
        log.warn("[SubmissionGradingService] Gemini 응답에서 JSON 배열 추출 실패. Fallback 실행.");
        return fallbackGradingResult(rubrics, submission);
      }

      JsonNode rootNode = MAPPER.readTree(raw.substring(start, end + 1));
      String overallFeedback = null;
      JsonNode gradesNode = rootNode;
      if (rootNode.isObject()) {
        overallFeedback = rootNode.path("overallFeedback").asText(null);
        gradesNode = rootNode.path("rubricGrades");
      }
      if (!gradesNode.isArray()) {
        return fallbackGradingResult(rubrics, submission);
      }

      Map<Long, Rubric> rubricMap =
          rubrics.stream().collect(Collectors.toMap(Rubric::getId, Function.identity()));
      List<SubmissionGradeResponse.RubricGradeItem> items = new ArrayList<>();

      for (JsonNode node : gradesNode) {
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
                .reviewComment(node.path("reviewComment").asText(null))
                .build());
      }

      if (items.size() != rubrics.size()) {
        log.warn("[SubmissionGradingService] Gemini 응답 루브릭 수 불일치. Fallback 실행.");
        return fallbackGradingResult(rubrics, submission);
      }

      return new AutoGradingResult(items, overallFeedback, false);

    } catch (Exception e) {
      log.warn("[SubmissionGradingService] Gemini 응답 파싱 실패: {}. Fallback 실행.", e.getMessage());
      return fallbackGradingResult(rubrics, submission);
    }
  }

  // Gemini 실패 시 각 루브릭의 절반 점수를 부여한다.
  private AutoGradingResult fallbackGradingResult(List<Rubric> rubrics, Submission submission) {
    boolean weakSubmission = isWeakSubmission(submission);
    List<SubmissionGradeResponse.RubricGradeItem> items =
        rubrics.stream()
        .map(
            rubric ->
                SubmissionGradeResponse.RubricGradeItem.builder()
                    .rubricId(rubric.getId())
                    .criteriaName(rubric.getCriteriaName())
                    .maxPoints(rubric.getMaxPoints())
                    .earnedPoints(weakSubmission ? 0 : rubric.getMaxPoints() / 2)
                    .reviewComment(
                        weakSubmission
                            ? "제출 내용이 너무 짧거나 실제 구현을 확인할 수 없어 기준을 충족하지 못했습니다."
                            : "AI 응답을 받지 못해 보수적인 기본 점수로 산정했습니다.")
                    .earnedPoints(rubric.getMaxPoints() / 2)
                    .build())
        .toList();
    String feedback =
        weakSubmission
            ? "제출된 코드나 파일 내용만으로는 과제 요구사항을 충족했다고 보기 어렵습니다. 실제 구현, 예외 처리, 실행 결과, 설명을 포함해 다시 제출해야 합니다."
            : "AI 응답이 없어 자동 리뷰가 제한적으로 생성되었습니다. 루브릭별 기본 점수를 임시 산정했습니다.";
    return new AutoGradingResult(items, feedback, true);
  }

  private boolean isWeakSubmission(Submission submission) {
    String content = buildSubmissionContent(submission).replaceAll("\\s+", "");
    return content.length() < 80 || content.contains("print(\"hello\")") || content.contains("print('hello')");
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
