-- 1. 권한(Role) 기초 데이터 (기존 유지)
INSERT INTO roles (role_name, description) VALUES ('ROLE_LEARNER', '일반 학습자') ON CONFLICT (role_name) DO NOTHING;
INSERT INTO roles (role_name, description) VALUES ('ROLE_INSTRUCTOR', '로드맵을 등록할 수 있는 강사') ON CONFLICT (role_name) DO NOTHING;
INSERT INTO roles (role_name, description) VALUES ('ROLE_ADMIN', '시스템 관리자') ON CONFLICT (role_name) DO NOTHING;

-- 2. 테스트 유저(User) 데이터
INSERT INTO users (email, password, name, is_active, created_at, updated_at)
VALUES ('test@devpath.com', '1234', '테스트학생', true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;

-- 관리자 계정 (Spring Security 로그인을 위해 'admin1234'를 BCrypt로 암호화한 해시값 적용)
INSERT INTO users (email, password, name, is_active, created_at, updated_at)
VALUES ('admin@devpath.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HCGKKG.u.A3L.T.M/Tq1m', '관리자갓태형', true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;

-- 3. 태그(Tag) 기초 데이터 (기존 태그 + 카테고리와 오피셜 여부 추가)
INSERT INTO tags (name, category, is_official) VALUES ('Java', 'Backend', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('Spring Boot', 'Backend', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('JPA', 'Backend', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('React', 'Frontend', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('MySQL', 'Database', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('PostgreSQL', 'Database', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('Redis', 'Database', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('Docker', 'DevOps', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('Python', 'Backend', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('Node.js', 'Backend', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('TypeScript', 'Frontend', TRUE) ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name, category, is_official) VALUES ('Tailwind CSS', 'Frontend', TRUE) ON CONFLICT (name) DO NOTHING;

-- 4. 오피셜 마스터 로드맵 등록 (admin@devpath.com 유저의 ID를 서브쿼리로 찾아 매핑)
INSERT INTO roadmaps (author_id, title, description, is_public, is_deleted, created_at, updated_at)
SELECT u.user_id, '백엔드 마스터 로드맵', 'Java와 Spring Boot를 기초부터 실무까지 마스터하는 DevPath 공식 로드맵입니다.', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users u WHERE u.email = 'admin@devpath.com'
               AND NOT EXISTS (SELECT 1 FROM roadmaps WHERE title = '백엔드 마스터 로드맵');

-- 5. 로드맵 세부 노드(RoadmapNode) 등록 (생성된 로드맵 ID를 동적으로 매핑)
INSERT INTO roadmap_nodes (roadmap_id, title, description, order_index)
SELECT r.roadmap_id, 'Java 언어 기초', '변수, 조건문, 반복문, 객체지향 프로그래밍의 기초를 학습합니다.', 1
FROM roadmaps r WHERE r.title = '백엔드 마스터 로드맵'
                  AND NOT EXISTS (SELECT 1 FROM roadmap_nodes WHERE title = 'Java 언어 기초');

INSERT INTO roadmap_nodes (roadmap_id, title, description, order_index)
SELECT r.roadmap_id, 'Spring Boot 핵심', '스프링 부트의 동작 원리와 DI/IoC, 기본 어노테이션을 학습합니다.', 2
FROM roadmaps r WHERE r.title = '백엔드 마스터 로드맵'
                  AND NOT EXISTS (SELECT 1 FROM roadmap_nodes WHERE title = 'Spring Boot 핵심');

INSERT INTO roadmap_nodes (roadmap_id, title, description, order_index)
SELECT r.roadmap_id, 'Spring Data JPA', 'ORM의 개념과 JPA, 엔티티 매핑, 양방향 연관관계를 학습합니다.', 3
FROM roadmaps r WHERE r.title = '백엔드 마스터 로드맵'
                  AND NOT EXISTS (SELECT 1 FROM roadmap_nodes WHERE title = 'Spring Data JPA');

INSERT INTO roadmap_nodes (roadmap_id, title, description, order_index)
SELECT r.roadmap_id, '보안 및 JWT', 'Spring Security와 JWT 토큰을 활용한 인증/인가 시스템을 구축합니다.', 4
FROM roadmaps r WHERE r.title = '백엔드 마스터 로드맵'
                  AND NOT EXISTS (SELECT 1 FROM roadmap_nodes WHERE title = '보안 및 JWT');

-- 6. 노드 간 선행 조건(Prerequisite) 세팅
INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'Java 언어 기초' AND n2.title = 'Spring Boot 핵심'
  AND NOT EXISTS (SELECT 1 FROM prerequisites p WHERE p.node_id = n2.node_id AND p.pre_node_id = n1.node_id);

INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'Spring Boot 핵심' AND n2.title = 'Spring 단 Data JPA'
  AND NOT EXISTS (SELECT 1 FROM prerequisites p WHERE p.node_id = n2.node_id AND p.pre_node_id = n1.node_id);

INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'Spring 단 Data JPA' AND n2.title = '보안 및 JWT'
  AND NOT EXISTS (SELECT 1 FROM prerequisites p WHERE p.node_id = n2.node_id AND p.pre_node_id = n1.node_id);