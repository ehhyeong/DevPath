CREATE TABLE IF NOT EXISTS workspace_erd_comments (
    comment_id bigserial PRIMARY KEY,
    workspace_id bigint NOT NULL,
    target_type varchar(30) NOT NULL,
    target_id varchar(200) NOT NULL,
    target_label varchar(200),
    author_id bigint NOT NULL,
    body text NOT NULL,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
