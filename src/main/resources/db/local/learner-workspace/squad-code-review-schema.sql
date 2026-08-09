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
);

CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_workspace
    ON workspace_code_reviews(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_ai
    ON workspace_code_reviews(ai_code_review_id);

CREATE TABLE IF NOT EXISTS workspace_code_review_comments (
    id bigserial PRIMARY KEY,
    review_id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    author_id bigint NOT NULL,
    body text NOT NULL,
    status_label varchar(50) NOT NULL DEFAULT 'Commented',
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_workspace_code_review_comments_review
    ON workspace_code_review_comments(workspace_id, review_id, created_at ASC);
