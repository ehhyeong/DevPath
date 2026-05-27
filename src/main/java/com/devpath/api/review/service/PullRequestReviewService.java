package com.devpath.api.review.service;

import com.devpath.api.instructor.service.InstructorNotificationService;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.review.dto.PullRequestReviewRequest;
import com.devpath.api.review.dto.PullRequestReviewResponse;
import com.devpath.api.review.dto.PullRequestSubmissionRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringMission;
import com.devpath.domain.mentoring.entity.MentoringMissionStatus;
import com.devpath.domain.mentoring.repository.MentoringMissionRepository;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.review.entity.MissionSubmission;
import com.devpath.domain.review.entity.PullRequestReview;
import com.devpath.domain.review.entity.PullRequestReviewStatus;
import com.devpath.domain.review.entity.PullRequestSubmission;
import com.devpath.domain.review.repository.MissionSubmissionRepository;
import com.devpath.domain.review.repository.PullRequestReviewRepository;
import com.devpath.domain.review.repository.PullRequestSubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PullRequestReviewService {

  private final MentoringRepository mentoringRepository;
  private final MentoringMissionRepository mentoringMissionRepository;
  private final MissionSubmissionRepository missionSubmissionRepository;
  private final PullRequestSubmissionRepository pullRequestSubmissionRepository;
  private final PullRequestReviewRepository pullRequestReviewRepository;
  private final NotificationEventService notificationEventService;
  private final InstructorNotificationService instructorNotificationService;
  private final UserRepository userRepository;

  @Transactional
  public PullRequestReviewResponse.PullRequestDetail submitPullRequest(
      Long missionId, Long submitterId, PullRequestSubmissionRequest.Create request) {
    MentoringMission mission = getActiveMission(missionId);

    // 마감된 미션에는 PR을 제출할 수 없다.
    validateMissionOpen(mission);

    User submitter = getUser(submitterId);

    // 해당 멘토링의 멘티만 PR을 제출할 수 있다.
    validateMenteeOwner(mission, submitter.getId());

    // 같은 미션에 같은 멘티가 중복 제출하지 못하게 막는다.
    validateNotDuplicatedSubmission(mission.getId(), submitter.getId());

    MissionSubmission missionSubmission =
        MissionSubmission.builder().mission(mission).submitter(submitter).build();

    MissionSubmission savedMissionSubmission = missionSubmissionRepository.save(missionSubmission);

    PullRequestSubmission pullRequestSubmission =
        PullRequestSubmission.builder()
            .missionSubmission(savedMissionSubmission)
            .prUrl(request.prUrl())
            .title(request.title())
            .description(request.description())
            .build();

    PullRequestSubmission savedPullRequest =
        pullRequestSubmissionRepository.save(pullRequestSubmission);

    Long mentorId = mission.getMentoring().getMentor().getId();
    instructorNotificationService.notifySystem(
        mentorId, submitter.getName() + "님이 PR을 제출했습니다: " + request.title());

    return PullRequestReviewResponse.PullRequestDetail.from(savedPullRequest, List.of());
  }

  public List<PullRequestReviewResponse.PullRequestSummary> getPullRequests(Long mentoringId) {
    // 존재하지 않거나 삭제된 멘토링 기준으로 PR 목록을 조회하지 않도록 막는다.
    getActiveMentoring(mentoringId);

    return pullRequestSubmissionRepository
        .findAllByMissionSubmission_Mission_Mentoring_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            mentoringId)
        .stream()
        .map(PullRequestReviewResponse.PullRequestSummary::from)
        .toList();
  }

  public PullRequestReviewResponse.PullRequestDetail getPullRequest(Long pullRequestId) {
    PullRequestSubmission pullRequestSubmission = getActivePullRequest(pullRequestId);

    List<PullRequestReview> reviews =
        pullRequestReviewRepository
            .findAllByPullRequestSubmission_IdAndIsDeletedFalseOrderByCreatedAtDesc(pullRequestId);

    return PullRequestReviewResponse.PullRequestDetail.from(pullRequestSubmission, reviews);
  }

  @Transactional
  public PullRequestReviewResponse.ReviewDetail createReview(
      Long pullRequestId, Long reviewerId, PullRequestReviewRequest.Create request) {
    PullRequestSubmission pullRequestSubmission = getActivePullRequest(pullRequestId);
    User reviewer = getUser(reviewerId);

    // 해당 멘토링의 멘토만 코드 리뷰를 작성할 수 있다.
    validateMentorOwner(pullRequestSubmission, reviewer.getId());

    PullRequestReview review =
        PullRequestReview.builder()
            .pullRequestSubmission(pullRequestSubmission)
            .reviewer(reviewer)
            .comment(request.comment())
            .build();

    PullRequestReview savedReview = pullRequestReviewRepository.save(review);

    // PR 리뷰 작성 시 제출자에게 알림을 저장하고 SSE로 전송한다.
    notificationEventService.notifyPrReviewCreated(
        pullRequestSubmission.getMissionSubmission().getSubmitter().getId(),
        pullRequestSubmission.getTitle());

    return PullRequestReviewResponse.ReviewDetail.from(savedReview);
  }

  @Transactional
  public PullRequestReviewResponse.ReviewDetail approveReview(Long reviewId, Long reviewerId) {
    PullRequestReview review = getActiveReview(reviewId);

    // 리뷰 작성자 본인만 해당 리뷰를 승인 처리할 수 있다.
    validateReviewerOwner(review, reviewerId);
    validateReviewCommented(review);

    review.approve();

    return PullRequestReviewResponse.ReviewDetail.from(review);
  }

  @Transactional
  public PullRequestReviewResponse.ReviewDetail rejectReview(Long reviewId, Long reviewerId) {
    PullRequestReview review = getActiveReview(reviewId);

    // 리뷰 작성자 본인만 해당 리뷰를 반려 처리할 수 있다.
    validateReviewerOwner(review, reviewerId);
    validateReviewCommented(review);

    review.reject();

    return PullRequestReviewResponse.ReviewDetail.from(review);
  }

  @Transactional
  public PullRequestReviewResponse.MissionSubmissionDetail passSubmission(
      Long submissionId, Long mentorId, PullRequestReviewRequest.MissionDecision request) {
    MissionSubmission submission = getActiveMissionSubmission(submissionId);

    // 해당 멘토링의 멘토만 미션 제출물을 최종 통과 처리할 수 있다.
    validateMentorOwner(submission, mentorId);

    // 이미 Pass/Reject 된 제출물은 다시 판정하지 않는다.
    validateSubmissionSubmitted(submission);

    submission.pass(request == null ? null : request.feedback());

    notificationEventService.notifyMissionPassed(
        submission.getSubmitter().getId(), submission.getMission().getTitle());

    return PullRequestReviewResponse.MissionSubmissionDetail.from(submission);
  }

  @Transactional
  public PullRequestReviewResponse.MissionSubmissionDetail rejectSubmission(
      Long submissionId, Long mentorId, PullRequestReviewRequest.MissionDecision request) {
    MissionSubmission submission = getActiveMissionSubmission(submissionId);

    // 해당 멘토링의 멘토만 미션 제출물을 최종 반려 처리할 수 있다.
    validateMentorOwner(submission, mentorId);

    // 이미 Pass/Reject 된 제출물은 다시 판정하지 않는다.
    validateSubmissionSubmitted(submission);

    submission.reject(request == null ? null : request.feedback());

    notificationEventService.notifyMissionRejected(
        submission.getSubmitter().getId(), submission.getMission().getTitle());

    return PullRequestReviewResponse.MissionSubmissionDetail.from(submission);
  }

  private Mentoring getActiveMentoring(Long mentoringId) {
    return mentoringRepository
        .findByIdAndIsDeletedFalse(mentoringId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_NOT_FOUND));
  }

  private MentoringMission getActiveMission(Long missionId) {
    return mentoringMissionRepository
        .findByIdAndIsDeletedFalse(missionId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_MISSION_NOT_FOUND));
  }

  private MissionSubmission getActiveMissionSubmission(Long submissionId) {
    return missionSubmissionRepository
        .findByIdAndIsDeletedFalse(submissionId)
        .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_MISSION_SUBMISSION_NOT_FOUND));
  }

  private PullRequestSubmission getActivePullRequest(Long pullRequestId) {
    return pullRequestSubmissionRepository
        .findByIdAndIsDeletedFalse(pullRequestId)
        .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_PULL_REQUEST_NOT_FOUND));
  }

  private PullRequestReview getActiveReview(Long reviewId) {
    return pullRequestReviewRepository
        .findByIdAndIsDeletedFalse(reviewId)
        .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateMissionOpen(MentoringMission mission) {
    if (mission.getStatus() != MentoringMissionStatus.OPEN) {
      throw new CustomException(ErrorCode.MENTORING_MISSION_ALREADY_CLOSED);
    }
  }

  private void validateMenteeOwner(MentoringMission mission, Long submitterId) {
    if (!mission.getMentoring().getMentee().getId().equals(submitterId)) {
      throw new CustomException(ErrorCode.REVIEW_PULL_REQUEST_FORBIDDEN);
    }
  }

  private void validateMentorOwner(PullRequestSubmission pullRequestSubmission, Long mentorId) {
    Long ownerMentorId =
        pullRequestSubmission
            .getMissionSubmission()
            .getMission()
            .getMentoring()
            .getMentor()
            .getId();

    if (!ownerMentorId.equals(mentorId)) {
      throw new CustomException(ErrorCode.REVIEW_PULL_REQUEST_FORBIDDEN);
    }
  }

  private void validateMentorOwner(MissionSubmission submission, Long mentorId) {
    Long ownerMentorId = submission.getMission().getMentoring().getMentor().getId();

    if (!ownerMentorId.equals(mentorId)) {
      throw new CustomException(ErrorCode.REVIEW_MISSION_SUBMISSION_FORBIDDEN);
    }
  }

  private void validateReviewerOwner(PullRequestReview review, Long reviewerId) {
    if (!review.getReviewer().getId().equals(reviewerId)) {
      throw new CustomException(ErrorCode.REVIEW_DECISION_FORBIDDEN);
    }
  }

  private void validateReviewCommented(PullRequestReview review) {
    if (review.getStatus() != PullRequestReviewStatus.COMMENTED) {
      throw new CustomException(ErrorCode.REVIEW_ALREADY_DECIDED);
    }
  }

  private void validateNotDuplicatedSubmission(Long missionId, Long submitterId) {
    boolean exists =
        missionSubmissionRepository.existsByMission_IdAndSubmitter_IdAndIsDeletedFalse(
            missionId, submitterId);

    if (exists) {
      throw new CustomException(ErrorCode.REVIEW_MISSION_ALREADY_SUBMITTED);
    }
  }

  private void validateSubmissionSubmitted(MissionSubmission submission) {
    if (!submission.isSubmitted()) {
      throw new CustomException(ErrorCode.REVIEW_MISSION_SUBMISSION_ALREADY_DECIDED);
    }
  }
}
