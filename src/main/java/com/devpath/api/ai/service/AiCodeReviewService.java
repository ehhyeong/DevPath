package com.devpath.api.ai.service;

import com.devpath.api.ai.dto.AiCodeReviewRequest;
import com.devpath.api.ai.dto.AiCodeReviewResponse;
import com.devpath.api.ai.provider.AiCodeReviewProvider;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.ai.entity.AiCodeReview;
import com.devpath.domain.ai.entity.AiReviewComment;
import com.devpath.domain.ai.repository.AiCodeReviewRepository;
import com.devpath.domain.ai.repository.AiReviewCommentRepository;
import com.devpath.domain.review.entity.PullRequestSubmission;
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
public class AiCodeReviewService {

  private final AiCodeReviewRepository aiCodeReviewRepository;
  private final AiReviewCommentRepository aiReviewCommentRepository;
  private final PullRequestSubmissionRepository pullRequestSubmissionRepository;
  private final UserRepository userRepository;
  private final AiCodeReviewProvider aiCodeReviewProvider;
  private final NotificationEventService notificationEventService;

  @Transactional
  public AiCodeReviewResponse.Detail createReview(AiCodeReviewRequest.Create request) {
    User requester = getUser(request.requesterId());
    PullRequestSubmission pullRequestSubmission =
        getPullRequestSubmissionIfPresent(request.pullRequestId());

    // pullRequestId가 있으면 해당 PR 제출자 또는 멘토만 AI 리뷰를 요청할 수 있다.
    validatePullRequestAccessIfNeeded(pullRequestSubmission, requester.getId());

    AiCodeReviewProvider.ReviewResult reviewResult =
        aiCodeReviewProvider.review(request.diffText());

    AiCodeReview aiCodeReview =
        AiCodeReview.builder()
            .requester(requester)
            .pullRequestSubmission(pullRequestSubmission)
            .title(request.title())
            .diffText(request.diffText())
            .summary(reviewResult.summary())
            .commentCount(reviewResult.findings().size())
            .providerName(aiCodeReviewProvider.providerName())
            .build();

    AiCodeReview savedReview = aiCodeReviewRepository.save(aiCodeReview);

    List<AiReviewComment> comments =
        reviewResult.findings().stream()
            .map(
                finding ->
                    AiReviewComment.builder()
                        .aiCodeReview(savedReview)
                        .category(finding.category())
                        .lineNumber(finding.lineNumber())
                        .title(finding.title())
                        .message(finding.message())
                        .suggestion(finding.suggestion())
                        .build())
            .map(aiReviewCommentRepository::save)
            .toList();

    // AI 리뷰 완료 시 요청자에게 알림을 저장하고 SSE 연결 중이면 전송한다.
    notificationEventService.notifySystem(
        requester.getId(), "AI 코드 리뷰가 완료되었습니다: " + savedReview.getTitle());

    return AiCodeReviewResponse.Detail.from(savedReview, comments);
  }

  public AiCodeReviewResponse.Detail getReview(Long reviewId) {
    AiCodeReview review = getActiveReview(reviewId);
    List<AiReviewComment> comments =
        aiReviewCommentRepository.findAllByAiCodeReview_IdAndIsDeletedFalseOrderByCreatedAtAsc(
            reviewId);

    return AiCodeReviewResponse.Detail.from(review, comments);
  }

  public List<AiCodeReviewResponse.Summary> getHistory(Long requesterId) {
    // 존재하지 않는 사용자 기준으로 히스토리를 조회하지 않도록 막는다.
    validateUserExists(requesterId);

    return aiCodeReviewRepository
        .findAllByRequester_IdAndIsDeletedFalseOrderByCreatedAtDesc(requesterId)
        .stream()
        .map(AiCodeReviewResponse.Summary::from)
        .toList();
  }

  @Transactional
  public AiCodeReviewResponse.CommentDetail acceptComment(
      Long commentId, AiCodeReviewRequest.CommentDecision request) {
    AiReviewComment comment = getActiveComment(commentId);

    // AI 리뷰 요청자 본인만 코멘트를 수용할 수 있다.
    validateReviewRequester(comment, request.requesterId());

    comment.accept();

    return AiCodeReviewResponse.CommentDetail.from(comment);
  }

  @Transactional
  public AiCodeReviewResponse.CommentDetail rejectComment(
      Long commentId, AiCodeReviewRequest.CommentDecision request) {
    AiReviewComment comment = getActiveComment(commentId);

    // AI 리뷰 요청자 본인만 코멘트를 반려할 수 있다.
    validateReviewRequester(comment, request.requesterId());

    comment.reject();

    return AiCodeReviewResponse.CommentDetail.from(comment);
  }

  private AiCodeReview getActiveReview(Long reviewId) {
    return aiCodeReviewRepository
        .findByIdAndIsDeletedFalse(reviewId)
        .orElseThrow(() -> new CustomException(ErrorCode.AIREVIEW_NOT_FOUND));
  }

  private AiReviewComment getActiveComment(Long commentId) {
    return aiReviewCommentRepository
        .findByIdAndIsDeletedFalse(commentId)
        .orElseThrow(() -> new CustomException(ErrorCode.AIREVIEW_COMMENT_NOT_FOUND));
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private PullRequestSubmission getPullRequestSubmissionIfPresent(Long pullRequestId) {
    if (pullRequestId == null) {
      return null;
    }

    return pullRequestSubmissionRepository
        .findByIdAndIsDeletedFalse(pullRequestId)
        .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_PULL_REQUEST_NOT_FOUND));
  }

  private void validatePullRequestAccessIfNeeded(
      PullRequestSubmission pullRequestSubmission, Long requesterId) {
    if (pullRequestSubmission == null) {
      return;
    }

    Long submitterId = pullRequestSubmission.getMissionSubmission().getSubmitter().getId();
    Long mentorId =
        pullRequestSubmission
            .getMissionSubmission()
            .getMission()
            .getMentoring()
            .getMentor()
            .getId();

    if (!submitterId.equals(requesterId) && !mentorId.equals(requesterId)) {
      throw new CustomException(ErrorCode.AIREVIEW_FORBIDDEN);
    }
  }

  private void validateReviewRequester(AiReviewComment comment, Long requesterId) {
    if (!comment.getAiCodeReview().getRequester().getId().equals(requesterId)) {
      throw new CustomException(ErrorCode.AIREVIEW_COMMENT_FORBIDDEN);
    }
  }

  private void validateUserExists(Long userId) {
    if (!userRepository.existsById(userId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }
}
