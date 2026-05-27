package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
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
public class WorkspaceErdService {

  private static final String EMPTY_SCHEMA_JSON = "{\"tables\":[],\"relationships\":[]}";
  private static final String EMPTY_MERMAID_CODE = "erDiagram\n";

  private final JdbcTemplate jdbcTemplate;
  private final WorkspaceService workspaceService;

  @Transactional
  public WorkspaceErdResponse.Document getDocument(Long workspaceId, Long userId) {
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    ensureDocumentExists(workspaceId, userId);

    DocumentRow row = findDocumentRow(workspaceId);
    ensureVersionExists(row, userId, "Initial ERD snapshot", null);
    return toDocument(row, dashboard);
  }

  @Transactional
  public WorkspaceErdResponse.Document saveDocument(
      Long workspaceId, Long userId, WorkspaceErdRequest.Save request) {
    WorkspaceDashboardResponse dashboard =
        workspaceService.getWorkspaceDashboard(workspaceId, userId);
    ensureDocumentExists(workspaceId, userId);

    DocumentRow current = findDocumentRow(workspaceId);
    int nextVersion = current.version() + 1;
    String summary = defaultText(request.changeSummary(), "ERD updated");
    Long discussionMessageId = insertDiscussionMessage(workspaceId, userId, nextVersion, summary);

    jdbcTemplate.update(
        """
        UPDATE workspace_erd_documents
           SET mermaid_code = ?,
               schema_json = ?,
               version = ?,
               updated_by_id = ?,
               updated_at = now()
         WHERE workspace_id = ?
        """,
        request.mermaidCode().trim(),
        defaultText(request.schemaJson(), EMPTY_SCHEMA_JSON),
        nextVersion,
        userId,
        workspaceId);

    DocumentRow saved = findDocumentRow(workspaceId);
    insertVersionSnapshot(saved, summary, discussionMessageId);
    return toDocument(saved, dashboard);
  }

  @Transactional
  public List<WorkspaceErdResponse.Version> getVersions(Long workspaceId, Long userId) {
    workspaceService.getWorkspaceDashboard(workspaceId, userId);
    ensureDocumentExists(workspaceId, userId);
    ensureVersionExists(findDocumentRow(workspaceId), userId, "Initial ERD snapshot", null);

    return jdbcTemplate.query(
        """
        SELECT v.version_id, v.workspace_id, v.version, v.mermaid_code, v.schema_json,
               v.summary, v.updated_by_id, COALESCE(u.name, 'Unknown') AS updated_by_name,
               v.discussion_message_id, v.created_at
          FROM workspace_erd_versions v
          LEFT JOIN users u ON u.user_id = v.updated_by_id
         WHERE v.workspace_id = ?
         ORDER BY v.version DESC
        """,
        (rs, rowNum) ->
            new WorkspaceErdResponse.Version(
                rs.getLong("version_id"),
                rs.getLong("workspace_id"),
                rs.getInt("version"),
                rs.getString("mermaid_code"),
                rs.getString("schema_json"),
                rs.getString("summary"),
                rs.getLong("updated_by_id"),
                rs.getString("updated_by_name"),
                nullableLong(rs.getObject("discussion_message_id")),
                toLocalDateTime(rs.getTimestamp("created_at"))),
        workspaceId);
  }

  public List<WorkspaceErdResponse.Version> getRecentChanges(Long workspaceId, Long userId) {
    workspaceService.getWorkspaceDashboard(workspaceId, userId);

    return jdbcTemplate.query(
        """
        SELECT v.version_id, v.workspace_id, v.version, v.mermaid_code, v.schema_json,
               v.summary, v.updated_by_id, COALESCE(u.name, 'Unknown') AS updated_by_name,
               v.discussion_message_id, v.created_at
          FROM workspace_erd_versions v
          LEFT JOIN users u ON u.user_id = v.updated_by_id
         WHERE v.workspace_id = ?
           AND v.version > 1
         ORDER BY v.created_at DESC
         LIMIT 3
        """,
        (rs, rowNum) ->
            new WorkspaceErdResponse.Version(
                rs.getLong("version_id"),
                rs.getLong("workspace_id"),
                rs.getInt("version"),
                rs.getString("mermaid_code"),
                rs.getString("schema_json"),
                rs.getString("summary"),
                rs.getLong("updated_by_id"),
                rs.getString("updated_by_name"),
                nullableLong(rs.getObject("discussion_message_id")),
                toLocalDateTime(rs.getTimestamp("created_at"))),
        workspaceId);
  }

