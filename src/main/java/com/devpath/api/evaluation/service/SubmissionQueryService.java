package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.response.AssignmentPrecheckResponse;
import com.devpath.api.evaluation.dto.response.SubmissionDetailResponse;
import com.devpath.api.evaluation.dto.response.SubmissionResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.repository.RubricRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubmissionQueryService {

  private final UserRepository userRepository;
  private final SubmissionRepository submissionRepository;
  private final RubricRepository rubricRepository;

  // 특정 과제의 제출 목록을 조회하며 상태 필터가 있으면 함께 적용한다.
  public List<SubmissionResponse> getSubmissionList(
      Long userId, Long assignmentId, SubmissionStatus status) {
    validateInstructor(userId);

    List<Submission> submissions =
        status == null
            ? submissionRepository.findAllByAssignmentIdAndIsDeletedFalseOrderBySubmittedAtDesc(
                assignmentId)
            : submissionRepository
                .findAllByAssignmentIdAndSubmissionStatusAndIsDeletedFalseOrderBySubmittedAtDesc(
                    assignmentId, status);

    return submissions.stream().map(SubmissionResponse::from).toList();
  }

  // 제출물 상세 정보와 연결된 루브릭 목록을 함께 조회한다.
  public SubmissionDetailResponse getSubmissionDetail(Long userId, Long submissionId) {
    validateInstructor(userId);

    Submission submission = getSubmission(submissionId);
    List<Rubric> rubrics =
        rubricRepository.findAllByAssignmentIdAndIsDeletedFalseOrderByDisplayOrderAsc(
            submission.getAssignment().getId());

    return SubmissionDetailResponse.of(submission, rubrics);
  }

  // 저장되어 있는 자동검증 결과를 AssignmentPrecheckResponse 형태로 반환한다.
  public AssignmentPrecheckResponse getPrecheckResult(Long userId, Long submissionId) {
    validateInstructor(userId);

    Submission submission = getSubmission(submissionId);

    boolean readmePassed = Boolean.TRUE.equals(submission.getReadmePassed());
    boolean testPassed = Boolean.TRUE.equals(submission.getTestPassed());
    boolean lintPassed = Boolean.TRUE.equals(submission.getLintPassed());
    boolean fileFormatPassed = Boolean.TRUE.equals(submission.getFileFormatPassed());
    boolean passed = readmePassed && testPassed && lintPassed && fileFormatPassed;

    return AssignmentPrecheckResponse.builder()
        .passed(passed)
        .readmePassed(readmePassed)
        .testPassed(testPassed)
        .lintPassed(lintPassed)
        .fileFormatPassed(fileFormatPassed)
        .qualityScore(submission.getQualityScore())
        .message(passed ? "자동 검증을 통과한 제출입니다." : "자동 검증에서 실패한 항목이 있는 제출입니다.")
        .build();
  }

  // 강사 역할인지 검증한다.
  private User validateInstructor(Long userId) {
    User instructor =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    if (instructor.getRole() != UserRole.ROLE_INSTRUCTOR) {
      throw new CustomException(ErrorCode.FORBIDDEN, "강사만 제출물을 조회할 수 있습니다.");
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
}
