-- 1. 권한(Role) 기초 데이터
INSERT INTO roles (role_name, description) VALUES ('ROLE_LEARNER', '일반 학습자');
INSERT INTO roles (role_name, description) VALUES ('ROLE_INSTRUCTOR', '로드맵을 등록할 수 있는 강사');
INSERT INTO roles (role_name, description) VALUES ('ROLE_ADMIN', '시스템 관리자');

-- 2. 테스트 유저(User) 데이터 (비밀번호는 임시로 1234)
INSERT INTO users (email, password, name, is_active, created_at, updated_at)
VALUES ('test@devpath.com', '1234', '테스트학생', true, NOW(), NOW());

INSERT INTO users (email, password, name, is_active, created_at, updated_at)
VALUES ('admin@devpath.com', 'admin1234', '관리자갓태형', true, NOW(), NOW());

-- 3. 태그(Tag) 기초 데이터
INSERT INTO tags (name) VALUES ('Java');
INSERT INTO tags (name) VALUES ('Spring Boot');
INSERT INTO tags (name) VALUES ('React');
INSERT INTO tags (name) VALUES ('MySQL');
INSERT INTO tags (name) VALUES ('Docker');