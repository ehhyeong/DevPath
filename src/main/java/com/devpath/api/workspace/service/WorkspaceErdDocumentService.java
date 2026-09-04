package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.api.workspace.dto.WorkspaceErdRequest;
import com.devpath.api.workspace.dto.WorkspaceErdResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceErdDocumentService {

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
    return queryVersions(workspaceId);
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
        (rs, rowNum) -> mapVersion(rs),
        workspaceId);
  }

  @Transactional
  public WorkspaceErdResponse.Version getVersion(Long workspaceId, Integer version, Long userId) {
    return getVersions(workspaceId, userId).stream()
        .filter(item -> item.version().equals(version))
        .findFirst()
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
  }

  private List<WorkspaceErdResponse.Version> queryVersions(Long workspaceId) {
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
        (rs, rowNum) -> mapVersion(rs),
        workspaceId);
  }

  private WorkspaceErdResponse.Version mapVersion(java.sql.ResultSet resultSet)
      throws java.sql.SQLException {
    return new WorkspaceErdResponse.Version(
        resultSet.getLong("version_id"),
        resultSet.getLong("workspace_id"),
        resultSet.getInt("version"),
        resultSet.getString("mermaid_code"),
        resultSet.getString("schema_json"),
        resultSet.getString("summary"),
        resultSet.getLong("updated_by_id"),
        resultSet.getString("updated_by_name"),
        nullableLong(resultSet.getObject("discussion_message_id")),
        toLocalDateTime(resultSet.getTimestamp("created_at")));
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
