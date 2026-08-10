package com.devpath.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class LocalLearnerWorkspaceNormalizerTest {

  @Mock private JdbcTemplate jdbcTemplate;
  @Mock private PasswordEncoder passwordEncoder;

  @Test
  void runExecutesWorkspaceNormalizationSqlInRequiredOrder() {
    when(jdbcTemplate.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class)))
        .thenReturn(List.of());
    LocalSeedSqlExecutor seedSqlExecutor = new LocalSeedSqlExecutor(jdbcTemplate);
    LocalLearnerWorkspaceNormalizer normalizer =
        new LocalLearnerWorkspaceNormalizer(jdbcTemplate, passwordEncoder, seedSqlExecutor);

    normalizer.run();

    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate, times(19)).execute(sqlCaptor.capture());
    List<String> statements = sqlCaptor.getAllValues();

    assertThat(statements.get(0)).contains("INSERT INTO workspace");
    assertThat(statements.get(1)).contains("UPDATE workspace workspace");
    assertThat(statements.get(2)).contains("ALTER TABLE workspace_member");
    assertThat(statements.get(3)).contains("INSERT INTO workspace_member");
    assertThat(statements.get(4)).contains("workspace_task_status_check");
    assertThat(statements.get(5)).contains("메인 화면 반응형 UI 리빌딩");
    assertThat(statements.get(6)).contains("DB ERD 설계 리뷰");
    assertThat(statements.get(7)).contains("CREATE TABLE IF NOT EXISTS workspace_code_reviews");
    assertThat(statements.get(8)).contains("feat: 카카오 소셜 로그인 OAuth2 연동 및 JWT 발급 추가");
    assertThat(statements.get(9)).contains("CREATE TABLE IF NOT EXISTS workspace_erd_documents");
    assertThat(statements.get(10)).contains("CREATE TABLE IF NOT EXISTS workspace_erd_versions");
    assertThat(statements.get(11)).contains("idx_workspace_erd_versions_workspace");
    assertThat(statements.get(12)).contains("CREATE TABLE IF NOT EXISTS workspace_erd_comments");
    assertThat(statements.get(13)).contains("idx_workspace_erd_comments_target");
    assertThat(statements.get(14)).contains("DELETE FROM workspace_hub_project");
    assertThat(statements.get(15)).contains("DELETE FROM mentorings mentoring");
    assertThat(statements.get(16)).contains("INSERT INTO mentoring_posts");
    assertThat(statements.get(17)).contains("assignment.backend.api@devpath.com");
    assertThat(statements.get(18)).contains("team.frontend.ui@devpath.com");
  }
}