  @Transactional
  public WorkspaceErdResponse.Version getVersion(Long workspaceId, Integer version, Long userId) {
    return getVersions(workspaceId, userId).stream()
        .filter(item -> item.version().equals(version))
        .findFirst()
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
  }

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

  private void ensureDocumentExists(Long workspaceId, Long userId) {
    jdbcTemplate.update(
        """
        INSERT INTO workspace_erd_documents (
            workspace_id, mermaid_code, schema_json, version, updated_by_id, created_at, updated_at
        )
        VALUES (?, ?, ?, 1, ?, now(), now())
        ON CONFLICT (workspace_id) DO NOTHING
        """,
        workspaceId,
        EMPTY_MERMAID_CODE,
        EMPTY_SCHEMA_JSON,
        userId);
  }

  private WorkspaceErdResponse.Document toDocument(
      DocumentRow row, WorkspaceDashboardResponse dashboard) {
    return new WorkspaceErdResponse.Document(
        row.workspaceId(),
        dashboard.getName(),
        row.mermaidCode(),
        row.schemaJson(),
        row.version(),
        row.updatedById(),
        row.updatedByName(),
        row.updatedAt(),
        dashboard.getMembers());
  }

  private DocumentRow findDocumentRow(Long workspaceId) {
    return jdbcTemplate.queryForObject(
        """
        SELECT d.workspace_id, d.mermaid_code, d.schema_json, d.version,
               d.updated_by_id, COALESCE(u.name, 'Unknown') AS updated_by_name, d.updated_at
          FROM workspace_erd_documents d
          LEFT JOIN users u ON u.user_id = d.updated_by_id
         WHERE d.workspace_id = ?
        """,
        (rs, rowNum) ->
            new DocumentRow(
                rs.getLong("workspace_id"),
                rs.getString("mermaid_code"),
                rs.getString("schema_json"),
                rs.getInt("version"),
                rs.getLong("updated_by_id"),
                rs.getString("updated_by_name"),
                toLocalDateTime(rs.getTimestamp("updated_at"))),
        workspaceId);
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

  private void ensureVersionExists(
      DocumentRow row, Long userId, String summary, Long discussionMessageId) {
    Integer count =
        jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
              FROM workspace_erd_versions
             WHERE workspace_id = ?
               AND version = ?
            """,
            Integer.class,
            row.workspaceId(),
            row.version());

    if (count != null && count > 0) {
      return;
    }

    insertVersionSnapshot(
        new DocumentRow(
            row.workspaceId(),
            row.mermaidCode(),
            row.schemaJson(),
            row.version(),
            row.updatedById() == null ? userId : row.updatedById(),
            row.updatedByName(),
            row.updatedAt()),
        summary,
        discussionMessageId);
  }

  private void insertVersionSnapshot(DocumentRow row, String summary, Long discussionMessageId) {
    jdbcTemplate.update(
        """
        INSERT INTO workspace_erd_versions (
            workspace_id, version, mermaid_code, schema_json, summary,
            updated_by_id, discussion_message_id, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, now())
        ON CONFLICT (workspace_id, version) DO NOTHING
        """,
        row.workspaceId(),
        row.version(),
        row.mermaidCode(),
        row.schemaJson(),
        defaultText(summary, "ERD updated"),
        row.updatedById(),
        discussionMessageId);
  }

  private Long insertDiscussionMessage(
      Long workspaceId, Long userId, Integer version, String summary) {
    return jdbcTemplate.queryForObject(
        """
        INSERT INTO lounge_chat_messages (
            lounge_id, sender_id, content, is_deleted, created_at, updated_at
        )
        VALUES (?, ?, ?, FALSE, now(), now())
        RETURNING lounge_chat_message_id
        """,
        Long.class,
        workspaceId,
        userId,
        "ERD v" + version + " saved: " + summary);
  }

  private String defaultText(String value, String fallback) {
    return StringUtils.hasText(value) ? value.trim() : fallback;
  }

  private LocalDateTime toLocalDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }

  private Long nullableLong(Object value) {
    return value instanceof Number number ? number.longValue() : null;
  }

  private record DocumentRow(
      Long workspaceId,
      String mermaidCode,
      String schemaJson,
      Integer version,
      Long updatedById,
      String updatedByName,
      LocalDateTime updatedAt) {}
}
