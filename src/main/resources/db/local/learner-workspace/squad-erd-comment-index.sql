CREATE INDEX IF NOT EXISTS idx_workspace_erd_comments_target
    ON workspace_erd_comments(workspace_id, target_type, target_id, created_at ASC);
