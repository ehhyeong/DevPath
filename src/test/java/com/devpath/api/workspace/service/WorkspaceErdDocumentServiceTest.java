package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceErdResponse;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class WorkspaceErdDocumentServiceTest {

  @Mock private JdbcTemplate jdbcTemplate;
  @Mock private WorkspaceService workspaceService;

  private WorkspaceErdDocumentService service;

  @BeforeEach
  void setUp() {
    service = new WorkspaceErdDocumentService(jdbcTemplate, workspaceService);
  }

  @Test
  @SuppressWarnings("unchecked")
  void getRecentChangesChecksWorkspaceAccessBeforeQueryingVersions() {
    long workspaceId = 12L;
    long userId = 7L;
    WorkspaceErdResponse.Version version =
        new WorkspaceErdResponse.Version(
            31L,
            workspaceId,
            2,
            "erDiagram\n",
            "{\"tables\":[]}",
            "Add users table",
            userId,
            "Kim",
            51L,
            LocalDateTime.of(2026, 9, 4, 10, 30));
    when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(workspaceId)))
        .thenReturn(List.of(version));

    List<WorkspaceErdResponse.Version> result = service.getRecentChanges(workspaceId, userId);

    assertThat(result).containsExactly(version);
    verify(workspaceService).getWorkspaceDashboard(workspaceId, userId);
  }
}
