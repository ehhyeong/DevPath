-- ddl-auto=validate 환경은 서버 배포 전에 실행한다. 기존 알림은 이동 경로를 유지한다.
ALTER TABLE learner_notification ADD target_path VARCHAR(1024);
