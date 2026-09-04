package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class WorkspaceErdCommentServiceTest {

  @Mock private JdbcTemplate jdbcTemplate;
  @Mock private WorkspaceService workspaceService;

  private WorkspaceErdCommentService service;

  @BeforeEach
  void setUp() {
    service = new WorkspaceErdCommentService(jdbcTemplate, workspaceService);
  }

  @Test
  void deleteCommentRejectsNonAuthorAfterCheckingWorkspaceAccess() {
    long workspaceId = 12L;
    long userId = 7L;
    long commentId = 31L;
    when(jdbcTemplate.update(anyString(), eq(workspaceId), eq(commentId), eq(userId)))
        .thenReturn(0);

    assertThatThrownBy(() -> service.deleteComment(workspaceId, userId, commentId))
        .isInstanceOf(CustomException.class)
        .extracting(exception -> ((CustomException) exception).getErrorCode())
        .isEqualTo(ErrorCode.UNAUTHORIZED_ACTION);
    verify(workspaceService).getWorkspaceDashboard(workspaceId, userId);
  }
}
