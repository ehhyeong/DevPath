package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.ai.dto.AiCodeReviewRequest;
import com.devpath.api.ai.dto.AiCodeReviewResponse;
import com.devpath.api.ai.service.AiCodeReviewService;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewRequest;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewResponse;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkspaceCodeReviewAiReviewerTest {

  @Mock private WorkspaceCodeReviewStore codeReviewStore;
  @Mock private AiCodeReviewService aiCodeReviewService;

  private WorkspaceCodeReviewAiReviewer reviewer;

  @BeforeEach
  void setUp() {
    reviewer = new WorkspaceCodeReviewAiReviewer(codeReviewStore, aiCodeReviewService);
  }

  @Test
  void createReviewSendsEveryFileWithSelectedFileFirstAndStoresReviewId() {
    long workspaceId = 7L;
    long reviewId = 11L;
    long userId = 3L;
    WorkspaceCodeReviewStore.DetailRow row = detailRow(workspaceId, reviewId);
    AiCodeReviewResponse.Detail aiReview = mock(AiCodeReviewResponse.Detail.class);
    when(aiReview.reviewId()).thenReturn(55L);
    when(aiCodeReviewService.createReview(eq(userId), any(AiCodeReviewRequest.Create.class)))
        .thenReturn(aiReview);

    reviewer.createReview(
        workspaceId,
        reviewId,
        userId,
        new WorkspaceCodeReviewRequest.AiReviewCreate("src/Checkout.tsx"),
        row);

    ArgumentCaptor<AiCodeReviewRequest.Create> requestCaptor =
        ArgumentCaptor.forClass(AiCodeReviewRequest.Create.class);
    verify(aiCodeReviewService).createReview(eq(userId), requestCaptor.capture());
    String diffText = requestCaptor.getValue().diffText();
    assertThat(diffText).contains("Primary display file: src/Checkout.tsx");
    assertThat(diffText.indexOf("### FILE: src/Checkout.tsx"))
        .isLessThan(diffText.indexOf("### FILE: src/AuthService.java"));
    assertThat(diffText).contains("+checkout", "+auth");
    verify(codeReviewStore).attachAiReview(workspaceId, reviewId, 55L, "src/Checkout.tsx");
  }

  private WorkspaceCodeReviewStore.DetailRow detailRow(Long workspaceId, Long reviewId) {
    WorkspaceCodeReviewResponse.Summary summary =
        new WorkspaceCodeReviewResponse.Summary(
            reviewId,
            workspaceId,
            "#DP-11",
            "결제 PR 리뷰",
            "OPEN",
            3L,
            "Reviewer",
            null,
            "FE",
            "src/AuthService.java",
            2,
            "feature/checkout",
            "main",
            2,
            0,
            0,
            null,
            LocalDateTime.now(),
            LocalDateTime.now());
    return new WorkspaceCodeReviewStore.DetailRow(
        summary,
        null,
        null,
        "description",
        null,
        "+auth\n+checkout",
        List.of(
            new WorkspaceCodeReviewResponse.FileDiff(
                1L, reviewId, "src/AuthService.java", "+auth", 1, 0, "modified"),
            new WorkspaceCodeReviewResponse.FileDiff(
                2L, reviewId, "src/Checkout.tsx", "+checkout", 1, 0, "modified")));
  }
}
