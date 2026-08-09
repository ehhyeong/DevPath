CREATE INDEX IF NOT EXISTS idx_workspace_erd_versions_workspace
    ON workspace_erd_versions(workspace_id, version DESC);
