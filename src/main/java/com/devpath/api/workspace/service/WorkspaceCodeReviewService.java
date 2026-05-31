package com.devpath.api.workspace.service;

import com.devpath.api.ai.dto.AiCodeReviewRequest;
import com.devpath.api.ai.dto.AiCodeReviewResponse;
import com.devpath.api.ai.service.AiCodeReviewService;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewRequest;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewResponse;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.api.workspace.integration.GithubPullRequestSyncService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceCodeReviewService {

  private final JdbcTemplate jdbcTemplate;
  private final WorkspaceService workspaceService;
  private final AiCodeReviewService aiCodeReviewService;
  private final GithubPullRequestSyncService githubPullRequestSyncService;

  @Transactional
  public WorkspaceCodeReviewResponse.Board getBoard(Long workspaceId, Long userId) {
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    githubPullRequestSyncService.syncWorkspacePullRequestsIfStale(workspaceId, userId);
    List<WorkspaceCodeReviewResponse.Summary> reviews = findSummaries(workspaceId);

    return new WorkspaceCodeReviewResponse.Board(
        dashboard.getWorkspaceId(),
        dashboard.getName(),
        dashboard.getMembers(),
        reviews.stream().filter(review -> "OPEN".equals(review.status())).toList(),
        reviews.stream().filter(review -> !"OPEN".equals(review.status())).toList());
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail getDetail(
      Long workspaceId, Long reviewId, Long userId) {
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    DetailRow row = findDetailRow(workspaceId, reviewId);

    return toDetail(row, dashboard);
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail createReviewRequest(
      Long workspaceId, Long userId, WorkspaceCodeReviewRequest.Create request) {
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    LineStats stats = countLineStats(request.diffText());
    String sourceBranch = defaultText(request.sourceBranch(), "feature/manual-review");
    String targetBranch = defaultText(request.targetBranch(), "main");
    String filePath =
        defaultText(request.filePath(), "src/main/java/com/devpath/auth/AuthService.java");

    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(
        connection -> {
          PreparedStatement statement =
              connection.prepareStatement(
                  """
                  INSERT INTO workspace_code_reviews (
                      workspace_id, title, description, pr_url, file_path, diff_text,
                      source_branch, target_branch, author_id, status,
                      additions, deletions, ai_code_review_id, is_deleted, created_at, updated_at
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NULL, FALSE, now(), now())
                  """,
                  new String[] {"id"});
          statement.setLong(1, workspaceId);
          statement.setString(2, request.title().trim());
          statement.setString(3, trimToNull(request.description()));
          statement.setString(4, trimToNull(request.prUrl()));
          statement.setString(5, filePath);
          statement.setString(6, request.diffText().trim());
          statement.setString(7, sourceBranch);
          statement.setString(8, targetBranch);
          statement.setLong(9, userId);
          statement.setInt(10, stats.additions());
          statement.setInt(11, stats.deletions());
          return statement;
        },
        keyHolder);

    Number key = keyHolder.getKey();
    if (key == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    insertFileDiff(
        workspaceId,
        key.longValue(),
        filePath,
        request.diffText().trim(),
        stats.additions(),
        stats.deletions(),
        "manual",
        0);

    return toDetail(findDetailRow(workspaceId, key.longValue()), dashboard);
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail createAiReview(
      Long workspaceId,
      Long reviewId,
      Long userId,
      WorkspaceCodeReviewRequest.AiReviewCreate request) {
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    DetailRow row = findDetailRow(workspaceId, reviewId);
    String selectedFilePath = resolveSelectedFilePath(row, request == null ? null : request.filePath());
    String reviewDiff = buildAiReviewDiff(row, selectedFilePath);

    AiCodeReviewResponse.Detail aiReview =
        aiCodeReviewService.createReview(
            userId,
            new AiCodeReviewRequest.Create(
                null, null, "AI 시니어 멘토 리뷰 - " + row.summary().title(), reviewDiff));

    jdbcTemplate.update(
        """
        UPDATE workspace_code_reviews
           SET ai_code_review_id = ?,
               updated_at = now()
         WHERE id = ?
           AND workspace_id = ?
           AND is_deleted = FALSE
        """,
        aiReview.reviewId(),
        reviewId,
        workspaceId);

    jdbcTemplate.update(
        """
        UPDATE workspace_code_reviews
           SET file_path = ?,
               updated_at = now()
         WHERE id = ?
           AND workspace_id = ?
           AND is_deleted = FALSE
        """,
        selectedFilePath,
        reviewId,
        workspaceId);

    return toDetail(findDetailRow(workspaceId, reviewId), dashboard);
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
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    DetailRow row = findDetailRow(workspaceId, reviewId);
    String selectedFilePath = resolveSelectedFilePath(row, request.filePath());

    jdbcTemplate.update(
        """
        INSERT INTO workspace_code_review_comments (
            review_id, workspace_id, author_id, file_path, body, status_label,
            is_deleted, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'Commented', FALSE, now(), now())
        """,
        reviewId,
        workspaceId,
        userId,
        selectedFilePath,
        request.body().trim());

    return toDetail(findDetailRow(workspaceId, reviewId), dashboard);
  }

  private WorkspaceCodeReviewResponse.Detail updateStatus(
      Long workspaceId, Long reviewId, Long userId, String status) {
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    DetailRow row = findDetailRow(workspaceId, reviewId);

    if ("MERGED".equals(status) && row.summary().aiCodeReviewId() == null) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }

    jdbcTemplate.update(
        """
        UPDATE workspace_code_reviews
           SET status = ?,
               updated_at = now()
         WHERE id = ?
           AND workspace_id = ?
           AND is_deleted = FALSE
        """,
        status,
        reviewId,
        workspaceId);

    return toDetail(findDetailRow(workspaceId, reviewId), dashboard);
  }

  private WorkspaceCodeReviewResponse.Detail toDetail(
      DetailRow row, WorkspaceDashboardResponse dashboard) {
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
        findComments(row.summary().workspaceId(), row.summary().reviewId()));
  }

  private List<WorkspaceCodeReviewResponse.Summary> findSummaries(Long workspaceId) {
    return jdbcTemplate.query(
        """
        SELECT r.id, r.workspace_id, r.title, r.status, r.author_id,
               r.external_provider, r.external_id,
               COALESCE(r.external_author_name, u.name, '팀원') AS author_name,
               CASE
                 WHEN r.external_author_avatar_url IS NOT NULL THEN r.external_author_avatar_url
                 WHEN up.profile_image LIKE '/images/profiles/%' THEN NULL
                 ELSE up.profile_image
               END AS author_profile_image,
               r.file_path, COALESCE(fc.file_count, 1) AS file_count,
               r.source_branch, r.target_branch, r.additions, r.deletions,
               COALESCE(ai.comment_count, 0) AS ai_comment_count,
               r.ai_code_review_id, r.created_at, r.updated_at
          FROM workspace_code_reviews r
          LEFT JOIN users u ON u.user_id = r.author_id
          LEFT JOIN user_profiles up ON up.user_id = r.author_id
          LEFT JOIN ai_code_reviews ai ON ai.ai_code_review_id = r.ai_code_review_id
          LEFT JOIN (
              SELECT workspace_id, review_id, COUNT(*) AS file_count
                FROM workspace_code_review_files
               GROUP BY workspace_id, review_id
          ) fc ON fc.workspace_id = r.workspace_id AND fc.review_id = r.id
         WHERE r.workspace_id = ?
           AND r.is_deleted = FALSE
         ORDER BY CASE WHEN r.status = 'OPEN' THEN 0 ELSE 1 END, r.created_at DESC, r.id DESC
        """,
        (rs, rowNum) ->
            new WorkspaceCodeReviewResponse.Summary(
                rs.getLong("id"),
                rs.getLong("workspace_id"),
                toIssueKey(
                    rs.getLong("id"),
                    rs.getString("external_provider"),
                    rs.getString("external_id")),
                rs.getString("title"),
                rs.getString("status"),
                rs.getLong("author_id"),
                rs.getString("author_name"),
                rs.getString("author_profile_image"),
                inferAuthorRole(rs.getString("title"), rs.getString("file_path")),
                rs.getString("file_path"),
                rs.getInt("file_count"),
                rs.getString("source_branch"),
                rs.getString("target_branch"),
                rs.getInt("additions"),
                rs.getInt("deletions"),
                rs.getInt("ai_comment_count"),
                getNullableLong(rs.getObject("ai_code_review_id")),
                toLocalDateTime(rs.getTimestamp("created_at")),
                toLocalDateTime(rs.getTimestamp("updated_at"))),
        workspaceId);
  }

  private List<WorkspaceCodeReviewResponse.MemberComment> findComments(
      Long workspaceId, Long reviewId) {
    return jdbcTemplate.query(
        """
        SELECT c.id, c.review_id, c.author_id,
               COALESCE(u.name, '팀원') AS author_name,
               CASE
                 WHEN up.profile_image LIKE '/images/profiles/%' THEN NULL
                 ELSE up.profile_image
               END AS author_profile_image,
               c.body, c.file_path, c.status_label, c.created_at
          FROM workspace_code_review_comments c
          LEFT JOIN users u ON u.user_id = c.author_id
          LEFT JOIN user_profiles up ON up.user_id = c.author_id
         WHERE c.workspace_id = ?
           AND c.review_id = ?
           AND c.is_deleted = FALSE
         ORDER BY c.created_at ASC, c.id ASC
        """,
        (rs, rowNum) ->
            new WorkspaceCodeReviewResponse.MemberComment(
                rs.getLong("id"),
                rs.getLong("review_id"),
                rs.getLong("author_id"),
                rs.getString("author_name"),
                rs.getString("author_profile_image"),
                rs.getString("body"),
                rs.getString("file_path"),
                rs.getString("status_label"),
                toLocalDateTime(rs.getTimestamp("created_at"))),
        workspaceId,
        reviewId);
  }

  private DetailRow findDetailRow(Long workspaceId, Long reviewId) {
    List<DetailRow> rows =
        jdbcTemplate.query(
            """
            SELECT r.id, r.workspace_id, r.title, r.description, r.pr_url, r.file_path,
                   r.diff_text, r.status, r.author_id,
                   r.external_provider, r.external_id,
                   COALESCE(r.external_author_name, u.name, '팀원') AS author_name,
                   CASE
                     WHEN r.external_author_avatar_url IS NOT NULL THEN r.external_author_avatar_url
                     WHEN up.profile_image LIKE '/images/profiles/%' THEN NULL
                     ELSE up.profile_image
                   END AS author_profile_image,
                   r.source_branch, r.target_branch, r.additions, r.deletions,
                   COALESCE(fc.file_count, 1) AS file_count,
                   COALESCE(ai.comment_count, 0) AS ai_comment_count,
                   r.ai_code_review_id, r.created_at, r.updated_at
              FROM workspace_code_reviews r
              LEFT JOIN users u ON u.user_id = r.author_id
              LEFT JOIN user_profiles up ON up.user_id = r.author_id
              LEFT JOIN ai_code_reviews ai ON ai.ai_code_review_id = r.ai_code_review_id
              LEFT JOIN (
                  SELECT workspace_id, review_id, COUNT(*) AS file_count
                    FROM workspace_code_review_files
                   GROUP BY workspace_id, review_id
              ) fc ON fc.workspace_id = r.workspace_id AND fc.review_id = r.id
             WHERE r.workspace_id = ?
               AND r.id = ?
               AND r.is_deleted = FALSE
            """,
            (rs, rowNum) -> {
              WorkspaceCodeReviewResponse.Summary summary =
                  new WorkspaceCodeReviewResponse.Summary(
                      rs.getLong("id"),
                      rs.getLong("workspace_id"),
                      toIssueKey(
                          rs.getLong("id"),
                          rs.getString("external_provider"),
                          rs.getString("external_id")),
                      rs.getString("title"),
                      rs.getString("status"),
                      rs.getLong("author_id"),
                      rs.getString("author_name"),
                      rs.getString("author_profile_image"),
                      inferAuthorRole(rs.getString("title"), rs.getString("file_path")),
                      rs.getString("file_path"),
                      rs.getInt("file_count"),
                      rs.getString("source_branch"),
                      rs.getString("target_branch"),
                      rs.getInt("additions"),
                      rs.getInt("deletions"),
                      rs.getInt("ai_comment_count"),
                      getNullableLong(rs.getObject("ai_code_review_id")),
                      toLocalDateTime(rs.getTimestamp("created_at")),
                      toLocalDateTime(rs.getTimestamp("updated_at")));
              return new DetailRow(
                  summary,
                  rs.getString("description"),
                  rs.getString("pr_url"),
                  rs.getString("diff_text"),
                  findFiles(workspaceId, reviewId, rs.getString("file_path"), rs.getString("diff_text")));
            },
            workspaceId,
            reviewId);

    if (rows.isEmpty()) {
      throw new CustomException(ErrorCode.REVIEW_PULL_REQUEST_NOT_FOUND);
    }

    return rows.get(0);
  }

  private List<WorkspaceCodeReviewResponse.FileDiff> findFiles(
      Long workspaceId, Long reviewId, String fallbackFilePath, String fallbackDiffText) {
    List<WorkspaceCodeReviewResponse.FileDiff> files =
        jdbcTemplate.query(
            """
            SELECT id, review_id, file_path, diff_text, additions, deletions, change_type
              FROM workspace_code_review_files
             WHERE workspace_id = ?
               AND review_id = ?
             ORDER BY display_order ASC, id ASC
            """,
            (rs, rowNum) ->
                new WorkspaceCodeReviewResponse.FileDiff(
                    rs.getLong("id"),
                    rs.getLong("review_id"),
                    rs.getString("file_path"),
                    rs.getString("diff_text"),
                    rs.getInt("additions"),
                    rs.getInt("deletions"),
                    rs.getString("change_type")),
            workspaceId,
            reviewId);

    if (!files.isEmpty()) {
      return files;
    }

    LineStats stats = countLineStats(fallbackDiffText == null ? "" : fallbackDiffText);
    return List.of(
        new WorkspaceCodeReviewResponse.FileDiff(
            null,
            reviewId,
            defaultText(fallbackFilePath, "src/main/java/com/devpath/auth/AuthService.java"),
            defaultText(fallbackDiffText, ""),
            stats.additions(),
            stats.deletions(),
            "legacy"));
  }

  private void insertFileDiff(
      Long workspaceId,
      Long reviewId,
      String filePath,
      String diffText,
      int additions,
      int deletions,
      String changeType,
      int displayOrder) {
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
        filePath,
        diffText,
        additions,
        deletions,
        changeType,
        displayOrder);
  }

  private String buildAiReviewDiff(DetailRow row, String selectedFilePath) {
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

  private String resolveSelectedFilePath(DetailRow row, String requestedFilePath) {
    String normalized = trimToNull(requestedFilePath);

    if (normalized != null) {
      boolean exists = row.files().stream().anyMatch(file -> file.filePath().equals(normalized));
      if (exists) {
        return normalized;
      }
    }

    String current = trimToNull(row.summary().filePath());
    if (current != null
        && row.files().stream().anyMatch(file -> file.filePath().equals(current))) {
      return current;
    }

    return row.files().isEmpty() ? row.summary().filePath() : row.files().get(0).filePath();
  }

  private void ensureSchema() {
    WorkspaceCodeReviewSchema.ensure(jdbcTemplate);
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

  private String toIssueKey(Long id, String externalProvider, String externalId) {
    if ("GITHUB".equals(externalProvider) && StringUtils.hasText(externalId)) {
      int markerIndex = externalId.lastIndexOf('#');
      if (markerIndex >= 0 && markerIndex < externalId.length() - 1) {
        return "#PR-" + externalId.substring(markerIndex + 1);
      }
    }

    return "#DP-" + String.format("%02d", id);
  }

  private String inferAuthorRole(String title, String filePath) {
    String haystack =
        ((title == null ? "" : title) + " " + (filePath == null ? "" : filePath)).toLowerCase();

    if (haystack.contains("tsx")
        || haystack.contains("jsx")
        || haystack.contains("react")
        || haystack.contains("frontend")
        || haystack.contains("ui")) {
      return "FE";
    }

    if (haystack.contains("docker")
        || haystack.contains("deploy")
        || haystack.contains("infra")
        || haystack.contains("nginx")) {
      return "DevOps";
    }

    return "BE";
  }

  private Long getNullableLong(Object value) {
    if (value instanceof Number number) {
      return number.longValue();
    }

    return null;
  }

  private LocalDateTime toLocalDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }

  private record LineStats(int additions, int deletions) {}

  private record DetailRow(
      WorkspaceCodeReviewResponse.Summary summary,
      String description,
      String prUrl,
      String diffText,
      List<WorkspaceCodeReviewResponse.FileDiff> files) {}
}
