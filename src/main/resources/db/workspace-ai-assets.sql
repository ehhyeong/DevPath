ALTER TABLE workspace_ai_design
    ADD COLUMN IF NOT EXISTS assets_initialized BOOLEAN NOT NULL DEFAULT FALSE;
