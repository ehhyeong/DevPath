package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.CreateFeedbackRequest;
import com.devpath.api.evaluation.dto.response.FeedbackResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class FeedbackService {

  private final UserRepository userRepository;
  private final SubmissionRepository submissionRepository;

  // 채점 완료된 제출물에 대해 개별 또는 공통 피드백을 저장한다.
  public FeedbackResponse createFeedback(
      Long userId, Long submissionId, CreateFeedbackRequest request) {
    User instructor = validateInstructor(userId);
    Submission submission = getSubmission(submissionId);

    // 현재 단계에서는 채점이 완료된 제출만 피드백 저장을 허용한다.
    if (submission.getTotalScore() == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "채점 완료 후에만 피드백을 작성할 수 있습니다.");
    }

    String feedbackType = normalizeFeedbackType(request.getFeedbackType());
    String individualFeedback = submission.getIndividualFeedback();
    String commonFeedback = submission.getCommonFeedback();

    if ("INDIVIDUAL".equals(feedbackType)) {
      individualFeedback = request.getContent();
    } else if ("COMMON".equals(feedbackType)) {
      commonFeedback = request.getContent();
    } else {
      throw new CustomException(
          ErrorCode.INVALID_INPUT, "feedbackType은 INDIVIDUAL 또는 COMMON만 허용됩니다.");
    }

    // 기존 점수를 유지한 상태로 피드백 필드를 갱신하기 위해 grade 메서드를 재사용한다.
    submission.grade(
        submission.getGrader() == null ? instructor : submission.getGrader(),
        submission.getTotalScore(),
        individualFeedback,
        commonFeedback);

    String savedContent =
        "INDIVIDUAL".equals(feedbackType)
            ? submission.getIndividualFeedback()
            : submission.getCommonFeedback();

    return FeedbackResponse.builder()
        .submissionId(submission.getId())
        .feedbackType(feedbackType)
        .content(savedContent)
        .submissionStatus(submission.getSubmissionStatus())
        .totalScore(submission.getTotalScore())
        .updatedAt(submission.getGradedAt())
        .build();
  }

  // 강사 역할인지 검증한다.
  private User validateInstructor(Long userId) {
    User instructor =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    if (instructor.getRole() != UserRole.ROLE_INSTRUCTOR) {
      throw new CustomException(ErrorCode.FORBIDDEN, "강사만 피드백을 작성할 수 있습니다.");
    }

    if (!Boolean.TRUE.equals(instructor.getIsActive())) {
      throw new CustomException(ErrorCode.FORBIDDEN, "비활성 사용자입니다.");
    }

    return instructor;
  }

  // 제출 엔티티를 조회한다.
  private Submission getSubmission(Long submissionId) {
    return submissionRepository
        .findByIdAndIsDeletedFalse(submissionId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "제출물을 찾을 수 없습니다."));
  }

  // feedbackType 문자열을 공백 제거 후 대문자로 정규화한다.
  private String normalizeFeedbackType(String feedbackType) {
    return feedbackType == null ? "" : feedbackType.trim().toUpperCase(Locale.ROOT);
  }
}
