package com.devpath.api.workspace.service;

import com.devpath.api.ai.dto.AiCodeReviewResponse;
import com.devpath.api.ai.service.AiCodeReviewService;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewRequest;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewResponse;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceCodeReviewService {

  private final WorkspaceCodeReviewStore codeReviewStore;
  private final WorkspaceService workspaceService;
  private final AiCodeReviewService aiCodeReviewService;
  private final WorkspaceCodeReviewAiReviewer aiReviewer;

  @Transactional(readOnly = true)
  public WorkspaceCodeReviewResponse.Board getBoard(Long workspaceId, Long userId) {
    codeReviewStore.ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    List<WorkspaceCodeReviewResponse.Summary> reviews = codeReviewStore.findSummaries(workspaceId);

    return new WorkspaceCodeReviewResponse.Board(
        dashboard.getWorkspaceId(),
        dashboard.getName(),
        dashboard.getMembers(),
        reviews.stream().filter(review -> "OPEN".equals(review.status())).toList(),
        reviews.stream().filter(review -> !"OPEN".equals(review.status())).toList());
  }

  @Transactional(readOnly = true)
  public WorkspaceCodeReviewResponse.Detail getDetail(
      Long workspaceId, Long reviewId, Long userId) {
    codeReviewStore.ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    return toDetail(codeReviewStore.findDetailRow(workspaceId, reviewId), dashboard);
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail createReviewRequest(
      Long workspaceId, Long userId, WorkspaceCodeReviewRequest.Create request) {
    codeReviewStore.ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    LineStats stats = countLineStats(request.diffText());
    String sourceBranch = defaultText(request.sourceBranch(), "feature/manual-review");
    String targetBranch = defaultText(request.targetBranch(), "main");
    String filePath =
        defaultText(request.filePath(), "src/main/java/com/devpath/auth/AuthService.java");
    String diffText = request.diffText().trim();

    Long reviewId =
        codeReviewStore.createReview(
            workspaceId,
            userId,
            request.title().trim(),
            trimToNull(request.description()),
            trimToNull(request.prUrl()),
            filePath,
            diffText,
            sourceBranch,
            targetBranch,
            stats.additions(),
            stats.deletions());

    return toDetail(codeReviewStore.findDetailRow(workspaceId, reviewId), dashboard);
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail createAiReview(
      Long workspaceId,
      Long reviewId,
      Long userId,
      WorkspaceCodeReviewRequest.AiReviewCreate request) {
    codeReviewStore.ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    WorkspaceCodeReviewStore.DetailRow row = codeReviewStore.findDetailRow(workspaceId, reviewId);
    aiReviewer.createReview(workspaceId, reviewId, userId, request, row);

    return toDetail(codeReviewStore.findDetailRow(workspaceId, reviewId), dashboard);
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail closeReview(
      Long workspaceId, Long reviewId, Long userId) {
    return updateStatus(workspaceId, reviewId, userId, "CLOSED");
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail mergeReview(
      Long workspaceId, Long reviewId, Long userId) {
    return updateStatus(workspaceId, reviewId, userId, "MERGED");
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail createComment(
      Long workspaceId,
      Long reviewId,
      Long userId,
      WorkspaceCodeReviewRequest.CommentCreate request) {
    codeReviewStore.ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    WorkspaceCodeReviewStore.DetailRow row = codeReviewStore.findDetailRow(workspaceId, reviewId);
    String selectedFilePath = resolveSelectedFilePath(row, request.filePath());

    codeReviewStore.insertMemberComment(
        workspaceId, reviewId, userId, selectedFilePath, request.body().trim());
    return toDetail(codeReviewStore.findDetailRow(workspaceId, reviewId), dashboard);
  }

  private WorkspaceCodeReviewResponse.Detail updateStatus(
      Long workspaceId, Long reviewId, Long userId, String status) {
    codeReviewStore.ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    WorkspaceCodeReviewStore.DetailRow row = codeReviewStore.findDetailRow(workspaceId, reviewId);

    if ("MERGED".equals(status) && row.summary().aiCodeReviewId() == null) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }

    codeReviewStore.updateStatus(workspaceId, reviewId, status);
    return toDetail(codeReviewStore.findDetailRow(workspaceId, reviewId), dashboard);
  }

  private WorkspaceCodeReviewResponse.Detail toDetail(
      WorkspaceCodeReviewStore.DetailRow row, WorkspaceDashboardResponse dashboard) {
    AiCodeReviewResponse.Detail aiReview =
        row.summary().aiCodeReviewId() == null
            ? null
            : aiCodeReviewService.getReview(row.summary().aiCodeReviewId());

    return new WorkspaceCodeReviewResponse.Detail(
        row.summary(),
        row.description(),
        row.prUrl(),
        row.diffText(),
        row.files(),
        aiReview,
        dashboard.getMembers(),
        codeReviewStore.findComments(row.summary().workspaceId(), row.summary().reviewId()));
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

  private LineStats countLineStats(String diffText) {
    int additions = 0;
    int deletions = 0;
    int nonBlankLines = 0;

    for (String line : diffText.split("\\R")) {
      if (StringUtils.hasText(line)) {
        nonBlankLines++;
      }
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }

    if (additions == 0 && deletions == 0) {
      additions = nonBlankLines;
    }
    return new LineStats(additions, deletions);
  }

  private String defaultText(String value, String fallback) {
    String normalized = trimToNull(value);
    return normalized == null ? fallback : normalized;
  }

  private String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private record LineStats(int additions, int deletions) {}
}
