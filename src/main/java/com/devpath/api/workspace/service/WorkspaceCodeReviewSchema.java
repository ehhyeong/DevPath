package com.devpath.api.workspace.service;

import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.jdbc.core.JdbcTemplate;

public final class WorkspaceCodeReviewSchema {

  private static final Object LOCK = new Object();
  private static final AtomicBoolean READY = new AtomicBoolean(false);

  private WorkspaceCodeReviewSchema() {}

  public static void ensure(JdbcTemplate jdbcTemplate) {
    if (READY.get()) {
      return;
    }

    synchronized (LOCK) {
      if (READY.get()) {
        return;
      }

      createSchema(jdbcTemplate);
      READY.set(true);
    }
  }

  private static void createSchema(JdbcTemplate jdbcTemplate) {
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
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_provider varchar(50)");
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_id varchar(220)");
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_author_name varchar(120)");
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_author_avatar_url varchar(1000)");
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_reviews ADD COLUMN IF NOT EXISTS external_updated_at timestamp");
    jdbcTemplate.execute(
        "CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_external ON workspace_code_reviews(workspace_id, external_provider, external_id)");
    jdbcTemplate.execute(
        """
        CREATE TABLE IF NOT EXISTS workspace_code_review_files (
            id bigserial PRIMARY KEY,
            review_id bigint NOT NULL,
            workspace_id bigint NOT NULL,
            file_path varchar(500) NOT NULL,
            diff_text text NOT NULL,
            additions integer NOT NULL DEFAULT 0,
            deletions integer NOT NULL DEFAULT 0,
            change_type varchar(50) NOT NULL DEFAULT 'modified',
            display_order integer NOT NULL DEFAULT 0,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
        """);
    jdbcTemplate.execute(
        "CREATE INDEX IF NOT EXISTS ix_workspace_code_review_files_review ON workspace_code_review_files(workspace_id, review_id, display_order ASC, id ASC)");
    jdbcTemplate.execute(
        """
        CREATE TABLE IF NOT EXISTS workspace_code_review_comments (
            id bigserial PRIMARY KEY,
            review_id bigint NOT NULL,
            workspace_id bigint NOT NULL,
            author_id bigint NOT NULL,
            file_path varchar(500),
            body text NOT NULL,
            status_label varchar(50) NOT NULL DEFAULT 'Commented',
            is_deleted boolean NOT NULL DEFAULT false,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
        """);
    jdbcTemplate.execute(
        "ALTER TABLE workspace_code_review_comments ADD COLUMN IF NOT EXISTS file_path varchar(500)");
    jdbcTemplate.execute(
        "CREATE INDEX IF NOT EXISTS ix_workspace_code_review_comments_review ON workspace_code_review_comments(workspace_id, review_id, created_at ASC)");
  }
}
