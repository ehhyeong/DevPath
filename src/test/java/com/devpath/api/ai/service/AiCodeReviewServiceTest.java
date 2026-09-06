package com.devpath.api.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.api.ai.provider.AiCodeReviewProvider;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.domain.ai.entity.AiCodeReview;
import com.devpath.domain.ai.entity.AiReviewComment;
import com.devpath.domain.ai.entity.AiReviewCommentStatus;
import com.devpath.domain.ai.repository.AiCodeReviewRepository;
import com.devpath.domain.ai.repository.AiReviewCommentRepository;
import com.devpath.domain.ai.service.CodeReviewAssistant;
import com.devpath.domain.review.repository.PullRequestSubmissionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiCodeReviewServiceTest {

  @Mock private AiCodeReviewRepository aiCodeReviewRepository;
  @Mock private AiReviewCommentRepository aiReviewCommentRepository;
  @Mock private PullRequestSubmissionRepository pullRequestSubmissionRepository;
  @Mock private UserRepository userRepository;
  @Mock private AiCodeReviewProvider aiCodeReviewProvider;
  @Mock private NotificationEventService notificationEventService;
  @Mock private AiCodeReview review;
  @Mock private AiReviewComment comment;
  @Mock private User requester;

  private AiCodeReviewService service;

  @BeforeEach
  void setUp() {
    service =
        new AiCodeReviewService(
            aiCodeReviewRepository,
            aiReviewCommentRepository,
            pullRequestSubmissionRepository,
            userRepository,
            aiCodeReviewProvider,
            notificationEventService);
  }

  @Test
  void getReviewResultMapsApiDetailToDomainContract() {
    LocalDateTime createdAt = LocalDateTime.of(2026, 9, 4, 15, 30);
    when(aiCodeReviewRepository.findByIdAndIsDeletedFalse(55L)).thenReturn(Optional.of(review));
    when(aiReviewCommentRepository.findAllByAiCodeReview_IdAndIsDeletedFalseOrderByCreatedAtAsc(
            55L))
        .thenReturn(List.of(comment));
    when(review.getId()).thenReturn(55L);
    when(review.getRequester()).thenReturn(requester);
    when(requester.getId()).thenReturn(3L);
    when(requester.getName()).thenReturn("Reviewer");
    when(review.getTitle()).thenReturn("AI 시니어 멘토 리뷰");
    when(review.getSummary()).thenReturn("테스트 보완이 필요합니다.");
    when(review.getCommentCount()).thenReturn(1);
    when(review.getProviderName()).thenReturn("GEMINI");
    when(review.getCreatedAt()).thenReturn(createdAt);
    when(comment.getId()).thenReturn(21L);
    when(comment.getAiCodeReview()).thenReturn(review);
    when(comment.getCategory()).thenReturn("TEST");
    when(comment.getLineNumber()).thenReturn(42);
    when(comment.getTitle()).thenReturn("상호작용 테스트 추가");
    when(comment.getMessage()).thenReturn("품절 상태 회귀를 확인해야 합니다.");
    when(comment.getSuggestion()).thenReturn("버튼 비활성화 테스트를 추가하세요.");
    when(comment.getStatus()).thenReturn(AiReviewCommentStatus.PENDING);
    when(comment.getCreatedAt()).thenReturn(createdAt);

    CodeReviewAssistant.Review result = service.getReviewResult(55L);

    assertThat(result.reviewId()).isEqualTo(55L);
    assertThat(result.requesterId()).isEqualTo(3L);
    assertThat(result.providerName()).isEqualTo("GEMINI");
    assertThat(result.comments())
        .singleElement()
        .satisfies(
            mappedComment -> {
              assertThat(mappedComment.commentId()).isEqualTo(21L);
              assertThat(mappedComment.reviewId()).isEqualTo(55L);
              assertThat(mappedComment.status()).isEqualTo(AiReviewCommentStatus.PENDING);
            });
  }
}
