package com.devpath.api.workspace.service;

import com.devpath.api.ai.dto.AiCodeReviewRequest;
import com.devpath.api.ai.dto.AiCodeReviewResponse;
import com.devpath.api.ai.service.AiCodeReviewService;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewRequest;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewResponse;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
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

  @Transactional
  public WorkspaceCodeReviewResponse.Board getBoard(Long workspaceId, Long userId) {
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
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
    String filePath = defaultText(request.filePath(), "src/main/java/com/devpath/auth/AuthService.java");

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

    return toDetail(findDetailRow(workspaceId, key.longValue()), dashboard);
  }

  @Transactional
  public WorkspaceCodeReviewResponse.Detail createAiReview(
      Long workspaceId, Long reviewId, Long userId) {
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    DetailRow row = findDetailRow(workspaceId, reviewId);

    AiCodeReviewResponse.Detail aiReview =
        aiCodeReviewService.createReview(
            userId,
            new AiCodeReviewRequest.Create(
                null,
                null,
                "AI 시니어 멘토 리뷰 - " + row.summary().title(),
                row.diffText()));

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
      Long workspaceId, Long reviewId, Long userId, WorkspaceCodeReviewRequest.CommentCreate request) {
    ensureSchema();
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    findDetailRow(workspaceId, reviewId);

    jdbcTemplate.update(
        """
        INSERT INTO workspace_code_review_comments (
            review_id, workspace_id, author_id, body, status_label,
            is_deleted, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 'Commented', FALSE, now(), now())
        """,
        reviewId,
        workspaceId,
        userId,
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
        aiReview,
        dashboard.getMembers(),
        findComments(row.summary().workspaceId(), row.summary().reviewId()));
  }

  private List<WorkspaceCodeReviewResponse.Summary> findSummaries(Long workspaceId) {
    return jdbcTemplate.query(
        """
        SELECT r.id, r.workspace_id, r.title, r.status, r.author_id,
               COALESCE(u.name, '팀원') AS author_name,
               CASE
                 WHEN up.profile_image LIKE '/images/profiles/%' THEN NULL
                 ELSE up.profile_image
               END AS author_profile_image,
               r.file_path, r.source_branch, r.target_branch, r.additions, r.deletions,
               COALESCE(ai.comment_count, 0) AS ai_comment_count,
               r.ai_code_review_id, r.created_at, r.updated_at
          FROM workspace_code_reviews r
          LEFT JOIN users u ON u.user_id = r.author_id
          LEFT JOIN user_profiles up ON up.user_id = r.author_id
          LEFT JOIN ai_code_reviews ai ON ai.ai_code_review_id = r.ai_code_review_id
         WHERE r.workspace_id = ?
           AND r.is_deleted = FALSE
         ORDER BY CASE WHEN r.status = 'OPEN' THEN 0 ELSE 1 END, r.created_at DESC, r.id DESC
        """,
        (rs, rowNum) ->
            new WorkspaceCodeReviewResponse.Summary(
                rs.getLong("id"),
                rs.getLong("workspace_id"),
                toIssueKey(rs.getLong("id")),
                rs.getString("title"),
                rs.getString("status"),
                rs.getLong("author_id"),
                rs.getString("author_name"),
                rs.getString("author_profile_image"),
                inferAuthorRole(rs.getString("title"), rs.getString("file_path")),
                rs.getString("file_path"),
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
               c.body, c.status_label, c.created_at
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
                   COALESCE(u.name, '팀원') AS author_name,
                   CASE
                     WHEN up.profile_image LIKE '/images/profiles/%' THEN NULL
                     ELSE up.profile_image
                   END AS author_profile_image,
                   r.source_branch, r.target_branch, r.additions, r.deletions,
                   COALESCE(ai.comment_count, 0) AS ai_comment_count,
                   r.ai_code_review_id, r.created_at, r.updated_at
              FROM workspace_code_reviews r
              LEFT JOIN users u ON u.user_id = r.author_id
              LEFT JOIN user_profiles up ON up.user_id = r.author_id
              LEFT JOIN ai_code_reviews ai ON ai.ai_code_review_id = r.ai_code_review_id
             WHERE r.workspace_id = ?
               AND r.id = ?
               AND r.is_deleted = FALSE
            """,
            (rs, rowNum) -> {
              WorkspaceCodeReviewResponse.Summary summary =
                  new WorkspaceCodeReviewResponse.Summary(
                      rs.getLong("id"),
                      rs.getLong("workspace_id"),
                      toIssueKey(rs.getLong("id")),
                      rs.getString("title"),
                      rs.getString("status"),
                      rs.getLong("author_id"),
                      rs.getString("author_name"),
                      rs.getString("author_profile_image"),
                      inferAuthorRole(rs.getString("title"), rs.getString("file_path")),
                      rs.getString("file_path"),
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
                  rs.getString("diff_text"));
            },
            workspaceId,
            reviewId);

    if (rows.isEmpty()) {
      throw new CustomException(ErrorCode.REVIEW_PULL_REQUEST_NOT_FOUND);
    }

    return rows.get(0);
  }

  private void ensureSchema() {
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
        "CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_workspace ON workspace_code_reviews(workspace_id, status, created_at DESC)");
    jdbcTemplate.execute(
        "CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_ai ON workspace_code_reviews(ai_code_review_id)");
    jdbcTemplate.execute(
        """
        CREATE TABLE IF NOT EXISTS workspace_code_review_comments (
            id bigserial PRIMARY KEY,
            review_id bigint NOT NULL,
            workspace_id bigint NOT NULL,
            author_id bigint NOT NULL,
            body text NOT NULL,
            status_label varchar(50) NOT NULL DEFAULT 'Commented',
            is_deleted boolean NOT NULL DEFAULT false,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
        """);
    jdbcTemplate.execute(
        "CREATE INDEX IF NOT EXISTS ix_workspace_code_review_comments_review ON workspace_code_review_comments(workspace_id, review_id, created_at ASC)");
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
    if (!StringUtils.hasText(value)) {
      return null;
    }

    return value.trim();
  }

  private String toIssueKey(Long id) {
    return "#DP-" + String.format("%02d", id);
  }

  private String inferAuthorRole(String title, String filePath) {
    String haystack = ((title == null ? "" : title) + " " + (filePath == null ? "" : filePath)).toLowerCase();

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
      String diffText) {}
}
