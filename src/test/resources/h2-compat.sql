CREATE ALIAS IF NOT EXISTS PG_GET_SERIAL_SEQUENCE FOR "com.devpath.support.H2SequenceFunctions.pgGetSerialSequence";
CREATE ALIAS IF NOT EXISTS SETVAL FOR "com.devpath.support.H2SequenceFunctions.setval";
CREATE ALIAS IF NOT EXISTS ENSURE_BOOLEAN_FLAG_DEFAULTS FOR "com.devpath.support.H2SchemaFunctions.ensureBooleanFlagDefaults";
CALL ENSURE_BOOLEAN_FLAG_DEFAULTS();

CREATE TABLE IF NOT EXISTS workspace_erd_documents (
    workspace_id BIGINT PRIMARY KEY,
    mermaid_code TEXT NOT NULL,
    schema_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_by_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_erd_versions (
    version_id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    version INTEGER NOT NULL,
    mermaid_code TEXT NOT NULL,
    schema_json TEXT NOT NULL,
    summary VARCHAR(500),
    updated_by_id BIGINT,
    discussion_message_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT workspace_erd_versions_unique UNIQUE (workspace_id, version)
);

CREATE INDEX IF NOT EXISTS idx_workspace_erd_versions_workspace
    ON workspace_erd_versions(workspace_id, version DESC);

CREATE TABLE IF NOT EXISTS workspace_erd_comments (
    comment_id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id VARCHAR(200) NOT NULL,
    target_label VARCHAR(200),
    author_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_erd_comments_target
    ON workspace_erd_comments(workspace_id, target_type, target_id, created_at ASC);
