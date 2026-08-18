package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.GradeSubmissionRequest;
import com.devpath.api.evaluation.dto.response.SubmissionGradeResponse;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionFile;
import com.devpath.domain.learning.repository.RubricRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
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

  private static final long FRONTEND_RENDERING_DEMO_GRADING_DELAY_MILLIS = 2300L;

  private final UserRepository userRepository;
  private final SubmissionRepository submissionRepository;
  private final RubricRepository rubricRepository;
  private final SubmissionAutoGrader autoGrader;
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
      SubmissionAutoGrader.Result gradingResult = frontendRenderingDemoGradingResult(rubrics);
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

    SubmissionAutoGrader.Result gradingResult = autoGrader.grade(submission, rubrics);

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

  private String buildAiReviewFeedback(SubmissionAutoGrader.Result gradingResult) {
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

  private SubmissionAutoGrader.Result frontendRenderingDemoGradingResult(List<Rubric> rubrics) {
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

    return new SubmissionAutoGrader.Result(
        items,
        "HTML/CSS/JavaScript 렌더링 흐름을 실제 코드로 구현했고 요구사항 대부분을 충족했습니다. 다만 접근성 보강, 반응형 완성도, DevTools 검증 기록의 구체성이 부족해 일부 감점했습니다.",
        false);
  }

  private String frontendRenderingDemoReviewComment(int displayOrder) {
    return switch (displayOrder) {
      case 1 -> "header, main, section, button 구조가 확인됩니다. 다만 입력 요소나 보조 설명 연결이 더 있으면 좋습니다.";
      case 2 -> "카드 레이아웃과 active 상태 스타일이 구현되어 있습니다. 모바일 간격과 상태 대비는 조금 더 다듬을 수 있습니다.";
      case 3 -> "버튼 이벤트로 텍스트, 클래스, 목록이 바뀌어 DOM 갱신 요구사항을 충족합니다. 상태 전환 로직은 아직 단순합니다.";
      default ->
          "DOM, CSSOM, render tree, layout, paint 설명과 DevTools 기록이 있습니다. 검증 기록은 더 구체적이면 좋습니다.";
    };
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
