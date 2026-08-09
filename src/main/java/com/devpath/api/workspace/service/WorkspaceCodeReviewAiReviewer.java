package com.devpath.api.workspace.service;

import com.devpath.api.ai.dto.AiCodeReviewRequest;
import com.devpath.api.ai.dto.AiCodeReviewResponse;
import com.devpath.api.ai.service.AiCodeReviewService;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewRequest;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
class WorkspaceCodeReviewAiReviewer {

  private final WorkspaceCodeReviewStore codeReviewStore;
  private final AiCodeReviewService aiCodeReviewService;

  void createReview(
      Long workspaceId,
      Long reviewId,
      Long userId,
      WorkspaceCodeReviewRequest.AiReviewCreate request,
      WorkspaceCodeReviewStore.DetailRow row) {
    String selectedFilePath =
        resolveSelectedFilePath(row, request == null ? null : request.filePath());
    String reviewDiff = buildReviewDiff(row, selectedFilePath);

    if (isDemoFrontendCommerceReview(workspaceId, row)) {
      createDemoReview(workspaceId, reviewId, userId, row, selectedFilePath, reviewDiff);
      return;
    }

    AiCodeReviewResponse.Detail aiReview =
        aiCodeReviewService.createReview(
            userId,
            new AiCodeReviewRequest.Create(
                null, null, "AI 시니어 멘토 리뷰 - " + row.summary().title(), reviewDiff));
    codeReviewStore.attachAiReview(workspaceId, reviewId, aiReview.reviewId(), selectedFilePath);
  }

  private void createDemoReview(
      Long workspaceId,
      Long reviewId,
      Long userId,
      WorkspaceCodeReviewStore.DetailRow row,
      String selectedFilePath,
      String reviewDiff) {
    delayDemoAiReview();

    Long aiReviewId =
        codeReviewStore.createDemoAiReview(
            userId,
            "AI 시니어 멘토 리뷰 - " + row.summary().title(),
            reviewDiff,
            "PR은 시연 가능한 상태지만 품절 상태 처리, 접근성 라벨, 장바구니 side effect 분리를 더 명확히 해야 합니다.");
    codeReviewStore.insertDemoAiReviewComment(
        aiReviewId,
        "상태 관리",
        42,
        "장바구니 변경은 카드 밖에서 처리",
        "ProductCard는 표시용 컴포넌트로 유지해야 상품 목록과 상세 화면에서 재사용하기 좋습니다.",
        "부모 컨테이너에서 onAddToCart와 disabledReason을 props로 넘겨주세요.");
    codeReviewStore.insertDemoAiReviewComment(
        aiReviewId,
        "접근성",
        48,
        "품절 사유를 스크린리더에도 노출",
        "disabled 버튼은 키보드 탐색 중에도 품절 이유를 이해할 수 있어야 합니다.",
        "간단한 재고 상태 메시지에 연결되는 aria-describedby를 추가해 주세요.");
    codeReviewStore.insertDemoAiReviewComment(
        aiReviewId,
        "테스트",
        55,
        "상호작용 테스트 1개 추가",
        "정상 흐름은 데모 데이터로 보이지만 품절 상태는 쉽게 회귀할 수 있습니다.",
        "품절 버튼 비활성화와 장바구니 추가 callback을 확인하는 컴포넌트 테스트를 추가해 주세요.");
    codeReviewStore.attachAiReview(workspaceId, reviewId, aiReviewId, selectedFilePath);
  }

  private void delayDemoAiReview() {
    try {
      Thread.sleep(ThreadLocalRandom.current().nextLong(7000L, 10001L));
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private boolean isDemoFrontendCommerceReview(
      Long workspaceId, WorkspaceCodeReviewStore.DetailRow row) {
    return Long.valueOf(6L).equals(workspaceId)
        && "GITHUB".equals(row.externalProvider())
        && "devpath/frontend-commerce#17".equals(row.externalId())
        && row.summary().aiCodeReviewId() == null;
  }

  private String buildReviewDiff(WorkspaceCodeReviewStore.DetailRow row, String selectedFilePath) {
    StringBuilder builder = new StringBuilder();
    builder
        .append("Review scope: full Pull Request. File sections below are explicit review targets.")
        .append("\n")
        .append("Primary display file: ")
        .append(selectedFilePath)
        .append("\n\n");

    List<WorkspaceCodeReviewResponse.FileDiff> orderedFiles =
        row.files().stream()
            .sorted(
                (left, right) -> {
                  boolean leftSelected = left.filePath().equals(selectedFilePath);
                  boolean rightSelected = right.filePath().equals(selectedFilePath);
                  if (leftSelected == rightSelected) {
                    return 0;
                  }
                  return leftSelected ? -1 : 1;
                })
            .toList();

    for (WorkspaceCodeReviewResponse.FileDiff file : orderedFiles) {
      builder
          .append("### FILE: ")
          .append(file.filePath())
          .append(" (+")
          .append(file.additions())
          .append(" -")
          .append(file.deletions())
          .append(")")
          .append("\n")
          .append(file.diffText())
          .append("\n\n");
    }

    return builder.toString().trim();
  }

  private String resolveSelectedFilePath(
      WorkspaceCodeReviewStore.DetailRow row, String requestedFilePath) {
    String normalized = trimToNull(requestedFilePath);
    if (normalized != null
        && row.files().stream().anyMatch(file -> file.filePath().equals(normalized))) {
      return normalized;
    }

    String current = trimToNull(row.summary().filePath());
    if (current != null && row.files().stream().anyMatch(file -> file.filePath().equals(current))) {
      return current;
    }

    return row.files().isEmpty() ? row.summary().filePath() : row.files().getFirst().filePath();
  }

  private String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }
}
