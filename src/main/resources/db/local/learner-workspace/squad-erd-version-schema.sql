CREATE TABLE IF NOT EXISTS workspace_erd_versions (
    version_id bigserial PRIMARY KEY,
    workspace_id bigint NOT NULL,
    version integer NOT NULL,
    mermaid_code text NOT NULL,
    schema_json text NOT NULL,
    summary varchar(500),
    updated_by_id bigint,
    discussion_message_id bigint,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT workspace_erd_versions_unique UNIQUE (workspace_id, version)
);
