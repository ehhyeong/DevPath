-- ============================================================
-- DevPath 개발 환경 시드 데이터
--
-- 이 파일은 서버 기동 시 자동으로 실행된다 (spring.sql.init.mode=always).
-- 모든 INSERT는 WHERE NOT EXISTS 조건이 붙어 있어 중복 실행해도 안전하다.
--
-- [주의] 이 파일에 없는 데이터(강의, 수강생 등)는 환경마다 다를 수 있다.
--        팀원 간 데이터를 맞추려면 이 파일에 추가해야 한다.
--
-- 섹션 순서:
--   1. Roles         - 권한 (LEARNER / INSTRUCTOR / ADMIN)
--   2. Users         - 기본 계정 3개 (learner / instructor / admin)
--   3. User Profiles - 강사·관리자 프로필
--   4. Tags          - 기술 스택 태그
--   5. Roadmaps      - 공식 로드맵 및 노드
--   6. Courses       - 샘플 강의 5개 (PUBLISHED 2, DRAFT 2, IN_REVIEW 1)
--   7. Course 부속 데이터 (섹션·강의·목표·태그 등)
--   8. Enrollments   - 수강 신청 샘플
--   9. QnA           - 질문·답변 샘플
--  10. Reviews       - 수강평 샘플
-- ============================================================

-- ============================================================
-- 1. Roles
-- ============================================================
INSERT INTO roles (role_name, description)
SELECT 'ROLE_LEARNER', 'General learner'
WHERE NOT EXISTS (
    SELECT 1
    FROM roles
    WHERE role_name = 'ROLE_LEARNER'
);

INSERT INTO roles (role_name, description)
SELECT 'ROLE_INSTRUCTOR', 'Can create and manage courses'
WHERE NOT EXISTS (
    SELECT 1
    FROM roles
    WHERE role_name = 'ROLE_INSTRUCTOR'
);

INSERT INTO roles (role_name, description)
SELECT 'ROLE_ADMIN', 'System administrator'
WHERE NOT EXISTS (
    SELECT 1
    FROM roles
    WHERE role_name = 'ROLE_ADMIN'
);

-- ============================================================
-- 2. Users  (비밀번호: devpath1234)
-- ============================================================
INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'learner@devpath.com',
    '$2a$10$lEubudcVnsxZ6EAO3.joFOPndlLjv9.bi5FcO4z59a74fCMjqZA.O',
    '김하늘',
    'ROLE_LEARNER',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'learner@devpath.com'
);

INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'instructor@devpath.com',
    '$2a$10$xh6.EW/FRzJBWfxqpdXh2uTVoepPhUxQRUH5OEwk90IpYeKjegkj.',
    '홍지훈',
    'ROLE_INSTRUCTOR',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'instructor@devpath.com'
);

INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'admin@devpath.com',
    '$2a$10$xh6.EW/FRzJBWfxqpdXh2uTVoepPhUxQRUH5OEwk90IpYeKjegkj.',
    '박서연',
    'ROLE_ADMIN',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'admin@devpath.com'
);

UPDATE users
SET password = '$2a$10$xh6.EW/FRzJBWfxqpdXh2uTVoepPhUxQRUH5OEwk90IpYeKjegkj.'
WHERE email IN ('learner@devpath.com', 'instructor@devpath.com');

UPDATE users
SET password = '$2a$10$lEubudcVnsxZ6EAO3.joFOPndlLjv9.bi5FcO4z59a74fCMjqZA.O'
WHERE email = 'admin@devpath.com';

-- ============================================================
-- 3. User Profiles
-- ============================================================
INSERT INTO user_profiles (
    user_id,
    profile_image,
    channel_name,
    bio,
    phone,
    github_url,
    blog_url,
    is_public,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    NULL,
    '홍지훈 백엔드 연구소',
    'Spring Boot와 Security를 실전 중심으로 가르치는 강사입니다.',
    '010-0000-0001',
    'https://github.com/instructor-hong',
    'https://blog.devpath.com/hong',
    TRUE,
    NOW(),
    NOW()
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.user_id = u.user_id
  );

INSERT INTO user_profiles (
    user_id,
    profile_image,
    channel_name,
    bio,
    phone,
    github_url,
    blog_url,
    is_public,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    NULL,
    'DevPath 관리자',
    'DevPath 플랫폼 운영과 학습 경험 개선을 담당하고 있습니다.',
    '010-0000-0002',
    'https://github.com/admin-park',
    'https://blog.devpath.com/admin',
    TRUE,
    NOW(),
    NOW()
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.user_id = u.user_id
  );

UPDATE user_profiles up
SET
    profile_image = NULL,
    channel_name = '홍지훈 백엔드 연구소',
    bio = 'Spring Boot와 Security를 실전 중심으로 가르치는 강사입니다.',
    github_url = 'https://github.com/instructor-hong',
    blog_url = 'https://blog.devpath.com/hong',
    is_public = TRUE,
    updated_at = NOW()
FROM users u
WHERE up.user_id = u.user_id
  AND u.email = 'instructor@devpath.com';

UPDATE user_profiles up
SET
    profile_image = NULL,
    channel_name = 'DevPath 관리자',
    bio = 'DevPath 플랫폼 운영과 학습 경험 개선을 담당하고 있습니다.',
    github_url = 'https://github.com/admin-park',
    blog_url = 'https://blog.devpath.com/admin',
    is_public = TRUE,
    updated_at = NOW()
FROM users u
WHERE up.user_id = u.user_id
  AND u.email = 'admin@devpath.com';

-- ============================================================
-- 4. Tags
-- ============================================================
INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Java', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Java'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Spring Boot', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Spring Boot'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'JPA', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'JPA'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Spring Security', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Spring Security'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'HTTP', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'HTTP'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'PostgreSQL', 'Database', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'PostgreSQL'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Redis', 'Database', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Redis'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Docker', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Docker'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'React', 'Frontend', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'React'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'TypeScript', 'Frontend', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'TypeScript'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Python', 'AI', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Python'
);

-- ============================================================
-- 5. Roadmaps & Nodes
-- ============================================================
INSERT INTO roadmaps (creator_id, title, description, is_official, is_public, is_deleted, created_at)
SELECT
    u.user_id,
    'Backend Master Roadmap',
    'Official DevPath roadmap covering Java, Spring Boot, JPA, security, and deployment.',
    TRUE,
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmaps
      WHERE title = 'Backend Master Roadmap'
  );

UPDATE roadmaps
SET info_title = '백엔드 개발이란 무엇인가요?',
    info_content = $$<div class="p-6 text-sm text-gray-700 leading-relaxed space-y-6">
  <div>
    <p class="mb-2"><span class="font-bold text-gray-900">백엔드 개발</span>은 웹 개발의 서버 측 부분을 의미하며, 서버 로직, 데이터베이스 및 API를 생성하고 관리하는 데 중점을 둡니다.</p>
    <p>사용자 인증, 권한 부여 및 사용자 요청 처리를 포함하며, 일반적으로 <span class="font-bold text-gray-800 bg-yellow-100 px-1 rounded">Python, Java, Ruby, PHP, JavaScript(Node.js) 및 .NET</span> 과 같은 백엔드 개발 언어를 사용합니다.</p>
  </div>
  <div>
    <strong class="block text-gray-900 text-base mb-2">👨‍💻 백엔드 개발자는 무슨 일을 하나요?</strong>
    <p class="mb-4">백엔드 개발자는 웹 애플리케이션의 서버 측 구성 요소를 개발하고 유지 관리하는 데 집중합니다. 주로 <strong>서버 측 API 개발, 데이터베이스 운영 처리</strong>, 그리고 백엔드 시스템이 많은 트래픽을 효율적으로 처리할 수 있도록 보장하는 역할을 담당합니다.</p>
    <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <strong class="block text-[#00C471] mb-2"><i class="fas fa-check-circle mr-1"></i> 주요 업무</strong>
      <ul class="list-disc pl-5 space-y-1 text-gray-600">
        <li><strong>외부 서비스 통합:</strong> 결제 게이트웨이 및 클라우드 서비스와 같은 외부 서비스 통합</li>
        <li><strong>성능 최적화:</strong> 시스템 성능 및 확장성(Scalability) 향상</li>
        <li><strong>데이터 보안:</strong> 데이터 처리 및 보안에 매우 중요한 역할을 수행</li>
        <li><strong>협업 지원:</strong> 프론트엔드 개발자가 원활한 사용자 경험을 제공할 수 있도록 지원하는 핵심 역할</li>
      </ul>
    </div>
  </div>
</div>$$
WHERE title = 'Backend Master Roadmap';

INSERT INTO roadmaps (creator_id, title, description, is_official, is_public, is_deleted, created_at)
SELECT
    u.user_id,
    'Frontend Entry Roadmap',
    'Starter roadmap for React, TypeScript, and UI fundamentals.',
    TRUE,
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmaps
      WHERE title = 'Frontend Entry Roadmap'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'Java Basics',
    'Learn variables, control flow, loops, and object-oriented basics.',
    'CONCEPT',
    1
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE roadmap_id = r.roadmap_id
        AND title = 'Java Basics'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'HTTP Fundamentals',
    'Understand HTTP methods, status codes, headers, and REST basics.',
    'CONCEPT',
    2
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE roadmap_id = r.roadmap_id
        AND title = 'HTTP Fundamentals'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'Spring Boot Basics',
    'Understand DI, IoC, and the core annotations used in Spring Boot.',
    'CONCEPT',
    3
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE roadmap_id = r.roadmap_id
        AND title = 'Spring Boot Basics'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'Spring Data JPA',
    'Learn ORM, entity mapping, and repository-based persistence.',
    'CONCEPT',
    4
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE roadmap_id = r.roadmap_id
        AND title = 'Spring Data JPA'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'Security and JWT',
    'Build authentication and authorization flows with Spring Security and JWT.',
    'CONCEPT',
    5
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE roadmap_id = r.roadmap_id
        AND title = 'Security and JWT'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'Docker Deployment Basics',
    'Package and run backend services with Docker and compose.',
    'PRACTICE',
    6
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE roadmap_id = r.roadmap_id
        AND title = 'Docker Deployment Basics'
  );

INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'Java Basics'
  AND n2.title = 'HTTP Fundamentals'
  AND NOT EXISTS (
      SELECT 1
      FROM prerequisites p
      WHERE p.node_id = n2.node_id
        AND p.pre_node_id = n1.node_id
  );

INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'HTTP Fundamentals'
  AND n2.title = 'Spring Boot Basics'
  AND NOT EXISTS (
      SELECT 1
      FROM prerequisites p
      WHERE p.node_id = n2.node_id
        AND p.pre_node_id = n1.node_id
  );

INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'Spring Boot Basics'
  AND n2.title = 'Spring Data JPA'
  AND NOT EXISTS (
      SELECT 1
      FROM prerequisites p
      WHERE p.node_id = n2.node_id
        AND p.pre_node_id = n1.node_id
  );

INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'Spring Data JPA'
  AND n2.title = 'Security and JWT'
  AND NOT EXISTS (
      SELECT 1
      FROM prerequisites p
      WHERE p.node_id = n2.node_id
        AND p.pre_node_id = n1.node_id
  );

INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'Security and JWT'
  AND n2.title = 'Docker Deployment Basics'
  AND NOT EXISTS (
      SELECT 1
      FROM prerequisites p
      WHERE p.node_id = n2.node_id
        AND p.pre_node_id = n1.node_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT n.node_id, t.tag_id
FROM roadmap_nodes n, tags t
WHERE n.title = 'Java Basics'
  AND t.name = 'Java'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags req
      WHERE req.node_id = n.node_id
        AND req.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT n.node_id, t.tag_id
FROM roadmap_nodes n, tags t
WHERE n.title = 'Spring Boot Basics'
  AND t.name = 'Spring Boot'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags req
      WHERE req.node_id = n.node_id
        AND req.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT n.node_id, t.tag_id
FROM roadmap_nodes n, tags t
WHERE n.title = 'Spring Data JPA'
  AND t.name = 'JPA'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags req
      WHERE req.node_id = n.node_id
        AND req.tag_id = t.tag_id
  );

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u, tags t
WHERE u.email = 'learner@devpath.com'
  AND t.name = 'Java'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u, tags t
WHERE u.email = 'learner@devpath.com'
  AND t.name = 'HTTP'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u, tags t
WHERE u.email = 'instructor@devpath.com'
  AND t.name = 'Spring Boot'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u, tags t
WHERE u.email = 'instructor@devpath.com'
  AND t.name = 'JPA'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u, tags t
WHERE u.email = 'instructor@devpath.com'
  AND t.name = 'Docker'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );


-- ============================================================
-- 6. Courses  (총 5개)
--    - PUBLISHED  : Spring Boot Intro, React Dashboard Sprint
--    - IN_REVIEW  : 스프링 부트 3.0 완전 정복
--    - DRAFT      : JPA Practical Design, 제목 없는 강의 (초안)
--
-- [주의] 이 파일에 정의된 강의만 모든 환경에서 동일하게 존재한다.
--        로컬 DB에 직접 추가한 강의는 이 파일에도 추가해야 팀원과 맞춰진다.
-- ============================================================
INSERT INTO courses (
    instructor_id,
    title,
    subtitle,
    description,
    thumbnail_url,
    intro_video_url,
    video_asset_key,
    duration_seconds,
    price,
    original_price,
    currency,
    difficulty_level,
    language,
    has_certificate,
    status,
    published_at
)
SELECT
    u.user_id,
    'Spring Boot Intro',
    'Fast path to practical API development',
    'Backend starter course covering Spring Boot, JPA, and security basics.',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    '/videos/trailers/spring-boot.mp4',
    'assets/courses/trailers/spring-boot.mp4',
    55200,
    99000,
    129000,
    'KRW',
    'BEGINNER',
    'ko',
    TRUE,
    'PUBLISHED',
    NOW()
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses
      WHERE title = 'Spring Boot Intro'
  );

INSERT INTO courses (
    instructor_id,
    title,
    subtitle,
    description,
    thumbnail_url,
    intro_video_url,
    video_asset_key,
    duration_seconds,
    price,
    original_price,
    currency,
    difficulty_level,
    language,
    has_certificate,
    status,
    published_at
)
SELECT
    u.user_id,
    'JPA Practical Design',
    'Entity design to query optimization',
    'Practical JPA patterns and performance optimization techniques.',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    '/videos/trailers/jpa.mp4',
    'assets/courses/trailers/jpa.mp4',
    110,
    129000,
    99000,
    'KRW',
    'INTERMEDIATE',
    'ko',
    TRUE,
    'DRAFT',
    NULL
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses
      WHERE title = 'JPA Practical Design'
  );

INSERT INTO courses (
    instructor_id,
    title,
    subtitle,
    description,
    thumbnail_url,
    intro_video_url,
    video_asset_key,
    duration_seconds,
    price,
    original_price,
    currency,
    difficulty_level,
    language,
    has_certificate,
    status,
    published_at
)
SELECT
    u.user_id,
    'React Dashboard Sprint',
    'Build analytics dashboards with React',
    'Frontend course focused on React dashboard layouts, reusable widgets, and product-ready charts.',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    '/videos/trailers/react-dashboard.mp4',
    'assets/courses/trailers/react-dashboard.mp4',
    88,
    79000,
    109000,
    'KRW',
    'INTERMEDIATE',
    'ko',
    TRUE,
    'PUBLISHED',
    NOW()
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses
      WHERE title = 'React Dashboard Sprint'
  );

INSERT INTO courses (
    instructor_id,
    title,
    subtitle,
    description,
    thumbnail_url,
    intro_video_url,
    video_asset_key,
    duration_seconds,
    price,
    original_price,
    currency,
    difficulty_level,
    language,
    has_certificate,
    status,
    published_at
)
SELECT
    u.user_id,
    '스프링 부트 3.0 완전 정복',
    '실무 백엔드 프로젝트를 위한 스프링 부트 집중 과정',
    '심사 중인 강의 예시로 사용하는 스프링 부트 3 기반 백엔드 실전 강의입니다.',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    '/videos/trailers/spring-boot-advanced.mp4',
    'assets/courses/trailers/spring-boot-advanced.mp4',
    28800,
    119000,
    149000,
    'KRW',
    'INTERMEDIATE',
    'ko',
    TRUE,
    'IN_REVIEW',
    TIMESTAMP '2026-01-29 13:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses
      WHERE title = '스프링 부트 3.0 완전 정복'
  );

INSERT INTO courses (
    instructor_id,
    title,
    subtitle,
    description,
    thumbnail_url,
    intro_video_url,
    video_asset_key,
    duration_seconds,
    price,
    original_price,
    currency,
    difficulty_level,
    language,
    has_certificate,
    status,
    published_at
)
SELECT
    u.user_id,
    '제목 없는 강의 (초안)',
    '초안 강의 카드 표시용 샘플 데이터',
    '강의 관리 화면의 작성 중 카드 예시에 사용하는 초안 강의입니다.',
    NULL,
    NULL,
    NULL,
    0,
    0,
    0,
    'KRW',
    NULL,
    'ko',
    FALSE,
    'DRAFT',
    TIMESTAMP '2026-01-30 11:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses
      WHERE title = '제목 없는 강의 (초안)'
  );

-- ============================================================
-- 7. Course 부속 데이터 (섹션·강의·목표·수강 대상·태그 등)
-- ============================================================
INSERT INTO course_prerequisites (course_id, prerequisite)
SELECT c.course_id, 'Java syntax basics'
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_prerequisites cp
      WHERE cp.course_id = c.course_id
        AND cp.prerequisite = 'Java syntax basics'
  );

INSERT INTO course_prerequisites (course_id, prerequisite)
SELECT c.course_id, 'HTTP fundamentals'
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_prerequisites cp
      WHERE cp.course_id = c.course_id
        AND cp.prerequisite = 'HTTP fundamentals'
  );

INSERT INTO course_job_relevance (course_id, job_relevance)
SELECT c.course_id, 'Backend developer'
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_job_relevance cj
      WHERE cj.course_id = c.course_id
        AND cj.job_relevance = 'Backend developer'
  );

INSERT INTO course_job_relevance (course_id, job_relevance)
SELECT c.course_id, 'Server engineer'
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_job_relevance cj
      WHERE cj.course_id = c.course_id
        AND cj.job_relevance = 'Server engineer'
  );

INSERT INTO course_objectives (course_id, objective_text, display_order)
SELECT c.course_id, 'Build a Spring Boot application from scratch.', 0
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_objectives co
      WHERE co.course_id = c.course_id
        AND co.display_order = 0
  );

INSERT INTO course_objectives (course_id, objective_text, display_order)
SELECT c.course_id, 'Implement CRUD APIs with JPA.', 1
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_objectives co
      WHERE co.course_id = c.course_id
        AND co.display_order = 1
  );

INSERT INTO course_target_audiences (course_id, audience_description, display_order)
SELECT c.course_id, 'Backend job seekers', 0
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_target_audiences cta
      WHERE cta.course_id = c.course_id
        AND cta.display_order = 0
  );

INSERT INTO course_target_audiences (course_id, audience_description, display_order)
SELECT c.course_id, 'Developers new to Spring projects', 1
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_target_audiences cta
      WHERE cta.course_id = c.course_id
        AND cta.display_order = 1
  );

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT c.course_id, 'Spring Core', 'DI, IoC, bean lifecycle basics', 1, TRUE
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_sections cs
      WHERE cs.course_id = c.course_id
        AND cs.sort_order = 1
  );

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT c.course_id, 'JPA Basic Mapping', 'Entity relationships and mapping strategy', 2, TRUE
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_sections cs
      WHERE cs.course_id = c.course_id
        AND cs.sort_order = 2
  );

INSERT INTO lessons (
    section_id,
    title,
    description,
    lesson_type,
    video_url,
    video_asset_key,
    video_provider,
    thumbnail_url,
    duration_seconds,
    is_preview,
    is_published,
    sort_order
)
SELECT
    cs.section_id,
    'Understanding DI and IoC',
    'Understand dependency injection and inversion of control.',
    'VIDEO',
    'https://cdn.devpath.com/lessons/spring-core-1.mp4',
    'asset-spring-boot-001',
    'r2',
    'https://cdn.devpath.com/lessons/thumbnails/spring-core-1.png',
    780,
    TRUE,
    TRUE,
    1
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = 'Spring Boot Intro'
  AND cs.sort_order = 1
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.sort_order = 1
  );

INSERT INTO lessons (
    section_id,
    title,
    description,
    lesson_type,
    video_url,
    video_asset_key,
    video_provider,
    thumbnail_url,
    duration_seconds,
    is_preview,
    is_published,
    sort_order
)
SELECT
    cs.section_id,
    'Bean registration and lifecycle',
    'Learn bean creation and lifecycle callbacks.',
    'VIDEO',
    'https://cdn.devpath.com/lessons/spring-core-2.mp4',
    'asset-spring-boot-002',
    'r2',
    'https://cdn.devpath.com/lessons/thumbnails/spring-core-2.png',
    920,
    FALSE,
    TRUE,
    2
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = 'Spring Boot Intro'
  AND cs.sort_order = 1
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.sort_order = 2
  );

INSERT INTO lessons (
    section_id,
    title,
    description,
    lesson_type,
    video_url,
    video_asset_key,
    video_provider,
    thumbnail_url,
    duration_seconds,
    is_preview,
    is_published,
    sort_order
)
SELECT
    cs.section_id,
    'Entity relationships and mapping',
    'Map one-to-one, one-to-many, and many-to-many relationships.',
    'VIDEO',
    'https://cdn.devpath.com/lessons/jpa-1.mp4',
    'asset-jpa-001',
    'r2',
    'https://cdn.devpath.com/lessons/thumbnails/jpa-1.png',
    1100,
    FALSE,
    TRUE,
    1
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = 'Spring Boot Intro'
  AND cs.sort_order = 2
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.sort_order = 1
  );

INSERT INTO course_materials (lesson_id, material_type, material_url, asset_key, original_file_name, sort_order)
SELECT
    l.lesson_id,
    'SLIDE',
    '/materials/spring-core.pdf',
    'materials/spring-core.pdf',
    'spring-core.pdf',
    0
FROM lessons l
WHERE l.title = 'Understanding DI and IoC'
  AND NOT EXISTS (
      SELECT 1
      FROM course_materials cm
      WHERE cm.lesson_id = l.lesson_id
        AND cm.original_file_name = 'spring-core.pdf'
  );

INSERT INTO course_materials (lesson_id, material_type, material_url, asset_key, original_file_name, sort_order)
SELECT
    l.lesson_id,
    'CODE',
    '/materials/jpa-sample.zip',
    'materials/jpa-sample.zip',
    'jpa-sample.zip',
    0
FROM lessons l
WHERE l.title = 'Entity relationships and mapping'
  AND NOT EXISTS (
      SELECT 1
      FROM course_materials cm
      WHERE cm.lesson_id = l.lesson_id
        AND cm.original_file_name = 'jpa-sample.zip'
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'Spring Boot Intro'
  AND t.name = 'Spring Boot'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'Spring Boot Intro'
  AND t.name = 'Java'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'JPA Practical Design'
  AND t.name = 'JPA'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'JPA Practical Design'
  AND t.name = 'Java'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'JPA Practical Design'
  AND t.name = 'PostgreSQL'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'React Dashboard Sprint'
  AND t.name = 'React'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'React Dashboard Sprint'
  AND t.name = 'TypeScript'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '스프링 부트 3.0 완전 정복'
  AND t.name = 'Spring Boot'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '스프링 부트 3.0 완전 정복'
  AND t.name = 'Java'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '스프링 부트 3.0 완전 정복'
  AND t.name = 'Spring Security'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '제목 없는 강의 (초안)'
  AND t.name = 'Java'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '제목 없는 강의 (초안)'
  AND t.name = 'Spring Boot'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'JWT', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'JWT'
);

INSERT INTO node_required_tags (node_id, tag_id)
SELECT n.node_id, t.tag_id
FROM roadmap_nodes n, tags t
WHERE n.title = 'Security and JWT'
  AND t.name = 'Spring Security'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags req
      WHERE req.node_id = n.node_id
        AND req.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT n.node_id, t.tag_id
FROM roadmap_nodes n, tags t
WHERE n.title = 'Security and JWT'
  AND t.name = 'JWT'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags req
      WHERE req.node_id = n.node_id
        AND req.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT n.node_id, t.tag_id
FROM roadmap_nodes n, tags t
WHERE n.title = 'Docker Deployment Basics'
  AND t.name = 'Docker'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags req
      WHERE req.node_id = n.node_id
        AND req.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'Spring Boot Intro'
  AND t.name = 'Spring Security'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = 'Spring Boot Intro'
  AND t.name = 'JWT'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_announcements (
    course_id,
    announcement_type,
    title,
    content,
    is_pinned,
    display_order,
    published_at,
    exposure_start_at,
    exposure_end_at,
    event_banner_text,
    event_link,
    created_at,
    updated_at
)
SELECT
    c.course_id,
    'EVENT',
    '오프라인 스프링 시큐리티 특강 안내',
    '오프라인 스프링 시큐리티 특강과 Q&A 세션 일정을 안내드립니다.',
    TRUE,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    TIMESTAMP '2099-12-31 23:59:59',
    '3월 오프라인 특강',
    'https://devpath.com/events/security-special',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_announcements ca
      WHERE ca.course_id = c.course_id
        AND ca.title = '오프라인 스프링 시큐리티 특강 안내'
  );

INSERT INTO course_announcements (
    course_id,
    announcement_type,
    title,
    content,
    is_pinned,
    display_order,
    published_at,
    exposure_start_at,
    exposure_end_at,
    event_banner_text,
    event_link,
    created_at,
    updated_at
)
SELECT
    c.course_id,
    'NORMAL',
    '강의 자료 업데이트 안내',
    '스프링 부트 입문 강의의 최신 자료와 예제 파일이 업데이트되었습니다.',
    FALSE,
    1,
    CURRENT_TIMESTAMP,
    NULL,
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_announcements ca
      WHERE ca.course_id = c.course_id
        AND ca.title = '강의 자료 업데이트 안내'
  );

UPDATE course_announcements
SET title = '오프라인 스프링 시큐리티 특강 안내',
    content = '오프라인 스프링 시큐리티 특강과 Q&A 세션 일정을 안내드립니다.',
    event_banner_text = '3월 오프라인 특강'
WHERE title = 'Offline security special event'
   OR title = '오프라인 스프링 시큐리티 특강 안내';

UPDATE course_announcements
SET title = '강의 자료 업데이트 안내',
    content = '스프링 부트 입문 강의의 최신 자료와 예제 파일이 업데이트되었습니다.'
WHERE title = 'Course material update'
   OR title = '강의 자료 업데이트 안내';

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'DEBUGGING', '디버깅 질문',
       '오류나 장애의 원인을 파악하고 싶을 때 사용하는 질문 템플릿입니다.',
       '에러 메시지, 발생 시점, 이미 확인한 내용을 함께 적어주면 빠르게 원인을 좁힐 수 있습니다.',
       1, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'DEBUGGING'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'IMPLEMENTATION', '구현 질문',
       '기능을 구현하는 과정에서 구조나 접근 방식에 대한 도움이 필요할 때 사용하는 템플릿입니다.',
       '만들고 싶은 기능, 현재 설계, 막히는 지점을 구체적으로 적어주세요.',
       2, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'IMPLEMENTATION'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'CODE_REVIEW', '코드 리뷰 질문',
       '코드 품질, 가독성, 트레이드오프에 대한 피드백이 필요할 때 사용하는 템플릿입니다.',
       '관련 코드, 기대 동작, 어떤 피드백이 가장 필요한지 함께 적어주세요.',
       3, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'CODE_REVIEW'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'CAREER', '커리어 질문',
       '학습 방향, 포트폴리오, 직무 준비에 대한 조언이 필요할 때 사용하는 템플릿입니다.',
       '현재 수준, 목표 직무, 다음에 결정하려는 내용을 함께 적어주세요.',
       4, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'CAREER'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'STUDY', '학습 질문',
       '다음 학습 계획이나 복습 방법이 필요할 때 사용하는 템플릿입니다.',
       '현재 공부 중인 주제, 이미 이해한 내용, 원하는 학습 계획을 적어주세요.',
       5, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'STUDY'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'PROJECT', '프로젝트 질문',
       '프로젝트 범위 설정, 구조 설계, 개선 방향이 필요할 때 사용하는 템플릿입니다.',
       '프로젝트 목표, 현재 진행 상황, 검토받고 싶은 결정 포인트를 적어주세요.',
       6, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'PROJECT'
);

-- ===========================

-- ============================================================
-- B SECTION: 기능별 샘플 데이터
-- ============================================================

-- [B-01] 수강평 (review / review_reply / review_report / review_template)
INSERT INTO review (
    course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at
)
SELECT c.course_id, u.user_id, 5,
       '예제가 실무에 바로 연결돼서 좋았고, 설명 흐름도 자연스러워서 끝까지 집중해서 들을 수 있었습니다.',
       'ANSWERED', FALSE, FALSE, '설명_자세해요,예제가_실전적이에요',
       '2026-02-10 10:00:00', '2026-02-10 10:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM review r
      WHERE r.course_id = c.course_id AND r.learner_id = u.user_id
  );

INSERT INTO review (
    course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at
)
SELECT c.course_id, u.user_id, 3,
       '주제 자체는 정말 유용했지만 엔티티 매핑과 fetch 전략 부분은 조금 더 천천히 설명해주셨으면 좋겠습니다.',
       'UNANSWERED', FALSE, FALSE, '조금_빨라요,도식이_더_필요해요',
       '2026-02-12 14:00:00', '2026-02-12 14:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM review r
      WHERE r.course_id = c.course_id AND r.learner_id = u.user_id
  );

INSERT INTO review (
    course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at
)
SELECT c.course_id, u.user_id, 5,
       '대시보드 실습 위주라서 바로 따라 만들 수 있었고, 차트와 레이아웃을 한 번에 정리하기 좋았습니다.',
       'ANSWERED', FALSE, FALSE, '실습_구성이_좋아요,예제가_바로_써먹기_좋아요',
       '2026-02-14 11:30:00', '2026-02-14 11:30:00'
FROM users u, courses c
WHERE u.email = 'learner2@devpath.com'
  AND c.title = 'React Dashboard Sprint'
  AND NOT EXISTS (
      SELECT 1 FROM review r
      WHERE r.course_id = c.course_id AND r.learner_id = u.user_id
  );

INSERT INTO review (
    course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at
)
SELECT c.course_id, u.user_id, 4,
       '차트 옵션 설명은 좋았는데 상태 관리와 API 연결 파트는 조금 더 천천히 짚어주면 더 좋을 것 같습니다.',
       'UNANSWERED', FALSE, FALSE, '상태관리_설명이_더_필요해요,API_연결_보강이_필요해요',
       '2026-02-16 16:20:00', '2026-02-16 16:20:00'
FROM users u, courses c
WHERE u.email = 'learner3@devpath.com'
  AND c.title = 'React Dashboard Sprint'
  AND NOT EXISTS (
      SELECT 1 FROM review r
      WHERE r.course_id = c.course_id AND r.learner_id = u.user_id
  );

INSERT INTO review_reply (
    review_id, instructor_id, content, is_deleted, created_at, updated_at
)
SELECT r.id, iu.user_id,
       '좋은 피드백 감사합니다. 다음 업데이트에서 매핑 다이어그램을 더 보강하고 해당 구간은 조금 더 천천히 설명하겠습니다.',
       FALSE, '2026-02-10 12:00:00', '2026-02-10 12:00:00'
FROM review r, users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND r.course_id = c.course_id
  AND NOT EXISTS (
      SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.is_deleted = FALSE
  );

INSERT INTO review_reply (
    review_id, instructor_id, content, is_deleted, created_at, updated_at
)
SELECT r.id, iu.user_id,
       '좋은 피드백 감사합니다. 차트 구성 실습은 유지하면서 다음 업데이트에서 API 연결과 상태 관리 설명을 더 세분화해두겠습니다.',
       FALSE, '2026-02-14 13:10:00', '2026-02-14 13:10:00'
FROM review r
JOIN users iu ON iu.email = 'instructor@devpath.com'
JOIN users lu ON lu.user_id = r.learner_id
JOIN courses c ON c.course_id = r.course_id
WHERE c.title = 'React Dashboard Sprint'
  AND lu.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.is_deleted = FALSE
  );

INSERT INTO review_report (
    review_id, reporter_id, reason, is_resolved, resolved_by, resolved_at, created_at, updated_at
)
SELECT r.id, au.user_id,
       '표현이 다소 모호해 공개 노출 전에 한 번 더 확인이 필요합니다.',
       FALSE, NULL, NULL, '2026-02-13 09:00:00', '2026-02-13 09:00:00'
FROM review r, users au, courses c
WHERE au.email = 'admin@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND r.course_id = c.course_id
  AND NOT EXISTS (
      SELECT 1 FROM review_report rp WHERE rp.review_id = r.id
  );

INSERT INTO review_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, '감사 인사',
       '정성스러운 리뷰 남겨주셔서 감사합니다. 남겨주신 의견은 다음 개정에 바로 반영하겠습니다.',
       FALSE, '2026-02-01 00:00:00', '2026-02-01 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM review_template rt
      WHERE rt.instructor_id = iu.user_id AND rt.title = '감사 인사'
  );

INSERT INTO review_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, '사과 및 개선 약속',
       '불편을 드려 죄송합니다. 말씀해주신 내용을 확인했고, 강의 개정 목록에 반영해 보충 자료와 함께 정리하겠습니다.',
       FALSE, '2026-02-02 00:00:00', '2026-02-02 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM review_template rt
      WHERE rt.instructor_id = iu.user_id AND rt.title = '사과 및 개선 약속'
  );

INSERT INTO review_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, '학습 가이드 제안',
       '해당 구간이 어렵게 느껴지셨다면 이전 섹션의 보충 강의와 함께 다시 보시면 이해가 훨씬 쉬워집니다. 필요한 자료도 추가로 보완하겠습니다.',
       FALSE, '2026-02-03 00:00:00', '2026-02-03 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM review_template rt
      WHERE rt.instructor_id = iu.user_id AND rt.title = '학습 가이드 제안'
  );

INSERT INTO review_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, '만족 리뷰 답글',
       '좋게 봐주셔서 감사합니다. 앞으로도 실무에 바로 연결되는 예제와 설명으로 더 만족스러운 강의를 만들어가겠습니다.',
       FALSE, '2026-02-04 00:00:00', '2026-02-04 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM review_template rt
      WHERE rt.instructor_id = iu.user_id AND rt.title = '만족 리뷰 답글'
  );

-- [B-02] QnA (질문 / 답변 / 임시저장 / 답변 템플릿)
INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'DEBUGGING', 'EASY',
       'BeanCreationException이 발생할 때 어디부터 확인해야 하나요?',
       '스프링 부트를 실행하면 BeanCreationException이 발생합니다. 어떤 빈부터 확인해야 하고, 원인을 빠르게 좁히는 순서가 궁금합니다.',
       NULL, c.course_id, NULL, 'ANSWERED', 3, FALSE, '2026-02-05 00:00:00', '2026-02-06 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = 'BeanCreationException이 발생할 때 어디부터 확인해야 하나요?'
  );

INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'IMPLEMENTATION', 'MEDIUM',
       'JPA 무한 참조를 안전하게 끊는 방법이 궁금합니다',
       '엔티티를 JSON으로 직렬화하면 양방향 연관관계 때문에 순환 참조가 발생합니다. 가장 안전하게 막는 방법이 무엇인가요?',
       NULL, c.course_id, '00:12:44', 'UNANSWERED', 5, FALSE, '2026-02-08 00:00:00', '2026-02-09 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = 'JPA 무한 참조를 안전하게 끊는 방법이 궁금합니다'
  );

INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'DEBUGGING', 'MEDIUM',
       'application.yml 설정이 반영되지 않는 이유가 궁금합니다',
       'application.yml에서 값을 바꿨는데 실행하면 이전 설정처럼 동작합니다. 프로필 우선순위나 환경 변수 때문에 덮어써지는 상황을 어떻게 확인하면 좋을까요?',
       NULL, c.course_id, '00:04:12', 'UNANSWERED', 2, FALSE, '2026-02-09 10:00:00', '2026-02-09 10:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = 'application.yml 설정이 반영되지 않는 이유가 궁금합니다'
  );

INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'DEBUGGING', 'MEDIUM',
       'SecurityConfig 변경 후 로그인 흐름이 막히는 이유가 궁금합니다',
       'SecurityConfig를 수정한 뒤부터 로그인 페이지 리다이렉트가 꼬이거나 403이 발생합니다. 필터 체인과 permitAll 설정을 어떤 순서로 보면 좋을까요?',
       NULL, c.course_id, '00:15:42', 'UNANSWERED', 4, FALSE, '2026-02-11 09:20:00', '2026-02-11 09:20:00'
FROM users u, courses c
WHERE u.email = 'learner2@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = 'SecurityConfig 변경 후 로그인 흐름이 막히는 이유가 궁금합니다'
  );

INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'IMPLEMENTATION', 'MEDIUM',
       'React Query와 Chart.js 데이터를 같이 관리할 때 구조를 어떻게 나누면 좋을까요?',
       '대시보드 페이지에서 React Query로 받아온 응답을 차트용 데이터로 가공하고 있는데, 컴포넌트가 길어져서 구조를 어떻게 나누는 게 좋은지 궁금합니다.',
       NULL, c.course_id, '00:18:25', 'ANSWERED', 4, FALSE, '2026-02-15 09:30:00', '2026-02-15 10:20:00'
FROM users u, courses c
WHERE u.email = 'learner2@devpath.com'
  AND c.title = 'React Dashboard Sprint'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = 'React Query와 Chart.js 데이터를 같이 관리할 때 구조를 어떻게 나누면 좋을까요?'
  );

INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'DEBUGGING', 'EASY',
       'recharts 툴팁 포맷팅이 렌더링마다 바뀌는 문제를 어떻게 보면 될까요?',
       '같은 데이터인데도 툴팁 숫자 형식이 간헐적으로 달라 보입니다. 포맷 함수를 어디에 두는 게 안전한지 궁금합니다.',
       NULL, c.course_id, '00:27:40', 'UNANSWERED', 2, FALSE, '2026-02-16 19:05:00', '2026-02-16 19:05:00'
FROM users u, courses c
WHERE u.email = 'learner3@devpath.com'
  AND c.title = 'React Dashboard Sprint'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = 'recharts 툴팁 포맷팅이 렌더링마다 바뀌는 문제를 어떻게 보면 될까요?'
  );

INSERT INTO qna_answers (
    question_id, user_id, content, is_adopted, is_deleted, created_at, updated_at
)
SELECT q.question_id, iu.user_id,
       '스택 트레이스에서 가장 아래쪽 원인 메시지부터 확인한 뒤, 설정 클래스, 컴포넌트 스캔 범위, 생성자 의존성을 순서대로 점검해보세요.',
       FALSE, FALSE, '2026-02-06 09:00:00', '2026-02-06 09:00:00'
FROM qna_questions q, users iu
WHERE q.title = 'BeanCreationException이 발생할 때 어디부터 확인해야 하나요?'
  AND iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_answers a WHERE a.question_id = q.question_id AND a.is_deleted = FALSE
  );

INSERT INTO qna_answers (
    question_id, user_id, content, is_adopted, is_deleted, created_at, updated_at
)
SELECT q.question_id, iu.user_id,
       '서버 응답 fetch와 차트 데이터 가공을 한 컴포넌트에 다 넣기보다, 조회 훅과 차트 변환 함수로 분리해두면 읽기와 테스트가 훨씬 쉬워집니다.',
       FALSE, FALSE, '2026-02-15 11:00:00', '2026-02-15 11:00:00'
FROM qna_questions q
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE q.title = 'React Query와 Chart.js 데이터를 같이 관리할 때 구조를 어떻게 나누면 좋을까요?'
  AND NOT EXISTS (
      SELECT 1 FROM qna_answers a WHERE a.question_id = q.question_id AND a.is_deleted = FALSE
  );

INSERT INTO qna_answer_draft (
    question_id, instructor_id, draft_content, is_deleted, saved_at, updated_at
)
SELECT q.question_id, iu.user_id,
       'API 응답은 DTO로 분리하고, 꼭 엔티티를 직접 직렬화해야 할 때만 참조 관련 어노테이션을 제한적으로 사용하는 방식이 가장 안전합니다.',
       FALSE, '2026-02-09 00:00:00', '2026-02-09 00:00:00'
FROM qna_questions q, users iu
WHERE q.title = 'JPA 무한 참조를 안전하게 끊는 방법이 궁금합니다'
  AND iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_answer_draft d
      WHERE d.question_id = q.question_id AND d.instructor_id = iu.user_id AND d.is_deleted = FALSE
  );

INSERT INTO qna_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, '시작 오류 점검 순서',
       '스택 트레이스 순서, 설정 클래스, 환경 변수, 최근 변경한 의존성을 먼저 점검해보세요.',
       FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_template qt
      WHERE qt.instructor_id = iu.user_id AND qt.title = '시작 오류 점검 순서'
  );

INSERT INTO qna_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, '직렬화 및 연관관계 점검 체크리스트',
       '도메인 구조를 바꾸기 전에 쿼리 수, fetch 전략, 엔티티 그래프 사용 여부를 먼저 비교해보세요.',
       FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_template qt
      WHERE qt.instructor_id = iu.user_id AND qt.title = '직렬화 및 연관관계 점검 체크리스트'
  );

INSERT INTO qna_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, '코드 리뷰형 답변',
       '문제 코드와 기대 결과를 기준으로 원인, 수정 포인트, 다시 확인할 항목을 순서대로 정리해보세요.',
       FALSE, '2026-01-11 00:00:00', '2026-01-11 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_template qt
      WHERE qt.instructor_id = iu.user_id AND qt.title = '코드 리뷰형 답변'
  );

-- [B-03] 강사 커뮤니티 (게시글 / 댓글 / 좋아요)
INSERT INTO instructor_post (
    instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at
)
SELECT iu.user_id,
       '[Notice] Weekly live QnA schedule',
       'Every Thursday 20:00 KST. Please post questions in advance.',
       'NOTICE', 1, 2, FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_post ip WHERE ip.title = '[Notice] Weekly live QnA schedule'
  );

INSERT INTO instructor_post (
    instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at
)
SELECT iu.user_id,
       'How to avoid N+1 with JPA',
       'Check fetch joins, entity graphs, and batch size settings before changing repository structure.',
       'GENERAL', 1, 1, FALSE, '2026-01-20 00:00:00', '2026-01-20 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_post ip WHERE ip.title = 'How to avoid N+1 with JPA'
  );

INSERT INTO instructor_comment (
    post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at
)
SELECT ip.id, lu.user_id, NULL,
       'The weekly QnA slot is useful. Please share the agenda early if possible.',
       1, FALSE, '2026-01-16 00:00:00'
FROM instructor_post ip, users lu
WHERE ip.title = '[Notice] Weekly live QnA schedule'
  AND lu.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_comment ic
      WHERE ic.post_id = ip.id AND ic.parent_comment_id IS NULL
        AND ic.content = 'The weekly QnA slot is useful. Please share the agenda early if possible.'
  );

INSERT INTO instructor_comment (
    post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at
)
SELECT ip.id, iu.user_id, parent.id,
       'Got it. I will pin the agenda every Monday morning.',
       0, FALSE, '2026-01-16 09:00:00'
FROM instructor_post ip, users iu, instructor_comment parent
WHERE ip.title = '[Notice] Weekly live QnA schedule'
  AND iu.email = 'instructor@devpath.com'
  AND parent.post_id = ip.id
  AND parent.parent_comment_id IS NULL
  AND parent.content = 'The weekly QnA slot is useful. Please share the agenda early if possible.'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_comment child
      WHERE child.parent_comment_id = parent.id
        AND child.content = 'Got it. I will pin the agenda every Monday morning.'
  );

INSERT INTO instructor_comment (
    post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at
)
SELECT ip.id, lu.user_id, NULL,
       'A side-by-side example of fetch join versus lazy loading would be even better.',
       0, FALSE, '2026-01-21 00:00:00'
FROM instructor_post ip, users lu
WHERE ip.title = 'How to avoid N+1 with JPA'
  AND lu.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_comment ic
      WHERE ic.post_id = ip.id
        AND ic.content = 'A side-by-side example of fetch join versus lazy loading would be even better.'
  );

INSERT INTO instructor_post_like (post_id, user_id, created_at)
SELECT ip.id, lu.user_id, '2026-01-21 10:00:00'
FROM instructor_post ip, users lu
WHERE ip.title = 'How to avoid N+1 with JPA'
  AND lu.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_post_like pl WHERE pl.post_id = ip.id AND pl.user_id = lu.user_id
  );

INSERT INTO instructor_comment_like (comment_id, user_id, created_at)
SELECT ic.id, iu.user_id, '2026-01-16 10:00:00'
FROM instructor_comment ic, users iu
WHERE ic.content = 'The weekly QnA slot is useful. Please share the agenda early if possible.'
  AND iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_comment_like cl WHERE cl.comment_id = ic.id AND cl.user_id = iu.user_id
  );

-- [B-04] 마케팅 (쿠폰 / 프로모션 / 전환 통계)
INSERT INTO coupon (
    instructor_id, coupon_code, coupon_title, discount_type, discount_value, target_course_id,
    max_usage_count, usage_count, expires_at, is_deleted, created_at
)
SELECT iu.user_id, 'HELLO2026', '새해 맞이 할인', 'RATE', 30, NULL,
       100, 45, '2026-05-31 23:59:59', FALSE, '2026-04-01 09:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM coupon cp WHERE cp.coupon_code = 'HELLO2026'
  );

INSERT INTO coupon (
    instructor_id, coupon_code, coupon_title, discount_type, discount_value, target_course_id,
    max_usage_count, usage_count, expires_at, is_deleted, created_at
)
SELECT iu.user_id, 'JAVA_LAUNCH', '자바 실전 과정 기념', 'AMOUNT', 15000, c.course_id,
       200, 82, '2026-06-15 23:59:59', FALSE, '2026-04-05 10:30:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM coupon cp WHERE cp.coupon_code = 'JAVA_LAUNCH'
  );

INSERT INTO promotion (
    instructor_id, course_id, promotion_type, discount_rate, start_at, end_at,
    is_active, is_deleted, created_at
)
SELECT iu.user_id, c.course_id, 'TIME_SALE', 15,
       '2026-04-12 00:00:00', '2026-04-30 23:59:59',
       TRUE, FALSE, '2026-04-12 00:00:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM promotion p WHERE p.course_id = c.course_id AND p.promotion_type = 'TIME_SALE'
  );

INSERT INTO conversion_stat (
    instructor_id, course_id, total_visitors, total_signups, total_purchases, calculated_at
)
SELECT iu.user_id, NULL, 1200, 180, 42, '2026-02-28 23:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM conversion_stat cs
      WHERE cs.instructor_id = iu.user_id AND cs.course_id IS NULL AND cs.calculated_at = '2026-02-28 23:00:00'
  );

INSERT INTO conversion_stat (
    instructor_id, course_id, total_visitors, total_signups, total_purchases, calculated_at
)
SELECT iu.user_id, c.course_id, 700, 120, 33, '2026-02-28 23:00:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM conversion_stat cs
      WHERE cs.instructor_id = iu.user_id AND cs.course_id = c.course_id AND cs.calculated_at = '2026-02-28 23:00:00'
  );

INSERT INTO conversion_stat (
    instructor_id, course_id, total_visitors, total_signups, total_purchases, calculated_at
)
SELECT iu.user_id, c.course_id, 500, 60, 9, '2026-02-28 23:00:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM conversion_stat cs
      WHERE cs.instructor_id = iu.user_id AND cs.course_id = c.course_id AND cs.calculated_at = '2026-02-28 23:00:00'
  );

-- [B-05] 정산·환불 (환불 요청 / 심사 / 정산 / 정산 보류)
INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 99000, 19800, 79200,
       'COMPLETED', FALSE, '2025-08-14 14:20:00', '2025-08-21 11:00:00', '2025-08-21 11:00:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2025-08-14 14:20:00'
  );

INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 79000, 15800, 63200,
       'COMPLETED', FALSE, '2025-09-02 10:05:00', '2025-09-09 14:00:00', '2025-09-09 14:00:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'React Dashboard Sprint'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2025-09-02 10:05:00'
  );

INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 129000, 25800, 103200,
       'COMPLETED', FALSE, '2025-10-11 16:40:00', '2025-10-18 10:30:00', '2025-10-18 10:30:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2025-10-11 16:40:00'
  );

INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 99000, 19800, 79200,
       'COMPLETED', FALSE, '2025-11-23 11:15:00', '2025-11-30 15:00:00', '2025-11-30 15:00:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2025-11-23 11:15:00'
  );

INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 99000, 19800, 79200,
       'COMPLETED', FALSE, '2025-12-18 09:45:00', '2025-12-25 13:20:00', '2025-12-25 13:20:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2025-12-18 09:45:00'
  );

INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 99000, 19800, 79200,
       'COMPLETED', FALSE, '2026-01-20 09:45:00', '2026-01-27 18:30:00', '2026-01-27 18:30:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2026-01-20 09:45:00'
  );

INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 129000, 25800, 103200,
       'PENDING', FALSE, '2026-01-29 14:30:00', NULL, '2026-01-29 14:30:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2026-01-29 14:30:00'
  );

INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 79000, 15800, 63200,
       'PENDING', FALSE, '2026-01-29 12:15:00', NULL, '2026-01-29 12:15:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'React Dashboard Sprint'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2026-01-29 12:15:00'
  );

INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
SELECT iu.user_id, c.course_id, 99000, 19800, 79200,
       'HELD', FALSE, '2026-01-27 18:10:00', NULL, '2026-01-27 18:10:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id
        AND s.course_id = c.course_id
        AND s.purchased_at = '2026-01-27 18:10:00'
  );

INSERT INTO settlement_hold (
    settlement_id, admin_id, reason, held_at
)
SELECT s.id, au.user_id, 'Refund dispute review in progress', '2026-01-28 10:00:00'
FROM settlement s, users au
WHERE s.status = 'HELD'
  AND s.purchased_at = '2026-01-27 18:10:00'
  AND au.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM settlement_hold sh WHERE sh.settlement_id = s.id
  );

INSERT INTO refund_request (
    learner_id, course_id, instructor_id, reason, enrolled_at, progress_percent_snapshot,
    refund_amount, status, is_deleted, requested_at, processed_at
)
SELECT lu.user_id, c.course_id, iu.user_id,
       'I am still within the refund window and the progress is low.',
       '2026-02-26 09:00:00', 10, 99000, 'PENDING', FALSE, '2026-02-27 10:00:00', NULL
FROM users lu, users iu, courses c
WHERE lu.email = 'learner@devpath.com'
  AND iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM refund_request rr
      WHERE rr.learner_id = lu.user_id AND rr.course_id = c.course_id AND rr.status = 'PENDING'
  );

INSERT INTO refund_request (
    learner_id, course_id, instructor_id, reason, enrolled_at, progress_percent_snapshot,
    refund_amount, status, is_deleted, requested_at, processed_at
)
SELECT lu.user_id, c.course_id, iu.user_id,
       'Requested after watching too much content, should be rejected.',
       '2026-02-10 09:00:00', 55, 129000, 'REJECTED', FALSE, '2026-02-20 10:00:00', '2026-02-21 11:00:00'
FROM users lu, users iu, courses c
WHERE lu.email = 'learner@devpath.com'
  AND iu.email = 'instructor@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM refund_request rr
      WHERE rr.learner_id = lu.user_id AND rr.course_id = c.course_id AND rr.status = 'REJECTED'
  );

INSERT INTO refund_review (
    refund_request_id, admin_id, decision, reason, processed_at
)
SELECT rr.id, au.user_id, 'REJECTED',
       'Rejected because progress snapshot exceeded the refundable threshold.',
       '2026-02-21 11:00:00'
FROM refund_request rr, users au
WHERE rr.status = 'REJECTED'
  AND au.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM refund_review rv WHERE rv.refund_request_id = rr.id
  );

-- [B-06] 계정 제한 (이용 제한 / 비활성 / 탈퇴 계정 샘플)
INSERT INTO users (
    email, password, name, role_name, is_active, account_status, created_at, updated_at
)
SELECT 'restricted-user@devpath.com',
       '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
       '정민재', 'ROLE_LEARNER', FALSE, 'RESTRICTED',
       '2026-02-01 00:00:00', '2026-02-15 00:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'restricted-user@devpath.com'
);

INSERT INTO users (
    email, password, name, role_name, is_active, account_status, created_at, updated_at
)
SELECT 'deactivated-user@devpath.com',
       '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
       '오서연', 'ROLE_LEARNER', FALSE, 'DEACTIVATED',
       '2026-02-01 00:00:00', '2026-02-16 00:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'deactivated-user@devpath.com'
);

INSERT INTO users (
    email, password, name, role_name, is_active, account_status, created_at, updated_at
)
SELECT 'withdrawn-user@devpath.com',
       '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
       '강도윤', 'ROLE_LEARNER', FALSE, 'WITHDRAWN',
       '2026-02-01 00:00:00', '2026-02-17 00:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'withdrawn-user@devpath.com'
);

-- [B-07] 운영 (공지사항 / 관리자 권한 / 계정 로그)
INSERT INTO notice (
    author_id, title, content, is_pinned, is_deleted, created_at, updated_at
)
SELECT au.user_id,
       '[System] March maintenance window',
       'The platform will be unavailable from 02:00 to 03:00 KST for maintenance.',
       TRUE, FALSE, '2026-03-01 00:00:00', '2026-03-01 00:00:00'
FROM users au
WHERE au.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM notice n WHERE n.title = '[System] March maintenance window'
  );

INSERT INTO admin_role (
    role_name, description, is_deleted, created_at, updated_at
)
SELECT 'ROLE_ADMIN_OPERATION',
       'Operations role for moderation, notice, settlement, and refund handling',
       FALSE, '2026-03-01 00:00:00', '2026-03-01 00:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM admin_role ar WHERE ar.role_name = 'ROLE_ADMIN_OPERATION' AND ar.is_deleted = FALSE
);

INSERT INTO admin_permission (
    admin_role_id, permission_code, description, is_deleted, created_at
)
SELECT ar.id, 'ADMIN_NOTICE_WRITE', 'Can write and edit notices', FALSE, '2026-03-01 00:00:00'
FROM admin_role ar
WHERE ar.role_name = 'ROLE_ADMIN_OPERATION'
  AND NOT EXISTS (
      SELECT 1 FROM admin_permission ap
      WHERE ap.admin_role_id = ar.id AND ap.permission_code = 'ADMIN_NOTICE_WRITE' AND ap.is_deleted = FALSE
  );

INSERT INTO admin_permission (
    admin_role_id, permission_code, description, is_deleted, created_at
)
SELECT ar.id, 'ADMIN_MODERATION_RESOLVE', 'Can resolve reports and blind content', FALSE, '2026-03-01 00:00:00'
FROM admin_role ar
WHERE ar.role_name = 'ROLE_ADMIN_OPERATION'
  AND NOT EXISTS (
      SELECT 1 FROM admin_permission ap
      WHERE ap.admin_role_id = ar.id AND ap.permission_code = 'ADMIN_MODERATION_RESOLVE' AND ap.is_deleted = FALSE
  );

INSERT INTO account_log (
    target_user_id, admin_id, log_type, reason, processed_at
)
SELECT tu.user_id, au.user_id, 'RESTRICT',
       'Restricted due to repeated abusive comments.',
       '2026-02-15 10:00:00'
FROM users tu, users au
WHERE tu.email = 'restricted-user@devpath.com'
  AND au.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM account_log al
      WHERE al.target_user_id = tu.user_id AND al.log_type = 'RESTRICT'
  );

INSERT INTO account_log (
    target_user_id, admin_id, log_type, reason, processed_at
)
SELECT tu.user_id, au.user_id, 'DEACTIVATE',
       'Temporarily deactivated at user request.',
       '2026-02-16 10:00:00'
FROM users tu, users au
WHERE tu.email = 'deactivated-user@devpath.com'
  AND au.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM account_log al
      WHERE al.target_user_id = tu.user_id AND al.log_type = 'DEACTIVATE'
  );

INSERT INTO account_log (
    target_user_id, admin_id, log_type, reason, processed_at
)
SELECT tu.user_id, au.user_id, 'WITHDRAW',
       'Permanent account withdrawal completed.',
       '2026-02-17 10:00:00'
FROM users tu, users au
WHERE tu.email = 'withdrawn-user@devpath.com'
  AND au.email = 'admin@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM account_log al
      WHERE al.target_user_id = tu.user_id AND al.log_type = 'WITHDRAW'
  );

-- [B-08] 알림·메시지 (강사 알림 / DM 방 / DM 메시지)
INSERT INTO instructor_notification (
    instructor_id, type, message, is_read, created_at
)
SELECT iu.user_id, 'REVIEW',
       'A new course review requires your reply.',
       FALSE, '2026-03-02 09:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_notification n
      WHERE n.instructor_id = iu.user_id AND n.type = 'REVIEW' AND n.message = 'A new course review requires your reply.'
  );

INSERT INTO instructor_notification (
    instructor_id, type, message, is_read, created_at
)
SELECT iu.user_id, 'QNA',
       'A new Q&A question is waiting in your inbox.',
       FALSE, '2026-03-02 09:05:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM instructor_notification n
      WHERE n.instructor_id = iu.user_id AND n.type = 'QNA' AND n.message = 'A new Q&A question is waiting in your inbox.'
  );

INSERT INTO dm_room (
    instructor_id, learner_id, is_deleted, created_at
)
SELECT iu.user_id, lu.user_id, FALSE, '2026-03-03 10:00:00'
FROM users iu, users lu
WHERE iu.email = 'instructor@devpath.com'
  AND lu.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM dm_room dr WHERE dr.instructor_id = iu.user_id AND dr.learner_id = lu.user_id AND dr.is_deleted = FALSE
  );

INSERT INTO dm_message (
    room_id, sender_id, message, is_deleted, created_at
)
SELECT dr.id, lu.user_id,
       'Hi, I have one follow-up question about the Spring Boot example code.',
       FALSE, '2026-03-03 10:01:00'
FROM dm_room dr, users iu, users lu
WHERE dr.instructor_id = iu.user_id
  AND dr.learner_id = lu.user_id
  AND iu.email = 'instructor@devpath.com'
  AND lu.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM dm_message dm
      WHERE dm.room_id = dr.id
        AND dm.message = 'Hi, I have one follow-up question about the Spring Boot example code.'
  );

INSERT INTO dm_message (
    room_id, sender_id, message, is_deleted, created_at
)
SELECT dr.id, iu.user_id,
       'Sure. Send the stack trace and the request payload, and I will help you narrow it down.',
       FALSE, '2026-03-03 10:03:00'
FROM dm_room dr, users iu, users lu
WHERE dr.instructor_id = iu.user_id
  AND dr.learner_id = lu.user_id
  AND iu.email = 'instructor@devpath.com'
  AND lu.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM dm_message dm
      WHERE dm.room_id = dr.id
        AND dm.message = 'Sure. Send the stack trace and the request payload, and I will help you narrow it down.'
  );

-- ========================================
-- B SECTION SEQUENCE FIX
-- ========================================
SELECT setval('review_id_seq', (SELECT COALESCE(MAX(id), 1) FROM review));
SELECT setval('review_reply_id_seq', (SELECT COALESCE(MAX(id), 1) FROM review_reply));
SELECT setval('review_report_id_seq', (SELECT COALESCE(MAX(id), 1) FROM review_report));
SELECT setval('review_template_id_seq', (SELECT COALESCE(MAX(id), 1) FROM review_template));
SELECT setval('qna_questions_question_id_seq', (SELECT COALESCE(MAX(question_id), 1) FROM qna_questions));
SELECT setval('qna_answers_answer_id_seq', (SELECT COALESCE(MAX(answer_id), 1) FROM qna_answers));
SELECT setval('qna_answer_draft_id_seq', (SELECT COALESCE(MAX(id), 1) FROM qna_answer_draft));
SELECT setval('qna_template_id_seq', (SELECT COALESCE(MAX(id), 1) FROM qna_template));
SELECT setval('instructor_post_id_seq', (SELECT COALESCE(MAX(id), 1) FROM instructor_post));
SELECT setval('instructor_comment_id_seq', (SELECT COALESCE(MAX(id), 1) FROM instructor_comment));
SELECT setval('instructor_post_like_id_seq', (SELECT COALESCE(MAX(id), 1) FROM instructor_post_like));
SELECT setval('instructor_comment_like_id_seq', (SELECT COALESCE(MAX(id), 1) FROM instructor_comment_like));
SELECT setval('coupon_id_seq', (SELECT COALESCE(MAX(id), 1) FROM coupon));
SELECT setval('promotion_id_seq', (SELECT COALESCE(MAX(id), 1) FROM promotion));
SELECT setval('conversion_stat_id_seq', (SELECT COALESCE(MAX(id), 1) FROM conversion_stat));
SELECT setval('refund_request_id_seq', (SELECT COALESCE(MAX(id), 1) FROM refund_request));
SELECT setval('refund_review_id_seq', (SELECT COALESCE(MAX(id), 1) FROM refund_review));
SELECT setval('settlement_id_seq', (SELECT COALESCE(MAX(id), 1) FROM settlement));
SELECT setval('settlement_hold_id_seq', (SELECT COALESCE(MAX(id), 1) FROM settlement_hold));
SELECT setval('admin_role_id_seq', (SELECT COALESCE(MAX(id), 1) FROM admin_role));
SELECT setval('admin_permission_id_seq', (SELECT COALESCE(MAX(id), 1) FROM admin_permission));
SELECT setval('account_log_id_seq', (SELECT COALESCE(MAX(id), 1) FROM account_log));
SELECT setval('notice_id_seq', (SELECT COALESCE(MAX(id), 1) FROM notice));
SELECT setval('instructor_notification_id_seq', (SELECT COALESCE(MAX(id), 1) FROM instructor_notification));
SELECT setval('dm_room_id_seq', (SELECT COALESCE(MAX(id), 1) FROM dm_room));
SELECT setval('dm_message_id_seq', (SELECT COALESCE(MAX(id), 1) FROM dm_message));

-- ========================================
-- C SECTION USERS
-- ========================================
INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'learner2@devpath.com',
    '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
    '박지민',
    'ROLE_LEARNER',
    TRUE,
    NOW(),
    TIMESTAMP '2026-01-20 09:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'learner2@devpath.com'
);

INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'learner3@devpath.com',
    '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
    '이서준',
    'ROLE_LEARNER',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'learner3@devpath.com'
);

INSERT INTO review (
    course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at
)
SELECT c.course_id, u.user_id, 2,
       '중반 이후부터 설명 속도가 빨라져서 따라가기 어려웠습니다. 초보자 기준으로 한 번 더 짚어주는 보충 설명이나 요약 자료가 있으면 좋겠습니다.',
       'UNANSWERED', FALSE, FALSE, '속도가_빨라요,초보자에겐_어려워요',
       '2026-02-15 19:30:00', '2026-02-15 19:30:00'
FROM users u, courses c
WHERE u.email = 'learner2@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM review r
      WHERE r.course_id = c.course_id AND r.learner_id = u.user_id
  );

-- ========================================
-- C SECTION STUDY
-- ========================================
INSERT INTO study_group (name, description, status, max_members, is_deleted, created_at)
SELECT
    'Spring Boot API Study Crew',
    'Spring Boot, JPA, Security를 같이 학습하는 모집중 스터디 그룹',
    'RECRUITING',
    5,
    FALSE,
    '2026-03-24 09:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM study_group
    WHERE name = 'Spring Boot API Study Crew'
      AND is_deleted = FALSE
);

INSERT INTO study_group (name, description, status, max_members, is_deleted, created_at)
SELECT
    'Algorithm Deep Dive',
    '모집이 끝나고 진행중인 알고리즘 스터디 그룹',
    'IN_PROGRESS',
    4,
    FALSE,
    '2026-03-20 19:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM study_group
    WHERE name = 'Algorithm Deep Dive'
      AND is_deleted = FALSE
);

-- 현재 스키마에서는 study_group_application 대신 study_group_member.join_status 로 신청/승인/거절을 표현한다.
INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT
    sg.id,
    u.user_id,
    'APPROVED',
    '2026-03-24 09:10:00'
FROM study_group sg, users u
WHERE sg.name = 'Spring Boot API Study Crew'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM study_group_member sgm
      WHERE sgm.group_id = sg.id
        AND sgm.learner_id = u.user_id
  );

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT
    sg.id,
    u.user_id,
    'PENDING',
    NULL
FROM study_group sg, users u
WHERE sg.name = 'Spring Boot API Study Crew'
  AND u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM study_group_member sgm
      WHERE sgm.group_id = sg.id
        AND sgm.learner_id = u.user_id
  );

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT
    sg.id,
    u.user_id,
    'REJECTED',
    NULL
FROM study_group sg, users u
WHERE sg.name = 'Spring Boot API Study Crew'
  AND u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM study_group_member sgm
      WHERE sgm.group_id = sg.id
        AND sgm.learner_id = u.user_id
  );

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT
    sg.id,
    u.user_id,
    'APPROVED',
    '2026-03-21 10:00:00'
FROM study_group sg, users u
WHERE sg.name = 'Algorithm Deep Dive'
  AND u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM study_group_member sgm
      WHERE sgm.group_id = sg.id
        AND sgm.learner_id = u.user_id
  );

INSERT INTO study_match (requester_id, receiver_id, node_id, status, created_at)
SELECT
    requester.user_id,
    receiver.user_id,
    rn.node_id,
    'RECOMMENDED',
    '2026-03-25 08:30:00'
FROM users requester, users receiver, roadmaps r, roadmap_nodes rn
WHERE requester.email = 'learner@devpath.com'
  AND receiver.email = 'learner2@devpath.com'
  AND r.title = 'Backend Master Roadmap'
  AND rn.roadmap_id = r.roadmap_id
  AND rn.title = 'Java Basics'
  AND NOT EXISTS (
      SELECT 1
      FROM study_match sm
      WHERE sm.requester_id = requester.user_id
        AND sm.receiver_id = receiver.user_id
        AND sm.node_id = rn.node_id
  );

INSERT INTO study_match (requester_id, receiver_id, node_id, status, created_at)
SELECT
    requester.user_id,
    receiver.user_id,
    rn.node_id,
    'ACCEPTED',
    '2026-03-26 20:15:00'
FROM users requester, users receiver, roadmaps r, roadmap_nodes rn
WHERE requester.email = 'learner2@devpath.com'
  AND receiver.email = 'learner3@devpath.com'
  AND r.title = 'Backend Master Roadmap'
  AND rn.roadmap_id = r.roadmap_id
  AND rn.title = 'HTTP Fundamentals'
  AND NOT EXISTS (
      SELECT 1
      FROM study_match sm
      WHERE sm.requester_id = requester.user_id
        AND sm.receiver_id = receiver.user_id
        AND sm.node_id = rn.node_id
  );

-- ========================================
-- C SECTION PLANNER
-- ========================================
INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT
    u.user_id,
    'WEEKLY_NODE_CLEAR',
    3,
    TRUE
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_goal lg
      WHERE lg.learner_id = u.user_id
        AND lg.goal_type = 'WEEKLY_NODE_CLEAR'
        AND lg.target_value = 3
  );

INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT
    u.user_id,
    'WEEKLY_STUDY_TIME',
    10,
    TRUE
FROM users u
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_goal lg
      WHERE lg.learner_id = u.user_id
        AND lg.goal_type = 'WEEKLY_STUDY_TIME'
        AND lg.target_value = 10
  );

INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT
    u.user_id,
    'CUSTOM',
    1,
    TRUE
FROM users u
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_goal lg
      WHERE lg.learner_id = u.user_id
        AND lg.goal_type = 'CUSTOM'
        AND lg.target_value = 1
  );

INSERT INTO weekly_plan (learner_id, plan_content, status, created_at)
SELECT
    u.user_id,
    '월/수/금: Spring Boot Intro 2개 레슨 수강, 화/목: HTTP Fundamentals 복습, 토: 퀴즈 정리',
    'PLANNED',
    '2026-03-24 07:00:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM weekly_plan wp
      WHERE wp.learner_id = u.user_id
        AND wp.plan_content = '월/수/금: Spring Boot Intro 2개 레슨 수강, 화/목: HTTP Fundamentals 복습, 토: 퀴즈 정리'
  );

INSERT INTO weekly_plan (learner_id, plan_content, status, created_at)
SELECT
    u.user_id,
    '주간 계획 조정본: JPA 파트 난이도가 높아 실습 비중을 늘리고, 토요일에 과제 제출까지 완료',
    'IN_PROGRESS',
    '2026-03-25 07:10:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM weekly_plan wp
      WHERE wp.learner_id = u.user_id
        AND wp.plan_content = '주간 계획 조정본: JPA 파트 난이도가 높아 실습 비중을 늘리고, 토요일에 과제 제출까지 완료'
  );

INSERT INTO weekly_plan (learner_id, plan_content, status, created_at)
SELECT
    u.user_id,
    '이번 주 목표: 알고리즘 5문제 풀이, 스터디 발표 자료 준비, 프로젝트 아이디어 초안 작성',
    'PLANNED',
    '2026-03-24 08:00:00'
FROM users u
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM weekly_plan wp
      WHERE wp.learner_id = u.user_id
        AND wp.plan_content = '이번 주 목표: 알고리즘 5문제 풀이, 스터디 발표 자료 준비, 프로젝트 아이디어 초안 작성'
  );

INSERT INTO streak (learner_id, current_streak, longest_streak, last_study_date)
SELECT
    u.user_id,
    5,
    8,
    DATE '2026-03-30'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM streak s
      WHERE s.learner_id = u.user_id
  );

INSERT INTO streak (learner_id, current_streak, longest_streak, last_study_date)
SELECT
    u.user_id,
    2,
    4,
    DATE '2026-03-29'
FROM users u
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM streak s
      WHERE s.learner_id = u.user_id
  );

INSERT INTO recovery_plan (learner_id, plan_details, created_at)
SELECT
    u.user_id,
    '스트릭 복구 플랜: 오늘 30분 복습, 내일 1시간 실습, 모레 퀴즈 재응시로 루틴 복구',
    '2026-03-30 06:30:00'
FROM users u
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM recovery_plan rp
      WHERE rp.learner_id = u.user_id
        AND rp.plan_details = '스트릭 복구 플랜: 오늘 30분 복습, 내일 1시간 실습, 모레 퀴즈 재응시로 루틴 복구'
  );

-- ========================================
-- C SECTION NOTIFICATION
-- ========================================
INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT
    u.user_id,
    'STUDY_GROUP',
    'Spring Boot API Study Crew 참여 신청이 승인되었습니다.',
    FALSE,
    '2026-03-26 09:00:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_notification n
      WHERE n.learner_id = u.user_id
        AND n.message = 'Spring Boot API Study Crew 참여 신청이 승인되었습니다.'
  );

INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT
    u.user_id,
    'PLANNER',
    '이번 주 학습 플랜이 생성되었습니다. 첫 번째 일정은 월요일 19:00입니다.',
    FALSE,
    '2026-03-24 07:05:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_notification n
      WHERE n.learner_id = u.user_id
        AND n.message = '이번 주 학습 플랜이 생성되었습니다. 첫 번째 일정은 월요일 19:00입니다.'
  );

INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT
    u.user_id,
    'PROJECT',
    '프로젝트 역할이 BACKEND로 배정되었습니다.',
    TRUE,
    '2026-03-27 10:30:00'
FROM users u
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_notification n
      WHERE n.learner_id = u.user_id
        AND n.message = '프로젝트 역할이 BACKEND로 배정되었습니다.'
  );

INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT
    u.user_id,
    'STREAK',
    '학습 스트릭이 5일째 유지 중입니다. 오늘도 이어가보세요.',
    TRUE,
    '2026-03-30 21:00:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_notification n
      WHERE n.learner_id = u.user_id
        AND n.message = '학습 스트릭이 5일째 유지 중입니다. 오늘도 이어가보세요.'
  );

-- ========================================
-- C SECTION DASHBOARD
-- ========================================
INSERT INTO dashboard_snapshot (learner_id, total_study_hours, completed_nodes, snapshot_date)
SELECT u.user_id, 2, 0, DATE '2026-03-24'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM dashboard_snapshot ds
      WHERE ds.learner_id = u.user_id
        AND ds.snapshot_date = DATE '2026-03-24'
  );

INSERT INTO dashboard_snapshot (learner_id, total_study_hours, completed_nodes, snapshot_date)
SELECT u.user_id, 3, 1, DATE '2026-03-25'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM dashboard_snapshot ds
      WHERE ds.learner_id = u.user_id
        AND ds.snapshot_date = DATE '2026-03-25'
  );

INSERT INTO dashboard_snapshot (learner_id, total_study_hours, completed_nodes, snapshot_date)
SELECT u.user_id, 1, 1, DATE '2026-03-26'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM dashboard_snapshot ds
      WHERE ds.learner_id = u.user_id
        AND ds.snapshot_date = DATE '2026-03-26'
  );

INSERT INTO dashboard_snapshot (learner_id, total_study_hours, completed_nodes, snapshot_date)
SELECT u.user_id, 4, 2, DATE '2026-03-27'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM dashboard_snapshot ds
      WHERE ds.learner_id = u.user_id
        AND ds.snapshot_date = DATE '2026-03-27'
  );

INSERT INTO dashboard_snapshot (learner_id, total_study_hours, completed_nodes, snapshot_date)
SELECT u.user_id, 2, 2, DATE '2026-03-28'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM dashboard_snapshot ds
      WHERE ds.learner_id = u.user_id
        AND ds.snapshot_date = DATE '2026-03-28'
  );

INSERT INTO dashboard_snapshot (learner_id, total_study_hours, completed_nodes, snapshot_date)
SELECT u.user_id, 5, 3, DATE '2026-03-29'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM dashboard_snapshot ds
      WHERE ds.learner_id = u.user_id
        AND ds.snapshot_date = DATE '2026-03-29'
  );

INSERT INTO dashboard_snapshot (learner_id, total_study_hours, completed_nodes, snapshot_date)
SELECT u.user_id, 3, 3, DATE '2026-03-30'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM dashboard_snapshot ds
      WHERE ds.learner_id = u.user_id
        AND ds.snapshot_date = DATE '2026-03-30'
  );

INSERT INTO dashboard_snapshot (learner_id, total_study_hours, completed_nodes, snapshot_date)
SELECT u.user_id, 2, 1, DATE '2026-03-30'
FROM users u
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM dashboard_snapshot ds
      WHERE ds.learner_id = u.user_id
        AND ds.snapshot_date = DATE '2026-03-30'
  );

-- ========================================
-- C SECTION PROJECT
-- ========================================
INSERT INTO project (owner_id, name, description, project_type, status, visibility, recruiting_status, is_deleted, created_at)
SELECT
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    'DevPath Team Workspace',
    'DevPath 팀 협업 워크스페이스용 프로젝트. 역할 배정, 멘토링, Proof 제출 테스트용 데이터',
    'SQUAD',
    'IN_PROGRESS',
    'PUBLIC',
    'OPEN',
    FALSE,
    '2026-03-23 14:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM project
    WHERE name = 'DevPath Team Workspace'
      AND is_deleted = FALSE
);

INSERT INTO project (owner_id, name, description, project_type, status, visibility, recruiting_status, is_deleted, created_at)
SELECT
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    'Portfolio Builder Squad',
    '포트폴리오 제작 중심의 준비중 프로젝트. 초대 거절/멘토링 승인 시나리오 테스트용 데이터',
    'SQUAD',
    'PREPARING',
    'PUBLIC',
    'CLOSED',
    FALSE,
    '2026-03-22 11:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM project
    WHERE name = 'Portfolio Builder Squad'
      AND is_deleted = FALSE
);

INSERT INTO project_role (project_id, role_type, required_count)
SELECT
    p.id,
    'LEADER',
    1
FROM project p
WHERE p.name = 'DevPath Team Workspace'
  AND NOT EXISTS (
      SELECT 1
      FROM project_role pr
      WHERE pr.project_id = p.id
        AND pr.role_type = 'LEADER'
  );

INSERT INTO project_role (project_id, role_type, required_count)
SELECT
    p.id,
    'BACKEND',
    2
FROM project p
WHERE p.name = 'DevPath Team Workspace'
  AND NOT EXISTS (
      SELECT 1
      FROM project_role pr
      WHERE pr.project_id = p.id
        AND pr.role_type = 'BACKEND'
  );

INSERT INTO project_role (project_id, role_type, required_count)
SELECT
    p.id,
    'FRONTEND',
    1
FROM project p
WHERE p.name = 'DevPath Team Workspace'
  AND NOT EXISTS (
      SELECT 1
      FROM project_role pr
      WHERE pr.project_id = p.id
        AND pr.role_type = 'FRONTEND'
  );

INSERT INTO project_role (project_id, role_type, required_count)
SELECT
    p.id,
    'FULLSTACK',
    2
FROM project p
WHERE p.name = 'Portfolio Builder Squad'
  AND NOT EXISTS (
      SELECT 1
      FROM project_role pr
      WHERE pr.project_id = p.id
        AND pr.role_type = 'FULLSTACK'
  );

INSERT INTO project_member (project_id, learner_id, role_type, joined_at)
SELECT
    p.id,
    u.user_id,
    'LEADER',
    '2026-03-23 14:10:00'
FROM project p, users u
WHERE p.name = 'DevPath Team Workspace'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_member pm
      WHERE pm.project_id = p.id
        AND pm.learner_id = u.user_id
  );

INSERT INTO project_member (project_id, learner_id, role_type, joined_at)
SELECT
    p.id,
    u.user_id,
    'BACKEND',
    '2026-03-24 10:00:00'
FROM project p, users u
WHERE p.name = 'DevPath Team Workspace'
  AND u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_member pm
      WHERE pm.project_id = p.id
        AND pm.learner_id = u.user_id
  );

INSERT INTO project_member (project_id, learner_id, role_type, joined_at)
SELECT
    p.id,
    u.user_id,
    'FULLSTACK',
    '2026-03-22 11:30:00'
FROM project p, users u
WHERE p.name = 'Portfolio Builder Squad'
  AND u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_member pm
      WHERE pm.project_id = p.id
        AND pm.learner_id = u.user_id
  );

INSERT INTO project_invitation (project_id, inviter_id, invitee_id, status, created_at)
SELECT
    p.id,
    inviter.user_id,
    invitee.user_id,
    'PENDING',
    '2026-03-28 13:00:00'
FROM project p, users inviter, users invitee
WHERE p.name = 'DevPath Team Workspace'
  AND inviter.email = 'learner@devpath.com'
  AND invitee.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_invitation pi
      WHERE pi.project_id = p.id
        AND pi.inviter_id = inviter.user_id
        AND pi.invitee_id = invitee.user_id
  );

INSERT INTO project_invitation (project_id, inviter_id, invitee_id, status, created_at)
SELECT
    p.id,
    inviter.user_id,
    invitee.user_id,
    'ACCEPTED',
    '2026-03-24 09:40:00'
FROM project p, users inviter, users invitee
WHERE p.name = 'DevPath Team Workspace'
  AND inviter.email = 'learner@devpath.com'
  AND invitee.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_invitation pi
      WHERE pi.project_id = p.id
        AND pi.inviter_id = inviter.user_id
        AND pi.invitee_id = invitee.user_id
  );

INSERT INTO project_invitation (project_id, inviter_id, invitee_id, status, created_at)
SELECT
    p.id,
    inviter.user_id,
    invitee.user_id,
    'REJECTED',
    '2026-03-25 16:20:00'
FROM project p, users inviter, users invitee
WHERE p.name = 'Portfolio Builder Squad'
  AND inviter.email = 'learner3@devpath.com'
  AND invitee.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_invitation pi
      WHERE pi.project_id = p.id
        AND pi.inviter_id = inviter.user_id
        AND pi.invitee_id = invitee.user_id
  );

INSERT INTO mentoring_application (project_id, mentor_id, message, status, created_at)
SELECT
    p.id,
    mentor.user_id,
    'Spring Security 구조 리뷰와 API 인증 흐름 피드백이 필요합니다.',
    'PENDING',
    '2026-03-29 15:00:00'
FROM project p, users mentor
WHERE p.name = 'DevPath Team Workspace'
  AND mentor.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM mentoring_application ma
      WHERE ma.project_id = p.id
        AND ma.mentor_id = mentor.user_id
        AND ma.message = 'Spring Security 구조 리뷰와 API 인증 흐름 피드백이 필요합니다.'
  );

INSERT INTO mentoring_application (project_id, mentor_id, message, status, created_at)
SELECT
    p.id,
    mentor.user_id,
    '포트폴리오 초안 구조와 README 작성 방향에 대한 피드백 요청',
    'APPROVED',
    '2026-03-27 12:00:00'
FROM project p, users mentor
WHERE p.name = 'Portfolio Builder Squad'
  AND mentor.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM mentoring_application ma
      WHERE ma.project_id = p.id
        AND ma.mentor_id = mentor.user_id
        AND ma.message = '포트폴리오 초안 구조와 README 작성 방향에 대한 피드백 요청'
  );

INSERT INTO project_idea_post (author_id, title, content, status, is_deleted, created_at)
SELECT
    u.user_id,
    '캡스톤용 DevPath 협업 워크스페이스 고도화 아이디어',
    '프로젝트 멤버 초대, 역할 배정, Proof Card 제출 흐름을 하나의 시연 시나리오로 묶는 기능 제안',
    'PUBLISHED',
    FALSE,
    '2026-03-26 18:00:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_idea_post pip
      WHERE pip.author_id = u.user_id
        AND pip.title = '캡스톤용 DevPath 협업 워크스페이스 고도화 아이디어'
  );

INSERT INTO project_idea_post (author_id, title, content, status, is_deleted, created_at)
SELECT
    u.user_id,
    '개인 포트폴리오 빌더 연동 초안',
    '학습 이력과 프로젝트 산출물을 한 번에 정리하는 포트폴리오 빌더 페이지 연결안',
    'DRAFT',
    FALSE,
    '2026-03-28 20:10:00'
FROM users u
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_idea_post pip
      WHERE pip.author_id = u.user_id
        AND pip.title = '개인 포트폴리오 빌더 연동 초안'
  );

-- proof_card_ref_id 는 현재 문자열 참조값만 저장하므로 Swagger 검증용 더미 ref 값을 직접 넣는다.
-- 중복 제출 방지 테스트용 ref: PROOF-C-001
INSERT INTO project_proof_submission (project_id, submitter_id, proof_card_ref_id, submitted_at)
SELECT
    p.id,
    u.user_id,
    'PROOF-C-001',
    '2026-03-29 11:00:00'
FROM project p, users u
WHERE p.name = 'DevPath Team Workspace'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_proof_submission pps
      WHERE pps.project_id = p.id
        AND pps.submitter_id = u.user_id
        AND pps.proof_card_ref_id = 'PROOF-C-001'
  );

INSERT INTO project_proof_submission (project_id, submitter_id, proof_card_ref_id, submitted_at)
SELECT
    p.id,
    u.user_id,
    'PROOF-C-002',
    '2026-03-29 11:20:00'
FROM project p, users u
WHERE p.name = 'DevPath Team Workspace'
  AND u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_proof_submission pps
      WHERE pps.project_id = p.id
        AND pps.submitter_id = u.user_id
        AND pps.proof_card_ref_id = 'PROOF-C-002'
  );

INSERT INTO project_proof_submission (project_id, submitter_id, proof_card_ref_id, submitted_at)
SELECT
    p.id,
    u.user_id,
    'PROOF-C-003',
    '2026-03-30 09:30:00'
FROM project p, users u
WHERE p.name = 'Portfolio Builder Squad'
  AND u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_proof_submission pps
      WHERE pps.project_id = p.id
        AND pps.submitter_id = u.user_id
        AND pps.proof_card_ref_id = 'PROOF-C-003'
  );

-- ========================================
-- C SECTION SEQUENCE FIX
-- ========================================
SELECT setval('study_group_id_seq', (SELECT COALESCE(MAX(id), 1) FROM study_group));
SELECT setval('study_group_member_id_seq', (SELECT COALESCE(MAX(id), 1) FROM study_group_member));
SELECT setval('study_match_id_seq', (SELECT COALESCE(MAX(id), 1) FROM study_match));
SELECT setval('learner_goal_id_seq', (SELECT COALESCE(MAX(id), 1) FROM learner_goal));
SELECT setval('weekly_plan_id_seq', (SELECT COALESCE(MAX(id), 1) FROM weekly_plan));
SELECT setval('streak_id_seq', (SELECT COALESCE(MAX(id), 1) FROM streak));
SELECT setval('recovery_plan_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recovery_plan));
SELECT setval('learner_notification_id_seq', (SELECT COALESCE(MAX(id), 1) FROM learner_notification));
SELECT setval('dashboard_snapshot_id_seq', (SELECT COALESCE(MAX(id), 1) FROM dashboard_snapshot));
SELECT setval('project_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project));
SELECT setval('project_invitation_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_invitation));
SELECT setval('project_member_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_member));
SELECT setval('project_role_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_role));
SELECT setval('mentoring_application_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mentoring_application));
SELECT setval('project_idea_post_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_idea_post));
SELECT setval('project_proof_submission_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_proof_submission));

-- ========================================
-- A SECTION LEARNING AUTOMATION / PROOF / HISTORY
-- ========================================
INSERT INTO quizzes (
    node_id,
    title,
    description,
    quiz_type,
    total_score,
    is_published,
    is_active,
    expose_answer,
    expose_explanation,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    rn.node_id,
    'Spring Boot Intro Checkpoint Quiz',
    'Checkpoint quiz for the Java Basics roadmap node.',
    'MANUAL',
    100,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TIMESTAMP '2026-03-28 20:50:00',
    TIMESTAMP '2026-03-28 20:50:00'
FROM roadmap_nodes rn
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
WHERE r.title = 'Backend Master Roadmap'
  AND rn.title = 'Java Basics'
  AND NOT EXISTS (
      SELECT 1
      FROM quizzes q
      WHERE q.title = 'Spring Boot Intro Checkpoint Quiz'
        AND q.node_id = rn.node_id
  );

INSERT INTO quiz_questions (
    quiz_id,
    question_type,
    question_text,
    explanation,
    points,
    display_order,
    source_timestamp,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    'MULTIPLE_CHOICE',
    'Which statement best describes dependency injection in Spring?',
    'Spring manages object wiring for application components.',
    100,
    1,
    NULL,
    FALSE,
    TIMESTAMP '2026-03-28 20:50:00',
    TIMESTAMP '2026-03-28 20:50:00'
FROM quizzes q
JOIN roadmap_nodes rn ON rn.node_id = q.node_id
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
WHERE q.title = 'Spring Boot Intro Checkpoint Quiz'
  AND r.title = 'Backend Master Roadmap'
  AND rn.title = 'Java Basics'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_questions qq
      WHERE qq.quiz_id = q.quiz_id
        AND qq.display_order = 1
  );

INSERT INTO quiz_question_options (
    question_id,
    option_text,
    is_correct,
    display_order,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    qq.question_id,
    option_seed.option_text,
    option_seed.is_correct,
    option_seed.display_order,
    FALSE,
    TIMESTAMP '2026-03-28 20:50:00',
    TIMESTAMP '2026-03-28 20:50:00'
FROM quiz_questions qq
JOIN quizzes q ON q.quiz_id = qq.quiz_id
JOIN (
    SELECT 'Constructor injection' AS option_text, FALSE AS is_correct, 1 AS display_order
    UNION ALL
    SELECT 'Field injection', FALSE, 2
    UNION ALL
    SELECT 'Manual new object creation', FALSE, 3
    UNION ALL
    SELECT 'Spring manages object wiring for application components.', TRUE, 4
) option_seed ON TRUE
WHERE q.title = 'Spring Boot Intro Checkpoint Quiz'
  AND qq.display_order = 1
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_question_options qo
      WHERE qo.question_id = qq.question_id
  );

INSERT INTO assignments (
    node_id,
    title,
    description,
    submission_type,
    due_at,
    allowed_file_formats,
    readme_required,
    test_required,
    lint_required,
    submission_rule_description,
    total_score,
    is_published,
    is_active,
    allow_late_submission,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    rn.node_id,
    'Spring Boot Intro Practice Submission',
    'Practice submission for the HTTP Fundamentals roadmap node.',
    'MULTIPLE',
    TIMESTAMP '2026-04-05 23:59:59',
    'md,txt,zip',
    TRUE,
    TRUE,
    TRUE,
    'Submit a README, test result summary, and repository URL.',
    100,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    TIMESTAMP '2026-03-28 21:00:00',
    TIMESTAMP '2026-03-28 21:00:00'
FROM roadmap_nodes rn
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
WHERE r.title = 'Backend Master Roadmap'
  AND rn.title = 'HTTP Fundamentals'
  AND NOT EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.title = 'Spring Boot Intro Practice Submission'
        AND a.node_id = rn.node_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    100,
    1800,
    1.25,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-28 21:10:00',
    TIMESTAMP '2026-03-28 21:10:00',
    TIMESTAMP '2026-03-28 21:10:00'
FROM users u
JOIN lessons l ON l.title = 'Understanding DI and IoC'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    45,
    640,
    1.00,
    FALSE,
    FALSE,
    TIMESTAMP '2026-03-29 20:25:00',
    TIMESTAMP '2026-03-29 20:25:00',
    TIMESTAMP '2026-03-29 20:25:00'
FROM users u
JOIN lessons l ON l.title = 'Entity relationships and mapping'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    90,
    100,
    TIMESTAMP '2026-03-28 21:20:00',
    TIMESTAMP '2026-03-28 21:27:00',
    420,
    TRUE,
    1,
    FALSE,
    TIMESTAMP '2026-03-28 21:20:00',
    TIMESTAMP '2026-03-28 21:27:00'
FROM quizzes q
JOIN users u ON u.email = 'learner@devpath.com'
WHERE q.title = 'Spring Boot Intro Checkpoint Quiz'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    40,
    100,
    TIMESTAMP '2026-03-29 20:30:00',
    TIMESTAMP '2026-03-29 20:36:00',
    360,
    FALSE,
    1,
    FALSE,
    TIMESTAMP '2026-03-29 20:30:00',
    TIMESTAMP '2026-03-29 20:36:00'
FROM quizzes q
JOIN users u ON u.email = 'learner2@devpath.com'
WHERE q.title = 'Spring Boot Intro Checkpoint Quiz'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Final practice submission with README, test summary, and deployment notes.',
    'https://github.com/devpath-samples/spring-boot-intro-final',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-28 22:10:00',
    TIMESTAMP '2026-03-28 23:00:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    96,
    95,
    'Requirements are complete and the automated checks are stable.',
    'README quality and test coverage are both strong.',
    FALSE,
    TIMESTAMP '2026-03-28 22:10:00',
    TIMESTAMP '2026-03-28 23:00:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = 'Spring Boot Intro Practice Submission'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    NULL,
    'Draft submission. README and tests still need work.',
    NULL,
    FALSE,
    'PRECHECK_FAILED',
    NULL,
    NULL,
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    52,
    NULL,
    NULL,
    NULL,
    FALSE,
    TIMESTAMP '2026-03-29 21:10:00',
    TIMESTAMP '2026-03-29 21:10:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner2@devpath.com'
WHERE a.title = 'Spring Boot Intro Practice Submission'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.is_deleted = FALSE
  );

INSERT INTO til_drafts (
    user_id,
    lesson_id,
    title,
    content,
    table_of_contents,
    status,
    published_url,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    'Spring Bean Lifecycle Notes',
    '# Bean lifecycle' || E'\n\n' ||
    '## Key points' || E'\n' ||
    '- singleton scope' || E'\n' ||
    '- initialization callback' || E'\n\n' ||
    '## Reflection' || E'\n' ||
    'Understanding the lifecycle makes debugging much faster.',
    '[{"text":"Bean lifecycle","level":1},{"text":"Key points","level":2},{"text":"Reflection","level":2}]',
    'PUBLISHED',
    'https://velog.io/@devpath/bean-lifecycle',
    FALSE,
    TIMESTAMP '2026-03-28 22:30:00',
    TIMESTAMP '2026-03-28 22:45:00'
FROM users u
JOIN lessons l ON l.title = 'Understanding DI and IoC'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM til_drafts t
      WHERE t.user_id = u.user_id
        AND t.title = 'Spring Bean Lifecycle Notes'
        AND t.is_deleted = FALSE
  );

INSERT INTO til_drafts (
    user_id,
    lesson_id,
    title,
    content,
    table_of_contents,
    status,
    published_url,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    'JPA Mapping Memo',
    '# Relationship mapping' || E'\n\n' ||
    '## TODO' || E'\n' ||
    '- review helper methods' || E'\n' ||
    '- verify lazy loading behavior',
    '[{"text":"Relationship mapping","level":1},{"text":"TODO","level":2}]',
    'DRAFT',
    NULL,
    FALSE,
    TIMESTAMP '2026-03-29 20:50:00',
    TIMESTAMP '2026-03-29 20:50:00'
FROM users u
JOIN lessons l ON l.title = 'Entity relationships and mapping'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM til_drafts t
      WHERE t.user_id = u.user_id
        AND t.title = 'JPA Mapping Memo'
        AND t.is_deleted = FALSE
  );

INSERT INTO timestamp_notes (
    user_id,
    lesson_id,
    timestamp_second,
    content,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    315,
    'Separate bean registration timing from dependency injection timing.',
    FALSE,
    TIMESTAMP '2026-03-28 21:05:00',
    TIMESTAMP '2026-03-28 21:05:00'
FROM users u
JOIN lessons l ON l.title = 'Understanding DI and IoC'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM timestamp_notes n
      WHERE n.user_id = u.user_id
        AND n.lesson_id = l.lesson_id
        AND n.timestamp_second = 315
        AND n.is_deleted = FALSE
  );

INSERT INTO timestamp_notes (
    user_id,
    lesson_id,
    timestamp_second,
    content,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    540,
    'Recheck when the lazy loading proxy gets initialized.',
    FALSE,
    TIMESTAMP '2026-03-29 20:15:00',
    TIMESTAMP '2026-03-29 20:15:00'
FROM users u
JOIN lessons l ON l.title = 'Entity relationships and mapping'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM timestamp_notes n
      WHERE n.user_id = u.user_id
        AND n.lesson_id = l.lesson_id
        AND n.timestamp_second = 540
        AND n.is_deleted = FALSE
  );

INSERT INTO supplement_recommendations (
    user_id,
    node_id,
    reason,
    priority,
    coverage_percent,
    missing_tag_count,
    status,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'Additional study is recommended because required tags are still missing.',
    1,
    62.5,
    2,
    'PENDING',
    TIMESTAMP '2026-03-29 22:00:00',
    TIMESTAMP '2026-03-29 22:00:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = 'HTTP Fundamentals'
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
WHERE u.email = 'learner2@devpath.com'
  AND r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM supplement_recommendations sr
      WHERE sr.user_id = u.user_id
        AND sr.node_id = rn.node_id
  );

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'CLEARED',
    100.00,
    TRUE,
    0,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-28 23:05:00',
    TIMESTAMP '2026-03-28 23:05:00',
    TIMESTAMP '2026-03-28 23:05:00',
    TIMESTAMP '2026-03-28 23:05:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = 'Java Basics'
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
WHERE u.email = 'learner@devpath.com'
  AND r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'NOT_CLEARED',
    45.00,
    FALSE,
    2,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    NULL,
    TIMESTAMP '2026-03-29 22:05:00',
    TIMESTAMP '2026-03-29 22:05:00',
    TIMESTAMP '2026-03-29 22:05:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = 'HTTP Fundamentals'
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
WHERE u.email = 'learner2@devpath.com'
  AND r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

INSERT INTO proof_cards (
    user_id,
    node_id,
    node_clearance_id,
    title,
    description,
    proof_card_status,
    issued_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    nc.node_clearance_id,
    'Spring Boot Intro Node Clear',
    'Sample proof card for a learner who completed lessons, quiz, and assignment.',
    'ISSUED',
    TIMESTAMP '2026-03-28 23:10:00',
    TIMESTAMP '2026-03-28 23:10:00',
    TIMESTAMP '2026-03-28 23:10:00'
FROM node_clearances nc
JOIN users u ON u.user_id = nc.user_id
JOIN roadmap_nodes rn ON rn.node_id = nc.node_id
WHERE u.email = 'learner@devpath.com'
  AND nc.clearance_status = 'CLEARED'
  AND NOT EXISTS (
      SELECT 1
      FROM proof_cards pc
      WHERE pc.node_clearance_id = nc.node_clearance_id
  );

INSERT INTO proof_card_tags (
    proof_card_id,
    tag_id,
    skill_evidence_type
)
WITH target_card AS (
    SELECT pc.proof_card_id
    FROM proof_cards pc
    JOIN users u ON u.user_id = pc.user_id
    WHERE u.email = 'learner@devpath.com'
    ORDER BY pc.proof_card_id
    LIMIT 1
),
ranked_tags AS (
    SELECT t.tag_id, ROW_NUMBER() OVER (ORDER BY t.tag_id) AS rn
    FROM tags t
    WHERE t.is_deleted = FALSE
)
SELECT
    c.proof_card_id,
    t.tag_id,
    'VERIFIED'
FROM target_card c
JOIN ranked_tags t ON t.rn = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM proof_card_tags pct
    WHERE pct.proof_card_id = c.proof_card_id
      AND pct.tag_id = t.tag_id
      AND pct.skill_evidence_type = 'VERIFIED'
);

INSERT INTO proof_card_tags (
    proof_card_id,
    tag_id,
    skill_evidence_type
)
WITH target_card AS (
    SELECT pc.proof_card_id
    FROM proof_cards pc
    JOIN users u ON u.user_id = pc.user_id
    WHERE u.email = 'learner@devpath.com'
    ORDER BY pc.proof_card_id
    LIMIT 1
),
ranked_tags AS (
    SELECT t.tag_id, ROW_NUMBER() OVER (ORDER BY t.tag_id) AS rn
    FROM tags t
    WHERE t.is_deleted = FALSE
)
SELECT
    c.proof_card_id,
    t.tag_id,
    'HELD'
FROM target_card c
JOIN ranked_tags t ON t.rn = 2
WHERE NOT EXISTS (
    SELECT 1
    FROM proof_card_tags pct
    WHERE pct.proof_card_id = c.proof_card_id
      AND pct.tag_id = t.tag_id
      AND pct.skill_evidence_type = 'HELD'
);

INSERT INTO certificates (
    proof_card_id,
    certificate_number,
    certificate_status,
    issued_at,
    pdf_file_name,
    pdf_generated_at,
    last_downloaded_at,
    created_at,
    updated_at
)
SELECT
    pc.proof_card_id,
    'CERT-20260328-' || LPAD(pc.proof_card_id::text, 4, '0'),
    'PDF_READY',
    TIMESTAMP '2026-03-28 23:20:00',
    'proof-card-' || pc.proof_card_id::text || '.pdf',
    TIMESTAMP '2026-03-28 23:20:00',
    TIMESTAMP '2026-03-29 09:10:00',
    TIMESTAMP '2026-03-28 23:20:00',
    TIMESTAMP '2026-03-29 09:10:00'
FROM proof_cards pc
JOIN users u ON u.user_id = pc.user_id
WHERE u.email = 'learner@devpath.com'
  AND pc.title = 'Spring Boot Intro Node Clear'
  AND NOT EXISTS (
      SELECT 1
      FROM certificates c
      WHERE c.proof_card_id = pc.proof_card_id
  );

INSERT INTO proof_card_shares (
    proof_card_id,
    share_token,
    share_status,
    expires_at,
    access_count,
    created_at,
    updated_at
)
SELECT
    pc.proof_card_id,
    'proof-share-token-a-20260328',
    'ACTIVE',
    TIMESTAMP '2026-12-31 23:59:59',
    3,
    TIMESTAMP '2026-03-28 23:30:00',
    TIMESTAMP '2026-03-29 10:00:00'
FROM proof_cards pc
JOIN users u ON u.user_id = pc.user_id
WHERE u.email = 'learner@devpath.com'
  AND pc.title = 'Spring Boot Intro Node Clear'
  AND NOT EXISTS (
      SELECT 1
      FROM proof_card_shares ps
      WHERE ps.share_token = 'proof-share-token-a-20260328'
  );

INSERT INTO learning_history_share_links (
    user_id,
    share_token,
    title,
    expires_at,
    access_count,
    is_active,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    'learning-history-token-a-20260328',
    'Learning history share link',
    TIMESTAMP '2026-12-31 23:59:59',
    5,
    TRUE,
    TIMESTAMP '2026-03-28 23:40:00',
    TIMESTAMP '2026-03-29 10:05:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_history_share_links l
      WHERE l.share_token = 'learning-history-token-a-20260328'
  );

INSERT INTO certificate_download_histories (
    certificate_id,
    downloaded_by,
    download_reason,
    downloaded_at
)
SELECT
    c.certificate_id,
    u.user_id,
    'Downloaded for portfolio attachment.',
    TIMESTAMP '2026-03-29 09:10:00'
FROM certificates c
JOIN proof_cards pc ON pc.proof_card_id = c.proof_card_id
JOIN users u ON u.email = 'learner@devpath.com'
WHERE pc.user_id = u.user_id
  AND pc.title = 'Spring Boot Intro Node Clear'
  AND NOT EXISTS (
      SELECT 1
      FROM certificate_download_histories h
      WHERE h.certificate_id = c.certificate_id
        AND h.downloaded_by = u.user_id
        AND h.download_reason = 'Downloaded for portfolio attachment.'
  );

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'TAG_MATCH_THRESHOLD',
    'Tag match threshold',
    'Defines the minimum required tag coverage for automatic recommendation.',
    '0.80',
    1,
    'ENABLED',
    TIMESTAMP '2026-03-27 10:00:00',
    TIMESTAMP '2026-03-27 10:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'TAG_MATCH_THRESHOLD'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'NODE_CLEARANCE_REQUIRES_COMPLETION',
    'Node clearance completion rule',
    'Requires full lesson completion and evaluation pass for node clearance.',
    'LESSON_100_AND_EVALUATION_PASS',
    2,
    'ENABLED',
    TIMESTAMP '2026-03-27 10:01:00',
    TIMESTAMP '2026-03-27 10:01:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'NODE_CLEARANCE_REQUIRES_COMPLETION'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'SUPPLEMENT_RECOMMENDATION_PRIORITY',
    'Supplement recommendation priority',
    'Ranks supplement recommendations by missing tag count and coverage gap.',
    'MISSING_TAG_COUNT_DESC',
    3,
    'ENABLED',
    TIMESTAMP '2026-03-27 10:02:00',
    TIMESTAMP '2026-03-27 10:02:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'SUPPLEMENT_RECOMMENDATION_PRIORITY'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'PROOF_CARD_AUTO_ISSUE',
    'Proof card auto issue rule',
    'Issues proof cards only for proof-eligible node clearances.',
    'PROOF_ELIGIBLE_ONLY',
    4,
    'ENABLED',
    TIMESTAMP '2026-03-27 10:03:00',
    TIMESTAMP '2026-03-27 10:03:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'PROOF_CARD_AUTO_ISSUE'
);

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'COMPLETION_RATE',
    'Completion rate',
    78.4,
    TIMESTAMP '2026-03-30 23:00:00',
    TIMESTAMP '2026-03-30 23:00:00'
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'COMPLETION_RATE'
        AND s.metric_label = 'Completion rate'
        AND s.sampled_at = TIMESTAMP '2026-03-30 23:00:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'AVERAGE_WATCH_TIME',
    'Average watch time',
    1420.0,
    TIMESTAMP '2026-03-30 23:00:00',
    TIMESTAMP '2026-03-30 23:00:00'
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'AVERAGE_WATCH_TIME'
        AND s.metric_label = 'Average watch time'
        AND s.sampled_at = TIMESTAMP '2026-03-30 23:00:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'QUIZ_STATS',
    'Average quiz score',
    65.0,
    TIMESTAMP '2026-03-30 23:00:00',
    TIMESTAMP '2026-03-30 23:00:00'
FROM courses c
WHERE c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'QUIZ_STATS'
        AND s.metric_label = 'Average quiz score'
        AND s.sampled_at = TIMESTAMP '2026-03-30 23:00:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'ASSIGNMENT_STATS',
    'Average assignment score',
    73.5,
    TIMESTAMP '2026-03-30 23:00:00',
    TIMESTAMP '2026-03-30 23:00:00'
FROM courses c
WHERE c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'ASSIGNMENT_STATS'
        AND s.metric_label = 'Average assignment score'
        AND s.sampled_at = TIMESTAMP '2026-03-30 23:00:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'WEAK_POINT',
    'Weak point ratio',
    31.2,
    TIMESTAMP '2026-03-30 23:00:00',
    TIMESTAMP '2026-03-30 23:00:00'
FROM courses c
WHERE c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'WEAK_POINT'
        AND s.metric_label = 'Weak point ratio'
        AND s.sampled_at = TIMESTAMP '2026-03-30 23:00:00'
  );

-- ========================================
-- A-CASE NODE CLEARANCE BRANCHES
-- ========================================
INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'A_CASE_TAG_JAVA', 'BACKEND', FALSE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'A_CASE_TAG_JAVA'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'A_CASE_TAG_SPRING', 'BACKEND', FALSE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'A_CASE_TAG_SPRING'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'A_CASE_TAG_DB', 'BACKEND', FALSE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'A_CASE_TAG_DB'
);

UPDATE tags
SET is_official = FALSE
WHERE name IN ('A_CASE_TAG_JAVA', 'A_CASE_TAG_SPRING', 'A_CASE_TAG_DB');

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u
JOIN tags t ON t.name = 'A_CASE_TAG_JAVA'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u
JOIN tags t ON t.name = 'A_CASE_TAG_SPRING'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u
JOIN tags t ON t.name = 'A_CASE_TAG_DB'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u
JOIN tags t ON t.name = 'A_CASE_TAG_JAVA'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-CASE-A] Full pass',
    'Node for the full-pass clearance branch.',
    'CONCEPT',
    901
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-CASE-A] Full pass'
);

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-CASE-B] Missing tag',
    'Node for the missing-tag clearance branch.',
    'CONCEPT',
    902
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-CASE-B] Missing tag'
);

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-CASE-C] Quiz failed',
    'Node for the quiz-failed clearance branch.',
    'CONCEPT',
    903
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-CASE-C] Quiz failed'
);

INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id
FROM roadmap_nodes rn
JOIN tags t ON t.name = 'A_CASE_TAG_JAVA'
WHERE rn.title = '[A-CASE-A] Full pass'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags nrt
      WHERE nrt.node_id = rn.node_id
        AND nrt.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id
FROM roadmap_nodes rn
JOIN tags t ON t.name = 'A_CASE_TAG_SPRING'
WHERE rn.title = '[A-CASE-A] Full pass'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags nrt
      WHERE nrt.node_id = rn.node_id
        AND nrt.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id
FROM roadmap_nodes rn
JOIN tags t ON t.name = 'A_CASE_TAG_JAVA'
WHERE rn.title = '[A-CASE-B] Missing tag'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags nrt
      WHERE nrt.node_id = rn.node_id
        AND nrt.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id
FROM roadmap_nodes rn
JOIN tags t ON t.name = 'A_CASE_TAG_DB'
WHERE rn.title = '[A-CASE-B] Missing tag'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags nrt
      WHERE nrt.node_id = rn.node_id
        AND nrt.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id
FROM roadmap_nodes rn
JOIN tags t ON t.name = 'A_CASE_TAG_JAVA'
WHERE rn.title = '[A-CASE-C] Quiz failed'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags nrt
      WHERE nrt.node_id = rn.node_id
        AND nrt.tag_id = t.tag_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id
FROM roadmap_nodes rn
JOIN tags t ON t.name = 'A_CASE_TAG_SPRING'
WHERE rn.title = '[A-CASE-C] Quiz failed'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags nrt
      WHERE nrt.node_id = rn.node_id
        AND nrt.tag_id = t.tag_id
  );

INSERT INTO node_completion_rules (node_id, criteria_type, criteria_value, created_at, updated_at)
SELECT
    rn.node_id,
    'QUIZ_AND_ASSIGNMENT',
    'LESSON_100_AND_REQUIRED_TAGS_AND_QUIZ_AND_ASSIGNMENT',
    TIMESTAMP '2026-03-30 10:00:00',
    TIMESTAMP '2026-03-30 10:00:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-A] Full pass'
  AND NOT EXISTS (
      SELECT 1
      FROM node_completion_rules ncr
      WHERE ncr.node_id = rn.node_id
  );

INSERT INTO node_completion_rules (node_id, criteria_type, criteria_value, created_at, updated_at)
SELECT
    rn.node_id,
    'QUIZ_AND_ASSIGNMENT',
    'LESSON_100_AND_REQUIRED_TAGS_AND_QUIZ_AND_ASSIGNMENT',
    TIMESTAMP '2026-03-30 10:01:00',
    TIMESTAMP '2026-03-30 10:01:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-B] Missing tag'
  AND NOT EXISTS (
      SELECT 1
      FROM node_completion_rules ncr
      WHERE ncr.node_id = rn.node_id
  );

INSERT INTO node_completion_rules (node_id, criteria_type, criteria_value, created_at, updated_at)
SELECT
    rn.node_id,
    'QUIZ_AND_ASSIGNMENT',
    'LESSON_100_AND_REQUIRED_TAGS_AND_QUIZ_AND_ASSIGNMENT',
    TIMESTAMP '2026-03-30 10:02:00',
    TIMESTAMP '2026-03-30 10:02:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-C] Quiz failed'
  AND NOT EXISTS (
      SELECT 1
      FROM node_completion_rules ncr
      WHERE ncr.node_id = rn.node_id
  );

INSERT INTO courses (
    instructor_id,
    title,
    subtitle,
    description,
    thumbnail_url,
    price,
    original_price,
    currency,
    difficulty_level,
    language,
    has_certificate,
    status,
    published_at,
    duration_seconds
)
SELECT
    iu.user_id,
    '[A-CASE-A] Node Clearance Course',
    'Case A only course',
    'Course used to verify lesson completion, tags, quiz, and assignment pass.',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    0,
    0,
    'KRW',
    'BEGINNER',
    'ko',
    TRUE,
    'PUBLISHED',
    TIMESTAMP '2026-03-30 11:00:00',
    900
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.title = '[A-CASE-A] Node Clearance Course'
  );

INSERT INTO courses (
    instructor_id,
    title,
    subtitle,
    description,
    thumbnail_url,
    price,
    original_price,
    currency,
    difficulty_level,
    language,
    has_certificate,
    status,
    published_at,
    duration_seconds
)
SELECT
    iu.user_id,
    '[A-CASE-B] Tag Missing Course',
    'Case B only course',
    'Course used to verify the missing required tag branch.',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80',
    0,
    0,
    'KRW',
    'BEGINNER',
    'ko',
    TRUE,
    'PUBLISHED',
    TIMESTAMP '2026-03-30 11:05:00',
    900
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.title = '[A-CASE-B] Tag Missing Course'
  );

INSERT INTO courses (
    instructor_id,
    title,
    subtitle,
    description,
    thumbnail_url,
    price,
    original_price,
    currency,
    difficulty_level,
    language,
    has_certificate,
    status,
    published_at,
    duration_seconds
)
SELECT
    iu.user_id,
    '[A-CASE-C] Quiz Fail Course',
    'Case C only course',
    'Course used to verify the quiz failed branch.',
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
    0,
    0,
    'KRW',
    'BEGINNER',
    'ko',
    TRUE,
    'PUBLISHED',
    TIMESTAMP '2026-03-30 11:10:00',
    900
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  );

UPDATE courses
SET thumbnail_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80'
WHERE title = 'Spring Boot Intro';

UPDATE courses
SET duration_seconds = 55200,
    difficulty_level = 'INTERMEDIATE',
    published_at = TIMESTAMP '2026-01-20 09:00:00'
WHERE title = 'Spring Boot Intro';

UPDATE courses
SET thumbnail_url = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80'
WHERE title = 'JPA Practical Design';

UPDATE courses
SET thumbnail_url = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80'
WHERE title = 'React Dashboard Sprint';

UPDATE courses
SET published_at = TIMESTAMP '2026-01-29 13:00:00'
WHERE title = '스프링 부트 3.0 완전 정복';

UPDATE courses
SET published_at = TIMESTAMP '2026-01-30 11:00:00'
WHERE title = '제목 없는 강의 (초안)';

UPDATE courses
SET status = 'DRAFT',
    has_certificate = FALSE,
    duration_seconds = 0
WHERE title = '제목 없는 강의 (초안)';

UPDATE courses
SET thumbnail_url = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'
WHERE title = '[A-CASE-A] Node Clearance Course';

UPDATE courses
SET thumbnail_url = 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80'
WHERE title = '[A-CASE-B] Tag Missing Course';

UPDATE courses
SET thumbnail_url = 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80'
WHERE title = '[A-CASE-C] Quiz Fail Course';

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND t.name = 'A_CASE_TAG_JAVA'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND t.name = 'A_CASE_TAG_SPRING'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '[A-CASE-B] Tag Missing Course'
  AND t.name = 'A_CASE_TAG_JAVA'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  AND t.name = 'A_CASE_TAG_JAVA'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT c.course_id, t.tag_id, 3
FROM courses c, tags t
WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  AND t.name = 'A_CASE_TAG_SPRING'
  AND NOT EXISTS (
      SELECT 1
      FROM course_tag_maps ctm
      WHERE ctm.course_id = c.course_id
        AND ctm.tag_id = t.tag_id
  );

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT
    c.course_id,
    'SECTION 1',
    'Case A section',
    1,
    TRUE
FROM courses c
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_sections cs
      WHERE cs.course_id = c.course_id
        AND cs.title = 'SECTION 1'
  );

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT
    c.course_id,
    'SECTION 1',
    'Case B section',
    1,
    TRUE
FROM courses c
WHERE c.title = '[A-CASE-B] Tag Missing Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_sections cs
      WHERE cs.course_id = c.course_id
        AND cs.title = 'SECTION 1'
  );

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT
    c.course_id,
    'SECTION 1',
    'Case C section',
    1,
    TRUE
FROM courses c
WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_sections cs
      WHERE cs.course_id = c.course_id
        AND cs.title = 'SECTION 1'
  );

INSERT INTO lessons (
    section_id,
    title,
    description,
    lesson_type,
    duration_seconds,
    is_preview,
    is_published,
    sort_order
)
SELECT
    cs.section_id,
    '[A-CASE-A] LESSON 1',
    'Case A lesson',
    'VIDEO',
    900,
    FALSE,
    TRUE,
    1
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.title = '[A-CASE-A] LESSON 1'
  );

INSERT INTO lessons (
    section_id,
    title,
    description,
    lesson_type,
    duration_seconds,
    is_preview,
    is_published,
    sort_order
)
SELECT
    cs.section_id,
    '[A-CASE-B] LESSON 1',
    'Case B lesson',
    'VIDEO',
    900,
    FALSE,
    TRUE,
    1
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = '[A-CASE-B] Tag Missing Course'
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.title = '[A-CASE-B] LESSON 1'
  );

INSERT INTO lessons (
    section_id,
    title,
    description,
    lesson_type,
    duration_seconds,
    is_preview,
    is_published,
    sort_order
)
SELECT
    cs.section_id,
    '[A-CASE-C] LESSON 1',
    'Case C lesson',
    'VIDEO',
    900,
    FALSE,
    TRUE,
    1
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.title = '[A-CASE-C] LESSON 1'
  );

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT
    c.course_id,
    rn.node_id,
    TIMESTAMP '2026-03-30 11:30:00'
FROM courses c
JOIN roadmap_nodes rn ON rn.title = '[A-CASE-A] Full pass'
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_node_mappings cnm
      WHERE cnm.course_id = c.course_id
        AND cnm.node_id = rn.node_id
  );

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT
    c.course_id,
    rn.node_id,
    TIMESTAMP '2026-03-30 11:31:00'
FROM courses c
JOIN roadmap_nodes rn ON rn.title = '[A-CASE-B] Missing tag'
WHERE c.title = '[A-CASE-B] Tag Missing Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_node_mappings cnm
      WHERE cnm.course_id = c.course_id
        AND cnm.node_id = rn.node_id
  );

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT
    c.course_id,
    rn.node_id,
    TIMESTAMP '2026-03-30 11:32:00'
FROM courses c
JOIN roadmap_nodes rn ON rn.title = '[A-CASE-C] Quiz failed'
WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_node_mappings cnm
      WHERE cnm.course_id = c.course_id
        AND cnm.node_id = rn.node_id
  );

INSERT INTO quizzes (
    node_id,
    title,
    description,
    quiz_type,
    total_score,
    is_published,
    is_active,
    expose_answer,
    expose_explanation,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    rn.node_id,
    '[A-CASE-A] QUIZ',
    'Quiz for the full-pass branch.',
    'MANUAL',
    100,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TIMESTAMP '2026-03-30 12:00:00',
    TIMESTAMP '2026-03-30 12:00:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-A] Full pass'
  AND NOT EXISTS (
      SELECT 1
      FROM quizzes q
      WHERE q.title = '[A-CASE-A] QUIZ'
  );

INSERT INTO quiz_questions (
    quiz_id,
    question_type,
    question_text,
    explanation,
    points,
    display_order,
    source_timestamp,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    'MULTIPLE_CHOICE',
    'What must be true for the A-case node to clear?',
    'Lessons, tags, quiz, and assignment must all pass.',
    100,
    1,
    NULL,
    FALSE,
    TIMESTAMP '2026-03-30 12:00:00',
    TIMESTAMP '2026-03-30 12:00:00'
FROM quizzes q
JOIN roadmap_nodes rn ON rn.node_id = q.node_id
WHERE q.title = '[A-CASE-A] QUIZ'
  AND rn.title = '[A-CASE-A] Full pass'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_questions qq
      WHERE qq.quiz_id = q.quiz_id
        AND qq.display_order = 1
  );

INSERT INTO quiz_question_options (
    question_id,
    option_text,
    is_correct,
    display_order,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    qq.question_id,
    option_seed.option_text,
    option_seed.is_correct,
    option_seed.display_order,
    FALSE,
    TIMESTAMP '2026-03-30 12:00:00',
    TIMESTAMP '2026-03-30 12:00:00'
FROM quiz_questions qq
JOIN quizzes q ON q.quiz_id = qq.quiz_id
JOIN (
    SELECT 'Only lessons' AS option_text, FALSE AS is_correct, 1 AS display_order
    UNION ALL
    SELECT 'Lessons and tags', FALSE, 2
    UNION ALL
    SELECT 'Lessons, tags, quiz, and assignment', TRUE, 3
    UNION ALL
    SELECT 'Only quiz and assignment', FALSE, 4
) option_seed ON TRUE
WHERE q.title = '[A-CASE-A] QUIZ'
  AND qq.display_order = 1
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_question_options qo
      WHERE qo.question_id = qq.question_id
  );

INSERT INTO quizzes (
    node_id,
    title,
    description,
    quiz_type,
    total_score,
    is_published,
    is_active,
    expose_answer,
    expose_explanation,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    rn.node_id,
    '[A-CASE-B] QUIZ',
    'Quiz for the missing-tag branch.',
    'MANUAL',
    100,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TIMESTAMP '2026-03-30 12:05:00',
    TIMESTAMP '2026-03-30 12:05:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-B] Missing tag'
  AND NOT EXISTS (
      SELECT 1
      FROM quizzes q
      WHERE q.title = '[A-CASE-B] QUIZ'
  );

INSERT INTO quiz_questions (
    quiz_id,
    question_type,
    question_text,
    explanation,
    points,
    display_order,
    source_timestamp,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    'MULTIPLE_CHOICE',
    'Why should the B-case node remain uncleared?',
    'A required tag is still missing.',
    100,
    1,
    NULL,
    FALSE,
    TIMESTAMP '2026-03-30 12:05:00',
    TIMESTAMP '2026-03-30 12:05:00'
FROM quizzes q
JOIN roadmap_nodes rn ON rn.node_id = q.node_id
WHERE q.title = '[A-CASE-B] QUIZ'
  AND rn.title = '[A-CASE-B] Missing tag'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_questions qq
      WHERE qq.quiz_id = q.quiz_id
        AND qq.display_order = 1
  );

INSERT INTO quiz_question_options (
    question_id,
    option_text,
    is_correct,
    display_order,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    qq.question_id,
    option_seed.option_text,
    option_seed.is_correct,
    option_seed.display_order,
    FALSE,
    TIMESTAMP '2026-03-30 12:05:00',
    TIMESTAMP '2026-03-30 12:05:00'
FROM quiz_questions qq
JOIN quizzes q ON q.quiz_id = qq.quiz_id
JOIN (
    SELECT 'No lessons were completed' AS option_text, FALSE AS is_correct, 1 AS display_order
    UNION ALL
    SELECT 'A required tag is missing', TRUE, 2
    UNION ALL
    SELECT 'The assignment is absent', FALSE, 3
    UNION ALL
    SELECT 'The node has no course', FALSE, 4
) option_seed ON TRUE
WHERE q.title = '[A-CASE-B] QUIZ'
  AND qq.display_order = 1
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_question_options qo
      WHERE qo.question_id = qq.question_id
  );

INSERT INTO quizzes (
    node_id,
    title,
    description,
    quiz_type,
    total_score,
    is_published,
    is_active,
    expose_answer,
    expose_explanation,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    rn.node_id,
    '[A-CASE-C] QUIZ',
    'Quiz for the quiz-failed branch.',
    'MANUAL',
    100,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TIMESTAMP '2026-03-30 12:10:00',
    TIMESTAMP '2026-03-30 12:10:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-C] Quiz failed'
  AND NOT EXISTS (
      SELECT 1
      FROM quizzes q
      WHERE q.title = '[A-CASE-C] QUIZ'
  );

INSERT INTO quiz_questions (
    quiz_id,
    question_type,
    question_text,
    explanation,
    points,
    display_order,
    source_timestamp,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    'MULTIPLE_CHOICE',
    'Why should the C-case node remain uncleared?',
    'The quiz was failed even though the tags and assignment passed.',
    100,
    1,
    NULL,
    FALSE,
    TIMESTAMP '2026-03-30 12:10:00',
    TIMESTAMP '2026-03-30 12:10:00'
FROM quizzes q
JOIN roadmap_nodes rn ON rn.node_id = q.node_id
WHERE q.title = '[A-CASE-C] QUIZ'
  AND rn.title = '[A-CASE-C] Quiz failed'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_questions qq
      WHERE qq.quiz_id = q.quiz_id
        AND qq.display_order = 1
  );

INSERT INTO quiz_question_options (
    question_id,
    option_text,
    is_correct,
    display_order,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    qq.question_id,
    option_seed.option_text,
    option_seed.is_correct,
    option_seed.display_order,
    FALSE,
    TIMESTAMP '2026-03-30 12:10:00',
    TIMESTAMP '2026-03-30 12:10:00'
FROM quiz_questions qq
JOIN quizzes q ON q.quiz_id = qq.quiz_id
JOIN (
    SELECT 'A tag is missing' AS option_text, FALSE AS is_correct, 1 AS display_order
    UNION ALL
    SELECT 'The lesson is incomplete', FALSE, 2
    UNION ALL
    SELECT 'The quiz failed', TRUE, 3
    UNION ALL
    SELECT 'No assignment exists', FALSE, 4
) option_seed ON TRUE
WHERE q.title = '[A-CASE-C] QUIZ'
  AND qq.display_order = 1
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_question_options qo
      WHERE qo.question_id = qq.question_id
  );

INSERT INTO assignments (
    node_id,
    title,
    description,
    submission_type,
    due_at,
    allowed_file_formats,
    readme_required,
    test_required,
    lint_required,
    submission_rule_description,
    total_score,
    is_published,
    is_active,
    allow_late_submission,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    rn.node_id,
    '[A-CASE-A] ASSIGNMENT',
    'Assignment for the full-pass branch.',
    'MULTIPLE',
    TIMESTAMP '2026-12-31 23:59:59',
    'zip,pdf',
    TRUE,
    TRUE,
    TRUE,
    'README, tests, lint, and file format must all pass.',
    100,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    TIMESTAMP '2026-03-30 12:20:00',
    TIMESTAMP '2026-03-30 12:20:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-A] Full pass'
  AND NOT EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.title = '[A-CASE-A] ASSIGNMENT'
  );

INSERT INTO assignments (
    node_id,
    title,
    description,
    submission_type,
    due_at,
    allowed_file_formats,
    readme_required,
    test_required,
    lint_required,
    submission_rule_description,
    total_score,
    is_published,
    is_active,
    allow_late_submission,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    rn.node_id,
    '[A-CASE-B] ASSIGNMENT',
    'Assignment for the missing-tag branch.',
    'MULTIPLE',
    TIMESTAMP '2026-12-31 23:59:59',
    'zip,pdf',
    TRUE,
    TRUE,
    TRUE,
    'README, tests, lint, and file format must all pass.',
    100,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    TIMESTAMP '2026-03-30 12:25:00',
    TIMESTAMP '2026-03-30 12:25:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-B] Missing tag'
  AND NOT EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.title = '[A-CASE-B] ASSIGNMENT'
  );

INSERT INTO assignments (
    node_id,
    title,
    description,
    submission_type,
    due_at,
    allowed_file_formats,
    readme_required,
    test_required,
    lint_required,
    submission_rule_description,
    total_score,
    is_published,
    is_active,
    allow_late_submission,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    rn.node_id,
    '[A-CASE-C] ASSIGNMENT',
    'Assignment for the quiz-failed branch.',
    'MULTIPLE',
    TIMESTAMP '2026-12-31 23:59:59',
    'zip,pdf',
    TRUE,
    TRUE,
    TRUE,
    'README, tests, lint, and file format must all pass.',
    100,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    TIMESTAMP '2026-03-30 12:30:00',
    TIMESTAMP '2026-03-30 12:30:00'
FROM roadmap_nodes rn
WHERE rn.title = '[A-CASE-C] Quiz failed'
  AND NOT EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.title = '[A-CASE-C] ASSIGNMENT'
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    100,
    900,
    1.25,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 13:00:00',
    TIMESTAMP '2026-03-30 13:00:00',
    TIMESTAMP '2026-03-30 13:00:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-A] LESSON 1'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    100,
    900,
    1.00,
    FALSE,
    TRUE,
    TIMESTAMP '2026-03-30 13:05:00',
    TIMESTAMP '2026-03-30 13:05:00',
    TIMESTAMP '2026-03-30 13:05:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-B] LESSON 1'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    100,
    900,
    1.50,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 13:10:00',
    TIMESTAMP '2026-03-30 13:10:00',
    TIMESTAMP '2026-03-30 13:10:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-C] LESSON 1'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    95,
    100,
    TIMESTAMP '2026-03-30 13:20:00',
    TIMESTAMP '2026-03-30 13:25:00',
    300,
    TRUE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 13:20:00',
    TIMESTAMP '2026-03-30 13:25:00'
FROM quizzes q
JOIN users u ON u.email = 'learner@devpath.com'
WHERE q.title = '[A-CASE-A] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    88,
    100,
    TIMESTAMP '2026-03-30 13:26:00',
    TIMESTAMP '2026-03-30 13:31:00',
    300,
    TRUE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 13:26:00',
    TIMESTAMP '2026-03-30 13:31:00'
FROM quizzes q
JOIN users u ON u.email = 'learner2@devpath.com'
WHERE q.title = '[A-CASE-B] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    40,
    100,
    TIMESTAMP '2026-03-30 13:32:00',
    TIMESTAMP '2026-03-30 13:37:00',
    300,
    FALSE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 13:32:00',
    TIMESTAMP '2026-03-30 13:37:00'
FROM quizzes q
JOIN users u ON u.email = 'learner@devpath.com'
WHERE q.title = '[A-CASE-C] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Case A submission',
    'https://github.com/devpath/a-case-a',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 13:40:00',
    TIMESTAMP '2026-03-30 13:50:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    97,
    96,
    'All branch conditions are satisfied.',
    'Case A feedback',
    FALSE,
    TIMESTAMP '2026-03-30 13:40:00',
    TIMESTAMP '2026-03-30 13:50:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = '[A-CASE-A] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Case B submission',
    'https://github.com/devpath/a-case-b',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 13:41:00',
    TIMESTAMP '2026-03-30 13:51:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    94,
    93,
    'Submission passes even though one required tag is missing.',
    'Case B feedback',
    FALSE,
    TIMESTAMP '2026-03-30 13:41:00',
    TIMESTAMP '2026-03-30 13:51:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner2@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = '[A-CASE-B] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Case C submission',
    'https://github.com/devpath/a-case-c',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 13:42:00',
    TIMESTAMP '2026-03-30 13:52:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    95,
    95,
    'Assignment passes but the quiz branch still fails.',
    'Case C feedback',
    FALSE,
    TIMESTAMP '2026-03-30 13:42:00',
    TIMESTAMP '2026-03-30 13:52:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = '[A-CASE-C] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.is_deleted = FALSE
  );

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'CLEARED',
    100.00,
    TRUE,
    0,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 14:00:00',
    TIMESTAMP '2026-03-30 14:00:00',
    TIMESTAMP '2026-03-30 14:00:00',
    TIMESTAMP '2026-03-30 14:00:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-CASE-A] Full pass'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'NOT_CLEARED',
    100.00,
    FALSE,
    1,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    NULL,
    TIMESTAMP '2026-03-30 14:05:00',
    TIMESTAMP '2026-03-30 14:05:00',
    TIMESTAMP '2026-03-30 14:05:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-CASE-B] Missing tag'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'NOT_CLEARED',
    100.00,
    TRUE,
    0,
    TRUE,
    FALSE,
    TRUE,
    FALSE,
    NULL,
    TIMESTAMP '2026-03-30 14:10:00',
    TIMESTAMP '2026-03-30 14:10:00',
    TIMESTAMP '2026-03-30 14:10:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-CASE-C] Quiz failed'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

-- ========================================
-- A-PROOF IDEMPOTENCY BRANCHES
-- ========================================
INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-PROOF-ISSUABLE] Proof card issuable',
    'Proof-eligible clearance without a proof card for first-issue verification.',
    'CONCEPT',
    904
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-PROOF-ISSUABLE] Proof card issuable'
);

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-PROOF-PREISSUED] Proof card preissued',
    'Preissued proof card and certificate chain for idempotent reuse verification.',
    'CONCEPT',
    905
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-PROOF-PREISSUED] Proof card preissued'
);

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'CLEARED',
    100.00,
    TRUE,
    0,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 15:00:00',
    TIMESTAMP '2026-03-30 15:00:00',
    TIMESTAMP '2026-03-30 15:00:00',
    TIMESTAMP '2026-03-30 15:00:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-PROOF-ISSUABLE] Proof card issuable'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'CLEARED',
    100.00,
    TRUE,
    0,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 15:05:00',
    TIMESTAMP '2026-03-30 15:05:00',
    TIMESTAMP '2026-03-30 15:05:00',
    TIMESTAMP '2026-03-30 15:05:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-PROOF-PREISSUED] Proof card preissued'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

INSERT INTO proof_cards (
    user_id,
    node_id,
    node_clearance_id,
    title,
    description,
    proof_card_status,
    issued_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    nc.node_clearance_id,
    '[A-PROOF-PREISSUED] Proof card',
    'Preissued proof card for idempotent reuse verification.',
    'ISSUED',
    TIMESTAMP '2026-03-30 15:10:00',
    TIMESTAMP '2026-03-30 15:10:00',
    TIMESTAMP '2026-03-30 15:10:00'
FROM node_clearances nc
JOIN users u ON u.user_id = nc.user_id
JOIN roadmap_nodes rn ON rn.node_id = nc.node_id
WHERE u.email = 'learner@devpath.com'
  AND rn.title = '[A-PROOF-PREISSUED] Proof card preissued'
  AND nc.proof_eligible = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM proof_cards pc
      WHERE pc.node_clearance_id = nc.node_clearance_id
  );

INSERT INTO proof_card_tags (
    proof_card_id,
    tag_id,
    skill_evidence_type
)
WITH target_card AS (
    SELECT pc.proof_card_id
    FROM proof_cards pc
    JOIN roadmap_nodes rn ON rn.node_id = pc.node_id
    WHERE rn.title = '[A-PROOF-PREISSUED] Proof card preissued'
    LIMIT 1
),
ranked_tags AS (
    SELECT t.tag_id, ROW_NUMBER() OVER (ORDER BY t.tag_id) AS rn
    FROM tags t
    WHERE t.is_deleted = FALSE
)
SELECT
    c.proof_card_id,
    t.tag_id,
    'VERIFIED'
FROM target_card c
JOIN ranked_tags t ON t.rn = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM proof_card_tags pct
    WHERE pct.proof_card_id = c.proof_card_id
      AND pct.tag_id = t.tag_id
      AND pct.skill_evidence_type = 'VERIFIED'
);

INSERT INTO proof_card_tags (
    proof_card_id,
    tag_id,
    skill_evidence_type
)
WITH target_card AS (
    SELECT pc.proof_card_id
    FROM proof_cards pc
    JOIN roadmap_nodes rn ON rn.node_id = pc.node_id
    WHERE rn.title = '[A-PROOF-PREISSUED] Proof card preissued'
    LIMIT 1
),
ranked_tags AS (
    SELECT t.tag_id, ROW_NUMBER() OVER (ORDER BY t.tag_id) AS rn
    FROM tags t
    WHERE t.is_deleted = FALSE
)
SELECT
    c.proof_card_id,
    t.tag_id,
    'HELD'
FROM target_card c
JOIN ranked_tags t ON t.rn = 2
WHERE NOT EXISTS (
    SELECT 1
    FROM proof_card_tags pct
    WHERE pct.proof_card_id = c.proof_card_id
      AND pct.tag_id = t.tag_id
      AND pct.skill_evidence_type = 'HELD'
);

INSERT INTO certificates (
    proof_card_id,
    certificate_number,
    certificate_status,
    issued_at,
    pdf_file_name,
    pdf_generated_at,
    last_downloaded_at,
    created_at,
    updated_at
)
SELECT
    pc.proof_card_id,
    'CERT-A-PREISSUED-20260330',
    'PDF_READY',
    TIMESTAMP '2026-03-30 15:15:00',
    'certificate-CERT-A-PREISSUED-20260330.pdf',
    TIMESTAMP '2026-03-30 15:16:00',
    TIMESTAMP '2026-03-30 15:20:00',
    TIMESTAMP '2026-03-30 15:15:00',
    TIMESTAMP '2026-03-30 15:20:00'
FROM proof_cards pc
JOIN roadmap_nodes rn ON rn.node_id = pc.node_id
WHERE rn.title = '[A-PROOF-PREISSUED] Proof card preissued'
  AND NOT EXISTS (
      SELECT 1
      FROM certificates c
      WHERE c.proof_card_id = pc.proof_card_id
  );

INSERT INTO proof_card_shares (
    proof_card_id,
    share_token,
    share_status,
    expires_at,
    access_count,
    created_at,
    updated_at
)
SELECT
    pc.proof_card_id,
    'proof-preissued-token-20260330',
    'ACTIVE',
    TIMESTAMP '2026-12-31 23:59:59',
    2,
    TIMESTAMP '2026-03-30 15:18:00',
    TIMESTAMP '2026-03-30 15:21:00'
FROM proof_cards pc
JOIN roadmap_nodes rn ON rn.node_id = pc.node_id
WHERE rn.title = '[A-PROOF-PREISSUED] Proof card preissued'
  AND NOT EXISTS (
      SELECT 1
      FROM proof_card_shares ps
      WHERE ps.share_token = 'proof-preissued-token-20260330'
  );

INSERT INTO certificate_download_histories (
    certificate_id,
    downloaded_by,
    download_reason,
    downloaded_at
)
SELECT
    c.certificate_id,
    u.user_id,
    'Preissued certificate download verification.',
    TIMESTAMP '2026-03-30 15:20:00'
FROM certificates c
JOIN proof_cards pc ON pc.proof_card_id = c.proof_card_id
JOIN roadmap_nodes rn ON rn.node_id = pc.node_id
JOIN users u ON u.email = 'learner@devpath.com'
WHERE rn.title = '[A-PROOF-PREISSUED] Proof card preissued'
  AND pc.user_id = u.user_id
  AND NOT EXISTS (
      SELECT 1
      FROM certificate_download_histories h
      WHERE h.certificate_id = c.certificate_id
        AND h.downloaded_by = u.user_id
        AND h.download_reason = 'Preissued certificate download verification.'
  );

-- ========================================
-- A-HISTORY READ MODEL
-- ========================================
INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-HISTORY-READ-1] History read node 1',
    'Completed-node fixture for learning-history assembly.',
    'CONCEPT',
    906
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-HISTORY-READ-1] History read node 1'
);

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-HISTORY-READ-2] History read node 2',
    'Second completed-node fixture for learning-history assembly.',
    'CONCEPT',
    907
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-HISTORY-READ-2] History read node 2'
);

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'CLEARED',
    100.00,
    TRUE,
    0,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 16:00:00',
    TIMESTAMP '2026-03-30 16:00:00',
    TIMESTAMP '2026-03-30 16:00:00',
    TIMESTAMP '2026-03-30 16:00:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-HISTORY-READ-1] History read node 1'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

INSERT INTO node_clearances (
    user_id,
    node_id,
    clearance_status,
    lesson_completion_rate,
    required_tags_satisfied,
    missing_tag_count,
    lesson_completed,
    quiz_passed,
    assignment_passed,
    proof_eligible,
    cleared_at,
    last_calculated_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'CLEARED',
    100.00,
    TRUE,
    0,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 16:05:00',
    TIMESTAMP '2026-03-30 16:05:00',
    TIMESTAMP '2026-03-30 16:05:00',
    TIMESTAMP '2026-03-30 16:05:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-HISTORY-READ-2] History read node 2'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = rn.node_id
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
WITH first_assignment AS (
    SELECT a.assignment_id
    FROM assignments a
    ORDER BY a.assignment_id
    LIMIT 1
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Submission for learning-history read-model verification.',
    'https://github.com/devpath/history-read-model',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 16:10:00',
    TIMESTAMP '2026-03-30 16:20:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    91,
    92,
    'Assignment entry for learning-history verification.',
    'Learning-history common feedback',
    FALSE,
    TIMESTAMP '2026-03-30 16:10:00',
    TIMESTAMP '2026-03-30 16:20:00'
FROM first_assignment a
JOIN users lu ON lu.email = 'learner@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE NOT EXISTS (
    SELECT 1
    FROM assignment_submissions s
    WHERE s.assignment_id = a.assignment_id
      AND s.learner_id = lu.user_id
      AND s.submission_url = 'https://github.com/devpath/history-read-model'
      AND s.is_deleted = FALSE
);

INSERT INTO til_drafts (
    user_id,
    lesson_id,
    title,
    content,
    table_of_contents,
    status,
    published_url,
    is_deleted,
    created_at,
    updated_at
)
WITH first_lesson AS (
    SELECT l.lesson_id
    FROM lessons l
    ORDER BY l.lesson_id
    LIMIT 1
)
SELECT
    u.user_id,
    fl.lesson_id,
    'Learning history verification TIL 1',
    '# Learning history notes' || E'\n\n' ||
    '## Completed nodes' || E'\n' ||
    '- reviewed completed-node aggregation' || E'\n\n' ||
    '## Reflection' || E'\n' ||
    'validated the read-model response shape.',
    '[{"level":1,"title":"Learning history notes","anchor":"learning-history-notes"},{"level":2,"title":"Completed nodes","anchor":"completed-nodes"},{"level":2,"title":"Reflection","anchor":"reflection"}]',
    'PUBLISHED',
    'https://velog.io/@devpath/history-read-model-1',
    FALSE,
    TIMESTAMP '2026-03-30 16:30:00',
    TIMESTAMP '2026-03-30 16:35:00'
FROM users u
CROSS JOIN first_lesson fl
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM til_drafts t
      WHERE t.user_id = u.user_id
        AND t.title = 'Learning history verification TIL 1'
        AND t.is_deleted = FALSE
  );

INSERT INTO til_drafts (
    user_id,
    lesson_id,
    title,
    content,
    table_of_contents,
    status,
    published_url,
    is_deleted,
    created_at,
    updated_at
)
WITH first_lesson AS (
    SELECT l.lesson_id
    FROM lessons l
    ORDER BY l.lesson_id
    LIMIT 1
)
SELECT
    u.user_id,
    fl.lesson_id,
    'Learning history verification TIL 2',
    '# Second history TIL' || E'\n\n' ||
    '## Assignment record' || E'\n' ||
    '- checked submission status and score' || E'\n\n' ||
    '## Next action' || E'\n' ||
    'verify share-link and organize responses.',
    '[{"level":1,"title":"Second history TIL","anchor":"second-history-til"},{"level":2,"title":"Assignment record","anchor":"assignment-record"},{"level":2,"title":"Next action","anchor":"next-action"}]',
    'DRAFT',
    NULL,
    FALSE,
    TIMESTAMP '2026-03-30 16:40:00',
    TIMESTAMP '2026-03-30 16:40:00'
FROM users u
CROSS JOIN first_lesson fl
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM til_drafts t
      WHERE t.user_id = u.user_id
        AND t.title = 'Learning history verification TIL 2'
        AND t.is_deleted = FALSE
  );

INSERT INTO learning_history_share_links (
    user_id,
    share_token,
    title,
    expires_at,
    access_count,
    is_active,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    'learning-history-read-model-20260330',
    'Learning history read-model link',
    TIMESTAMP '2026-12-31 23:59:59',
    1,
    TRUE,
    TIMESTAMP '2026-03-30 16:50:00',
    TIMESTAMP '2026-03-30 16:55:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_history_share_links l
      WHERE l.share_token = 'learning-history-read-model-20260330'
  );

-- ========================================
-- A-RECOMMENDATION CHANGE SIGNALS
-- ========================================

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'RECOMMENDATION_CHANGE_ENABLED',
    'Recommendation change feature enabled',
    'Enables recommendation change suggestion creation.',
    'true',
    10,
    'ENABLED',
    TIMESTAMP '2026-03-30 17:00:00',
    TIMESTAMP '2026-03-30 17:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'RECOMMENDATION_CHANGE_ENABLED'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'RECOMMENDATION_CHANGE_MAX_LIMIT',
    'Recommendation change max suggestion limit',
    'Defines the max number of recommendation change suggestions generated in one call.',
    '10',
    11,
    'ENABLED',
    TIMESTAMP '2026-03-30 17:01:00',
    TIMESTAMP '2026-03-30 17:01:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'RECOMMENDATION_CHANGE_MAX_LIMIT'
);

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-RECO-1] Recommendation change suggestion node 1',
    'Recommendation change suggestion verification node 1',
    'CONCEPT',
    908
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-RECO-1] Recommendation change suggestion node 1'
);

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-RECO-2] Recommendation change suggestion node 2',
    'Recommendation change suggestion verification node 2',
    'CONCEPT',
    909
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-RECO-2] Recommendation change suggestion node 2'
);

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    tr.roadmap_id,
    '[A-RECO-3] Recommendation change suggestion node 3',
    'Recommendation change recalculate verification node 3',
    'CONCEPT',
    910
FROM target_roadmap tr
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = '[A-RECO-3] Recommendation change suggestion node 3'
);

INSERT INTO til_drafts (
    user_id,
    lesson_id,
    title,
    content,
    table_of_contents,
    status,
    published_url,
    is_deleted,
    created_at,
    updated_at
)
WITH first_lesson AS (
    SELECT l.lesson_id
    FROM lessons l
    ORDER BY l.lesson_id
    LIMIT 1
)
SELECT
    u.user_id,
    fl.lesson_id,
    'Recommendation change signal TIL',
    '# Recommendation change signal' || E'\n\n' ||
    '## Weak areas' || E'\n' ||
    '- JPA associations and lazy loading need review' || E'\n\n' ||
    '## Next action' || E'\n' ||
    '- Verify supplement recommendation changes.',
    '[{"level":1,"title":"Recommendation change signal","anchor":"recommendation-change-signal"},{"level":2,"title":"Weak areas","anchor":"weak-areas"},{"level":2,"title":"Next action","anchor":"next-action"}]',
    'DRAFT',
    NULL,
    FALSE,
    TIMESTAMP '2026-03-30 17:05:00',
    TIMESTAMP '2026-03-30 17:05:00'
FROM users u
CROSS JOIN first_lesson fl
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM til_drafts t
      WHERE t.user_id = u.user_id
        AND t.title = 'Recommendation change signal TIL'
        AND t.is_deleted = FALSE
  );

INSERT INTO diagnosis_quizzes (
    user_id,
    roadmap_id,
    question_count,
    difficulty,
    created_at,
    submitted_at
)
WITH target_roadmap AS (
    SELECT r.roadmap_id
    FROM roadmaps r
    WHERE COALESCE(r.is_deleted, FALSE) = FALSE
    ORDER BY COALESCE(r.is_official, FALSE) DESC, r.roadmap_id ASC
    LIMIT 1
)
SELECT
    u.user_id,
    tr.roadmap_id,
    5,
    'INTERMEDIATE',
    TIMESTAMP '2026-03-30 17:10:00',
    TIMESTAMP '2026-03-30 17:12:00'
FROM users u
CROSS JOIN target_roadmap tr
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM diagnosis_quizzes dq
      WHERE dq.user_id = u.user_id
        AND dq.roadmap_id = tr.roadmap_id
        AND dq.created_at = TIMESTAMP '2026-03-30 17:10:00'
  );

INSERT INTO diagnosis_results (
    user_id,
    roadmap_id,
    quiz_id,
    score,
    max_score,
    weak_areas,
    recommended_nodes,
    created_at
)
WITH target_quiz AS (
    SELECT dq.quiz_id, dq.user_id, dq.roadmap_id
    FROM diagnosis_quizzes dq
    JOIN users u ON u.user_id = dq.user_id
    WHERE u.email = 'learner@devpath.com'
      AND dq.created_at = TIMESTAMP '2026-03-30 17:10:00'
    LIMIT 1
)
SELECT
    tq.user_id,
    tq.roadmap_id,
    tq.quiz_id,
    48,
    100,
    '["JPA","Lazy Loading","Entity Graph"]',
    '["[A-RECO-1] Recommendation change suggestion node 1","[A-RECO-2] Recommendation change suggestion node 2"]',
    TIMESTAMP '2026-03-30 17:13:00'
FROM target_quiz tq
WHERE NOT EXISTS (
    SELECT 1
    FROM diagnosis_results dr
    WHERE dr.user_id = tq.user_id
      AND dr.quiz_id = tq.quiz_id
  );

INSERT INTO risk_warnings (
    user_id,
    node_id,
    warning_type,
    risk_level,
    message,
    is_acknowledged,
    acknowledged_at,
    created_at
)
SELECT
    u.user_id,
    rn.node_id,
    'PREREQUISITE_GAP',
    'HIGH',
    'Prerequisite knowledge gap detected before entering the next node.',
    FALSE,
    NULL,
    TIMESTAMP '2026-03-30 17:15:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-1] Recommendation change suggestion node 1'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM risk_warnings rw
      WHERE rw.user_id = u.user_id
        AND rw.node_id = rn.node_id
        AND rw.warning_type = 'PREREQUISITE_GAP'
  );

INSERT INTO risk_warnings (
    user_id,
    node_id,
    warning_type,
    risk_level,
    message,
    is_acknowledged,
    acknowledged_at,
    created_at
)
SELECT
    u.user_id,
    rn.node_id,
    'DROP_OFF_RISK',
    'MEDIUM',
    'Recent study patterns indicate a moderate drop-off risk for this node.',
    FALSE,
    NULL,
    TIMESTAMP '2026-03-30 17:16:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-2] Recommendation change suggestion node 2'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM risk_warnings rw
      WHERE rw.user_id = u.user_id
        AND rw.node_id = rn.node_id
        AND rw.warning_type = 'DROP_OFF_RISK'
  );

INSERT INTO supplement_recommendations (
    user_id,
    node_id,
    reason,
    priority,
    coverage_percent,
    missing_tag_count,
    status,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'JPA associations and lazy loading need reinforcement before moving forward.',
    1,
    48.0,
    3,
    'PENDING',
    TIMESTAMP '2026-03-30 17:20:00',
    TIMESTAMP '2026-03-30 17:20:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-1] Recommendation change suggestion node 1'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM supplement_recommendations sr
      WHERE sr.user_id = u.user_id
        AND sr.node_id = rn.node_id
  );

INSERT INTO supplement_recommendations (
    user_id,
    node_id,
    reason,
    priority,
    coverage_percent,
    missing_tag_count,
    status,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'The next node should be delayed until the missing prerequisites are filled.',
    2,
    55.0,
    2,
    'PENDING',
    TIMESTAMP '2026-03-30 17:21:00',
    TIMESTAMP '2026-03-30 17:21:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-2] Recommendation change suggestion node 2'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM supplement_recommendations sr
      WHERE sr.user_id = u.user_id
        AND sr.node_id = rn.node_id
  );

INSERT INTO supplement_recommendations (
    user_id,
    node_id,
    reason,
    priority,
    coverage_percent,
    missing_tag_count,
    status,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    'Pending recommendation kept for recalculate-next-nodes verification.',
    3,
    61.0,
    1,
    'PENDING',
    TIMESTAMP '2026-03-30 17:22:00',
    TIMESTAMP '2026-03-30 17:22:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-3] Recommendation change suggestion node 3'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM supplement_recommendations sr
      WHERE sr.user_id = u.user_id
        AND sr.node_id = rn.node_id
  );

INSERT INTO recommendation_changes (
    user_id,
    node_id,
    source_recommendation_id,
    reason,
    context_summary,
    node_change_type,
    change_status,
    decision_status,
    suggested_at,
    applied_at,
    ignored_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    sr.recommendation_id,
    sr.reason,
    'tilCount=4, weaknessSignal=true, warningCount=2, historyCount=2',
    'ADD',
    'SUGGESTED',
    'UNDECIDED',
    TIMESTAMP '2026-03-30 17:25:00',
    NULL,
    NULL,
    TIMESTAMP '2026-03-30 17:25:00',
    TIMESTAMP '2026-03-30 17:25:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-1] Recommendation change suggestion node 1'
JOIN supplement_recommendations sr
  ON sr.user_id = u.user_id
 AND sr.node_id = rn.node_id
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM recommendation_changes rc
      WHERE rc.user_id = u.user_id
        AND rc.node_id = rn.node_id
        AND rc.change_status = 'SUGGESTED'
  );

INSERT INTO recommendation_changes (
    user_id,
    node_id,
    source_recommendation_id,
    reason,
    context_summary,
    node_change_type,
    change_status,
    decision_status,
    suggested_at,
    applied_at,
    ignored_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    sr.recommendation_id,
    sr.reason,
    'tilCount=4, weaknessSignal=true, warningCount=2, historyCount=2',
    'ADD',
    'SUGGESTED',
    'UNDECIDED',
    TIMESTAMP '2026-03-30 17:26:00',
    NULL,
    NULL,
    TIMESTAMP '2026-03-30 17:26:00',
    TIMESTAMP '2026-03-30 17:26:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-2] Recommendation change suggestion node 2'
JOIN supplement_recommendations sr
  ON sr.user_id = u.user_id
 AND sr.node_id = rn.node_id
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM recommendation_changes rc
      WHERE rc.user_id = u.user_id
        AND rc.node_id = rn.node_id
        AND rc.change_status = 'SUGGESTED'
  );

INSERT INTO recommendation_changes (
    user_id,
    node_id,
    source_recommendation_id,
    reason,
    context_summary,
    node_change_type,
    change_status,
    decision_status,
    suggested_at,
    applied_at,
    ignored_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    sr.recommendation_id,
    sr.reason,
    'tilCount=4, weaknessSignal=true, warningCount=2, historyCount=2',
    'ADD',
    'SUGGESTED',
    'UNDECIDED',
    TIMESTAMP '2026-03-30 17:27:00',
    NULL,
    NULL,
    TIMESTAMP '2026-03-30 17:27:00',
    TIMESTAMP '2026-03-30 17:27:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-3] Recommendation change suggestion node 3'
JOIN supplement_recommendations sr
  ON sr.user_id = u.user_id
 AND sr.node_id = rn.node_id
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM recommendation_changes rc
      WHERE rc.user_id = u.user_id
        AND rc.node_id = rn.node_id
        AND rc.change_status = 'SUGGESTED'
  );

INSERT INTO recommendation_changes (
    user_id,
    node_id,
    source_recommendation_id,
    reason,
    context_summary,
    node_change_type,
    change_status,
    decision_status,
    suggested_at,
    applied_at,
    ignored_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    NULL,
    'Previously applied recommendation change sample.',
    'tilCount=2, weaknessSignal=true, warningCount=1, historyCount=0',
    'ADD',
    'APPLIED',
    'APPLIED',
    TIMESTAMP '2026-03-28 17:00:00',
    TIMESTAMP '2026-03-28 17:10:00',
    NULL,
    TIMESTAMP '2026-03-28 17:00:00',
    TIMESTAMP '2026-03-28 17:10:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-1] Recommendation change suggestion node 1'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM recommendation_changes rc
      WHERE rc.user_id = u.user_id
        AND rc.node_id = rn.node_id
        AND rc.change_status = 'APPLIED'
  );

INSERT INTO recommendation_changes (
    user_id,
    node_id,
    source_recommendation_id,
    reason,
    context_summary,
    node_change_type,
    change_status,
    decision_status,
    suggested_at,
    applied_at,
    ignored_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    rn.node_id,
    NULL,
    'Previously ignored recommendation change sample.',
    'tilCount=1, weaknessSignal=false, warningCount=1, historyCount=1',
    'ADD',
    'IGNORED',
    'IGNORED',
    TIMESTAMP '2026-03-29 18:00:00',
    NULL,
    TIMESTAMP '2026-03-29 18:05:00',
    TIMESTAMP '2026-03-29 18:00:00',
    TIMESTAMP '2026-03-29 18:05:00'
FROM users u
JOIN roadmap_nodes rn ON rn.title = '[A-RECO-2] Recommendation change suggestion node 2'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM recommendation_changes rc
      WHERE rc.user_id = u.user_id
        AND rc.node_id = rn.node_id
        AND rc.change_status = 'IGNORED'
  );

INSERT INTO recommendation_histories (
    user_id,
    recommendation_id,
    node_id,
    before_status,
    after_status,
    action_type,
    context,
    created_at
)
SELECT
    rc.user_id,
    rc.recommendation_change_id,
    rc.node_id,
    'SUGGESTED',
    'APPLIED',
    'CHANGE_APPLY',
    'Previously applied recommendation change sample.',
    TIMESTAMP '2026-03-28 17:10:00'
FROM recommendation_changes rc
JOIN users u ON u.user_id = rc.user_id
JOIN roadmap_nodes rn ON rn.node_id = rc.node_id
WHERE u.email = 'learner@devpath.com'
  AND rn.title = '[A-RECO-1] Recommendation change suggestion node 1'
  AND rc.change_status = 'APPLIED'
  AND NOT EXISTS (
      SELECT 1
      FROM recommendation_histories rh
      WHERE rh.recommendation_id = rc.recommendation_change_id
        AND rh.action_type = 'CHANGE_APPLY'
  );

INSERT INTO recommendation_histories (
    user_id,
    recommendation_id,
    node_id,
    before_status,
    after_status,
    action_type,
    context,
    created_at
)
SELECT
    rc.user_id,
    rc.recommendation_change_id,
    rc.node_id,
    'SUGGESTED',
    'IGNORED',
    'CHANGE_IGNORE',
    'Previously ignored recommendation change sample.',
    TIMESTAMP '2026-03-29 18:05:00'
FROM recommendation_changes rc
JOIN users u ON u.user_id = rc.user_id
JOIN roadmap_nodes rn ON rn.node_id = rc.node_id
WHERE u.email = 'learner@devpath.com'
  AND rn.title = '[A-RECO-2] Recommendation change suggestion node 2'
  AND rc.change_status = 'IGNORED'
  AND NOT EXISTS (
      SELECT 1
      FROM recommendation_histories rh
      WHERE rh.recommendation_id = rc.recommendation_change_id
        AND rh.action_type = 'CHANGE_IGNORE'
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'COMPLETED',
    TIMESTAMP '2026-02-03 09:00:00',
    TIMESTAMP '2026-03-10 22:10:00',
    100,
    TIMESTAMP '2026-03-10 22:10:00'
FROM users u
JOIN courses c ON c.title = 'Spring Boot Intro'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-02-08 13:30:00',
    NULL,
    62,
    TIMESTAMP '2026-03-28 21:15:00'
FROM users u
JOIN courses c ON c.title = 'Spring Boot Intro'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-02-11 18:20:00',
    NULL,
    54,
    TIMESTAMP '2026-03-29 20:40:00'
FROM users u
JOIN courses c ON c.title = 'JPA Practical Design'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-02-12 19:10:00',
    NULL,
    37,
    TIMESTAMP '2026-03-27 23:05:00'
FROM users u
JOIN courses c ON c.title = 'JPA Practical Design'
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-02-14 10:40:00',
    NULL,
    68,
    TIMESTAMP '2026-03-30 18:25:00'
FROM users u
JOIN courses c ON c.title = 'React Dashboard Sprint'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-02-16 09:10:00',
    NULL,
    46,
    TIMESTAMP '2026-03-31 09:35:00'
FROM users u
JOIN courses c ON c.title = 'React Dashboard Sprint'
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

-- ========================================
-- A-INSTRUCTOR ANALYTICS
-- ========================================

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'COMPLETED',
    TIMESTAMP '2026-03-30 18:05:00',
    TIMESTAMP '2026-03-30 18:50:00',
    100,
    TIMESTAMP '2026-03-30 18:50:00'
FROM users u
JOIN courses c ON c.title = '[A-CASE-A] Node Clearance Course'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-03-30 18:06:00',
    NULL,
    72,
    TIMESTAMP '2026-03-30 18:40:00'
FROM users u
JOIN courses c ON c.title = '[A-CASE-A] Node Clearance Course'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-03-30 18:07:00',
    NULL,
    28,
    TIMESTAMP '2026-03-30 18:22:00'
FROM users u
JOIN courses c ON c.title = '[A-CASE-A] Node Clearance Course'
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'COMPLETED',
    TIMESTAMP '2026-03-30 18:10:00',
    TIMESTAMP '2026-03-30 18:55:00',
    100,
    TIMESTAMP '2026-03-30 18:55:00'
FROM users u
JOIN courses c ON c.title = '[A-CASE-B] Tag Missing Course'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-03-30 18:11:00',
    NULL,
    83,
    TIMESTAMP '2026-03-30 18:46:00'
FROM users u
JOIN courses c ON c.title = '[A-CASE-B] Tag Missing Course'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-03-30 18:12:00',
    NULL,
    56,
    TIMESTAMP '2026-03-30 18:33:00'
FROM users u
JOIN courses c ON c.title = '[A-CASE-B] Tag Missing Course'
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'ACTIVE',
    TIMESTAMP '2026-03-30 18:13:00',
    NULL,
    49,
    TIMESTAMP '2026-03-30 18:28:00'
FROM users u
JOIN courses c ON c.title = '[A-CASE-C] Quiz Fail Course'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO course_enrollments (
    user_id,
    course_id,
    status,
    enrolled_at,
    completed_at,
    progress_percentage,
    last_accessed_at
)
SELECT
    u.user_id,
    c.course_id,
    'COMPLETED',
    TIMESTAMP '2026-03-30 18:14:00',
    TIMESTAMP '2026-03-30 18:58:00',
    100,
    TIMESTAMP '2026-03-30 18:58:00'
FROM users u
JOIN courses c ON c.title = '[A-CASE-C] Quiz Fail Course'
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments ce
      WHERE ce.user_id = u.user_id
        AND ce.course_id = c.course_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    68,
    620,
    1.25,
    TRUE,
    FALSE,
    TIMESTAMP '2026-03-30 18:20:00',
    TIMESTAMP '2026-03-30 18:20:00',
    TIMESTAMP '2026-03-30 18:20:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-A] LESSON 1'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    24,
    210,
    1.00,
    FALSE,
    FALSE,
    TIMESTAMP '2026-03-30 18:21:00',
    TIMESTAMP '2026-03-30 18:21:00',
    TIMESTAMP '2026-03-30 18:21:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-A] LESSON 1'
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    100,
    900,
    1.50,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 18:24:00',
    TIMESTAMP '2026-03-30 18:24:00',
    TIMESTAMP '2026-03-30 18:24:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-B] LESSON 1'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    52,
    470,
    1.00,
    FALSE,
    FALSE,
    TIMESTAMP '2026-03-30 18:25:00',
    TIMESTAMP '2026-03-30 18:25:00',
    TIMESTAMP '2026-03-30 18:25:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-B] LESSON 1'
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    44,
    390,
    1.25,
    TRUE,
    FALSE,
    TIMESTAMP '2026-03-30 18:26:00',
    TIMESTAMP '2026-03-30 18:26:00',
    TIMESTAMP '2026-03-30 18:26:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-C] LESSON 1'
WHERE u.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO lesson_progress (
    user_id,
    lesson_id,
    progress_percent,
    progress_seconds,
    default_playback_rate,
    is_pip_enabled,
    is_completed,
    last_watched_at,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    l.lesson_id,
    100,
    900,
    1.75,
    TRUE,
    TRUE,
    TIMESTAMP '2026-03-30 18:27:00',
    TIMESTAMP '2026-03-30 18:27:00',
    TIMESTAMP '2026-03-30 18:27:00'
FROM users u
JOIN lessons l ON l.title = '[A-CASE-C] LESSON 1'
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    45,
    100,
    TIMESTAMP '2026-03-30 18:30:00',
    TIMESTAMP '2026-03-30 18:35:00',
    300,
    FALSE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 18:30:00',
    TIMESTAMP '2026-03-30 18:35:00'
FROM quizzes q
JOIN users u ON u.email = 'learner2@devpath.com'
WHERE q.title = '[A-CASE-A] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    82,
    100,
    TIMESTAMP '2026-03-30 18:31:00',
    TIMESTAMP '2026-03-30 18:36:00',
    280,
    TRUE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 18:31:00',
    TIMESTAMP '2026-03-30 18:36:00'
FROM quizzes q
JOIN users u ON u.email = 'learner3@devpath.com'
WHERE q.title = '[A-CASE-A] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    90,
    100,
    TIMESTAMP '2026-03-30 18:32:00',
    TIMESTAMP '2026-03-30 18:37:00',
    260,
    TRUE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 18:32:00',
    TIMESTAMP '2026-03-30 18:37:00'
FROM quizzes q
JOIN users u ON u.email = 'learner@devpath.com'
WHERE q.title = '[A-CASE-B] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    38,
    100,
    TIMESTAMP '2026-03-30 18:33:00',
    TIMESTAMP '2026-03-30 18:38:00',
    310,
    FALSE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 18:33:00',
    TIMESTAMP '2026-03-30 18:38:00'
FROM quizzes q
JOIN users u ON u.email = 'learner3@devpath.com'
WHERE q.title = '[A-CASE-B] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    42,
    100,
    TIMESTAMP '2026-03-30 18:34:00',
    TIMESTAMP '2026-03-30 18:39:00',
    320,
    FALSE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 18:34:00',
    TIMESTAMP '2026-03-30 18:39:00'
FROM quizzes q
JOIN users u ON u.email = 'learner2@devpath.com'
WHERE q.title = '[A-CASE-C] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO quiz_attempts (
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    q.quiz_id,
    u.user_id,
    84,
    100,
    TIMESTAMP '2026-03-30 18:35:00',
    TIMESTAMP '2026-03-30 18:40:00',
    270,
    TRUE,
    1,
    FALSE,
    TIMESTAMP '2026-03-30 18:35:00',
    TIMESTAMP '2026-03-30 18:40:00'
FROM quizzes q
JOIN users u ON u.email = 'learner3@devpath.com'
WHERE q.title = '[A-CASE-C] QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
        AND qa.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Instructor analytics submission A-2',
    'https://github.com/devpath/instructor-analytics-a-2',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 18:41:00',
    TIMESTAMP '2026-03-30 18:51:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    61,
    58,
    'Needs stronger test coverage.',
    'A course analytics sample',
    FALSE,
    TIMESTAMP '2026-03-30 18:41:00',
    TIMESTAMP '2026-03-30 18:51:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner2@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = '[A-CASE-A] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.submission_url = 'https://github.com/devpath/instructor-analytics-a-2'
        AND s.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Instructor analytics submission A-3',
    'https://github.com/devpath/instructor-analytics-a-3',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 18:42:00',
    TIMESTAMP '2026-03-30 18:52:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    84,
    81,
    'Solid structure with minor gaps.',
    'A course analytics sample',
    FALSE,
    TIMESTAMP '2026-03-30 18:42:00',
    TIMESTAMP '2026-03-30 18:52:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner3@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = '[A-CASE-A] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.submission_url = 'https://github.com/devpath/instructor-analytics-a-3'
        AND s.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Instructor analytics submission B-1',
    'https://github.com/devpath/instructor-analytics-b-1',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 18:43:00',
    TIMESTAMP '2026-03-30 18:53:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    89,
    88,
    'Stable submission quality.',
    'B course analytics sample',
    FALSE,
    TIMESTAMP '2026-03-30 18:43:00',
    TIMESTAMP '2026-03-30 18:53:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = '[A-CASE-B] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.submission_url = 'https://github.com/devpath/instructor-analytics-b-1'
        AND s.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    NULL,
    'Instructor analytics submission B-3',
    'https://github.com/devpath/instructor-analytics-b-3',
    FALSE,
    'PRECHECK_FAILED',
    TIMESTAMP '2026-03-30 18:44:00',
    NULL,
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    34,
    NULL,
    NULL,
    NULL,
    FALSE,
    TIMESTAMP '2026-03-30 18:44:00',
    TIMESTAMP '2026-03-30 18:44:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner3@devpath.com'
WHERE a.title = '[A-CASE-B] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.submission_url = 'https://github.com/devpath/instructor-analytics-b-3'
        AND s.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Instructor analytics submission C-2',
    'https://github.com/devpath/instructor-analytics-c-2',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 18:45:00',
    TIMESTAMP '2026-03-30 18:55:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    47,
    42,
    'Quality needs more work.',
    'C course analytics sample',
    FALSE,
    TIMESTAMP '2026-03-30 18:45:00',
    TIMESTAMP '2026-03-30 18:55:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner2@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = '[A-CASE-C] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.submission_url = 'https://github.com/devpath/instructor-analytics-c-2'
        AND s.is_deleted = FALSE
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    grader_id,
    submission_text,
    submission_url,
    is_late,
    submission_status,
    submitted_at,
    graded_at,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    quality_score,
    total_score,
    individual_feedback,
    common_feedback,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    'Instructor analytics submission C-3',
    'https://github.com/devpath/instructor-analytics-c-3',
    FALSE,
    'GRADED',
    TIMESTAMP '2026-03-30 18:46:00',
    TIMESTAMP '2026-03-30 18:56:00',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    95,
    94,
    'Excellent submission quality.',
    'C course analytics sample',
    FALSE,
    TIMESTAMP '2026-03-30 18:46:00',
    TIMESTAMP '2026-03-30 18:56:00'
FROM assignments a
JOIN users lu ON lu.email = 'learner3@devpath.com'
JOIN users iu ON iu.email = 'instructor@devpath.com'
WHERE a.title = '[A-CASE-C] ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = lu.user_id
        AND s.submission_url = 'https://github.com/devpath/instructor-analytics-c-3'
        AND s.is_deleted = FALSE
  );

-- ========================================
-- A-ADMIN LEARNING RULES AND METRICS
-- ========================================

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'TAG_AUTO_CLASSIFICATION_ENABLED',
    'Tag auto classification rule',
    'Enables tag-based automatic course classification.',
    'true',
    20,
    'ENABLED',
    TIMESTAMP '2026-03-30 19:00:00',
    TIMESTAMP '2026-03-30 19:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'TAG_AUTO_CLASSIFICATION_ENABLED'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'NODE_CLEARANCE_AUTO_JUDGE',
    'Node clearance auto judge rule',
    'Evaluates lessons, required tags, quizzes, and assignments together.',
    'LESSON_100_AND_REQUIRED_TAGS_AND_EVALUATION_PASS',
    21,
    'ENABLED',
    TIMESTAMP '2026-03-30 19:01:00',
    TIMESTAMP '2026-03-30 19:01:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'NODE_CLEARANCE_AUTO_JUDGE'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'SUPPLEMENT_RECOMMENDATION_ENABLED',
    'Supplement recommendation rule',
    'Creates supplement recommendations from learning risk and tag gaps.',
    'true',
    22,
    'ENABLED',
    TIMESTAMP '2026-03-30 19:02:00',
    TIMESTAMP '2026-03-30 19:02:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'SUPPLEMENT_RECOMMENDATION_ENABLED'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'PROOF_CARD_AUTO_ISSUE',
    'Proof card auto issue rule',
    'Auto-issues proof cards only for proof-eligible clearances.',
    'PROOF_ELIGIBLE_ONLY',
    23,
    'ENABLED',
    TIMESTAMP '2026-03-30 19:03:00',
    TIMESTAMP '2026-03-30 19:03:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'PROOF_CARD_AUTO_ISSUE'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'PROOF_CARD_MANUAL_ISSUE',
    'Proof card manual issue rule',
    'Allows manual proof card issuance or re-issuance by admins.',
    'true',
    24,
    'DISABLED',
    TIMESTAMP '2026-03-30 19:04:00',
    TIMESTAMP '2026-03-30 19:04:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'PROOF_CARD_MANUAL_ISSUE'
);

INSERT INTO learning_automation_rules (
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
)
SELECT
    'RECOMMENDATION_CHANGE_ENABLED',
    'Recommendation change rule',
    'Enables recommendation change suggestion and apply flows.',
    'true',
    25,
    'ENABLED',
    TIMESTAMP '2026-03-30 19:05:00',
    TIMESTAMP '2026-03-30 19:05:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'RECOMMENDATION_CHANGE_ENABLED'
);

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'OVERVIEW',
    'adminOverviewBaseline',
    72.4,
    TIMESTAMP '2026-03-30 19:10:00',
    TIMESTAMP '2026-03-30 19:10:00'
FROM courses c
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'OVERVIEW'
        AND s.metric_label = 'adminOverviewBaseline'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:10:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'COMPLETION_RATE',
    'roadmapCompletionRate',
    41.67,
    TIMESTAMP '2026-03-30 19:11:00',
    TIMESTAMP '2026-03-30 19:11:00'
FROM courses c
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'COMPLETION_RATE'
        AND s.metric_label = 'roadmapCompletionRate'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:11:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'AVERAGE_WATCH_TIME',
    'averageLearningDurationSeconds',
    611.67,
    TIMESTAMP '2026-03-30 19:12:00',
    TIMESTAMP '2026-03-30 19:12:00'
FROM courses c
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'AVERAGE_WATCH_TIME'
        AND s.metric_label = 'averageLearningDurationSeconds'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:12:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'QUIZ_STATS',
    'quizQualityScore',
    63.5,
    TIMESTAMP '2026-03-30 19:13:00',
    TIMESTAMP '2026-03-30 19:13:00'
FROM courses c
WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'QUIZ_STATS'
        AND s.metric_label = 'quizQualityScore'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:13:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'ASSIGNMENT_STATS',
    'assignmentAverageScore',
    76.8,
    TIMESTAMP '2026-03-30 19:14:00',
    TIMESTAMP '2026-03-30 19:14:00'
FROM courses c
WHERE c.title = '[A-CASE-B] Tag Missing Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'ASSIGNMENT_STATS'
        AND s.metric_label = 'assignmentAverageScore'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:14:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'DROP_OFF',
    'dropOffRate',
    33.33,
    TIMESTAMP '2026-03-30 19:15:00',
    TIMESTAMP '2026-03-30 19:15:00'
FROM courses c
WHERE c.title = '[A-CASE-A] Node Clearance Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'DROP_OFF'
        AND s.metric_label = 'dropOffRate'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:15:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'DIFFICULTY',
    'difficultyScore',
    58.2,
    TIMESTAMP '2026-03-30 19:16:00',
    TIMESTAMP '2026-03-30 19:16:00'
FROM courses c
WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'DIFFICULTY'
        AND s.metric_label = 'difficultyScore'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:16:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'FUNNEL',
    'completionFunnel',
    66.67,
    TIMESTAMP '2026-03-30 19:17:00',
    TIMESTAMP '2026-03-30 19:17:00'
FROM courses c
WHERE c.title = '[A-CASE-B] Tag Missing Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'FUNNEL'
        AND s.metric_label = 'completionFunnel'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:17:00'
  );

INSERT INTO learning_metric_samples (
    course_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT
    c.course_id,
    'WEAK_POINT',
    'weakPointRatio',
    29.4,
    TIMESTAMP '2026-03-30 19:18:00',
    TIMESTAMP '2026-03-30 19:18:00'
FROM courses c
WHERE c.title = '[A-CASE-C] Quiz Fail Course'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_metric_samples s
      WHERE s.course_id = c.course_id
        AND s.metric_type = 'WEAK_POINT'
        AND s.metric_label = 'weakPointRatio'
        AND s.sampled_at = TIMESTAMP '2026-03-30 19:18:00'
  );

-- ========================================
-- A SECTION STABILITY FOOTER
-- ========================================

UPDATE tags
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

UPDATE lesson_progress
SET is_pip_enabled = FALSE
WHERE is_pip_enabled IS NULL;

UPDATE quiz_attempts
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

UPDATE assignment_submissions
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

UPDATE til_drafts
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

UPDATE timestamp_notes
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

UPDATE learning_history_share_links
SET is_active = TRUE
WHERE is_active IS NULL;

SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM users), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('tags', 'tag_id'), COALESCE((SELECT MAX(tag_id) FROM tags), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('roadmap_nodes', 'node_id'), COALESCE((SELECT MAX(node_id) FROM roadmap_nodes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('courses', 'course_id'), COALESCE((SELECT MAX(course_id) FROM courses), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('course_sections', 'section_id'), COALESCE((SELECT MAX(section_id) FROM course_sections), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('lessons', 'lesson_id'), COALESCE((SELECT MAX(lesson_id) FROM lessons), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('quizzes', 'quiz_id'), COALESCE((SELECT MAX(quiz_id) FROM quizzes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('assignments', 'assignment_id'), COALESCE((SELECT MAX(assignment_id) FROM assignments), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('course_node_mappings', 'course_node_mapping_id'), COALESCE((SELECT MAX(course_node_mapping_id) FROM course_node_mappings), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('course_enrollments', 'enrollment_id'), COALESCE((SELECT MAX(enrollment_id) FROM course_enrollments), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('lesson_progress', 'progress_id'), COALESCE((SELECT MAX(progress_id) FROM lesson_progress), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('quiz_attempts', 'attempt_id'), COALESCE((SELECT MAX(attempt_id) FROM quiz_attempts), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('assignment_submissions', 'submission_id'), COALESCE((SELECT MAX(submission_id) FROM assignment_submissions), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('til_drafts', 'til_id'), COALESCE((SELECT MAX(til_id) FROM til_drafts), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('timestamp_notes', 'note_id'), COALESCE((SELECT MAX(note_id) FROM timestamp_notes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('supplement_recommendations', 'recommendation_id'), COALESCE((SELECT MAX(recommendation_id) FROM supplement_recommendations), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('node_clearances', 'node_clearance_id'), COALESCE((SELECT MAX(node_clearance_id) FROM node_clearances), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('proof_cards', 'proof_card_id'), COALESCE((SELECT MAX(proof_card_id) FROM proof_cards), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('proof_card_shares', 'proof_card_share_id'), COALESCE((SELECT MAX(proof_card_share_id) FROM proof_card_shares), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('learning_history_share_links', 'learning_history_share_link_id'), COALESCE((SELECT MAX(learning_history_share_link_id) FROM learning_history_share_links), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('certificates', 'certificate_id'), COALESCE((SELECT MAX(certificate_id) FROM certificates), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('certificate_download_histories', 'certificate_download_history_id'), COALESCE((SELECT MAX(certificate_download_history_id) FROM certificate_download_histories), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('learning_automation_rules', 'learning_automation_rule_id'), COALESCE((SELECT MAX(learning_automation_rule_id) FROM learning_automation_rules), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('learning_metric_samples', 'learning_metric_sample_id'), COALESCE((SELECT MAX(learning_metric_sample_id) FROM learning_metric_samples), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('recommendation_changes', 'recommendation_change_id'), COALESCE((SELECT MAX(recommendation_change_id) FROM recommendation_changes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('recommendation_histories', 'history_id'), COALESCE((SELECT MAX(history_id) FROM recommendation_histories), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('diagnosis_quizzes', 'quiz_id'), COALESCE((SELECT MAX(quiz_id) FROM diagnosis_quizzes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('diagnosis_results', 'result_id'), COALESCE((SELECT MAX(result_id) FROM diagnosis_results), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('risk_warnings', 'warning_id'), COALESCE((SELECT MAX(warning_id) FROM risk_warnings), 0) + 1, false);

INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'learner4@devpath.com',
    '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
    '최유진',
    'ROLE_LEARNER',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'learner4@devpath.com'
);

UPDATE study_group
SET status = 'RECRUITING'
WHERE name = 'Spring Boot API Study Crew'
  AND is_deleted = FALSE;

UPDATE study_group
SET status = 'IN_PROGRESS'
WHERE name = 'Algorithm Deep Dive'
  AND is_deleted = FALSE;

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT
    sg.id,
    u.user_id,
    'PENDING',
    NULL
FROM study_group sg, users u
WHERE sg.name = 'Algorithm Deep Dive'
  AND u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM study_group_member sgm
      WHERE sgm.group_id = sg.id
        AND sgm.learner_id = u.user_id
  );

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT
    sg.id,
    u.user_id,
    'PENDING',
    NULL
FROM study_group sg, users u
WHERE sg.name = 'Spring Boot API Study Crew'
  AND u.email = 'learner4@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM study_group_member sgm
      WHERE sgm.group_id = sg.id
        AND sgm.learner_id = u.user_id
  );

INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT
    u.user_id,
    'STUDY_GROUP',
    'Algorithm Deep Dive 스터디 참여 신청이 접수되었습니다.',
    FALSE,
    '2026-03-30 09:10:00'
FROM users u
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_notification n
      WHERE n.learner_id = u.user_id
        AND n.message = 'Algorithm Deep Dive 스터디 참여 신청이 접수되었습니다.'
  );

INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT
    u.user_id,
    'PROJECT',
    'DevPath Team Workspace 프로젝트 초대가 도착했습니다.',
    FALSE,
    '2026-03-30 10:00:00'
FROM users u
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_notification n
      WHERE n.learner_id = u.user_id
        AND n.message = 'DevPath Team Workspace 프로젝트 초대가 도착했습니다.'
  );

INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT
    u.user_id,
    'PLANNER',
    '이번 주 학습 플랜 조정이 완료되었습니다.',
    TRUE,
    '2026-03-30 10:30:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learner_notification n
      WHERE n.learner_id = u.user_id
        AND n.message = '이번 주 학습 플랜 조정이 완료되었습니다.'
  );

UPDATE streak
SET current_streak = 5,
    longest_streak = GREATEST(longest_streak, 5),
    last_study_date = DATE '2026-03-30'
WHERE learner_id = (
    SELECT user_id
    FROM users
    WHERE email = 'learner@devpath.com'
);

INSERT INTO recovery_plan (learner_id, plan_details, created_at)
SELECT
    u.user_id,
    '복귀 플랜: 오늘 30분 복습, 내일 1시간 실습, 모레 스터디 발표 준비',
    '2026-03-30 07:00:00'
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM recovery_plan rp
      WHERE rp.learner_id = u.user_id
        AND rp.plan_details = '복귀 플랜: 오늘 30분 복습, 내일 1시간 실습, 모레 스터디 발표 준비'
  );

UPDATE project_invitation
SET status = 'PENDING'
WHERE project_id = (
    SELECT id
    FROM project
    WHERE name = 'DevPath Team Workspace'
      AND is_deleted = FALSE
)
AND invitee_id = (
    SELECT user_id
    FROM users
    WHERE email = 'learner3@devpath.com'
);

INSERT INTO project_role (project_id, role_type, required_count)
SELECT
    p.id,
    'DESIGNER',
    1
FROM project p
WHERE p.name = 'DevPath Team Workspace'
  AND NOT EXISTS (
      SELECT 1
      FROM project_role pr
      WHERE pr.project_id = p.id
        AND pr.role_type = 'DESIGNER'
  );

INSERT INTO mentoring_application (project_id, mentor_id, message, status, created_at)
SELECT
    p.id,
    mentor.user_id,
    '프로젝트 API 설계 리뷰와 시연 흐름 검토가 필요합니다.',
    'PENDING',
    '2026-03-30 11:00:00'
FROM project p, users mentor
WHERE p.name = 'DevPath Team Workspace'
  AND mentor.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM mentoring_application ma
      WHERE ma.project_id = p.id
        AND ma.message = '프로젝트 API 설계 리뷰와 시연 흐름 검토가 필요합니다.'
  );

INSERT INTO project_idea_post (author_id, title, content, status, is_deleted, created_at)
SELECT
    u.user_id,
    '스터디 그룹-프로젝트 연동 아이디어',
    '같은 노드 학습자 자동 매칭 후 프로젝트 팀 빌딩으로 자연스럽게 이어지는 흐름을 제안합니다.',
    'PUBLISHED',
    FALSE,
    '2026-03-30 12:00:00'
FROM users u
WHERE u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_idea_post pip
      WHERE pip.author_id = u.user_id
        AND pip.title = '스터디 그룹-프로젝트 연동 아이디어'
  );

INSERT INTO project_proof_submission (project_id, submitter_id, proof_card_ref_id, submitted_at)
SELECT
    p.id,
    u.user_id,
    'PROOF-C-004',
    '2026-03-30 12:30:00'
FROM project p, users u
WHERE p.name = 'DevPath Team Workspace'
  AND u.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM project_proof_submission pps
      WHERE pps.project_id = p.id
        AND pps.submitter_id = u.user_id
        AND pps.proof_card_ref_id = 'PROOF-C-004'
  );

SELECT setval('users_user_id_seq', (SELECT COALESCE(MAX(user_id), 1) FROM users));
SELECT setval('study_group_member_id_seq', (SELECT COALESCE(MAX(id), 1) FROM study_group_member));
SELECT setval('learner_notification_id_seq', (SELECT COALESCE(MAX(id), 1) FROM learner_notification));
SELECT setval('recovery_plan_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recovery_plan));
SELECT setval('project_role_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_role));
SELECT setval('mentoring_application_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mentoring_application));
SELECT setval('project_idea_post_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_idea_post));
SELECT setval('project_proof_submission_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_proof_submission));

-- ============================================================
-- Backend Master Roadmap 노드 전면 교체 (기존 영문 노드 → 한국어 상세 노드)
-- ============================================================

-- Backend Master Roadmap 노드 삭제 전 모든 FK 의존 테이블 정리
-- 완전한 FK 체인 순서 (가장 깊은 자식 → 부모 순)
-- 1단계: quiz_answers (quiz_attempts, quiz_questions, quiz_question_options 참조)
DELETE FROM quiz_answers
WHERE attempt_id IN (
    SELECT qa.attempt_id FROM quiz_attempts qa
    WHERE qa.quiz_id IN (
        SELECT quiz_id FROM quizzes
        WHERE node_id IN (SELECT node_id FROM roadmap_nodes
            WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap'))
    )
);

-- 2단계: quiz_question_options (quiz_questions 참조)
DELETE FROM quiz_question_options
WHERE question_id IN (
    SELECT qq.question_id FROM quiz_questions qq
    WHERE qq.quiz_id IN (
        SELECT quiz_id FROM quizzes
        WHERE node_id IN (SELECT node_id FROM roadmap_nodes
            WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap'))
    )
);

-- 3단계: quiz_attempts (quizzes 참조)
DELETE FROM quiz_attempts
WHERE quiz_id IN (
    SELECT quiz_id FROM quizzes
    WHERE node_id IN (SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap'))
);

-- 4단계: quiz_questions (quizzes 참조)
DELETE FROM quiz_questions
WHERE quiz_id IN (
    SELECT quiz_id FROM quizzes
    WHERE node_id IN (SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap'))
);

-- 5단계: quizzes (roadmap_nodes 참조)
DELETE FROM quizzes
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 6단계: assignment_submission_files (assignment_submissions 참조)
DELETE FROM assignment_submission_files
WHERE submission_id IN (
    SELECT s.submission_id FROM assignment_submissions s
    WHERE s.assignment_id IN (
        SELECT assignment_id FROM assignments
        WHERE node_id IN (SELECT node_id FROM roadmap_nodes
            WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap'))
    )
);

-- 7단계: assignment_submissions (assignments 참조)
DELETE FROM assignment_submissions
WHERE assignment_id IN (
    SELECT assignment_id FROM assignments
    WHERE node_id IN (SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap'))
);

-- 8단계: assignment_rubrics (assignments 참조)
DELETE FROM assignment_rubrics
WHERE assignment_id IN (
    SELECT assignment_id FROM assignments
    WHERE node_id IN (SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap'))
);

-- 9단계: assignments (roadmap_nodes 참조)
DELETE FROM assignments
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 10단계: certificate_download_histories (certificates 참조)
DELETE FROM certificate_download_histories
WHERE certificate_id IN (
    SELECT c.certificate_id FROM certificates c
    JOIN proof_cards pc ON pc.proof_card_id = c.proof_card_id
    WHERE pc.node_id IN (
        SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
    )
);

-- 11단계: certificates (proof_cards 참조)
DELETE FROM certificates
WHERE proof_card_id IN (
    SELECT pc.proof_card_id FROM proof_cards pc
    WHERE pc.node_id IN (
        SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
    )
);

-- 12단계: proof_card_shares, proof_card_tags (proof_cards 참조)
DELETE FROM proof_card_shares
WHERE proof_card_id IN (
    SELECT pc.proof_card_id FROM proof_cards pc
    WHERE pc.node_id IN (
        SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
    )
);

DELETE FROM proof_card_tags
WHERE proof_card_id IN (
    SELECT pc.proof_card_id FROM proof_cards pc
    WHERE pc.node_id IN (
        SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
    )
);

-- 13단계: proof_cards (roadmap_nodes, node_clearances 참조)
DELETE FROM proof_cards
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 14단계: node_clearance_reasons (node_clearances 참조)
DELETE FROM node_clearance_reasons
WHERE node_clearance_id IN (
    SELECT nc.node_clearance_id FROM node_clearances nc
    WHERE nc.node_id IN (
        SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
    )
);

-- 15단계: node_clearances (roadmap_nodes 참조)
DELETE FROM node_clearances
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 16단계: course_node_mappings (roadmap_nodes 참조)
DELETE FROM course_node_mappings
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 17단계: recommendation_changes, recommendation_histories, risk_warnings, supplement_recommendations
DELETE FROM recommendation_changes
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

DELETE FROM recommendation_histories
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

DELETE FROM risk_warnings
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

DELETE FROM supplement_recommendations
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 18단계: node_completion_rules, node_recommendations, node_required_tags, prerequisites
DELETE FROM node_completion_rules
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

DELETE FROM node_recommendations
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

DELETE FROM node_required_tags
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

DELETE FROM prerequisites
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
) OR pre_node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 19단계: custom_node_prerequisites (custom_roadmap_nodes 참조)
DELETE FROM custom_node_prerequisites
WHERE custom_node_id IN (
    SELECT crn.custom_node_id FROM custom_roadmap_nodes crn
    WHERE crn.original_node_id IN (
        SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
    )
) OR prerequisite_custom_node_id IN (
    SELECT crn.custom_node_id FROM custom_roadmap_nodes crn
    WHERE crn.original_node_id IN (
        SELECT node_id FROM roadmap_nodes
        WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
    )
);

-- 20단계: custom_roadmap_nodes (roadmap_nodes 참조)
DELETE FROM custom_roadmap_nodes
WHERE original_node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 21단계: custom_roadmaps (roadmaps 참조)
DELETE FROM custom_roadmaps
WHERE original_roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap');

-- 22단계: roadmap_node_resources (roadmap_nodes 참조)
DELETE FROM roadmap_node_resources
WHERE node_id IN (
    SELECT node_id FROM roadmap_nodes
    WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap')
);

-- 23단계: roadmap_nodes 삭제 (모든 자식 정리 완료)
DELETE FROM roadmap_nodes
WHERE roadmap_id = (SELECT roadmap_id FROM roadmaps WHERE title = 'Backend Master Roadmap');

-- 척추 노드 (branch_group = NULL)
INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, '인터넷 & 웹 기초',
       '백엔드 개발자는 브라우저 요청이 DNS 조회, TCP/TLS 연결, HTTP 요청/응답을 거쳐 서버 애플리케이션까지 도달하는 흐름을 이해해야 합니다. 이 단계에서는 URL을 입력했을 때 어떤 네트워크 계층을 지나고 서버가 어떤 기준으로 응답을 만드는지 익힙니다.',
       'CONCEPT', 1, 'HTTP 요청/응답: 클라이언트가 리소스를 요청하고 서버가 상태 코드와 본문을 돌려주는 구조,DNS: 도메인 이름을 실제 서버 IP로 찾는 이름 해석 시스템,HTTPS와 TLS: 통신 내용을 암호화하고 서버 신뢰성을 검증하는 보안 계층,브라우저와 서버 흐름: URL 입력부터 렌더링 직전까지 이어지는 전체 요청 경로', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'OS & 터미널',
       '운영체제는 백엔드 애플리케이션이 실제로 실행되는 바닥입니다. 파일 권한, 프로세스, 포트, 로그, 환경 변수, 메모리 사용량을 터미널에서 확인할 수 있어야 장애 상황에서 원인을 좁힐 수 있습니다.',
       'CONCEPT', 2, '프로세스와 스레드: 프로그램 실행 단위와 동시 처리의 기본 구조,파일 시스템과 권한: 서버 파일 위치와 읽기 쓰기 실행 권한을 다루는 기준,셸 명령과 파이프: 로그 확인과 배포 작업을 자동화하는 터미널 활용법,포트와 I/O: 네트워크 연결과 입출력 자원이 애플리케이션에 미치는 영향', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Java 기초',
       'Spring Boot를 제대로 쓰려면 Java 문법을 단순 암기보다 객체 모델과 타입 시스템 관점에서 이해해야 합니다. 클래스, 인터페이스, 컬렉션, 예외 처리, 제네릭을 익히면 서비스 계층과 도메인 코드를 안정적으로 설계할 수 있습니다.',
       'CONCEPT', 3, 'JVM: Java 코드가 운영체제와 무관하게 실행되는 런타임 구조,OOP: 책임을 가진 객체들이 협력하도록 코드를 나누는 설계 방식,컬렉션 프레임워크: List Set Map으로 데이터를 목적에 맞게 다루는 표준 도구,예외 처리: 실패 상황을 호출 흐름 안에서 명확하게 다루는 방법,제네릭: 타입 안정성을 유지하면서 재사용 가능한 코드를 만드는 문법', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Git & 버전 관리',
       'Git은 코드 저장 도구를 넘어 팀 작업의 변경 이력과 의사결정을 남기는 시스템입니다. 브랜치 전략, 커밋 단위, PR 리뷰 흐름을 이해하면 기능 개발과 버그 수정이 섞이지 않고 안전하게 배포할 수 있습니다.',
       'PRACTICE', 4, '커밋: 의미 있는 변경 단위를 기록하는 기본 단위,브랜치: 기능 개발과 배포 라인을 분리하는 작업 공간,Pull Request: 코드 리뷰와 변경 검증을 거쳐 병합하는 협업 절차,충돌 해결: 같은 코드 영역의 변경을 사람이 판단해 정리하는 과정', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'RDB & SQL',
       '대부분의 백엔드 서비스는 관계형 데이터베이스에 핵심 데이터를 저장합니다. 테이블 설계, JOIN, 인덱스, 트랜잭션을 이해해야 데이터 정합성을 지키면서도 조회 성능을 유지할 수 있습니다.',
       'CONCEPT', 5, '테이블과 관계: 데이터를 행과 열로 저장하고 외래키로 연결하는 구조,JOIN: 여러 테이블에 나뉜 데이터를 하나의 결과로 조합하는 방법,인덱스: 조회 속도를 높이지만 쓰기 비용을 함께 고려해야 하는 자료구조,트랜잭션과 ACID: 여러 데이터 변경을 하나의 안전한 작업 단위로 묶는 원칙', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'REST API 설계',
       'REST API는 프론트엔드와 백엔드가 약속하는 가장 흔한 통신 규칙입니다. URI를 리소스 중심으로 설계하고 HTTP 메서드와 상태 코드를 일관되게 쓰면 클라이언트가 예측 가능한 API를 사용할 수 있습니다.',
       'CONCEPT', 6, '리소스 중심 URI: 행위보다 대상을 기준으로 API 주소를 설계하는 방식,HTTP 메서드: GET POST PUT PATCH DELETE의 의도를 구분하는 약속,상태 코드: 요청 결과를 숫자로 명확하게 전달하는 표준,OpenAPI: API 사용법과 스키마를 문서로 공유하는 명세', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Spring Boot & MVC',
       'Spring Boot는 설정 부담을 줄여 애플리케이션을 빠르게 띄우고 Spring MVC는 요청이 컨트롤러까지 도달하는 웹 계층 흐름을 담당합니다. DI, Bean, DispatcherServlet, 계층 구조를 이해해야 기능이 커져도 코드가 무너지지 않습니다.',
       'CONCEPT', 7, 'DI와 IoC: 객체 생성과 의존성 연결을 프레임워크가 관리하는 구조,Bean: Spring 컨테이너가 생명주기를 관리하는 객체,DispatcherServlet: HTTP 요청을 컨트롤러로 라우팅하는 MVC의 중심 진입점,3계층 구조: Controller Service Repository로 책임을 나누는 기본 설계', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Spring Data JPA',
       'JPA는 객체 중심 코드와 관계형 데이터베이스 사이의 차이를 줄여주는 ORM 기술입니다. 엔티티 매핑과 연관관계를 제대로 잡지 못하면 N+1, 영속성 컨텍스트, 트랜잭션 경계 문제로 성능과 데이터 정합성이 흔들릴 수 있습니다.',
       'CONCEPT', 8, 'Entity 매핑: 객체 필드와 데이터베이스 테이블 컬럼을 연결하는 규칙,연관관계: 객체 참조와 외래키 관계를 일관되게 표현하는 방법,영속성 컨텍스트: 엔티티 변경을 추적하고 DB 반영 시점을 관리하는 공간,Fetch 전략: 연관 데이터를 즉시 가져올지 늦게 가져올지 정하는 기준,N+1 문제: 반복 조회로 SQL이 과도하게 발생하는 성능 문제', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

-- 분기 노드 (sort 9-10, 좌: Redis, 우: 테스트)
INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Redis 기초',
       'Redis는 단순 캐시 저장소가 아니라 빠른 읽기 쓰기와 다양한 자료구조를 제공하는 인메모리 데이터 저장소입니다. 캐시, 랭킹, 임시 토큰, 카운터처럼 응답 속도가 중요한 기능에서 TTL과 자료구조 선택이 핵심입니다.',
       'PRACTICE', 9, '인메모리 저장소: 디스크보다 빠른 메모리에 데이터를 보관하는 방식,String Hash List Set ZSet: 목적에 따라 선택하는 Redis 핵심 자료구조,TTL: 일정 시간이 지나면 데이터를 자동 삭제하는 만료 전략,캐시 전략: DB 부하를 줄이기 위해 자주 읽는 데이터를 임시 저장하는 방식', 1
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Redis 심화',
       'Redis를 서비스 운영에 깊게 쓰면 세션 저장, 토큰 무효화, Pub/Sub, 분산 락처럼 여러 서버가 공유해야 하는 상태를 다루게 됩니다. 특히 분산 환경에서는 락 만료 시간과 장애 상황을 고려하지 않으면 중복 처리나 데이터 꼬임이 생길 수 있습니다.',
       'PRACTICE', 10, '세션 저장: 여러 서버가 같은 로그인 상태를 공유하도록 저장하는 방식,JWT 블랙리스트: 만료 전 토큰을 강제로 무효화하기 위한 차단 목록,Pub/Sub: 발행자와 구독자가 메시지를 비동기로 주고받는 패턴,분산 락: 여러 인스턴스가 같은 작업을 동시에 처리하지 못하게 막는 장치', 1
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'JUnit5 & Mockito',
       '테스트 코드는 기능이 의도대로 동작하는지 반복해서 확인하게 해주는 안전장치입니다. JUnit5로 테스트 구조를 만들고 Mockito로 외부 의존성을 대체하면 서비스 로직을 빠르고 독립적으로 검증할 수 있습니다.',
       'PRACTICE', 9, '테스트 생명주기: 테스트 실행 전후 준비와 정리를 관리하는 흐름,Assertion: 실제 결과가 기대값과 맞는지 검증하는 표현,Mock과 Spy: 외부 의존성이나 일부 동작을 테스트용 객체로 대체하는 방법,verify: 협력 객체가 기대한 방식으로 호출됐는지 확인하는 검증', 2
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Spring Boot 테스트',
       'Spring 애플리케이션은 단위 테스트만으로는 필터, 컨트롤러, DI 설정, DB 연동 흐름을 모두 검증하기 어렵습니다. 테스트 슬라이스와 통합 테스트를 구분해서 사용하면 빠른 피드백과 실제 동작 검증을 균형 있게 가져갈 수 있습니다.',
       'PRACTICE', 10, '@SpringBootTest: 전체 애플리케이션 컨텍스트를 띄워 통합 흐름을 확인하는 테스트,@WebMvcTest: 웹 계층만 가볍게 띄워 컨트롤러 요청 응답을 검증하는 테스트,MockMvc: 실제 서버 없이 MVC 요청을 시뮬레이션하는 도구,TestRestTemplate: 테스트 환경에서 실제 HTTP 호출 흐름을 확인하는 도구', 2
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

-- 척추 뒷부분 (sort 11-15, branch_group = NULL)
INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Spring Security & JWT',
       '인증과 인가는 사용자가 누구인지 확인하고 어떤 기능을 쓸 수 있는지 결정하는 백엔드 핵심 영역입니다. Spring Security의 필터 체인과 JWT 흐름을 이해해야 로그인, 토큰 재발급, 권한 체크, OAuth2 연동을 안전하게 구현할 수 있습니다.',
       'CONCEPT', 11, '인증과 인가: 사용자의 신원 확인과 접근 권한 판단을 구분하는 개념,SecurityFilterChain: 요청이 컨트롤러에 도달하기 전 보안 처리를 수행하는 필터 흐름,JWT: 서버 세션 없이 인증 정보를 전달하는 토큰 형식,OAuth2 로그인: 외부 제공자의 인증 결과를 서비스 로그인으로 연결하는 방식', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'Docker & CI/CD',
       'Docker는 애플리케이션 실행 환경을 이미지로 고정해 개발 PC와 서버의 차이를 줄여줍니다. CI/CD 파이프라인까지 연결하면 코드 변경이 테스트, 이미지 빌드, 배포 단계로 자동 이어져 반복 작업과 실수를 줄일 수 있습니다.',
       'PRACTICE', 12, '이미지와 컨테이너: 실행 환경을 패키징하고 독립된 프로세스로 실행하는 단위,Dockerfile: 애플리케이션 이미지를 만드는 빌드 절차 정의서,docker-compose: 여러 컨테이너를 한 번에 실행하고 연결하는 설정,GitHub Actions: 코드 변경을 기준으로 빌드 테스트 배포를 자동화하는 도구', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, 'SOLID & 디자인패턴',
       '객체지향 설계 원칙과 디자인 패턴은 코드가 커질수록 변경 비용을 낮추기 위한 공통 언어입니다. SOLID를 기준으로 책임을 나누고 반복되는 문제에는 검증된 패턴을 적용하면 서비스 로직의 결합도를 줄일 수 있습니다.',
       'CONCEPT', 13, 'SRP: 하나의 클래스가 하나의 변경 이유만 갖도록 책임을 분리하는 원칙,OCP: 기존 코드를 덜 수정하고 확장으로 기능을 추가하는 원칙,DIP: 구체 구현보다 추상에 의존해 결합도를 낮추는 원칙,전략 패턴: 실행 시점에 알고리즘이나 정책을 바꿔 끼우는 패턴,팩토리 패턴: 객체 생성 책임을 별도 구성 요소로 분리하는 패턴', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, '웹 보안 기초',
       '웹 보안은 기능이 완성된 뒤 덧붙이는 작업이 아니라 API 설계부터 함께 고려해야 하는 기본 조건입니다. OWASP Top 10, XSS, CSRF, SQL Injection, CORS, HTTPS를 이해하면 흔한 공격 경로를 줄이고 안전한 기본값을 만들 수 있습니다.',
       'CONCEPT', 14, 'XSS: 악성 스크립트가 사용자 브라우저에서 실행되는 공격,CSRF: 로그인된 사용자의 권한으로 원치 않는 요청을 보내게 만드는 공격,SQL Injection: 입력값으로 SQL을 조작해 데이터를 탈취하거나 변경하는 공격,CORS: 브라우저가 다른 출처 요청을 제한하고 허용하는 보안 정책,HTTPS와 TLS: 네트워크 구간에서 데이터 변조와 도청을 줄이는 암호화 계층', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT r.roadmap_id, '메시지 큐 & MSA',
       '메시지 큐와 MSA는 서비스가 커졌을 때 기능을 분리하고 비동기 처리를 안정적으로 운영하기 위한 선택지입니다. Kafka의 Topic, Producer, Consumer 흐름과 API Gateway의 진입점 역할을 이해하면 서비스 간 결합을 줄이면서 확장할 수 있습니다.',
       'CONCEPT', 15, '메시지 큐: 작업을 즉시 처리하지 않고 큐에 쌓아 비동기로 처리하는 구조,Kafka Topic과 Partition: 메시지를 분류하고 병렬 처리를 가능하게 하는 저장 단위,Producer와 Consumer: 메시지를 발행하고 읽어 처리하는 구성 요소,API Gateway: 여러 서비스 앞에서 라우팅 인증 공통 처리를 담당하는 진입점,서비스 분리 기준: 하나의 기능을 독립 서비스로 나눌지 판단하는 경계', NULL
FROM roadmaps r WHERE r.title = 'Backend Master Roadmap';

-- Backend Master Roadmap 공식 선행 관계
INSERT INTO prerequisites (node_id, pre_node_id)
WITH target_nodes AS (
    SELECT rn.node_id, rn.sort_order, rn.branch_group
    FROM roadmap_nodes rn
    JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
    WHERE r.title = 'Backend Master Roadmap'
),
branch_bounds AS (
    SELECT MIN(sort_order) AS min_branch_order, MAX(sort_order) AS max_branch_order
    FROM target_nodes
    WHERE branch_group IS NOT NULL
),
pre_branch_spine_edges AS (
    SELECT child.node_id, pre_node.node_id AS pre_node_id
    FROM target_nodes child
    JOIN branch_bounds bounds ON bounds.min_branch_order IS NOT NULL
    JOIN target_nodes pre_node
        ON pre_node.branch_group IS NULL
       AND pre_node.sort_order = (
           SELECT MAX(prev.sort_order)
           FROM target_nodes prev
           WHERE prev.branch_group IS NULL
             AND prev.sort_order < child.sort_order
             AND prev.sort_order < bounds.min_branch_order
       )
    WHERE child.branch_group IS NULL
      AND child.sort_order < bounds.min_branch_order
),
branch_first_edges AS (
    SELECT child.node_id, pre_node.node_id AS pre_node_id
    FROM target_nodes child
    JOIN target_nodes pre_node
        ON pre_node.branch_group IS NULL
       AND pre_node.sort_order = (
           SELECT MAX(prev.sort_order)
           FROM target_nodes prev
           WHERE prev.branch_group IS NULL
             AND prev.sort_order < child.sort_order
       )
    WHERE child.branch_group IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM target_nodes prev
          WHERE prev.branch_group = child.branch_group
            AND prev.sort_order < child.sort_order
      )
),
branch_chain_edges AS (
    SELECT child.node_id, pre_node.node_id AS pre_node_id
    FROM target_nodes child
    JOIN target_nodes pre_node
        ON pre_node.branch_group = child.branch_group
       AND pre_node.sort_order = (
           SELECT MAX(prev.sort_order)
           FROM target_nodes prev
           WHERE prev.branch_group = child.branch_group
             AND prev.sort_order < child.sort_order
       )
    WHERE child.branch_group IS NOT NULL
),
branch_last_nodes AS (
    SELECT branch_node.branch_group, branch_node.node_id
    FROM target_nodes branch_node
    WHERE branch_node.branch_group IS NOT NULL
      AND branch_node.sort_order = (
          SELECT MAX(prev.sort_order)
          FROM target_nodes prev
          WHERE prev.branch_group = branch_node.branch_group
      )
),
first_post_branch_node AS (
    SELECT post_node.node_id
    FROM target_nodes post_node
    JOIN branch_bounds bounds ON bounds.max_branch_order IS NOT NULL
    WHERE post_node.branch_group IS NULL
      AND post_node.sort_order = (
          SELECT MIN(next_node.sort_order)
          FROM target_nodes next_node
          WHERE next_node.branch_group IS NULL
            AND next_node.sort_order > bounds.max_branch_order
      )
),
merge_edges AS (
    SELECT post_node.node_id, branch_node.node_id AS pre_node_id
    FROM first_post_branch_node post_node
    JOIN branch_last_nodes branch_node ON 1 = 1
),
post_branch_spine_edges AS (
    SELECT child.node_id, pre_node.node_id AS pre_node_id
    FROM target_nodes child
    JOIN branch_bounds bounds ON bounds.max_branch_order IS NOT NULL
    JOIN target_nodes pre_node
        ON pre_node.branch_group IS NULL
       AND pre_node.sort_order = (
           SELECT MAX(prev.sort_order)
           FROM target_nodes prev
           WHERE prev.branch_group IS NULL
             AND prev.sort_order < child.sort_order
             AND prev.sort_order > bounds.max_branch_order
       )
    WHERE child.branch_group IS NULL
      AND child.sort_order > bounds.max_branch_order
),
desired_edges AS (
    SELECT node_id, pre_node_id FROM pre_branch_spine_edges
    UNION
    SELECT node_id, pre_node_id FROM branch_first_edges
    UNION
    SELECT node_id, pre_node_id FROM branch_chain_edges
    UNION
    SELECT node_id, pre_node_id FROM merge_edges
    UNION
    SELECT node_id, pre_node_id FROM post_branch_spine_edges
)
SELECT edge.node_id, edge.pre_node_id
FROM desired_edges edge
WHERE edge.pre_node_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM prerequisites existing
      WHERE existing.node_id = edge.node_id
        AND existing.pre_node_id = edge.pre_node_id
  );

-- Backend Master Roadmap 노드 추천 무료 자료
INSERT INTO roadmap_node_resources
    (node_id, title, url, description, source_type, sort_order, active, created_at, updated_at)
SELECT rn.node_id,
       resources.title,
       resources.url,
       resources.description,
       resources.source_type,
       resources.sort_order,
       TRUE,
       NOW(),
       NOW()
FROM roadmap_nodes rn
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
JOIN (
    VALUES
        ('인터넷 & 웹 기초', 'MDN HTTP 개요', 'https://developer.mozilla.org/en-US/docs/Web/HTTP', 'HTTP 메시지, 메서드, 상태 코드와 브라우저-서버 통신 흐름을 정리합니다.', 'DOCS', 1),
        ('인터넷 & 웹 기초', 'MDN DNS 용어', 'https://developer.mozilla.org/en-US/docs/Glossary/DNS', 'DNS가 도메인 이름을 IP 주소로 해석하는 기본 흐름을 확인합니다.', 'DOCS', 2),
        ('OS & 터미널', 'GNU Bash Manual', 'https://www.gnu.org/software/bash/manual/bash.html', '셸 명령, 파이프, 리다이렉션과 스크립트 기초를 공식 매뉴얼로 확인합니다.', 'OFFICIAL', 1),
        ('OS & 터미널', 'Linux man-pages intro', 'https://man7.org/linux/man-pages/man1/intro.1.html', 'Linux 명령어 매뉴얼 구조와 터미널 도움말 읽는 법을 익힙니다.', 'DOCS', 2),
        ('Java 기초', 'Oracle Java Tutorials', 'https://docs.oracle.com/javase/tutorial/java/index.html', '클래스, 객체, 상속, 인터페이스 등 Java 언어 기본기를 공식 튜토리얼로 학습합니다.', 'OFFICIAL', 1),
        ('Java 기초', 'Java SE API Documentation', 'https://docs.oracle.com/en/java/javase/21/docs/api/index.html', '표준 라이브러리와 컬렉션 API를 실제 문서 기준으로 찾아봅니다.', 'OFFICIAL', 2),
        ('Git & 버전 관리', 'Pro Git Book', 'https://git-scm.com/book/en/v2', 'Git의 커밋, 브랜치, 병합, 리베이스를 공식 무료 책으로 학습합니다.', 'OFFICIAL', 1),
        ('Git & 버전 관리', 'GitHub Git 시작하기', 'https://docs.github.com/en/get-started/using-git/about-git', 'GitHub 기반 협업에서 Git이 어떻게 쓰이는지 확인합니다.', 'OFFICIAL', 2),
        ('RDB & SQL', 'PostgreSQL SQL Tutorial', 'https://www.postgresql.org/docs/current/tutorial-sql.html', 'SELECT, WHERE, JOIN 등 SQL 기본 문법을 PostgreSQL 공식 문서로 학습합니다.', 'OFFICIAL', 1),
        ('RDB & SQL', 'PostgreSQL Transactions', 'https://www.postgresql.org/docs/current/tutorial-transactions.html', '트랜잭션과 ACID 흐름을 공식 튜토리얼로 확인합니다.', 'OFFICIAL', 2),
        ('REST API 설계', 'HTTP Semantics RFC 9110', 'https://www.rfc-editor.org/rfc/rfc9110.html', 'HTTP 메서드, 상태 코드, 캐싱 등 REST API 설계의 기반이 되는 표준 문서입니다.', 'OFFICIAL', 1),
        ('REST API 설계', 'OpenAPI Specification', 'https://spec.openapis.org/oas/latest.html', 'OpenAPI 3 문서화 구조와 스키마 작성 방식을 확인합니다.', 'OFFICIAL', 2),
        ('Spring Boot & MVC', 'Spring Framework MVC Reference', 'https://docs.spring.io/spring-framework/reference/web/webmvc.html', 'DispatcherServlet, Controller, 요청 매핑 등 Spring MVC 핵심 흐름을 학습합니다.', 'OFFICIAL', 1),
        ('Spring Boot & MVC', 'Spring Framework IoC Container', 'https://docs.spring.io/spring-framework/reference/core/beans/introduction.html', 'Bean, DI, IoC 컨테이너 개념을 Spring 공식 문서로 확인합니다.', 'OFFICIAL', 2),
        ('Spring Data JPA', 'Spring Data JPA Reference', 'https://docs.spring.io/spring-data/jpa/reference/', 'Repository, 쿼리 메서드, JPA 연동 방식을 공식 문서로 학습합니다.', 'OFFICIAL', 1),
        ('Spring Data JPA', 'Hibernate ORM User Guide', 'https://docs.hibernate.org/orm/current/userguide/html_single/', '엔티티 매핑, 연관관계, Fetch 전략과 N+1 문제의 기반을 확인합니다.', 'OFFICIAL', 2),
        ('Redis 기초', 'Redis Data Types', 'https://redis.io/docs/latest/develop/data-types/', 'String, Hash, List, Set, Sorted Set 등 Redis 핵심 자료구조를 확인합니다.', 'OFFICIAL', 1),
        ('Redis 기초', 'Redis EXPIRE', 'https://redis.io/docs/latest/commands/expire/', 'TTL과 만료 정책을 Redis 공식 명령 문서로 확인합니다.', 'OFFICIAL', 2),
        ('Redis 심화', 'Redis Pub/Sub', 'https://redis.io/docs/latest/develop/pubsub/', 'Pub/Sub 메시징 패턴과 구독 흐름을 공식 문서로 학습합니다.', 'OFFICIAL', 1),
        ('Redis 심화', 'Redisson Locks and Synchronizers', 'https://redisson.pro/docs/data-and-services/locks-and-synchronizers/', '분산 락 구현에 자주 쓰이는 Redisson 락 API를 확인합니다.', 'DOCS', 2),
        ('JUnit5 & Mockito', 'JUnit 5 User Guide', 'https://junit.org/junit5/docs/5.10.3/user-guide/index.html', '테스트 생명주기, assertion, parameterized test 등 JUnit 5 사용법을 확인합니다.', 'OFFICIAL', 1),
        ('JUnit5 & Mockito', 'Mockito Documentation', 'https://site.mockito.org/', 'Mock, Spy, verify 기반 단위 테스트 작성 흐름을 확인합니다.', 'OFFICIAL', 2),
        ('Spring Boot 테스트', 'Spring Boot Testing Reference', 'https://docs.spring.io/spring-boot/reference/testing/index.html', '@SpringBootTest, test slice, MockMvc 연동 등 Spring Boot 테스트 구성을 확인합니다.', 'OFFICIAL', 1),
        ('Spring Boot 테스트', 'Spring Framework MockMvc', 'https://docs.spring.io/spring-framework/reference/testing/mockmvc.html', 'MockMvc로 컨트롤러 테스트를 작성하는 공식 예제를 확인합니다.', 'OFFICIAL', 2),
        ('Spring Security & JWT', 'Spring Security Reference', 'https://docs.spring.io/spring-security/reference/index.html', 'SecurityFilterChain, 인증/인가, OAuth2 리소스 서버 구성을 공식 문서로 확인합니다.', 'OFFICIAL', 1),
        ('Spring Security & JWT', 'JSON Web Token RFC 7519', 'https://www.rfc-editor.org/rfc/rfc7519.html', 'JWT 구조와 클레임 규칙을 표준 문서로 확인합니다.', 'OFFICIAL', 2),
        ('Docker & CI/CD', 'Dockerfile Reference', 'https://docs.docker.com/reference/dockerfile/', 'Dockerfile 명령어와 이미지 빌드 방식을 공식 문서로 학습합니다.', 'OFFICIAL', 1),
        ('Docker & CI/CD', 'GitHub Actions Documentation', 'https://docs.github.com/en/actions', '워크플로우, job, step 기반 CI/CD 파이프라인 구성을 확인합니다.', 'OFFICIAL', 2),
        ('SOLID & 디자인패턴', 'Refactoring Guru Design Patterns', 'https://refactoring.guru/design-patterns', 'Singleton, Factory, Strategy, Observer 등 GoF 패턴을 예제로 확인합니다.', 'DOCS', 1),
        ('SOLID & 디자인패턴', 'Java Design Patterns', 'https://java-design-patterns.com/', 'Java 코드 기반 디자인 패턴 구현 예시를 무료로 살펴봅니다.', 'DOCS', 2),
        ('웹 보안 기초', 'OWASP Top 10', 'https://owasp.org/www-project-top-ten/', '웹 애플리케이션 주요 보안 위험과 대응 방향을 공식 프로젝트에서 확인합니다.', 'OFFICIAL', 1),
        ('웹 보안 기초', 'MDN CORS Guide', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS', '브라우저 CORS 동작 방식과 서버 설정 흐름을 확인합니다.', 'DOCS', 2),
        ('메시지 큐 & MSA', 'Apache Kafka Documentation', 'https://kafka.apache.org/documentation/', 'Topic, Producer, Consumer, Broker 개념과 메시징 흐름을 공식 문서로 학습합니다.', 'OFFICIAL', 1),
        ('메시지 큐 & MSA', 'Spring Cloud Gateway Reference', 'https://docs.spring.io/spring-cloud-gateway/reference/', 'API Gateway 라우팅, 필터, 서비스 진입점 패턴을 확인합니다.', 'OFFICIAL', 2)
) AS resources(node_title, title, url, description, source_type, sort_order)
  ON resources.node_title = rn.title
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_node_resources existing
      WHERE existing.node_id = rn.node_id
        AND existing.url = resources.url
  );

-- learner@devpath.com 커스텀 로드맵 재생성
INSERT INTO custom_roadmaps (user_id, original_roadmap_id, title, progress_rate, is_builder_origin, created_at, updated_at)
SELECT u.user_id, r.roadmap_id, r.title, 0, false,
       TIMESTAMP '2026-03-28 10:00:00', TIMESTAMP '2026-03-28 10:00:00'
FROM users u
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM custom_roadmaps cr
      WHERE cr.user_id = u.user_id AND cr.original_roadmap_id = r.roadmap_id
  );

INSERT INTO custom_roadmap_nodes (custom_roadmap_id, original_node_id, status, custom_sort_order, is_branch, branch_from_node_id, branch_type, started_at, completed_at)
SELECT cr.custom_roadmap_id,
       rn.node_id,
       CASE
           WHEN rn.sort_order <= 2 THEN 'COMPLETED'
           WHEN rn.sort_order = 3  THEN 'IN_PROGRESS'
           ELSE 'NOT_STARTED'
       END,
       rn.sort_order,
       false,
       NULL,
       NULL,
       CASE WHEN rn.sort_order <= 3 THEN TIMESTAMP '2026-03-28 10:00:00' ELSE NULL END,
       CASE WHEN rn.sort_order <= 2 THEN TIMESTAMP '2026-03-29 18:00:00' ELSE NULL END
FROM custom_roadmaps cr
JOIN users u ON u.user_id = cr.user_id
JOIN roadmaps r ON r.roadmap_id = cr.original_roadmap_id
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id
WHERE u.email = 'learner@devpath.com'
  AND r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1 FROM custom_roadmap_nodes crn
      WHERE crn.custom_roadmap_id = cr.custom_roadmap_id
        AND crn.original_node_id = rn.node_id
  );

-- 공식 prerequisite를 모든 커스텀 로드맵에 반영
INSERT INTO custom_node_prerequisites (custom_roadmap_id, custom_node_id, prerequisite_custom_node_id)
SELECT cr.custom_roadmap_id, child_node.custom_node_id, pre_node.custom_node_id
FROM custom_roadmaps cr
JOIN custom_roadmap_nodes child_node
    ON child_node.custom_roadmap_id = cr.custom_roadmap_id
JOIN prerequisites prerequisite
    ON prerequisite.node_id = child_node.original_node_id
JOIN custom_roadmap_nodes pre_node
    ON pre_node.custom_roadmap_id = cr.custom_roadmap_id
   AND pre_node.original_node_id = prerequisite.pre_node_id
WHERE cr.original_roadmap_id IS NOT NULL
  AND child_node.custom_node_id <> pre_node.custom_node_id
  AND NOT EXISTS (
      SELECT 1 FROM custom_node_prerequisites cnp
      WHERE cnp.custom_roadmap_id = cr.custom_roadmap_id
        AND cnp.custom_node_id = child_node.custom_node_id
        AND cnp.prerequisite_custom_node_id = pre_node.custom_node_id
  );

-- sort 1, 2 노드 NodeClearance 레코드 (CLEARED 상태)
INSERT INTO node_clearances
    (user_id, node_id, clearance_status, lesson_completion_rate, required_tags_satisfied,
     missing_tag_count, lesson_completed, quiz_passed, assignment_passed, proof_eligible,
     cleared_at, last_calculated_at, created_at, updated_at)
SELECT u.user_id, rn.node_id,
       'CLEARED', 1.00, TRUE, 0, TRUE, TRUE, TRUE, TRUE,
       TIMESTAMP '2026-03-29 18:00:00',
       TIMESTAMP '2026-03-29 18:00:00',
       TIMESTAMP '2026-03-29 18:00:00',
       TIMESTAMP '2026-03-29 18:00:00'
FROM users u
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.sort_order <= 2
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM node_clearances nc
      WHERE nc.user_id = u.user_id AND nc.node_id = rn.node_id
  );


-- ========================================
-- Backend Master Roadmap 노드 필수 태그 (sub_topics 기반 정제)
-- ========================================

-- 신규 태그 추가
INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'DNS', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'DNS');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '도메인', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '도메인');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '웹 호스팅', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '웹 호스팅');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '브라우저', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '브라우저');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '프로세스 관리', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '프로세스 관리');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '스레드', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '스레드');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '메모리 관리', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '메모리 관리');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'I/O 관리', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'I/O 관리');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'OOP', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'OOP');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '상속', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '상속');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '인터페이스', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '인터페이스');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '제네릭', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '제네릭');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '컬렉션', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '컬렉션');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Git', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Git');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '브랜치 전략', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '브랜치 전략');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'GitFlow', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'GitFlow');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Pull Request', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Pull Request');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '코드 리뷰', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '코드 리뷰');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'SQL', 'Database', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'SQL');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'JOIN', 'Database', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'JOIN');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '서브쿼리', 'Database', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '서브쿼리');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '인덱스', 'Database', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '인덱스');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '트랜잭션', 'Database', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '트랜잭션');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'REST', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'REST');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'URI 설계', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'URI 설계');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'HTTP 메서드', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'HTTP 메서드');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'HTTP 상태코드', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'HTTP 상태코드');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Swagger', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Swagger');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'DI/IoC', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'DI/IoC');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Spring Bean', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Spring Bean');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Spring MVC', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Spring MVC');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '3계층 구조', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '3계층 구조');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Entity 매핑', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Entity 매핑');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'JPQL', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'JPQL');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'FetchType', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'FetchType');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'N+1 문제', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'N+1 문제');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'QueryDSL', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'QueryDSL');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Redis 자료구조', 'Database', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Redis 자료구조');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Redis TTL', 'Database', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Redis TTL');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Spring Cache', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Spring Cache');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Redis Session', 'Database', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Redis Session');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Pub/Sub', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Pub/Sub');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '분산 락', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '분산 락');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'JUnit5', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'JUnit5');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Mockito', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Mockito');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'BDD', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'BDD');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '단위 테스트', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '단위 테스트');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'MockMvc', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'MockMvc');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '통합 테스트', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '통합 테스트');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '테스트 커버리지', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '테스트 커버리지');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'OAuth2', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'OAuth2');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '소셜 로그인', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '소셜 로그인');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'docker-compose', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'docker-compose');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'GitHub Actions', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'GitHub Actions');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'CI/CD', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'CI/CD');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'AWS EC2', 'DevOps', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'AWS EC2');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'SOLID 원칙', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'SOLID 원칙');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '디자인 패턴', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '디자인 패턴');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Singleton', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Singleton');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Factory 패턴', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Factory 패턴');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Strategy 패턴', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Strategy 패턴');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'OWASP', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'OWASP');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'XSS', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'XSS');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'CSRF', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'CSRF');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'SQL Injection', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'SQL Injection');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'HTTPS', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'HTTPS');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'CORS', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'CORS');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Kafka', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Kafka');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'Kafka 토픽', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Kafka 토픽');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'MSA', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'MSA');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'API Gateway', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'API Gateway');

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT '서비스 분리', 'Backend', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = '서비스 분리');

-- 노드별 필수 태그 연결
-- 인터넷 & 웹 기초
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '인터넷 & 웹 기초' AND t.name = 'HTTP'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '인터넷 & 웹 기초' AND t.name = 'DNS'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '인터넷 & 웹 기초' AND t.name = '도메인'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '인터넷 & 웹 기초' AND t.name = '웹 호스팅'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '인터넷 & 웹 기초' AND t.name = '브라우저'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- OS & 터미널
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'OS & 터미널' AND t.name = 'Linux'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'OS & 터미널' AND t.name = '프로세스 관리'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'OS & 터미널' AND t.name = '스레드'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'OS & 터미널' AND t.name = '메모리 관리'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'OS & 터미널' AND t.name = 'I/O 관리'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Java 기초
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Java 기초' AND t.name = 'Java'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Java 기초' AND t.name = 'OOP'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Java 기초' AND t.name = '상속'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Java 기초' AND t.name = '인터페이스'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Java 기초' AND t.name = '제네릭'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Java 기초' AND t.name = '컬렉션'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Git & 버전 관리
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Git & 버전 관리' AND t.name = 'Git'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Git & 버전 관리' AND t.name = '브랜치 전략'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Git & 버전 관리' AND t.name = 'GitFlow'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Git & 버전 관리' AND t.name = 'Pull Request'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Git & 버전 관리' AND t.name = '코드 리뷰'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- RDB & SQL
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'RDB & SQL' AND t.name = 'SQL'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'RDB & SQL' AND t.name = 'JOIN'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'RDB & SQL' AND t.name = '서브쿼리'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'RDB & SQL' AND t.name = '인덱스'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'RDB & SQL' AND t.name = '트랜잭션'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'RDB & SQL' AND t.name = 'PostgreSQL'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- REST API 설계
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'REST API 설계' AND t.name = 'REST'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'REST API 설계' AND t.name = 'HTTP'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'REST API 설계' AND t.name = 'URI 설계'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'REST API 설계' AND t.name = 'HTTP 메서드'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'REST API 설계' AND t.name = 'HTTP 상태코드'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'REST API 설계' AND t.name = 'Swagger'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Spring Boot & MVC
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot & MVC' AND t.name = 'Spring Boot'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot & MVC' AND t.name = 'DI/IoC'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot & MVC' AND t.name = 'Spring Bean'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot & MVC' AND t.name = 'Spring MVC'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot & MVC' AND t.name = '3계층 구조'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Spring Data JPA
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Data JPA' AND t.name = 'JPA'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Data JPA' AND t.name = 'Entity 매핑'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Data JPA' AND t.name = 'JPQL'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Data JPA' AND t.name = 'FetchType'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Data JPA' AND t.name = 'N+1 문제'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Data JPA' AND t.name = 'QueryDSL'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Redis 기초
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Redis 기초' AND t.name = 'Redis'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Redis 기초' AND t.name = 'Redis 자료구조'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Redis 기초' AND t.name = 'Redis TTL'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Redis 기초' AND t.name = 'Spring Cache'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Redis 심화
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Redis 심화' AND t.name = 'Redis'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Redis 심화' AND t.name = 'Redis Session'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Redis 심화' AND t.name = 'Pub/Sub'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Redis 심화' AND t.name = '분산 락'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- JUnit5 & Mockito
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'JUnit5 & Mockito' AND t.name = 'JUnit5'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'JUnit5 & Mockito' AND t.name = 'Mockito'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'JUnit5 & Mockito' AND t.name = 'BDD'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'JUnit5 & Mockito' AND t.name = '단위 테스트'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Spring Boot 테스트
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot 테스트' AND t.name = 'Spring Boot'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot 테스트' AND t.name = 'MockMvc'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot 테스트' AND t.name = '통합 테스트'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Boot 테스트' AND t.name = '테스트 커버리지'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Spring Security & JWT
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Security & JWT' AND t.name = 'Spring Security'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Security & JWT' AND t.name = 'JWT'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Security & JWT' AND t.name = 'OAuth2'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Spring Security & JWT' AND t.name = '소셜 로그인'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- Docker & CI/CD
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Docker & CI/CD' AND t.name = 'Docker'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Docker & CI/CD' AND t.name = 'docker-compose'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Docker & CI/CD' AND t.name = 'GitHub Actions'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Docker & CI/CD' AND t.name = 'CI/CD'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'Docker & CI/CD' AND t.name = 'AWS EC2'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- SOLID & 디자인패턴
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'SOLID & 디자인패턴' AND t.name = 'SOLID 원칙'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'SOLID & 디자인패턴' AND t.name = '디자인 패턴'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'SOLID & 디자인패턴' AND t.name = 'Singleton'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'SOLID & 디자인패턴' AND t.name = 'Factory 패턴'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = 'SOLID & 디자인패턴' AND t.name = 'Strategy 패턴'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- 웹 보안 기초
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '웹 보안 기초' AND t.name = 'OWASP'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '웹 보안 기초' AND t.name = 'XSS'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '웹 보안 기초' AND t.name = 'CSRF'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '웹 보안 기초' AND t.name = 'SQL Injection'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '웹 보안 기초' AND t.name = 'HTTPS'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '웹 보안 기초' AND t.name = 'CORS'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- 메시지 큐 & MSA
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '메시지 큐 & MSA' AND t.name = 'Kafka'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '메시지 큐 & MSA' AND t.name = 'Kafka 토픽'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '메시지 큐 & MSA' AND t.name = 'MSA'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '메시지 큐 & MSA' AND t.name = 'API Gateway'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);
INSERT INTO node_required_tags (node_id, tag_id)
SELECT rn.node_id, t.tag_id FROM roadmap_nodes rn, tags t
WHERE rn.title = '메시지 큐 & MSA' AND t.name = '서비스 분리'
  AND NOT EXISTS (SELECT 1 FROM node_required_tags WHERE node_id = rn.node_id AND tag_id = t.tag_id);

-- learner 기술 스택: 클리어 노드 + Java 기초 필수 태그 전체 보유
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = 'HTTP'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = 'DNS'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '도메인'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '웹 호스팅'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '브라우저'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = 'Linux'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '프로세스 관리'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '스레드'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '메모리 관리'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = 'I/O 관리'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = 'Java'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = 'OOP'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '상속'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '인터페이스'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '제네릭'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);
INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id FROM users u, tags t
WHERE u.email = 'learner@devpath.com' AND t.name = '컬렉션'
  AND NOT EXISTS (SELECT 1 FROM user_tech_stacks uts WHERE uts.user_id = u.user_id AND uts.tag_id = t.tag_id);

-- Java 기초 node_clearances: 태그 모두 충족, 레슨 80% 진행, 아직 미클리어
-- (진단 퀴즈 추천 테스트용 — 클리어 처리 시 추천 로직 동작 확인)
INSERT INTO node_clearances
    (user_id, node_id, clearance_status, lesson_completion_rate, required_tags_satisfied,
     missing_tag_count, lesson_completed, quiz_passed, assignment_passed, proof_eligible,
     cleared_at, last_calculated_at, created_at, updated_at)
SELECT u.user_id, rn.node_id,
       'NOT_CLEARED', 0.80, TRUE, 0, FALSE, FALSE, FALSE, FALSE,
       NULL,
       TIMESTAMP '2026-04-10 12:00:00',
       TIMESTAMP '2026-04-10 12:00:00',
       TIMESTAMP '2026-04-10 12:00:00'
FROM users u
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.title = 'Java 기초'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM node_clearances nc
      WHERE nc.user_id = u.user_id AND nc.node_id = rn.node_id
  );

-- ========================================
-- learner@devpath.com Proof Card 샘플 데이터
-- (인터넷 & 웹 기초, OS & 터미널 — CLEARED 노드 기준)
-- ========================================

INSERT INTO proof_cards (user_id, node_id, node_clearance_id, title, description, proof_card_status, issued_at, created_at, updated_at)
SELECT u.user_id, rn.node_id, nc.node_clearance_id,
       '인터넷 & 웹 기초 수료',
       '인터넷 동작 원리, HTTP, DNS, 웹 호스팅 개념을 학습하고 검증받았습니다.',
       'ISSUED',
       TIMESTAMP '2026-03-29 18:00:00',
       TIMESTAMP '2026-03-29 18:00:00',
       TIMESTAMP '2026-03-29 18:00:00'
FROM users u
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.title = '인터넷 & 웹 기초'
JOIN node_clearances nc ON nc.user_id = u.user_id AND nc.node_id = rn.node_id
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM proof_cards pc
      WHERE pc.user_id = u.user_id AND pc.node_id = rn.node_id
  );

INSERT INTO proof_cards (user_id, node_id, node_clearance_id, title, description, proof_card_status, issued_at, created_at, updated_at)
SELECT u.user_id, rn.node_id, nc.node_clearance_id,
       'OS & 터미널 수료',
       'Linux 명령어, 프로세스/스레드, 메모리·I/O 관리를 학습하고 검증받았습니다.',
       'ISSUED',
       TIMESTAMP '2026-03-29 19:00:00',
       TIMESTAMP '2026-03-29 19:00:00',
       TIMESTAMP '2026-03-29 19:00:00'
FROM users u
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.title = 'OS & 터미널'
JOIN node_clearances nc ON nc.user_id = u.user_id AND nc.node_id = rn.node_id
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM proof_cards pc
      WHERE pc.user_id = u.user_id AND pc.node_id = rn.node_id
  );

-- proof_card_tags: 인터넷 & 웹 기초
INSERT INTO proof_card_tags (proof_card_id, tag_id, skill_evidence_type)
SELECT pc.proof_card_id, t.tag_id, 'VERIFIED'
FROM proof_cards pc
JOIN users u ON u.user_id = pc.user_id AND u.email = 'learner@devpath.com'
JOIN roadmap_nodes rn ON rn.node_id = pc.node_id AND rn.title = '인터넷 & 웹 기초'
JOIN tags t ON t.name IN ('HTTP', 'DNS', '도메인', '웹 호스팅', '브라우저')
WHERE NOT EXISTS (
    SELECT 1 FROM proof_card_tags pct
    WHERE pct.proof_card_id = pc.proof_card_id AND pct.tag_id = t.tag_id
);

-- proof_card_tags: OS & 터미널
INSERT INTO proof_card_tags (proof_card_id, tag_id, skill_evidence_type)
SELECT pc.proof_card_id, t.tag_id, 'VERIFIED'
FROM proof_cards pc
JOIN users u ON u.user_id = pc.user_id AND u.email = 'learner@devpath.com'
JOIN roadmap_nodes rn ON rn.node_id = pc.node_id AND rn.title = 'OS & 터미널'
JOIN tags t ON t.name IN ('Linux', '프로세스 관리', '스레드', '메모리 관리', 'I/O 관리')
WHERE NOT EXISTS (
    SELECT 1 FROM proof_card_tags pct
    WHERE pct.proof_card_id = pc.proof_card_id AND pct.tag_id = t.tag_id
);
-- ============================================================
-- [TEST DATA END]
-- ============================================================

-- ============================================================
-- SAMPLE VIDEO DATA: 로컬 샘플 영상 연결 (개발/테스트용)
-- public/samples/ 에 있는 영상 파일을 video_url로 지정
-- ============================================================

-- 기존 Spring Boot Intro 강의에 로컬 샘플 영상 연결
UPDATE lessons
SET video_url = '/samples/lesson-spring-di.mp4',
    duration_seconds = 20,
    thumbnail_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=60'
WHERE title = 'Understanding DI and IoC';

UPDATE lessons
SET video_url = '/samples/lesson-spring-bean.mp4',
    duration_seconds = 20,
    thumbnail_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=60'
WHERE title = 'Bean registration and lifecycle';

UPDATE lessons
SET video_url = '/samples/lesson-os-context.mp4',
    duration_seconds = 20,
    thumbnail_url = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=60'
WHERE title = 'Entity relationships and mapping';

-- 운영체제 이해하기 강의 (학습 플레이어 UI 확인용)
INSERT INTO courses (
    instructor_id, title, subtitle, description,
    thumbnail_url, intro_video_url, video_asset_key,
    duration_seconds, price, original_price, currency,
    difficulty_level, language, has_certificate, status, published_at
)
SELECT
    u.user_id,
    '운영체제 이해하기',
    'CS 핵심: 프로세스, 스레드, 메모리 관리',
    '백엔드·시스템 프로그래밍 입문자를 위한 운영체제 핵심 개념 강의입니다. 프로세스·스레드 구조부터 컨텍스트 스위칭, 메모리 관리까지 실무에 필요한 OS 지식을 다룹니다.',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    '/samples/sample-intro.mp4',
    NULL,
    60,
    89000, 119000, 'KRW',
    'BEGINNER', 'ko', TRUE, 'PUBLISHED', TIMESTAMP '2026-03-01 10:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM courses WHERE title = '운영체제 이해하기');

-- 섹션 1: 운영체제 기초
INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT c.course_id, '운영체제 기초', 'OS 개념, 프로세스, 스레드', 1, TRUE
FROM courses c
WHERE c.title = '운영체제 이해하기'
  AND NOT EXISTS (
      SELECT 1 FROM course_sections cs
      WHERE cs.course_id = c.course_id AND cs.sort_order = 1
  );

-- 강의 1: OS란 무엇인가? (미리보기 허용, OCR 테스트용 영상)
INSERT INTO lessons (
    section_id, title, description, lesson_type,
    video_url, video_asset_key, video_provider,
    thumbnail_url, duration_seconds, is_preview, is_published, sort_order
)
SELECT
    cs.section_id,
    'OS란 무엇인가?',
    '운영체제의 역할과 구성요소를 소개합니다.',
    'VIDEO',
    '/samples/ocr-code-demo.mp4',
    NULL, NULL,
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=60',
    14, TRUE, TRUE, 1
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = '운영체제 이해하기' AND cs.sort_order = 1
  AND NOT EXISTS (
      SELECT 1 FROM lessons l WHERE l.section_id = cs.section_id AND l.sort_order = 1
  );

-- 강의 2: 프로세스와 스레드의 이해 (OCR 테스트용 영상)
INSERT INTO lessons (
    section_id, title, description, lesson_type,
    video_url, video_asset_key, video_provider,
    thumbnail_url, duration_seconds, is_preview, is_published, sort_order
)
SELECT
    cs.section_id,
    '프로세스와 스레드의 이해',
    'PCB 구조, 스레드 모델, 생성 비용 차이를 설명합니다.',
    'VIDEO',
    '/samples/ocr-code-demo.mp4',
    NULL, NULL,
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=60',
    14, FALSE, TRUE, 2
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = '운영체제 이해하기' AND cs.sort_order = 1
  AND NOT EXISTS (
      SELECT 1 FROM lessons l WHERE l.section_id = cs.section_id AND l.sort_order = 2
  );

-- 강의 3: 컨텍스트 스위칭 심화 (코드 OCR 테스트용 영상)
INSERT INTO lessons (
    section_id, title, description, lesson_type,
    video_url, video_asset_key, video_provider,
    thumbnail_url, duration_seconds, is_preview, is_published, sort_order
)
SELECT
    cs.section_id,
    '컨텍스트 스위칭 심화',
    '컨텍스트 스위칭 동작 원리와 오버헤드를 코드로 확인합니다. (OCR 기능 테스트용)',
    'VIDEO',
    '/samples/ocr-code-demo.mp4',
    NULL, NULL,
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=60',
    14, FALSE, TRUE, 3
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = '운영체제 이해하기' AND cs.sort_order = 1
  AND NOT EXISTS (
      SELECT 1 FROM lessons l WHERE l.section_id = cs.section_id AND l.sort_order = 3
  );

-- 이미 DB에 들어간 lesson-os-*.mp4 참조를 ocr-code-demo.mp4 로 통일하고 duration 보정
UPDATE lessons
SET video_url = '/samples/ocr-code-demo.mp4', duration_seconds = 14
WHERE title IN ('OS란 무엇인가?', '프로세스와 스레드의 이해', '컨텍스트 스위칭 심화')
  AND video_url <> '/samples/ocr-code-demo.mp4';

-- duration_seconds가 잘못 들어간 경우(예: 20) 보정
UPDATE lessons
SET duration_seconds = 14
WHERE title IN ('OS란 무엇인가?', '프로세스와 스레드의 이해', '컨텍스트 스위칭 심화')
  AND video_url = '/samples/ocr-code-demo.mp4'
  AND duration_seconds <> 14;

-- 운영체제 강의 Q&A 샘플 데이터
INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'STUDY', 'EASY',
       '스레드 풀과 컨텍스트 스위칭 질문',
       '스레드 풀을 사용하는 주된 이유가 스레드 생성 비용 때문인가요, 아니면 컨텍스트 스위칭 비용을 줄이기 위함인가요?',
       NULL, c.course_id, '02:15', 'ANSWERED', 7, FALSE,
       TIMESTAMP '2026-04-12 14:30:00', TIMESTAMP '2026-04-12 20:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = '운영체제 이해하기'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = '스레드 풀과 컨텍스트 스위칭 질문'
  );

INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'STUDY', 'MEDIUM',
       '프로세스 통신(IPC) 관련해서요',
       '파이프 말고 공유 메모리를 사용할 때의 치명적인 단점이 있다면 무엇이 있을까요? 동기화 처리 말고 성능상 단점도 존재하는지 궁금합니다.',
       NULL, c.course_id, NULL, 'UNANSWERED', 3, FALSE,
       TIMESTAMP '2026-04-13 03:00:00', TIMESTAMP '2026-04-13 03:00:00'
FROM users u, courses c
WHERE u.email = 'learner2@devpath.com'
  AND c.title = '운영체제 이해하기'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = '프로세스 통신(IPC) 관련해서요'
  );

-- 스레드 풀 질문에 강사 답변 추가
INSERT INTO qna_answers (question_id, user_id, content, is_adopted, is_deleted, created_at, updated_at)
SELECT q.question_id, u.user_id,
       '안녕하세요!

좋은 질문입니다. 스레드 풀의 주된 목적은 스레드 생성 및 소멸 비용을 줄이는 것에 있습니다.
스레드를 미리 만들어두고 재사용함으로써 OS에 스레드 생성 요청을 하는 오버헤드를 막는 것이죠.

컨텍스트 스위칭 자체를 막아주지는 않지만, 너무 많은 스레드가 무분별하게 생성되어 발생하는 과도한 스위칭 현상은 스레드 풀의 개수 제한을 통해 어느 정도 방어할 수 있습니다.',
       TRUE, FALSE,
       TIMESTAMP '2026-04-12 20:00:00', TIMESTAMP '2026-04-12 20:00:00'
FROM qna_questions q
JOIN users u ON u.email = 'instructor@devpath.com'
WHERE q.title = '스레드 풀과 컨텍스트 스위칭 질문'
  AND NOT EXISTS (
      SELECT 1 FROM qna_answers a WHERE a.question_id = q.question_id
  );

-- adopted_answer_id 업데이트
UPDATE qna_questions
SET adopted_answer_id = (
    SELECT a.answer_id FROM qna_answers a WHERE a.question_id = qna_questions.question_id LIMIT 1
)
WHERE title = '스레드 풀과 컨텍스트 스위칭 질문'
  AND adopted_answer_id IS NULL;

-- 운영체제 이해하기 강의 수강 등록 (learner@devpath.com)
INSERT INTO course_enrollments (
    user_id, course_id, status, enrolled_at, completed_at, progress_percentage, last_accessed_at
)
SELECT u.user_id, c.course_id,
       'ACTIVE',
       TIMESTAMP '2026-04-10 10:00:00',
       NULL,
       0,
       TIMESTAMP '2026-04-10 10:00:00'
FROM users u
JOIN courses c ON c.title = '운영체제 이해하기'
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM course_enrollments ce
      WHERE ce.user_id = u.user_id AND ce.course_id = c.course_id
  );

-- ============================================================
-- [SAMPLE VIDEO DATA END]
-- ============================================================

-- ============================================================
-- 강의 목록 메뉴 기본 구성
-- ============================================================
WITH lecture_catalog_category_seed(category_key, label, title, icon_class, sort_order, is_active) AS (
    VALUES
        ('all', '전체', '전체 강의', 'fas fa-th-large', 0, TRUE),
        ('dev', '개발', '개발 · 프로그래밍', 'fas fa-laptop-code', 1, TRUE),
        ('ai', 'AI', '인공지능(AI)', 'fas fa-robot', 2, TRUE),
        ('data', '데이터', '데이터 사이언스', 'fas fa-database', 3, TRUE),
        ('infra', '인프라', '인프라 · 보안', 'fas fa-server', 4, TRUE),
        ('mobile', '모바일', '모바일 앱 개발', 'fas fa-mobile-alt', 5, TRUE),
        ('career', '커리어', '커리어 · 자기계발', 'fas fa-briefcase', 6, TRUE)
)
INSERT INTO lecture_catalog_categories (category_key, label, title, icon_class, sort_order, is_active)
SELECT seed.category_key, seed.label, seed.title, seed.icon_class, seed.sort_order, seed.is_active
FROM lecture_catalog_category_seed seed
WHERE NOT EXISTS (
    SELECT 1
    FROM lecture_catalog_categories category
    WHERE category.category_key = seed.category_key
);

WITH lecture_catalog_mega_menu_seed(category_key, label, sort_order) AS (
    VALUES
        ('dev', '웹 개발 (Web)', 0),
        ('dev', '프론트엔드', 1),
        ('dev', '백엔드', 2),
        ('dev', '풀스택', 3),
        ('dev', '게임 개발', 4),
        ('dev', '프로그래밍 언어', 5),
        ('ai', 'AI Engineer', 0),
        ('ai', 'Data Scientist', 1),
        ('ai', '머신러닝 (ML)', 2),
        ('ai', '딥러닝 (DL)', 3),
        ('ai', 'ChatGPT / LLM', 4),
        ('ai', '프롬프트 엔지니어링', 5),
        ('data', '데이터 분석', 0),
        ('data', '데이터 엔지니어링', 1),
        ('data', 'SQL / DB', 2),
        ('data', 'NoSQL (Mongo)', 3),
        ('data', '시각화 (Tableau)', 4),
        ('data', '빅데이터', 5),
        ('infra', 'DevOps', 0),
        ('infra', 'AWS / Cloud', 1),
        ('infra', 'Docker / K8s', 2),
        ('infra', '보안 (Security)', 3),
        ('infra', 'Linux / Shell', 4),
        ('infra', '네트워크', 5),
        ('mobile', 'Android App', 0),
        ('mobile', 'iOS App', 1),
        ('mobile', 'Flutter', 2),
        ('mobile', 'React Native', 3),
        ('mobile', 'Kotlin / Swift', 4),
        ('career', '취업 / 이직', 0),
        ('career', '이력서 / 면접', 1),
        ('career', '기획 (PM/PO)', 2),
        ('career', 'UX / UI 디자인', 3),
        ('career', '비즈니스 스킬', 4),
        ('career', '개발자 글쓰기', 5)
)
INSERT INTO lecture_catalog_mega_menu_items (category_id, label, sort_order)
SELECT category.id, seed.label, seed.sort_order
FROM lecture_catalog_mega_menu_seed seed
JOIN lecture_catalog_categories category
    ON category.category_key = seed.category_key
WHERE NOT EXISTS (
    SELECT 1
    FROM lecture_catalog_mega_menu_items item
    WHERE item.category_id = category.id
      AND item.label = seed.label
);

WITH lecture_catalog_group_seed(category_key, name, sort_order) AS (
    VALUES
        ('all', '탐색 분야', 0),
        ('dev', '언어 (Language)', 0),
        ('dev', '프론트엔드', 1),
        ('dev', '백엔드', 2),
        ('dev', 'CS & 기타', 3),
        ('ai', '직무별', 0),
        ('ai', '핵심 기술', 1),
        ('ai', 'LLM & 프롬프트', 2),
        ('ai', '라이브러리', 3),
        ('data', '직무별', 0),
        ('data', '데이터베이스', 1),
        ('data', '분석 & 시각화', 2),
        ('data', '빅데이터', 3),
        ('infra', 'DevOps', 0),
        ('infra', '컨테이너', 1),
        ('infra', '시스템', 2),
        ('infra', '보안', 3),
        ('mobile', '네이티브', 0),
        ('mobile', '크로스 플랫폼', 1),
        ('mobile', '기타', 2),
        ('career', '매니지먼트', 0),
        ('career', '기획/디자인', 1),
        ('career', '취업', 2),
        ('career', '오피스', 3)
)
INSERT INTO lecture_catalog_groups (category_id, name, sort_order)
SELECT category.id, seed.name, seed.sort_order
FROM lecture_catalog_group_seed seed
JOIN lecture_catalog_categories category
    ON category.category_key = seed.category_key
WHERE NOT EXISTS (
    SELECT 1
    FROM lecture_catalog_groups group_item
    WHERE group_item.category_id = category.id
      AND group_item.name = seed.name
);

WITH lecture_catalog_group_item_seed(category_key, group_name, item_name, linked_category_key, sort_order) AS (
    VALUES
        ('all', '탐색 분야', '웹 개발', 'dev', 0),
        ('all', '탐색 분야', 'AI/머신러닝', 'ai', 1),
        ('all', '탐색 분야', '데이터 분석', 'data', 2),
        ('all', '탐색 분야', '인프라', 'infra', 3),
        ('all', '탐색 분야', '모바일 앱', 'mobile', 4),
        ('all', '탐색 분야', '커리어', 'career', 5),
        ('dev', '언어 (Language)', 'Java', NULL, 0),
        ('dev', '언어 (Language)', 'Python', NULL, 1),
        ('dev', '언어 (Language)', 'JavaScript', NULL, 2),
        ('dev', '언어 (Language)', 'TypeScript', NULL, 3),
        ('dev', '언어 (Language)', 'C++', NULL, 4),
        ('dev', '언어 (Language)', 'C#', NULL, 5),
        ('dev', '언어 (Language)', 'Go', NULL, 6),
        ('dev', '언어 (Language)', 'Rust', NULL, 7),
        ('dev', '언어 (Language)', 'Kotlin', NULL, 8),
        ('dev', '언어 (Language)', 'Swift', NULL, 9),
        ('dev', '프론트엔드', 'React', NULL, 0),
        ('dev', '프론트엔드', 'Vue.js', NULL, 1),
        ('dev', '프론트엔드', 'Angular', NULL, 2),
        ('dev', '프론트엔드', 'Svelte', NULL, 3),
        ('dev', '프론트엔드', 'Next.js', NULL, 4),
        ('dev', '프론트엔드', 'HTML/CSS', NULL, 5),
        ('dev', '프론트엔드', 'Tailwind', NULL, 6),
        ('dev', '백엔드', 'Spring Boot', NULL, 0),
        ('dev', '백엔드', 'Node.js', NULL, 1),
        ('dev', '백엔드', 'Django', NULL, 2),
        ('dev', '백엔드', 'FastAPI', NULL, 3),
        ('dev', '백엔드', 'NestJS', NULL, 4),
        ('dev', '백엔드', 'ASP.NET', NULL, 5),
        ('dev', '백엔드', 'PHP', NULL, 6),
        ('dev', 'CS & 기타', '자료구조/알고리즘', NULL, 0),
        ('dev', 'CS & 기타', '테스트', NULL, 1),
        ('dev', 'CS & 기타', '게임 개발', NULL, 2),
        ('dev', 'CS & 기타', '아키텍처', NULL, 3),
        ('ai', '직무별', 'AI Engineer', NULL, 0),
        ('ai', '직무별', 'Data Scientist', NULL, 1),
        ('ai', '직무별', 'MLOps', NULL, 2),
        ('ai', '직무별', 'Researcher', NULL, 3),
        ('ai', '핵심 기술', 'Machine Learning', NULL, 0),
        ('ai', '핵심 기술', 'Deep Learning', NULL, 1),
        ('ai', '핵심 기술', 'NLP', NULL, 2),
        ('ai', '핵심 기술', 'Computer Vision', NULL, 3),
        ('ai', '핵심 기술', 'Reinforcement Learning', NULL, 4),
        ('ai', 'LLM & 프롬프트', 'ChatGPT', NULL, 0),
        ('ai', 'LLM & 프롬프트', 'LangChain', NULL, 1),
        ('ai', 'LLM & 프롬프트', 'Prompt Engineering', NULL, 2),
        ('ai', 'LLM & 프롬프트', 'RAG', NULL, 3),
        ('ai', 'LLM & 프롬프트', 'Fine-tuning', NULL, 4),
        ('ai', '라이브러리', 'PyTorch', NULL, 0),
        ('ai', '라이브러리', 'TensorFlow', NULL, 1),
        ('ai', '라이브러리', 'Keras', NULL, 2),
        ('ai', '라이브러리', 'Scikit-learn', NULL, 3),
        ('ai', '라이브러리', 'HuggingFace', NULL, 4),
        ('data', '직무별', 'Data Analyst', NULL, 0),
        ('data', '직무별', 'Data Engineer', NULL, 1),
        ('data', '직무별', 'DBA', NULL, 2),
        ('data', '직무별', 'Big Data Engineer', NULL, 3),
        ('data', '데이터베이스', 'MySQL', NULL, 0),
        ('data', '데이터베이스', 'PostgreSQL', NULL, 1),
        ('data', '데이터베이스', 'Oracle', NULL, 2),
        ('data', '데이터베이스', 'MongoDB', NULL, 3),
        ('data', '데이터베이스', 'Redis', NULL, 4),
        ('data', '데이터베이스', 'Elasticsearch', NULL, 5),
        ('data', '분석 & 시각화', 'Tableau', NULL, 0),
        ('data', '분석 & 시각화', 'Power BI', NULL, 1),
        ('data', '분석 & 시각화', 'Excel', NULL, 2),
        ('data', '분석 & 시각화', 'Google Analytics', NULL, 3),
        ('data', '분석 & 시각화', 'Pandas', NULL, 4),
        ('data', '빅데이터', 'Hadoop', NULL, 0),
        ('data', '빅데이터', 'Spark', NULL, 1),
        ('data', '빅데이터', 'Kafka', NULL, 2),
        ('data', '빅데이터', 'Airflow', NULL, 3),
        ('data', '빅데이터', 'Data Lake', NULL, 4),
        ('infra', 'DevOps', 'DevOps General', NULL, 0),
        ('infra', 'DevOps', 'DevSecOps', NULL, 1),
        ('infra', 'DevOps', 'AWS', NULL, 2),
        ('infra', 'DevOps', 'Azure', NULL, 3),
        ('infra', 'DevOps', 'GCP', NULL, 4),
        ('infra', 'DevOps', 'System Design', NULL, 5),
        ('infra', '컨테이너', 'Docker', NULL, 0),
        ('infra', '컨테이너', 'Kubernetes', NULL, 1),
        ('infra', '컨테이너', 'Terraform', NULL, 2),
        ('infra', '컨테이너', 'CI/CD Pipelines', NULL, 3),
        ('infra', '시스템', 'Linux', NULL, 0),
        ('infra', '시스템', 'Shell Script', NULL, 1),
        ('infra', '시스템', 'Network Administration', NULL, 2),
        ('infra', '보안', 'Cyber Security', NULL, 0),
        ('infra', '보안', 'Web Hacking', NULL, 1),
        ('infra', '보안', 'Cloud Security', NULL, 2),
        ('mobile', '네이티브', 'Android (Kotlin)', NULL, 0),
        ('mobile', '네이티브', 'iOS (Swift)', NULL, 1),
        ('mobile', '네이티브', 'SwiftUI', NULL, 2),
        ('mobile', '네이티브', 'Jetpack Compose', NULL, 3),
        ('mobile', '크로스 플랫폼', 'Flutter', NULL, 0),
        ('mobile', '크로스 플랫폼', 'React Native', NULL, 1),
        ('mobile', '크로스 플랫폼', 'Xamarin', NULL, 2),
        ('mobile', '기타', 'Mobile Design', NULL, 0),
        ('mobile', '기타', 'App Store Release', NULL, 1),
        ('career', '매니지먼트', 'Product Manager', NULL, 0),
        ('career', '매니지먼트', 'Engineering Manager', NULL, 1),
        ('career', '매니지먼트', 'Developer Relations', NULL, 2),
        ('career', '기획/디자인', 'UX / UI Design', NULL, 0),
        ('career', '기획/디자인', 'Figma', NULL, 1),
        ('career', '기획/디자인', 'Technical Writer', NULL, 2),
        ('career', '기획/디자인', 'IT 서비스 기획', NULL, 3),
        ('career', '취업', '이력서', NULL, 0),
        ('career', '취업', '자소서', NULL, 1),
        ('career', '취업', '기술 면접', NULL, 2),
        ('career', '취업', '포트폴리오', NULL, 3),
        ('career', '취업', '연봉 협상', NULL, 4),
        ('career', '오피스', '개발자 글쓰기', NULL, 0),
        ('career', '오피스', '커뮤니케이션', NULL, 1),
        ('career', '오피스', '문서화', NULL, 2)
)
INSERT INTO lecture_catalog_group_items (group_id, name, linked_category_key, sort_order)
SELECT group_item.id, seed.item_name, seed.linked_category_key, seed.sort_order
FROM lecture_catalog_group_item_seed seed
JOIN lecture_catalog_categories category
    ON category.category_key = seed.category_key
JOIN lecture_catalog_groups group_item
    ON group_item.category_id = category.id
   AND group_item.name = seed.group_name
WHERE NOT EXISTS (
    SELECT 1
    FROM lecture_catalog_group_items item
    WHERE item.group_id = group_item.id
      AND item.name = seed.item_name
);

-- ============================================================
-- PUBLIC CATALOG DATA: lecture-list.html 실제 API 노출용 공개 강의
--   - instructor@devpath.com: 2개
--   - frontend@devpath.com  : 3개
--   - data@devpath.com      : 3개
-- ============================================================

INSERT INTO users (
    email, password, name, role_name, is_active,
    account_status, instructor_status, instructor_grade,
    created_at, updated_at
)
SELECT
    'frontend@devpath.com',
    '$2a$10$xh6.EW/FRzJBWfxqpdXh2uTVoepPhUxQRUH5OEwk90IpYeKjegkj.',
    '김소연',
    'ROLE_INSTRUCTOR',
    TRUE,
    'ACTIVE',
    'APPROVED',
    'PRO',
    TIMESTAMP '2026-04-01 09:00:00',
    TIMESTAMP '2026-04-01 09:00:00'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'frontend@devpath.com');

INSERT INTO users (
    email, password, name, role_name, is_active,
    account_status, instructor_status, instructor_grade,
    created_at, updated_at
)
SELECT
    'data@devpath.com',
    '$2a$10$xh6.EW/FRzJBWfxqpdXh2uTVoepPhUxQRUH5OEwk90IpYeKjegkj.',
    '이민수',
    'ROLE_INSTRUCTOR',
    TRUE,
    'ACTIVE',
    'APPROVED',
    'PRO',
    TIMESTAMP '2026-04-01 09:05:00',
    TIMESTAMP '2026-04-01 09:05:00'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'data@devpath.com');

UPDATE users
SET account_status = 'ACTIVE',
    instructor_status = 'APPROVED',
    instructor_grade = COALESCE(instructor_grade, 'PRO'),
    is_active = TRUE
WHERE email IN ('instructor@devpath.com', 'frontend@devpath.com', 'data@devpath.com');

INSERT INTO user_profiles (
    user_id, profile_image, channel_name, bio, channel_description,
    phone, date_of_birth, github_url, blog_url, is_public,
    created_at, updated_at
)
SELECT
    u.user_id,
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    '프론트엔드 크래프트',
    'React, Next.js, Flutter로 제품 출시까지 이어지는 프론트엔드 강의를 만듭니다.',
    '프론트엔드 구조 설계, UI 품질, 모바일 앱 출시까지 실무 흐름으로 다루는 채널입니다.',
    NULL, NULL,
    'https://github.com/frontend-craft',
    'https://blog.devpath.com/frontend-craft',
    TRUE,
    TIMESTAMP '2026-04-01 09:00:00',
    TIMESTAMP '2026-04-01 09:00:00'
FROM users u
WHERE u.email = 'frontend@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = u.user_id);

INSERT INTO user_profiles (
    user_id, profile_image, channel_name, bio, channel_description,
    phone, date_of_birth, github_url, blog_url, is_public,
    created_at, updated_at
)
SELECT
    u.user_id,
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    'AI 데이터 연구소',
    'LLM 서비스, 데이터 분석, 커리어 준비를 실습 중심으로 안내합니다.',
    'AI 서비스 구현, 데이터 분석 기본기, 개발자 커리어 문서화를 함께 다루는 채널입니다.',
    NULL, NULL,
    'https://github.com/ai-data-lab',
    'https://blog.devpath.com/ai-data-lab',
    TRUE,
    TIMESTAMP '2026-04-01 09:05:00',
    TIMESTAMP '2026-04-01 09:05:00'
FROM users u
WHERE u.email = 'data@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = u.user_id);

UPDATE user_profiles up
SET
    channel_name = CASE u.email
        WHEN 'frontend@devpath.com' THEN '프론트엔드 크래프트'
        WHEN 'data@devpath.com' THEN 'AI 데이터 연구소'
        ELSE up.channel_name
    END,
    updated_at = NOW()
FROM users u
WHERE up.user_id = u.user_id
  AND u.email IN ('frontend@devpath.com', 'data@devpath.com');

INSERT INTO tags (name, category, is_official, is_deleted)
WITH catalog_tags(name, category) AS (
    VALUES
        ('Kubernetes', 'DevOps'),
        ('DevOps', 'DevOps'),
        ('Next.js', 'Frontend'),
        ('Tailwind', 'Frontend'),
        ('Flutter', 'Mobile'),
        ('모바일', 'Mobile'),
        ('앱 출시', 'Mobile'),
        ('AI', 'AI'),
        ('LLM', 'AI'),
        ('RAG', 'AI'),
        ('LangChain', 'AI'),
        ('SQL', 'Data'),
        ('Pandas', 'Data'),
        ('데이터', 'Data'),
        ('이력서', 'Career'),
        ('기술 면접', 'Career'),
        ('포트폴리오', 'Career')
)
SELECT ct.name, ct.category, TRUE, FALSE
FROM catalog_tags ct
WHERE NOT EXISTS (SELECT 1 FROM tags t WHERE t.name = ct.name);

INSERT INTO user_tech_stacks (user_id, tag_id)
WITH instructor_tags(email, tag_name) AS (
    VALUES
        ('instructor@devpath.com', 'Java'),
        ('instructor@devpath.com', 'Spring Boot'),
        ('instructor@devpath.com', 'Docker'),
        ('instructor@devpath.com', 'Kubernetes'),
        ('frontend@devpath.com', 'React'),
        ('frontend@devpath.com', 'TypeScript'),
        ('frontend@devpath.com', 'Next.js'),
        ('frontend@devpath.com', 'Flutter'),
        ('frontend@devpath.com', 'Tailwind'),
        ('data@devpath.com', 'AI'),
        ('data@devpath.com', 'LLM'),
        ('data@devpath.com', 'RAG'),
        ('data@devpath.com', 'SQL'),
        ('data@devpath.com', 'Pandas'),
        ('data@devpath.com', '기술 면접')
)
SELECT u.user_id, t.tag_id
FROM instructor_tags it
JOIN users u ON u.email = it.email
JOIN tags t ON t.name = it.tag_name
WHERE NOT EXISTS (
    SELECT 1
    FROM user_tech_stacks uts
    WHERE uts.user_id = u.user_id
      AND uts.tag_id = t.tag_id
);

-- 기존 테스트/샘플 공개 강의는 학습자 공개 목록에서 제외한다.
UPDATE courses
SET status = 'DRAFT',
    published_at = NULL
WHERE title IN (
    'Spring Boot Intro',
    'React Dashboard Sprint',
    '운영체제 이해하기',
    '[A-CASE-A] Node Clearance Course',
    '[A-CASE-B] Tag Missing Course',
    '[A-CASE-C] Quiz Fail Course'
);

INSERT INTO courses (
    instructor_id, title, subtitle, description,
    thumbnail_url, intro_video_url, video_asset_key, duration_seconds,
    price, original_price, currency, difficulty_level, language,
    has_certificate, status, published_at
)
WITH catalog_courses(
    instructor_email, title, subtitle, description, thumbnail_url,
    duration_seconds, price, original_price, difficulty_level, has_certificate, published_at
) AS (
    VALUES
        ('instructor@devpath.com', '실무 Spring Boot 백엔드 입문', 'REST API, JPA, 인증까지 한 번에 잡는 백엔드 시작 과정', 'Java 기본기를 가진 학습자가 Spring Boot 프로젝트 구조, REST API 설계, JPA 매핑, JWT 인증 흐름을 실제 서비스 형태로 연결해 보는 강의입니다.', 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80', 32400, 89000, 129000, 'BEGINNER', TRUE, TIMESTAMP '2026-04-01 09:00:00'),
        ('instructor@devpath.com', 'Docker & Kubernetes 운영 실전', '컨테이너 이미지부터 배포 매니페스트까지 다루는 운영 입문', 'Docker 이미지 빌드, Compose 기반 로컬 환경, Kubernetes Deployment와 Service를 연결해 운영 가능한 백엔드 배포 흐름을 익힙니다.', 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=1200&q=80', 39600, 109000, 159000, 'ADVANCED', TRUE, TIMESTAMP '2026-04-02 09:00:00'),
        ('frontend@devpath.com', 'React 19 프론트엔드 실전 가이드', '상태 설계, UI 품질, 테스트까지 연결하는 React 실무 과정', '컴포넌트 경계, 상태 배치, 폼 처리, Tailwind 스타일링, Playwright 테스트를 통해 프론트엔드 기능을 안정적으로 출시하는 방법을 다룹니다.', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80', 28800, 79000, 119000, 'INTERMEDIATE', TRUE, TIMESTAMP '2026-04-03 09:00:00'),
        ('frontend@devpath.com', 'Next.js 14 제품 개발 실전', 'App Router 기반으로 배포 가능한 제품 화면 만들기', 'Next.js App Router, 서버 컴포넌트, 캐싱, 인증, 메타데이터, 이미지 최적화까지 제품 출시 전에 필요한 구현 포인트를 실습합니다.', 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80', 34200, 99000, 139000, 'INTERMEDIATE', TRUE, TIMESTAMP '2026-04-04 09:00:00'),
        ('frontend@devpath.com', 'Flutter로 MVP 앱 출시하기', '아이디어 검증용 모바일 앱을 빠르게 만들고 출시 준비하기', 'Flutter 위젯 구조, 상태 관리, API 연동, 폼 검증, 앱 아이콘과 권한 설정을 거쳐 MVP 앱 출시 체크리스트까지 완성합니다.', 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80', 25200, 69000, 99000, 'BEGINNER', TRUE, TIMESTAMP '2026-04-05 09:00:00'),
        ('data@devpath.com', 'ChatGPT API와 RAG 서비스 만들기', 'LLM API 호출부터 문서 기반 Q&A 챗봇까지', '프롬프트 구조, API 호출, 임베딩, 벡터 검색, LangChain 기반 RAG 파이프라인을 연결해 문서 기반 AI 서비스를 구현합니다.', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80', 36000, 99000, 149000, 'INTERMEDIATE', TRUE, TIMESTAMP '2026-04-06 09:00:00'),
        ('data@devpath.com', 'SQL로 끝내는 데이터 분석 기본기', 'JOIN, GROUP BY, 윈도우 함수, Pandas 리포트까지', '데이터 분석에 필요한 SQL 핵심 문법과 Pandas 후처리를 묶어 매출, 리텐션, 사용자 행동 데이터를 직접 분석하는 강의입니다.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80', 21600, 49000, 89000, 'BEGINNER', TRUE, TIMESTAMP '2026-04-07 09:00:00'),
        ('data@devpath.com', '개발자 이력서와 기술 면접 패키지', '프로젝트 경험을 채용 문서와 면접 답변으로 바꾸는 과정', '프로젝트 경험 정리, 이력서 문장 작성, 포트폴리오 링크 구성, 기술 면접 답변 구조화를 통해 지원 준비물을 완성합니다.', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80', 18000, 0, 59000, 'BEGINNER', FALSE, TIMESTAMP '2026-04-08 09:00:00')
)
SELECT
    u.user_id, cc.title, cc.subtitle, cc.description,
    cc.thumbnail_url, '/samples/sample-intro.mp4', NULL, cc.duration_seconds,
    cc.price, cc.original_price, 'KRW', cc.difficulty_level, 'ko',
    cc.has_certificate, 'PUBLISHED', cc.published_at
FROM catalog_courses cc
JOIN users u ON u.email = cc.instructor_email
WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.title = cc.title);

INSERT INTO course_prerequisites (course_id, prerequisite)
WITH prereq_seed AS (
    SELECT '실무 Spring Boot 백엔드 입문' AS course_title, 'Java 문법과 객체지향 기본 개념을 알고 있어야 합니다.' AS prereq_text UNION ALL
    SELECT '실무 Spring Boot 백엔드 입문', 'HTTP 요청/응답과 JSON 구조를 이해하고 있으면 좋습니다.' UNION ALL
    SELECT 'Docker & Kubernetes 운영 실전', 'Linux 터미널 기본 명령어를 사용할 수 있어야 합니다.' UNION ALL
    SELECT 'Docker & Kubernetes 운영 실전', '간단한 웹 애플리케이션 배포 경험이 있으면 좋습니다.' UNION ALL
    SELECT 'React 19 프론트엔드 실전 가이드', 'HTML, CSS, JavaScript 기본 문법을 알고 있어야 합니다.' UNION ALL
    SELECT 'React 19 프론트엔드 실전 가이드', 'React 컴포넌트를 한 번 이상 만들어 본 경험이 있으면 좋습니다.' UNION ALL
    SELECT 'Next.js 14 제품 개발 실전', 'React의 props, state, hooks 개념을 이해하고 있어야 합니다.' UNION ALL
    SELECT 'Next.js 14 제품 개발 실전', 'REST API를 호출해 화면에 데이터를 표시해 본 경험이 있으면 좋습니다.' UNION ALL
    SELECT 'Flutter로 MVP 앱 출시하기', '프로그래밍 기초 문법과 비동기 처리 개념을 알고 있으면 좋습니다.' UNION ALL
    SELECT 'Flutter로 MVP 앱 출시하기', '모바일 앱 화면 구성에 관심이 있는 입문자를 대상으로 합니다.' UNION ALL
    SELECT 'ChatGPT API와 RAG 서비스 만들기', 'Python 또는 JavaScript로 API를 호출해 본 경험이 있으면 좋습니다.' UNION ALL
    SELECT 'ChatGPT API와 RAG 서비스 만들기', 'JSON, HTTP, 환경 변수 관리의 기본 개념을 알고 있어야 합니다.' UNION ALL
    SELECT 'SQL로 끝내는 데이터 분석 기본기', '엑셀 또는 스프레드시트로 데이터를 정리해 본 경험이 있으면 충분합니다.' UNION ALL
    SELECT 'SQL로 끝내는 데이터 분석 기본기', 'Python 기본 문법을 알면 Pandas 파트를 더 쉽게 따라올 수 있습니다.' UNION ALL
    SELECT '개발자 이력서와 기술 면접 패키지', '진행했거나 진행 중인 개인/팀 프로젝트가 하나 이상 있으면 좋습니다.' UNION ALL
    SELECT '개발자 이력서와 기술 면접 패키지', '지원하고 싶은 직무 또는 포지션을 정해두면 실습 효과가 높습니다.'
)
SELECT c.course_id, p.prereq_text
FROM prereq_seed p
JOIN courses c ON c.title = p.course_title
WHERE NOT EXISTS (
    SELECT 1 FROM course_prerequisites cp
    WHERE cp.course_id = c.course_id AND cp.prerequisite = p.prereq_text
);

INSERT INTO course_job_relevance (course_id, job_relevance)
WITH relevance(course_title, relevance_text) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', '백엔드 개발자 주니어 과제 전형 준비'),
        ('실무 Spring Boot 백엔드 입문', 'Spring Boot 기반 사내 서비스 API 개발'),
        ('Docker & Kubernetes 운영 실전', 'DevOps 엔지니어와 플랫폼 엔지니어의 배포 운영 업무'),
        ('Docker & Kubernetes 운영 실전', '백엔드 서비스 컨테이너화와 클러스터 운영'),
        ('React 19 프론트엔드 실전 가이드', '프론트엔드 개발자 실무 UI 구현과 테스트 자동화'),
        ('React 19 프론트엔드 실전 가이드', '제품 대시보드와 관리 화면 개발'),
        ('Next.js 14 제품 개발 실전', 'Next.js 기반 스타트업 제품 개발'),
        ('Next.js 14 제품 개발 실전', 'SEO와 성능을 고려한 웹 서비스 출시'),
        ('Flutter로 MVP 앱 출시하기', '초기 스타트업 MVP 앱 개발'),
        ('Flutter로 MVP 앱 출시하기', '프론트엔드 개발자의 모바일 앱 확장 역량'),
        ('ChatGPT API와 RAG 서비스 만들기', 'AI 기능을 포함한 SaaS 프로토타입 개발'),
        ('ChatGPT API와 RAG 서비스 만들기', '사내 문서 검색 챗봇과 고객지원 자동화'),
        ('SQL로 끝내는 데이터 분석 기본기', '데이터 기반 제품 개선과 운영 리포트 작성'),
        ('SQL로 끝내는 데이터 분석 기본기', '주니어 데이터 분석가와 PM의 지표 분석 업무'),
        ('개발자 이력서와 기술 면접 패키지', '신입/주니어 개발자 채용 준비'),
        ('개발자 이력서와 기술 면접 패키지', '프로젝트 경험을 포트폴리오와 면접 답변으로 전환')
)
SELECT c.course_id, r.relevance_text
FROM relevance r
JOIN courses c ON c.title = r.course_title
WHERE NOT EXISTS (
    SELECT 1 FROM course_job_relevance cj
    WHERE cj.course_id = c.course_id AND cj.job_relevance = r.relevance_text
);

INSERT INTO course_objectives (course_id, objective_text, display_order)
WITH objectives(course_title, objective_body, display_order) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', '계층형 구조로 REST API를 설계하고 구현할 수 있습니다.', 1),
        ('실무 Spring Boot 백엔드 입문', 'JPA 매핑과 JWT 인증을 연결해 기본 백엔드 기능을 완성할 수 있습니다.', 2),
        ('Docker & Kubernetes 운영 실전', 'Dockerfile과 Compose로 재현 가능한 로컬 실행 환경을 만들 수 있습니다.', 1),
        ('Docker & Kubernetes 운영 실전', 'Kubernetes Deployment, Service, ConfigMap을 이용해 서비스를 배포할 수 있습니다.', 2),
        ('React 19 프론트엔드 실전 가이드', '상태 위치와 컴포넌트 경계를 판단해 유지보수 가능한 화면을 만들 수 있습니다.', 1),
        ('React 19 프론트엔드 실전 가이드', 'Tailwind와 Playwright를 활용해 UI 품질을 점검할 수 있습니다.', 2),
        ('Next.js 14 제품 개발 실전', 'App Router 기반 라우팅, 레이아웃, 서버 컴포넌트 구조를 설계할 수 있습니다.', 1),
        ('Next.js 14 제품 개발 실전', '캐싱, 인증, 이미지 최적화를 적용해 배포 가능한 제품 화면을 완성할 수 있습니다.', 2),
        ('Flutter로 MVP 앱 출시하기', 'Flutter 위젯 구조와 상태 관리를 이용해 앱 화면을 구성할 수 있습니다.', 1),
        ('Flutter로 MVP 앱 출시하기', 'API 연동과 빌드 설정을 거쳐 MVP 앱 출시 준비를 할 수 있습니다.', 2),
        ('ChatGPT API와 RAG 서비스 만들기', 'LLM API 호출 구조와 프롬프트 메시지 설계를 이해할 수 있습니다.', 1),
        ('ChatGPT API와 RAG 서비스 만들기', '임베딩, 검색, 생성을 연결해 RAG 기반 Q&A 서비스를 만들 수 있습니다.', 2),
        ('SQL로 끝내는 데이터 분석 기본기', 'JOIN, GROUP BY, 윈도우 함수로 업무 지표를 직접 계산할 수 있습니다.', 1),
        ('SQL로 끝내는 데이터 분석 기본기', 'Pandas로 분석 결과를 정리하고 리포트용 테이블을 만들 수 있습니다.', 2),
        ('개발자 이력서와 기술 면접 패키지', '프로젝트 경험을 성과 중심 이력서 문장으로 바꿀 수 있습니다.', 1),
        ('개발자 이력서와 기술 면접 패키지', '기술 면접 질문에 구조적으로 답변하는 연습 흐름을 만들 수 있습니다.', 2)
)
SELECT c.course_id, o.objective_body, o.display_order
FROM objectives o
JOIN courses c ON c.title = o.course_title
WHERE NOT EXISTS (
    SELECT 1 FROM course_objectives co
    WHERE co.course_id = c.course_id AND co.display_order = o.display_order
);

INSERT INTO course_target_audiences (course_id, audience_description, display_order)
WITH audiences(course_title, audience_body, display_order) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', 'Spring Boot 백엔드 개발을 처음 실무 형태로 배우려는 학습자', 1),
        ('실무 Spring Boot 백엔드 입문', 'API 과제 전형을 준비하는 주니어 개발자', 2),
        ('Docker & Kubernetes 운영 실전', '컨테이너 배포와 운영 흐름을 익히려는 백엔드 개발자', 1),
        ('Docker & Kubernetes 운영 실전', 'Kubernetes 매니페스트를 직접 작성해 보고 싶은 DevOps 입문자', 2),
        ('React 19 프론트엔드 실전 가이드', 'React 실무 코드 구조와 테스트를 정리하고 싶은 프론트엔드 개발자', 1),
        ('React 19 프론트엔드 실전 가이드', '대시보드나 관리자 화면을 안정적으로 만들고 싶은 학습자', 2),
        ('Next.js 14 제품 개발 실전', 'Next.js App Router 기반 제품을 만들어 보고 싶은 개발자', 1),
        ('Next.js 14 제품 개발 실전', '성능, SEO, 인증을 함께 고려해야 하는 웹 서비스 담당자', 2),
        ('Flutter로 MVP 앱 출시하기', '빠르게 모바일 앱 MVP를 만들어 검증하고 싶은 개발자', 1),
        ('Flutter로 MVP 앱 출시하기', '웹 개발 경험을 모바일 앱 개발로 확장하려는 학습자', 2),
        ('ChatGPT API와 RAG 서비스 만들기', 'LLM API로 실제 기능을 만들어 보고 싶은 웹/백엔드 개발자', 1),
        ('ChatGPT API와 RAG 서비스 만들기', '사내 문서 기반 챗봇이나 검색 기능을 기획하는 개발자', 2),
        ('SQL로 끝내는 데이터 분석 기본기', 'SQL로 제품 지표를 직접 확인해야 하는 개발자와 PM', 1),
        ('SQL로 끝내는 데이터 분석 기본기', '데이터 분석 직무 전환을 준비하는 입문자', 2),
        ('개발자 이력서와 기술 면접 패키지', '신입 또는 주니어 개발자 채용을 준비하는 학습자', 1),
        ('개발자 이력서와 기술 면접 패키지', '프로젝트 경험은 있지만 문서화와 면접 답변이 막히는 개발자', 2)
)
SELECT c.course_id, a.audience_body, a.display_order
FROM audiences a
JOIN courses c ON c.title = a.course_title
WHERE NOT EXISTS (
    SELECT 1 FROM course_target_audiences cta
    WHERE cta.course_id = c.course_id AND cta.display_order = a.display_order
);

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
WITH course_tags(course_title, tag_name, proficiency_level) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', 'Java', 2),
        ('실무 Spring Boot 백엔드 입문', 'Spring Boot', 3),
        ('실무 Spring Boot 백엔드 입문', 'JPA', 2),
        ('Docker & Kubernetes 운영 실전', 'Docker', 3),
        ('Docker & Kubernetes 운영 실전', 'Kubernetes', 3),
        ('Docker & Kubernetes 운영 실전', 'DevOps', 2),
        ('React 19 프론트엔드 실전 가이드', 'React', 3),
        ('React 19 프론트엔드 실전 가이드', 'TypeScript', 2),
        ('React 19 프론트엔드 실전 가이드', 'Tailwind', 2),
        ('Next.js 14 제품 개발 실전', 'Next.js', 3),
        ('Next.js 14 제품 개발 실전', 'React', 3),
        ('Next.js 14 제품 개발 실전', 'TypeScript', 2),
        ('Flutter로 MVP 앱 출시하기', 'Flutter', 3),
        ('Flutter로 MVP 앱 출시하기', '모바일', 2),
        ('Flutter로 MVP 앱 출시하기', '앱 출시', 2),
        ('ChatGPT API와 RAG 서비스 만들기', 'AI', 2),
        ('ChatGPT API와 RAG 서비스 만들기', 'LLM', 3),
        ('ChatGPT API와 RAG 서비스 만들기', 'RAG', 3),
        ('ChatGPT API와 RAG 서비스 만들기', 'LangChain', 2),
        ('SQL로 끝내는 데이터 분석 기본기', 'SQL', 3),
        ('SQL로 끝내는 데이터 분석 기본기', 'Pandas', 2),
        ('SQL로 끝내는 데이터 분석 기본기', '데이터', 2),
        ('개발자 이력서와 기술 면접 패키지', '이력서', 3),
        ('개발자 이력서와 기술 면접 패키지', '기술 면접', 3),
        ('개발자 이력서와 기술 면접 패키지', '포트폴리오', 2)
)
SELECT c.course_id, t.tag_id, ct.proficiency_level
FROM course_tags ct
JOIN courses c ON c.title = ct.course_title
JOIN tags t ON t.name = ct.tag_name
WHERE NOT EXISTS (
    SELECT 1 FROM course_tag_maps ctm
    WHERE ctm.course_id = c.course_id AND ctm.tag_id = t.tag_id
);

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
WITH sections(course_title, section_title, section_description, sort_order) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', 'Spring Boot 프로젝트 시작', '프로젝트 구조, 계층 분리, REST API 흐름을 잡습니다.', 1),
        ('실무 Spring Boot 백엔드 입문', 'JPA와 인증 기본기', '데이터 모델링과 JWT 인증을 연결해 백엔드 기본 기능을 완성합니다.', 2),
        ('Docker & Kubernetes 운영 실전', '컨테이너 운영 기초', 'Dockerfile, 이미지, 컨테이너, Compose 실행 흐름을 다룹니다.', 1),
        ('Docker & Kubernetes 운영 실전', 'Kubernetes 배포 흐름', 'Deployment, Service, ConfigMap, Secret을 이용한 클러스터 배포를 익힙니다.', 2),
        ('React 19 프론트엔드 실전 가이드', 'React 구조 설계', '컴포넌트 경계와 상태 배치를 기준 있게 결정합니다.', 1),
        ('React 19 프론트엔드 실전 가이드', 'UI 품질과 테스트', 'Tailwind 스타일링과 Playwright 테스트로 화면 품질을 점검합니다.', 2),
        ('Next.js 14 제품 개발 실전', 'App Router와 데이터 흐름', '라우팅, 레이아웃, 서버 컴포넌트, 캐싱 전략을 연결합니다.', 1),
        ('Next.js 14 제품 개발 실전', '배포 가능한 제품 완성', '인증, 이미지 최적화, 메타데이터, 출시 점검을 다룹니다.', 2),
        ('Flutter로 MVP 앱 출시하기', 'Flutter 앱 구조', '위젯 트리, 상태 관리, 라우팅, 폼 검증으로 앱의 뼈대를 만듭니다.', 1),
        ('Flutter로 MVP 앱 출시하기', '출시 준비', 'API 연동, 에러 처리, 빌드 설정과 스토어 제출 준비를 진행합니다.', 2),
        ('ChatGPT API와 RAG 서비스 만들기', 'LLM API 기본', '프롬프트, 메시지 구조, API 호출과 응답 처리를 다룹니다.', 1),
        ('ChatGPT API와 RAG 서비스 만들기', 'RAG 파이프라인', '문서 청킹, 임베딩, 검색, 생성을 하나의 서비스 흐름으로 연결합니다.', 2),
        ('SQL로 끝내는 데이터 분석 기본기', 'SQL 분석 기초', 'SELECT, JOIN, GROUP BY, 윈도우 함수로 업무 지표를 계산합니다.', 1),
        ('SQL로 끝내는 데이터 분석 기본기', 'Pandas 리포트 자동화', 'CSV 정리, 결측치 처리, 집계 테이블 작성으로 리포트를 자동화합니다.', 2),
        ('개발자 이력서와 기술 면접 패키지', '이력서 스토리라인', '프로젝트 경험을 성과 중심 문장과 STAR 구조로 정리합니다.', 1),
        ('개발자 이력서와 기술 면접 패키지', '면접과 포트폴리오', '기술 면접 답변과 GitHub 포트폴리오 정리를 함께 진행합니다.', 2)
)
SELECT c.course_id, s.section_title, s.section_description, s.sort_order, TRUE
FROM sections s
JOIN courses c ON c.title = s.course_title
WHERE NOT EXISTS (
    SELECT 1 FROM course_sections cs
    WHERE cs.course_id = c.course_id AND cs.sort_order = s.sort_order
);

INSERT INTO lessons (
    section_id, title, description, lesson_type,
    video_url, video_asset_key, video_provider,
    thumbnail_url, duration_seconds, is_preview, is_published, sort_order
)
WITH lessons_seed(course_title, section_order, lesson_order, lesson_title, lesson_description, lesson_type, video_url, duration_seconds, is_preview) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', 1, 1, '프로젝트 구조와 개발 환경 세팅', 'Gradle 프로젝트 구조와 로컬 실행 환경을 맞춥니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 780, TRUE),
        ('실무 Spring Boot 백엔드 입문', 1, 2, 'REST API 흐름과 계층 분리', 'Controller, Service, Repository의 책임을 나누어 구현합니다.', 'VIDEO', '/samples/sample-intro.mp4', 960, FALSE),
        ('실무 Spring Boot 백엔드 입문', 1, 3, '섹션 마무리 퀴즈: Controller-Service-Repository 흐름', '요청 흐름과 계층별 책임을 점검합니다.', 'READING', NULL, 300, FALSE),
        ('실무 Spring Boot 백엔드 입문', 2, 1, 'Entity 설계와 Repository 작성', '회원 도메인을 기준으로 Entity와 Repository를 작성합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 1020, FALSE),
        ('실무 Spring Boot 백엔드 입문', 2, 2, 'Spring Security와 JWT 인증 흐름', '로그인 요청부터 토큰 검증까지의 흐름을 연결합니다.', 'VIDEO', '/samples/sample-intro.mp4', 1080, FALSE),
        ('실무 Spring Boot 백엔드 입문', 2, 3, '실습 과제: 회원 API와 JWT 로그인 완성', '회원 가입, 로그인, 인증 테스트 결과를 제출합니다.', 'CODING', NULL, 900, FALSE),
        ('Docker & Kubernetes 운영 실전', 1, 1, 'Dockerfile 작성과 이미지 빌드', '멀티 스테이지 빌드와 이미지 태그 전략을 익힙니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 840, TRUE),
        ('Docker & Kubernetes 운영 실전', 1, 2, 'Docker Compose로 로컬 환경 구성', 'DB와 애플리케이션을 Compose로 함께 실행합니다.', 'VIDEO', '/samples/sample-intro.mp4', 960, FALSE),
        ('Docker & Kubernetes 운영 실전', 1, 3, '섹션 마무리 퀴즈: 이미지와 컨테이너 생명주기', '이미지, 컨테이너, 볼륨의 차이를 점검합니다.', 'READING', NULL, 300, FALSE),
        ('Docker & Kubernetes 운영 실전', 2, 1, 'Deployment와 Service 이해', 'Pod 복제와 네트워크 노출 방식을 실습합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 1020, FALSE),
        ('Docker & Kubernetes 운영 실전', 2, 2, 'ConfigMap과 Secret 적용', '환경 설정과 민감 정보를 분리해 배포합니다.', 'VIDEO', '/samples/sample-intro.mp4', 900, FALSE),
        ('Docker & Kubernetes 운영 실전', 2, 3, '실습 과제: 무중단 배포 매니페스트 작성', 'Deployment, Service, ConfigMap을 포함한 배포 파일을 제출합니다.', 'CODING', NULL, 900, FALSE),
        ('React 19 프론트엔드 실전 가이드', 1, 1, '컴포넌트 경계와 상태 배치', '상태가 살아야 할 위치와 컴포넌트 책임을 정합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 900, TRUE),
        ('React 19 프론트엔드 실전 가이드', 1, 2, 'Actions와 폼 처리 패턴', '폼 제출, 낙관적 업데이트, 오류 메시지 흐름을 구성합니다.', 'VIDEO', '/samples/sample-intro.mp4', 960, FALSE),
        ('React 19 프론트엔드 실전 가이드', 1, 3, '섹션 마무리 퀴즈: 상태 설계 판단 기준', '지역 상태와 공유 상태를 구분하는 기준을 점검합니다.', 'READING', NULL, 300, FALSE),
        ('React 19 프론트엔드 실전 가이드', 2, 1, 'Tailwind 유틸리티 설계', '반복 스타일을 줄이고 화면 단위를 안정적으로 구성합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 840, FALSE),
        ('React 19 프론트엔드 실전 가이드', 2, 2, 'Playwright로 사용자 흐름 테스트', '로그인부터 주요 액션까지 E2E 테스트를 작성합니다.', 'VIDEO', '/samples/sample-intro.mp4', 1020, FALSE),
        ('React 19 프론트엔드 실전 가이드', 2, 3, '실습 과제: 대시보드 화면 완성', '필터, 카드, 차트를 포함한 대시보드 화면을 제출합니다.', 'CODING', NULL, 900, FALSE),
        ('Next.js 14 제품 개발 실전', 1, 1, '라우팅과 레이아웃 구조 설계', 'App Router에서 공통 레이아웃과 상세 페이지를 분리합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 900, TRUE),
        ('Next.js 14 제품 개발 실전', 1, 2, '서버 컴포넌트와 캐싱 전략', '서버 렌더링 데이터와 캐시 무효화 기준을 정합니다.', 'VIDEO', '/samples/sample-intro.mp4', 1080, FALSE),
        ('Next.js 14 제품 개발 실전', 1, 3, '섹션 마무리 퀴즈: App Router 데이터 흐름', '서버 컴포넌트와 클라이언트 컴포넌트의 역할을 점검합니다.', 'READING', NULL, 300, FALSE),
        ('Next.js 14 제품 개발 실전', 2, 1, '인증과 권한 처리', '세션 확인과 보호 라우트 처리 흐름을 구현합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 960, FALSE),
        ('Next.js 14 제품 개발 실전', 2, 2, '이미지 최적화와 메타데이터', '제품 상세 화면의 이미지, title, description을 정리합니다.', 'VIDEO', '/samples/sample-intro.mp4', 840, FALSE),
        ('Next.js 14 제품 개발 실전', 2, 3, '실습 과제: 예약 상세 페이지 출시 체크리스트', '예약 상세 페이지를 만들고 성능, 접근성, SEO 점검 결과를 제출합니다.', 'CODING', NULL, 900, FALSE),
        ('Flutter로 MVP 앱 출시하기', 1, 1, '위젯 트리와 상태 관리', 'StatelessWidget, StatefulWidget, 상태 변경 흐름을 정리합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 840, TRUE),
        ('Flutter로 MVP 앱 출시하기', 1, 2, '라우팅과 폼 검증', '화면 이동과 입력 검증을 이용해 가입 화면을 만듭니다.', 'VIDEO', '/samples/sample-intro.mp4', 900, FALSE),
        ('Flutter로 MVP 앱 출시하기', 1, 3, '섹션 마무리 퀴즈: 위젯과 상태 흐름', '위젯 분리와 상태 갱신 범위를 점검합니다.', 'READING', NULL, 300, FALSE),
        ('Flutter로 MVP 앱 출시하기', 2, 1, 'REST API 연동과 에러 처리', 'HTTP 요청, 로딩, 실패 메시지 처리를 구현합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 960, FALSE),
        ('Flutter로 MVP 앱 출시하기', 2, 2, '앱 아이콘, 권한, 빌드 설정', '출시 전에 필요한 앱 메타데이터와 빌드 설정을 정리합니다.', 'VIDEO', '/samples/sample-intro.mp4', 780, FALSE),
        ('Flutter로 MVP 앱 출시하기', 2, 3, '실습 과제: 스토어 제출용 MVP 화면 완성', '핵심 화면 3개와 빌드 체크리스트를 제출합니다.', 'CODING', NULL, 900, FALSE),
        ('ChatGPT API와 RAG 서비스 만들기', 1, 1, '프롬프트와 메시지 구조', 'system, user, assistant 메시지의 역할과 프롬프트 템플릿을 정리합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 900, TRUE),
        ('ChatGPT API와 RAG 서비스 만들기', 1, 2, 'LLM API 호출과 응답 처리', '환경 변수, 요청 본문, 스트리밍 응답 처리 흐름을 구현합니다.', 'VIDEO', '/samples/sample-intro.mp4', 1080, FALSE),
        ('ChatGPT API와 RAG 서비스 만들기', 1, 3, '섹션 마무리 퀴즈: 프롬프트와 토큰 관리', '프롬프트 구성과 토큰 비용을 점검합니다.', 'READING', NULL, 300, FALSE),
        ('ChatGPT API와 RAG 서비스 만들기', 2, 1, '문서 청킹과 임베딩 저장', '문서를 검색 가능한 단위로 나누고 임베딩을 저장합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 1020, FALSE),
        ('ChatGPT API와 RAG 서비스 만들기', 2, 2, 'LangChain으로 검색-생성 연결', '검색 결과를 프롬프트에 넣어 답변을 생성합니다.', 'VIDEO', '/samples/sample-intro.mp4', 1140, FALSE),
        ('ChatGPT API와 RAG 서비스 만들기', 2, 3, '실습 과제: 사내 문서 Q&A 챗봇 프로토타입', '문서 업로드, 검색, 답변 생성 흐름이 있는 프로토타입을 제출합니다.', 'CODING', NULL, 900, FALSE),
        ('SQL로 끝내는 데이터 분석 기본기', 1, 1, 'SELECT, JOIN, GROUP BY 핵심', '업무 데이터 분석에 가장 자주 쓰는 SQL 패턴을 정리합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 840, TRUE),
        ('SQL로 끝내는 데이터 분석 기본기', 1, 2, '윈도우 함수로 순위와 누적 계산', 'ROW_NUMBER, SUM OVER로 랭킹과 누적 지표를 계산합니다.', 'VIDEO', '/samples/sample-intro.mp4', 960, FALSE),
        ('SQL로 끝내는 데이터 분석 기본기', 1, 3, '섹션 마무리 퀴즈: 집계 쿼리 읽기', 'GROUP BY와 윈도우 함수의 차이를 점검합니다.', 'READING', NULL, 300, FALSE),
        ('SQL로 끝내는 데이터 분석 기본기', 2, 1, 'CSV 정리와 결측치 처리', 'Pandas로 원본 데이터를 정리하고 결측치를 처리합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 900, FALSE),
        ('SQL로 끝내는 데이터 분석 기본기', 2, 2, '시각화용 집계 테이블 만들기', '차트에 바로 연결할 수 있는 분석 테이블을 만듭니다.', 'VIDEO', '/samples/sample-intro.mp4', 840, FALSE),
        ('SQL로 끝내는 데이터 분석 기본기', 2, 3, '실습 과제: 매출 리텐션 리포트 작성', 'SQL 결과와 Pandas 요약을 이용해 리포트를 제출합니다.', 'CODING', NULL, 900, FALSE),
        ('개발자 이력서와 기술 면접 패키지', 1, 1, '경력 없는 프로젝트를 성과로 쓰기', '기능 나열을 줄이고 문제, 행동, 결과 중심 문장으로 바꿉니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 780, TRUE),
        ('개발자 이력서와 기술 면접 패키지', 1, 2, 'STAR 방식으로 경험 정리하기', 'Situation, Task, Action, Result 구조로 경험을 정리합니다.', 'VIDEO', '/samples/sample-intro.mp4', 840, FALSE),
        ('개발자 이력서와 기술 면접 패키지', 1, 3, '섹션 마무리 퀴즈: 이력서 문장 점검', '좋은 이력서 문장과 나쁜 문장을 구분합니다.', 'READING', NULL, 300, FALSE),
        ('개발자 이력서와 기술 면접 패키지', 2, 1, 'CS와 프로젝트 질문 답변 구조', '기술 선택 이유, 트러블슈팅, 개선 경험을 답변으로 구성합니다.', 'VIDEO', '/samples/ocr-code-demo.mp4', 900, FALSE),
        ('개발자 이력서와 기술 면접 패키지', 2, 2, 'GitHub README와 배포 링크 정리', '면접관이 바로 확인할 수 있는 README와 데모 링크를 정리합니다.', 'VIDEO', '/samples/sample-intro.mp4', 720, FALSE),
        ('개발자 이력서와 기술 면접 패키지', 2, 3, '실습 과제: 지원 포지션 맞춤 이력서 완성', '지원 포지션 하나를 정해 이력서와 프로젝트 설명을 제출합니다.', 'CODING', NULL, 900, FALSE)
)
SELECT
    cs.section_id,
    ls.lesson_title,
    ls.lesson_description,
    ls.lesson_type,
    ls.video_url,
    NULL,
    NULL,
    c.thumbnail_url,
    ls.duration_seconds,
    ls.is_preview,
    TRUE,
    ls.lesson_order
FROM lessons_seed ls
JOIN courses c ON c.title = ls.course_title
JOIN course_sections cs ON cs.course_id = c.course_id AND cs.sort_order = ls.section_order
WHERE NOT EXISTS (
    SELECT 1 FROM lessons l
    WHERE l.section_id = cs.section_id AND l.sort_order = ls.lesson_order
);

INSERT INTO roadmaps (creator_id, title, description, is_official, is_public, is_deleted, created_at)
SELECT
    u.user_id,
    'DevPath 공개 강의 평가 데이터',
    '공개 강의 섹션 마지막 퀴즈와 과제를 연결하기 위한 내부 로드맵입니다.',
    FALSE,
    FALSE,
    FALSE,
    TIMESTAMP '2026-04-01 10:00:00'
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM roadmaps r WHERE r.title = 'DevPath 공개 강의 평가 데이터');

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
WITH activity_nodes(course_title, section_order, activity_kind, node_title, node_content, sort_order) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', 1, 'QUIZ', '[CATALOG] 실무 Spring Boot 백엔드 입문 - 1 QUIZ', 'Spring Boot 계층 구조와 요청 흐름을 확인하는 퀴즈입니다.', 1001),
        ('실무 Spring Boot 백엔드 입문', 2, 'ASSIGNMENT', '[CATALOG] 실무 Spring Boot 백엔드 입문 - 2 ASSIGNMENT', '회원 API와 JWT 로그인 흐름을 완성하는 과제입니다.', 1002),
        ('Docker & Kubernetes 운영 실전', 1, 'QUIZ', '[CATALOG] Docker & Kubernetes 운영 실전 - 1 QUIZ', '이미지, 컨테이너, Compose 실행 흐름을 확인하는 퀴즈입니다.', 1011),
        ('Docker & Kubernetes 운영 실전', 2, 'ASSIGNMENT', '[CATALOG] Docker & Kubernetes 운영 실전 - 2 ASSIGNMENT', 'Kubernetes 배포 매니페스트를 작성하는 과제입니다.', 1012),
        ('React 19 프론트엔드 실전 가이드', 1, 'QUIZ', '[CATALOG] React 19 프론트엔드 실전 가이드 - 1 QUIZ', 'React 상태 설계와 컴포넌트 경계를 확인하는 퀴즈입니다.', 1021),
        ('React 19 프론트엔드 실전 가이드', 2, 'ASSIGNMENT', '[CATALOG] React 19 프론트엔드 실전 가이드 - 2 ASSIGNMENT', '대시보드 화면과 테스트 흐름을 완성하는 과제입니다.', 1022),
        ('Next.js 14 제품 개발 실전', 1, 'QUIZ', '[CATALOG] Next.js 14 제품 개발 실전 - 1 QUIZ', 'App Router와 서버 컴포넌트 역할을 확인하는 퀴즈입니다.', 1031),
        ('Next.js 14 제품 개발 실전', 2, 'ASSIGNMENT', '[CATALOG] Next.js 14 제품 개발 실전 - 2 ASSIGNMENT', '예약 상세 페이지 출시 체크리스트를 완성하는 과제입니다.', 1032),
        ('Flutter로 MVP 앱 출시하기', 1, 'QUIZ', '[CATALOG] Flutter로 MVP 앱 출시하기 - 1 QUIZ', '위젯 구조와 상태 흐름을 확인하는 퀴즈입니다.', 1041),
        ('Flutter로 MVP 앱 출시하기', 2, 'ASSIGNMENT', '[CATALOG] Flutter로 MVP 앱 출시하기 - 2 ASSIGNMENT', '스토어 제출용 MVP 화면을 완성하는 과제입니다.', 1042),
        ('ChatGPT API와 RAG 서비스 만들기', 1, 'QUIZ', '[CATALOG] ChatGPT API와 RAG 서비스 만들기 - 1 QUIZ', '프롬프트 구성과 토큰 관리 기준을 확인하는 퀴즈입니다.', 1051),
        ('ChatGPT API와 RAG 서비스 만들기', 2, 'ASSIGNMENT', '[CATALOG] ChatGPT API와 RAG 서비스 만들기 - 2 ASSIGNMENT', '문서 기반 Q&A 챗봇 프로토타입을 완성하는 과제입니다.', 1052),
        ('SQL로 끝내는 데이터 분석 기본기', 1, 'QUIZ', '[CATALOG] SQL로 끝내는 데이터 분석 기본기 - 1 QUIZ', '집계 쿼리와 윈도우 함수 차이를 확인하는 퀴즈입니다.', 1061),
        ('SQL로 끝내는 데이터 분석 기본기', 2, 'ASSIGNMENT', '[CATALOG] SQL로 끝내는 데이터 분석 기본기 - 2 ASSIGNMENT', '매출 리텐션 리포트를 작성하는 과제입니다.', 1062),
        ('개발자 이력서와 기술 면접 패키지', 1, 'QUIZ', '[CATALOG] 개발자 이력서와 기술 면접 패키지 - 1 QUIZ', '이력서 문장과 STAR 구조를 확인하는 퀴즈입니다.', 1071),
        ('개발자 이력서와 기술 면접 패키지', 2, 'ASSIGNMENT', '[CATALOG] 개발자 이력서와 기술 면접 패키지 - 2 ASSIGNMENT', '지원 포지션 맞춤 이력서를 완성하는 과제입니다.', 1072)
)
SELECT
    r.roadmap_id,
    an.node_title,
    an.node_content,
    an.activity_kind,
    an.sort_order,
    an.course_title,
    an.section_order
FROM activity_nodes an
JOIN roadmaps r ON r.title = 'DevPath 공개 강의 평가 데이터'
WHERE NOT EXISTS (SELECT 1 FROM roadmap_nodes rn WHERE rn.title = an.node_title);

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT c.course_id, rn.node_id, TIMESTAMP '2026-04-01 10:10:00'
FROM courses c
JOIN roadmap_nodes rn ON rn.sub_topics = c.title
WHERE rn.title LIKE '[CATALOG]%'
  AND NOT EXISTS (
      SELECT 1 FROM course_node_mappings cnm
      WHERE cnm.course_id = c.course_id AND cnm.node_id = rn.node_id
  );

UPDATE lessons l
SET quiz_node_id = (
    SELECT rn.node_id
    FROM course_sections cs
    JOIN courses c ON c.course_id = cs.course_id
    JOIN roadmap_nodes rn ON rn.sub_topics = c.title
                         AND rn.branch_group = cs.sort_order
                         AND rn.node_type = 'QUIZ'
    WHERE cs.section_id = l.section_id
)
WHERE l.sort_order = 3
  AND l.title LIKE '섹션 마무리 퀴즈:%'
  AND l.quiz_node_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM course_sections cs
      JOIN courses c ON c.course_id = cs.course_id
      JOIN roadmap_nodes rn ON rn.sub_topics = c.title
                           AND rn.branch_group = cs.sort_order
                           AND rn.node_type = 'QUIZ'
      WHERE cs.section_id = l.section_id
  );

UPDATE lessons l
SET assignment_node_id = (
    SELECT rn.node_id
    FROM course_sections cs
    JOIN courses c ON c.course_id = cs.course_id
    JOIN roadmap_nodes rn ON rn.sub_topics = c.title
                         AND rn.branch_group = cs.sort_order
                         AND rn.node_type = 'ASSIGNMENT'
    WHERE cs.section_id = l.section_id
)
WHERE l.sort_order = 3
  AND l.title LIKE '실습 과제:%'
  AND l.assignment_node_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM course_sections cs
      JOIN courses c ON c.course_id = cs.course_id
      JOIN roadmap_nodes rn ON rn.sub_topics = c.title
                           AND rn.branch_group = cs.sort_order
                           AND rn.node_type = 'ASSIGNMENT'
      WHERE cs.section_id = l.section_id
  );

INSERT INTO quizzes (
    node_id, title, description, quiz_type, total_score, pass_score,
    time_limit_minutes, is_published, is_active, expose_answer,
    expose_explanation, is_deleted, created_at, updated_at
)
SELECT
    rn.node_id,
    rn.sub_topics || ' 섹션 점검 퀴즈',
    rn.content,
    'MANUAL',
    10,
    7,
    10,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TIMESTAMP '2026-04-01 10:20:00',
    TIMESTAMP '2026-04-01 10:20:00'
FROM roadmap_nodes rn
WHERE rn.title LIKE '[CATALOG]%'
  AND rn.node_type = 'QUIZ'
  AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.node_id = rn.node_id);

INSERT INTO quiz_questions (
    quiz_id, question_type, question_text, explanation, points,
    display_order, source_timestamp, is_deleted, created_at, updated_at
)
SELECT
    q.quiz_id,
    'MULTIPLE_CHOICE',
    rn.sub_topics || ' 섹션을 마무리할 때 가장 먼저 확인해야 하는 것은 무엇인가요?',
    '섹션 핵심 개념과 실습 요구사항이 일치하는지 확인해야 실제 적용으로 이어질 수 있습니다.',
    10,
    1,
    NULL,
    FALSE,
    TIMESTAMP '2026-04-01 10:25:00',
    TIMESTAMP '2026-04-01 10:25:00'
FROM quizzes q
JOIN roadmap_nodes rn ON rn.node_id = q.node_id
WHERE rn.title LIKE '[CATALOG]%'
  AND NOT EXISTS (
      SELECT 1 FROM quiz_questions qq
      WHERE qq.quiz_id = q.quiz_id AND qq.display_order = 1
  );

INSERT INTO quiz_question_options (
    question_id, option_text, is_correct, display_order,
    is_deleted, created_at, updated_at
)
SELECT
    qq.question_id,
    '섹션 핵심 개념과 실습 요구사항이 일치하는지 확인한다',
    TRUE,
    1,
    FALSE,
    TIMESTAMP '2026-04-01 10:30:00',
    TIMESTAMP '2026-04-01 10:30:00'
FROM quiz_questions qq
JOIN quizzes q ON q.quiz_id = qq.quiz_id
JOIN roadmap_nodes rn ON rn.node_id = q.node_id
WHERE rn.title LIKE '[CATALOG]%'
  AND NOT EXISTS (
      SELECT 1 FROM quiz_question_options qo
      WHERE qo.question_id = qq.question_id AND qo.display_order = 1
  );

INSERT INTO quiz_question_options (
    question_id, option_text, is_correct, display_order,
    is_deleted, created_at, updated_at
)
SELECT
    qq.question_id,
    '도구 이름만 외우고 동작 흐름은 확인하지 않는다',
    FALSE,
    2,
    FALSE,
    TIMESTAMP '2026-04-01 10:30:00',
    TIMESTAMP '2026-04-01 10:30:00'
FROM quiz_questions qq
JOIN quizzes q ON q.quiz_id = qq.quiz_id
JOIN roadmap_nodes rn ON rn.node_id = q.node_id
WHERE rn.title LIKE '[CATALOG]%'
  AND NOT EXISTS (
      SELECT 1 FROM quiz_question_options qo
      WHERE qo.question_id = qq.question_id AND qo.display_order = 2
  );

INSERT INTO quiz_questions (
    quiz_id, question_type, question_text, explanation, points,
    display_order, source_timestamp, is_deleted, created_at, updated_at
)
WITH catalog_quiz_question_seed(course_title, question_text, explanation) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', 'Spring Boot REST API 구조에서 Controller의 역할로 가장 적절한 것은 무엇인가요?', 'Controller는 HTTP 요청과 응답을 담당하고, 핵심 비즈니스 흐름은 Service로 위임하는 것이 일반적인 계층 분리 방식입니다.'),
        ('Docker & Kubernetes 운영 실전', 'Docker 이미지와 컨테이너의 관계로 가장 올바른 설명은 무엇인가요?', '이미지는 실행 가능한 템플릿이고, 컨테이너는 그 이미지를 기반으로 실행된 인스턴스입니다.'),
        ('React 19 프론트엔드 실전 가이드', 'React에서 상태 위치를 정할 때 가장 먼저 고려해야 하는 기준은 무엇인가요?', '상태는 필요한 컴포넌트들이 공유할 수 있는 가장 가까운 공통 부모에 두는 것이 기본 판단 기준입니다.'),
        ('Next.js 14 제품 개발 실전', 'Next.js App Router에서 서버 컴포넌트와 클라이언트 컴포넌트의 역할 구분으로 맞는 것은 무엇인가요?', '서버 컴포넌트는 서버 데이터 조회와 렌더링에 강하고, 클라이언트 컴포넌트는 브라우저 상호작용 상태를 담당합니다.'),
        ('Flutter로 MVP 앱 출시하기', 'Flutter 화면을 구현할 때 상태 변경 범위를 줄이는 이유로 가장 적절한 것은 무엇인가요?', '상태 변경 범위를 좁히면 필요한 위젯만 다시 그리도록 설계할 수 있어 화면 관리가 단순해집니다.'),
        ('ChatGPT API와 RAG 서비스 만들기', 'RAG 파이프라인의 핵심 흐름으로 가장 적절한 것은 무엇인가요?', '문서를 검색 가능한 단위로 나누고 임베딩한 뒤, 검색 결과를 프롬프트에 넣어 답변을 생성합니다.'),
        ('SQL로 끝내는 데이터 분석 기본기', 'GROUP BY와 윈도우 함수의 차이로 가장 올바른 설명은 무엇인가요?', 'GROUP BY는 행을 그룹별 결과로 줄이고, 윈도우 함수는 원래 행을 유지하면서 집계 값을 함께 계산합니다.'),
        ('개발자 이력서와 기술 면접 패키지', '프로젝트 경험을 이력서 문장으로 바꿀 때 가장 좋은 방식은 무엇인가요?', '문제, 행동, 결과를 연결하고 가능한 경우 수치나 근거를 붙이면 경험의 설득력이 높아집니다.')
)
SELECT
    q.quiz_id,
    'MULTIPLE_CHOICE',
    seed.question_text,
    seed.explanation,
    10,
    2,
    NULL,
    FALSE,
    TIMESTAMP '2026-04-01 10:35:00',
    TIMESTAMP '2026-04-01 10:35:00'
FROM catalog_quiz_question_seed seed
JOIN roadmap_nodes rn ON rn.sub_topics = seed.course_title
                     AND rn.node_type = 'QUIZ'
                     AND rn.title LIKE '[CATALOG]%'
JOIN quizzes q ON q.node_id = rn.node_id
WHERE NOT EXISTS (
    SELECT 1
    FROM quiz_questions qq
    WHERE qq.quiz_id = q.quiz_id
      AND qq.display_order = 2
);

INSERT INTO quiz_question_options (
    question_id, option_text, is_correct, display_order,
    is_deleted, created_at, updated_at
)
WITH catalog_quiz_option_seed(course_title, option_text, is_correct, display_order) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문', 'HTTP 요청과 응답을 받고 Service로 비즈니스 흐름을 위임한다', TRUE, 1),
        ('실무 Spring Boot 백엔드 입문', '데이터베이스 테이블을 직접 생성하고 인덱스를 관리한다', FALSE, 2),
        ('실무 Spring Boot 백엔드 입문', 'JVM 메모리 영역을 직접 할당하고 해제한다', FALSE, 3),
        ('실무 Spring Boot 백엔드 입문', '프론트엔드 화면 상태를 렌더링한다', FALSE, 4),
        ('Docker & Kubernetes 운영 실전', '이미지는 실행 템플릿이고 컨테이너는 실행된 인스턴스이다', TRUE, 1),
        ('Docker & Kubernetes 운영 실전', '컨테이너는 이미지를 만들기 전 반드시 먼저 존재해야 한다', FALSE, 2),
        ('Docker & Kubernetes 운영 실전', '이미지는 실행 중인 프로세스 하나만 의미한다', FALSE, 3),
        ('Docker & Kubernetes 운영 실전', '이미지와 컨테이너는 항상 같은 ID를 가진다', FALSE, 4),
        ('React 19 프론트엔드 실전 가이드', '상태를 필요한 컴포넌트들의 가장 가까운 공통 부모에 둔다', TRUE, 1),
        ('React 19 프론트엔드 실전 가이드', '모든 상태를 전역 저장소에만 둔다', FALSE, 2),
        ('React 19 프론트엔드 실전 가이드', '하위 컴포넌트마다 같은 상태를 복사해서 둔다', FALSE, 3),
        ('React 19 프론트엔드 실전 가이드', '상태 위치는 렌더링 결과와 무관하므로 임의로 정한다', FALSE, 4),
        ('Next.js 14 제품 개발 실전', '서버 컴포넌트는 서버 데이터 조회에, 클라이언트 컴포넌트는 상호작용 상태에 사용한다', TRUE, 1),
        ('Next.js 14 제품 개발 실전', '모든 컴포넌트에 use client를 붙여야 App Router가 동작한다', FALSE, 2),
        ('Next.js 14 제품 개발 실전', '서버 컴포넌트는 브라우저 클릭 이벤트를 직접 처리한다', FALSE, 3),
        ('Next.js 14 제품 개발 실전', '클라이언트 컴포넌트는 절대 props를 받을 수 없다', FALSE, 4),
        ('Flutter로 MVP 앱 출시하기', '상태 변경 범위를 좁혀 필요한 위젯만 다시 그리도록 설계한다', TRUE, 1),
        ('Flutter로 MVP 앱 출시하기', '모든 입력값을 하나의 전역 변수에 저장한다', FALSE, 2),
        ('Flutter로 MVP 앱 출시하기', '빌드 메서드 안에서 네트워크 요청을 무조건 반복 실행한다', FALSE, 3),
        ('Flutter로 MVP 앱 출시하기', '위젯 트리는 상태 관리와 관계가 없다', FALSE, 4),
        ('ChatGPT API와 RAG 서비스 만들기', '문서를 청킹하고 임베딩한 뒤 검색 결과를 프롬프트에 넣어 답변을 생성한다', TRUE, 1),
        ('ChatGPT API와 RAG 서비스 만들기', '모든 문서를 한 번에 프롬프트에 넣고 토큰 제한은 고려하지 않는다', FALSE, 2),
        ('ChatGPT API와 RAG 서비스 만들기', '검색 단계 없이 항상 모델 파라미터만 늘린다', FALSE, 3),
        ('ChatGPT API와 RAG 서비스 만들기', '임베딩은 사용자 로그인 토큰을 암호화하는 절차다', FALSE, 4),
        ('SQL로 끝내는 데이터 분석 기본기', 'GROUP BY는 행을 줄이고 윈도우 함수는 행을 유지한 채 계산한다', TRUE, 1),
        ('SQL로 끝내는 데이터 분석 기본기', 'GROUP BY와 윈도우 함수는 항상 완전히 같은 결과를 만든다', FALSE, 2),
        ('SQL로 끝내는 데이터 분석 기본기', '윈도우 함수는 SELECT 문에서 사용할 수 없다', FALSE, 3),
        ('SQL로 끝내는 데이터 분석 기본기', 'GROUP BY는 정렬만 수행하고 집계는 하지 않는다', FALSE, 4),
        ('개발자 이력서와 기술 면접 패키지', '문제, 행동, 결과를 연결하고 수치나 근거를 함께 적는다', TRUE, 1),
        ('개발자 이력서와 기술 면접 패키지', '사용한 기술 이름만 길게 나열한다', FALSE, 2),
        ('개발자 이력서와 기술 면접 패키지', '팀 프로젝트에서 본인의 역할을 일부러 숨긴다', FALSE, 3),
        ('개발자 이력서와 기술 면접 패키지', '결과나 배운 점 없이 기능 목록만 적는다', FALSE, 4)
)
SELECT
    qq.question_id,
    seed.option_text,
    seed.is_correct,
    seed.display_order,
    FALSE,
    TIMESTAMP '2026-04-01 10:40:00',
    TIMESTAMP '2026-04-01 10:40:00'
FROM catalog_quiz_option_seed seed
JOIN roadmap_nodes rn ON rn.sub_topics = seed.course_title
                     AND rn.node_type = 'QUIZ'
                     AND rn.title LIKE '[CATALOG]%'
JOIN quizzes q ON q.node_id = rn.node_id
JOIN quiz_questions qq ON qq.quiz_id = q.quiz_id
                       AND qq.display_order = 2
WHERE NOT EXISTS (
    SELECT 1
    FROM quiz_question_options qo
    WHERE qo.question_id = qq.question_id
      AND qo.display_order = seed.display_order
);

INSERT INTO assignments (
    node_id, title, description, submission_type, due_at, allowed_file_formats,
    readme_required, test_required, lint_required, submission_rule_description,
    total_score, pass_score, is_published, is_active, allow_late_submission,
    ai_review_enabled, allow_text_submission,
    allow_file_submission, allow_url_submission, is_deleted, created_at, updated_at
)
SELECT
    rn.node_id,
    rn.sub_topics || ' 섹션 실습 과제',
    rn.content,
    'MULTIPLE',
    TIMESTAMP '2026-05-31 23:59:59',
    'md,pdf,zip,github-url',
    TRUE,
    FALSE,
    FALSE,
    'GitHub URL, 실행 방법, 결과 캡처 또는 요약 문서를 함께 제출하세요.',
    100,
    70,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TIMESTAMP '2026-04-01 10:35:00',
    TIMESTAMP '2026-04-01 10:35:00'
FROM roadmap_nodes rn
WHERE rn.title LIKE '[CATALOG]%'
  AND rn.node_type = 'ASSIGNMENT'
  AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.node_id = rn.node_id);

INSERT INTO assignment_rubrics (
    assignment_id, criteria_name, criteria_description, max_points,
    display_order, is_deleted, created_at, updated_at
)
SELECT
    a.assignment_id,
    '요구사항 완성도',
    '섹션에서 요구한 핵심 기능과 산출물이 실행 가능한 형태로 제출되었습니다.',
    60,
    1,
    FALSE,
    TIMESTAMP '2026-04-01 10:40:00',
    TIMESTAMP '2026-04-01 10:40:00'
FROM assignments a
JOIN roadmap_nodes rn ON rn.node_id = a.node_id
WHERE rn.title LIKE '[CATALOG]%'
  AND NOT EXISTS (
      SELECT 1 FROM assignment_rubrics ar
      WHERE ar.assignment_id = a.assignment_id AND ar.display_order = 1
  );

INSERT INTO assignment_rubrics (
    assignment_id, criteria_name, criteria_description, max_points,
    display_order, is_deleted, created_at, updated_at
)
SELECT
    a.assignment_id,
    '문서화와 회고',
    '실행 방법, 판단 이유, 막힌 지점과 해결 과정을 README 또는 제출 문서에 정리했습니다.',
    40,
    2,
    FALSE,
    TIMESTAMP '2026-04-01 10:40:00',
    TIMESTAMP '2026-04-01 10:40:00'
FROM assignments a
JOIN roadmap_nodes rn ON rn.node_id = a.node_id
WHERE rn.title LIKE '[CATALOG]%'
  AND NOT EXISTS (
      SELECT 1 FROM assignment_rubrics ar
      WHERE ar.assignment_id = a.assignment_id AND ar.display_order = 2
  );

INSERT INTO course_announcements (
    course_id, announcement_type, title, content, is_pinned, display_order,
    published_at, exposure_start_at, exposure_end_at,
    event_banner_text, event_link, created_at, updated_at
)
WITH announcement_seed(course_title) AS (
    VALUES
        ('실무 Spring Boot 백엔드 입문'),
        ('Docker & Kubernetes 운영 실전'),
        ('React 19 프론트엔드 실전 가이드'),
        ('Next.js 14 제품 개발 실전'),
        ('Flutter로 MVP 앱 출시하기'),
        ('ChatGPT API와 RAG 서비스 만들기'),
        ('SQL로 끝내는 데이터 분석 기본기'),
        ('개발자 이력서와 기술 면접 패키지')
)
SELECT
    c.course_id,
    'NORMAL',
    a.course_title || ' 커리큘럼 업데이트',
    '섹션별 마지막 점검 활동과 실습 자료를 포함해 공개했습니다.',
    FALSE,
    1,
    TIMESTAMP '2026-04-09 09:00:00',
    TIMESTAMP '2026-04-09 09:00:00',
    NULL,
    NULL,
    NULL,
    TIMESTAMP '2026-04-09 09:00:00',
    TIMESTAMP '2026-04-09 09:00:00'
FROM announcement_seed a
JOIN courses c ON c.title = a.course_title
WHERE NOT EXISTS (
    SELECT 1 FROM course_announcements ca
    WHERE ca.course_id = c.course_id
      AND ca.title = a.course_title || ' 커리큘럼 업데이트'
);

-- ============================================================
-- BACKEND ROADMAP VIDEO CATALOG: 각 노드별 공개 영상 코스 추가
-- ============================================================
DROP TABLE IF EXISTS tmp_backend_roadmap_video_seed;

CREATE TABLE tmp_backend_roadmap_video_seed (
    node_title VARCHAR(255) NOT NULL,
    instructor_email VARCHAR(255) NOT NULL,
    difficulty_level VARCHAR(30) NOT NULL,
    published_at TIMESTAMP NOT NULL,
    thumbnail_url VARCHAR(1000) NOT NULL
);

INSERT INTO tmp_backend_roadmap_video_seed (
    node_title, instructor_email, difficulty_level, published_at, thumbnail_url
)
VALUES
    ('인터넷 & 웹 기초', 'frontend@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-02 09:00:00', 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?auto=format&fit=crop&w=1200&q=80'),
    ('OS & 터미널', 'instructor@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-03 09:00:00', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'),
    ('Java 기초', 'instructor@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-04 09:00:00', 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80'),
    ('Git & 버전 관리', 'frontend@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-05 09:00:00', 'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1200&q=80'),
    ('RDB & SQL', 'data@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-06 09:00:00', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80'),
    ('REST API 설계', 'frontend@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-07 09:00:00', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'),
    ('Spring Boot & MVC', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-08 09:00:00', 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1200&q=80'),
    ('Spring Data JPA', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-09 09:00:00', 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1200&q=80'),
    ('Redis 기초', 'data@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-10 09:00:00', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'),
    ('Redis 심화', 'data@devpath.com', 'ADVANCED', TIMESTAMP '2026-03-11 09:00:00', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80'),
    ('JUnit5 & Mockito', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-12 09:00:00', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80'),
    ('Spring Boot 테스트', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-13 09:00:00', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'),
    ('Spring Security & JWT', 'instructor@devpath.com', 'ADVANCED', TIMESTAMP '2026-03-14 09:00:00', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'),
    ('Docker & CI/CD', 'data@devpath.com', 'ADVANCED', TIMESTAMP '2026-03-15 09:00:00', 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80'),
    ('SOLID & 디자인패턴', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-16 09:00:00', 'https://images.unsplash.com/photo-1517148815978-75f6acaaf32c?auto=format&fit=crop&w=1200&q=80'),
    ('웹 보안 기초', 'frontend@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-17 09:00:00', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80'),
    ('메시지 큐 & MSA', 'data@devpath.com', 'ADVANCED', TIMESTAMP '2026-03-18 09:00:00', 'https://images.unsplash.com/photo-1522252234503-e356532cafd5?auto=format&fit=crop&w=1200&q=80');

INSERT INTO courses (
    instructor_id, title, subtitle, description,
    thumbnail_url, intro_video_url, video_asset_key, duration_seconds,
    price, original_price, currency, difficulty_level, language,
    has_certificate, status, published_at
)
SELECT
    u.user_id,
    '로드맵 실전: ' || seed.node_title,
    seed.node_title || ' | ' || COALESCE(rn.sub_topics, '핵심 개념 정리'),
    rn.content || ' 필수 태그: ' || COALESCE(rn.sub_topics, seed.node_title)
        || '. 강의에서는 로드맵에서 요구하는 필수 태그를 실제 서비스 예제와 연결해 빠르게 정리합니다.',
    seed.thumbnail_url,
    CASE
        WHEN seed.node_title = 'OS & 터미널' THEN '/samples/lesson-os-process.mp4'
        WHEN seed.node_title IN ('Spring Boot & MVC', 'Spring Data JPA', 'Spring Boot 테스트', 'Spring Security & JWT')
            THEN '/samples/lesson-spring-di.mp4'
        ELSE '/samples/sample-intro.mp4'
    END,
    NULL,
    CASE seed.difficulty_level
        WHEN 'BEGINNER' THEN 7200
        WHEN 'INTERMEDIATE' THEN 9600
        ELSE 11400
    END,
    0,
    0,
    'KRW',
    seed.difficulty_level,
    'ko',
    TRUE,
    'PUBLISHED',
    seed.published_at
FROM tmp_backend_roadmap_video_seed seed
JOIN users u ON u.email = seed.instructor_email
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.title = seed.node_title
WHERE NOT EXISTS (
    SELECT 1
    FROM courses c
    WHERE c.title = '로드맵 실전: ' || seed.node_title
);

UPDATE courses c
SET
    price = 0,
    original_price = 0,
    currency = 'KRW',
    thumbnail_url = seed.thumbnail_url
FROM tmp_backend_roadmap_video_seed seed
WHERE c.title = '로드맵 실전: ' || seed.node_title
  AND (
      COALESCE(c.price, -1) <> 0
      OR COALESCE(c.original_price, -1) <> 0
      OR COALESCE(c.currency, '') <> 'KRW'
      OR COALESCE(c.thumbnail_url, '') <> seed.thumbnail_url
  );

INSERT INTO course_prerequisites (course_id, prerequisite)
WITH prerequisite_seed(prerequisite_text, display_order) AS (
    VALUES
        ('백엔드 로드맵의 앞선 개념을 함께 보면 이해가 더 빠릅니다.', 1),
        ('기본적인 IDE 또는 터미널 사용 경험이 있으면 예제를 따라가기 쉽습니다.', 2)
)
SELECT c.course_id, ps.prerequisite_text
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN prerequisite_seed ps ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_prerequisites cp
    WHERE cp.course_id = c.course_id
      AND cp.prerequisite = ps.prerequisite_text
);

INSERT INTO course_job_relevance (course_id, job_relevance)
WITH relevance_seed(job_relevance, display_order) AS (
    VALUES
        ('백엔드 개발자', 1),
        ('서버 개발자', 2)
)
SELECT c.course_id, rs.job_relevance
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN relevance_seed rs ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_job_relevance cj
    WHERE cj.course_id = c.course_id
      AND cj.job_relevance = rs.job_relevance
);

INSERT INTO course_objectives (course_id, objective_text, display_order)
WITH objective_seed(display_order) AS (
    VALUES (1), (2)
)
SELECT
    c.course_id,
    CASE os.display_order
        WHEN 1 THEN seed.node_title || '의 핵심 개념과 요청/데이터 흐름을 설명할 수 있습니다.'
        ELSE '로드맵에서 요구하는 필수 태그를 예제와 연결해 실제 코드나 운영 흐름에 적용할 수 있습니다.'
    END,
    os.display_order
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN objective_seed os ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_objectives co
    WHERE co.course_id = c.course_id
      AND co.display_order = os.display_order
);

INSERT INTO course_target_audiences (course_id, audience_description, display_order)
WITH audience_seed(display_order) AS (
    VALUES (1), (2)
)
SELECT
    c.course_id,
    CASE ads.display_order
        WHEN 1 THEN seed.node_title || '를 실무 기준으로 다시 정리하고 싶은 백엔드 학습자'
        ELSE 'Backend Master Roadmap에서 해당 노드가 막혀 보강 영상이 필요한 주니어 개발자'
    END,
    ads.display_order
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN audience_seed ads ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_target_audiences cta
    WHERE cta.course_id = c.course_id
      AND cta.display_order = ads.display_order
);

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT
    c.course_id,
    nrt.tag_id,
    CASE seed.difficulty_level
        WHEN 'BEGINNER' THEN 2
        ELSE 3
    END
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.title = seed.node_title
JOIN node_required_tags nrt ON nrt.node_id = rn.node_id
WHERE NOT EXISTS (
    SELECT 1
    FROM course_tag_maps ctm
    WHERE ctm.course_id = c.course_id
      AND ctm.tag_id = nrt.tag_id
);

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
WITH section_seed(sort_order) AS (
    VALUES (1), (2)
)
SELECT
    c.course_id,
    CASE ss.sort_order
        WHEN 1 THEN seed.node_title || ' 핵심 개념'
        ELSE seed.node_title || ' 실전 적용'
    END,
    CASE ss.sort_order
        WHEN 1 THEN seed.node_title || ' 노드에서 반드시 이해해야 할 개념과 용어를 짧은 예제로 정리합니다.'
        ELSE seed.node_title || '를 실제 서비스 흐름과 운영 체크포인트에 연결합니다.'
    END,
    ss.sort_order,
    TRUE
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN section_seed ss ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_sections cs
    WHERE cs.course_id = c.course_id
      AND cs.sort_order = ss.sort_order
);

INSERT INTO lessons (
    section_id, title, description, lesson_type,
    video_url, video_asset_key, video_provider,
    thumbnail_url, duration_seconds, is_preview, is_published, sort_order
)
WITH lesson_seed(section_order, lesson_order, title_suffix, description_body, video_url, duration_seconds, is_preview) AS (
    VALUES
        (1, 1, '개념 지도', '핵심 개념과 전체 흐름을 먼저 잡습니다.', '/samples/sample-intro.mp4', 780, TRUE),
        (1, 2, '필수 태그 해설', '로드맵 필수 태그를 예제와 함께 설명합니다.', '/samples/ocr-code-demo.mp4', 900, FALSE),
        (2, 1, '실무 시나리오', '실제 서비스나 운영 상황에서 어떻게 연결되는지 살펴봅니다.', '/samples/lesson-spring-di.mp4', 840, FALSE),
        (2, 2, '체크리스트와 흔한 실수', '자주 놓치는 포인트와 점검 순서를 정리합니다.', '/samples/lesson-os-context.mp4', 960, FALSE)
)
SELECT
    cs.section_id,
    seed.node_title || ' ' || ls.title_suffix,
    seed.node_title || ' 학습을 위해 ' || ls.description_body,
    'VIDEO',
    CASE
        WHEN seed.node_title = 'OS & 터미널' AND ls.section_order = 1 AND ls.lesson_order = 1
            THEN '/samples/lesson-os-process.mp4'
        WHEN seed.node_title = 'OS & 터미널' AND ls.section_order = 1 AND ls.lesson_order = 2
            THEN '/samples/lesson-os-thread.mp4'
        WHEN seed.node_title = 'OS & 터미널'
            THEN '/samples/lesson-os-context.mp4'
        WHEN seed.node_title IN ('Spring Boot & MVC', 'Spring Data JPA', 'Spring Boot 테스트', 'Spring Security & JWT')
            AND ls.section_order = 1
            THEN '/samples/lesson-spring-di.mp4'
        WHEN seed.node_title IN ('Spring Boot & MVC', 'Spring Data JPA', 'Spring Boot 테스트', 'Spring Security & JWT')
            THEN '/samples/lesson-spring-bean.mp4'
        ELSE ls.video_url
    END,
    NULL,
    NULL,
    c.thumbnail_url,
    ls.duration_seconds,
    ls.is_preview,
    TRUE,
    ls.lesson_order
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN lesson_seed ls ON 1 = 1
JOIN course_sections cs ON cs.course_id = c.course_id AND cs.sort_order = ls.section_order
WHERE NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.section_id = cs.section_id
      AND l.sort_order = ls.lesson_order
);

-- 로드맵 실전: Git & 버전 관리 강의는 OCR 실습 영상과 섹션 평가/과제를 고정 연결한다.
UPDATE courses
SET intro_video_url = '/samples/ocr-code-demo.mp4',
    video_asset_key = NULL,
    updated_at = TIMESTAMP '2026-04-30 09:00:00'
WHERE title = '로드맵 실전: Git & 버전 관리'
  AND (
      COALESCE(intro_video_url, '') <> '/samples/ocr-code-demo.mp4'
      OR video_asset_key IS NOT NULL
  );

UPDATE lessons l
SET video_url = '/samples/ocr-code-demo.mp4',
    video_asset_key = NULL,
    video_provider = NULL
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE l.section_id = cs.section_id
  AND c.title = '로드맵 실전: Git & 버전 관리'
  AND l.lesson_type = 'VIDEO'
  AND (
      COALESCE(l.video_url, '') <> '/samples/ocr-code-demo.mp4'
      OR l.video_asset_key IS NOT NULL
      OR l.video_provider IS NOT NULL
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
WITH git_activity_nodes(course_title, section_order, activity_kind, node_title, node_content, sort_order) AS (
    VALUES
        (
            '로드맵 실전: Git & 버전 관리',
            1,
            'QUIZ',
            '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 1 QUIZ',
            '커밋 단위, 브랜치 전략, Pull Request 리뷰 흐름을 확인하는 섹션 1 마무리 퀴즈입니다.',
            1081
        ),
        (
            '로드맵 실전: Git & 버전 관리',
            2,
            'ASSIGNMENT',
            '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 2 ASSIGNMENT',
            'feature 브랜치 생성부터 커밋 메시지, PR 본문, 리뷰 체크리스트까지 Git 협업 흐름을 문서로 정리하는 과제입니다.',
            1082
        )
)
SELECT
    r.roadmap_id,
    gan.node_title,
    gan.node_content,
    gan.activity_kind,
    gan.sort_order,
    gan.course_title,
    gan.section_order
FROM git_activity_nodes gan
JOIN roadmaps r ON r.title = 'DevPath 공개 강의 평가 데이터'
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes rn
    WHERE rn.title = gan.node_title
);

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT c.course_id, rn.node_id, TIMESTAMP '2026-04-30 09:05:00'
FROM courses c
JOIN roadmap_nodes rn ON rn.sub_topics = c.title
WHERE c.title = '로드맵 실전: Git & 버전 관리'
  AND rn.title IN (
      '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 1 QUIZ',
      '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 2 ASSIGNMENT'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM course_node_mappings cnm
      WHERE cnm.course_id = c.course_id
        AND cnm.node_id = rn.node_id
  );

INSERT INTO lessons (
    section_id, title, description, lesson_type, video_url, video_asset_key, video_provider,
    thumbnail_url, duration_seconds, is_preview, is_published, sort_order, quiz_node_id
)
SELECT
    cs.section_id,
    '섹션 마무리 퀴즈: Git 협업 흐름 점검',
    '커밋 단위, 브랜치 전략, Pull Request 리뷰 목적을 확인하는 섹션 1 퀴즈입니다.',
    'READING',
    NULL,
    NULL,
    NULL,
    c.thumbnail_url,
    300,
    FALSE,
    TRUE,
    3,
    rn.node_id
FROM courses c
JOIN course_sections cs ON cs.course_id = c.course_id AND cs.sort_order = 1
JOIN roadmap_nodes rn ON rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 1 QUIZ'
WHERE c.title = '로드맵 실전: Git & 버전 관리'
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.sort_order = 3
        AND l.title = '섹션 마무리 퀴즈: Git 협업 흐름 점검'
  );

UPDATE lessons l
SET quiz_node_id = rn.node_id
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
JOIN roadmap_nodes rn ON rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 1 QUIZ'
WHERE l.section_id = cs.section_id
  AND c.title = '로드맵 실전: Git & 버전 관리'
  AND cs.sort_order = 1
  AND l.sort_order = 3
  AND l.title = '섹션 마무리 퀴즈: Git 협업 흐름 점검'
  AND l.quiz_node_id IS NULL;

INSERT INTO lessons (
    section_id, title, description, lesson_type, video_url, video_asset_key, video_provider,
    thumbnail_url, duration_seconds, is_preview, is_published, sort_order, assignment_node_id
)
SELECT
    cs.section_id,
    '실습 과제: Git 브랜치 전략과 PR 회고',
    '기능 브랜치, 커밋 메시지, PR 본문, 리뷰 체크리스트를 하나의 협업 흐름으로 정리해 제출합니다.',
    'CODING',
    NULL,
    NULL,
    NULL,
    c.thumbnail_url,
    900,
    FALSE,
    TRUE,
    3,
    rn.node_id
FROM courses c
JOIN course_sections cs ON cs.course_id = c.course_id AND cs.sort_order = 2
JOIN roadmap_nodes rn ON rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 2 ASSIGNMENT'
WHERE c.title = '로드맵 실전: Git & 버전 관리'
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.sort_order = 3
        AND l.title = '실습 과제: Git 브랜치 전략과 PR 회고'
  );

UPDATE lessons l
SET assignment_node_id = rn.node_id
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
JOIN roadmap_nodes rn ON rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 2 ASSIGNMENT'
WHERE l.section_id = cs.section_id
  AND c.title = '로드맵 실전: Git & 버전 관리'
  AND cs.sort_order = 2
  AND l.sort_order = 3
  AND l.title = '실습 과제: Git 브랜치 전략과 PR 회고'
  AND l.assignment_node_id IS NULL;

INSERT INTO quizzes (
    node_id, title, description, quiz_type, total_score, pass_score,
    time_limit_minutes, is_published, is_active, expose_answer,
    expose_explanation, is_deleted, created_at, updated_at
)
SELECT
    rn.node_id,
    'Git 브랜치와 PR 흐름 점검 퀴즈',
    '커밋 단위, 브랜치 전략, Pull Request 리뷰 흐름을 확인하는 섹션 1 마무리 퀴즈입니다.',
    'MANUAL',
    10,
    7,
    10,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TIMESTAMP '2026-04-30 09:10:00',
    TIMESTAMP '2026-04-30 09:10:00'
FROM roadmap_nodes rn
WHERE rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 1 QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quizzes q
      WHERE q.node_id = rn.node_id
  );

INSERT INTO quiz_questions (
    quiz_id, question_type, question_text, explanation, points,
    display_order, source_timestamp, is_deleted, created_at, updated_at
)
SELECT
    q.quiz_id,
    'MULTIPLE_CHOICE',
    'Git 협업에서 Pull Request를 여는 가장 적절한 목적은 무엇인가요?',
    'PR은 기능 브랜치의 변경 내용을 공유하고 리뷰와 자동 검증을 거쳐 안전하게 기본 브랜치에 병합하기 위한 절차입니다.',
    10,
    1,
    NULL,
    FALSE,
    TIMESTAMP '2026-04-30 09:15:00',
    TIMESTAMP '2026-04-30 09:15:00'
FROM quizzes q
JOIN roadmap_nodes rn ON rn.node_id = q.node_id
WHERE rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 1 QUIZ'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_questions qq
      WHERE qq.quiz_id = q.quiz_id
        AND qq.display_order = 1
  );

INSERT INTO quiz_question_options (
    question_id, option_text, is_correct, display_order,
    is_deleted, created_at, updated_at
)
WITH git_quiz_option_seed(option_text, is_correct, display_order) AS (
    VALUES
        ('변경 내용을 리뷰하고 자동 검증을 통과한 뒤 병합하기 위해서', TRUE, 1),
        ('로컬 커밋 기록을 모두 삭제하기 위해서', FALSE, 2),
        ('원격 저장소 연결 없이 브랜치를 만들기 위해서', FALSE, 3),
        ('충돌이 발생하지 않도록 Git 사용을 중단하기 위해서', FALSE, 4)
)
SELECT
    qq.question_id,
    seed.option_text,
    seed.is_correct,
    seed.display_order,
    FALSE,
    TIMESTAMP '2026-04-30 09:20:00',
    TIMESTAMP '2026-04-30 09:20:00'
FROM git_quiz_option_seed seed
JOIN roadmap_nodes rn ON rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 1 QUIZ'
JOIN quizzes q ON q.node_id = rn.node_id
JOIN quiz_questions qq ON qq.quiz_id = q.quiz_id AND qq.display_order = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM quiz_question_options qo
    WHERE qo.question_id = qq.question_id
      AND qo.display_order = seed.display_order
);

INSERT INTO assignments (
    node_id, title, description, submission_type, due_at, allowed_file_formats,
    readme_required, test_required, lint_required, submission_rule_description,
    total_score, pass_score, is_published, is_active, allow_late_submission,
    ai_review_enabled, allow_text_submission,
    allow_file_submission, allow_url_submission, is_deleted, created_at, updated_at
)
SELECT
    rn.node_id,
    'Git 브랜치 전략과 PR 회고 과제',
    '기능 개발 흐름을 가정해 feature 브랜치를 만들고 의미 있는 커밋 단위로 변경 이력을 구성한 뒤, PR 설명과 충돌 해결/리뷰 체크리스트를 README로 정리합니다. 실제 코드를 작성하지 않아도 브랜치명, 커밋 메시지, PR 본문 예시가 포함되어야 합니다.',
    'MULTIPLE',
    TIMESTAMP '2026-05-31 23:59:59',
    'md,pdf,zip,github-url',
    TRUE,
    FALSE,
    FALSE,
    'GitHub 저장소 URL 또는 README 파일을 제출하세요. README에는 브랜치 전략, 커밋 메시지 3개 이상, PR 본문, 리뷰 체크리스트, 충돌 발생 시 해결 절차를 포함해야 합니다.',
    100,
    70,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TIMESTAMP '2026-04-30 09:25:00',
    TIMESTAMP '2026-04-30 09:25:00'
FROM roadmap_nodes rn
WHERE rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 2 ASSIGNMENT'
  AND NOT EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.node_id = rn.node_id
  );

INSERT INTO assignment_rubrics (
    assignment_id, criteria_name, criteria_description, max_points,
    display_order, is_deleted, created_at, updated_at
)
WITH git_assignment_rubric_seed(criteria_name, criteria_description, max_points, display_order) AS (
    VALUES
        ('Git 작업 흐름 구성', 'feature 브랜치 생성, 의미 있는 커밋 단위, PR 생성 흐름이 실제 협업 흐름에 맞게 정리되었습니다.', 40, 1),
        ('PR 설명과 리뷰 체크리스트', '변경 목적, 테스트/검증 방법, 리뷰어가 확인해야 할 항목을 PR 본문 형식으로 구체화했습니다.', 35, 2),
        ('충돌 해결과 회고', '충돌이 발생했을 때의 해결 순서와 브랜치 전략을 적용하며 배운 점을 정리했습니다.', 25, 3)
)
SELECT
    a.assignment_id,
    seed.criteria_name,
    seed.criteria_description,
    seed.max_points,
    seed.display_order,
    FALSE,
    TIMESTAMP '2026-04-30 09:30:00',
    TIMESTAMP '2026-04-30 09:30:00'
FROM git_assignment_rubric_seed seed
JOIN roadmap_nodes rn ON rn.title = '[ROADMAP COURSE] 로드맵 실전: Git & 버전 관리 - 2 ASSIGNMENT'
JOIN assignments a ON a.node_id = rn.node_id
WHERE NOT EXISTS (
    SELECT 1
    FROM assignment_rubrics ar
    WHERE ar.assignment_id = a.assignment_id
      AND ar.display_order = seed.display_order
);

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT
    c.course_id,
    rn.node_id,
    seed.published_at
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.title = seed.node_title
WHERE NOT EXISTS (
    SELECT 1
    FROM course_node_mappings cnm
    WHERE cnm.course_id = c.course_id
      AND cnm.node_id = rn.node_id
);

INSERT INTO roadmap_node_resources (
    node_id, title, url, description, source_type, sort_order, active, created_at, updated_at
)
SELECT
    rn.node_id,
    c.title,
    'course-detail.html?courseId=' || c.course_id,
    '필수 태그: ' || COALESCE(rn.sub_topics, seed.node_title)
        || '. ' || seed.node_title || ' 노드를 영상 중심으로 빠르게 보강할 수 있는 공개 강의입니다.',
    'COURSE',
    3,
    TRUE,
    seed.published_at,
    seed.published_at
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.title = seed.node_title
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_node_resources existing
    WHERE existing.node_id = rn.node_id
      AND existing.url = 'course-detail.html?courseId=' || c.course_id
);

INSERT INTO course_announcements (
    course_id, announcement_type, title, content, is_pinned, display_order,
    published_at, exposure_start_at, exposure_end_at,
    event_banner_text, event_link, created_at, updated_at
)
SELECT
    c.course_id,
    'NORMAL',
    seed.node_title || ' 로드맵 연동 가이드',
    '이 강의는 Backend Master Roadmap의 "' || seed.node_title || '" 노드와 직접 연결됩니다. '
        || '필수 태그: ' || COALESCE(rn.sub_topics, seed.node_title)
        || '. 노드 상세의 필수 태그를 먼저 확인하고 예제를 따라오면 더 빠르게 이해할 수 있습니다.',
    FALSE,
    1,
    seed.published_at,
    seed.published_at,
    NULL,
    NULL,
    NULL,
    seed.published_at,
    seed.published_at
FROM tmp_backend_roadmap_video_seed seed
JOIN courses c ON c.title = '로드맵 실전: ' || seed.node_title
JOIN roadmaps r ON r.title = 'Backend Master Roadmap'
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id AND rn.title = seed.node_title
WHERE NOT EXISTS (
    SELECT 1
    FROM course_announcements ca
    WHERE ca.course_id = c.course_id
      AND ca.title = seed.node_title || ' 로드맵 연동 가이드'
);

DROP TABLE IF EXISTS tmp_backend_roadmap_video_seed;

-- ============================================================
-- BACKEND ROADMAP TAG VIDEO CATALOG: 필수 태그 중심 공개 강의 추가
-- ============================================================
DROP TABLE IF EXISTS tmp_backend_tag_video_tag_seed;
DROP TABLE IF EXISTS tmp_backend_tag_video_seed;

CREATE TABLE tmp_backend_tag_video_seed (
    course_title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    tag_summary VARCHAR(500) NOT NULL,
    instructor_email VARCHAR(255) NOT NULL,
    difficulty_level VARCHAR(30) NOT NULL,
    published_at TIMESTAMP NOT NULL,
    thumbnail_url VARCHAR(1000) NOT NULL,
    intro_video_url VARCHAR(255) NOT NULL
);

CREATE TABLE tmp_backend_tag_video_tag_seed (
    course_title VARCHAR(255) NOT NULL,
    tag_name VARCHAR(255) NOT NULL
);

INSERT INTO tmp_backend_tag_video_seed (
    course_title, subtitle, description, tag_summary,
    instructor_email, difficulty_level, published_at, thumbnail_url, intro_video_url
)
VALUES
    ('HTTP 요청/응답, 메서드, 상태코드', 'HTTP 규칙을 빠르게 잡는 백엔드 통신 기본기', 'HTTP 요청 라인, 헤더, 바디, 메서드, 상태코드를 예제로 풀어보고 클라이언트와 서버가 어떤 기준으로 응답을 해석하는지 정리합니다.', 'HTTP, HTTP 메서드, HTTP 상태코드', 'frontend@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-19 09:00:00', 'https://picsum.photos/seed/devpath-backend-http-status/1200/675', '/samples/sample-intro.mp4'),
    ('DNS, 도메인, 웹 호스팅 입문', '주소 입력부터 서버 도착까지 이해하는 네트워크 시작점', '도메인이 DNS 조회를 거쳐 실제 서버 IP로 연결되고, 웹 호스팅 환경에서 요청이 어떤 서버로 전달되는지 흐름 중심으로 설명합니다.', 'DNS, 도메인, 웹 호스팅', 'frontend@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-20 09:00:00', 'https://picsum.photos/seed/devpath-backend-dns-hosting/1200/675', '/samples/sample-intro.mp4'),
    ('브라우저 요청 흐름과 HTTP 응답 구조', '브라우저가 서버와 통신하는 전체 그림 정리', '브라우저가 URL을 해석하고 요청을 보내며 응답을 렌더링하기까지 어떤 단계와 기준을 거치는지 백엔드 관점에서 정리합니다.', '브라우저, HTTP', 'frontend@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-21 09:00:00', 'https://picsum.photos/seed/devpath-backend-browser-http/1200/675', '/samples/sample-intro.mp4'),
    ('Linux 프로세스와 스레드 관리', '운영체제에서 애플리케이션 실행 단위를 이해하는 강의', '프로세스와 스레드의 차이, 스케줄링 관점, 장애 상황에서 어떤 정보를 먼저 봐야 하는지 터미널 예제와 함께 설명합니다.', 'Linux, 프로세스 관리, 스레드', 'instructor@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-22 09:00:00', 'https://picsum.photos/seed/devpath-backend-linux-process-thread/1200/675', '/samples/lesson-os-process.mp4'),
    ('Linux 메모리 관리와 I/O 관리', '메모리와 디스크/네트워크 I/O를 같이 보는 운영 기본기', '메모리 사용량, 파일 디스크립터, 디스크와 네트워크 I/O 병목을 확인하는 방법을 예시 로그와 함께 정리합니다.', 'Linux, 메모리 관리, I/O 관리', 'instructor@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-23 09:00:00', 'https://picsum.photos/seed/devpath-backend-linux-memory-io/1200/675', '/samples/lesson-os-context.mp4'),
    ('Java OOP와 상속 설계', '객체 모델과 상속 구조를 코드 관점에서 다지는 기초', 'Java 클래스 설계, 캡슐화, 상속 구조, 다형성이 서비스 코드에 어떤 영향을 주는지 작은 예제로 설명합니다.', 'Java, OOP, 상속', 'instructor@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-24 09:00:00', 'https://picsum.photos/seed/devpath-backend-java-oop-inheritance/1200/675', '/samples/ocr-code-demo.mp4'),
    ('인터페이스, 제네릭, 컬렉션 실전', '타입 안정성과 재사용성을 높이는 Java 핵심 문법', '인터페이스 분리, 제네릭 타입 안정성, 컬렉션 사용 기준을 서비스 코드 예시와 함께 정리합니다.', '인터페이스, 제네릭, 컬렉션', 'instructor@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-25 09:00:00', 'https://picsum.photos/seed/devpath-backend-java-generic-collection/1200/675', '/samples/ocr-code-demo.mp4'),
    ('Git 브랜치 전략과 GitFlow', '혼자와 팀 작업 모두에 바로 쓰는 버전 관리 흐름', '브랜치 전략을 왜 나누는지부터 GitFlow를 언제 쓰고 언제 단순화할지까지 실제 개발 흐름에 맞춰 설명합니다.', 'Git, 브랜치 전략, GitFlow', 'frontend@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-26 09:00:00', 'https://picsum.photos/seed/devpath-backend-git-branch-flow/1200/675', '/samples/sample-intro.mp4'),
    ('Pull Request와 코드 리뷰 실무', '커밋 단위와 리뷰 포인트를 정리하는 협업 강의', 'Pull Request를 작게 쪼개는 기준, 리뷰 코멘트를 주고받는 방식, 충돌을 줄이는 협업 습관을 실무 관점에서 정리합니다.', 'Git, Pull Request, 코드 리뷰', 'frontend@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-27 09:00:00', 'https://picsum.photos/seed/devpath-backend-pr-review/1200/675', '/samples/sample-intro.mp4'),
    ('SQL JOIN과 서브쿼리 패턴', '조회 로직을 안정적으로 조합하는 관계형 쿼리 기본기', 'JOIN 종류별 차이와 서브쿼리를 어디까지 허용할지, 실무에서 읽기 쉬운 SQL을 만드는 기준을 예제로 정리합니다.', 'SQL, JOIN, 서브쿼리', 'data@devpath.com', 'BEGINNER', TIMESTAMP '2026-03-28 09:00:00', 'https://picsum.photos/seed/devpath-backend-sql-join-subquery/1200/675', '/samples/ocr-code-demo.mp4'),
    ('인덱스, 트랜잭션, PostgreSQL 성능 기본기', '데이터 정합성과 조회 성능을 함께 보는 SQL 심화 입문', '인덱스가 언제 효율적인지, 트랜잭션 격리와 롤백이 어떤 의미인지, PostgreSQL에서 어떤 지점을 먼저 점검해야 하는지 다룹니다.', '인덱스, 트랜잭션, PostgreSQL', 'data@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-29 09:00:00', 'https://picsum.photos/seed/devpath-backend-postgres-index-transaction/1200/675', '/samples/ocr-code-demo.mp4'),
    ('REST URI 설계와 HTTP 메서드', '리소스 중심 API 설계 감각을 만드는 강의', 'REST 스타일에 맞는 URI를 설계하고 HTTP 메서드를 일관되게 적용하는 기준을 실제 API 예제에 맞춰 설명합니다.', 'REST, URI 설계, HTTP 메서드', 'frontend@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-30 09:00:00', 'https://picsum.photos/seed/devpath-backend-rest-uri-method/1200/675', '/samples/sample-intro.mp4'),
    ('Swagger와 REST API 문서화', 'OpenAPI 문서를 실무에 맞게 정리하는 방법', 'Swagger UI와 OpenAPI 문서를 통해 상태코드, 요청 바디, 응답 스키마를 일관되게 관리하는 방식을 설명합니다.', 'Swagger, REST, HTTP 상태코드', 'frontend@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-03-31 09:00:00', 'https://picsum.photos/seed/devpath-backend-swagger-rest/1200/675', '/samples/sample-intro.mp4'),
    ('Spring Boot DI/IoC와 Spring Bean 등록 흐름', '객체 생성과 연결을 프레임워크에 맡기는 구조 이해', 'DI/IoC의 의미, Bean 등록 방식, 자동 주입이 실제 서비스 코드에서 어떻게 동작하는지 요청 흐름에 맞춰 설명합니다.', 'Spring Boot, DI/IoC, Spring Bean', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-01 09:00:00', 'https://picsum.photos/seed/devpath-backend-spring-di-bean/1200/675', '/samples/lesson-spring-di.mp4'),
    ('Spring MVC 요청 처리와 3계층 구조', 'Controller부터 Service, Repository까지 흐름 정리', 'DispatcherServlet 이후 요청이 어떤 순서로 처리되는지와 3계층 구조가 왜 유지보수에 유리한지 예제로 설명합니다.', 'Spring Boot, Spring MVC, 3계층 구조', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-02 09:00:00', 'https://picsum.photos/seed/devpath-backend-spring-mvc-layered/1200/675', '/samples/lesson-spring-bean.mp4'),
    ('JPA Entity 매핑과 JPQL 실전', 'ORM 기본기를 흔들리지 않게 잡는 데이터 접근 강의', 'Entity 매핑 규칙, 식별자 전략, JPQL이 SQL과 어떻게 다른지, 조회 코드가 어디서 복잡해지는지 실습 예제로 정리합니다.', 'JPA, Entity 매핑, JPQL', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-03 09:00:00', 'https://picsum.photos/seed/devpath-backend-jpa-entity-jpql/1200/675', '/samples/lesson-spring-di.mp4'),
    ('FetchType, N+1, QueryDSL 최적화', 'JPA 성능 이슈를 초기에 피하는 실무 포인트', 'FetchType 설정이 조회 성능에 어떤 영향을 주는지, N+1 문제를 어떻게 찾고 QueryDSL로 어떻게 풀어갈지 설명합니다.', 'FetchType, N+1 문제, QueryDSL', 'instructor@devpath.com', 'ADVANCED', TIMESTAMP '2026-04-04 09:00:00', 'https://picsum.photos/seed/devpath-backend-jpa-querydsl-performance/1200/675', '/samples/lesson-spring-bean.mp4'),
    ('Redis 자료구조, TTL, Spring Cache', '캐시 설계에 필요한 Redis 기초를 한 번에 정리', 'Redis 자료구조 선택 기준, TTL 설계, Spring Cache와 연결할 때 주의할 점을 백엔드 응답 속도 관점에서 설명합니다.', 'Redis, Redis 자료구조, Redis TTL, Spring Cache', 'data@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-05 09:00:00', 'https://picsum.photos/seed/devpath-backend-redis-ttl-cache/1200/675', '/samples/sample-intro.mp4'),
    ('Redis Session, Pub/Sub, 분산 락', '여러 서버가 상태를 공유할 때 필요한 Redis 심화 패턴', '세션 저장, 메시지 전달, 분산 락을 어떤 상황에서 쓰는지와 TTL 및 장애 대응을 어떻게 함께 고려할지 설명합니다.', 'Redis, Redis Session, Pub/Sub, 분산 락', 'data@devpath.com', 'ADVANCED', TIMESTAMP '2026-04-06 09:00:00', 'https://picsum.photos/seed/devpath-backend-redis-session-lock/1200/675', '/samples/sample-intro.mp4'),
    ('JUnit5와 Mockito 단위 테스트', '서비스 로직을 빠르게 검증하는 테스트 기본기', '테스트 생명주기, Assertion, Mock과 Stub, verify와 BDD 스타일을 통해 서비스 단위 테스트를 작성하는 흐름을 다룹니다.', 'JUnit5, Mockito, BDD, 단위 테스트', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-07 09:00:00', 'https://picsum.photos/seed/devpath-backend-junit-mockito/1200/675', '/samples/ocr-code-demo.mp4'),
    ('MockMvc와 Spring Boot 통합 테스트', '웹 계층과 애플리케이션 컨텍스트를 같이 검증하는 방법', 'MockMvc, 테스트 슬라이스, 통합 테스트, 커버리지 점검을 통해 단위 테스트만으로 놓치기 쉬운 흐름을 보강합니다.', 'Spring Boot, MockMvc, 통합 테스트, 테스트 커버리지', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-08 09:00:00', 'https://picsum.photos/seed/devpath-backend-mockmvc-integration/1200/675', '/samples/lesson-spring-di.mp4'),
    ('Spring Security 필터 체인과 JWT 인증', '인증과 인가 흐름을 필터 레벨에서 이해하는 강의', 'SecurityFilterChain 안에서 인증이 어떻게 처리되는지, JWT 검증과 권한 체크가 어떤 순서로 일어나는지 설명합니다.', 'Spring Security, JWT', 'instructor@devpath.com', 'ADVANCED', TIMESTAMP '2026-04-09 09:00:00', 'https://picsum.photos/seed/devpath-backend-security-jwt/1200/675', '/samples/lesson-spring-bean.mp4'),
    ('OAuth2와 소셜 로그인 연동', '외부 인증 제공자를 서비스 로그인과 연결하는 실전 입문', 'OAuth2 로그인 흐름, 인가 코드, 사용자 정보 매핑, 소셜 로그인 이후 내부 계정과 연결하는 방식을 단계별로 정리합니다.', 'Spring Security, OAuth2, 소셜 로그인', 'instructor@devpath.com', 'ADVANCED', TIMESTAMP '2026-04-10 09:00:00', 'https://picsum.photos/seed/devpath-backend-oauth2-social-login/1200/675', '/samples/lesson-spring-bean.mp4'),
    ('Docker와 docker-compose 실전', '개발 환경과 실행 환경 차이를 줄이는 컨테이너 입문', '이미지와 컨테이너 개념, Dockerfile 작성 포인트, docker-compose로 여러 서비스를 묶어 실행하는 흐름을 설명합니다.', 'Docker, docker-compose', 'data@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-11 09:00:00', 'https://picsum.photos/seed/devpath-backend-docker-compose/1200/675', '/samples/sample-intro.mp4'),
    ('GitHub Actions와 CI/CD 자동화', '테스트부터 배포까지 자동화 파이프라인 만들기', 'GitHub Actions 워크플로우, CI/CD 기본 단계, AWS EC2 배포 연결 포인트를 예시 저장소 기준으로 정리합니다.', 'GitHub Actions, CI/CD, AWS EC2', 'data@devpath.com', 'ADVANCED', TIMESTAMP '2026-04-12 09:00:00', 'https://picsum.photos/seed/devpath-backend-github-actions-cicd/1200/675', '/samples/sample-intro.mp4'),
    ('SOLID 원칙과 디자인 패턴 실전', '객체지향 설계를 변경에 강하게 만드는 기준', 'SOLID 원칙을 코드 분리에 어떻게 적용하는지, Singleton, Factory 패턴, Strategy 패턴을 언제 선택할지 사례 중심으로 설명합니다.', 'SOLID 원칙, 디자인 패턴, Singleton, Factory 패턴, Strategy 패턴', 'instructor@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-13 09:00:00', 'https://picsum.photos/seed/devpath-backend-solid-patterns/1200/675', '/samples/ocr-code-demo.mp4'),
    ('OWASP, XSS, CSRF, SQL Injection, CORS', '백엔드 API에서 바로 막아야 할 웹 보안 기본기', 'OWASP Top 10 관점에서 XSS, CSRF, SQL Injection, CORS, HTTPS를 같이 보고 API 설계 단계에서 어떤 기본값을 잡아야 하는지 정리합니다.', 'OWASP, XSS, CSRF, SQL Injection, CORS, HTTPS', 'frontend@devpath.com', 'INTERMEDIATE', TIMESTAMP '2026-04-14 09:00:00', 'https://picsum.photos/seed/devpath-backend-web-security/1200/675', '/samples/sample-intro.mp4'),
    ('Kafka와 Kafka 토픽 흐름', '이벤트 스트림을 이해하기 위한 메시지 큐 입문', 'Kafka 브로커와 토픽 구조, 파티션이 왜 필요한지, 메시지가 어떤 흐름으로 저장되고 소비되는지 백엔드 서비스 기준으로 설명합니다.', 'Kafka, Kafka 토픽', 'data@devpath.com', 'ADVANCED', TIMESTAMP '2026-04-15 09:00:00', 'https://picsum.photos/seed/devpath-backend-kafka-topic/1200/675', '/samples/sample-intro.mp4'),
    ('MSA API Gateway와 서비스 분리 기준', '서비스 경계를 나누는 판단 기준을 잡는 설계 입문', 'API Gateway가 어떤 책임을 맡는지와 서비스 분리 기준을 어떻게 세우는지, MSA를 언제 도입해야 하는지 판단 포인트를 설명합니다.', 'MSA, API Gateway, 서비스 분리', 'data@devpath.com', 'ADVANCED', TIMESTAMP '2026-04-16 09:00:00', 'https://picsum.photos/seed/devpath-backend-msa-gateway/1200/675', '/samples/sample-intro.mp4');

INSERT INTO tmp_backend_tag_video_tag_seed (course_title, tag_name)
VALUES
    ('HTTP 요청/응답, 메서드, 상태코드', 'HTTP'),
    ('HTTP 요청/응답, 메서드, 상태코드', 'HTTP 메서드'),
    ('HTTP 요청/응답, 메서드, 상태코드', 'HTTP 상태코드'),
    ('DNS, 도메인, 웹 호스팅 입문', 'DNS'),
    ('DNS, 도메인, 웹 호스팅 입문', '도메인'),
    ('DNS, 도메인, 웹 호스팅 입문', '웹 호스팅'),
    ('브라우저 요청 흐름과 HTTP 응답 구조', '브라우저'),
    ('브라우저 요청 흐름과 HTTP 응답 구조', 'HTTP'),
    ('Linux 프로세스와 스레드 관리', 'Linux'),
    ('Linux 프로세스와 스레드 관리', '프로세스 관리'),
    ('Linux 프로세스와 스레드 관리', '스레드'),
    ('Linux 메모리 관리와 I/O 관리', 'Linux'),
    ('Linux 메모리 관리와 I/O 관리', '메모리 관리'),
    ('Linux 메모리 관리와 I/O 관리', 'I/O 관리'),
    ('Java OOP와 상속 설계', 'Java'),
    ('Java OOP와 상속 설계', 'OOP'),
    ('Java OOP와 상속 설계', '상속'),
    ('인터페이스, 제네릭, 컬렉션 실전', '인터페이스'),
    ('인터페이스, 제네릭, 컬렉션 실전', '제네릭'),
    ('인터페이스, 제네릭, 컬렉션 실전', '컬렉션'),
    ('Git 브랜치 전략과 GitFlow', 'Git'),
    ('Git 브랜치 전략과 GitFlow', '브랜치 전략'),
    ('Git 브랜치 전략과 GitFlow', 'GitFlow'),
    ('Pull Request와 코드 리뷰 실무', 'Git'),
    ('Pull Request와 코드 리뷰 실무', 'Pull Request'),
    ('Pull Request와 코드 리뷰 실무', '코드 리뷰'),
    ('SQL JOIN과 서브쿼리 패턴', 'SQL'),
    ('SQL JOIN과 서브쿼리 패턴', 'JOIN'),
    ('SQL JOIN과 서브쿼리 패턴', '서브쿼리'),
    ('인덱스, 트랜잭션, PostgreSQL 성능 기본기', '인덱스'),
    ('인덱스, 트랜잭션, PostgreSQL 성능 기본기', '트랜잭션'),
    ('인덱스, 트랜잭션, PostgreSQL 성능 기본기', 'PostgreSQL'),
    ('REST URI 설계와 HTTP 메서드', 'REST'),
    ('REST URI 설계와 HTTP 메서드', 'URI 설계'),
    ('REST URI 설계와 HTTP 메서드', 'HTTP 메서드'),
    ('Swagger와 REST API 문서화', 'Swagger'),
    ('Swagger와 REST API 문서화', 'REST'),
    ('Swagger와 REST API 문서화', 'HTTP 상태코드'),
    ('Spring Boot DI/IoC와 Spring Bean 등록 흐름', 'Spring Boot'),
    ('Spring Boot DI/IoC와 Spring Bean 등록 흐름', 'DI/IoC'),
    ('Spring Boot DI/IoC와 Spring Bean 등록 흐름', 'Spring Bean'),
    ('Spring MVC 요청 처리와 3계층 구조', 'Spring Boot'),
    ('Spring MVC 요청 처리와 3계층 구조', 'Spring MVC'),
    ('Spring MVC 요청 처리와 3계층 구조', '3계층 구조'),
    ('JPA Entity 매핑과 JPQL 실전', 'JPA'),
    ('JPA Entity 매핑과 JPQL 실전', 'Entity 매핑'),
    ('JPA Entity 매핑과 JPQL 실전', 'JPQL'),
    ('FetchType, N+1, QueryDSL 최적화', 'FetchType'),
    ('FetchType, N+1, QueryDSL 최적화', 'N+1 문제'),
    ('FetchType, N+1, QueryDSL 최적화', 'QueryDSL'),
    ('Redis 자료구조, TTL, Spring Cache', 'Redis'),
    ('Redis 자료구조, TTL, Spring Cache', 'Redis 자료구조'),
    ('Redis 자료구조, TTL, Spring Cache', 'Redis TTL'),
    ('Redis 자료구조, TTL, Spring Cache', 'Spring Cache'),
    ('Redis Session, Pub/Sub, 분산 락', 'Redis'),
    ('Redis Session, Pub/Sub, 분산 락', 'Redis Session'),
    ('Redis Session, Pub/Sub, 분산 락', 'Pub/Sub'),
    ('Redis Session, Pub/Sub, 분산 락', '분산 락'),
    ('JUnit5와 Mockito 단위 테스트', 'JUnit5'),
    ('JUnit5와 Mockito 단위 테스트', 'Mockito'),
    ('JUnit5와 Mockito 단위 테스트', 'BDD'),
    ('JUnit5와 Mockito 단위 테스트', '단위 테스트'),
    ('MockMvc와 Spring Boot 통합 테스트', 'Spring Boot'),
    ('MockMvc와 Spring Boot 통합 테스트', 'MockMvc'),
    ('MockMvc와 Spring Boot 통합 테스트', '통합 테스트'),
    ('MockMvc와 Spring Boot 통합 테스트', '테스트 커버리지'),
    ('Spring Security 필터 체인과 JWT 인증', 'Spring Security'),
    ('Spring Security 필터 체인과 JWT 인증', 'JWT'),
    ('OAuth2와 소셜 로그인 연동', 'Spring Security'),
    ('OAuth2와 소셜 로그인 연동', 'OAuth2'),
    ('OAuth2와 소셜 로그인 연동', '소셜 로그인'),
    ('Docker와 docker-compose 실전', 'Docker'),
    ('Docker와 docker-compose 실전', 'docker-compose'),
    ('GitHub Actions와 CI/CD 자동화', 'GitHub Actions'),
    ('GitHub Actions와 CI/CD 자동화', 'CI/CD'),
    ('GitHub Actions와 CI/CD 자동화', 'AWS EC2'),
    ('SOLID 원칙과 디자인 패턴 실전', 'SOLID 원칙'),
    ('SOLID 원칙과 디자인 패턴 실전', '디자인 패턴'),
    ('SOLID 원칙과 디자인 패턴 실전', 'Singleton'),
    ('SOLID 원칙과 디자인 패턴 실전', 'Factory 패턴'),
    ('SOLID 원칙과 디자인 패턴 실전', 'Strategy 패턴'),
    ('OWASP, XSS, CSRF, SQL Injection, CORS', 'OWASP'),
    ('OWASP, XSS, CSRF, SQL Injection, CORS', 'XSS'),
    ('OWASP, XSS, CSRF, SQL Injection, CORS', 'CSRF'),
    ('OWASP, XSS, CSRF, SQL Injection, CORS', 'SQL Injection'),
    ('OWASP, XSS, CSRF, SQL Injection, CORS', 'CORS'),
    ('OWASP, XSS, CSRF, SQL Injection, CORS', 'HTTPS'),
    ('Kafka와 Kafka 토픽 흐름', 'Kafka'),
    ('Kafka와 Kafka 토픽 흐름', 'Kafka 토픽'),
    ('MSA API Gateway와 서비스 분리 기준', 'MSA'),
    ('MSA API Gateway와 서비스 분리 기준', 'API Gateway'),
    ('MSA API Gateway와 서비스 분리 기준', '서비스 분리');

INSERT INTO courses (
    instructor_id, title, subtitle, description,
    thumbnail_url, intro_video_url, video_asset_key, duration_seconds,
    price, original_price, currency, difficulty_level, language,
    has_certificate, status, published_at
)
SELECT
    u.user_id,
    seed.course_title,
    seed.subtitle,
    seed.description,
    seed.thumbnail_url,
    seed.intro_video_url,
    NULL,
    CASE seed.difficulty_level
        WHEN 'BEGINNER' THEN 6600
        WHEN 'INTERMEDIATE' THEN 8400
        ELSE 10200
    END,
    0,
    0,
    'KRW',
    seed.difficulty_level,
    'ko',
    TRUE,
    'PUBLISHED',
    seed.published_at
FROM tmp_backend_tag_video_seed seed
JOIN users u ON u.email = seed.instructor_email
WHERE NOT EXISTS (
    SELECT 1
    FROM courses c
    WHERE c.title = seed.course_title
);

UPDATE courses c
SET
    price = 0,
    original_price = 0,
    currency = 'KRW',
    thumbnail_url = seed.thumbnail_url,
    intro_video_url = seed.intro_video_url,
    status = 'PUBLISHED',
    published_at = COALESCE(c.published_at, seed.published_at)
FROM tmp_backend_tag_video_seed seed
WHERE c.title = seed.course_title
  AND (
      COALESCE(c.price, -1) <> 0
      OR COALESCE(c.original_price, -1) <> 0
      OR COALESCE(c.currency, '') <> 'KRW'
      OR COALESCE(c.thumbnail_url, '') <> seed.thumbnail_url
      OR COALESCE(c.intro_video_url, '') <> seed.intro_video_url
      OR COALESCE(c.status, '') <> 'PUBLISHED'
      OR c.published_at IS NULL
  );

INSERT INTO course_prerequisites (course_id, prerequisite)
WITH prerequisite_seed(prerequisite_text, display_order) AS (
    VALUES
        ('백엔드 기본 문법 또는 웹 서비스 흐름을 알고 있으면 예제를 더 빠르게 이해할 수 있습니다.', 1),
        ('IDE 또는 터미널에서 간단한 프로젝트를 실행해 본 경험이 있으면 실습을 따라가기 쉽습니다.', 2)
)
SELECT c.course_id, ps.prerequisite_text
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN prerequisite_seed ps ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_prerequisites cp
    WHERE cp.course_id = c.course_id
      AND cp.prerequisite = ps.prerequisite_text
);

INSERT INTO course_job_relevance (course_id, job_relevance)
WITH relevance_seed(job_relevance, display_order) AS (
    VALUES
        ('백엔드 개발자', 1),
        ('서버 애플리케이션 개발과 운영을 준비하는 주니어 개발자', 2)
)
SELECT c.course_id, rs.job_relevance
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN relevance_seed rs ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_job_relevance cj
    WHERE cj.course_id = c.course_id
      AND cj.job_relevance = rs.job_relevance
);

INSERT INTO course_objectives (course_id, objective_text, display_order)
WITH objective_seed(display_order) AS (
    VALUES (1), (2)
)
SELECT
    c.course_id,
    CASE os.display_order
        WHEN 1 THEN seed.tag_summary || ' 관련 핵심 개념과 요청/데이터 흐름을 설명할 수 있습니다.'
        ELSE '관련 태그를 실제 백엔드 코드와 운영 시나리오에 연결해 적용할 수 있습니다.'
    END,
    os.display_order
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN objective_seed os ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_objectives co
    WHERE co.course_id = c.course_id
      AND co.display_order = os.display_order
);

INSERT INTO course_target_audiences (course_id, audience_description, display_order)
WITH audience_seed(display_order) AS (
    VALUES (1), (2)
)
SELECT
    c.course_id,
    CASE ads.display_order
        WHEN 1 THEN seed.tag_summary || ' 태그를 실무 기준으로 보강하고 싶은 백엔드 학습자'
        ELSE 'Backend Master Roadmap에서 특정 태그가 막혀 추가 설명이 필요한 주니어 개발자'
    END,
    ads.display_order
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN audience_seed ads ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_target_audiences cta
    WHERE cta.course_id = c.course_id
      AND cta.display_order = ads.display_order
);

INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
SELECT
    c.course_id,
    t.tag_id,
    CASE seed.difficulty_level
        WHEN 'BEGINNER' THEN 2
        ELSE 3
    END
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN tmp_backend_tag_video_tag_seed ts ON ts.course_title = seed.course_title
JOIN tags t ON t.name = ts.tag_name
WHERE NOT EXISTS (
    SELECT 1
    FROM course_tag_maps ctm
    WHERE ctm.course_id = c.course_id
      AND ctm.tag_id = t.tag_id
);

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
WITH section_seed(sort_order) AS (
    VALUES (1), (2)
)
SELECT
    c.course_id,
    CASE ss.sort_order
        WHEN 1 THEN '핵심 태그 정리'
        ELSE '실전 적용과 체크리스트'
    END,
    CASE ss.sort_order
        WHEN 1 THEN seed.tag_summary || ' 개념을 빠르게 연결해 이해합니다.'
        ELSE seed.tag_summary || '를 실제 서비스와 운영 상황에 적용하는 방법을 정리합니다.'
    END,
    ss.sort_order,
    TRUE
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN section_seed ss ON 1 = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM course_sections cs
    WHERE cs.course_id = c.course_id
      AND cs.sort_order = ss.sort_order
);

INSERT INTO lessons (
    section_id, title, description, lesson_type,
    video_url, video_asset_key, video_provider,
    thumbnail_url, duration_seconds, is_preview, is_published, sort_order
)
WITH lesson_seed(section_order, lesson_order, title_suffix, description_body, video_url, duration_seconds, is_preview) AS (
    VALUES
        (1, 1, '개념 지도', '핵심 태그의 전체 맥락을 먼저 잡습니다.', '/samples/sample-intro.mp4', 720, TRUE),
        (1, 2, '태그별 실전 포인트', '자주 헷갈리는 기준과 예제를 함께 정리합니다.', '/samples/ocr-code-demo.mp4', 900, FALSE),
        (2, 1, '실무 시나리오', '서비스 구현과 운영에서 어떻게 이어지는지 살펴봅니다.', '/samples/lesson-spring-di.mp4', 840, FALSE),
        (2, 2, '체크리스트', '학습 후 바로 점검할 포인트를 정리합니다.', '/samples/lesson-os-context.mp4', 780, FALSE)
)
SELECT
    cs.section_id,
    seed.course_title || ' ' || ls.title_suffix,
    seed.tag_summary || ' 학습을 위해 ' || ls.description_body,
    'VIDEO',
    CASE
        WHEN ls.section_order = 1 AND ls.lesson_order = 1
            THEN seed.intro_video_url
        WHEN seed.course_title LIKE 'Spring %'
            OR seed.course_title LIKE 'MockMvc%'
            OR seed.course_title LIKE 'OAuth2%'
            OR seed.course_title LIKE 'JPA %'
            OR seed.course_title LIKE 'FetchType%'
            THEN '/samples/lesson-spring-bean.mp4'
        WHEN seed.course_title LIKE 'Linux %'
            THEN '/samples/lesson-os-context.mp4'
        ELSE ls.video_url
    END,
    NULL,
    NULL,
    c.thumbnail_url,
    ls.duration_seconds,
    ls.is_preview,
    TRUE,
    ls.lesson_order
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN lesson_seed ls ON 1 = 1
JOIN course_sections cs ON cs.course_id = c.course_id AND cs.sort_order = ls.section_order
WHERE NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.section_id = cs.section_id
      AND l.sort_order = ls.lesson_order
);

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT DISTINCT
    c.course_id,
    rn.node_id,
    seed.published_at
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN tmp_backend_tag_video_tag_seed ts ON ts.course_title = seed.course_title
JOIN tags t ON t.name = ts.tag_name
JOIN node_required_tags nrt ON nrt.tag_id = t.tag_id
JOIN roadmap_nodes rn ON rn.node_id = nrt.node_id
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM course_node_mappings cnm
      WHERE cnm.course_id = c.course_id
        AND cnm.node_id = rn.node_id
  );

INSERT INTO roadmap_node_resources (
    node_id, title, url, description, source_type, sort_order, active, created_at, updated_at
)
SELECT DISTINCT
    rn.node_id,
    c.title,
    'course-detail.html?courseId=' || c.course_id,
    '관련 태그: ' || seed.tag_summary || '. 노드에서 막힌 태그를 영상 중심으로 빠르게 보강할 수 있는 공개 강의입니다.',
    'COURSE',
    4,
    TRUE,
    seed.published_at,
    seed.published_at
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
JOIN tmp_backend_tag_video_tag_seed ts ON ts.course_title = seed.course_title
JOIN tags t ON t.name = ts.tag_name
JOIN node_required_tags nrt ON nrt.tag_id = t.tag_id
JOIN roadmap_nodes rn ON rn.node_id = nrt.node_id
JOIN roadmaps r ON r.roadmap_id = rn.roadmap_id
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_node_resources existing
      WHERE existing.node_id = rn.node_id
        AND existing.url = 'course-detail.html?courseId=' || c.course_id
  );

INSERT INTO course_announcements (
    course_id, announcement_type, title, content, is_pinned, display_order,
    published_at, exposure_start_at, exposure_end_at,
    event_banner_text, event_link, created_at, updated_at
)
SELECT
    c.course_id,
    'NORMAL',
    seed.course_title || ' 학습 가이드',
    '이 강의는 Backend Master Roadmap의 관련 태그를 빠르게 보강할 수 있도록 구성되었습니다. 태그: '
        || seed.tag_summary
        || '. 노드에서 막힌 태그를 먼저 확인한 뒤 필요한 섹션만 골라 들어도 흐름을 잡을 수 있습니다.',
    FALSE,
    1,
    seed.published_at,
    seed.published_at,
    NULL,
    NULL,
    NULL,
    seed.published_at,
    seed.published_at
FROM tmp_backend_tag_video_seed seed
JOIN courses c ON c.title = seed.course_title
WHERE NOT EXISTS (
    SELECT 1
    FROM course_announcements ca
    WHERE ca.course_id = c.course_id
      AND ca.title = seed.course_title || ' 학습 가이드'
);

DROP TABLE IF EXISTS tmp_backend_tag_video_tag_seed;
DROP TABLE IF EXISTS tmp_backend_tag_video_seed;

-- =============================================
-- 로드맵 빌더 모듈 데이터 (builder_modules)
-- =============================================

-- frontend (6)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'cs-net', 'frontend', '인터넷 & 네트워크', 'fas fa-globe', 'text-blue-500', 'bg-blue-50',
       '["HTTP/HTTPS","DNS 작동원리","도메인 & 호스팅"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'cs-net' AND category = 'frontend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'fe-html', 'frontend', 'HTML / CSS', 'fab fa-html5', 'text-orange-500', 'bg-orange-50',
       '["시맨틱 태그","Flexbox & Grid","반응형 웹","SEO 기초"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'fe-html' AND category = 'frontend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'fe-js', 'frontend', 'JavaScript', 'fab fa-js', 'text-yellow-500', 'bg-yellow-50',
       '["ES6+","DOM 조작","비동기(Promise/Async)","이벤트 루프"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'fe-js' AND category = 'frontend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'fe-ts', 'frontend', 'TypeScript', 'fas fa-file-code', 'text-blue-600', 'bg-blue-50',
       '["정적 타이핑","인터페이스","제네릭"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'fe-ts' AND category = 'frontend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'fe-react', 'frontend', 'React', 'fab fa-react', 'text-cyan-500', 'bg-cyan-50',
       '["컴포넌트 생명주기","React Hooks","상태 관리","라우팅"]', 5
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'fe-react' AND category = 'frontend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'fe-next', 'frontend', 'Next.js', 'fas fa-n', 'text-black', 'bg-gray-200',
       '["SSR / SSG","App Router","API Routes","최적화"]', 6
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'fe-next' AND category = 'frontend');

-- backend (8)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'cs-net', 'backend', '인터넷 & 네트워크', 'fas fa-globe', 'text-blue-500', 'bg-blue-50',
       '["TCP/IP","HTTP 메서드","CORS","웹 소켓"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'cs-net' AND category = 'backend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'cs-os', 'backend', 'OS 및 일반 지식', 'fas fa-terminal', 'text-gray-700', 'bg-gray-200',
       '["터미널 명령어","프로세스와 스레드","메모리 관리","동시성"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'cs-os' AND category = 'backend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'be-java', 'backend', 'Java Programming', 'fab fa-java', 'text-red-500', 'bg-red-50',
       '["객체지향(OOP)","JVM 메모리 구조","컬렉션 프레임워크","스트림 API"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'be-java' AND category = 'backend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'be-spring', 'backend', 'Spring Boot', 'fas fa-leaf', 'text-green-500', 'bg-green-50',
       '["의존성 주입(DI)","AOP","Spring MVC","JPA / Hibernate"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'be-spring' AND category = 'backend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'db-rdb', 'backend', '관계형 데이터베이스', 'fas fa-database', 'text-indigo-500', 'bg-indigo-50',
       '["PostgreSQL / MySQL","정규화","트랜잭션(ACID)","인덱스 최적화"]', 5
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'db-rdb' AND category = 'backend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'be-api', 'backend', 'API 설계', 'fas fa-network-wired', 'text-purple-500', 'bg-purple-50',
       '["RESTful 설계","GraphQL","JWT 인증","OAuth 2.0"]', 6
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'be-api' AND category = 'backend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'be-redis', 'backend', 'Redis & 캐싱', 'fas fa-memory', 'text-red-500', 'bg-red-50',
       '["In-Memory DB","세션 관리","캐싱 전략","Pub/Sub"]', 7
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'be-redis' AND category = 'backend');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'infra-docker', 'backend', 'Docker', 'fab fa-docker', 'text-blue-600', 'bg-blue-50',
       '["컨테이너화","Dockerfile","Docker Compose","볼륨 관리"]', 8
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'infra-docker' AND category = 'backend');

-- devops (5)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'cs-os', 'devops', 'Linux Administration', 'fab fa-linux', 'text-black', 'bg-gray-200',
       '["쉘 스크립트","권한 관리(chmod)","시스템 모니터링","SSH"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'cs-os' AND category = 'devops');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'infra-docker', 'devops', 'Docker 심화', 'fab fa-docker', 'text-blue-600', 'bg-blue-50',
       '["멀티스테이지 빌드","네트워크 브릿지","이미지 경량화"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'infra-docker' AND category = 'devops');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'do-cicd', 'devops', 'CI/CD 파이프라인', 'fas fa-sync-alt', 'text-teal-500', 'bg-teal-50',
       '["GitHub Actions","Jenkins","파이프라인 구축","자동 배포"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'do-cicd' AND category = 'devops');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'do-k8s', 'devops', 'Kubernetes', 'fas fa-dharmachakra', 'text-blue-500', 'bg-blue-50',
       '["Pod & Service","Deployment","Ingress","Helm Chart"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'do-k8s' AND category = 'devops');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'do-aws', 'devops', 'AWS 인프라', 'fab fa-aws', 'text-orange-400', 'bg-orange-50',
       '["EC2 & VPC","S3 스토리지","IAM 권한","RDS & ElastiCache"]', 5
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'do-aws' AND category = 'devops');

-- fullstack (5)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'fe-react', 'fullstack', 'React / Next.js', 'fab fa-react', 'text-cyan-500', 'bg-cyan-50',
       '["클라이언트 UI","상태 관리","서버 사이드 렌더링"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'fe-react' AND category = 'fullstack');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'fs-node', 'fullstack', 'Node.js / Express', 'fab fa-node-js', 'text-green-600', 'bg-green-50',
       '["JavaScript 런타임","미들웨어","REST API 구축"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'fs-node' AND category = 'fullstack');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'be-spring', 'fullstack', 'Spring Boot (선택)', 'fas fa-leaf', 'text-green-500', 'bg-green-50',
       '["엔터프라이즈 백엔드","JPA 연동","보안 설정"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'be-spring' AND category = 'fullstack');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'db-rdb', 'fullstack', 'PostgreSQL', 'fas fa-database', 'text-indigo-500', 'bg-indigo-50',
       '["RDBMS 기본","데이터 모델링"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'db-rdb' AND category = 'fullstack');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'infra-docker', 'fullstack', 'Docker', 'fab fa-docker', 'text-blue-600', 'bg-blue-50',
       '["풀스택 앱 컨테이너화","Compose 연동"]', 5
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'infra-docker' AND category = 'fullstack');

-- ai (5)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'ai-py', 'ai', 'Python Programming', 'fab fa-python', 'text-blue-500', 'bg-blue-50',
       '["데이터 타입","Numpy","Pandas","데이터 전처리"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'ai-py' AND category = 'ai');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'ai-math', 'ai', '수학 및 통계', 'fas fa-square-root-alt', 'text-gray-700', 'bg-gray-200',
       '["선형대수학","미적분","확률과 통계"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'ai-math' AND category = 'ai');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'ai-ml', 'ai', 'Machine Learning', 'fas fa-robot', 'text-orange-500', 'bg-orange-50',
       '["Scikit-learn","지도 학습","비지도 학습","모델 평가"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'ai-ml' AND category = 'ai');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'ai-dl', 'ai', 'Deep Learning', 'fas fa-brain', 'text-purple-500', 'bg-purple-50',
       '["PyTorch / TensorFlow","신경망 기초","CNN","RNN / LSTM"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'ai-dl' AND category = 'ai');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'ai-nlp', 'ai', 'NLP & LLM', 'fas fa-language', 'text-green-600', 'bg-green-50',
       '["트랜스포머 아키텍처","Hugging Face","프롬프트 엔지니어링","RAG"]', 5
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'ai-nlp' AND category = 'ai');

-- data_engineer (5)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'ai-py', 'data_engineer', 'Python / Scala', 'fab fa-python', 'text-blue-500', 'bg-blue-50',
       '["데이터 파이프라인 개발","분산 처리 기초"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'ai-py' AND category = 'data_engineer');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'db-rdb', 'data_engineer', 'Advanced SQL', 'fas fa-database', 'text-indigo-500', 'bg-indigo-50',
       '["복잡한 조인","윈도우 함수","쿼리 실행 계획 튜닝"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'db-rdb' AND category = 'data_engineer');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'de-dw', 'data_engineer', 'Data Warehouse', 'fas fa-cubes', 'text-blue-400', 'bg-blue-50',
       '["BigQuery","Snowflake","데이터 마트 설계"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'de-dw' AND category = 'data_engineer');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'de-spark', 'data_engineer', 'Apache Spark', 'fas fa-bolt', 'text-orange-500', 'bg-orange-50',
       '["RDD","Spark SQL","대용량 데이터 변환"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'de-spark' AND category = 'data_engineer');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'de-kafka', 'data_engineer', 'Apache Kafka', 'fas fa-stream', 'text-black', 'bg-gray-200',
       '["이벤트 스트리밍","Pub/Sub 구조","실시간 파이프라인"]', 5
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'de-kafka' AND category = 'data_engineer');

-- android (5)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-kt', 'android', 'Kotlin Programming', 'fas fa-code', 'text-purple-600', 'bg-purple-50',
       '["코틀린 문법","Null 안정성","컬렉션 및 람다"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-kt' AND category = 'android');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-and', 'android', 'Android Studio', 'fab fa-android', 'text-green-500', 'bg-green-50',
       '["IDE 활용","Gradle 빌드","에뮬레이터"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-and' AND category = 'android');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-ui', 'android', 'Jetpack Compose', 'fas fa-layer-group', 'text-blue-500', 'bg-blue-50',
       '["선언형 UI","상태 호이스팅","애니메이션","레이아웃"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-ui' AND category = 'android');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-coroutine', 'android', 'Coroutines & Flow', 'fas fa-water', 'text-cyan-500', 'bg-cyan-50',
       '["비동기 프로그래밍","백그라운드 스레드","데이터 스트림"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-coroutine' AND category = 'android');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-arch', 'android', 'Architecture (MVVM)', 'fas fa-project-diagram', 'text-orange-500', 'bg-orange-50',
       '["ViewModel","LiveData","의존성 주입(Hilt)"]', 5
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-arch' AND category = 'android');

-- ios (4)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-swift', 'ios', 'Swift Programming', 'fab fa-apple', 'text-black', 'bg-gray-200',
       '["옵셔널","구조체와 클래스","프로토콜 지향 프로그래밍"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-swift' AND category = 'ios');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-swiftui', 'ios', 'SwiftUI', 'fas fa-layer-group', 'text-blue-500', 'bg-blue-50',
       '["선언형 뷰","상태 관리(@State)","네비게이션"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-swiftui' AND category = 'ios');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-combine', 'ios', 'Combine', 'fas fa-stream', 'text-purple-500', 'bg-purple-50',
       '["Publisher / Subscriber","데이터 바인딩"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-combine' AND category = 'ios');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'app-coredata', 'ios', 'Core Data', 'fas fa-database', 'text-indigo-500', 'bg-indigo-50',
       '["로컬 데이터 저장","엔티티 관리","마이그레이션"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'app-coredata' AND category = 'ios');

-- game (5)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'game-math', 'game', '3D Math & Physics', 'fas fa-square-root-alt', 'text-gray-700', 'bg-gray-200',
       '["벡터와 행렬","쿼터니언 회전","충돌 처리","물리 엔진"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'game-math' AND category = 'game');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'game-cs', 'game', 'C# Programming', 'fas fa-code', 'text-purple-600', 'bg-purple-50',
       '["C# 문법","이벤트와 델리게이트","가비지 컬렉션"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'game-cs' AND category = 'game');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'game-unity', 'game', 'Unity Engine', 'fab fa-unity', 'text-black', 'bg-gray-200',
       '["컴포넌트 패턴","씬 관리","애니메이터","UI 시스템"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'game-unity' AND category = 'game');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'game-cpp', 'game', 'C++ Programming', 'fas fa-file-code', 'text-blue-600', 'bg-blue-50',
       '["포인터와 참조","메모리 관리","STL 라이브러리"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'game-cpp' AND category = 'game');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'game-unreal', 'game', 'Unreal Engine', 'fas fa-gamepad', 'text-orange-500', 'bg-orange-50',
       '["블루프린트","액터 시스템","메테리얼 에디터"]', 5
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'game-unreal' AND category = 'game');

-- blockchain (4)
INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'bc-crypto', 'blockchain', 'Cryptography', 'fas fa-key', 'text-yellow-600', 'bg-yellow-50',
       '["해시 함수","공개키/개인키","디지털 서명"]', 1
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'bc-crypto' AND category = 'blockchain');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'bc-basics', 'blockchain', 'Blockchain Basics', 'fas fa-link', 'text-gray-700', 'bg-gray-200',
       '["P2P 네트워크","합의 알고리즘(PoW/PoS)","분산 원장"]', 2
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'bc-basics' AND category = 'blockchain');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'bc-sol', 'blockchain', 'Solidity', 'fab fa-ethereum', 'text-purple-500', 'bg-purple-50',
       '["EVM","토큰 표준(ERC-20)","가스비 최적화"]', 3
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'bc-sol' AND category = 'blockchain');

INSERT INTO builder_modules (module_id, category, title, icon, color, bg_color, topics, sort_order)
SELECT 'bc-web3', 'blockchain', 'Web3.js / Ethers.js', 'fas fa-plug', 'text-blue-500', 'bg-blue-50',
       '["DApp 구축","지갑 연동(Metamask)","RPC 통신"]', 4
WHERE NOT EXISTS (SELECT 1 FROM builder_modules WHERE module_id = 'bc-web3' AND category = 'blockchain');
UPDATE users
SET
    name = CASE email
        WHEN 'learner@devpath.com' THEN '김하늘'
        WHEN 'learner2@devpath.com' THEN '박지민'
        WHEN 'learner3@devpath.com' THEN '이서준'
        WHEN 'learner4@devpath.com' THEN '최유진'
        WHEN 'restricted-user@devpath.com' THEN '정민재'
        WHEN 'deactivated-user@devpath.com' THEN '오서연'
        WHEN 'withdrawn-user@devpath.com' THEN '강도윤'
        WHEN 'instructor@devpath.com' THEN '홍지훈'
        WHEN 'admin@devpath.com' THEN '박서연'
        ELSE name
    END,
    updated_at = NOW()
WHERE email IN (
    'learner@devpath.com',
    'learner2@devpath.com',
    'learner3@devpath.com',
    'learner4@devpath.com',
    'restricted-user@devpath.com',
    'deactivated-user@devpath.com',
    'withdrawn-user@devpath.com',
    'instructor@devpath.com',
    'admin@devpath.com'
);

-- [CATALOG] frontend@devpath.com 강사 대시보드 활동 데이터
INSERT INTO course_enrollments (
    user_id, course_id, status, enrolled_at, completed_at, progress_percentage, last_accessed_at
)
WITH frontend_enrollment_seed(
    learner_email, course_title, status, enrolled_at, completed_at, progress_percentage, last_accessed_at
) AS (
    VALUES
        ('learner@devpath.com', 'React 19 프론트엔드 실전 가이드', 'ACTIVE', TIMESTAMP '2026-04-02 10:00:00', CAST(NULL AS TIMESTAMP), 18, TIMESTAMP '2026-04-05 21:10:00'),
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', 'COMPLETED', TIMESTAMP '2026-04-02 11:00:00', TIMESTAMP '2026-04-16 20:20:00', 100, TIMESTAMP '2026-04-16 20:20:00'),
        ('learner3@devpath.com', 'React 19 프론트엔드 실전 가이드', 'ACTIVE', TIMESTAMP '2026-04-03 10:30:00', CAST(NULL AS TIMESTAMP), 34, TIMESTAMP '2026-04-07 19:30:00'),
        ('learner4@devpath.com', 'React 19 프론트엔드 실전 가이드', 'ACTIVE', TIMESTAMP '2026-04-04 14:10:00', CAST(NULL AS TIMESTAMP), 52, TIMESTAMP '2026-04-15 22:10:00'),
        ('learner@devpath.com', 'Next.js 14 제품 개발 실전', 'ACTIVE', TIMESTAMP '2026-04-04 09:20:00', CAST(NULL AS TIMESTAMP), 12, TIMESTAMP '2026-04-04 22:40:00'),
        ('learner2@devpath.com', 'Next.js 14 제품 개발 실전', 'ACTIVE', TIMESTAMP '2026-04-05 13:00:00', CAST(NULL AS TIMESTAMP), 44, TIMESTAMP '2026-04-09 18:20:00'),
        ('learner3@devpath.com', 'Next.js 14 제품 개발 실전', 'COMPLETED', TIMESTAMP '2026-04-05 15:40:00', TIMESTAMP '2026-04-16 21:00:00', 100, TIMESTAMP '2026-04-16 21:00:00'),
        ('learner4@devpath.com', 'Next.js 14 제품 개발 실전', 'ACTIVE', TIMESTAMP '2026-04-06 10:15:00', CAST(NULL AS TIMESTAMP), 27, TIMESTAMP '2026-04-08 20:00:00'),
        ('learner@devpath.com', 'Flutter로 MVP 앱 출시하기', 'ACTIVE', TIMESTAMP '2026-04-06 09:00:00', CAST(NULL AS TIMESTAMP), 9, TIMESTAMP '2026-04-03 23:10:00'),
        ('learner2@devpath.com', 'Flutter로 MVP 앱 출시하기', 'ACTIVE', TIMESTAMP '2026-04-07 12:20:00', CAST(NULL AS TIMESTAMP), 63, TIMESTAMP '2026-04-14 21:30:00'),
        ('learner3@devpath.com', 'Flutter로 MVP 앱 출시하기', 'ACTIVE', TIMESTAMP '2026-04-07 19:00:00', CAST(NULL AS TIMESTAMP), 28, TIMESTAMP '2026-04-08 22:45:00'),
        ('learner4@devpath.com', 'Flutter로 MVP 앱 출시하기', 'COMPLETED', TIMESTAMP '2026-04-08 11:10:00', TIMESTAMP '2026-04-16 19:10:00', 100, TIMESTAMP '2026-04-16 19:10:00')
)
SELECT
    u.user_id,
    c.course_id,
    seed.status,
    seed.enrolled_at,
    seed.completed_at,
    seed.progress_percentage,
    seed.last_accessed_at
FROM frontend_enrollment_seed seed
JOIN users u ON u.email = seed.learner_email
JOIN courses c ON c.title = seed.course_title
WHERE NOT EXISTS (
    SELECT 1
    FROM course_enrollments ce
    WHERE ce.user_id = u.user_id
      AND ce.course_id = c.course_id
);

INSERT INTO lesson_progress (
    user_id, lesson_id, progress_percent, progress_seconds,
    default_playback_rate, is_pip_enabled, is_completed,
    last_watched_at, created_at, updated_at
)
WITH frontend_progress_seed(
    learner_email, course_title, lesson_title, progress_percent,
    progress_seconds, default_playback_rate, is_pip_enabled, is_completed, last_watched_at
) AS (
    VALUES
        ('learner@devpath.com', 'React 19 프론트엔드 실전 가이드', '컴포넌트 경계와 상태 배치', 100, 900, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-04 21:00:00'),
        ('learner@devpath.com', 'React 19 프론트엔드 실전 가이드', 'Actions와 폼 처리 패턴', 35, 430, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-05 21:10:00'),
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', '컴포넌트 경계와 상태 배치', 100, 900, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-12 20:00:00'),
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', 'Actions와 폼 처리 패턴', 100, 960, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-13 20:30:00'),
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', 'Tailwind 유틸리티 설계', 100, 840, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-15 20:10:00'),
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', 'Playwright로 사용자 흐름 테스트', 100, 1020, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-16 20:20:00'),
        ('learner3@devpath.com', 'React 19 프론트엔드 실전 가이드', '컴포넌트 경계와 상태 배치', 80, 720, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-06 19:00:00'),
        ('learner3@devpath.com', 'React 19 프론트엔드 실전 가이드', 'Actions와 폼 처리 패턴', 25, 310, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-07 19:30:00'),
        ('learner4@devpath.com', 'React 19 프론트엔드 실전 가이드', '컴포넌트 경계와 상태 배치', 100, 900, 1.10, FALSE, TRUE, TIMESTAMP '2026-04-12 21:30:00'),
        ('learner4@devpath.com', 'React 19 프론트엔드 실전 가이드', 'Tailwind 유틸리티 설계', 55, 460, 1.10, FALSE, FALSE, TIMESTAMP '2026-04-15 22:10:00'),
        ('learner@devpath.com', 'Next.js 14 제품 개발 실전', '라우팅과 레이아웃 구조 설계', 40, 360, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-04 22:40:00'),
        ('learner2@devpath.com', 'Next.js 14 제품 개발 실전', '라우팅과 레이아웃 구조 설계', 100, 900, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-08 18:00:00'),
        ('learner2@devpath.com', 'Next.js 14 제품 개발 실전', '서버 컴포넌트와 캐싱 전략', 45, 480, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-09 18:20:00'),
        ('learner3@devpath.com', 'Next.js 14 제품 개발 실전', '라우팅과 레이아웃 구조 설계', 100, 900, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-14 20:10:00'),
        ('learner3@devpath.com', 'Next.js 14 제품 개발 실전', '서버 컴포넌트와 캐싱 전략', 100, 1080, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-15 20:30:00'),
        ('learner3@devpath.com', 'Next.js 14 제품 개발 실전', '인증과 권한 처리', 100, 960, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-16 20:40:00'),
        ('learner4@devpath.com', 'Next.js 14 제품 개발 실전', '라우팅과 레이아웃 구조 설계', 55, 500, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-08 20:00:00'),
        ('learner@devpath.com', 'Flutter로 MVP 앱 출시하기', '위젯 트리와 상태 관리', 20, 170, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-03 23:10:00'),
        ('learner2@devpath.com', 'Flutter로 MVP 앱 출시하기', '위젯 트리와 상태 관리', 100, 840, 1.10, FALSE, TRUE, TIMESTAMP '2026-04-12 21:20:00'),
        ('learner2@devpath.com', 'Flutter로 MVP 앱 출시하기', '라우팅과 폼 검증', 80, 720, 1.10, FALSE, FALSE, TIMESTAMP '2026-04-14 21:30:00'),
        ('learner3@devpath.com', 'Flutter로 MVP 앱 출시하기', '위젯 트리와 상태 관리', 60, 500, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-07 22:10:00'),
        ('learner3@devpath.com', 'Flutter로 MVP 앱 출시하기', '라우팅과 폼 검증', 10, 90, 1.00, FALSE, FALSE, TIMESTAMP '2026-04-08 22:45:00'),
        ('learner4@devpath.com', 'Flutter로 MVP 앱 출시하기', '위젯 트리와 상태 관리', 100, 840, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-13 19:10:00'),
        ('learner4@devpath.com', 'Flutter로 MVP 앱 출시하기', '라우팅과 폼 검증', 100, 900, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-14 19:40:00'),
        ('learner4@devpath.com', 'Flutter로 MVP 앱 출시하기', 'REST API 연동과 에러 처리', 100, 960, 1.25, TRUE, TRUE, TIMESTAMP '2026-04-15 19:30:00')
)
SELECT
    u.user_id,
    l.lesson_id,
    seed.progress_percent,
    seed.progress_seconds,
    seed.default_playback_rate,
    seed.is_pip_enabled,
    seed.is_completed,
    seed.last_watched_at,
    seed.last_watched_at,
    seed.last_watched_at
FROM frontend_progress_seed seed
JOIN users u ON u.email = seed.learner_email
JOIN courses c ON c.title = seed.course_title
JOIN course_sections cs ON cs.course_id = c.course_id
JOIN lessons l ON l.section_id = cs.section_id AND l.title = seed.lesson_title
WHERE NOT EXISTS (
    SELECT 1
    FROM lesson_progress lp
    WHERE lp.user_id = u.user_id
      AND lp.lesson_id = l.lesson_id
);

INSERT INTO quiz_attempts (
    quiz_id, learner_id, score, max_score, started_at, completed_at,
    time_spent_seconds, is_passed, attempt_number, is_deleted, created_at, updated_at
)
WITH frontend_quiz_attempt_seed(
    learner_email, course_title, score, max_score, started_at,
    completed_at, time_spent_seconds, is_passed, attempt_number
) AS (
    VALUES
        ('learner@devpath.com', 'React 19 프론트엔드 실전 가이드', 55, 100, TIMESTAMP '2026-04-06 19:00:00', TIMESTAMP '2026-04-06 19:08:00', 480, FALSE, 1),
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', 92, 100, TIMESTAMP '2026-04-13 20:00:00', TIMESTAMP '2026-04-13 20:06:00', 360, TRUE, 1),
        ('learner3@devpath.com', 'React 19 프론트엔드 실전 가이드', 68, 100, TIMESTAMP '2026-04-07 20:00:00', TIMESTAMP '2026-04-07 20:09:00', 540, FALSE, 1),
        ('learner2@devpath.com', 'Next.js 14 제품 개발 실전', 74, 100, TIMESTAMP '2026-04-09 19:00:00', TIMESTAMP '2026-04-09 19:08:00', 500, TRUE, 1),
        ('learner3@devpath.com', 'Next.js 14 제품 개발 실전', 88, 100, TIMESTAMP '2026-04-15 21:00:00', TIMESTAMP '2026-04-15 21:07:00', 420, TRUE, 1),
        ('learner3@devpath.com', 'Flutter로 MVP 앱 출시하기', 48, 100, TIMESTAMP '2026-04-08 23:00:00', TIMESTAMP '2026-04-08 23:10:00', 600, FALSE, 1),
        ('learner4@devpath.com', 'Flutter로 MVP 앱 출시하기', 95, 100, TIMESTAMP '2026-04-14 20:00:00', TIMESTAMP '2026-04-14 20:06:00', 360, TRUE, 1)
)
SELECT
    q.quiz_id,
    u.user_id,
    seed.score,
    seed.max_score,
    seed.started_at,
    seed.completed_at,
    seed.time_spent_seconds,
    seed.is_passed,
    seed.attempt_number,
    FALSE,
    seed.started_at,
    seed.completed_at
FROM frontend_quiz_attempt_seed seed
JOIN users u ON u.email = seed.learner_email
JOIN roadmap_nodes rn ON rn.sub_topics = seed.course_title
                   AND rn.node_type = 'QUIZ'
                   AND rn.title LIKE '[CATALOG]%'
JOIN quizzes q ON q.node_id = rn.node_id
WHERE NOT EXISTS (
    SELECT 1
    FROM quiz_attempts qa
    WHERE qa.quiz_id = q.quiz_id
      AND qa.learner_id = u.user_id
      AND qa.attempt_number = seed.attempt_number
      AND qa.is_deleted = FALSE
);

INSERT INTO assignment_submissions (
    assignment_id, learner_id, grader_id, submission_text, submission_url,
    is_late, submission_status, submitted_at, graded_at,
    readme_passed, test_passed, lint_passed, file_format_passed,
    quality_score, total_score, individual_feedback, common_feedback,
    is_deleted, created_at, updated_at
)
WITH frontend_submission_seed(
    learner_email, course_title, submission_text, submission_url,
    is_late, submission_status, submitted_at, graded_at,
    readme_passed, test_passed, lint_passed, file_format_passed,
    quality_score, total_score, individual_feedback, common_feedback
) AS (
    VALUES
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', '대시보드 필터와 Playwright 흐름을 제출했습니다.', 'https://github.com/devpath/frontend-react-dashboard-a', FALSE, 'GRADED', TIMESTAMP '2026-04-14 20:00:00', TIMESTAMP '2026-04-15 10:00:00', TRUE, TRUE, TRUE, TRUE, 91, 88, '테스트 흐름이 안정적입니다.', '프론트엔드 실습 과제 피드백'),
        ('learner3@devpath.com', 'React 19 프론트엔드 실전 가이드', '상태 배치와 Tailwind 스타일링 결과를 정리했습니다.', 'https://github.com/devpath/frontend-react-dashboard-b', FALSE, 'GRADED', TIMESTAMP '2026-04-08 20:00:00', TIMESTAMP '2026-04-09 11:00:00', TRUE, FALSE, TRUE, TRUE, 62, 58, '폼 오류 케이스 테스트가 부족합니다.', '프론트엔드 실습 과제 피드백'),
        ('learner3@devpath.com', 'Next.js 14 제품 개발 실전', '예약 상세 페이지와 SEO 점검표를 제출했습니다.', 'https://github.com/devpath/frontend-next-product-a', FALSE, 'GRADED', TIMESTAMP '2026-04-16 20:00:00', TIMESTAMP '2026-04-16 22:00:00', TRUE, TRUE, TRUE, TRUE, 89, 86, '캐싱 기준 설명이 좋습니다.', 'Next.js 제품 실습 과제 피드백'),
        ('learner2@devpath.com', 'Next.js 14 제품 개발 실전', '인증 처리와 이미지 최적화 내용을 제출했습니다.', 'https://github.com/devpath/frontend-next-product-b', TRUE, 'GRADED', TIMESTAMP '2026-04-10 20:00:00', TIMESTAMP '2026-04-11 10:00:00', TRUE, TRUE, FALSE, TRUE, 71, 64, '메타데이터 누락 항목을 보강해야 합니다.', 'Next.js 제품 실습 과제 피드백'),
        ('learner4@devpath.com', 'Flutter로 MVP 앱 출시하기', '스토어 제출용 MVP 화면과 빌드 체크리스트입니다.', 'https://github.com/devpath/frontend-flutter-mvp-a', FALSE, 'GRADED', TIMESTAMP '2026-04-15 18:00:00', TIMESTAMP '2026-04-16 09:30:00', TRUE, TRUE, TRUE, TRUE, 94, 92, '권한 설명과 빌드 문서가 명확합니다.', 'Flutter MVP 실습 과제 피드백'),
        ('learner3@devpath.com', 'Flutter로 MVP 앱 출시하기', '가입 화면 폼 검증과 API 실패 처리까지 제출했습니다.', 'https://github.com/devpath/frontend-flutter-mvp-b', FALSE, 'GRADED', TIMESTAMP '2026-04-09 22:00:00', TIMESTAMP '2026-04-10 12:00:00', TRUE, FALSE, TRUE, TRUE, 66, 61, '에러 상태 화면을 더 분리하면 좋습니다.', 'Flutter MVP 실습 과제 피드백')
)
SELECT
    a.assignment_id,
    lu.user_id,
    iu.user_id,
    seed.submission_text,
    seed.submission_url,
    seed.is_late,
    seed.submission_status,
    seed.submitted_at,
    seed.graded_at,
    seed.readme_passed,
    seed.test_passed,
    seed.lint_passed,
    seed.file_format_passed,
    seed.quality_score,
    seed.total_score,
    seed.individual_feedback,
    seed.common_feedback,
    FALSE,
    seed.submitted_at,
    seed.graded_at
FROM frontend_submission_seed seed
JOIN users lu ON lu.email = seed.learner_email
JOIN users iu ON iu.email = 'frontend@devpath.com'
JOIN roadmap_nodes rn ON rn.sub_topics = seed.course_title
                   AND rn.node_type = 'ASSIGNMENT'
                   AND rn.title LIKE '[CATALOG]%'
JOIN assignments a ON a.node_id = rn.node_id
WHERE NOT EXISTS (
    SELECT 1
    FROM assignment_submissions s
    WHERE s.assignment_id = a.assignment_id
      AND s.learner_id = lu.user_id
      AND s.submission_url = seed.submission_url
      AND s.is_deleted = FALSE
);

INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content,
    adopted_answer_id, course_id, lecture_timestamp,
    qna_status, view_count, is_deleted, created_at, updated_at
)
WITH frontend_qna_seed(
    learner_email, course_title, template_type, difficulty,
    title, content, lecture_timestamp, view_count, created_at
) AS (
    VALUES
        ('learner@devpath.com', 'React 19 프론트엔드 실전 가이드', 'IMPLEMENTATION', 'MEDIUM', 'Actions와 폼 처리에서 낙관적 업데이트 롤백은 어디에 두나요?', '폼 제출 실패 시 서버 에러 메시지와 로컬 상태를 함께 되돌리는 위치가 헷갈립니다.', '00:12:40', 18, TIMESTAMP '2026-04-14 09:20:00'),
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', 'DEBUGGING', 'HARD', 'Playwright 로그인 플로우 테스트가 CI에서만 실패합니다', '로컬에서는 통과하는데 CI에서 세션 쿠키가 유지되지 않아 다음 화면으로 넘어가지 않습니다.', '00:31:10', 24, TIMESTAMP '2026-04-15 13:10:00'),
        ('learner3@devpath.com', 'React 19 프론트엔드 실전 가이드', 'STUDY', 'EASY', 'Tailwind 유틸리티가 길어질 때 컴포넌트를 어떻게 나누면 좋을까요?', '버튼과 카드에 클래스가 많아졌을 때 어느 기준으로 컴포넌트를 분리해야 하는지 궁금합니다.', '00:18:05', 11, TIMESTAMP '2026-04-16 10:30:00'),
        ('learner4@devpath.com', 'React 19 프론트엔드 실전 가이드', 'CODE_REVIEW', 'MEDIUM', '대시보드 카드 컴포넌트 분리 기준을 봐주세요', '필터 카드와 통계 카드가 props 구조는 비슷한데 스타일이 달라서 같은 컴포넌트로 묶어도 되는지 고민됩니다.', '00:44:20', 7, TIMESTAMP '2026-04-13 18:45:00'),
        ('learner@devpath.com', 'Next.js 14 제품 개발 실전', 'IMPLEMENTATION', 'MEDIUM', '서버 컴포넌트에서 쿠키 기반 인증을 읽는 위치가 궁금합니다', 'layout에서 세션을 읽는 방식과 page 단위로 읽는 방식 중 어떤 기준으로 나누는지 알고 싶습니다.', '00:16:25', 16, TIMESTAMP '2026-04-14 11:40:00'),
        ('learner2@devpath.com', 'Next.js 14 제품 개발 실전', 'STUDY', 'MEDIUM', 'revalidatePath와 router.refresh를 언제 구분해서 쓰나요?', '서버 액션 이후 목록을 갱신할 때 두 방법을 같이 써야 하는지 기준이 애매합니다.', '00:27:50', 21, TIMESTAMP '2026-04-15 16:20:00'),
        ('learner3@devpath.com', 'Next.js 14 제품 개발 실전', 'DEBUGGING', 'HARD', '이미지 최적화 후 LCP가 오히려 느려졌습니다', 'next/image로 바꾼 뒤 첫 화면 이미지가 늦게 표시됩니다. priority와 sizes 설정 기준을 알고 싶습니다.', '00:39:15', 29, TIMESTAMP '2026-04-16 14:00:00'),
        ('learner4@devpath.com', 'Next.js 14 제품 개발 실전', 'PROJECT', 'MEDIUM', '메타데이터 템플릿을 여러 상세 페이지에 공통 적용하고 싶습니다', '제품 상세, 검색 결과, 프로필 페이지에서 title 규칙을 재사용하려면 어느 레이어에 두는 게 좋을까요?', '00:48:30', 9, TIMESTAMP '2026-04-12 20:10:00'),
        ('learner@devpath.com', 'Flutter로 MVP 앱 출시하기', 'STUDY', 'EASY', '상태 관리에서 Riverpod을 꼭 써야 하나요?', '작은 MVP 앱에서도 기본 StatefulWidget만 쓰면 나중에 유지보수가 어려워지는지 궁금합니다.', '00:10:45', 13, TIMESTAMP '2026-04-16 09:10:00'),
        ('learner2@devpath.com', 'Flutter로 MVP 앱 출시하기', 'DEBUGGING', 'MEDIUM', 'Android 빌드에서 권한 안내 문구가 반영되지 않습니다', 'AndroidManifest와 store 설명 문구를 수정했는데 빌드 결과에서 이전 문구가 계속 보입니다.', '00:42:10', 17, TIMESTAMP '2026-04-15 19:20:00'),
        ('learner3@devpath.com', 'Flutter로 MVP 앱 출시하기', 'IMPLEMENTATION', 'MEDIUM', '폼 검증 에러 메시지를 화면마다 재사용하고 싶습니다', '가입, 로그인, 문의 화면에서 같은 검증 규칙을 쓰는데 위젯 분리와 함수 분리 중 어떤 방식이 좋을까요?', '00:21:55', 10, TIMESTAMP '2026-04-14 22:35:00'),
        ('learner4@devpath.com', 'Flutter로 MVP 앱 출시하기', 'PROJECT', 'EASY', '스토어 제출용 권한 설명 문구를 어디서 관리하나요?', '카메라와 파일 접근 권한 설명을 코드와 제출 문서에서 함께 관리하는 방법이 궁금합니다.', '00:55:00', 8, TIMESTAMP '2026-04-13 15:50:00')
)
SELECT
    u.user_id,
    seed.template_type,
    seed.difficulty,
    seed.title,
    seed.content,
    NULL,
    c.course_id,
    seed.lecture_timestamp,
    'UNANSWERED',
    seed.view_count,
    FALSE,
    seed.created_at,
    seed.created_at
FROM frontend_qna_seed seed
JOIN users u ON u.email = seed.learner_email
JOIN courses c ON c.title = seed.course_title
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_questions q
    WHERE q.title = seed.title
      AND q.user_id = u.user_id
      AND q.course_id = c.course_id
);

UPDATE qna_questions q
SET lesson_id = first_lesson.lesson_id
FROM (
    SELECT DISTINCT ON (c.course_id)
        c.course_id,
        l.lesson_id
    FROM courses c
    JOIN course_sections cs ON cs.course_id = c.course_id
    JOIN lessons l ON l.section_id = cs.section_id
    WHERE COALESCE(cs.is_published, TRUE) = TRUE
      AND COALESCE(l.is_published, TRUE) = TRUE
      AND l.lesson_type = 'VIDEO'
    ORDER BY c.course_id, cs.sort_order, l.sort_order, l.lesson_id
) first_lesson
WHERE q.course_id = first_lesson.course_id
  AND q.lesson_id IS NULL
  AND q.lecture_timestamp IS NOT NULL;

INSERT INTO review (
    course_id, learner_id, rating, content, status,
    is_hidden, is_deleted, issue_tags_raw, created_at, updated_at
)
WITH frontend_review_seed(
    learner_email, course_title, rating, content,
    status, is_hidden, issue_tags_raw, created_at
) AS (
    VALUES
        ('learner@devpath.com', 'React 19 프론트엔드 실전 가이드', 5, '상태 위치를 판단하는 기준이 실제 화면 예제로 연결돼서 이해하기 쉬웠습니다.', 'UNANSWERED', FALSE, CAST(NULL AS TEXT), TIMESTAMP '2026-04-16 19:20:00'),
        ('learner2@devpath.com', 'React 19 프론트엔드 실전 가이드', 4, 'Playwright 실습은 좋았는데 예제 코드 버전이 영상과 조금 달라 확인이 필요합니다.', 'UNANSWERED', FALSE, '예제_코드_버전_차이,설명_보강_필요', TIMESTAMP '2026-04-15 21:10:00'),
        ('learner3@devpath.com', 'React 19 프론트엔드 실전 가이드', 3, 'Tailwind 설명 중 화면 캡처와 실제 클래스명이 다른 구간이 있었습니다.', 'UNANSWERED', FALSE, '화면_캡처_불일치', TIMESTAMP '2026-04-14 18:40:00'),
        ('learner4@devpath.com', 'React 19 프론트엔드 실전 가이드', 5, '대시보드 화면을 작은 단위로 나누는 기준이 실무에 바로 적용하기 좋았습니다.', 'UNANSWERED', FALSE, CAST(NULL AS TEXT), TIMESTAMP '2026-04-13 20:25:00'),
        ('learner@devpath.com', 'Next.js 14 제품 개발 실전', 4, '서버 컴포넌트와 캐시 흐름은 좋았고 이미지 최적화 설명이 조금 더 있으면 좋겠습니다.', 'UNANSWERED', FALSE, '이미지_최적화_설명_보강', TIMESTAMP '2026-04-16 12:30:00'),
        ('learner2@devpath.com', 'Next.js 14 제품 개발 실전', 5, 'App Router 기준으로 제품 화면을 끝까지 만드는 흐름이 잘 잡혀 있습니다.', 'UNANSWERED', FALSE, CAST(NULL AS TEXT), TIMESTAMP '2026-04-15 17:50:00'),
        ('learner3@devpath.com', 'Next.js 14 제품 개발 실전', 3, '자료 링크 하나가 열리지 않고 메타데이터 예제 파일 위치가 영상과 달랐습니다.', 'UNANSWERED', FALSE, '링크_오류,자료_업데이트_필요', TIMESTAMP '2026-04-14 23:15:00'),
        ('learner4@devpath.com', 'Next.js 14 제품 개발 실전', 4, '인증과 권한 처리 파트가 실습 중심이라 따라가기 좋았습니다.', 'UNANSWERED', FALSE, CAST(NULL AS TEXT), TIMESTAMP '2026-04-13 13:10:00'),
        ('learner@devpath.com', 'Flutter로 MVP 앱 출시하기', 4, 'MVP 출시 체크리스트가 도움이 됐고 권한 설명 문구 예시가 더 있으면 좋겠습니다.', 'UNANSWERED', FALSE, '앱_권한_설명_보강', TIMESTAMP '2026-04-16 08:40:00'),
        ('learner2@devpath.com', 'Flutter로 MVP 앱 출시하기', 5, '웹 개발자 입장에서 Flutter 앱 구조를 이해하기 쉽게 설명해줍니다.', 'UNANSWERED', FALSE, CAST(NULL AS TEXT), TIMESTAMP '2026-04-15 10:25:00'),
        ('learner3@devpath.com', 'Flutter로 MVP 앱 출시하기', 2, '빌드 환경 버전 차이 때문에 실습이 막혔고 오류 재현 순서가 더 필요합니다.', 'UNANSWERED', FALSE, '빌드_환경_버전_차이,오류_재현_필요', TIMESTAMP '2026-04-14 09:35:00'),
        ('learner4@devpath.com', 'Flutter로 MVP 앱 출시하기', 5, '위젯 분리와 폼 검증 흐름을 짧은 MVP 예제로 익히기 좋았습니다.', 'UNANSWERED', FALSE, CAST(NULL AS TEXT), TIMESTAMP '2026-04-13 19:00:00')
)
SELECT
    c.course_id,
    u.user_id,
    seed.rating,
    seed.content,
    seed.status,
    seed.is_hidden,
    FALSE,
    seed.issue_tags_raw,
    seed.created_at,
    seed.created_at
FROM frontend_review_seed seed
JOIN users u ON u.email = seed.learner_email
JOIN courses c ON c.title = seed.course_title
WHERE NOT EXISTS (
    SELECT 1
    FROM review r
    WHERE r.course_id = c.course_id
      AND r.learner_id = u.user_id
      AND r.is_deleted = FALSE
);

-- [CATALOG] frontend@devpath.com 정산 관리 데이터
INSERT INTO settlement (
    instructor_id, course_id, gross_amount, fee_amount, amount,
    status, is_deleted, purchased_at, settled_at, created_at
)
WITH frontend_settlement_seed(
    course_title, gross_amount, fee_amount, amount,
    status, purchased_at, settled_at, created_at
) AS (
    VALUES
        ('React 19 프론트엔드 실전 가이드', 79000, 15800, 63200, 'COMPLETED', TIMESTAMP '2026-01-08 10:20:00', TIMESTAMP '2026-01-15 11:00:00', TIMESTAMP '2026-01-15 11:00:00'),
        ('Next.js 14 제품 개발 실전', 99000, 19800, 79200, 'COMPLETED', TIMESTAMP '2026-01-18 15:35:00', TIMESTAMP '2026-01-25 10:30:00', TIMESTAMP '2026-01-25 10:30:00'),
        ('React 19 프론트엔드 실전 가이드', 79000, 15800, 63200, 'COMPLETED', TIMESTAMP '2026-02-06 09:40:00', TIMESTAMP '2026-02-13 14:00:00', TIMESTAMP '2026-02-13 14:00:00'),
        ('Flutter로 MVP 앱 출시하기', 69000, 13800, 55200, 'COMPLETED', TIMESTAMP '2026-02-16 20:10:00', TIMESTAMP '2026-02-23 13:20:00', TIMESTAMP '2026-02-23 13:20:00'),
        ('Next.js 14 제품 개발 실전', 99000, 19800, 79200, 'COMPLETED', TIMESTAMP '2026-03-04 11:15:00', TIMESTAMP '2026-03-11 16:10:00', TIMESTAMP '2026-03-11 16:10:00'),
        ('React 19 프론트엔드 실전 가이드', 79000, 15800, 63200, 'COMPLETED', TIMESTAMP '2026-03-19 18:25:00', TIMESTAMP '2026-03-26 10:45:00', TIMESTAMP '2026-03-26 10:45:00'),
        ('Flutter로 MVP 앱 출시하기', 69000, 13800, 55200, 'COMPLETED', TIMESTAMP '2026-04-04 12:30:00', TIMESTAMP '2026-04-11 11:30:00', TIMESTAMP '2026-04-11 11:30:00'),
        ('Next.js 14 제품 개발 실전', 99000, 19800, 79200, 'COMPLETED', TIMESTAMP '2026-04-10 09:15:00', TIMESTAMP '2026-04-16 17:30:00', TIMESTAMP '2026-04-16 17:30:00'),
        ('React 19 프론트엔드 실전 가이드', 79000, 15800, 63200, 'PENDING', TIMESTAMP '2026-04-15 13:20:00', CAST(NULL AS TIMESTAMP), TIMESTAMP '2026-04-15 13:20:00'),
        ('Next.js 14 제품 개발 실전', 99000, 19800, 79200, 'PENDING', TIMESTAMP '2026-04-16 10:05:00', CAST(NULL AS TIMESTAMP), TIMESTAMP '2026-04-16 10:05:00'),
        ('Flutter로 MVP 앱 출시하기', 69000, 13800, 55200, 'PENDING', TIMESTAMP '2026-04-16 17:30:00', CAST(NULL AS TIMESTAMP), TIMESTAMP '2026-04-16 17:30:00'),
        ('Next.js 14 제품 개발 실전', 99000, 19800, 79200, 'HELD', TIMESTAMP '2026-04-13 16:40:00', CAST(NULL AS TIMESTAMP), TIMESTAMP '2026-04-13 16:40:00'),
        ('React 19 프론트엔드 실전 가이드', 79000, 15800, 63200, 'HELD', TIMESTAMP '2026-04-14 19:05:00', CAST(NULL AS TIMESTAMP), TIMESTAMP '2026-04-14 19:05:00')
)
SELECT
    iu.user_id,
    c.course_id,
    seed.gross_amount,
    seed.fee_amount,
    seed.amount,
    seed.status,
    FALSE,
    seed.purchased_at,
    seed.settled_at,
    seed.created_at
FROM frontend_settlement_seed seed
JOIN users iu ON iu.email = 'frontend@devpath.com'
JOIN courses c ON c.title = seed.course_title
WHERE NOT EXISTS (
    SELECT 1
    FROM settlement s
    WHERE s.instructor_id = iu.user_id
      AND s.course_id = c.course_id
      AND s.purchased_at = seed.purchased_at
      AND s.gross_amount = seed.gross_amount
      AND s.is_deleted = FALSE
);

INSERT INTO settlement_hold (
    settlement_id, admin_id, reason, held_at
)
WITH frontend_settlement_hold_seed(
    course_title, purchased_at, reason, held_at
) AS (
    VALUES
        ('Next.js 14 제품 개발 실전', TIMESTAMP '2026-04-13 16:40:00', '환불 문의가 접수되어 정산 확인 중입니다.', TIMESTAMP '2026-04-14 09:30:00'),
        ('React 19 프론트엔드 실전 가이드', TIMESTAMP '2026-04-14 19:05:00', '결제 수단 확인이 필요해 일시 보류되었습니다.', TIMESTAMP '2026-04-15 10:15:00')
)
SELECT
    s.id,
    au.user_id,
    seed.reason,
    seed.held_at
FROM frontend_settlement_hold_seed seed
JOIN users iu ON iu.email = 'frontend@devpath.com'
JOIN users au ON au.email = 'admin@devpath.com'
JOIN courses c ON c.title = seed.course_title
JOIN settlement s ON s.instructor_id = iu.user_id
                 AND s.course_id = c.course_id
                 AND s.purchased_at = seed.purchased_at
                 AND s.status = 'HELD'
                 AND s.is_deleted = FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM settlement_hold sh
    WHERE sh.settlement_id = s.id
);

-- [CATALOG] 사용자 신고 접수 시드 데이터
INSERT INTO moderation_report (
    reporter_user_id,
    target_user_id,
    content_id,
    reason,
    status,
    action_taken,
    resolved_by,
    resolved_at,
    created_at
)
SELECT
    reporter.user_id,
    target.user_id,
    NULL,
    '프로젝트 채팅에서 반복적인 비방 메시지를 보냈습니다.',
    'PENDING',
    NULL,
    NULL,
    NULL,
    TIMESTAMP '2026-04-15 09:20:00'
FROM users reporter
JOIN users target ON target.email = 'learner3@devpath.com'
WHERE reporter.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM moderation_report mr
      WHERE mr.reporter_user_id = reporter.user_id
        AND mr.target_user_id = target.user_id
        AND mr.content_id IS NULL
        AND mr.reason = '프로젝트 채팅에서 반복적인 비방 메시지를 보냈습니다.'
  );

INSERT INTO moderation_report (
    reporter_user_id,
    target_user_id,
    content_id,
    reason,
    status,
    action_taken,
    resolved_by,
    resolved_at,
    created_at
)
SELECT
    reporter.user_id,
    author.user_id,
    r.id,
    '수강 후기 내용에 개인 연락처가 그대로 노출되어 있습니다.',
    'PENDING',
    NULL,
    NULL,
    NULL,
    TIMESTAMP '2026-04-15 14:10:00'
FROM users reporter
JOIN users author ON author.email = 'learner2@devpath.com'
JOIN courses c ON c.title = 'React 19 프론트엔드 실전 가이드'
JOIN review r ON r.course_id = c.course_id
             AND r.learner_id = author.user_id
             AND r.is_deleted = FALSE
WHERE reporter.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM moderation_report mr
      WHERE mr.reporter_user_id = reporter.user_id
        AND mr.content_id = r.id
        AND mr.reason = '수강 후기 내용에 개인 연락처가 그대로 노출되어 있습니다.'
  );

INSERT INTO moderation_report (
    reporter_user_id,
    target_user_id,
    content_id,
    reason,
    status,
    action_taken,
    resolved_by,
    resolved_at,
    created_at
)
SELECT
    reporter.user_id,
    author.user_id,
    r.id,
    '후기 문구가 강의와 무관한 외부 홍보성 내용으로 보입니다.',
    'PENDING',
    NULL,
    NULL,
    NULL,
    TIMESTAMP '2026-04-16 11:45:00'
FROM users reporter
JOIN users author ON author.email = 'learner3@devpath.com'
JOIN courses c ON c.title = 'Flutter로 MVP 앱 출시하기'
JOIN review r ON r.course_id = c.course_id
             AND r.learner_id = author.user_id
             AND r.is_deleted = FALSE
WHERE reporter.email = 'learner2@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM moderation_report mr
      WHERE mr.reporter_user_id = reporter.user_id
        AND mr.content_id = r.id
        AND mr.reason = '후기 문구가 강의와 무관한 외부 홍보성 내용으로 보입니다.'
  );

INSERT INTO moderation_report (
    reporter_user_id,
    target_user_id,
    content_id,
    reason,
    status,
    action_taken,
    resolved_by,
    resolved_at,
    created_at
)
SELECT
    reporter.user_id,
    target.user_id,
    NULL,
    '프로필 소개에 외부 연락처 유도가 반복되어 관리자 검토 후 경고 처리했습니다.',
    'RESOLVED',
    'WARNING',
    admin_user.user_id,
    TIMESTAMP '2026-04-14 18:20:00',
    TIMESTAMP '2026-04-14 12:00:00'
FROM users reporter
JOIN users target ON target.email = 'frontend@devpath.com'
JOIN users admin_user ON admin_user.email = 'admin@devpath.com'
WHERE reporter.email = 'learner3@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM moderation_report mr
      WHERE mr.reporter_user_id = reporter.user_id
        AND mr.target_user_id = target.user_id
        AND mr.content_id IS NULL
        AND mr.reason = '프로필 소개에 외부 연락처 유도가 반복되어 관리자 검토 후 경고 처리했습니다.'
  );
-- ============================================================
-- 로드맵 허브 기본 구성
-- ============================================================
WITH roadmap_hub_official_seed(title) AS (
    VALUES
        ('Full Stack'),
        ('DevOps'),
        ('DevSecOps'),
        ('Data Analyst'),
        ('AI Engineer'),
        ('AI and Data Scientist'),
        ('Data Engineer'),
        ('Android'),
        ('Machine Learning'),
        ('PostgreSQL'),
        ('iOS'),
        ('Blockchain'),
        ('QA'),
        ('Software Architect'),
        ('Cyber Security'),
        ('UX Design'),
        ('Technical Writer'),
        ('Game Developer'),
        ('Server Side Game Developer'),
        ('MLOps'),
        ('Product Manager'),
        ('Engineering Manager'),
        ('Developer Relations'),
        ('BI Analyst'),
        ('SQL'),
        ('Computer Science'),
        ('React'),
        ('Vue'),
        ('Angular'),
        ('JavaScript'),
        ('TypeScript'),
        ('Node.js'),
        ('Python'),
        ('System Design'),
        ('Java'),
        ('ASP.NET Core'),
        ('API Design'),
        ('Spring Boot'),
        ('Flutter'),
        ('C++'),
        ('Rust'),
        ('Go Roadmap'),
        ('Design and Architecture'),
        ('GraphQL'),
        ('React Native'),
        ('Design System'),
        ('Prompt Engineering'),
        ('MongoDB'),
        ('Linux'),
        ('Kubernetes'),
        ('Docker'),
        ('AWS'),
        ('Terraform'),
        ('Data Structures & Algorithms'),
        ('Redis'),
        ('Git and GitHub'),
        ('PHP'),
        ('Cloudflare'),
        ('AI Red Teaming'),
        ('AI Agents'),
        ('Next.js'),
        ('Code Review'),
        ('Kotlin'),
        ('HTML'),
        ('CSS'),
        ('Swift & Swift UI'),
        ('Shell / Bash'),
        ('Laravel'),
        ('Elasticsearch'),
        ('WordPress'),
        ('Django'),
        ('Ruby'),
        ('Ruby on Rails'),
        ('Claude Code'),
        ('Vibe Coding'),
        ('Scala'),
        ('OpenClaw')
)
INSERT INTO roadmaps (creator_id, title, description, is_official, is_public, is_deleted, created_at)
SELECT
    admin_user.user_id,
    seed.title,
    CONCAT(seed.title, ' 학습 흐름을 담은 DevPath 공식 로드맵입니다.'),
    TRUE,
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP
FROM roadmap_hub_official_seed seed
JOIN users admin_user ON admin_user.email = 'admin@devpath.com'
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmaps roadmap
    WHERE roadmap.title = seed.title
);

DELETE FROM roadmap_hub_items
WHERE section_id IN (
    SELECT id
    FROM roadmap_hub_sections
    WHERE section_key IN ('project-ideas', 'best-practices')
);

DELETE FROM roadmap_hub_sections
WHERE section_key IN ('project-ideas', 'best-practices');

WITH roadmap_hub_section_seed(section_key, title, description, layout_type, sort_order, is_active) AS (
    VALUES
        ('role-based', '직무별 학습 로드맵', '직무별 학습 로드맵 허브 구성입니다.', 'CARD_GRID', 0, TRUE),
        ('skill-based', '기술별 학습 로드맵', '기술별 학습 로드맵 허브 구성입니다.', 'CHIP_GRID', 1, TRUE)
)
INSERT INTO roadmap_hub_sections (section_key, title, description, layout_type, sort_order, is_active)
SELECT seed.section_key, seed.title, seed.description, seed.layout_type, seed.sort_order, seed.is_active
FROM roadmap_hub_section_seed seed
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_hub_sections section_item
    WHERE section_item.section_key = seed.section_key
);

UPDATE roadmap_hub_sections
SET
    title = CASE section_key
        WHEN 'role-based' THEN '직무별 학습 로드맵'
        WHEN 'skill-based' THEN '기술별 학습 로드맵'
        ELSE title
    END,
    description = CASE section_key
        WHEN 'role-based' THEN '직무별 학습 로드맵 허브 구성입니다.'
        WHEN 'skill-based' THEN '기술별 학습 로드맵 허브 구성입니다.'
        ELSE description
    END
WHERE section_key IN ('role-based', 'skill-based');

WITH roadmap_hub_item_seed(
    section_key,
    item_title,
    subtitle,
    icon_class,
    linked_roadmap_title,
    is_featured,
    sort_order,
    is_active
) AS (
    VALUES
        ('role-based', '프론트엔드', 'Frontend', 'fas fa-desktop', 'Frontend Entry Roadmap', FALSE, 0, TRUE),
        ('role-based', '백엔드', 'Backend', 'fas fa-server', 'Backend Master Roadmap', TRUE, 1, TRUE),
        ('role-based', '풀스택', 'Full Stack', 'fas fa-layer-group', 'Full Stack', FALSE, 2, TRUE),
        ('role-based', '데브옵스', 'DevOps', 'fas fa-infinity', 'DevOps', TRUE, 3, TRUE),
        ('role-based', '데브섹옵스', 'DevSecOps', 'fas fa-shield-halved', 'DevSecOps', FALSE, 4, TRUE),
        ('role-based', '데이터 분석가', 'Data Analyst', 'fas fa-chart-line', 'Data Analyst', FALSE, 5, TRUE),
        ('role-based', 'AI 엔지니어', 'AI Engineer', 'fas fa-brain', 'AI Engineer', TRUE, 6, TRUE),
        ('role-based', 'AI·데이터 사이언티스트', 'AI and Data Scientist', 'fas fa-atom', 'AI and Data Scientist', FALSE, 7, TRUE),
        ('role-based', '데이터 엔지니어', 'Data Engineer', 'fas fa-database', 'Data Engineer', FALSE, 8, TRUE),
        ('role-based', '안드로이드', 'Android', 'fab fa-android', 'Android', FALSE, 9, TRUE),
        ('role-based', '머신러닝', 'Machine Learning', 'fas fa-microchip', 'Machine Learning', FALSE, 10, TRUE),
        ('role-based', 'PostgreSQL 전문가', 'PostgreSQL', 'fas fa-database', 'PostgreSQL', FALSE, 11, TRUE),
        ('role-based', 'iOS 개발자', 'iOS', 'fab fa-apple', 'iOS', FALSE, 12, TRUE),
        ('role-based', '블록체인', 'Blockchain', 'fas fa-link', 'Blockchain', FALSE, 13, TRUE),
        ('role-based', 'QA 엔지니어', 'QA', 'fas fa-vial', 'QA', FALSE, 14, TRUE),
        ('role-based', '소프트웨어 아키텍트', 'Software Architect', 'fas fa-sitemap', 'Software Architect', FALSE, 15, TRUE),
        ('role-based', '사이버 보안', 'Cyber Security', 'fas fa-user-shield', 'Cyber Security', TRUE, 16, TRUE),
        ('role-based', 'UX 디자인', 'UX Design', 'fas fa-bezier-curve', 'UX Design', FALSE, 17, TRUE),
        ('role-based', '테크니컬 라이터', 'Technical Writer', 'fas fa-pen-fancy', 'Technical Writer', FALSE, 18, TRUE),
        ('role-based', '게임 개발자', 'Game Developer', 'fas fa-gamepad', 'Game Developer', FALSE, 19, TRUE),
        ('role-based', '서버 사이드 게임 개발자', 'Server Side Game Developer', 'fas fa-dice-d20', 'Server Side Game Developer', FALSE, 20, TRUE),
        ('role-based', 'MLOps 엔지니어', 'MLOps', 'fas fa-gears', 'MLOps', TRUE, 21, TRUE),
        ('role-based', '프로덕트 매니저', 'Product Manager', 'fas fa-clipboard-list', 'Product Manager', FALSE, 22, TRUE),
        ('role-based', '엔지니어링 매니저', 'Engineering Manager', 'fas fa-users', 'Engineering Manager', FALSE, 23, TRUE),
        ('role-based', '데브렐', 'Developer Relations', 'fas fa-bullhorn', 'Developer Relations', FALSE, 24, TRUE),
        ('role-based', 'BI 분석가', 'BI Analyst', 'fas fa-chart-pie', 'BI Analyst', FALSE, 25, TRUE),
        ('skill-based', 'SQL', NULL, 'fas fa-database', 'SQL', FALSE, 0, TRUE),
        ('skill-based', 'Computer Science', NULL, 'fas fa-microchip', 'Computer Science', FALSE, 1, TRUE),
        ('skill-based', 'React', NULL, 'fab fa-react', 'React', FALSE, 2, TRUE),
        ('skill-based', 'Vue', NULL, 'fab fa-vuejs', 'Vue', FALSE, 3, TRUE),
        ('skill-based', 'Angular', NULL, 'fab fa-angular', 'Angular', FALSE, 4, TRUE),
        ('skill-based', 'JavaScript', NULL, 'fab fa-js', 'JavaScript', FALSE, 5, TRUE),
        ('skill-based', 'TypeScript', NULL, 'devpath-tech-icon devpath-icon-ts', 'TypeScript', FALSE, 6, TRUE),
        ('skill-based', 'Node.js', NULL, 'fab fa-node-js', 'Node.js', FALSE, 7, TRUE),
        ('skill-based', 'Python', NULL, 'fab fa-python', 'Python', FALSE, 8, TRUE),
        ('skill-based', 'System Design', NULL, 'fas fa-sitemap', 'System Design', FALSE, 9, TRUE),
        ('skill-based', 'Java', NULL, 'fab fa-java', 'Java', FALSE, 10, TRUE),
        ('skill-based', 'ASP.NET Core', NULL, 'fab fa-microsoft', 'ASP.NET Core', FALSE, 11, TRUE),
        ('skill-based', 'API Design', NULL, 'fas fa-plug', 'API Design', FALSE, 12, TRUE),
        ('skill-based', 'Spring Boot', NULL, 'fas fa-leaf', 'Spring Boot', FALSE, 13, TRUE),
        ('skill-based', 'Flutter', NULL, 'fas fa-mobile-alt', 'Flutter', FALSE, 14, TRUE),
        ('skill-based', 'C++', NULL, 'fas fa-code', 'C++', FALSE, 15, TRUE),
        ('skill-based', 'Rust', NULL, 'fab fa-rust', 'Rust', FALSE, 16, TRUE),
        ('skill-based', 'Go Roadmap', NULL, 'devpath-tech-icon devpath-icon-go', 'Go Roadmap', FALSE, 17, TRUE),
        ('skill-based', 'Design and Architecture', NULL, 'fas fa-drafting-compass', 'Design and Architecture', FALSE, 18, TRUE),
        ('skill-based', 'GraphQL', NULL, 'fas fa-project-diagram', 'GraphQL', FALSE, 19, TRUE),
        ('skill-based', 'React Native', NULL, 'fab fa-react', 'React Native', FALSE, 20, TRUE),
        ('skill-based', 'Design System', NULL, 'fas fa-palette', 'Design System', FALSE, 21, TRUE),
        ('skill-based', 'Prompt Engineering', NULL, 'fas fa-magic', 'Prompt Engineering', FALSE, 22, TRUE),
        ('skill-based', 'MongoDB', NULL, 'fas fa-leaf', 'MongoDB', FALSE, 23, TRUE),
        ('skill-based', 'Linux', NULL, 'fab fa-linux', 'Linux', FALSE, 24, TRUE),
        ('skill-based', 'Kubernetes', NULL, 'fas fa-dharmachakra', 'Kubernetes', FALSE, 25, TRUE),
        ('skill-based', 'Docker', NULL, 'fab fa-docker', 'Docker', FALSE, 26, TRUE),
        ('skill-based', 'AWS', NULL, 'fab fa-aws', 'AWS', FALSE, 27, TRUE),
        ('skill-based', 'Terraform', NULL, 'fas fa-cubes', 'Terraform', FALSE, 28, TRUE),
        ('skill-based', 'Data Structures & Algorithms', NULL, 'fas fa-project-diagram', 'Data Structures & Algorithms', FALSE, 29, TRUE),
        ('skill-based', 'Redis', NULL, 'fas fa-memory', 'Redis', FALSE, 30, TRUE),
        ('skill-based', 'Git and GitHub', NULL, 'fab fa-github', 'Git and GitHub', FALSE, 31, TRUE),
        ('skill-based', 'PHP', NULL, 'fab fa-php', 'PHP', FALSE, 32, TRUE),
        ('skill-based', 'Cloudflare', NULL, 'fab fa-cloudflare', 'Cloudflare', FALSE, 33, TRUE),
        ('skill-based', 'AI Red Teaming', NULL, 'fas fa-shield-alt', 'AI Red Teaming', FALSE, 34, TRUE),
        ('skill-based', 'AI Agents', NULL, 'fas fa-robot', 'AI Agents', FALSE, 35, TRUE),
        ('skill-based', 'Next.js', NULL, 'devpath-tech-icon devpath-icon-next', 'Next.js', FALSE, 36, TRUE),
        ('skill-based', 'Code Review', NULL, 'fas fa-code-branch', 'Code Review', FALSE, 37, TRUE),
        ('skill-based', 'Kotlin', NULL, 'devpath-tech-icon devpath-icon-kotlin', 'Kotlin', FALSE, 38, TRUE),
        ('skill-based', 'HTML', NULL, 'fab fa-html5', 'HTML', FALSE, 39, TRUE),
        ('skill-based', 'CSS', NULL, 'fab fa-css3-alt', 'CSS', FALSE, 40, TRUE),
        ('skill-based', 'Swift & Swift UI', NULL, 'fab fa-swift', 'Swift & Swift UI', FALSE, 41, TRUE),
        ('skill-based', 'Shell / Bash', NULL, 'devpath-tech-icon devpath-icon-bash', 'Shell / Bash', FALSE, 42, TRUE),
        ('skill-based', 'Laravel', NULL, 'fab fa-laravel', 'Laravel', FALSE, 43, TRUE),
        ('skill-based', 'Elasticsearch', NULL, 'fas fa-search', 'Elasticsearch', FALSE, 44, TRUE),
        ('skill-based', 'WordPress', NULL, 'fab fa-wordpress', 'WordPress', FALSE, 45, TRUE),
        ('skill-based', 'Django', NULL, 'fab fa-python', 'Django', FALSE, 46, TRUE),
        ('skill-based', 'Ruby', NULL, 'fas fa-gem', 'Ruby', FALSE, 47, TRUE),
        ('skill-based', 'Ruby on Rails', NULL, 'fas fa-train', 'Ruby on Rails', FALSE, 48, TRUE),
        ('skill-based', 'Claude Code', NULL, 'devpath-tech-icon devpath-icon-claude', 'Claude Code', FALSE, 49, TRUE),
        ('skill-based', 'Vibe Coding', NULL, 'fas fa-star', 'Vibe Coding', FALSE, 50, TRUE),
        ('skill-based', 'Scala', NULL, 'fas fa-layer-group', 'Scala', FALSE, 51, TRUE),
        ('skill-based', 'OpenClaw', NULL, 'devpath-tech-icon devpath-icon-openclaw', 'OpenClaw', FALSE, 52, TRUE)
)
INSERT INTO roadmap_hub_items (
    section_id,
    title,
    subtitle,
    icon_class,
    linked_roadmap_id,
    sort_order,
    is_active,
    is_featured
)
SELECT
    section_item.id,
    seed.item_title,
    seed.subtitle,
    seed.icon_class,
    roadmap.roadmap_id,
    seed.sort_order,
    seed.is_active,
    seed.is_featured
FROM roadmap_hub_item_seed seed
JOIN roadmap_hub_sections section_item
    ON section_item.section_key = seed.section_key
LEFT JOIN roadmaps roadmap
    ON roadmap.title = seed.linked_roadmap_title
   AND roadmap.is_official = TRUE
   AND roadmap.is_deleted = FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_hub_items item
    WHERE item.section_id = section_item.id
      AND (
          item.title = seed.item_title
          OR (seed.subtitle IS NOT NULL AND item.subtitle = seed.subtitle)
      )
);

WITH roadmap_hub_skill_icon_seed(item_title, icon_class) AS (
    VALUES
        ('SQL', 'fas fa-database'),
        ('Computer Science', 'fas fa-microchip'),
        ('React', 'fab fa-react'),
        ('Vue', 'fab fa-vuejs'),
        ('Angular', 'fab fa-angular'),
        ('JavaScript', 'fab fa-js'),
        ('TypeScript', 'devpath-tech-icon devpath-icon-ts'),
        ('Node.js', 'fab fa-node-js'),
        ('Python', 'fab fa-python'),
        ('System Design', 'fas fa-sitemap'),
        ('Java', 'fab fa-java'),
        ('ASP.NET Core', 'fab fa-microsoft'),
        ('API Design', 'fas fa-plug'),
        ('Spring Boot', 'fas fa-leaf'),
        ('Flutter', 'fas fa-mobile-alt'),
        ('C++', 'fas fa-code'),
        ('Rust', 'fab fa-rust'),
        ('Go Roadmap', 'devpath-tech-icon devpath-icon-go'),
        ('Design and Architecture', 'fas fa-drafting-compass'),
        ('GraphQL', 'fas fa-project-diagram'),
        ('React Native', 'fab fa-react'),
        ('Design System', 'fas fa-palette'),
        ('Prompt Engineering', 'fas fa-magic'),
        ('MongoDB', 'fas fa-leaf'),
        ('Linux', 'fab fa-linux'),
        ('Kubernetes', 'fas fa-dharmachakra'),
        ('Docker', 'fab fa-docker'),
        ('AWS', 'fab fa-aws'),
        ('Terraform', 'fas fa-cubes'),
        ('Data Structures & Algorithms', 'fas fa-project-diagram'),
        ('Redis', 'fas fa-memory'),
        ('Git and GitHub', 'fab fa-github'),
        ('PHP', 'fab fa-php'),
        ('Cloudflare', 'fab fa-cloudflare'),
        ('AI Red Teaming', 'fas fa-shield-alt'),
        ('AI Agents', 'fas fa-robot'),
        ('Next.js', 'devpath-tech-icon devpath-icon-next'),
        ('Code Review', 'fas fa-code-branch'),
        ('Kotlin', 'devpath-tech-icon devpath-icon-kotlin'),
        ('HTML', 'fab fa-html5'),
        ('CSS', 'fab fa-css3-alt'),
        ('Swift & Swift UI', 'fab fa-swift'),
        ('Shell / Bash', 'devpath-tech-icon devpath-icon-bash'),
        ('Laravel', 'fab fa-laravel'),
        ('Elasticsearch', 'fas fa-search'),
        ('WordPress', 'fab fa-wordpress'),
        ('Django', 'fab fa-python'),
        ('Ruby', 'fas fa-gem'),
        ('Ruby on Rails', 'fas fa-train'),
        ('Claude Code', 'devpath-tech-icon devpath-icon-claude'),
        ('Vibe Coding', 'fas fa-star'),
        ('Scala', 'fas fa-layer-group'),
        ('OpenClaw', 'devpath-tech-icon devpath-icon-openclaw')
)
UPDATE roadmap_hub_items item
SET icon_class = seed.icon_class
FROM roadmap_hub_skill_icon_seed seed
JOIN roadmap_hub_sections section_item
    ON section_item.section_key = 'skill-based'
WHERE item.section_id = section_item.id
  AND item.title = seed.item_title;

WITH roadmap_hub_item_color_seed(section_key, item_title, subtitle, icon_color) AS (
    VALUES
        ('role-based', NULL, 'Frontend', '#38BDF8'),
        ('role-based', NULL, 'Backend', '#00C471'),
        ('role-based', NULL, 'Full Stack', '#8B5CF6'),
        ('role-based', NULL, 'DevOps', '#F59E0B'),
        ('role-based', NULL, 'DevSecOps', '#EF4444'),
        ('role-based', NULL, 'Data Analyst', '#06B6D4'),
        ('role-based', NULL, 'AI Engineer', '#A855F7'),
        ('role-based', NULL, 'AI and Data Scientist', '#6366F1'),
        ('role-based', NULL, 'Data Engineer', '#0EA5E9'),
        ('role-based', NULL, 'Android', '#3DDC84'),
        ('role-based', NULL, 'Machine Learning', '#F97316'),
        ('role-based', NULL, 'PostgreSQL', '#336791'),
        ('role-based', NULL, 'iOS', '#111827'),
        ('role-based', NULL, 'Blockchain', '#F7931A'),
        ('role-based', NULL, 'QA', '#14B8A6'),
        ('role-based', NULL, 'Software Architect', '#64748B'),
        ('role-based', NULL, 'Cyber Security', '#DC2626'),
        ('role-based', NULL, 'UX Design', '#EC4899'),
        ('role-based', NULL, 'Technical Writer', '#475569'),
        ('role-based', NULL, 'Game Developer', '#7C3AED'),
        ('role-based', NULL, 'Server Side Game Developer', '#2563EB'),
        ('role-based', NULL, 'MLOps', '#22C55E'),
        ('role-based', NULL, 'Product Manager', '#F59E0B'),
        ('role-based', NULL, 'Engineering Manager', '#0F766E'),
        ('role-based', NULL, 'Developer Relations', '#EAB308'),
        ('role-based', NULL, 'BI Analyst', '#0284C7'),
        ('skill-based', 'SQL', NULL, '#336791'),
        ('skill-based', 'Computer Science', NULL, '#64748B'),
        ('skill-based', 'React', NULL, '#61DAFB'),
        ('skill-based', 'Vue', NULL, '#42B883'),
        ('skill-based', 'Angular', NULL, '#DD0031'),
        ('skill-based', 'JavaScript', NULL, '#F7DF1E'),
        ('skill-based', 'TypeScript', NULL, '#3178C6'),
        ('skill-based', 'Node.js', NULL, '#339933'),
        ('skill-based', 'Python', NULL, '#3776AB'),
        ('skill-based', 'System Design', NULL, '#475569'),
        ('skill-based', 'Java', NULL, '#F89820'),
        ('skill-based', 'ASP.NET Core', NULL, '#512BD4'),
        ('skill-based', 'API Design', NULL, '#F97316'),
        ('skill-based', 'Spring Boot', NULL, '#6DB33F'),
        ('skill-based', 'Flutter', NULL, '#02569B'),
        ('skill-based', 'C++', NULL, '#00599C'),
        ('skill-based', 'Rust', NULL, '#DEA584'),
        ('skill-based', 'Go Roadmap', NULL, '#00ADD8'),
        ('skill-based', 'Design and Architecture', NULL, '#8B5CF6'),
        ('skill-based', 'GraphQL', NULL, '#E10098'),
        ('skill-based', 'React Native', NULL, '#61DAFB'),
        ('skill-based', 'Design System', NULL, '#EC4899'),
        ('skill-based', 'Prompt Engineering', NULL, '#8B5CF6'),
        ('skill-based', 'MongoDB', NULL, '#47A248'),
        ('skill-based', 'Linux', NULL, '#FCC624'),
        ('skill-based', 'Kubernetes', NULL, '#326CE5'),
        ('skill-based', 'Docker', NULL, '#2496ED'),
        ('skill-based', 'AWS', NULL, '#FF9900'),
        ('skill-based', 'Terraform', NULL, '#7B42BC'),
        ('skill-based', 'Data Structures & Algorithms', NULL, '#0EA5E9'),
        ('skill-based', 'Redis', NULL, '#DC382D'),
        ('skill-based', 'Git and GitHub', NULL, '#181717'),
        ('skill-based', 'PHP', NULL, '#777BB4'),
        ('skill-based', 'Cloudflare', NULL, '#F38020'),
        ('skill-based', 'AI Red Teaming', NULL, '#EF4444'),
        ('skill-based', 'AI Agents', NULL, '#9333EA'),
        ('skill-based', 'Next.js', NULL, '#111827'),
        ('skill-based', 'Code Review', NULL, '#10B981'),
        ('skill-based', 'Kotlin', NULL, '#7F52FF'),
        ('skill-based', 'HTML', NULL, '#E34F26'),
        ('skill-based', 'CSS', NULL, '#1572B6'),
        ('skill-based', 'Swift & Swift UI', NULL, '#FA7343'),
        ('skill-based', 'Shell / Bash', NULL, '#4EAA25'),
        ('skill-based', 'Laravel', NULL, '#FF2D20'),
        ('skill-based', 'Elasticsearch', NULL, '#005571'),
        ('skill-based', 'WordPress', NULL, '#21759B'),
        ('skill-based', 'Django', NULL, '#092E20'),
        ('skill-based', 'Ruby', NULL, '#CC342D'),
        ('skill-based', 'Ruby on Rails', NULL, '#CC0000'),
        ('skill-based', 'Claude Code', NULL, '#D97757'),
        ('skill-based', 'Vibe Coding', NULL, '#F59E0B'),
        ('skill-based', 'Scala', NULL, '#DC322F'),
        ('skill-based', 'OpenClaw', NULL, '#0F172A')
)
UPDATE roadmap_hub_items item
SET icon_color = seed.icon_color
FROM roadmap_hub_item_color_seed seed
JOIN roadmap_hub_sections section_item
    ON section_item.section_key = seed.section_key
WHERE item.section_id = section_item.id
  AND (
      (seed.item_title IS NOT NULL AND item.title = seed.item_title)
      OR (seed.subtitle IS NOT NULL AND item.subtitle = seed.subtitle)
  );

UPDATE roadmap_hub_items item
SET
    title = CASE item.subtitle
        WHEN 'Frontend' THEN '프론트엔드'
        WHEN 'Backend' THEN '백엔드'
        WHEN 'Full Stack' THEN '풀스택'
        WHEN 'DevOps' THEN '데브옵스'
        WHEN 'DevSecOps' THEN '데브섹옵스'
        WHEN 'Data Analyst' THEN '데이터 분석가'
        WHEN 'AI Engineer' THEN 'AI 엔지니어'
        WHEN 'AI and Data Scientist' THEN 'AI·데이터 사이언티스트'
        WHEN 'Data Engineer' THEN '데이터 엔지니어'
        WHEN 'Android' THEN '안드로이드'
        WHEN 'Machine Learning' THEN '머신러닝'
        WHEN 'PostgreSQL' THEN 'PostgreSQL 전문가'
        WHEN 'iOS' THEN 'iOS 개발자'
        WHEN 'Blockchain' THEN '블록체인'
        WHEN 'QA' THEN 'QA 엔지니어'
        WHEN 'Software Architect' THEN '소프트웨어 아키텍트'
        WHEN 'Cyber Security' THEN '사이버 보안'
        WHEN 'UX Design' THEN 'UX 디자인'
        WHEN 'Technical Writer' THEN '테크니컬 라이터'
        WHEN 'Game Developer' THEN '게임 개발자'
        WHEN 'Server Side Game Developer' THEN '서버 사이드 게임 개발자'
        WHEN 'MLOps' THEN 'MLOps 엔지니어'
        WHEN 'Product Manager' THEN '프로덕트 매니저'
        WHEN 'Engineering Manager' THEN '엔지니어링 매니저'
        WHEN 'Developer Relations' THEN '데브렐'
        WHEN 'BI Analyst' THEN 'BI 분석가'
        ELSE item.title
    END,
    is_featured = CASE
        WHEN item.subtitle IN ('Backend', 'AI Engineer', 'DevOps', 'MLOps', 'Cyber Security') THEN TRUE
        ELSE FALSE
    END
FROM roadmap_hub_sections section_item
WHERE item.section_id = section_item.id
  AND section_item.section_key = 'role-based';

-- ============================================================
-- Roadmap Hub 공식 로드맵 상세 데이터 보강
-- - Backend Master Roadmap은 위쪽의 전용 상세 seed를 유지한다.
-- - 허브에 연결된 나머지 공식 로드맵은 분야별 profile을 기준으로 소개/노드/분기/선수조건/태그를 생성한다.
-- ============================================================
DROP TABLE IF EXISTS roadmap_hub_node_profile_seed;
DROP TABLE IF EXISTS roadmap_hub_node_detail_seed;

CREATE TEMPORARY TABLE roadmap_hub_node_profile_seed (
    display_name VARCHAR(120) PRIMARY KEY,
    intro_topic TEXT NOT NULL,
    core_topic TEXT NOT NULL,
    tool_topic TEXT NOT NULL,
    practice_topic TEXT NOT NULL,
    model_topic TEXT NOT NULL,
    quality_topic TEXT NOT NULL,
    perf_topic TEXT NOT NULL,
    ops_topic TEXT NOT NULL,
    arch_topic TEXT NOT NULL,
    security_topic TEXT NOT NULL,
    project_topic TEXT NOT NULL
);

INSERT INTO roadmap_hub_node_profile_seed (
    display_name,
    intro_topic,
    core_topic,
    tool_topic,
    practice_topic,
    model_topic,
    quality_topic,
    perf_topic,
    ops_topic,
    arch_topic,
    security_topic,
    project_topic
) VALUES
    ('Frontend', '브라우저 화면 구현과 사용자 흐름', 'HTML CSS JavaScript 렌더링', 'Vite React DevTools 브라우저 디버거', '반응형 UI와 폼 검증', '클라이언트 상태 서버 상태 라우팅', '접근성 웹 성능 크로스브라우징', '번들 크기와 렌더링 비용', '정적 배포와 프리뷰 환경', '컴포넌트 계층과 디자인 시스템', 'XSS 입력 검증 토큰 저장', 'API 연동 대시보드 화면'),
    ('Full Stack', '화면 API 데이터 저장소를 연결하는 제품 전체 흐름', 'HTTP 인증 UI 상태 데이터 모델링', 'React Spring Boot PostgreSQL Docker GitHub Actions', '로그인 CRUD 관리자 화면 통합 구현', '도메인 엔티티 API 계약 클라이언트 캐시', '단위 통합 E2E 테스트와 장애 로그', 'API 응답 시간 프론트 렌더링 DB 인덱스', '컨테이너 배포 CI 파이프라인 환경 분리', '계층형 구조 모듈 경계 프론트 백엔드 계약', '인증 인가 세션 토큰 민감 정보 보호', '풀스택 서비스 MVP와 배포 링크'),
    ('DevOps', '개발과 운영 사이 배포 흐름을 자동화하는 책임', 'CI CD 인프라 모니터링 장애 대응', 'GitHub Actions Docker Kubernetes Terraform Prometheus', '빌드 테스트 이미지 배포 파이프라인 구축', '환경 변수 시크릿 배포 전략 인프라 상태', '재현 가능한 배포 롤백 헬스체크', '배포 시간 리소스 사용량 스케일링 지표', '알림 로그 메트릭 백업 복구 절차', '클러스터 네트워크 서비스 디스커버리 구성', '시크릿 관리 권한 분리 이미지 취약점 점검', '컨테이너 서비스 CI CD와 모니터링'),
    ('DevSecOps', '보안을 개발 배포 운영 흐름 안에 넣는 책임', '위협 모델링 SAST DAST 시크릿 관리', 'GitHub Advanced Security Trivy OWASP ZAP Vault', '취약점 스캔이 포함된 배포 파이프라인', '보안 정책 예외 승인 감사 로그', '보안 게이트 오탐 관리 규정 준수', '스캔 시간과 릴리스 차단 기준 조율', '취약점 알림 패치 추적 사고 대응', '제로 트러스트 네트워크 권한 최소화', '공급망 보안 의존성 서명 SBOM', '보안 검사가 포함된 서비스 배포 흐름'),
    ('Data Analyst', '비즈니스 질문을 데이터 지표로 바꾸는 분석 흐름', 'SQL 통계 지표 정의 코호트 분석', 'SQL BI 도구 스프레드시트 Python 노트북', '매출 전환 리텐션 대시보드 작성', '이벤트 로그 차원 측정값 데이터 마트', '지표 검증 결측치 이상치 재현성', '쿼리 비용과 대시보드 로딩 시간', '정기 리포트 자동 갱신 권한 관리', '분석 데이터 모델과 지표 사전', '개인정보 마스킹 접근 권한', '제품 개선 의사결정 분석 리포트'),
    ('AI Engineer', 'AI 모델을 제품 기능으로 연결하는 엔지니어링 흐름', '모델 추론 벡터 검색 프롬프트 API', 'Python FastAPI LangChain 벡터DB Docker', '문서 질의응답 챗봇 기능 구현', '임베딩 청크 메타데이터 프롬프트 상태', '정답 품질 평가 hallucination 테스트', '추론 지연 토큰 비용 캐시 전략', '모델 서빙 로그 관찰 프롬프트 버전 관리', 'RAG 파이프라인 에이전트 도구 호출 구조', '프롬프트 주입 데이터 유출 안전장치', '운영 가능한 AI 기능 프로토타입'),
    ('AI and Data Scientist', '데이터로 가설을 검증하고 모델 성능을 설명하는 흐름', '통계 머신러닝 피처 엔지니어링 실험 설계', 'Python pandas scikit-learn Jupyter MLflow', '예측 모델 학습과 성능 비교 실험', '피처 테이블 학습 검증 테스트 분리', '교차검증 편향 분산 재현 가능한 실험', '학습 시간 메모리 모델 복잡도 조절', '실험 추적 모델 등록 결과 공유', '모델링 파이프라인과 데이터 누수 방지', '개인정보 익명화 모델 편향 점검', '문제 정의부터 모델 리포트까지'),
    ('Data Engineer', '데이터를 안정적으로 수집 변환 제공하는 파이프라인', '배치 스트리밍 ETL ELT 데이터 웨어하우스', 'Airflow Spark Kafka dbt Snowflake', '원천 데이터 적재와 변환 잡 구성', '스키마 파티션 데이터 계보 품질 규칙', '데이터 테스트 재처리 중복 방지', '잡 실행 시간 파일 크기 파티션 최적화', '스케줄링 알림 재시도 백필 운영', '레이크하우스와 웨어하우스 계층 설계', '민감 데이터 권한 마스킹 감사', '분석용 데이터 마트와 파이프라인'),
    ('Android', 'Android 앱 화면과 기기 기능을 구현하는 흐름', 'Kotlin Activity Fragment Compose 생명주기', 'Android Studio Gradle Emulator Jetpack', '리스트 상세 화면과 로컬 저장 구현', 'ViewModel 상태 네비게이션 Room 데이터', 'UI 테스트 접근성 크래시 리포트', '렌더링 지연 배터리 네트워크 비용', '스토어 배포 버전 코드 Crashlytics', 'Clean Architecture 모듈화 의존성 주입', '권한 저장소 암호화 네트워크 보안', 'API 연동 Android 앱 완성'),
    ('Machine Learning', '데이터에서 패턴을 학습하는 모델 개발 흐름', '지도학습 비지도학습 평가 지표 피처', 'Python scikit-learn pandas matplotlib', '분류 회귀 모델 학습 실습', '데이터셋 분할 피처 스케일링 레이블', '검증 지표 과적합 데이터 누수 점검', '모델 복잡도 학습 시간 추론 속도', '모델 저장 추론 스크립트 실험 기록', '파이프라인 전처리 모델 평가 구조', '편향 개인정보 설명 가능성', '문제별 ML 모델 비교 리포트'),
    ('PostgreSQL', '관계형 데이터 저장과 조회 성능을 설계하는 흐름', '테이블 관계 SQL 트랜잭션 인덱스', 'psql pgAdmin EXPLAIN 백업 도구', '정규화된 스키마와 조회 쿼리 작성', '제약조건 외래키 뷰 파티션', 'ACID 락 격리수준 쿼리 검증', '실행 계획 인덱스 튜닝 VACUUM', '백업 복구 복제 모니터링', '스키마 설계와 마이그레이션 전략', '권한 Row Level Security 감사 로그', '업무용 PostgreSQL 데이터 모델'),
    ('iOS', 'Apple 생태계 앱 화면과 상태 흐름을 구현하는 과정', 'Swift SwiftUI UIKit 생명주기', 'Xcode Simulator Instruments TestFlight', '목록 상세 폼 화면과 네트워크 연동', 'Observable 상태 네비게이션 CoreData', 'UI 테스트 접근성 크래시 분석', '앱 시작 시간 메모리 렌더링 최적화', '프로비저닝 TestFlight 릴리스 관리', 'MVVM 모듈화 의존성 주입', '키체인 권한 개인정보 보호', 'API 연동 iOS 앱 완성'),
    ('Blockchain', '탈중앙 네트워크와 스마트 컨트랙트 서비스 구조', '트랜잭션 지갑 컨센서스 스마트 컨트랙트', 'Solidity Hardhat MetaMask Ethers.js', '토큰 전송과 컨트랙트 호출 DApp', '온체인 상태 이벤트 인덱싱 지갑 연결', '컨트랙트 테스트 감사 재현성', '가스 비용 저장소 접근 최적화', '테스트넷 배포 모니터링 업그레이드', '프록시 패턴 오라클 브릿지 구조', '재진입 공격 권한 검증 키 관리', '스마트 컨트랙트 기반 DApp'),
    ('QA', '제품 품질을 요구사항과 테스트로 검증하는 흐름', '테스트 케이스 결함 리포트 회귀 테스트', 'TestRail Playwright Postman JMeter', '기능 테스트와 API 테스트 시나리오 작성', '요구사항 추적 결함 상태 테스트 데이터', '재현 절차 우선순위 커버리지', '테스트 실행 시간 병렬화 안정성', '릴리스 검수 자동화 리포트', '테스트 전략과 품질 게이트 설계', '권한 입력값 장애 상황 보안 테스트', '릴리스 품질 검증 리포트'),
    ('Software Architect', '시스템 요구사항을 구조와 기술 결정으로 바꾸는 역할', '품질 속성 트레이드오프 아키텍처 패턴', 'C4 다이어그램 ADR 모델링 도구', '서비스 경계와 통신 방식 설계', '도메인 모델 데이터 흐름 의존성', '아키텍처 리뷰 위험 식별 검증 계획', '확장성 처리량 지연시간 비용', '운영성 관찰성 장애 격리 전략', '모듈 분리 이벤트 기반 마이크로서비스', '보안 경계 권한 데이터 보호', '아키텍처 결정 기록과 설계 문서'),
    ('Cyber Security', '시스템을 공격 관점에서 분석하고 방어하는 흐름', '네트워크 웹 취약점 암호 권한', 'Burp Suite Nmap Wireshark SIEM', '취약점 진단과 침투 테스트 리포트', '자산 위협 공격 경로 로그 이벤트', '재현 가능한 취약점 검증과 심각도 평가', '스캔 범위 탐지 속도 오탐 관리', '보안 모니터링 사고 대응 플레이북', '방어 계층 인증 네트워크 분리', 'OWASP 권한 상승 데이터 유출 방지', '웹 서비스 보안 진단 보고서'),
    ('UX Design', '사용자 문제를 화면 흐름과 인터랙션으로 해결하는 과정', '리서치 정보구조 와이어프레임 사용성', 'Figma FigJam 프로토타입 사용자 인터뷰', '핵심 사용자 여정과 화면 시안 제작', '페르소나 태스크 플로우 디자인 토큰', '사용성 테스트 접근성 디자인 리뷰', '전환율 과업 성공률 인터랙션 비용', '디자인 핸드오프 피드백 반영 버전 관리', '정보구조 네비게이션 컴포넌트 패턴', '개인정보 동의 오류 방지 접근성', '검증 가능한 프로토타입과 UX 리포트'),
    ('Technical Writer', '복잡한 기술을 정확한 문서와 가이드로 전달하는 역할', '독자 분석 정보 설계 API 문서', 'Markdown OpenAPI Docs-as-Code Git', '설치 가이드와 튜토리얼 작성', '문서 구조 용어집 버전 릴리스 노트', '정확성 검수 링크 검증 스타일 가이드', '문서 탐색성 검색성 읽기 시간', '문서 배포 변경 이력 피드백 수집', '문서 IA와 콘텐츠 재사용 전략', '민감 정보 제거 권한별 문서 분리', '개발자 온보딩 문서 세트'),
    ('Game Developer', '게임 규칙을 상호작용과 플레이 경험으로 구현하는 흐름', '게임 루프 물리 입력 애니메이션', 'Unity Unreal Godot Blender 디버거', '플레이어 이동 전투 UI 프로토타입', '씬 오브젝트 상태 저장 리소스 관리', '플레이 테스트 밸런스 버그 재현', '프레임 레이트 드로우콜 메모리 최적화', '빌드 패키징 패치 크래시 수집', '엔티티 컴포넌트 씬 전환 구조', '치트 방지 세이브 보호 입력 검증', '플레이 가능한 게임 프로토타입'),
    ('Server Side Game Developer', '멀티플레이 게임 서버와 실시간 상태를 운영하는 흐름', '세션 매치메이킹 동기화 권위 서버', 'Netty WebSocket Redis Kubernetes', '실시간 방 생성과 상태 동기화 구현', '플레이어 상태 룸 서버 이벤트 큐', '부하 테스트 지연 재접속 시나리오', '틱 레이트 네트워크 지연 서버 부하', '매치 서버 배포 모니터링 장애 복구', '샤딩 로비 게임 서버 분리', '치트 검증 권위 서버 토큰 보호', '멀티플레이 게임 서버 데모'),
    ('MLOps', '모델 개발부터 배포 모니터링까지 연결하는 운영 흐름', '모델 레지스트리 피처 스토어 서빙 모니터링', 'MLflow Kubeflow Docker Kubernetes Airflow', '모델 학습 배포 파이프라인 구축', '데이터 버전 모델 버전 피처 계약', '재현성 모델 검증 드리프트 테스트', '추론 지연 처리량 리소스 비용', '모델 모니터링 재학습 롤백 운영', '학습 서빙 파이프라인 분리 구조', '모델 접근 권한 데이터 보호 승인', '운영 가능한 ML 배포 파이프라인'),
    ('Product Manager', '문제를 정의하고 제품 우선순위를 결정하는 흐름', '고객 문제 KPI 로드맵 우선순위', 'Jira Notion Figma Analytics 도구', 'PRD 작성과 실험 계획 수립', '사용자 세그먼트 지표 백로그 릴리스 범위', '가설 검증 성공 기준 리스크 관리', '전환율 리텐션 실험 비용 최적화', '릴리스 커뮤니케이션 피드백 루프', '제품 전략과 기능 의존성 구조', '개인정보 정책 권한 장애 대응 요구사항', '문제 정의부터 출시 회고까지'),
    ('Engineering Manager', '팀이 지속적으로 성과를 내도록 사람과 시스템을 관리하는 역할', '목표 설정 피드백 채용 실행 관리', '1on1 문서화 로드맵 지표 대시보드', '스프린트 운영과 팀 실행 리듬 정리', '역할 책임 의사결정 지표 리스크', '성과 리뷰 성장 계획 팀 건강도', '리드타임 병목 WIP 배포 빈도', '온콜 회고 프로세스 개선 운영', '팀 구조 책임 위임 의사결정 체계', '권한 갈등 보안 책임 사고 대응', '팀 운영 계획과 성장 로드맵'),
    ('Developer Relations', '개발자 커뮤니티와 제품 사용 경험을 연결하는 역할', 'API 이해 콘텐츠 커뮤니티 피드백', 'GitHub Discord 블로그 데모 도구', '샘플 앱 튜토리얼과 발표 자료 제작', '개발자 여정 피드백 이슈 콘텐츠 캘린더', '문서 정확성 데모 재현성 커뮤니티 반응', '온보딩 시간 샘플 실행 성공률', '릴리스 소통 이벤트 운영 피드백 정리', '커뮤니티 채널 콘텐츠 퍼널 설계', '민감 정보 공개 방지 라이선스 준수', '개발자 온보딩 캠페인과 데모'),
    ('BI Analyst', '조직 의사결정용 지표와 리포트를 설계하는 흐름', '지표 정의 데이터 모델 대시보드 스토리텔링', 'SQL Power BI Tableau Looker', '경영 KPI 대시보드와 리포트 작성', '팩트 차원 테이블 필터 권한 모델', '수치 검산 데이터 신뢰도 알림 기준', '쿼리 성능 캐시 대시보드 응답 시간', '정기 리포트 배포 권한 관리', '스타 스키마 시맨틱 레이어 설계', '민감 지표 접근 제어 감사', '의사결정용 BI 대시보드'),
    ('SQL', '데이터를 질문에 맞게 조회하고 변형하는 능력', 'SELECT JOIN GROUP BY 서브쿼리 윈도우 함수', 'PostgreSQL MySQL psql SQL 클라이언트', '분석용 조회 쿼리와 집계 작성', '테이블 관계 키 제약조건 NULL 처리', '쿼리 결과 검산 중복 누락 점검', '인덱스 실행 계획 쿼리 비용', '뷰 저장 프로시저 배치 실행', '정규화와 조회 패턴별 스키마 설계', 'SQL Injection 권한 최소화', '실무 데이터 분석 쿼리 모음'),
    ('Computer Science', '소프트웨어가 동작하는 기본 원리를 이해하는 기반', '자료구조 운영체제 네트워크 데이터베이스', 'C Python Linux 디버거 시각화 도구', '알고리즘과 시스템 동작 실험', '메모리 프로세스 파일 네트워크 모델', '복잡도 검증 경계값 테스트', '시간복잡도 공간복잡도 병목 분석', '프로세스 스케줄링 I/O 관찰', '계층 구조 추상화 인터페이스 설계', '권한 격리 암호화 기본 원리', 'CS 개념 실험 노트와 구현'),
    ('React', '컴포넌트 기반으로 상태 변화에 반응하는 UI 개발', 'JSX props state Hooks 렌더링', 'Vite React DevTools Testing Library', '컴포넌트 분리와 이벤트 처리 구현', '전역 상태 서버 상태 라우터 구조', '컴포넌트 테스트 접근성 회귀 확인', '메모이제이션 렌더링 횟수 번들 분석', '정적 빌드 배포 환경 변수 관리', '컴포넌트 합성 상태 경계 설계', 'XSS 안전한 렌더링 토큰 저장', 'API 연동 React 미니 앱'),
    ('Vue', '템플릿과 반응형 상태로 화면을 구성하는 UI 개발', 'Composition API 반응성 컴포넌트 라우터', 'Vite Vue Devtools Pinia Vitest', '폼 목록 상세 화면 컴포넌트 구현', 'ref reactive store route 상태 모델', '컴포넌트 테스트 접근성 스타일 검증', '반응성 추적 번들 크기 렌더링 최적화', '정적 배포 빌드 환경 분리', '컴포저블과 컴포넌트 책임 분리', 'XSS 템플릿 안전성 인증 토큰', 'API 연동 Vue 애플리케이션'),
    ('Angular', '프레임워크 구조로 대규모 프론트엔드를 구성하는 흐름', 'Component Service DI RxJS 라우팅', 'Angular CLI DevTools Jasmine Karma', '모듈형 화면과 폼 검증 구현', 'Observable 상태 서비스 계층 라우트 데이터', '단위 테스트 E2E 접근성 검증', 'Change Detection lazy loading 번들 최적화', '환경별 빌드 배포 릴리스 관리', '모듈 경계 DI 계층 구조', 'XSS sanitization guard 인증 보호', '업무용 Angular 관리 화면'),
    ('JavaScript', '웹 런타임에서 동작하는 언어와 비동기 흐름', '스코프 클로저 프로토타입 비동기 이벤트 루프', '브라우저 DevTools Node.js npm ESLint', 'DOM 조작과 비동기 API 호출 구현', '객체 배열 모듈 이벤트 상태', '단위 테스트 타입 체크 린트 규칙', '이벤트 루프 렌더링 블로킹 메모리', '패키지 빌드 배포 스크립트 관리', '모듈 패턴 함수형 객체지향 구조', 'XSS 입력 검증 의존성 취약점', '순수 JavaScript 웹 기능'),
    ('TypeScript', 'JavaScript 코드에 타입 계약을 세우는 개발 흐름', '타입 추론 제네릭 유니언 인터페이스', 'tsconfig ESLint Vite 타입 검사', '타입 안전한 API 응답 처리 구현', '도메인 타입 DTO 상태 타입 모델', '컴파일 오류 테스트 타입 커버리지', '타입 복잡도 빌드 시간 최적화', '패키지 타입 배포 버전 관리', '타입 계층 모듈 공개 API 설계', '민감 데이터 타입 분리 안전한 파싱', '타입 기반 프론트엔드 모듈'),
    ('Node.js', 'JavaScript 런타임으로 서버와 도구를 만드는 흐름', '이벤트 루프 Express 비동기 I/O 모듈', 'Node npm Express Jest Docker', 'REST API와 파일 처리 기능 구현', '요청 응답 미들웨어 데이터베이스 연결', 'API 테스트 에러 핸들링 로깅', '비동기 처리량 메모리 누수 프로파일링', '프로세스 관리 배포 환경 변수', '계층형 서버 구조와 모듈 분리', '인증 rate limit 입력 검증', 'Node.js API 서버'),
    ('Python', '간결한 문법으로 자동화 데이터 웹 기능을 만드는 흐름', '자료형 함수 모듈 예외 가상환경', 'Python pip venv pytest Jupyter', 'CLI 자동화와 데이터 처리 스크립트', '파일 데이터프레임 객체 패키지 구조', 'pytest 타입 힌트 린트 예외 검증', '반복문 벡터화 I/O 병목 최적화', '패키징 스케줄링 로그 관리', '모듈 패키지 객체 책임 분리', '입력 검증 시크릿 관리 의존성 점검', '자동화 스크립트와 분석 노트북'),
    ('System Design', '대규모 서비스를 요구사항과 품질 속성으로 설계하는 사고', '확장성 가용성 캐시 큐 샤딩', '다이어그램 ADR 부하 산정 도구', 'URL 단축기 피드 설계 연습', '요구사항 트래픽 저장소 API 계약', '병목 검증 장애 시나리오 일관성', '캐시 히트율 처리량 지연시간', '모니터링 롤백 장애 복구 절차', '마이크로서비스 이벤트 소싱 CQRS 구조', '인증 권한 데이터 암호화 위협 모델', '시스템 설계 문서와 발표 자료'),
    ('Java', '객체지향과 JVM 기반 애플리케이션 개발', '클래스 인터페이스 컬렉션 예외 제네릭', 'JDK IntelliJ Gradle JUnit', '콘솔 앱과 서비스 로직 구현', '객체 모델 컬렉션 스트림 패키지 구조', '단위 테스트 예외 케이스 코드 스타일', 'JVM 메모리 GC 컬렉션 성능', 'JAR 빌드 실행 환경 설정', 'OOP 계층 SOLID 패키지 분리', '입력 검증 직렬화 의존성 취약점', 'Java 서비스 모듈'),
    ('ASP.NET Core', 'C# 기반 웹 API와 서버 애플리케이션 개발', 'Controller Middleware DI Entity Framework', 'Visual Studio dotnet CLI SQL Server Swagger', 'CRUD API와 인증 흐름 구현', 'DbContext DTO 서비스 계층 라우팅', 'xUnit 통합 테스트 로깅', 'Kestrel 응답 시간 EF 쿼리 최적화', 'IIS Docker Azure 배포 설정', 'Clean Architecture 레이어드 구조', 'Identity 권한 CORS 시크릿 관리', 'ASP.NET Core 업무 API'),
    ('API Design', '클라이언트와 서버가 안정적으로 통신하는 계약 설계', 'REST 리소스 상태 코드 스키마 버전', 'OpenAPI Swagger Postman Mock Server', '회원 주문 같은 리소스 API 설계', '요청 응답 DTO 오류 모델 페이지네이션', '계약 테스트 호환성 에러 응답 검증', '응답 크기 캐싱 rate limit 최적화', '문서 배포 변경 로그 사용량 모니터링', 'API 버전 관리 리소스 경계 설계', '인증 인가 입력 검증 데이터 노출 방지', 'OpenAPI 명세와 샘플 서버'),
    ('Spring Boot', 'Spring 생태계로 웹 서비스와 비즈니스 로직을 구현하는 흐름', 'DI Bean MVC JPA Security', 'IntelliJ Gradle Spring Initializr Docker', 'REST API와 데이터 저장 기능 구현', 'Controller Service Repository Entity 구조', 'JUnit MockMvc 통합 테스트 로깅', 'JPA 쿼리 캐시 응답 시간 최적화', '프로파일 배포 Actuator 모니터링', '계층형 아키텍처 트랜잭션 경계', 'Spring Security JWT CORS 검증', 'Spring Boot 서비스 API'),
    ('Flutter', '하나의 코드베이스로 모바일 UI를 만드는 개발 흐름', 'Widget State Navigator async layout', 'Flutter SDK Dart DevTools Emulator', '크로스플랫폼 앱 화면과 API 연동', 'Provider Bloc 라우팅 로컬 저장소', '위젯 테스트 접근성 크래시 분석', '빌드 크기 렌더링 jank 최적화', '스토어 빌드 flavor 릴리스 관리', '위젯 트리 상태 관리 아키텍처', '토큰 저장 권한 플랫폼 보안', 'Flutter 모바일 앱'),
    ('C++', '성능과 메모리 제어가 필요한 시스템 개발', '포인터 RAII STL 템플릿 동시성', 'CMake gdb clang-tidy sanitizer', '자료구조와 파일 처리 프로그램 구현', '메모리 소유권 객체 수명 스레드 상태', '단위 테스트 메모리 오류 정적 분석', '할당 비용 캐시 지역성 알고리즘 최적화', '빌드 타깃 패키징 크래시 덤프 분석', '모듈 경계 헤더 라이브러리 설계', '버퍼 오버플로우 UB 입력 검증', '성능 중심 C++ 모듈'),
    ('Rust', '메모리 안전성과 성능을 함께 잡는 시스템 개발', '소유권 borrow trait enum async', 'Cargo rustfmt clippy Tokio', 'CLI 도구와 파일 처리 기능 구현', '소유권 수명 에러 처리 모듈 구조', '단위 테스트 property test clippy', 'zero-cost abstraction 할당 최소화', 'crate 배포 cross compile 로그', 'trait 기반 설계 모듈 경계', '메모리 안전성 입력 검증 unsafe 격리', 'Rust CLI 또는 서버 모듈'),
    ('Go Roadmap', '단순한 문법으로 동시성 서버와 도구를 만드는 흐름', 'goroutine channel interface error handling', 'Go toolchain gin sqlc pprof', 'HTTP API와 concurrent worker 구현', 'struct interface context 데이터 흐름', 'go test race detector 에러 케이스', 'goroutine 누수 pprof latency 최적화', 'binary 배포 systemd Docker 운영', '패키지 경계 interface 의존성 설계', 'context timeout 입력 검증', 'Go API 서버와 CLI 도구'),
    ('Design and Architecture', '문제 구조를 설계 원칙과 아키텍처 결정으로 풀어내는 흐름', 'SOLID DDD 패턴 품질 속성', 'C4 ADR UML 모델링 도구', '모듈 경계와 책임 분리 설계', '도메인 이벤트 의존성 데이터 흐름', '설계 리뷰 리스크 검증 테스트 전략', '확장 비용 복잡도 성능 트레이드오프', '운영성 로그 메트릭 장애 격리', '레이어드 헥사고날 이벤트 기반 구조', '보안 경계 권한 데이터 보호', '아키텍처 설계 문서'),
    ('GraphQL', '클라이언트가 필요한 데이터를 선언적으로 요청하는 API 방식', 'Schema Query Mutation Resolver Type', 'Apollo GraphQL Codegen GraphiQL', '게시글 댓글 API 스키마 구현', '타입 관계 resolver 데이터로더 캐시', '스키마 테스트 N+1 검증 에러 정책', 'DataLoader 쿼리 복잡도 캐싱', '스키마 배포 버전 호환성 모니터링', 'Federation 모듈화 스키마 경계', '권한 필드 마스킹 introspection 제한', 'GraphQL API와 클라이언트 연동'),
    ('React Native', 'React 방식으로 모바일 앱을 만드는 개발 흐름', 'Native component navigation bridge state', 'Expo React Native CLI Flipper EAS', '모바일 화면과 디바이스 기능 연동', 'navigation store async storage API 상태', '기기 테스트 접근성 크래시 분석', 'bridge 비용 렌더링 리스트 최적화', 'EAS build OTA 업데이트 스토어 배포', '네이티브 모듈 상태 관리 구조', '권한 토큰 저장 플랫폼 보안', 'React Native 모바일 앱'),
    ('Design System', '제품 UI를 일관된 컴포넌트와 규칙으로 운영하는 체계', '디자인 토큰 컴포넌트 패턴 접근성', 'Figma Storybook Tokens Studio npm', '버튼 입력 카드 컴포넌트 라이브러리', '토큰 테마 variant 상태 문서 구조', '시각 회귀 테스트 접근성 체크', 'CSS 번들 크기 렌더링 영향', '패키지 버전 배포 변경 로그', '토큰 계층 컴포넌트 API 설계', '색 대비 포커스 상태 사용성 안전장치', 'Storybook 기반 디자인 시스템'),
    ('Prompt Engineering', 'AI 모델이 원하는 결과를 내도록 맥락과 제약을 설계하는 기술', '지시문 컨텍스트 예시 평가 기준', 'ChatGPT Playground eval 도구', '요약 분류 생성 프롬프트 실험', '입력 형식 출력 스키마 메모리 컨텍스트', '정확도 일관성 hallucination 평가', '토큰 비용 응답 지연 프롬프트 압축', '프롬프트 버전 관리 로그 분석', '프롬프트 체인 도구 호출 구조', '프롬프트 주입 민감 정보 차단', '업무 자동화 프롬프트 세트'),
    ('MongoDB', '문서 기반 데이터 모델과 조회 패턴을 설계하는 흐름', 'Document Collection Index Aggregation', 'MongoDB Compass mongosh Atlas', '게시글 댓글 문서 모델 구현', '임베디드 문서 참조 스키마 유연성', '쿼리 결과 검증 스키마 validation', '인덱스 aggregation pipeline 최적화', 'Atlas 백업 복제 모니터링', '조회 패턴 중심 문서 모델 설계', '역할 권한 암호화 injection 방지', 'MongoDB 기반 서비스 저장소'),
    ('Linux', '서버 운영체제를 명령어와 프로세스로 다루는 능력', '파일 권한 프로세스 네트워크 systemd', 'bash ssh journalctl top vim', '로그 확인과 서비스 실행 자동화', '파일 시스템 사용자 환경 변수 포트', '명령 결과 검증 권한 오류 추적', 'CPU 메모리 I/O 네트워크 병목 분석', 'systemd cron 로그 로테이션 운영', '디렉터리 구조 프로세스 격리', '사용자 권한 방화벽 SSH 보안', 'Linux 서버 운영 실습'),
    ('Kubernetes', '컨테이너 서비스를 클러스터에서 운영하는 플랫폼', 'Pod Deployment Service Ingress ConfigMap', 'kubectl Helm kind Prometheus', '웹 서비스를 클러스터에 배포', '리소스 요청 제한 Secret 볼륨 네임스페이스', 'readiness liveness rollout 검증', 'autoscaling scheduling resource tuning', 'Helm 배포 로그 모니터링 롤백', '네트워크 정책 서비스 메시 구조', 'RBAC Secret 이미지 보안', 'Kubernetes 운영 배포 구성'),
    ('Docker', '애플리케이션 실행 환경을 이미지와 컨테이너로 고정하는 기술', 'Image Container Dockerfile Compose volume', 'Docker CLI Compose Registry', '웹 앱 컨테이너 이미지 작성', '레이어 환경 변수 네트워크 볼륨', '컨테이너 실행 검증 헬스체크', '이미지 크기 빌드 캐시 시작 시간', '레지스트리 푸시 Compose 운영', '멀티스테이지 빌드 서비스 분리', '이미지 취약점 rootless 시크릿 관리', 'Docker 기반 개발 배포 환경'),
    ('AWS', '클라우드 인프라에서 서비스를 배포 운영하는 흐름', 'EC2 S3 RDS IAM VPC Lambda', 'AWS Console CLI CloudWatch CDK', '웹 서비스 배포와 스토리지 구성', '네트워크 보안그룹 IAM 정책 리소스 태그', '헬스체크 백업 알림 권한 검증', '비용 성능 오토스케일링 지표', 'CloudWatch 로그 배포 롤백 운영', 'VPC 서브넷 로드밸런서 아키텍처', 'IAM 최소권한 암호화 키 관리', 'AWS 기반 서비스 인프라'),
    ('Terraform', '인프라를 코드로 정의하고 변경 이력을 관리하는 기술', 'Provider Resource State Module Plan', 'Terraform CLI AWS provider remote backend', 'VPC 서버 데이터베이스 코드화', 'state 변수 output workspace 구조', 'plan 검토 drift 탐지 정책 검증', '모듈 재사용 배포 시간 최적화', 'remote state lock CI 적용 운영', '모듈 경계 환경별 인프라 설계', '시크릿 노출 방지 IAM 최소권한', 'Terraform 인프라 코드 저장소'),
    ('Data Structures & Algorithms', '문제를 효율적으로 풀기 위한 자료 표현과 절차', '배열 리스트 트리 그래프 정렬 탐색', 'Python Java C++ 시각화 도구', '자료구조 구현과 문제 풀이', '노드 간선 해시 힙 스택 큐', '정답 검증 경계값 복잡도 분석', '시간복잡도 공간복잡도 최적화', '풀이 기록 테스트 케이스 관리', '문제 유형별 알고리즘 선택 구조', '오버플로우 입력 범위 예외 처리', '알고리즘 풀이 노트와 구현'),
    ('Redis', '메모리 기반 데이터 구조로 빠른 기능을 만드는 저장소', 'String Hash List Set ZSet TTL', 'redis-cli RedisInsight Docker', '캐시 세션 랭킹 기능 구현', '키 설계 만료 정책 자료구조 선택', '캐시 정합성 장애 재현 테스트', '메모리 사용량 eviction latency 최적화', 'replication persistence 모니터링', '캐시 전략 분산 락 PubSub 구조', '인증 네트워크 접근 키 노출 방지', 'Redis 캐시와 랭킹 서비스'),
    ('Git and GitHub', '변경 이력을 관리하고 협업 흐름을 만드는 도구', 'commit branch merge rebase pull request', 'Git CLI GitHub Actions Codespaces', '브랜치 전략과 PR 리뷰 실습', '커밋 단위 충돌 이력 태그 릴리스', '리뷰 체크리스트 CI 상태 검증', '히스토리 정리 큰 파일 관리', '릴리스 태그 자동화 이슈 연결', 'trunk based flow GitFlow 저장소 구조', '권한 보호 브랜치 시크릿 관리', '협업 저장소와 릴리스 기록'),
    ('PHP', '서버 렌더링과 웹 백엔드를 빠르게 만드는 언어', 'Composer PDO 세션 라우팅 템플릿', 'PHP CLI Composer Xdebug PHPUnit', '게시판 CRUD와 로그인 구현', '요청 응답 세션 데이터베이스 연결', 'PHPUnit 입력 검증 오류 로그', 'OPcache 쿼리 수 응답 시간 최적화', '배포 환경 composer autoload 운영', 'MVC 구조와 서비스 계층 분리', 'SQL Injection XSS CSRF 방어', 'PHP 웹 애플리케이션'),
    ('Cloudflare', '엣지 네트워크로 보안 성능 배포를 강화하는 플랫폼', 'DNS CDN WAF Workers Pages', 'Cloudflare Dashboard Wrangler analytics', '정적 사이트와 Workers API 배포', 'DNS 레코드 캐시 규칙 라우팅', 'WAF 규칙 로그 캐시 동작 검증', '캐시 hit ratio edge latency 최적화', 'Pages 배포 DNS 모니터링 운영', '엣지 함수 CDN 보안 계층 구조', 'DDoS 방어 TLS 토큰 보호', 'Cloudflare 기반 엣지 서비스'),
    ('AI Red Teaming', 'AI 시스템을 공격 관점에서 검증하는 보안 흐름', 'prompt injection jailbreak data exfiltration evaluation', 'LLM eval harness proxy logging 도구', 'AI 기능 공격 시나리오 작성', '프롬프트 정책 데이터 흐름 위험 모델', '공격 재현성 심각도 완화 검증', '평가 케이스 수 토큰 비용 최적화', '취약점 리포트 회귀 테스트 운영', '방어 계층 정책 필터 모니터링 구조', '민감 정보 유출 권한 우회 방지', 'AI 보안 평가 리포트'),
    ('AI Agents', '모델이 도구를 호출하며 작업을 수행하는 시스템 설계', 'tool calling planning memory orchestration', 'LangGraph OpenAI SDK vector DB workflow tool', '도구 호출 기반 업무 자동화 에이전트', '상태 메모리 작업 큐 도구 스키마', 'eval 시나리오 실패 복구 테스트', '토큰 비용 latency tool 호출 수 최적화', '실행 로그 모니터링 프롬프트 버전 관리', 'planner executor retriever 구조', '권한 제한 tool sandbox prompt injection 방어', '업무 자동화 AI 에이전트'),
    ('Next.js', 'React 기반 풀스택 웹 앱을 라우팅과 렌더링 전략으로 구성하는 프레임워크', 'App Router Server Component Route Handler', 'Next.js Vercel TypeScript Prisma', '페이지 라우팅과 API route 구현', '서버 상태 캐시 렌더링 경계 폼 액션', '컴포넌트 테스트 접근성 SEO 확인', 'ISR streaming bundle 이미지 최적화', 'Vercel 배포 환경 변수 로그', '서버 클라이언트 컴포넌트 경계 설계', '인증 쿠키 CSRF 데이터 노출 방지', 'Next.js 풀스택 웹 앱'),
    ('Code Review', '코드 변경의 의도 품질 위험을 검토하는 협업 기술', 'diff 읽기 설계 의도 테스트 위험', 'GitHub Pull Request static analysis checklist', 'PR 리뷰와 개선 제안 작성', '변경 범위 의존성 테스트 근거', '버그 재현 리뷰 기준 회귀 위험', '리뷰 시간 코멘트 품질 병목 개선', '리뷰 프로세스 CODEOWNERS 자동화', '모듈 경계 책임 변경 영향 분석', '보안 취약점 권한 데이터 노출 점검', '실전 PR 리뷰 리포트'),
    ('Kotlin', '간결한 타입 시스템으로 JVM과 Android 개발을 하는 언어', 'null safety data class coroutine extension', 'IntelliJ Gradle JUnit Android Studio', 'Kotlin 서비스 로직과 비동기 처리 구현', 'sealed class flow domain model package', '단위 테스트 null 처리 예외 케이스', 'coroutine dispatcher allocation 최적화', 'JAR Android build 배포 설정', '함수형 OOP 혼합 모듈 설계', 'null 안전성 직렬화 입력 검증', 'Kotlin 기반 앱 또는 API 모듈'),
    ('HTML', '웹 문서의 의미 구조와 접근성 기반을 만드는 기술', 'semantic tag form media metadata', '브라우저 DevTools validator accessibility checker', '시맨틱 랜딩 페이지와 폼 작성', '문서 구조 폼 데이터 링크 메타 정보', '접근성 검사 유효성 검사 SEO 확인', 'DOM 크기 렌더링 차단 요소 최적화', '정적 파일 배포 검색 엔진 노출', '정보 구조 heading landmark 설계', '폼 보안 rel 속성 개인정보 입력', '접근성 있는 HTML 페이지'),
    ('CSS', '화면 배치 스타일 반응형 표현을 제어하는 기술', 'box model flex grid cascade responsive', 'DevTools Sass PostCSS Tailwind', '반응형 레이아웃과 컴포넌트 스타일 작성', '토큰 변수 breakpoint 상태 스타일', '크로스브라우징 접근성 시각 회귀', 'layout shift selector 비용 애니메이션 최적화', 'CSS 빌드 purge 배포 관리', '레이어 cascade 컴포넌트 스타일 구조', '색 대비 focus-visible 사용자 설정 존중', '반응형 UI 스타일 시스템'),
    ('Swift & Swift UI', 'Swift 언어와 선언형 UI로 Apple 앱을 만드는 흐름', 'Swift type system SwiftUI state binding', 'Xcode Instruments TestFlight Swift Package Manager', 'SwiftUI 화면과 데이터 바인딩 구현', 'Observable 상태 navigation persistence', '단위 UI 테스트 preview 접근성', '렌더링 diff 메모리 앱 시작 시간', 'TestFlight 배포 빌드 설정 운영', 'MVVM state ownership view composition', 'Keychain 개인정보 권한 관리', 'SwiftUI iOS 앱'),
    ('Shell / Bash', '터미널 작업을 스크립트로 자동화하는 기술', 'pipe redirect variable function exit code', 'bash shellcheck cron ssh awk sed', '로그 처리와 배포 보조 스크립트 작성', '파일 경로 환경 변수 인자 처리', 'shellcheck dry run 오류 처리 검증', '프로세스 수 I/O 호출 최적화', 'cron systemd 로그 로테이션 운영', '작은 명령 조합과 스크립트 모듈화', '권한 chmod 시크릿 노출 방지', '운영 자동화 Bash 스크립트'),
    ('Laravel', 'PHP 기반으로 웹 서비스를 빠르게 만드는 프레임워크', 'Route Controller Eloquent Blade Middleware', 'Composer Artisan Sail PHPUnit', '인증 포함 CRUD 웹 서비스 구현', 'Model migration request validation session', 'Feature test validation 에러 로그', '쿼리 eager loading cache 최적화', 'queue schedule deployment env 운영', 'MVC service repository 구조', 'CSRF policy guard secret 관리', 'Laravel 업무 웹 서비스'),
    ('Elasticsearch', '검색과 로그 분석을 위한 분산 검색 엔진', 'index mapping analyzer query aggregation', 'Kibana Dev Tools Beats Logstash', '문서 검색과 필터 기능 구현', '문서 스키마 역색인 relevance score', '검색 결과 검증 mapping 테스트', 'shard 수 query latency heap 최적화', 'snapshot rollover monitoring 운영', 'index lifecycle cluster architecture', '권한 TLS field masking', '검색 서비스와 로그 대시보드'),
    ('WordPress', '콘텐츠 관리 사이트를 테마와 플러그인으로 구성하는 플랫폼', 'theme plugin post type taxonomy hook', 'WordPress Admin WP CLI Local', '커스텀 테마와 게시글 타입 구현', '콘텐츠 모델 메뉴 위젯 사용자 권한', '브라우저 테스트 플러그인 충돌 점검', '캐시 이미지 최적화 쿼리 수 개선', '백업 업데이트 배포 운영', '테마 구조 플러그인 책임 분리', '권한 nonce 업데이트 취약점 관리', 'WordPress 콘텐츠 사이트'),
    ('Django', 'Python 기반으로 안전한 웹 서비스를 빠르게 만드는 프레임워크', 'Model View Template ORM Admin', 'Django CLI pytest DRF PostgreSQL', '게시판 API와 관리자 기능 구현', 'Model migration serializer form session', '테스트 클라이언트 validation 권한 검증', 'ORM query prefetch cache 최적화', 'settings 분리 collectstatic 배포 운영', 'app 구조 service layer DRF 설계', 'CSRF authentication permission secret 관리', 'Django 웹 서비스 API'),
    ('Ruby', '표현력 있는 객체지향 스크립팅 언어 개발', 'object block module gem metaprogramming', 'Ruby CLI bundler RSpec irb', 'CLI 도구와 데이터 처리 구현', '객체 메시지 예외 gem 구조', 'RSpec 테스트 rubocop 스타일 검증', '객체 할당 enumerable 성능 최적화', 'gem 배포 스크립트 실행 운영', '모듈 mixin 책임 분리', '입력 검증 의존성 취약점 관리', 'Ruby 자동화 도구'),
    ('Ruby on Rails', '컨벤션 기반으로 웹 서비스를 빠르게 만드는 프레임워크', 'MVC ActiveRecord routing migration', 'Rails CLI bundler RSpec PostgreSQL', 'CRUD와 인증이 있는 웹 앱 구현', 'Model association controller view job', 'request spec validation authorization 검증', 'N+1 query cache background job 최적화', 'asset pipeline migration deploy 운영', 'MVC service object background job 구조', 'CSRF strong parameter secret 관리', 'Rails 웹 애플리케이션'),
    ('Claude Code', 'AI 코딩 에이전트를 개발 작업에 안전하게 연결하는 흐름', 'prompt context tool execution code review', 'Claude Code Git terminal test runner', '이슈 기반 코드 수정과 테스트 실행', '작업 컨텍스트 파일 변경 diff 기록', '테스트 결과 리뷰 hallucination 검증', '토큰 사용량 컨텍스트 크기 반복 비용', '작업 로그 커밋 단위 리뷰 운영', '에이전트 작업 범위와 책임 분리', '비밀키 보호 명령 권한 검토', 'AI 보조 개발 작업 기록'),
    ('Vibe Coding', 'AI와 빠르게 시제품을 만들되 검증으로 품질을 잡는 흐름', '요구사항 프롬프트 프로토타입 리뷰', 'ChatGPT Claude Cursor GitHub', '아이디어를 동작하는 MVP로 구현', '기능 명세 화면 흐름 코드 변경 이력', '실행 테스트 코드 리뷰 요구사항 대조', '반복 생성 비용과 수정 속도 관리', '버전 관리 피드백 반영 릴리스', '프롬프트 설계와 사람 검수 경계', '민감 정보 입력 금지 라이선스 확인', 'AI 협업 프로토타입 프로젝트'),
    ('Scala', '함수형과 객체지향을 함께 쓰는 JVM 언어 개발', 'case class pattern matching collection Future', 'sbt ScalaTest IntelliJ Akka', '데이터 처리와 API 모듈 구현', 'immutable data algebraic type stream', 'property test 타입 안정성 검증', 'lazy evaluation collection 성능 최적화', 'JAR 배포 로그 설정 운영', '함수형 계층 effect 처리 구조', '타입 안전성 입력 검증 의존성 관리', 'Scala 서비스 또는 데이터 모듈'),
    ('OpenClaw', 'AI 코딩 워크플로를 로컬 도구와 연결하는 실험적 개발 흐름', 'agent task context tool orchestration', 'OpenClaw Git terminal editor test command', '에이전트 작업 단위와 검증 루프 구성', '작업 지시 파일 범위 실행 로그 상태', '테스트 결과 diff 검토 실패 복구', '컨텍스트 크기 명령 실행 시간 최적화', '작업 기록 승인 절차 릴리스 관리', '에이전트 권한 경계와 도구 체인 설계', '명령 실행 제한 비밀 정보 보호', 'AI 에이전트 개발 워크플로');

UPDATE roadmaps r
SET
    description = detail.display_name || ' 로드맵은 ' || detail.intro_topic || '부터 ' || detail.project_topic || '까지 이어지는 DevPath 공식 학습 경로입니다.',
    info_title = detail.display_name || ' 로드맵이란 무엇인가요?',
    info_content =
        '<div class="p-6 text-sm text-gray-700 leading-relaxed space-y-6">' ||
        '<div><p class="mb-2"><span class="font-bold text-gray-900">' || detail.display_name || '</span> 로드맵은 ' || detail.intro_topic ||
        '을 기준으로 기초 개념, 실습, 품질 기준, 심화 분기를 이어 갑니다.</p><p>' || detail.core_topic ||
        '을 먼저 잡고, ' || detail.practice_topic || '을 직접 만들면서 ' || detail.project_topic || '로 정리할 수 있게 구성했습니다.</p></div>' ||
        '<div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">' ||
        '<strong class="block text-[#00C471] mb-2"><i class="fas fa-check-circle mr-1"></i> 이 로드맵에서 익히는 것</strong>' ||
        '<ul class="list-disc pl-5 space-y-1 text-gray-600">' ||
        '<li><strong>핵심 개념:</strong> ' || detail.core_topic || '</li>' ||
        '<li><strong>실습 흐름:</strong> ' || detail.practice_topic || '</li>' ||
        '<li><strong>품질 기준:</strong> ' || detail.quality_topic || '</li>' ||
        '<li><strong>심화 분기:</strong> ' || detail.perf_topic || ', ' || detail.arch_topic || '</li>' ||
        '<li><strong>포트폴리오:</strong> ' || detail.project_topic || '</li>' ||
        '</ul></div></div>'
FROM (
    SELECT
        target.roadmap_id,
        target.display_name,
        profile.intro_topic,
        profile.core_topic,
        profile.practice_topic,
        profile.quality_topic,
        profile.perf_topic,
        profile.arch_topic,
        profile.project_topic
    FROM (
        SELECT
            r.roadmap_id,
            r.title AS roadmap_title,
            COALESCE(MAX(item.subtitle), r.title) AS display_name
        FROM roadmap_hub_items item
        JOIN roadmap_hub_sections section_item ON section_item.id = item.section_id
        JOIN roadmaps r ON r.roadmap_id = item.linked_roadmap_id
        WHERE item.linked_roadmap_id IS NOT NULL
          AND item.is_active = TRUE
          AND section_item.is_active = TRUE
          AND r.is_official = TRUE
          AND r.is_deleted = FALSE
          AND r.title <> 'Backend Master Roadmap'
        GROUP BY r.roadmap_id, r.title
    ) target
    JOIN roadmap_hub_node_profile_seed profile ON profile.display_name = target.display_name
) detail
WHERE r.roadmap_id = detail.roadmap_id;

CREATE TEMPORARY TABLE roadmap_hub_node_detail_seed AS
WITH target_roadmaps AS (
    SELECT
        r.roadmap_id,
        r.title AS roadmap_title,
        COALESCE(MAX(item.subtitle), r.title) AS display_name
    FROM roadmap_hub_items item
    JOIN roadmap_hub_sections section_item ON section_item.id = item.section_id
    JOIN roadmaps r ON r.roadmap_id = item.linked_roadmap_id
    WHERE item.linked_roadmap_id IS NOT NULL
      AND item.is_active = TRUE
      AND section_item.is_active = TRUE
      AND r.is_official = TRUE
      AND r.is_deleted = FALSE
      AND r.title <> 'Backend Master Roadmap'
    GROUP BY r.roadmap_id, r.title
),
node_seed(sort_order, branch_group, node_type, stage_label) AS (
    VALUES
        (1, CAST(NULL AS INTEGER), 'CONCEPT', 'FOUNDATION'),
        (2, CAST(NULL AS INTEGER), 'CONCEPT', 'FOUNDATION'),
        (3, CAST(NULL AS INTEGER), 'CONCEPT', 'FOUNDATION'),
        (4, CAST(NULL AS INTEGER), 'PRACTICE', 'PRACTICE'),
        (5, CAST(NULL AS INTEGER), 'PRACTICE', 'PRACTICE'),
        (6, CAST(NULL AS INTEGER), 'PRACTICE', 'PRACTICE'),
        (7, CAST(NULL AS INTEGER), 'CONCEPT', 'PRACTICE'),
        (8, 1, 'PRACTICE', 'ADVANCED'),
        (9, 1, 'PRACTICE', 'ADVANCED'),
        (8, 2, 'CONCEPT', 'ADVANCED'),
        (9, 2, 'PRACTICE', 'ADVANCED'),
        (10, CAST(NULL AS INTEGER), 'PROJECT', 'ADVANCED'),
        (11, CAST(NULL AS INTEGER), 'PROJECT', 'ADVANCED')
)
SELECT
    target.roadmap_id,
    target.display_name || ' - ' ||
        CASE
            WHEN seed.sort_order = 1 THEN profile.intro_topic
            WHEN seed.sort_order = 2 THEN profile.core_topic
            WHEN seed.sort_order = 3 THEN profile.tool_topic
            WHEN seed.sort_order = 4 THEN profile.practice_topic
            WHEN seed.sort_order = 5 THEN profile.model_topic
            WHEN seed.sort_order = 6 THEN profile.quality_topic
            WHEN seed.sort_order = 7 THEN '협업 산출물과 변경 기록'
            WHEN seed.sort_order = 8 AND seed.branch_group = 1 THEN profile.perf_topic
            WHEN seed.sort_order = 9 AND seed.branch_group = 1 THEN profile.ops_topic
            WHEN seed.sort_order = 8 AND seed.branch_group = 2 THEN profile.arch_topic
            WHEN seed.sort_order = 9 AND seed.branch_group = 2 THEN profile.security_topic
            WHEN seed.sort_order = 10 THEN profile.project_topic
            ELSE '포트폴리오 설명과 면접 정리'
        END AS title,
    CASE
        WHEN seed.sort_order = 1 THEN target.display_name || ' 학습은 ' || profile.intro_topic || '을 먼저 이해하는 데서 시작합니다. 이 단계에서는 ' || profile.core_topic || '이 왜 필요한지 확인하고, 최종적으로 ' || profile.project_topic || '까지 이어질 학습 범위를 잡습니다.'
        WHEN seed.sort_order = 2 THEN profile.core_topic || '을 실제 판단 기준으로 정리합니다. 단어를 외우는 단계가 아니라 ' || target.display_name || ' 작업 중 어떤 문제를 만나면 어떤 개념을 꺼내 써야 하는지 연결합니다.'
        WHEN seed.sort_order = 3 THEN profile.tool_topic || '을 설치하고 기본 작업 흐름을 맞춥니다. 실습을 반복할 수 있도록 프로젝트 구조, 실행 명령, 디버깅 방법, 협업 규칙을 함께 세팅합니다.'
        WHEN seed.sort_order = 4 THEN profile.practice_topic || '을 작은 단위로 직접 구현합니다. 입력을 받고 처리한 뒤 결과를 확인하는 흐름을 만들면서 ' || profile.model_topic || '이 코드 안에서 어떻게 드러나는지 확인합니다.'
        WHEN seed.sort_order = 5 THEN profile.model_topic || '을 기준으로 데이터와 상태 흐름을 설계합니다. 어떤 정보를 어디에 두고, 어떤 이벤트가 변경을 만들며, 어떤 산출물이 남아야 하는지 ' || profile.arch_topic || ' 관점으로 정리합니다.'
        WHEN seed.sort_order = 6 THEN profile.quality_topic || '을 기준으로 결과물을 검증합니다. 정상 동작만 확인하지 않고 실패 케이스, 경계값, 리뷰 기준, ' || profile.security_topic || '까지 포함해 품질 기준을 세웁니다.'
        WHEN seed.sort_order = 7 THEN profile.project_topic || '을 팀에 설명할 수 있도록 문서와 변경 기록을 남깁니다. 이슈, PR, 의사결정 이유, 테스트 결과를 정리해 다음 사람이 ' || profile.tool_topic || ' 흐름을 그대로 재현할 수 있게 만듭니다.'
        WHEN seed.sort_order = 8 AND seed.branch_group = 1 THEN profile.perf_topic || '을 깊게 다룹니다. 측정 지표를 먼저 정하고 병목을 찾은 뒤, ' || target.display_name || ' 결과물에서 가장 효과가 큰 최적화 순서를 선택합니다.'
        WHEN seed.sort_order = 9 AND seed.branch_group = 1 THEN profile.ops_topic || '을 운영 관점에서 설계합니다. 배포, 모니터링, 알림, 롤백, 반복 작업 자동화를 정리해 학습 결과물이 한 번 만들고 끝나는 수준에 머물지 않게 합니다.'
        WHEN seed.sort_order = 8 AND seed.branch_group = 2 THEN profile.arch_topic || '을 기준으로 구조를 다시 봅니다. 책임 경계, 모듈 분리, 확장 전략을 점검하고 ' || profile.model_topic || '이 커져도 유지보수 가능한 형태인지 판단합니다.'
        WHEN seed.sort_order = 9 AND seed.branch_group = 2 THEN profile.security_topic || '을 중심으로 안정성을 보강합니다. 권한, 입력값, 예외, 장애 상황을 검토하고 운영 중 문제가 생겼을 때 추적 가능한 기준을 만듭니다.'
        WHEN seed.sort_order = 10 THEN profile.project_topic || '을 하나의 완성물로 묶습니다. 요구사항, 설계, 구현, 검증, 회고가 모두 남도록 만들고 ' || profile.quality_topic || '을 통과한 결과물을 목표로 합니다.'
        ELSE target.display_name || ' 포트폴리오는 ' || profile.project_topic || '을 왜 만들었고 어떤 선택을 했는지 설명할 수 있어야 합니다. ' || profile.core_topic || ', ' || profile.arch_topic || ', ' || profile.security_topic || '에서 내린 판단을 면접 답변처럼 정리합니다.'
    END AS content,
    seed.node_type,
    seed.sort_order,
    CASE seed.stage_label
        WHEN 'FOUNDATION' THEN profile.intro_topic || ': 학습 목표와 책임 범위,' || profile.core_topic || ': 반드시 구분해야 할 핵심 개념,' || profile.tool_topic || ': 실습을 반복할 기본 환경'
        WHEN 'PRACTICE' THEN profile.practice_topic || ': 작은 기능 구현,' || profile.model_topic || ': 데이터와 상태 흐름,' || profile.quality_topic || ': 검증과 리뷰 기준,' || profile.project_topic || ': 협업 산출물 정리'
        ELSE profile.perf_topic || ': 성능 개선 기준,' || profile.ops_topic || ': 운영과 자동화,' || profile.arch_topic || ': 구조와 확장 전략,' || profile.security_topic || ': 보안과 안정성,' || profile.project_topic || ': 포트폴리오 완성물'
    END AS sub_topics,
    seed.branch_group
FROM target_roadmaps target
JOIN roadmap_hub_node_profile_seed profile ON profile.display_name = target.display_name
CROSS JOIN node_seed seed;

UPDATE roadmap_nodes rn
SET
    title = detail.title,
    content = detail.content,
    node_type = detail.node_type,
    sub_topics = detail.sub_topics
FROM roadmap_hub_node_detail_seed detail
WHERE rn.roadmap_id = detail.roadmap_id
  AND rn.sort_order = detail.sort_order
  AND (
      rn.branch_group = detail.branch_group
      OR (rn.branch_group IS NULL AND detail.branch_group IS NULL)
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group)
SELECT
    detail.roadmap_id,
    detail.title,
    detail.content,
    detail.node_type,
    detail.sort_order,
    detail.sub_topics,
    detail.branch_group
FROM roadmap_hub_node_detail_seed detail
WHERE NOT EXISTS (
    SELECT 1
    FROM roadmap_nodes existing
    WHERE existing.roadmap_id = detail.roadmap_id
      AND existing.sort_order = detail.sort_order
      AND (
          existing.branch_group = detail.branch_group
          OR (existing.branch_group IS NULL AND detail.branch_group IS NULL)
      )
);

DROP TABLE IF EXISTS roadmap_hub_node_detail_seed;
DROP TABLE IF EXISTS roadmap_hub_node_profile_seed;

INSERT INTO prerequisites (node_id, pre_node_id)
WITH target_roadmaps AS (
    SELECT
        r.roadmap_id,
        COALESCE(MAX(item.subtitle), r.title) AS display_name
    FROM roadmap_hub_items item
    JOIN roadmap_hub_sections section_item ON section_item.id = item.section_id
    JOIN roadmaps r ON r.roadmap_id = item.linked_roadmap_id
    WHERE item.linked_roadmap_id IS NOT NULL
      AND item.is_active = TRUE
      AND section_item.is_active = TRUE
      AND r.is_official = TRUE
      AND r.is_deleted = FALSE
      AND r.title <> 'Backend Master Roadmap'
    GROUP BY r.roadmap_id, r.title
),
edge_seed(child_sort_order, child_branch_group, pre_sort_order, pre_branch_group) AS (
    VALUES
        (2, CAST(NULL AS INTEGER), 1, CAST(NULL AS INTEGER)),
        (3, CAST(NULL AS INTEGER), 2, CAST(NULL AS INTEGER)),
        (4, CAST(NULL AS INTEGER), 3, CAST(NULL AS INTEGER)),
        (5, CAST(NULL AS INTEGER), 4, CAST(NULL AS INTEGER)),
        (6, CAST(NULL AS INTEGER), 5, CAST(NULL AS INTEGER)),
        (7, CAST(NULL AS INTEGER), 6, CAST(NULL AS INTEGER)),
        (8, 1, 7, CAST(NULL AS INTEGER)),
        (9, 1, 8, 1),
        (8, 2, 7, CAST(NULL AS INTEGER)),
        (9, 2, 8, 2),
        (10, CAST(NULL AS INTEGER), 7, CAST(NULL AS INTEGER)),
        (11, CAST(NULL AS INTEGER), 10, CAST(NULL AS INTEGER))
)
SELECT
    child.node_id,
    pre_node.node_id
FROM target_roadmaps target
JOIN edge_seed edge_item ON 1 = 1
JOIN roadmap_nodes child
    ON child.roadmap_id = target.roadmap_id
   AND child.sort_order = edge_item.child_sort_order
   AND (
       child.branch_group = edge_item.child_branch_group
       OR (child.branch_group IS NULL AND edge_item.child_branch_group IS NULL)
   )
JOIN roadmap_nodes pre_node
    ON pre_node.roadmap_id = target.roadmap_id
   AND pre_node.sort_order = edge_item.pre_sort_order
   AND (
       pre_node.branch_group = edge_item.pre_branch_group
       OR (pre_node.branch_group IS NULL AND edge_item.pre_branch_group IS NULL)
   )
WHERE NOT EXISTS (
    SELECT 1
    FROM prerequisites existing
    WHERE existing.node_id = child.node_id
      AND existing.pre_node_id = pre_node.node_id
);

INSERT INTO tags (name, category, is_official, is_deleted)
WITH target_roadmaps AS (
    SELECT
        r.roadmap_id,
        COALESCE(MAX(item.subtitle), r.title) AS display_name,
        CASE
            WHEN MAX(CASE WHEN section_item.section_key = 'role-based' THEN 1 ELSE 0 END) = 1 THEN 'Role Roadmap'
            ELSE 'Skill Roadmap'
        END AS tag_category
    FROM roadmap_hub_items item
    JOIN roadmap_hub_sections section_item ON section_item.id = item.section_id
    JOIN roadmaps r ON r.roadmap_id = item.linked_roadmap_id
    WHERE item.linked_roadmap_id IS NOT NULL
      AND item.is_active = TRUE
      AND section_item.is_active = TRUE
      AND r.is_official = TRUE
      AND r.is_deleted = FALSE
      AND r.title <> 'Backend Master Roadmap'
    GROUP BY r.roadmap_id, r.title
),
generated_tags AS (
    SELECT display_name || ' Fundamentals' AS tag_name, tag_category AS category FROM target_roadmaps
    UNION ALL
    SELECT display_name || ' Practice' AS tag_name, tag_category AS category FROM target_roadmaps
    UNION ALL
    SELECT display_name || ' Advanced' AS tag_name, tag_category AS category FROM target_roadmaps
)
SELECT generated_tags.tag_name, generated_tags.category, TRUE, FALSE
FROM generated_tags
WHERE NOT EXISTS (
    SELECT 1
    FROM tags existing
    WHERE existing.name = generated_tags.tag_name
);

INSERT INTO node_required_tags (node_id, tag_id)
WITH target_roadmaps AS (
    SELECT
        r.roadmap_id,
        COALESCE(MAX(item.subtitle), r.title) AS display_name
    FROM roadmap_hub_items item
    JOIN roadmap_hub_sections section_item ON section_item.id = item.section_id
    JOIN roadmaps r ON r.roadmap_id = item.linked_roadmap_id
    WHERE item.linked_roadmap_id IS NOT NULL
      AND item.is_active = TRUE
      AND section_item.is_active = TRUE
      AND r.is_official = TRUE
      AND r.is_deleted = FALSE
      AND r.title <> 'Backend Master Roadmap'
    GROUP BY r.roadmap_id, r.title
),
node_stage AS (
    SELECT
        target.roadmap_id,
        rn.node_id,
        target.display_name ||
            CASE
                WHEN rn.branch_group IS NULL AND rn.sort_order <= 3 THEN ' Fundamentals'
                WHEN rn.branch_group IS NULL AND rn.sort_order <= 7 THEN ' Practice'
                ELSE ' Advanced'
            END AS tag_name
    FROM target_roadmaps target
    JOIN roadmap_nodes rn ON rn.roadmap_id = target.roadmap_id
)
SELECT node_stage.node_id, tag_item.tag_id
FROM node_stage
JOIN tags tag_item ON tag_item.name = node_stage.tag_name
WHERE NOT EXISTS (
    SELECT 1
    FROM node_required_tags existing
    WHERE existing.node_id = node_stage.node_id
      AND existing.tag_id = tag_item.tag_id
);

-- 각 로드맵 노드별 상세 필수 태그 보강
-- 노드마다 로드맵명, 단계, 노드 목적, 핵심 역량 태그가 함께 붙도록 구성한다.
INSERT INTO tags (name, category, is_official, is_deleted)
WITH target_roadmaps AS (
    SELECT
        r.roadmap_id,
        COALESCE(MAX(item.subtitle), r.title) AS display_name,
        CASE
            WHEN MAX(CASE WHEN section_item.section_key = 'role-based' THEN 1 ELSE 0 END) = 1 THEN 'Role Roadmap'
            ELSE 'Skill Roadmap'
        END AS tag_category
    FROM roadmap_hub_items item
    JOIN roadmap_hub_sections section_item ON section_item.id = item.section_id
    JOIN roadmaps r ON r.roadmap_id = item.linked_roadmap_id
    WHERE item.linked_roadmap_id IS NOT NULL
      AND item.is_active = TRUE
      AND section_item.is_active = TRUE
      AND r.is_official = TRUE
      AND r.is_deleted = FALSE
      AND r.title <> 'Backend Master Roadmap'
    GROUP BY r.roadmap_id, r.title
),
detail_tag_seed(sort_order, branch_group, detail_suffix) AS (
    VALUES
        (1, CAST(NULL AS INTEGER), '개요'),
        (2, CAST(NULL AS INTEGER), '핵심 개념'),
        (3, CAST(NULL AS INTEGER), '작업 환경'),
        (4, CAST(NULL AS INTEGER), '기초 실습'),
        (5, CAST(NULL AS INTEGER), '데이터 설계'),
        (6, CAST(NULL AS INTEGER), '테스트'),
        (7, CAST(NULL AS INTEGER), '협업 문서화'),
        (8, 1, '성능 최적화'),
        (9, 1, '운영 자동화'),
        (8, 2, '아키텍처 설계'),
        (9, 2, '보안 안정성'),
        (10, CAST(NULL AS INTEGER), '실전 프로젝트'),
        (11, CAST(NULL AS INTEGER), '포트폴리오')
),
core_tag_seed(sort_order, branch_group, core_tag) AS (
    VALUES
        (1, CAST(NULL AS INTEGER), '로드맵 이해'),
        (1, CAST(NULL AS INTEGER), '역할 정의'),
        (1, CAST(NULL AS INTEGER), '학습 목표'),
        (2, CAST(NULL AS INTEGER), '핵심 용어'),
        (2, CAST(NULL AS INTEGER), '개념 모델링'),
        (2, CAST(NULL AS INTEGER), '기초 원리'),
        (3, CAST(NULL AS INTEGER), '개발 환경'),
        (3, CAST(NULL AS INTEGER), '도구 설정'),
        (3, CAST(NULL AS INTEGER), '워크플로우'),
        (4, CAST(NULL AS INTEGER), '기초 실습'),
        (4, CAST(NULL AS INTEGER), '기능 구현'),
        (4, CAST(NULL AS INTEGER), '피드백 루프'),
        (5, CAST(NULL AS INTEGER), '데이터 모델링'),
        (5, CAST(NULL AS INTEGER), '상태 관리'),
        (5, CAST(NULL AS INTEGER), '요구사항 분석'),
        (6, CAST(NULL AS INTEGER), '테스트'),
        (6, CAST(NULL AS INTEGER), '품질 관리'),
        (6, CAST(NULL AS INTEGER), '오류 처리'),
        (7, CAST(NULL AS INTEGER), '문서화'),
        (7, CAST(NULL AS INTEGER), '코드 리뷰'),
        (7, CAST(NULL AS INTEGER), '협업'),
        (8, 1, '성능 측정'),
        (8, 1, '병목 분석'),
        (8, 1, '최적화'),
        (9, 1, '자동화'),
        (9, 1, '모니터링'),
        (9, 1, '배포'),
        (8, 2, '아키텍처'),
        (8, 2, '모듈화'),
        (8, 2, '확장성'),
        (9, 2, '보안'),
        (9, 2, '안정성'),
        (9, 2, '장애 대응'),
        (10, CAST(NULL AS INTEGER), '프로젝트 설계'),
        (10, CAST(NULL AS INTEGER), 'MVP'),
        (10, CAST(NULL AS INTEGER), '실전 구현'),
        (11, CAST(NULL AS INTEGER), '포트폴리오'),
        (11, CAST(NULL AS INTEGER), '면접 준비'),
        (11, CAST(NULL AS INTEGER), '기술 설명')
),
generated_tags AS (
    SELECT display_name AS tag_name, tag_category AS category
    FROM target_roadmaps
    UNION ALL
    SELECT display_name || ' ' || detail_seed.detail_suffix AS tag_name, tag_category AS category
    FROM target_roadmaps
    CROSS JOIN detail_tag_seed detail_seed
    UNION ALL
    SELECT core_seed.core_tag AS tag_name, 'Roadmap Node' AS category
    FROM core_tag_seed core_seed
)
SELECT generated_tags.tag_name, MIN(generated_tags.category), TRUE, FALSE
FROM generated_tags
LEFT JOIN tags existing ON existing.name = generated_tags.tag_name
WHERE existing.tag_id IS NULL
GROUP BY generated_tags.tag_name;

INSERT INTO node_required_tags (node_id, tag_id)
WITH target_roadmaps AS (
    SELECT
        r.roadmap_id,
        COALESCE(MAX(item.subtitle), r.title) AS display_name
    FROM roadmap_hub_items item
    JOIN roadmap_hub_sections section_item ON section_item.id = item.section_id
    JOIN roadmaps r ON r.roadmap_id = item.linked_roadmap_id
    WHERE item.linked_roadmap_id IS NOT NULL
      AND item.is_active = TRUE
      AND section_item.is_active = TRUE
      AND r.is_official = TRUE
      AND r.is_deleted = FALSE
      AND r.title <> 'Backend Master Roadmap'
    GROUP BY r.roadmap_id, r.title
),
detail_tag_seed(sort_order, branch_group, detail_suffix) AS (
    VALUES
        (1, CAST(NULL AS INTEGER), '개요'),
        (2, CAST(NULL AS INTEGER), '핵심 개념'),
        (3, CAST(NULL AS INTEGER), '작업 환경'),
        (4, CAST(NULL AS INTEGER), '기초 실습'),
        (5, CAST(NULL AS INTEGER), '데이터 설계'),
        (6, CAST(NULL AS INTEGER), '테스트'),
        (7, CAST(NULL AS INTEGER), '협업 문서화'),
        (8, 1, '성능 최적화'),
        (9, 1, '운영 자동화'),
        (8, 2, '아키텍처 설계'),
        (9, 2, '보안 안정성'),
        (10, CAST(NULL AS INTEGER), '실전 프로젝트'),
        (11, CAST(NULL AS INTEGER), '포트폴리오')
),
core_tag_seed(sort_order, branch_group, core_tag) AS (
    VALUES
        (1, CAST(NULL AS INTEGER), '로드맵 이해'),
        (1, CAST(NULL AS INTEGER), '역할 정의'),
        (1, CAST(NULL AS INTEGER), '학습 목표'),
        (2, CAST(NULL AS INTEGER), '핵심 용어'),
        (2, CAST(NULL AS INTEGER), '개념 모델링'),
        (2, CAST(NULL AS INTEGER), '기초 원리'),
        (3, CAST(NULL AS INTEGER), '개발 환경'),
        (3, CAST(NULL AS INTEGER), '도구 설정'),
        (3, CAST(NULL AS INTEGER), '워크플로우'),
        (4, CAST(NULL AS INTEGER), '기초 실습'),
        (4, CAST(NULL AS INTEGER), '기능 구현'),
        (4, CAST(NULL AS INTEGER), '피드백 루프'),
        (5, CAST(NULL AS INTEGER), '데이터 모델링'),
        (5, CAST(NULL AS INTEGER), '상태 관리'),
        (5, CAST(NULL AS INTEGER), '요구사항 분석'),
        (6, CAST(NULL AS INTEGER), '테스트'),
        (6, CAST(NULL AS INTEGER), '품질 관리'),
        (6, CAST(NULL AS INTEGER), '오류 처리'),
        (7, CAST(NULL AS INTEGER), '문서화'),
        (7, CAST(NULL AS INTEGER), '코드 리뷰'),
        (7, CAST(NULL AS INTEGER), '협업'),
        (8, 1, '성능 측정'),
        (8, 1, '병목 분석'),
        (8, 1, '최적화'),
        (9, 1, '자동화'),
        (9, 1, '모니터링'),
        (9, 1, '배포'),
        (8, 2, '아키텍처'),
        (8, 2, '모듈화'),
        (8, 2, '확장성'),
        (9, 2, '보안'),
        (9, 2, '안정성'),
        (9, 2, '장애 대응'),
        (10, CAST(NULL AS INTEGER), '프로젝트 설계'),
        (10, CAST(NULL AS INTEGER), 'MVP'),
        (10, CAST(NULL AS INTEGER), '실전 구현'),
        (11, CAST(NULL AS INTEGER), '포트폴리오'),
        (11, CAST(NULL AS INTEGER), '면접 준비'),
        (11, CAST(NULL AS INTEGER), '기술 설명')
),
target_nodes AS (
    SELECT
        target.display_name,
        rn.node_id,
        rn.sort_order,
        rn.branch_group,
        target.display_name ||
            CASE
                WHEN rn.branch_group IS NULL AND rn.sort_order <= 3 THEN ' Fundamentals'
                WHEN rn.branch_group IS NULL AND rn.sort_order <= 7 THEN ' Practice'
                ELSE ' Advanced'
            END AS stage_tag
    FROM target_roadmaps target
    JOIN roadmap_nodes rn ON rn.roadmap_id = target.roadmap_id
),
node_tag_candidates AS (
    SELECT node_id, display_name AS tag_name
    FROM target_nodes
    UNION ALL
    SELECT node_id, stage_tag AS tag_name
    FROM target_nodes
    UNION ALL
    SELECT target_nodes.node_id, target_nodes.display_name || ' ' || detail_seed.detail_suffix AS tag_name
    FROM target_nodes
    JOIN detail_tag_seed detail_seed
        ON detail_seed.sort_order = target_nodes.sort_order
       AND (
           detail_seed.branch_group = target_nodes.branch_group
           OR (detail_seed.branch_group IS NULL AND target_nodes.branch_group IS NULL)
       )
    UNION ALL
    SELECT target_nodes.node_id, core_seed.core_tag AS tag_name
    FROM target_nodes
    JOIN core_tag_seed core_seed
        ON core_seed.sort_order = target_nodes.sort_order
       AND (
           core_seed.branch_group = target_nodes.branch_group
           OR (core_seed.branch_group IS NULL AND target_nodes.branch_group IS NULL)
       )
)
SELECT DISTINCT node_tags.node_id, tag_item.tag_id
FROM node_tag_candidates node_tags
JOIN tags tag_item ON tag_item.name = node_tags.tag_name
WHERE NOT EXISTS (
    SELECT 1
    FROM node_required_tags existing
    WHERE existing.node_id = node_tags.node_id
      AND existing.tag_id = tag_item.tag_id
);

-- Roadmap Hub official roadmap free reference resources
-- Adds primary official/free documentation links to every node of each official roadmap.
INSERT INTO roadmap_node_resources (
    node_id, title, url, description, source_type, sort_order, active, created_at, updated_at
)
WITH roadmap_resource_seed(roadmap_title, resource_title, url, description, source_type, sort_order) AS (
    VALUES
        ('Frontend Entry Roadmap', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Web', 'Free web platform reference for HTML, CSS, JavaScript, Web APIs, performance, and security.', 'DOCS', 1),
        ('Frontend Entry Roadmap', 'React Learn', 'https://react.dev/learn', 'Official React learning path for component-based UI development.', 'OFFICIAL', 2),
        ('Backend Master Roadmap', 'Spring Boot Reference', 'https://docs.spring.io/spring-boot/index.html', 'Official Spring Boot reference for backend application development and production features.', 'OFFICIAL', 1),
        ('Backend Master Roadmap', 'Java Documentation', 'https://docs.oracle.com/en/java/', 'Official Java documentation for language, platform, and standard library references.', 'OFFICIAL', 2),
        ('Full Stack', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Web', 'Free web platform reference for full stack developers working across browser and API boundaries.', 'DOCS', 1),
        ('Full Stack', 'Spring Boot Reference', 'https://docs.spring.io/spring-boot/index.html', 'Official backend reference for building APIs and production-ready services.', 'OFFICIAL', 2),
        ('DevOps', 'Docker Docs', 'https://docs.docker.com/', 'Official Docker documentation for images, containers, Compose, and build workflows.', 'OFFICIAL', 1),
        ('DevOps', 'Kubernetes Documentation', 'https://kubernetes.io/docs/home/', 'Official Kubernetes documentation for deployment, scaling, services, and cluster operations.', 'OFFICIAL', 2),
        ('DevSecOps', 'OWASP Top 10', 'https://owasp.org/www-project-top-ten/', 'Free OWASP reference for common web application security risks and mitigations.', 'OFFICIAL', 1),
        ('DevSecOps', 'Kubernetes Security Documentation', 'https://kubernetes.io/docs/concepts/security/', 'Official Kubernetes security concepts for workloads, access, policy, and cluster hardening.', 'OFFICIAL', 2),
        ('Data Analyst', 'Pandas Documentation', 'https://pandas.pydata.org/docs/', 'Official pandas documentation for tabular data analysis and transformation.', 'OFFICIAL', 1),
        ('Data Analyst', 'Power BI Documentation', 'https://learn.microsoft.com/en-us/power-bi/', 'Microsoft Learn documentation for Power BI modeling, visualization, and reporting.', 'OFFICIAL', 2),
        ('AI Engineer', 'OpenAI API Documentation', 'https://platform.openai.com/docs', 'Official OpenAI API documentation for models, prompting, tool use, and production integration.', 'OFFICIAL', 1),
        ('AI Engineer', 'Anthropic Claude Documentation', 'https://docs.anthropic.com/en/docs/overview', 'Official Anthropic documentation for building with Claude and AI workflows.', 'OFFICIAL', 2),
        ('AI and Data Scientist', 'Scikit-learn User Guide', 'https://scikit-learn.org/stable/user_guide.html', 'Official scikit-learn guide for classical machine learning workflows.', 'OFFICIAL', 1),
        ('AI and Data Scientist', 'Pandas Documentation', 'https://pandas.pydata.org/docs/', 'Official pandas documentation for data preparation, exploration, and analysis.', 'OFFICIAL', 2),
        ('Data Engineer', 'Apache Spark Documentation', 'https://spark.apache.org/docs/latest/', 'Official Spark documentation for distributed data processing.', 'OFFICIAL', 1),
        ('Data Engineer', 'Apache Airflow Documentation', 'https://airflow.apache.org/docs/', 'Official Airflow documentation for workflow scheduling and data pipeline orchestration.', 'OFFICIAL', 2),
        ('Android', 'Android Developers Documentation', 'https://developer.android.com/docs', 'Official Android developer documentation for app architecture, UI, storage, and platform APIs.', 'OFFICIAL', 1),
        ('Android', 'Kotlin Documentation', 'https://kotlinlang.org/docs/home.html', 'Official Kotlin documentation for language features used in Android development.', 'OFFICIAL', 2),
        ('Machine Learning', 'Scikit-learn User Guide', 'https://scikit-learn.org/stable/user_guide.html', 'Official scikit-learn guide for modeling, validation, and preprocessing.', 'OFFICIAL', 1),
        ('Machine Learning', 'PyTorch Tutorials', 'https://pytorch.org/tutorials/', 'Official PyTorch tutorials for deep learning implementation and experimentation.', 'OFFICIAL', 2),
        ('PostgreSQL', 'PostgreSQL Documentation', 'https://www.postgresql.org/docs/', 'Official PostgreSQL documentation for SQL, indexes, transactions, and administration.', 'OFFICIAL', 1),
        ('PostgreSQL', 'PostgreSQL Tutorial', 'https://www.postgresql.org/docs/current/tutorial.html', 'Official PostgreSQL tutorial for practical database fundamentals.', 'OFFICIAL', 2),
        ('iOS', 'Apple Developer Documentation', 'https://developer.apple.com/documentation/', 'Official Apple developer documentation for iOS frameworks and platform APIs.', 'OFFICIAL', 1),
        ('iOS', 'Swift Documentation', 'https://developer.apple.com/swift/', 'Apple Swift documentation and learning resources for iOS development.', 'OFFICIAL', 2),
        ('Blockchain', 'Ethereum Developer Documentation', 'https://ethereum.org/developers/docs/', 'Ethereum documentation for smart contracts, accounts, transactions, and dapps.', 'DOCS', 1),
        ('Blockchain', 'Solidity Documentation', 'https://docs.soliditylang.org/', 'Official Solidity documentation for smart contract language fundamentals.', 'OFFICIAL', 2),
        ('QA', 'Playwright Documentation', 'https://playwright.dev/docs/intro', 'Official Playwright documentation for reliable browser and end-to-end testing.', 'OFFICIAL', 1),
        ('QA', 'Selenium Documentation', 'https://www.selenium.dev/documentation/', 'Official Selenium documentation for browser automation and test architecture.', 'OFFICIAL', 2),
        ('Software Architect', 'AWS Well-Architected Framework', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', 'AWS guidance for reliability, security, performance, cost, and operational excellence.', 'OFFICIAL', 1),
        ('Software Architect', 'Microsoft Azure Architecture Center', 'https://learn.microsoft.com/en-us/azure/architecture/', 'Microsoft architecture guidance for cloud application design and system patterns.', 'OFFICIAL', 2),
        ('Cyber Security', 'OWASP Top 10', 'https://owasp.org/www-project-top-ten/', 'Free OWASP reference for common application security risks.', 'OFFICIAL', 1),
        ('Cyber Security', 'NIST Cybersecurity Framework', 'https://www.nist.gov/cyberframework', 'NIST cybersecurity framework reference for identifying and managing security risk.', 'OFFICIAL', 2),
        ('UX Design', 'Material Design', 'https://m3.material.io/', 'Google Material Design guidance for accessible interface components and interaction patterns.', 'OFFICIAL', 1),
        ('UX Design', 'W3C Web Accessibility Initiative', 'https://www.w3.org/WAI/fundamentals/', 'W3C accessibility fundamentals for inclusive UX decisions.', 'OFFICIAL', 2),
        ('Technical Writer', 'Google Developer Documentation Style Guide', 'https://developers.google.com/style', 'Google style guide for clear developer documentation.', 'OFFICIAL', 1),
        ('Technical Writer', 'Microsoft Writing Style Guide', 'https://learn.microsoft.com/en-us/style-guide/welcome/', 'Microsoft writing guidance for concise, consistent technical content.', 'OFFICIAL', 2),
        ('Game Developer', 'Unity Manual', 'https://docs.unity3d.com/Manual/UnityManual.html', 'Official Unity manual for game object, scene, asset, and build workflows.', 'OFFICIAL', 1),
        ('Game Developer', 'Unreal Engine Documentation', 'https://dev.epicgames.com/documentation/en-us/unreal-engine/', 'Official Unreal Engine documentation for gameplay systems and production workflows.', 'OFFICIAL', 2),
        ('Server Side Game Developer', 'Unity Netcode Documentation', 'https://docs-multiplayer.unity3d.com/netcode/current/about/', 'Official Unity Netcode documentation for multiplayer and server-aware game systems.', 'OFFICIAL', 1),
        ('Server Side Game Developer', 'Nakama Documentation', 'https://docs.nakama.io/', 'Free Nakama documentation for realtime multiplayer, authentication, and game server features.', 'DOCS', 2),
        ('MLOps', 'MLflow Documentation', 'https://mlflow.org/docs/latest/index.html', 'Official MLflow documentation for experiment tracking, model packaging, and registry workflows.', 'OFFICIAL', 1),
        ('MLOps', 'Kubeflow Documentation', 'https://www.kubeflow.org/docs/', 'Kubeflow documentation for ML workflows on Kubernetes.', 'DOCS', 2),
        ('Product Manager', 'Atlassian Product Management Guide', 'https://www.atlassian.com/agile/product-management', 'Free product management guide for discovery, prioritization, and delivery collaboration.', 'DOCS', 1),
        ('Product Manager', 'Atlassian Agile Guide', 'https://www.atlassian.com/agile', 'Free agile product delivery guide for backlog, iteration, and team coordination.', 'DOCS', 2),
        ('Engineering Manager', 'Google Engineering Practices', 'https://google.github.io/eng-practices/', 'Free Google engineering practices for code review, readability, and engineering quality.', 'DOCS', 1),
        ('Engineering Manager', 'Microsoft Engineering Playbook', 'https://github.com/microsoft/code-with-engineering-playbook', 'Free Microsoft engineering playbook for team practices and delivery standards.', 'DOCS', 2),
        ('Developer Relations', 'Google Developer Communities', 'https://developers.google.com/community', 'Google developer community material for programs, events, and developer engagement.', 'OFFICIAL', 1),
        ('Developer Relations', 'GitHub Community Documentation', 'https://docs.github.com/en/communities', 'GitHub documentation for community health, contribution workflows, and collaboration.', 'OFFICIAL', 2),
        ('BI Analyst', 'Power BI Documentation', 'https://learn.microsoft.com/en-us/power-bi/', 'Microsoft Power BI documentation for modeling, dashboards, and analytics reports.', 'OFFICIAL', 1),
        ('BI Analyst', 'Tableau Help', 'https://help.tableau.com/current/guides/get-started-tutorial/en-us/get-started-tutorial-home.htm', 'Free Tableau getting started guide for BI dashboard creation.', 'DOCS', 2),
        ('SQL', 'PostgreSQL Documentation', 'https://www.postgresql.org/docs/', 'Official PostgreSQL documentation for SQL, transactions, indexes, and query behavior.', 'OFFICIAL', 1),
        ('SQL', 'SQLite Documentation', 'https://www.sqlite.org/docs.html', 'Official SQLite documentation for SQL features and embedded database behavior.', 'OFFICIAL', 2),
        ('Computer Science', 'CS50', 'https://cs50.harvard.edu/x/', 'Free Harvard CS50 course material for computer science fundamentals.', 'DOCS', 1),
        ('Computer Science', 'MIT OpenCourseWare Computer Science', 'https://ocw.mit.edu/search/?d=Electrical%20Engineering%20and%20Computer%20Science', 'Free MIT OpenCourseWare materials for computer science and engineering foundations.', 'DOCS', 2),
        ('React', 'React Learn', 'https://react.dev/learn', 'Official React learning path for components, state, effects, and UI composition.', 'OFFICIAL', 1),
        ('React', 'React Reference', 'https://react.dev/reference/react', 'Official React API reference for hooks, components, and runtime APIs.', 'OFFICIAL', 2),
        ('Vue', 'Vue Guide', 'https://vuejs.org/guide/introduction.html', 'Official Vue guide for progressive UI development and component patterns.', 'OFFICIAL', 1),
        ('Vue', 'Vue API Reference', 'https://vuejs.org/api/', 'Official Vue API reference for application, reactivity, and component APIs.', 'OFFICIAL', 2),
        ('Angular', 'Angular Overview', 'https://angular.dev/overview', 'Official Angular documentation for framework concepts and application structure.', 'OFFICIAL', 1),
        ('Angular', 'Angular Tutorials', 'https://angular.dev/tutorials', 'Official Angular tutorials for component and application implementation.', 'OFFICIAL', 2),
        ('JavaScript', 'MDN JavaScript', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', 'MDN JavaScript reference for language fundamentals and browser use.', 'DOCS', 1),
        ('JavaScript', 'ECMAScript Specification', 'https://tc39.es/ecma262/', 'Official ECMAScript language specification for JavaScript semantics.', 'OFFICIAL', 2),
        ('TypeScript', 'TypeScript Documentation', 'https://www.typescriptlang.org/docs/', 'Official TypeScript documentation and handbook entry point.', 'OFFICIAL', 1),
        ('TypeScript', 'TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html', 'Official TypeScript handbook for types, generics, narrowing, and project structure.', 'OFFICIAL', 2),
        ('Node.js', 'Node.js Learn', 'https://nodejs.org/en/learn', 'Official Node.js learning material for runtime fundamentals and application patterns.', 'OFFICIAL', 1),
        ('Node.js', 'Node.js API Documentation', 'https://nodejs.org/api/', 'Official Node.js API reference for runtime modules and server-side JavaScript APIs.', 'OFFICIAL', 2),
        ('Python', 'Python Documentation', 'https://docs.python.org/3/', 'Official Python documentation for language, standard library, and tutorials.', 'OFFICIAL', 1),
        ('Python', 'Python Tutorial', 'https://docs.python.org/3/tutorial/', 'Official Python tutorial for language fundamentals and idiomatic usage.', 'OFFICIAL', 2),
        ('System Design', 'AWS Well-Architected Framework', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', 'AWS framework for designing secure, reliable, efficient, and cost-aware systems.', 'OFFICIAL', 1),
        ('System Design', 'Azure Architecture Center', 'https://learn.microsoft.com/en-us/azure/architecture/', 'Microsoft guidance for cloud system architecture patterns and tradeoffs.', 'OFFICIAL', 2),
        ('Java', 'Java Documentation', 'https://docs.oracle.com/en/java/', 'Official Java documentation for platform and language references.', 'OFFICIAL', 1),
        ('Java', 'Oracle Java Tutorials', 'https://docs.oracle.com/javase/tutorial/', 'Oracle Java tutorials for core language and platform fundamentals.', 'OFFICIAL', 2),
        ('ASP.NET Core', 'ASP.NET Core Documentation', 'https://learn.microsoft.com/en-us/aspnet/core/', 'Microsoft documentation for ASP.NET Core web applications and APIs.', 'OFFICIAL', 1),
        ('ASP.NET Core', '.NET Documentation', 'https://learn.microsoft.com/en-us/dotnet/', 'Microsoft .NET documentation for runtime, libraries, and application development.', 'OFFICIAL', 2),
        ('API Design', 'OpenAPI Specification', 'https://spec.openapis.org/oas/latest.html', 'Official OpenAPI specification for describing HTTP APIs.', 'OFFICIAL', 1),
        ('API Design', 'Microsoft REST API Guidelines', 'https://github.com/microsoft/api-guidelines', 'Free Microsoft API design guidelines for RESTful service consistency.', 'DOCS', 2),
        ('Spring Boot', 'Spring Boot Reference', 'https://docs.spring.io/spring-boot/index.html', 'Official Spring Boot reference for application development and operations.', 'OFFICIAL', 1),
        ('Spring Boot', 'Spring Guides', 'https://spring.io/guides', 'Official Spring guides for practical framework examples.', 'OFFICIAL', 2),
        ('Flutter', 'Flutter Documentation', 'https://docs.flutter.dev/', 'Official Flutter documentation for UI, platform integration, state, and deployment.', 'OFFICIAL', 1),
        ('Flutter', 'Dart Documentation', 'https://dart.dev/guides', 'Official Dart documentation for the language and ecosystem used by Flutter.', 'OFFICIAL', 2),
        ('C++', 'Cppreference', 'https://en.cppreference.com/w/', 'Free C++ language and standard library reference.', 'DOCS', 1),
        ('C++', 'ISO C++ Get Started', 'https://isocpp.org/get-started', 'Free ISO C++ getting started resources and language guidance.', 'DOCS', 2),
        ('Rust', 'The Rust Book', 'https://doc.rust-lang.org/book/', 'Official Rust book for ownership, borrowing, lifetimes, and practical Rust programming.', 'OFFICIAL', 1),
        ('Rust', 'Rust Standard Library', 'https://doc.rust-lang.org/std/', 'Official Rust standard library reference.', 'OFFICIAL', 2),
        ('Go Roadmap', 'Go Documentation', 'https://go.dev/doc/', 'Official Go documentation for language, tools, modules, and effective usage.', 'OFFICIAL', 1),
        ('Go Roadmap', 'Effective Go', 'https://go.dev/doc/effective_go', 'Official guide to idiomatic Go programming practices.', 'OFFICIAL', 2),
        ('Design and Architecture', 'AWS Well-Architected Framework', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', 'AWS architecture guidance for tradeoff-driven system design.', 'OFFICIAL', 1),
        ('Design and Architecture', 'Azure Architecture Center', 'https://learn.microsoft.com/en-us/azure/architecture/', 'Microsoft architecture center for design patterns and reference architectures.', 'OFFICIAL', 2),
        ('GraphQL', 'GraphQL Learn', 'https://graphql.org/learn/', 'Official GraphQL learning material for schemas, queries, mutations, and execution.', 'OFFICIAL', 1),
        ('GraphQL', 'GraphQL Specification', 'https://spec.graphql.org/', 'Official GraphQL specification reference.', 'OFFICIAL', 2),
        ('React Native', 'React Native Documentation', 'https://reactnative.dev/docs/getting-started', 'Official React Native documentation for native app development with React.', 'OFFICIAL', 1),
        ('React Native', 'Expo Documentation', 'https://docs.expo.dev/', 'Official Expo documentation for React Native tooling and app delivery.', 'OFFICIAL', 2),
        ('Design System', 'Material Design', 'https://m3.material.io/', 'Google Material Design system guidance for components, patterns, and accessibility.', 'OFFICIAL', 1),
        ('Design System', 'Storybook Documentation', 'https://storybook.js.org/docs', 'Official Storybook documentation for component-driven UI development.', 'OFFICIAL', 2),
        ('Prompt Engineering', 'OpenAI Prompt Engineering Guide', 'https://platform.openai.com/docs/guides/prompt-engineering', 'OpenAI guide for prompt design and model instruction patterns.', 'OFFICIAL', 1),
        ('Prompt Engineering', 'Anthropic Prompt Engineering', 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', 'Anthropic guide for structuring prompts and improving Claude responses.', 'OFFICIAL', 2),
        ('MongoDB', 'MongoDB Documentation', 'https://www.mongodb.com/docs/', 'Official MongoDB documentation for data modeling, queries, indexes, and operations.', 'OFFICIAL', 1),
        ('MongoDB', 'MongoDB Manual', 'https://www.mongodb.com/docs/manual/', 'Official MongoDB manual for server behavior and database features.', 'OFFICIAL', 2),
        ('Linux', 'Linux man-pages', 'https://man7.org/linux/man-pages/', 'Free Linux manual pages for commands, system calls, and core operating system behavior.', 'DOCS', 1),
        ('Linux', 'GNU Bash Manual', 'https://www.gnu.org/software/bash/manual/bash.html', 'Official GNU Bash manual for shell usage and scripting fundamentals.', 'OFFICIAL', 2),
        ('Kubernetes', 'Kubernetes Documentation', 'https://kubernetes.io/docs/home/', 'Official Kubernetes documentation for workloads, networking, storage, and operations.', 'OFFICIAL', 1),
        ('Kubernetes', 'Kubernetes Concepts', 'https://kubernetes.io/docs/concepts/', 'Official Kubernetes concepts guide for cluster architecture and resource models.', 'OFFICIAL', 2),
        ('Docker', 'Docker Docs', 'https://docs.docker.com/', 'Official Docker documentation for container development and operations.', 'OFFICIAL', 1),
        ('Docker', 'Dockerfile Reference', 'https://docs.docker.com/reference/dockerfile/', 'Official Dockerfile reference for image build instructions.', 'OFFICIAL', 2),
        ('AWS', 'AWS Documentation', 'https://docs.aws.amazon.com/', 'Official AWS documentation entry point for cloud services.', 'OFFICIAL', 1),
        ('AWS', 'AWS Well-Architected Framework', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', 'AWS framework for secure, reliable, performant, and cost-aware cloud design.', 'OFFICIAL', 2),
        ('Terraform', 'Terraform Documentation', 'https://developer.hashicorp.com/terraform/docs', 'Official Terraform documentation for infrastructure as code workflows.', 'OFFICIAL', 1),
        ('Terraform', 'Terraform AWS Provider Documentation', 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs', 'Official Terraform Registry documentation for AWS provider resources.', 'OFFICIAL', 2),
        ('Data Structures & Algorithms', 'VisuAlgo', 'https://visualgo.net/en', 'Free visual explanations for core data structures and algorithms.', 'DOCS', 1),
        ('Data Structures & Algorithms', 'CP Algorithms', 'https://cp-algorithms.com/', 'Free algorithm reference covering graph, dynamic programming, math, and data structures.', 'DOCS', 2),
        ('Redis', 'Redis Documentation', 'https://redis.io/docs/latest/', 'Official Redis documentation for data structures, commands, and deployment concepts.', 'OFFICIAL', 1),
        ('Redis', 'Redis Commands', 'https://redis.io/docs/latest/commands/', 'Official Redis command reference.', 'OFFICIAL', 2),
        ('Git and GitHub', 'Git Documentation', 'https://git-scm.com/doc', 'Official Git documentation and book for version control workflows.', 'OFFICIAL', 1),
        ('Git and GitHub', 'GitHub Docs', 'https://docs.github.com/en', 'Official GitHub documentation for repositories, pull requests, actions, and collaboration.', 'OFFICIAL', 2),
        ('PHP', 'PHP Documentation', 'https://www.php.net/docs.php', 'Official PHP documentation for language and standard library references.', 'OFFICIAL', 1),
        ('PHP', 'PHP The Right Way', 'https://phptherightway.com/', 'Free community guide for modern PHP practices.', 'DOCS', 2),
        ('Cloudflare', 'Cloudflare Docs', 'https://developers.cloudflare.com/', 'Official Cloudflare developer documentation for edge, security, and deployment products.', 'OFFICIAL', 1),
        ('Cloudflare', 'Cloudflare Workers Docs', 'https://developers.cloudflare.com/workers/', 'Official Cloudflare Workers documentation for edge compute applications.', 'OFFICIAL', 2),
        ('AI Red Teaming', 'OWASP LLM Top 10', 'https://owasp.org/www-project-top-10-for-large-language-model-applications/', 'OWASP guidance for common LLM application risks and mitigations.', 'OFFICIAL', 1),
        ('AI Red Teaming', 'NIST AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework', 'NIST framework for managing AI system risks.', 'OFFICIAL', 2),
        ('AI Agents', 'OpenAI Agents Guide', 'https://platform.openai.com/docs/guides/agents', 'OpenAI guide for building agentic workflows and tool-using AI systems.', 'OFFICIAL', 1),
        ('AI Agents', 'LangChain Documentation', 'https://python.langchain.com/docs/', 'LangChain documentation for agent and orchestration patterns.', 'DOCS', 2),
        ('Next.js', 'Next.js Documentation', 'https://nextjs.org/docs', 'Official Next.js documentation for routing, rendering, data fetching, and deployment.', 'OFFICIAL', 1),
        ('Next.js', 'React Learn', 'https://react.dev/learn', 'Official React learning path for the UI foundation used by Next.js.', 'OFFICIAL', 2),
        ('Code Review', 'Google Engineering Practices Code Review', 'https://google.github.io/eng-practices/review/', 'Free Google guidance for code review process and reviewer expectations.', 'DOCS', 1),
        ('Code Review', 'GitHub Pull Request Reviews', 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests', 'Official GitHub documentation for reviewing changes in pull requests.', 'OFFICIAL', 2),
        ('Kotlin', 'Kotlin Documentation', 'https://kotlinlang.org/docs/home.html', 'Official Kotlin documentation for language, multiplatform, and tooling fundamentals.', 'OFFICIAL', 1),
        ('Kotlin', 'Android Kotlin Guide', 'https://developer.android.com/kotlin', 'Official Android Kotlin guide for app development.', 'OFFICIAL', 2),
        ('HTML', 'MDN HTML', 'https://developer.mozilla.org/en-US/docs/Web/HTML', 'MDN HTML reference for semantic markup and web document structure.', 'DOCS', 1),
        ('HTML', 'WHATWG HTML Standard', 'https://html.spec.whatwg.org/', 'Living HTML standard for browser behavior and markup semantics.', 'OFFICIAL', 2),
        ('CSS', 'MDN CSS', 'https://developer.mozilla.org/en-US/docs/Web/CSS', 'MDN CSS reference for styling, layout, animation, and responsive design.', 'DOCS', 1),
        ('CSS', 'CSS Working Group Drafts', 'https://drafts.csswg.org/', 'W3C CSS Working Group drafts and specifications.', 'OFFICIAL', 2),
        ('Swift & Swift UI', 'Swift Documentation', 'https://developer.apple.com/swift/', 'Apple Swift documentation and language resources.', 'OFFICIAL', 1),
        ('Swift & Swift UI', 'SwiftUI Documentation', 'https://developer.apple.com/documentation/swiftui/', 'Official Apple SwiftUI framework documentation.', 'OFFICIAL', 2),
        ('Shell / Bash', 'GNU Bash Manual', 'https://www.gnu.org/software/bash/manual/bash.html', 'Official GNU Bash manual for shell scripting and command behavior.', 'OFFICIAL', 1),
        ('Shell / Bash', 'ShellCheck Wiki', 'https://www.shellcheck.net/wiki/Home', 'Free ShellCheck reference for shell script diagnostics and best practices.', 'DOCS', 2),
        ('Laravel', 'Laravel Documentation', 'https://laravel.com/docs', 'Official Laravel documentation for framework fundamentals and application development.', 'OFFICIAL', 1),
        ('Laravel', 'PHP Documentation', 'https://www.php.net/docs.php', 'Official PHP language and standard library documentation used by Laravel developers.', 'OFFICIAL', 2),
        ('Elasticsearch', 'Elastic Docs', 'https://www.elastic.co/guide/', 'Official Elastic documentation for Elasticsearch, search, ingest, and operations.', 'OFFICIAL', 1),
        ('Elasticsearch', 'Elasticsearch Guide', 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html', 'Official Elasticsearch reference guide.', 'OFFICIAL', 2),
        ('WordPress', 'WordPress Developer Resources', 'https://developer.wordpress.org/', 'Official WordPress developer resources for themes, plugins, APIs, and blocks.', 'OFFICIAL', 1),
        ('WordPress', 'Learn WordPress', 'https://learn.wordpress.org/', 'Free WordPress learning materials and tutorials.', 'DOCS', 2),
        ('Django', 'Django Getting Started', 'https://www.djangoproject.com/start/', 'Official Django getting started resources.', 'OFFICIAL', 1),
        ('Django', 'Django Documentation', 'https://docs.djangoproject.com/en/stable/', 'Official Django documentation for models, views, templates, and deployment.', 'OFFICIAL', 2),
        ('Ruby', 'Ruby Documentation', 'https://www.ruby-lang.org/en/documentation/', 'Official Ruby documentation entry point.', 'OFFICIAL', 1),
        ('Ruby', 'Ruby in Twenty Minutes', 'https://www.ruby-lang.org/en/documentation/quickstart/', 'Official Ruby quickstart tutorial.', 'OFFICIAL', 2),
        ('Ruby on Rails', 'Ruby on Rails Guides', 'https://guides.rubyonrails.org/', 'Official Rails guides for MVC, Active Record, routing, and deployment.', 'OFFICIAL', 1),
        ('Ruby on Rails', 'Ruby Documentation', 'https://www.ruby-lang.org/en/documentation/', 'Official Ruby documentation for the language foundation behind Rails.', 'OFFICIAL', 2),
        ('Claude Code', 'Claude Code Documentation', 'https://docs.anthropic.com/en/docs/claude-code/overview', 'Official Anthropic Claude Code documentation for setup and agentic coding workflows.', 'OFFICIAL', 1),
        ('Claude Code', 'Claude Code Web Docs', 'https://code.claude.com/docs', 'Claude Code documentation for terminal, IDE, and browser workflows.', 'OFFICIAL', 2),
        ('Vibe Coding', 'Claude Code Documentation', 'https://docs.anthropic.com/en/docs/claude-code/overview', 'Official Claude Code documentation for AI-assisted coding workflows.', 'OFFICIAL', 1),
        ('Vibe Coding', 'OpenAI API Documentation', 'https://platform.openai.com/docs', 'Official OpenAI API documentation for AI coding assistants and workflow automation.', 'OFFICIAL', 2),
        ('Scala', 'Scala Documentation', 'https://docs.scala-lang.org/', 'Official Scala documentation and learning material.', 'OFFICIAL', 1),
        ('Scala', 'Scala 3 Book', 'https://docs.scala-lang.org/scala3/book/introduction.html', 'Official Scala 3 book for language fundamentals.', 'OFFICIAL', 2),
        ('OpenClaw', 'GitHub OpenClaw Search', 'https://github.com/search?q=OpenClaw&type=repositories', 'Free GitHub search entry for OpenClaw-related repositories and examples.', 'LINK', 1),
        ('OpenClaw', 'Open Source Guides', 'https://opensource.guide/', 'Free guide for evaluating and contributing to open source projects.', 'DOCS', 2)
)
SELECT
    rn.node_id,
    seed.resource_title,
    seed.url,
    seed.description,
    seed.source_type,
    seed.sort_order,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM roadmap_resource_seed seed
JOIN roadmaps r ON r.title = seed.roadmap_title
JOIN roadmap_nodes rn ON rn.roadmap_id = r.roadmap_id
WHERE r.is_official = TRUE
  AND r.is_deleted = FALSE
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_node_resources existing
      WHERE existing.node_id = rn.node_id
        AND existing.url = seed.url
  );

-- =============================================
-- TASK-22: Workspace 샘플 데이터
-- =============================================

INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
SELECT
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    'DevPath 팀 워크스페이스',
    'DevPath 팀 협업을 위한 스쿼드 워크스페이스',
    'SQUAD',
    'ACTIVE',
    FALSE,
    '2026-03-23 14:00:00',
    '2026-03-23 14:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace WHERE name = 'DevPath 팀 워크스페이스'
);

INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
SELECT
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    '포트폴리오 빌더 솔로',
    '개인 포트폴리오 제작을 위한 솔로 워크스페이스',
    'SOLO',
    'ACTIVE',
    FALSE,
    '2026-03-24 10:00:00',
    '2026-03-24 10:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace WHERE name = '포트폴리오 빌더 솔로'
);

INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
SELECT
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    '멘토링 세션 워크스페이스',
    '멘토와 함께하는 학습 워크스페이스',
    'MENTORING',
    'ACTIVE',
    FALSE,
    '2026-03-25 09:00:00',
    '2026-03-25 09:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace WHERE name = '멘토링 세션 워크스페이스'
);

-- workspace_member 샘플 데이터 (learner가 모든 워크스페이스 멤버)
INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    '2026-03-23 14:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_member
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND learner_id = (SELECT user_id FROM users WHERE email = 'learner@devpath.com')
);

INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
SELECT
    (SELECT id FROM workspace WHERE name = '포트폴리오 빌더 솔로'),
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    '2026-03-24 10:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_member
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = '포트폴리오 빌더 솔로')
      AND learner_id = (SELECT user_id FROM users WHERE email = 'learner@devpath.com')
);

INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
SELECT
    (SELECT id FROM workspace WHERE name = '멘토링 세션 워크스페이스'),
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    '2026-03-25 09:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_member
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = '멘토링 세션 워크스페이스')
      AND learner_id = (SELECT user_id FROM users WHERE email = 'learner@devpath.com')
);

-- workspace_task 샘플 데이터
INSERT INTO workspace_task (workspace_id, title, description, status, priority, assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    '로그인 API 구현',
    'JWT 기반 로그인 및 토큰 발급 API 구현',
    'TODO',
    'HIGH',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    '2026-06-01',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-23 14:00:00',
    '2026-03-23 14:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_task
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND title = '로그인 API 구현'
);

INSERT INTO workspace_task (workspace_id, title, description, status, priority, assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    '칸반 보드 UI 설계',
    'React 기반 드래그앤드롭 칸반 보드 UI 설계 및 구현',
    'IN_PROGRESS',
    'MEDIUM',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    '2026-06-10',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-24 09:00:00',
    '2026-03-24 09:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_task
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND title = '칸반 보드 UI 설계'
);

INSERT INTO workspace_task (workspace_id, title, description, status, priority, assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    'ERD 다이어그램 작성',
    '전체 도메인 ERD 다이어그램 작성 및 리뷰',
    'DONE',
    'LOW',
    NULL,
    '2026-05-15',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-22 10:00:00',
    '2026-03-22 10:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_task
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND title = 'ERD 다이어그램 작성'
);

INSERT INTO workspace_task (workspace_id, title, description, status, priority, assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = '포트폴리오 빌더 솔로'),
    '포트폴리오 초안 작성',
    '개인 포트폴리오 초안 작성 및 프로젝트 정리',
    'TODO',
    'MEDIUM',
    NULL,
    '2026-06-20',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-24 10:00:00',
    '2026-03-24 10:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_task
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = '포트폴리오 빌더 솔로')
      AND title = '포트폴리오 초안 작성'
);

-- milestone 샘플 데이터
INSERT INTO milestone (workspace_id, title, description, start_date, due_date, status, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    'v1.0 MVP 릴리즈',
    '핵심 기능 완성 및 스테이징 환경 배포',
    '2026-05-01',
    '2026-06-30',
    'IN_PROGRESS',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-23 14:00:00',
    '2026-03-23 14:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM milestone
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND title = 'v1.0 MVP 릴리즈'
);

INSERT INTO milestone (workspace_id, title, description, start_date, due_date, status, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    '코드 리뷰 프로세스 정립',
    'PR 템플릿 및 리뷰 가이드라인 작성',
    '2026-04-01',
    '2026-04-30',
    'DONE',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-22 10:00:00',
    '2026-04-30 18:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM milestone
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND title = '코드 리뷰 프로세스 정립'
);

INSERT INTO milestone (workspace_id, title, description, start_date, due_date, status, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = '포트폴리오 빌더 솔로'),
    '포트폴리오 v1 완성',
    '개인 포트폴리오 초안 작성 및 공개 링크 발급',
    '2026-06-01',
    '2026-07-31',
    'OPEN',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-24 10:00:00',
    '2026-03-24 10:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM milestone
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = '포트폴리오 빌더 솔로')
      AND title = '포트폴리오 v1 완성'
);

-- calendar_event 샘플 데이터
INSERT INTO calendar_event (workspace_id, title, description, start_at, end_at, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    '스프린트 킥오프 회의',
    '2주 스프린트 목표 설정 및 태스크 분배',
    '2026-06-02 10:00:00',
    '2026-06-02 11:00:00',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-23 14:00:00',
    '2026-03-23 14:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM calendar_event
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND title = '스프린트 킥오프 회의'
);

INSERT INTO calendar_event (workspace_id, title, description, start_at, end_at, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    '중간 데모',
    'v1.0 중간 진행 상황 공유 데모',
    '2026-06-16 14:00:00',
    '2026-06-16 15:00:00',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-24 09:00:00',
    '2026-03-24 09:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM calendar_event
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND title = '중간 데모'
);

INSERT INTO calendar_event (workspace_id, title, description, start_at, end_at, created_by_id, is_deleted, created_at, updated_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    '스프린트 회고',
    '2주 스프린트 KPT 회고 미팅',
    '2026-06-30 16:00:00',
    '2026-06-30 17:00:00',
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    FALSE,
    '2026-03-25 09:00:00',
    '2026-03-25 09:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM calendar_event
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND title = '스프린트 회고'
);

-- activity_log 샘플 데이터
INSERT INTO activity_log (workspace_id, actor_id, activity_type, description, created_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    'MEMBER_JOINED',
    '학습자가 워크스페이스에 참여했습니다.',
    '2026-03-20 09:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM activity_log
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND activity_type = 'MEMBER_JOINED'
);

INSERT INTO activity_log (workspace_id, actor_id, activity_type, description, created_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    'TASK_CREATED',
    '태스크 "API 설계 완료"가 생성되었습니다.',
    '2026-03-21 10:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM activity_log
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND activity_type = 'TASK_CREATED'
);

INSERT INTO activity_log (workspace_id, actor_id, activity_type, description, created_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    'MILESTONE_CREATED',
    '마일스톤 "MVP 기능 구현 완료"가 생성되었습니다.',
    '2026-03-22 11:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM activity_log
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND activity_type = 'MILESTONE_CREATED'
);

INSERT INTO activity_log (workspace_id, actor_id, activity_type, description, created_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    'DOC_UPDATED',
    'ERD 문서가 업데이트되었습니다.',
    '2026-03-23 14:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM activity_log
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND activity_type = 'DOC_UPDATED'
);

INSERT INTO activity_log (workspace_id, actor_id, activity_type, description, created_at)
SELECT
    (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스'),
    (SELECT user_id FROM users WHERE email = 'learner@devpath.com'),
    'MEETING_NOTE_CREATED',
    '회의록 "스프린트 킥오프"가 생성되었습니다.',
    '2026-03-24 15:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM activity_log
    WHERE workspace_id = (SELECT id FROM workspace WHERE name = 'DevPath 팀 워크스페이스')
      AND activity_type = 'MEETING_NOTE_CREATED'
);
