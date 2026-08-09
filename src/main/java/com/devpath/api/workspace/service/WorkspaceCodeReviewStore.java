package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceCodeReviewResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import jakarta.annotation.PostConstruct;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

@Repository
@RequiredArgsConstructor
class WorkspaceCodeReviewStore {

  private final JdbcTemplate jdbcTemplate;

  @PostConstruct
  void initializeSchema() {
    ensureSchema();
  }

  void ensureSchema() {
    WorkspaceCodeReviewSchema.ensure(jdbcTemplate);
  }

  Long createReview(
      Long workspaceId,
      Long authorId,
      String title,
      String description,
      String prUrl,
      String filePath,
      String diffText,
      String sourceBranch,
      String targetBranch,
      int additions,
      int deletions) {
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
          statement.setString(2, title);
          statement.setString(3, description);
          statement.setString(4, prUrl);
          statement.setString(5, filePath);
          statement.setString(6, diffText);
          statement.setString(7, sourceBranch);
          statement.setString(8, targetBranch);
          statement.setLong(9, authorId);
          statement.setInt(10, additions);
          statement.setInt(11, deletions);
          return statement;
        },
        keyHolder);

    Number key = keyHolder.getKey();
    if (key == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    insertFileDiff(
        workspaceId, key.longValue(), filePath, diffText, additions, deletions, "manual", 0);
    return key.longValue();
  }

  void attachAiReview(Long workspaceId, Long reviewId, Long aiReviewId, String selectedFilePath) {
    jdbcTemplate.update(
        """
        UPDATE workspace_code_reviews
           SET ai_code_review_id = ?,
               file_path = ?,
               updated_at = now()
         WHERE id = ?
           AND workspace_id = ?
           AND is_deleted = FALSE
        """,
        aiReviewId,
        selectedFilePath,
        reviewId,
        workspaceId);
  }

  Long createDemoAiReview(Long userId, String title, String diffText, String summary) {
    Long aiReviewId =
        jdbcTemplate.queryForObject(
            """
            INSERT INTO ai_code_reviews (
                requester_id, pull_request_submission_id, title, diff_text, summary,
                comment_count, provider_name, is_deleted, created_at, updated_at
            )
            VALUES (?, NULL, ?, ?, ?, 3, 'GEMINI_FALLBACK', FALSE, now(), now())
            RETURNING ai_code_review_id
            """,
            Long.class,
            userId,
            title,
            diffText,
            summary);

    if (aiReviewId == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
    return aiReviewId;
  }

  void insertDemoAiReviewComment(
      Long aiReviewId,
      String category,
      Integer lineNumber,
      String title,
      String message,
      String suggestion) {
    jdbcTemplate.update(
        """
        INSERT INTO ai_review_comments (
            ai_code_review_id, category, line_number, title, message, suggestion,
            status, decided_at, is_deleted, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NULL, FALSE, now(), now())
        """,
        aiReviewId,
        category,
        lineNumber,
        title,
        message,
        suggestion);
  }

  void insertMemberComment(
      Long workspaceId, Long reviewId, Long authorId, String filePath, String body) {
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
        authorId,
        filePath,
        body);
  }

  void updateStatus(Long workspaceId, Long reviewId, String status) {
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
  }

  List<WorkspaceCodeReviewResponse.Summary> findSummaries(Long workspaceId) {
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
        (rs, rowNum) -> toSummary(rs), workspaceId);
  }

  DetailRow findDetailRow(Long workspaceId, Long reviewId) {
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
              WorkspaceCodeReviewResponse.Summary summary = toSummary(rs);
              return new DetailRow(
                  summary,
                  rs.getString("external_provider"),
                  rs.getString("external_id"),
                  rs.getString("description"),
                  rs.getString("pr_url"),
                  rs.getString("diff_text"),
                  findFiles(
                      workspaceId, reviewId, rs.getString("file_path"), rs.getString("diff_text")));
            },
            workspaceId,
            reviewId);

    if (rows.isEmpty()) {
      throw new CustomException(ErrorCode.REVIEW_PULL_REQUEST_NOT_FOUND);
    }
    return rows.get(0);
  }

  List<WorkspaceCodeReviewResponse.MemberComment> findComments(Long workspaceId, Long reviewId) {
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

  private WorkspaceCodeReviewResponse.Summary toSummary(java.sql.ResultSet resultSet)
      throws java.sql.SQLException {
    return new WorkspaceCodeReviewResponse.Summary(
        resultSet.getLong("id"),
        resultSet.getLong("workspace_id"),
        toIssueKey(
            resultSet.getLong("id"),
            resultSet.getString("external_provider"),
            resultSet.getString("external_id")),
        resultSet.getString("title"),
        resultSet.getString("status"),
        resultSet.getLong("author_id"),
        resultSet.getString("author_name"),
        resultSet.getString("author_profile_image"),
        inferAuthorRole(resultSet.getString("title"), resultSet.getString("file_path")),
        resultSet.getString("file_path"),
        resultSet.getInt("file_count"),
        resultSet.getString("source_branch"),
        resultSet.getString("target_branch"),
        resultSet.getInt("additions"),
        resultSet.getInt("deletions"),
        resultSet.getInt("ai_comment_count"),
        getNullableLong(resultSet.getObject("ai_code_review_id")),
        toLocalDateTime(resultSet.getTimestamp("created_at")),
        toLocalDateTime(resultSet.getTimestamp("updated_at")));
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
    return StringUtils.hasText(value) ? value.trim() : fallback;
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
    return value instanceof Number number ? number.longValue() : null;
  }

  private LocalDateTime toLocalDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }

  private record LineStats(int additions, int deletions) {}

  record DetailRow(
      WorkspaceCodeReviewResponse.Summary summary,
      String externalProvider,
      String externalId,
      String description,
      String prUrl,
      String diffText,
      List<WorkspaceCodeReviewResponse.FileDiff> files) {}
}
