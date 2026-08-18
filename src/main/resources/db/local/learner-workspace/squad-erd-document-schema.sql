CREATE TABLE IF NOT EXISTS workspace_erd_documents (
    workspace_id bigint PRIMARY KEY,
    mermaid_code text NOT NULL,
    schema_json text NOT NULL,
    version integer NOT NULL DEFAULT 1,
    updated_by_id bigint,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
