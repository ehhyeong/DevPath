package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceErdRequest;
import com.devpath.api.workspace.dto.WorkspaceErdResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceErdCommentService {

  private final JdbcTemplate jdbcTemplate;
  private final WorkspaceService workspaceService;

  public List<WorkspaceErdResponse.Comment> getComments(
      Long workspaceId, Long userId, String targetType, String targetId) {
    workspaceService.getWorkspaceDashboard(workspaceId, userId);

    List<Object> args = new ArrayList<>();
    args.add(workspaceId);

    StringBuilder sql =
        new StringBuilder(
            """
            SELECT c.comment_id, c.workspace_id, c.target_type, c.target_id, c.target_label,
                   c.author_id, COALESCE(u.name, 'Unknown') AS author_name, c.body, c.created_at
              FROM workspace_erd_comments c
              LEFT JOIN users u ON u.user_id = c.author_id
             WHERE c.workspace_id = ?
               AND c.is_deleted = FALSE
            """);

    if (StringUtils.hasText(targetType)) {
      sql.append(" AND c.target_type = ?");
      args.add(targetType.trim().toUpperCase());
    }

    if (StringUtils.hasText(targetId)) {
      sql.append(" AND c.target_id = ?");
      args.add(targetId.trim());
    }

    sql.append(" ORDER BY c.created_at ASC");

    return jdbcTemplate.query(
        sql.toString(),
        (rs, rowNum) ->
            new WorkspaceErdResponse.Comment(
                rs.getLong("comment_id"),
                rs.getLong("workspace_id"),
                rs.getString("target_type"),
                rs.getString("target_id"),
                rs.getString("target_label"),
                rs.getLong("author_id"),
                rs.getString("author_name"),
                rs.getString("body"),
                rs.getLong("author_id") == userId,
                toLocalDateTime(rs.getTimestamp("created_at"))),
        args.toArray());
  }

  @Transactional
  public WorkspaceErdResponse.Comment createComment(
      Long workspaceId, Long userId, WorkspaceErdRequest.CommentCreate request) {
    workspaceService.getWorkspaceDashboard(workspaceId, userId);

    Long commentId =
        jdbcTemplate.queryForObject(
            """
            INSERT INTO workspace_erd_comments (
                workspace_id, target_type, target_id, target_label, author_id, body,
                is_deleted, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, FALSE, now(), now())
            RETURNING comment_id
            """,
            Long.class,
            workspaceId,
            request.targetType().trim().toUpperCase(),
            request.targetId().trim(),
            defaultText(request.targetLabel(), request.targetId().trim()),
            userId,
            request.body().trim());

    return findComment(workspaceId, userId, commentId);
  }

  @Transactional
  public void deleteComment(Long workspaceId, Long userId, Long commentId) {
    workspaceService.getWorkspaceDashboard(workspaceId, userId);

    int updated =
        jdbcTemplate.update(
            """
            UPDATE workspace_erd_comments
               SET is_deleted = TRUE,
                   updated_at = now()
             WHERE workspace_id = ?
               AND comment_id = ?
               AND author_id = ?
               AND is_deleted = FALSE
            """,
            workspaceId,
            commentId,
            userId);

    if (updated == 0) {
      throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
    }
  }

  private WorkspaceErdResponse.Comment findComment(
      Long workspaceId, Long viewerId, Long commentId) {
    List<WorkspaceErdResponse.Comment> comments =
        jdbcTemplate.query(
            """
            SELECT c.comment_id, c.workspace_id, c.target_type, c.target_id, c.target_label,
                   c.author_id, COALESCE(u.name, 'Unknown') AS author_name, c.body, c.created_at
              FROM workspace_erd_comments c
              LEFT JOIN users u ON u.user_id = c.author_id
             WHERE c.workspace_id = ?
               AND c.comment_id = ?
               AND c.is_deleted = FALSE
            """,
            (rs, rowNum) ->
                new WorkspaceErdResponse.Comment(
                    rs.getLong("comment_id"),
                    rs.getLong("workspace_id"),
                    rs.getString("target_type"),
                    rs.getString("target_id"),
                    rs.getString("target_label"),
                    rs.getLong("author_id"),
                    rs.getString("author_name"),
                    rs.getString("body"),
                    rs.getLong("author_id") == viewerId,
                    toLocalDateTime(rs.getTimestamp("created_at"))),
            workspaceId,
            commentId);

    return comments.stream()
        .findFirst()
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
  }

  private String defaultText(String value, String fallback) {
    return StringUtils.hasText(value) ? value.trim() : fallback;
  }

  private LocalDateTime toLocalDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }
}
