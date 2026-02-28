-- 1. 권한(Role) 기초 데이터 (이미 존재하는 role_name이면 무시)
INSERT INTO roles (role_name, description) VALUES ('ROLE_LEARNER', '일반 학습자') ON CONFLICT (role_name) DO NOTHING;
INSERT INTO roles (role_name, description) VALUES ('ROLE_INSTRUCTOR', '로드맵을 등록할 수 있는 강사') ON CONFLICT (role_name) DO NOTHING;
INSERT INTO roles (role_name, description) VALUES ('ROLE_ADMIN', '시스템 관리자') ON CONFLICT (role_name) DO NOTHING;

-- 2. 테스트 유저(User) 데이터 (이미 존재하는 email이면 무시)
INSERT INTO users (email, password, name, is_active, created_at, updated_at)
VALUES ('test@devpath.com', '1234', '테스트학생', true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, name, is_active, created_at, updated_at)
VALUES ('admin@devpath.com', 'admin1234', '관리자갓태형', true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;

-- 3. 태그(Tag) 기초 데이터 (이미 존재하는 name이면 무시)
INSERT INTO tags (name) VALUES ('Java') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Spring Boot') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('React') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('MySQL') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Docker') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Python') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Node.js') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('PostgreSQL') ON CONFLICT (name) DO NOTHING;