package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceCodeReviewRequest;
import com.devpath.api.workspace.dto.WorkspaceCodeReviewResponse;
import com.devpath.api.workspace.dto.WorkspaceDashboardResponse;
import com.devpath.domain.ai.service.CodeReviewAssistant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspaceCodeReviewServiceTest {

  @Mock private WorkspaceService workspaceService;
  @Mock private CodeReviewAssistant codeReviewAssistant;

  private EmbeddedDatabase database;
  private WorkspaceCodeReviewService service;

  @BeforeEach
  void setUp() {
    database =
        new EmbeddedDatabaseBuilder()
            .generateUniqueName(true)
            .setType(EmbeddedDatabaseType.H2)
            .build();
    JdbcTemplate jdbcTemplate = new JdbcTemplate(database);
    createJoinedTables(jdbcTemplate);
    resetSchemaReadyState();
    WorkspaceCodeReviewStore codeReviewStore = new WorkspaceCodeReviewStore(jdbcTemplate);
    codeReviewStore.initializeSchema();
    service =
        new WorkspaceCodeReviewService(
            codeReviewStore,
            workspaceService,
            new WorkspaceCodeReviewAiReviewer(codeReviewStore, codeReviewAssistant));
  }

  @AfterEach
  void tearDown() {
    database.shutdown();
  }

  @Test
  void createReviewRequestStoresDiffStatsAndReturnsDetail() {
    long workspaceId = 7L;
    long userId = 3L;
    WorkspaceDashboardResponse dashboard =
        WorkspaceDashboardResponse.builder()
            .workspaceId(workspaceId)
            .name("Backend Squad")
            .members(List.of())
            .build();
    when(workspaceService.getWorkspaceDashboard(workspaceId, userId)).thenReturn(dashboard);

    WorkspaceCodeReviewResponse.Detail result =
        service.createReviewRequest(
            workspaceId,
            userId,
            new WorkspaceCodeReviewRequest.Create(
                " 인증 흐름 리뷰 ",
                "예외 처리 확인",
                null,
                "src/AuthService.java",
                null,
                null,
                """
                --- a/src/AuthService.java
                +++ b/src/AuthService.java
                -return oldToken;
                +return newToken;
                 context
                """));

    assertThat(result.summary().title()).isEqualTo("인증 흐름 리뷰");
    assertThat(result.summary().status()).isEqualTo("OPEN");
    assertThat(result.summary().sourceBranch()).isEqualTo("feature/manual-review");
    assertThat(result.summary().targetBranch()).isEqualTo("main");
    assertThat(result.summary().additions()).isEqualTo(1);
    assertThat(result.summary().deletions()).isEqualTo(1);
    assertThat(result.files()).hasSize(1);
    assertThat(result.files().getFirst().filePath()).isEqualTo("src/AuthService.java");
    assertThat(result.comments()).isEmpty();
  }

  private void createJoinedTables(JdbcTemplate jdbcTemplate) {
    jdbcTemplate.execute(
        "CREATE TABLE users (user_id bigint PRIMARY KEY, name varchar(120) NOT NULL)");
    jdbcTemplate.execute(
        "CREATE TABLE user_profiles (user_id bigint PRIMARY KEY, profile_image varchar(1000))");
    jdbcTemplate.execute(
        "CREATE TABLE ai_code_reviews (ai_code_review_id bigint PRIMARY KEY, comment_count integer NOT NULL DEFAULT 0)");
    jdbcTemplate.execute("INSERT INTO users (user_id, name) VALUES (3, 'Reviewer')");
  }

  private void resetSchemaReadyState() {
    AtomicBoolean ready =
        (AtomicBoolean) ReflectionTestUtils.getField(WorkspaceCodeReviewSchema.class, "READY");
    if (ready != null) {
      ready.set(false);
    }
  }
}
