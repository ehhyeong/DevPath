ALTER TABLE workspace_member
    ADD COLUMN IF NOT EXISTS position_label VARCHAR(80);

ALTER TABLE workspace_member
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP(6);

ALTER TABLE mentoring_applications
    ADD COLUMN IF NOT EXISTS desired_position VARCHAR(80);
