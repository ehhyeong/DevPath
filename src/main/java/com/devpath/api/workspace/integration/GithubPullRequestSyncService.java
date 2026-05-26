package com.devpath.api.workspace.integration;

import com.devpath.domain.operation.integration.ExternalIntegration;
import com.devpath.domain.operation.integration.ExternalIntegrationRepository;
import com.devpath.domain.operation.integration.IntegrationProvider;
import java.sql.PreparedStatement;
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
    List<GithubPullRequest> pullRequests = githubPullRequestClient.fetchPullRequests(repository);

    int created = 0;
    int updated = 0;
    for (GithubPullRequest pullRequest : pullRequests) {
      if (upsertPullRequest(workspaceId, actorId, repository, pullRequest)) {
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
      // A GitHub outage or rate limit should not block the code review board from loading.
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

  private boolean upsertPullRequest(
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
          defaultText(pullRequest.diffText(), "GitHub diff가 비어 있습니다."),
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
      return false;
    }

    jdbcTemplate.update(
        connection -> {
          PreparedStatement statement =
              connection.prepareStatement(
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
                  """);
          statement.setLong(1, workspaceId);
          statement.setString(2, pullRequest.title());
          statement.setString(3, trimToNull(pullRequest.body()));
          statement.setString(4, pullRequest.htmlUrl());
          statement.setString(5, defaultText(pullRequest.filePath(), "."));
          statement.setString(6, defaultText(pullRequest.diffText(), "GitHub diff가 비어 있습니다."));
          statement.setString(7, defaultText(pullRequest.sourceBranch(), "feature/github-pr"));
          statement.setString(8, defaultText(pullRequest.targetBranch(), "main"));
          statement.setLong(9, actorId);
          statement.setString(10, pullRequest.reviewStatus());
          statement.setInt(11, pullRequest.additions());
          statement.setInt(12, pullRequest.deletions());
          statement.setString(13, externalId);
          statement.setString(14, defaultText(pullRequest.authorLogin(), "github-user"));
          statement.setString(15, trimToNull(pullRequest.authorAvatarUrl()));
          statement.setTimestamp(16, toTimestamp(pullRequest.updatedAt()));
          statement.setTimestamp(17, toTimestamp(pullRequest.createdAt()));
          return statement;
        });
    return true;
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
    jdbcTemplate.execute(
        """
        CREATE TABLE IF NOT EXISTS workspace_code_reviews (
            id bigserial PRIMARY KEY,
            workspace_id bigint NOT NULL,
            title varchar(180) NOT NULL,
            description text,
            pr_url varchar(1000),
            file_path varchar(300) NOT NULL DEFAULT 'src/main/java/com/devpath/auth/AuthService.java',
            diff_text text NOT NULL,
            source_branch varchar(120) NOT NULL DEFAULT 'feature/manual-review',
            target_branch varchar(120) NOT NULL DEFAULT 'main',
            author_id bigint NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'OPEN',
            additions integer NOT NULL DEFAULT 0,
            deletions integer NOT NULL DEFAULT 0,
            ai_code_review_id bigint,
            is_deleted boolean NOT NULL DEFAULT false,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
        """);
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_provider varchar(50)");
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_id varchar(220)");
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_author_name varchar(120)");
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_author_avatar_url varchar(1000)");
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_updated_at timestamp");
    jdbcTemplate.execute(
        "CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_external ON workspace_code_reviews(workspace_id, external_provider, external_id)");
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

  public record SyncResult(
      int createdCount,
      int updatedCount,
      int totalCount,
      boolean skipped,
      String message) {

    public static SyncResult notConfigured() {
      return new SyncResult(0, 0, 0, true, "GitHub 저장소가 연결되어 있지 않습니다.");
    }
  }
}
