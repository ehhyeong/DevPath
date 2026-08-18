INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
SELECT learner.user_id, '배달비 절약 플랫폼',
       '위치 기반 실시간 공동 구매 매칭 서비스 MVP 개발',
       'SQUAD', 'ACTIVE', FALSE,
       CURRENT_DATE - 4 + TIME '15:00', CURRENT_DATE - 4 + TIME '15:00'
FROM users learner
WHERE learner.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM workspace
      WHERE owner_id = learner.user_id
        AND name = '배달비 절약 플랫폼'
  );

INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
SELECT mentor.user_id, '대용량 트래픽 커머스 서버',
       '공통 과제형 멘토링으로 Spring Boot와 Redis를 활용한 선착순 쿠폰 시스템을 구현하는 워크스페이스',
       'MENTORING', 'ACTIVE', FALSE,
       CURRENT_DATE - 2 + TIME '09:00', CURRENT_DATE - 2 + TIME '09:00'
FROM users mentor
WHERE mentor.email = 'mentor.backend@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM workspace
      WHERE name = '대용량 트래픽 커머스 서버'
        AND type = 'MENTORING'
        AND COALESCE(is_deleted, FALSE) = FALSE
  );

INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
SELECT mentor.user_id, 'Next.js 블로그 플랫폼 구축',
       '팀 프로젝트형 멘토링으로 역할을 나누어 Next.js 블로그 플랫폼을 완성하는 워크스페이스',
       'MENTORING', 'ACTIVE', FALSE,
       CURRENT_DATE - 1 + TIME '09:00', CURRENT_DATE - 1 + TIME '09:00'
FROM users mentor
WHERE mentor.email = 'mentor.frontend@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM workspace
      WHERE name = 'Next.js 블로그 플랫폼 구축'
        AND type = 'MENTORING'
        AND COALESCE(is_deleted, FALSE) = FALSE
  );
