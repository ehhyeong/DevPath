-- ddl-auto=validate 환경에서는 서버 배포 전에 실행한다. 기존 카드의 연결은 미지정으로 유지한다.
ALTER TABLE workspace_task ADD COLUMN IF NOT EXISTS mvp_feature_ids TEXT;
