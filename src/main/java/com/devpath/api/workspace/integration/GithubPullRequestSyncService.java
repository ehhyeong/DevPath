package com.devpath.api.workspace.integration;

import com.devpath.api.workspace.service.WorkspaceCodeReviewSchema;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.operation.integration.ExternalIntegration;
import com.devpath.domain.operation.integration.ExternalIntegrationRepository;
import com.devpath.domain.operation.integration.IntegrationProvider;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class GithubPullRequestSyncService {

  private static final int AUTO_SYNC_INTERVAL_MINUTES = 5;

  private final GithubPullRequestClient githubPullRequestClient;
  private final ExternalIntegrationRepository integrationRepository;
  private final JdbcTemplate jdbcTemplate;

  public GithubRepositoryReference parseRepositoryUrl(String repositoryUrl) {
    return githubPullRequestClient.parseRepositoryUrl(repositoryUrl);
  }

  @Transactional
  public SyncResult syncWorkspacePullRequests(
      Long workspaceId, Long actorId, ExternalIntegration integration) {
    if (!isSyncable(integration)) {
      return SyncResult.notConfigured();
    }

    ensureCodeReviewSchema();
    GithubRepositoryReference repository =
        new GithubRepositoryReference(
            integration.getRepositoryOwner(),
            integration.getRepositoryName(),
            integration.getRepositoryUrl());
    List<GithubPullRequest> pullRequests;
    try {
      pullRequests =
          githubPullRequestClient.fetchPullRequests(
              repository, integration.getRepositoryAccessToken());
    } catch (CustomException exception) {
      String message = "GitHub 저장소는 연결했지만 PR 동기화는 실패했습니다. 저장소 권한, API 제한, 서버 인증 설정을 확인해주세요.";
      integration.markSyncFailed(message);
      return new SyncResult(0, 0, 0, true, message);
    }

    int created = 0;
    int updated = 0;
    for (GithubPullRequest pullRequest : pullRequests) {
      ReviewUpsertResult result = upsertPullRequest(workspaceId, actorId, repository, pullRequest);
      replacePullRequestFiles(workspaceId, result.reviewId(), pullRequest.normalizedFiles());
      if (result.created()) {
        created++;
      } else {
        updated++;
      }
    }

    String message =
        pullRequests.isEmpty()
            ? "GitHub PR이 아직 없습니다."
            : "GitHub PR " + pullRequests.size() + "건을 동기화했습니다.";
    integration.markSynced(message);

    return new SyncResult(created, updated, pullRequests.size(), false, message);
  }

  @Transactional
  public void syncWorkspacePullRequestsIfStale(Long workspaceId, Long actorId) {
    Optional<ExternalIntegration> integration =
        integrationRepository.findByWorkspaceIdAndProvider(workspaceId, IntegrationProvider.GITHUB);

    if (integration.isEmpty() || !isSyncable(integration.get()) || !isStale(integration.get())) {
      return;
    }

    try {
      syncWorkspacePullRequests(workspaceId, actorId, integration.get());
    } catch (RuntimeException ignored) {
      // GitHub outages or rate limits should not block the review board.
    }
  }

  private boolean isSyncable(ExternalIntegration integration) {
    return integration != null
        && integration.isActive()
        && integration.getProvider() == IntegrationProvider.GITHUB
        && StringUtils.hasText(integration.getRepositoryOwner())
        && StringUtils.hasText(integration.getRepositoryName())
        && StringUtils.hasText(integration.getRepositoryUrl());
  }

  private boolean isStale(ExternalIntegration integration) {
    LocalDateTime lastSyncedAt = integration.getLastSyncedAt();
    return lastSyncedAt == null
        || lastSyncedAt.plusMinutes(AUTO_SYNC_INTERVAL_MINUTES).isBefore(LocalDateTime.now());
  }

  private ReviewUpsertResult upsertPullRequest(
      Long workspaceId,
      Long actorId,
      GithubRepositoryReference repository,
      GithubPullRequest pullRequest) {
    String externalId = pullRequest.externalId(repository);
    Optional<Long> existingId = findExistingReviewId(workspaceId, externalId);

    if (existingId.isPresent()) {
      jdbcTemplate.update(
          """
          UPDATE workspace_code_reviews
             SET title = ?,
                 description = ?,
                 pr_url = ?,
                 file_path = ?,
                 diff_text = ?,
                 source_branch = ?,
                 target_branch = ?,
                 status = ?,
                 additions = ?,
                 deletions = ?,
                 external_author_name = ?,
                 external_author_avatar_url = ?,
                 external_updated_at = ?,
                 updated_at = now()
           WHERE id = ?
             AND workspace_id = ?
             AND is_deleted = FALSE
          """,
          pullRequest.title(),
          trimToNull(pullRequest.body()),
          pullRequest.htmlUrl(),
          defaultText(pullRequest.filePath(), "."),
          defaultText(pullRequest.diffText(), "GitHub diff is empty."),
          defaultText(pullRequest.sourceBranch(), "feature/github-pr"),
          defaultText(pullRequest.targetBranch(), "main"),
          pullRequest.reviewStatus(),
          pullRequest.additions(),
          pullRequest.deletions(),
          defaultText(pullRequest.authorLogin(), "github-user"),
          trimToNull(pullRequest.authorAvatarUrl()),
          toTimestamp(pullRequest.updatedAt()),
          existingId.get(),
          workspaceId);
      return new ReviewUpsertResult(existingId.get(), false);
    }

    Long reviewId =
        jdbcTemplate.queryForObject(
            """
            INSERT INTO workspace_code_reviews (
                workspace_id, title, description, pr_url, file_path, diff_text,
                source_branch, target_branch, author_id, status,
                additions, deletions, ai_code_review_id, is_deleted,
                external_provider, external_id, external_author_name,
                external_author_avatar_url, external_updated_at,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, FALSE,
                    'GITHUB', ?, ?, ?, ?, COALESCE(?, now()), now())
            RETURNING id
            """,
            Long.class,
            workspaceId,
            pullRequest.title(),
            trimToNull(pullRequest.body()),
            pullRequest.htmlUrl(),
            defaultText(pullRequest.filePath(), "."),
            defaultText(pullRequest.diffText(), "GitHub diff is empty."),
            defaultText(pullRequest.sourceBranch(), "feature/github-pr"),
            defaultText(pullRequest.targetBranch(), "main"),
            actorId,
            pullRequest.reviewStatus(),
            pullRequest.additions(),
            pullRequest.deletions(),
            externalId,
            defaultText(pullRequest.authorLogin(), "github-user"),
            trimToNull(pullRequest.authorAvatarUrl()),
            toTimestamp(pullRequest.updatedAt()),
            toTimestamp(pullRequest.createdAt()));

    if (reviewId == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return new ReviewUpsertResult(reviewId, true);
  }

  private void replacePullRequestFiles(
      Long workspaceId, Long reviewId, List<GithubPullRequest.FileChange> files) {
    jdbcTemplate.update(
        "DELETE FROM workspace_code_review_files WHERE workspace_id = ? AND review_id = ?",
        workspaceId,
        reviewId);

    for (int index = 0; index < files.size(); index++) {
      GithubPullRequest.FileChange file = files.get(index);
      jdbcTemplate.update(
          """
          INSERT INTO workspace_code_review_files (
              review_id, workspace_id, file_path, diff_text, additions,
              deletions, change_type, display_order, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, now(), now())
          """,
          reviewId,
          workspaceId,
          defaultText(file.filePath(), "."),
          defaultText(file.diffText(), "GitHub did not expose this file diff."),
          file.additions(),
          file.deletions(),
          defaultText(file.changeType(), "modified"),
          index);
    }
  }

  private Optional<Long> findExistingReviewId(Long workspaceId, String externalId) {
    List<Long> ids =
        jdbcTemplate.query(
            """
            SELECT id
              FROM workspace_code_reviews
             WHERE workspace_id = ?
               AND external_provider = 'GITHUB'
               AND external_id = ?
               AND is_deleted = FALSE
             ORDER BY id ASC
             LIMIT 1
            """,
            (rs, rowNum) -> rs.getLong("id"),
            workspaceId,
            externalId);

    return ids.stream().findFirst();
  }

  private void ensureCodeReviewSchema() {
    WorkspaceCodeReviewSchema.ensure(jdbcTemplate);
  }

  private String defaultText(String value, String fallback) {
    return StringUtils.hasText(value) ? value.trim() : fallback;
  }

  private String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private Timestamp toTimestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private record ReviewUpsertResult(Long reviewId, boolean created) {}

  public record SyncResult(
      int createdCount, int updatedCount, int totalCount, boolean skipped, String message) {

    public static SyncResult notConfigured() {
      return new SyncResult(0, 0, 0, true, "GitHub 저장소가 연결되어 있지 않습니다.");
    }
  }
}
