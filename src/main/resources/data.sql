-- OCR schema backfill for environments that already have ocr_results rows.
ALTER TABLE ocr_results
    ADD COLUMN IF NOT EXISTS source_image_url VARCHAR(500);

ALTER TABLE ocr_results
    ADD COLUMN IF NOT EXISTS status VARCHAR(30);

ALTER TABLE ocr_results
    ADD COLUMN IF NOT EXISTS searchable_normalized_text TEXT;

ALTER TABLE ocr_results
    ADD COLUMN IF NOT EXISTS timestamp_mappings TEXT;

ALTER TABLE ocr_results
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Fill defaults before tightening the new non-null columns.
UPDATE ocr_results
SET source_image_url = COALESCE(source_image_url, '')
WHERE source_image_url IS NULL;

UPDATE ocr_results
SET status = COALESCE(status, 'REQUESTED')
WHERE status IS NULL;

UPDATE ocr_results
SET searchable_normalized_text = COALESCE(searchable_normalized_text, LOWER(REGEXP_REPLACE(TRIM(extracted_text), '\s+', ' ', 'g')))
WHERE searchable_normalized_text IS NULL
  AND extracted_text IS NOT NULL;

UPDATE ocr_results
SET timestamp_mappings = COALESCE(
    timestamp_mappings,
    '[{"second":' || COALESCE(frame_timestamp_second, 0) || ',"text":"' ||
    REPLACE(REPLACE(REPLACE(COALESCE(extracted_text, ''), E'\\', E'\\\\'), '"', E'\\"'), E'\n', ' ') ||
    '"}]'
)
WHERE timestamp_mappings IS NULL;

UPDATE ocr_results
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE ocr_results
    ALTER COLUMN source_image_url SET DEFAULT '';

ALTER TABLE ocr_results
    ALTER COLUMN source_image_url SET NOT NULL;

ALTER TABLE ocr_results
    ALTER COLUMN status SET DEFAULT 'REQUESTED';

ALTER TABLE ocr_results
    ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ocr_results_user_lesson_frame
    ON ocr_results (user_id, lesson_id, frame_timestamp_second);

-- Recommendation support columns for history, warning, and supplement tracking.
ALTER TABLE recommendation_histories
    ADD COLUMN IF NOT EXISTS recommendation_id BIGINT;

ALTER TABLE recommendation_histories
    ADD COLUMN IF NOT EXISTS node_id BIGINT;

ALTER TABLE recommendation_histories
    ADD COLUMN IF NOT EXISTS action_type VARCHAR(30);

UPDATE recommendation_histories
SET action_type = COALESCE(action_type, 'GENERATED')
WHERE action_type IS NULL;

ALTER TABLE recommendation_histories
    ALTER COLUMN action_type SET DEFAULT 'GENERATED';

ALTER TABLE recommendation_histories
    ALTER COLUMN action_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recommendation_histories_user_created_at
    ON recommendation_histories (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_recommendation_histories_user_recommendation_id
    ON recommendation_histories (user_id, recommendation_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_histories_user_node_id
    ON recommendation_histories (user_id, node_id);

ALTER TABLE risk_warnings
    ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);

ALTER TABLE risk_warnings
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;

UPDATE risk_warnings
SET risk_level = COALESCE(risk_level, 'MEDIUM')
WHERE risk_level IS NULL;

UPDATE risk_warnings
SET acknowledged_at = COALESCE(acknowledged_at, created_at)
WHERE is_acknowledged = TRUE
  AND acknowledged_at IS NULL;

ALTER TABLE risk_warnings
    ALTER COLUMN risk_level SET DEFAULT 'MEDIUM';

ALTER TABLE risk_warnings
    ALTER COLUMN risk_level SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_risk_warnings_user_created_at
    ON risk_warnings (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_risk_warnings_user_acknowledged
    ON risk_warnings (user_id, is_acknowledged, created_at);

CREATE INDEX IF NOT EXISTS idx_risk_warnings_user_node_id
    ON risk_warnings (user_id, node_id);

ALTER TABLE supplement_recommendations
    ADD COLUMN IF NOT EXISTS priority INTEGER;

ALTER TABLE supplement_recommendations
    ADD COLUMN IF NOT EXISTS coverage_percent DOUBLE PRECISION;

ALTER TABLE supplement_recommendations
    ADD COLUMN IF NOT EXISTS missing_tag_count INTEGER;

ALTER TABLE supplement_recommendations
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

UPDATE supplement_recommendations
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supplement_recommendations_user_created_at
    ON supplement_recommendations (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_supplement_recommendations_user_node_created_at
    ON supplement_recommendations (user_id, node_id, created_at);

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

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

INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'learner@devpath.com',
    '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
    'Learner Kim',
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
    '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
    'Instructor Hong',
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
    '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
    'Admin Park',
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
SET password = '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2'
WHERE email IN ('learner@devpath.com', 'instructor@devpath.com', 'admin@devpath.com');

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
    '/images/profiles/instructor-hong.png',
    'Hong Backend Lab',
    'Spring Boot?? ??肉??꾩룄??굢????釉붋濡㏓ご?繞벿살탳???怨쀬Ŧ ?띠룆踰???濡ル츎 ?띠룆踰→쾮???낅퉵??',
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
    '/images/profiles/admin-park.png',
    'DevPath Admin',
    '?袁⑷섰???럹??롪틵???? ??蹂μ쟽 濾곌쑨?↑떋???裕????????紐껊퉵??',
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

INSERT INTO tags (name, category, is_official)
SELECT 'Java', 'Backend', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Java'
);

INSERT INTO tags (name, category, is_official)
SELECT 'Spring Boot', 'Backend', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Spring Boot'
);

INSERT INTO tags (name, category, is_official)
SELECT 'JPA', 'Backend', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'JPA'
);

INSERT INTO tags (name, category, is_official)
SELECT 'Spring Security', 'Backend', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Spring Security'
);

INSERT INTO tags (name, category, is_official)
SELECT 'HTTP', 'Backend', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'HTTP'
);

INSERT INTO tags (name, category, is_official)
SELECT 'PostgreSQL', 'Database', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'PostgreSQL'
);

INSERT INTO tags (name, category, is_official)
SELECT 'Redis', 'Database', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Redis'
);

INSERT INTO tags (name, category, is_official)
SELECT 'Docker', 'DevOps', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'Docker'
);

INSERT INTO tags (name, category, is_official)
SELECT 'React', 'Frontend', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'React'
);

INSERT INTO tags (name, category, is_official)
SELECT 'TypeScript', 'Frontend', TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'TypeScript'
);

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
    '/images/courses/spring-boot.png',
    '/videos/trailers/spring-boot.mp4',
    'assets/courses/trailers/spring-boot.mp4',
    95,
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
    '/images/courses/jpa.png',
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

INSERT INTO tags (name, category, is_official)
SELECT 'JWT', 'Backend', TRUE
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
    'Offline security special event',
    'Join the offline Spring Security special lecture and Q&A session.',
    TRUE,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    TIMESTAMP '2099-12-31 23:59:59',
    'March offline special lecture',
    'https://devpath.com/events/security-special',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM courses c
WHERE c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1
      FROM course_announcements ca
      WHERE ca.course_id = c.course_id
        AND ca.title = 'Offline security special event'
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
    'Course material update',
    'The latest Spring Boot Intro materials and examples have been updated.',
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
        AND ca.title = 'Course material update'
  );

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'DEBUGGING', '甕곌쑨???癒?쑎 筌욌뜄揆', '?癒?쑎 嚥≪뮄??? ????鈺곌퀗援??餓λ쵐???곗쨮 筌욌뜄揆??롫뮉 ??쀫탣?깆슦???덈뼄.',
       '?癒?쑎 嚥≪뮄?? ??????ｍ? 疫꿸퀡? 野껉퀗?? ??쇱젫 野껉퀗?든몴???뽮퐣??嚥??怨몃선雅뚯눘苑??', 1, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'DEBUGGING'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'IMPLEMENTATION', '?닌뗭겱 筌욌뜄揆', '疫꿸퀡???닌뗭겱 獄쎻뫗???援???블?獄쎻뫚堉???얠궠????쀫탣?깆슦???덈뼄.',
       '?袁⑹삺 ?닌듼? 筌뤴뫚紐?疫꿸퀡?? ?⑥쥓? 餓λ쵐???醫뤾문筌왖????ｍ뜞 ?怨몃선雅뚯눘苑??', 2, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'IMPLEMENTATION'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'CODE_REVIEW', '?꾨뗀諭??귐됰윮 筌욌뜄揆', '?臾믨쉐???꾨뗀諭??????揶쏆뮇苑?癒?뵠???귐뗫솯?醫딆춦 ??띻퍍??獄쏆룆????쀫탣?깆슦???덈뼄.',
       '???뼎 ?꾨뗀諭? ?袁⑹삺 ?怨뺤젻??鍮? ?源낅뮟/癰귣똻釉?揶쎛??녾쉐 ?온?癒?뱽 ??ｍ뜞 ?怨몃선雅뚯눘苑??', 3, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'CODE_REVIEW'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'CAREER', '?뚣끇???筌욌뜄揆', '?띯뫁毓? ???????? ??곸춦, 疫꿸퀣???醫뤾문 ?온??筌욌뜄揆 ??쀫탣?깆슦???덈뼄.',
       '?袁⑹삺 ?怨뱀넺, 筌뤴뫚紐?????? 癰귣똻? 野껋?肉? ?⑥쥓? ????紐? ?怨몃선雅뚯눘苑??', 4, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'CAREER'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'STUDY', '??덈뮸 筌욌뜄揆', '??덈뮸 ??뽮퐣??揶쏆뮆????꾨퉸???얠궠????쀫탣?깆슦???덈뼄.',
       '?袁⑹삺 ??꾨퉸????곸뒠??筌띾맪???筌왖?癒?뱽 ??ｍ뜞 ?怨몃선雅뚯눘苑??', 5, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'STUDY'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'PROJECT', '?袁⑥쨮??븍뱜 筌욌뜄揆', '?袁⑥쨮??븍뱜 ?닌듼? ?臾믩씜, 獄쏄퀬猷? ??곸겫 ?온??筌욌뜄揆 ??쀫탣?깆슦???덈뼄.',
       '?袁⑥쨮??븍뱜 獄쏄퀗瑗? ?袁⑹삺 ?닌듼? 獄쏆뮇源?餓λ쵐???얜챷?ｇ몴??怨몃선雅뚯눘苑??', 6, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'PROJECT'
);

-- ===========================
-- B ??????묐탣 ?怨쀬뵠??
-- ===========================

-- [1] review (5椰?
INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 5, '揶쏅벡????곸뒠????댭??ル뿭釉?? ???뼎 揶쏆뮆?????꾩쓺 ??살구??곸㉭??筌띾‘? ?袁?????뤿???щ빍??', 'ANSWERED', FALSE, FALSE, NULL, '2026-01-20 00:00:00', '2026-01-20 00:00:00'
FROM courses c, users u
WHERE c.title = 'Spring Boot Intro' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = '揶쏅벡????곸뒠????댭??ル뿭釉?? ???뼎 揶쏆뮆?????꾩쓺 ??살구??곸㉭??筌띾‘? ?袁?????뤿???щ빍??');

INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 4, 'JPA ??쇱읈 ???쉘???類ｌ춾 ?醫롮뒠??됰뮸??덈뼄. ??살춸 QueryDSL ?봔?브쑴??鈺곌퀗?????怨멸쉭??됱몵筌??ル뿪荑??곸뒄.', 'UNANSWERED', FALSE, FALSE, NULL, '2026-01-22 00:00:00', '2026-01-22 00:00:00'
FROM courses c, users u
WHERE c.title = 'JPA Practical Design' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = 'JPA ??쇱읈 ???쉘???類ｌ춾 ?醫롮뒠??됰뮸??덈뼄. ??살춸 QueryDSL ?봔?브쑴??鈺곌퀗?????怨멸쉭??됱몵筌??ル뿪荑??곸뒄.');

INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 3, '??살구?? ??꾨퉸??띾┛ ???????쇰뮸 ??됱젫揶쎛 ?ヂ ????쇰펶??됱몵筌??ル뿪荑??щ빍??', 'ANSWERED', FALSE, FALSE, NULL, '2026-01-25 00:00:00', '2026-01-25 00:00:00'
FROM courses c, users u
WHERE c.title = 'Spring Boot Intro' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = '??살구?? ??꾨퉸??띾┛ ???????쇰뮸 ??됱젫揶쎛 ?ヂ ????쇰펶??됱몵筌??ル뿪荑??щ빍??');

INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 5, 'N+1 ?얜챷????욧퍙 獄쎻뫖苡????쇱젫 ?袁⑥쨮??븍뱜??獄쏅뗀以??怨몄뒠??????됰???щ빍?? 揶쏅베???곕뗄荑??몃빍??', 'UNANSWERED', FALSE, FALSE, NULL, '2026-01-28 00:00:00', '2026-01-28 00:00:00'
FROM courses c, users u
WHERE c.title = 'JPA Practical Design' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = 'N+1 ?얜챷????욧퍙 獄쎻뫖苡????쇱젫 ?袁⑥쨮??븍뱜??獄쏅뗀以??怨몄뒠??????됰???щ빍?? 揶쏅베???곕뗄荑??몃빍??');

INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 2, '揶쏅벡????곸뒠?? ?ル뿭?筌???살구 ??얜즲揶쎛 ??댭???뫀????怨뺤뵬揶쎛疫?????醫롫뮸??덈뼄.', 'UNSATISFIED', FALSE, FALSE, NULL, '2026-02-01 00:00:00', '2026-02-01 00:00:00'
FROM courses c, users u
WHERE c.title = 'Spring Boot Intro' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = '揶쏅벡????곸뒠?? ?ル뿭?筌???살구 ??얜즲揶쎛 ??댭???뫀????怨뺤뵬揶쎛疫?????醫롫뮸??덈뼄.');

-- [2] review_reply (3椰?
INSERT INTO review_reply (review_id, instructor_id, content, is_deleted, created_at, updated_at)
SELECT r.id, u.user_id, '???㉦???귐됰윮 揶쏅Ŋ沅??몃빍?? ??롮몵嚥≪뮆猷????ル뿭? 揶쏅벡?썸에?癰귣????띿퓢??щ빍?? 亦낃낫????癒? ?紐꾩젫?醫? 筌욌뜄揆??雅뚯눘苑??', FALSE, '2026-01-21 00:00:00', '2026-01-21 00:00:00'
FROM review r, users u
WHERE r.content = '揶쏅벡????곸뒠????댭??ル뿭釉?? ???뼎 揶쏆뮆?????꾩쓺 ??살구??곸㉭??筌띾‘? ?袁?????뤿???щ빍??'
  AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.instructor_id = u.user_id);

INSERT INTO review_reply (review_id, instructor_id, content, is_deleted, created_at, updated_at)
SELECT r.id, u.user_id, '??곕굡獄?揶쏅Ŋ沅??몃빍?? 筌띾Ŋ???뤿뻿 ??쇰뮸 ??됱젫 ?봔?브쑴??癰귣똻???뤿연 ????낅쑓??꾨뱜??띿퓢??щ빍?? ??쇱벉 ??낅쑓??꾨뱜??疫꿸퀡???雅뚯눘苑??', FALSE, '2026-01-26 00:00:00', '2026-01-26 00:00:00'
FROM review r, users u
WHERE r.content = '??살구?? ??꾨퉸??띾┛ ???????쇰뮸 ??됱젫揶쎛 ?ヂ ????쇰펶??됱몵筌??ル뿪荑??щ빍??'
  AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.instructor_id = u.user_id);

INSERT INTO review_reply (review_id, instructor_id, content, is_deleted, created_at, updated_at)
SELECT r.id, u.user_id, '揶쏅벡????얜즲???????遺우춦????곕굡獄?揶쏅Ŋ沅??뺚뵲??덈뼄. ??살구 ??얜즲??鈺곌퀣???揶쏆뮇??癒?뱽 餓Β??餓λ쵐???덈뼄. ?븍뜇?????뺤젻 雅뚭쑴???몃빍??', FALSE, '2026-02-02 00:00:00', '2026-02-02 00:00:00'
FROM review r, users u
WHERE r.content = '揶쏅벡????곸뒠?? ?ル뿭?筌???살구 ??얜즲揶쎛 ??댭???뫀????怨뺤뵬揶쎛疫?????醫롫뮸??덈뼄.'
  AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.instructor_id = u.user_id);

-- [3] review_template (3椰?
INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '揶쏅Ŋ沅??紐꾧텢', '??띿뺏??雅뚯눘???筌욊쑴???곗쨮 揶쏅Ŋ沅??뺚뵲??덈뼄. ?ル뿭? ?귐됰윮??揶쏅벡?썹몴??遺우뒮 獄쏆뮇???쀪텕?????癒?짗?關????몃빍?? ??롮몵嚥≪뮆猷?筌ㅼ뮄???揶쏅벡?썸에?癰귣????띿퓢??щ빍??', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = '揶쏅Ŋ沅??紐꾧텢' AND rt.instructor_id = u.user_id);

INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '揶쏆뮇苑???뚮꺗', '???㉦????곕굡獄?揶쏅Ŋ沅??몃빍?? 筌띾Ŋ???雅뚯눘???봔?브쑴???쀬눊???野꺜?醫뤿릭??????? 揶쏅벡?썸에???낅쑓??꾨뱜??띿퓢??щ빍?? 筌왖??우읅???온?????臾믪뜚 ?봔?怨룸굡?깆럥???', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = '揶쏆뮇苑???뚮꺗' AND rt.instructor_id = u.user_id);

INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '筌욌뜄揆 ?醫딅즲', '揶쏅벡?썹몴???띿뺏??雅뚯눘???揶쏅Ŋ沅??몃빍?? ??덈뮸 餓?亦낃낫????癒?뵠 ??됱몵??뺛늺 Q&A 野껊슣??癒?뱽 ???퉸 筌욌뜄揆??雅뚯눘苑?? 筌ㅼ뮆?????쥓?ㅵ칰??????뺚봺野껋쥙???덈뼄!', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = '筌욌뜄揆 ?醫딅즲' AND rt.instructor_id = u.user_id);

-- [4] refund_request (3椰?
INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, '揶쏅벡????됱춳 ?븍뜄彛붻??, 'PENDING', FALSE, '2026-02-05 00:00:00', NULL
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = '揶쏅벡????됱춳 ?븍뜄彛붻?? AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, '餓λ쵎????띿뺏', 'APPROVED', FALSE, '2026-02-08 00:00:00', '2026-02-10 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = '餓λ쵎????띿뺏' AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, '揶쏆뮇??????, 'REJECTED', FALSE, '2026-02-12 00:00:00', '2026-02-13 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = '揶쏆뮇?????? AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

-- [5] settlement (3椰?
INSERT INTO settlement (instructor_id, amount, status, is_deleted, settled_at, created_at)
SELECT u.user_id, 690000, 'COMPLETED', FALSE, '2026-01-31 00:00:00', '2026-01-31 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM settlement s WHERE s.instructor_id = u.user_id AND s.amount = 690000 AND s.created_at = '2026-01-31 00:00:00');

INSERT INTO settlement (instructor_id, amount, status, is_deleted, settled_at, created_at)
SELECT u.user_id, 385000, 'PENDING', FALSE, NULL, '2026-02-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM settlement s WHERE s.instructor_id = u.user_id AND s.amount = 385000 AND s.created_at = '2026-02-15 00:00:00');

INSERT INTO settlement (instructor_id, amount, status, is_deleted, settled_at, created_at)
SELECT u.user_id, 1980000, 'HELD', FALSE, NULL, '2026-02-28 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM settlement s WHERE s.instructor_id = u.user_id AND s.amount = 1980000 AND s.created_at = '2026-02-28 00:00:00');

-- [6] coupon (2椰?
INSERT INTO coupon (instructor_id, coupon_code, discount_type, discount_value, target_course_id, max_usage_count, usage_count, expires_at, is_deleted, created_at)
SELECT u.user_id, 'HELLO2026', 'RATE', 30, NULL, 100, 45, '2026-02-28 23:59:59', FALSE, '2026-01-20 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM coupon c WHERE c.coupon_code = 'HELLO2026');

INSERT INTO coupon (instructor_id, coupon_code, discount_type, discount_value, target_course_id, max_usage_count, usage_count, expires_at, is_deleted, created_at)
SELECT u.user_id, 'JAVA_LAUNCH', 'FIXED', 15000, c.course_id, 200, 82, '2026-03-15 23:59:59', FALSE, '2026-01-20 00:00:00'
FROM users u, courses c
WHERE u.email = 'instructor@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM coupon cp WHERE cp.coupon_code = 'JAVA_LAUNCH');

-- [7] promotion (2椰?
INSERT INTO promotion (instructor_id, course_id, promotion_type, discount_rate, start_at, end_at, is_active, is_deleted, created_at)
SELECT u.user_id, c.course_id, 'TIMESALE', 20, '2026-02-01 00:00:00', '2026-02-07 23:59:59', TRUE, FALSE, '2026-01-30 00:00:00'
FROM users u, courses c
WHERE u.email = 'instructor@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM promotion p WHERE p.course_id = c.course_id AND p.promotion_type = 'TIMESALE' AND p.start_at = '2026-02-01 00:00:00');

INSERT INTO promotion (instructor_id, course_id, promotion_type, discount_rate, start_at, end_at, is_active, is_deleted, created_at)
SELECT u.user_id, c.course_id, 'GENERAL', 15, '2026-02-15 00:00:00', '2026-03-15 23:59:59', TRUE, FALSE, '2026-02-10 00:00:00'
FROM users u, courses c
WHERE u.email = 'instructor@devpath.com' AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (SELECT 1 FROM promotion p WHERE p.course_id = c.course_id AND p.promotion_type = 'GENERAL' AND p.start_at = '2026-02-15 00:00:00');

-- [8] notice (3椰?
INSERT INTO notice (author_id, title, content, is_pinned, is_deleted, created_at, updated_at)
SELECT u.user_id, '??뺥돩???癒? ??덇땀', '??덈??뤾쉭?? DevPath??낅빍?? ??뺥돩????됱춳 ?關湲???袁る퉸 2026??2??15????쇱읈 2?????4??볧돱筌왖 ??뺥돩???癒???筌욊쑵六??몃빍?? ?癒? ??볦퍢 ??덈툧?癒?뮉 揶쏅벡????띿뺏 獄?Q&A ??곸뒠????깅뻻?怨몄몵嚥???쀫립??????됰뮸??덈뼄. ??곸뒠???븍뜇?????뺤젻 雅뚭쑴???몃빍??', TRUE, FALSE, '2026-02-10 00:00:00', '2026-02-10 00:00:00'
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM notice n WHERE n.title = '??뺥돩???癒? ??덇땀');

INSERT INTO notice (author_id, title, content, is_pinned, is_deleted, created_at, updated_at)
SELECT u.user_id, '揶쏆뮇??類ｋ궖筌ｌ꼶?곮쳸?밸쵟 揶쏆뮇????덇땀', '揶쏆뮇??類ｋ궖 癰귣똾?뉓린?揶쏆뮇????怨뺤뵬 DevPath??揶쏆뮇??類ｋ궖筌ｌ꼶?곮쳸?밸쵟??2026??3??1???嚥?癰궰野껋럥留??덈뼄. 雅뚯눘??癰궰野???곸뒠?? ??륁춿 ??????? 鈺곌퀣??獄?癰귣똻? 疫꿸퀗而?筌뤿굟??遺우뿯??덈뼄. 癰궰野껋럥留?獄쎻뫗臾?? ??뺥돩????롫뼊?癒?퐣 ?類ㅼ뵥??뤿뼄 ????됰뮸??덈뼄.', FALSE, FALSE, '2026-02-20 00:00:00', '2026-02-20 00:00:00'
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM notice n WHERE n.title = '揶쏆뮇??類ｋ궖筌ｌ꼶?곮쳸?밸쵟 揶쏆뮇????덇땀');

INSERT INTO notice (author_id, title, content, is_pinned, is_deleted, created_at, updated_at)
SELECT u.user_id, '?醫됲뇣 疫꿸퀡???곗뮇????덇땀', 'DevPath????덉쨮??疫꿸퀡????곕떽???뤿???щ빍?? ??苡???낅쑓??꾨뱜?癒?퐣??揶쏅벡沅?筌?쑬瑗??닌됰즴 疫꿸퀡?? ?묒쥚猷??怨몄뒠 疫꿸퀡?? AI 疫꿸퀡而???덈뮸 野껋럥以??곕뗄荑?疫꿸퀡????곗뮇???뤿???щ빍?? ??덉쨮??疫꿸퀡??????퉸 ?遺우뒮 ??μ몛?怨몄뵥 ??덈뮸 野껋?肉??筌앸Þ爰쇠퉪?곴쉭??', FALSE, FALSE, '2026-03-01 00:00:00', '2026-03-01 00:00:00'
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM notice n WHERE n.title = '?醫됲뇣 疫꿸퀡???곗뮇????덇땀');

-- [9] admin_role (3椰?
INSERT INTO admin_role (role_name, description, is_deleted, created_at, updated_at)
SELECT 'SUPER_ADMIN', '筌뤴뫀諭???뽯뮞??疫꿸퀡???????筌ㅼ뮄??亦낅슦釉??癰귣똻???렽??????亦낅슦釉??온?? ??뽯뮞????쇱젟 癰궰野? ?怨쀬뵠???臾롫젏 ?袁⑥뺘???????몃빍??', FALSE, '2026-01-01 00:00:00', '2026-01-01 00:00:00'
WHERE NOT EXISTS (SELECT 1 FROM admin_role ar WHERE ar.role_name = 'SUPER_ADMIN');

INSERT INTO admin_role (role_name, description, is_deleted, created_at, updated_at)
SELECT 'CONTENT_MANAGER', '揶쏅벡???꾩꼹?쀯㎘?野꺜?? ?諭?? 獄쏆꼶??獄???볥젃 椰꾧퀡苡???뮞???????몃빍?? ??????怨쀬뵠???臾롫젏 亦낅슦釉?? ??곷뮸??덈뼄.', FALSE, '2026-01-01 00:00:00', '2026-01-01 00:00:00'
WHERE NOT EXISTS (SELECT 1 FROM admin_role ar WHERE ar.role_name = 'CONTENT_MANAGER');

INSERT INTO admin_role (role_name, description, is_deleted, created_at, updated_at)
SELECT 'CS_MANAGER', '??롰뀑 ?遺욧퍕 筌ｌ꼶?? ??????얜챷???臾? 獄??醫됲??꾩꼹?쀯㎘?筌뤴뫀??怨뺤춦???????몃빍??', FALSE, '2026-01-01 00:00:00', '2026-01-01 00:00:00'
WHERE NOT EXISTS (SELECT 1 FROM admin_role ar WHERE ar.role_name = 'CS_MANAGER');

-- [10] instructor_post (5椰?
INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, '[?⑤벊?] ??띿뺏??????겫袁㏉뜞 ??뺚봺????덇땀', '??덈??뤾쉭?? 揶쏅벡沅??낅빍?? ??苡??????筌띲끉竊??醫롮뒄????쎌뜎 2??뽯퓠 ??깆뵠??Q&A ?紐꾨??筌욊쑵六??몃빍?? ??띿뺏??????겫袁⑹벥 筌띾‘? 筌〓챷肉?獄쏅뗀???덈뼄!', 'NOTICE', 0, 0, FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = '[?⑤벊?] ??띿뺏??????겫袁㏉뜞 ??뺚봺????덇땀');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Spring Boot?? JPA????ｍ뜞 ???????雅뚯눘?????, 'Spring Boot ?袁⑥쨮??븍뱜?癒?퐣 JPA?????????揶쎛???酉??野껁굥???얜챷???N+1 ?얜챷???낅빍?? FetchType.LAZY??疫꿸퀡???곗쨮 ??쇱젟??랁? ?袁⑹뒄??野껋럩??fetch join????뽰뒠??롫뮉 ???????쇱뵠?紐꾩뒄. ??삳뮎??筌앸Þ援????덈뮸 ??뤾쉭??', 'GENERAL', 0, 0, FALSE, '2026-01-20 00:00:00', '2026-01-20 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'Spring Boot?? JPA????ｍ뜞 ???????雅뚯눘?????);

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, '獄쏄퉮肉??揶쏆뮆而?癒? ?????툡????HTTP ?怨밴묶 ?꾨뗀諭??類ｂ봺', '200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error... REST API ??블?癒?퐣 ?癒?폒 ?????롫뮉 HTTP ?怨밴묶 ?꾨뗀諭띄몴??類ｂ봺??癰귣똻釉??щ빍?? ??뿅?癒?퐣 ?怨몄쟿???怨밴묶 ?꾨뗀諭띄몴?獄쏆꼹???롫뮉 野껉퍔????곗춳??餓λ쵐???? ?癒?벰癰귣똻苑??', 'GENERAL', 0, 0, FALSE, '2026-01-25 00:00:00', '2026-01-25 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = '獄쏄퉮肉??揶쏆뮆而?癒? ?????툡????HTTP ?怨밴묶 ?꾨뗀諭??類ｂ봺');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Docker ?뚢뫂???瑗ユ에?揶쏆뮆而???띻펾 ???뵬??띾┛', '?? ?袁⑥쨮??븍뱜?癒?퐣 "???뚮똾踰?怨쀫퓠??뺣뮉 ??롫뮉??.."??곕뮉 筌? ??곸젫????? 筌띾뜆苑?? Docker Compose嚥?揶쏆뮆而???띻펾???꾨뗀諭뜻에??온?귐뗫릭筌?????筌뤴뫀紐℡첎? ??덉뵬????띻펾?癒?퐣 揶쏆뮆而??????됰뮸??덈뼄. Spring Boot + PostgreSQL Docker Compose ??쇱젟 獄쎻뫖苡???⑤벊???몃빍??', 'GENERAL', 0, 0, FALSE, '2026-02-03 00:00:00', '2026-02-03 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'Docker ?뚢뫂???瑗ユ에?揶쏆뮆而???띻펾 ???뵬??띾┛');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'JWT ?紐꾩쵄 ?닌뗭겱 ??癰귣똻釉???袁る퉸 獄쏆꼶諭??筌왖?녹뮇鍮?????鍮?, 'JWT???닌뗭겱????Refresh Token?? 獄쏆꼶諭??HttpOnly Cookie?????館釉?紐꾩뒄. Access Token?? 筌띾슢利???볦퍢??筌욁룓苡?15??1??볦퍢) ??쇱젟??랁? 沃섏눊而???類ｋ궖????? Payload????釉??? 筌띾뜆苑?? 癰귣똻釉?? 筌ｌ꼷?ч겫?????而?몴?우쓺 ??블??곷튊 ??몃빍??', 'GENERAL', 0, 0, FALSE, '2026-02-10 00:00:00', '2026-02-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'JWT ?紐꾩쵄 ?닌뗭겱 ??癰귣똻釉???袁る퉸 獄쏆꼶諭??筌왖?녹뮇鍮?????鍮?);

-- [11] instructor_comment (5椰?
INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, '??깆뵠??Q&A ?紐꾨??類ｌ춾 疫꿸퀡???몃빍?? ??筌〓챷肉??띿퓢??щ빍??', 0, FALSE, '2026-01-16 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = '[?⑤벊?] ??띿뺏??????겫袁㏉뜞 ??뺚봺????덇땀' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = '??깆뵠??Q&A ?紐꾨??類ｌ춾 疫꿸퀡???몃빍?? ??筌〓챷肉??띿퓢??щ빍??');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, '揶쏅벡沅???類ｍ뀋??N+1 ?얜챷?ｇ몴???뺣탵????꾨퉸??됰선?? fetch join ??됰뻻揶쎛 ?類ｌ춾 ?袁????癒?뮸??덈뼄!', 0, FALSE, '2026-01-21 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'Spring Boot?? JPA????ｍ뜞 ???????雅뚯눘????? AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = '揶쏅벡沅???類ｍ뀋??N+1 ?얜챷?ｇ몴???뺣탵????꾨퉸??됰선?? fetch join ??됰뻻揶쎛 ?類ｌ춾 ?袁????癒?뮸??덈뼄!');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'HTTP ?怨밴묶 ?꾨뗀諭??類ｂ봺 揶쏅Ŋ沅??몃빍?? 筌롫똻??餓Β??쑵釉????癒?폒 筌〓㈇???띿퓢??щ빍??', 0, FALSE, '2026-01-26 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = '獄쏄퉮肉??揶쏆뮆而?癒? ?????툡????HTTP ?怨밴묶 ?꾨뗀諭??類ｂ봺' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'HTTP ?怨밴묶 ?꾨뗀諭??類ｂ봺 揶쏅Ŋ沅??몃빍?? 筌롫똻??餓Β??쑵釉????癒?폒 筌〓㈇???띿퓢??щ빍??');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'Docker Compose ??됰뻻 ?꾨뗀諭???⑤벊???雅뚯눘?놅쭖??ル뿪荑??곸뒄! 揶쏆뮇???袁⑥쨮??븍뱜???怨몄뒠???ユ???좊뮸??덈뼄.', 0, FALSE, '2026-02-04 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'Docker ?뚢뫂???瑗ユ에?揶쏆뮆而???띻펾 ???뵬??띾┛' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'Docker Compose ??됰뻻 ?꾨뗀諭???⑤벊???雅뚯눘?놅쭖??ル뿪荑??곸뒄! 揶쏆뮇???袁⑥쨮??븍뱜???怨몄뒠???ユ???좊뮸??덈뼄.');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'JWT Refresh Token??HttpOnly Cookie?????館釉??獄쎻뫖苡????쇱벉 揶쏅벡??癒?퐣 ?癒?쉭????살Ø雅뚯눘?놅쭖??ル뿪荑??щ빍??', 0, FALSE, '2026-02-11 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'JWT ?紐꾩쵄 ?닌뗭겱 ??癰귣똻釉???袁る퉸 獄쏆꼶諭??筌왖?녹뮇鍮?????鍮? AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'JWT Refresh Token??HttpOnly Cookie?????館釉??獄쎻뫖苡????쇱벉 揶쏅벡??癒?퐣 ?癒?쉭????살Ø雅뚯눘?놅쭖??ル뿪荑??щ빍??');

-- qna_questions (qna_answer_draft ?紐껋삋??筌〓챷???
INSERT INTO qna_questions (user_id, template_type, difficulty, title, content, adopted_answer_id, course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'DEBUGGING', 'EASY', 'Spring Boot ??쎈뻬 ??BeanCreationException??獄쏆뮇源??몃빍??, '??쎈늄筌??봔???醫뤿탣?귐???곷????쎈뻬??롢늺 BeanCreationException: Error creating bean with name ??살첒揶쎛 獄쏆뮇源??몃빍?? ??뤵??雅뚯눘????쇱젟?? 筌띿쉳苡???野?揶쏆늿?????逾???얜챷?ｅ첎? ??룸┛??椰꾨㈇???', NULL, c.course_id, NULL, 'UNANSWERED', 0, FALSE, '2026-02-05 00:00:00', '2026-02-05 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM qna_questions q WHERE q.title = 'Spring Boot ??쎈뻬 ??BeanCreationException??獄쏆뮇源??몃빍??);

INSERT INTO qna_questions (user_id, template_type, difficulty, title, content, adopted_answer_id, course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'IMPLEMENTATION', 'MEDIUM', 'JPA ?怨??온????쇱젟 ???얜똾釉??룐뫂遊??얜챷??, 'JPA?癒?퐣 ?臾먭컩???怨??온?④쑬? ??쇱젟??롢늺 toString()??援?JSON 筌욊낮??????얜똾釉??룐뫂遊썲첎? 獄쏆뮇源??몃빍?? @JsonIgnore??@JsonManagedReference 餓???堉?獄쎻뫗????怨뺣뮉 野껉퍔?????ル뿭?ｆ틦??뒄?', NULL, c.course_id, NULL, 'UNANSWERED', 0, FALSE, '2026-02-08 00:00:00', '2026-02-08 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (SELECT 1 FROM qna_questions q WHERE q.title = 'JPA ?怨??온????쇱젟 ???얜똾釉??룐뫂遊??얜챷??);

-- [12] qna_answer_draft (2椰?
INSERT INTO qna_answer_draft (question_id, instructor_id, draft_content, is_deleted, saved_at, updated_at)
SELECT q.question_id, u.user_id, 'BeanCreationException?? 雅뚯눖以???쀬넎 ??뤵?源놁뵠?????源낆쨯 ??쎈솭嚥?獄쏆뮇源??몃빍?? @Component, @Service ??????뵠??륁뵠 ?袁⑥뵭??? ??녿릭?遺? ?類ㅼ뵥??뤿뻻?? ??밴쉐??雅뚯눘????????롫뮉 野껋럩????쀬넎 筌〓챷?쒎첎? ??용뮉筌왖 ?癒?????紐꾩뒄. ??쎄문 ?紐껋쟿??곷뮞?癒?퐣 Caused by ?봔?브쑴???癒?쉭??癰귣똻?놅쭖??類μ넇???癒?뵥??筌≪뼚???????됰뮸??덈뼄.', FALSE, '2026-02-06 00:00:00', '2026-02-06 00:00:00'
FROM qna_questions q, users u
WHERE q.title = 'Spring Boot ??쎈뻬 ??BeanCreationException??獄쏆뮇源??몃빍?? AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_answer_draft d WHERE d.question_id = q.question_id AND d.instructor_id = u.user_id);

INSERT INTO qna_answer_draft (question_id, instructor_id, draft_content, is_deleted, saved_at, updated_at)
SELECT q.question_id, u.user_id, '?臾먭컩???怨??온?④쑴肉??뽰벥 ?얜똾釉??룐뫂遊??DTO 癰궰??륁몵嚥?揶쎛??繹먮뗀嫄??띿쓺 ??욧퍙??????됰뮸??덈뼄. Entity??筌욊낯??獄쏆꼹???? 筌띾Þ??ResponseDTO嚥?癰궰??묐릭筌?筌욊낮??????얜똾釉??룐뫂遊??癒?퍥揶쎛 獄쏆뮇源??? ??녿뮸??덈뼄. ??Entity??筌욊낮??酉鍮????뺣뼄筌?@JsonIgnore癰귣???@JsonManagedReference/@JsonBackReference 鈺곌퀬鍮??亦낅슣???몃빍??', FALSE, '2026-02-09 00:00:00', '2026-02-09 00:00:00'
FROM qna_questions q, users u
WHERE q.title = 'JPA ?怨??온????쇱젟 ???얜똾釉??룐뫂遊??얜챷?? AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_answer_draft d WHERE d.question_id = q.question_id AND d.instructor_id = u.user_id);

-- [13] qna_template (3椰?
INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '??띻펾??쇱젟 ?⑤벏?????', '??띻펾??쇱젟 ?온???얜챷??????봔????뤵??甕곌쑴???겸뫖猷? ?????겸뫖猷? ?癒?뮉 application.properties ??쇱젟 ??살첒?癒?퐣 獄쏆뮇源??몃빍?? ?믪눘? pom.xml ?癒?뮉 build.gradle????뤵??甕곌쑴????類ㅼ뵥??뤿뻻?? ?⑤벊???얜챷苑?癒?퐣 亦낅슣???롫뮉 甕곌쑴??鈺곌퀬鍮???????랁???덈뮉筌왖 筌ｋ똾寃??癰귣똻苑??', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = '??띻펾??쇱젟 ?⑤벏?????' AND qt.instructor_id = u.user_id);

INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, 'N+1 ?얜챷???⑤벏?????', 'N+1 ?얜챷???JPA?癒?퐣 筌띲끉???癒?폒 獄쏆뮇源??롫뮉 ?源낅뮟 ??곷뭼??낅빍?? ??욧퍙 獄쎻뫖苡??곗쨮??1) JPQL fetch join ???? 2) @EntityGraph ??뽰뒠, 3) Batch Size ??쇱젟????됰뮸??덈뼄. ?怨? ?酉??怨? ?癒?폒 ??ｍ뜞 鈺곌퀬???뺣뼄筌?fetch join??疫꿸퀡???곗쨮 ?????랁? ??λ떄 筌왖??嚥≪뮆逾???袁⑹뒄??野껋럩??癒?뮉 BatchSize嚥??묒눖????? 筌ㅼ뮇??酉釉?紐꾩뒄.', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = 'N+1 ?얜챷???⑤벏?????' AND qt.instructor_id = u.user_id);

INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '?癒?쑎 ??욧퍙 揶쎛??諭?, '?癒?쑎????욧퍙?????뮉 ??쇱벉 ??뽮퐣嚥??臾롫젏??癰귣똻苑?? 1) ?癒?쑎 筌롫뗄?놅쭪??????뼎 ??쇱뜖??? 域밸챶?嚥?野꺜?? 2) ??쎄문 ?紐껋쟿??곷뮞?癒?퐣 ???꾨뗀諭뜹첎? ??釉??筌?甕곕뜆??餓??類ㅼ뵥, 3) 筌ㅼ뮄??癰궰野껋?釉??꾨뗀諭?嚥▲끇媛?????????? ?類ㅼ뵥, 4) ?⑤벊???얜챷苑?獄?GitHub Issues 筌〓㈇?? ?癒?쑎 筌롫뗄?놅쭪? ?袁⑷퍥???⑤벊???雅뚯눘?놅쭖?????쥓?ㅵ칰??袁???뺚뵭 ????됰뮸??덈뼄.', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = '?癒?쑎 ??욧퍙 揶쎛??諭? AND qt.instructor_id = u.user_id);
-- ??쎄숲??域밸챶竊?
INSERT INTO study_group (name, description, status, max_members, is_deleted, created_at)
SELECT 'Spring Boot 筌띾뜆?????쎄숲??, '筌띲끉竊?雅뚯눖彛???ㅼ뵬?紐꾩몵嚥?筌욊쑵六??롫뮉 獄쏄퉮肉????쎄숲?遺우뿯??덈뼄.', 'RECRUITING', 6, false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_group WHERE name = 'Spring Boot 筌띾뜆?????쎄숲??);

INSERT INTO study_group (name, description, status, max_members, is_deleted, created_at)
SELECT 'React ??以??꾨뗀逾???쎄숲??, 'React?? Tailwind????뽰뒠???袁⑥쨴?紐꾨퓦??筌욌쵐夷???쎄숲??, 'IN_PROGRESS', 4, false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_group WHERE name = 'React ??以??꾨뗀逾???쎄숲??);

-- ??쎄숲??域밸챶竊?筌롢끇苡?(揶쎛?? COMMON BASE??learner_id 1, 2 鈺곕똻??
-- (study_group ID 1??2揶쎛 鈺곕똻???뺣뼄??揶쎛??
INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 1, 1, 'APPROVED', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 1 AND learner_id = 1);

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 1, 2, 'PENDING', NULL
    WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 1 AND learner_id = 2);

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 2, 1, 'APPROVED', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 2 AND learner_id = 1);

-- ???삋??筌뤴뫚紐?
INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT 1, 'WEEKLY_NODE_CLEAR', 3, true
    WHERE NOT EXISTS (SELECT 1 FROM learner_goal WHERE learner_id = 1 AND goal_type = 'WEEKLY_NODE_CLEAR');

INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT 2, 'WEEKLY_STUDY_TIME', 10, true
    WHERE NOT EXISTS (SELECT 1 FROM learner_goal WHERE learner_id = 2 AND goal_type = 'WEEKLY_STUDY_TIME');

-- ??쎈뱜??(?遺얜탵) - Unique ??뽯튋鈺곌퀗援?獄쎻뫗堉?
INSERT INTO streak (learner_id, current_streak, longest_streak, last_study_date)
SELECT 1, 5, 14, CURRENT_DATE - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM streak WHERE learner_id = 1);

INSERT INTO streak (learner_id, current_streak, longest_streak, last_study_date)
SELECT 2, 0, 7, CURRENT_DATE - INTERVAL '3 day'
WHERE NOT EXISTS (SELECT 1 FROM streak WHERE learner_id = 2);

-- ?袁⑥쨮??븍뱜
INSERT INTO project (name, description, status, is_deleted, created_at)
SELECT 'DevPath ??以??꾨뗀逾?, 'React?? Spring Boot????뽰뒠?????삸??揶쏆뮆而?, 'PREPARING', false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project WHERE name = 'DevPath ??以??꾨뗀逾?);

INSERT INTO project (name, description, status, is_deleted, created_at)
SELECT 'AI 筌?ロ겦 ??뺥돩??, 'OpenAI API????뽰뒠??筌띿쉸???筌롮꼹?쀯쭕?筌?ロ겦', 'IN_PROGRESS', false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project WHERE name = 'AI 筌?ロ겦 ??뺥돩??);

-- ?袁⑥쨮??븍뱜 ?袁⑹뵠?遺용선 野껊슣???
INSERT INTO project_idea_post (author_id, title, content, status, is_deleted, created_at)
SELECT 1, 'Spring Boot 疫꿸퀡而??뚣끇???API 筌띾슢諭???', '獄쏄퉮肉???袁⑼폒嚥?筌욊쑵六????됱젟??낅빍??', 'PUBLISHED', false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project_idea_post WHERE title = 'Spring Boot 疫꿸퀡而??뚣끇???API 筌띾슢諭???');

-- ========================================
-- PostgreSQL Sequence 癰귣똻??筌ｌ꼶??(筌띲끉??餓λ쵐??
-- 筌뤿굞??怨몄몵嚥?ID???節딄탢???遺? ?怨쀬뵠?怨? ??뚯뿯???? ??쀂???? ??녿┛?酉鍮?雅뚯눘堉????꾩뜎 POST ?遺욧퍕 ??ID 餓λ쵎???癒?쑎揶쎛 ??? ??녿뮸??덈뼄.
-- ========================================
SELECT setval('study_group_id_seq', (SELECT COALESCE(MAX(id), 1) FROM study_group));
SELECT setval('study_group_member_id_seq', (SELECT COALESCE(MAX(id), 1) FROM study_group_member));
SELECT setval('learner_goal_id_seq', (SELECT COALESCE(MAX(id), 1) FROM learner_goal));
SELECT setval('streak_id_seq', (SELECT COALESCE(MAX(id), 1) FROM streak));
SELECT setval('project_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project));
SELECT setval('project_idea_post_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_idea_post));
-- ==========================================
-- [?곕떽??? ?袁⑥뵭??C ??곕뱜 ?????袁⑥컭???遺? ?怨쀬뵠??(??쇱젫 ?酉????닌듼?100% 獄쏆꼷??
-- ==========================================

-- 1. ??쎄숲??筌띲끉臾?(Study Match) - requester_id, receiver_id, node_id ????
INSERT INTO study_match (requester_id, receiver_id, node_id, status, created_at)
SELECT 1, 2, 101, 'ACCEPTED', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_match WHERE requester_id = 1 AND receiver_id = 2 AND node_id = 101);

-- 2. ???삋?? 雅뚯눊而????삏 (Weekly Plan) - plan_content ????
INSERT INTO weekly_plan (learner_id, plan_content, status, created_at)
SELECT 1, '??苡?雅?筌뤴뫚紐? Spring Security ?紐꾩쵄 ?袁り숲 ?袁④펾 ??꾨퉸 獄??怨몄뒠', 'IN_PROGRESS', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM weekly_plan WHERE learner_id = 1);

-- 3. ?袁⑥쨮??븍뱜: 筌뤴뫁彛???釉?(Project Role)
INSERT INTO project_role (project_id, role_type, required_count)
SELECT 1, 'BACKEND', 2
    WHERE NOT EXISTS (SELECT 1 FROM project_role WHERE project_id = 1 AND role_type = 'BACKEND');

INSERT INTO project_role (project_id, role_type, required_count)
SELECT 1, 'FRONTEND', 2
    WHERE NOT EXISTS (SELECT 1 FROM project_role WHERE project_id = 1 AND role_type = 'FRONTEND');

-- 4. ?袁⑥쨮??븍뱜: 筌〓챷肉?????(Project Member)
INSERT INTO project_member (project_id, learner_id, role_type, joined_at)
SELECT 1, 1, 'LEADER', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project_member WHERE project_id = 1 AND learner_id = 1);

-- 5. ?袁⑥쨮??븍뱜: ?λ뜄? ??곷열 (Project Invitation)
INSERT INTO project_invitation (project_id, inviter_id, invitee_id, status, created_at)
SELECT 1, 1, 3, 'PENDING', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project_invitation WHERE project_id = 1 AND invitee_id = 3);

-- 6. 筌롮꼹?쀯쭕? 筌왖????곷열 (Mentoring Application)
INSERT INTO mentoring_application (project_id, mentor_id, message, status, created_at)
SELECT 1, 5, '獄쏄퉮肉???袁り텕??우퓗 ?귐됰윮 ?봔?怨룸굡?깆럥???', 'PENDING', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM mentoring_application WHERE project_id = 1 AND mentor_id = 5);

-- 7. ??덈뮸 筌앹빖梨? ??뽱뀱 ??곷열 (Project Proof Submission)
INSERT INTO project_proof_submission (project_id, submitter_id, proof_card_ref_id, submitted_at)
SELECT 1, 1, 'PROOF-2026-ABC123X', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project_proof_submission WHERE project_id = 1 AND submitter_id = 1);

-- 8. ???뵝 (Learner Notification)
INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT 1, 'STUDY_GROUP', '??덉쨮????쎄숲?????癒?뵠 筌띲끉臾??뤿???щ빍??', false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM learner_notification WHERE learner_id = 1 AND type = 'STUDY_GROUP');

-- 9. ????뺣궖????산퉬??(Dashboard Snapshot) - completed_nodes ????
INSERT INTO dashboard_snapshot (learner_id, snapshot_date, total_study_hours, completed_nodes)
SELECT 1, CURRENT_DATE, 45, 12
    WHERE NOT EXISTS (SELECT 1 FROM dashboard_snapshot WHERE learner_id = 1 AND snapshot_date = CURRENT_DATE);

-- ========================================
-- 10. A SEED
-- Learning Automation / Proof / History / Recommendation / Analytics
-- owner: A
-- ========================================

-- quiz / assignment parent seed
INSERT INTO quizzes (
    quiz_id,
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
) VALUES
(10901, 1, 'Java Basics ???뼎 ??곸グ', 'Java Basics ?紐껊굡 ??덈뮸 ?類ㅼ뵥????곸グ??낅빍??', 'MANUAL', 10, TRUE, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day'),
(10902, 2, 'HTTP Fundamentals ???뼎 ??곸グ', 'HTTP Fundamentals ?紐껊굡 ??덈뮸 ?類ㅼ뵥????곸グ??낅빍??', 'MANUAL', 10, TRUE, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day');

INSERT INTO assignments (
    assignment_id,
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
) VALUES
(11901, 1, 'Java Basics ??쇰뮸 ?⑥눘??, '疫꿸퀡???얜챶苡욘?揶쏆빘猿쒙쭪???疫꿸퀣?밭몴??類ｂ봺??롫뮉 ?⑥눘???낅빍??', 'URL', NOW() - INTERVAL '4 day', NULL, TRUE, FALSE, FALSE, 'GitHub ???關??URL????뽱뀱??몃빍??', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day'),
(11902, 2, 'HTTP Fundamentals ?類ｂ봺 ?⑥눘??, 'HTTP 筌롫뗄苑??? ?怨밴묶 ?꾨뗀諭띄몴??類ｂ봺??롫뮉 ?⑥눘???낅빍??', 'URL', NOW() - INTERVAL '1 day', NULL, TRUE, FALSE, FALSE, 'GitHub ???關??URL????뽱뀱??몃빍??', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day');

-- lesson_progress ?袁⑥┷/沃섎챷?욜뙴?
INSERT INTO lesson_progress (
    progress_id,
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
) VALUES
(10001, 1, 1, 100, 780, 1.0, FALSE, TRUE, NOW() - INTERVAL '5 day', NOW() - INTERVAL '7 day', NOW() - INTERVAL '5 day'),
(10002, 1, 2, 65, 598, 1.25, TRUE, FALSE, NOW() - INTERVAL '2 day', NOW() - INTERVAL '6 day', NOW() - INTERVAL '2 day'),
(10003, 2, 1, 100, 780, 1.0, FALSE, TRUE, NOW() - INTERVAL '3 day', NOW() - INTERVAL '8 day', NOW() - INTERVAL '3 day'),
(10004, 2, 3, 40, 440, 1.0, FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 day', NOW() - INTERVAL '1 day');

-- quiz_attempts ???궢/??쎈솭
INSERT INTO quiz_attempts (
    attempt_id,
    quiz_id,
    learner_id,
    score,
    max_score,
    started_at,
    completed_at,
    time_spent_seconds,
    is_passed,
    attempt_number,
    created_at,
    updated_at,
    is_deleted
) VALUES
(11001, 10901, 1, 9, 10, NOW() - INTERVAL '5 day' - INTERVAL '10 minute', NOW() - INTERVAL '5 day', 600, TRUE, 1, NOW() - INTERVAL '5 day', NOW() - INTERVAL '5 day', FALSE),
(11002, 10902, 1, 4, 10, NOW() - INTERVAL '2 day' - INTERVAL '8 minute', NOW() - INTERVAL '2 day', 480, FALSE, 1, NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day', FALSE),
(11003, 10901, 2, 8, 10, NOW() - INTERVAL '3 day' - INTERVAL '9 minute', NOW() - INTERVAL '3 day', 540, TRUE, 1, NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day', FALSE);

-- assignment_submissions ??뽱뀱/沃섎챷?ｇ빊????궢
INSERT INTO assignment_submissions (
    submission_id,
    assignment_id,
    learner_id,
    submission_status,
    submission_url,
    is_late,
    submitted_at,
    graded_at,
    total_score,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    created_at,
    updated_at,
    is_deleted
) VALUES
(12001, 11901, 1, 'GRADED', 'https://github.com/example/devpath-assignment-1', FALSE, NOW() - INTERVAL '5 day', NOW() - INTERVAL '4 day', 95, TRUE, TRUE, TRUE, TRUE, NOW() - INTERVAL '5 day', NOW() - INTERVAL '4 day', FALSE),
(12002, 11902, 1, 'SUBMITTED', 'https://github.com/example/devpath-assignment-2', FALSE, NOW() - INTERVAL '2 day', NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day', FALSE),
(12003, 11901, 2, 'GRADED', 'https://github.com/example/devpath-assignment-3', FALSE, NOW() - INTERVAL '3 day', NOW() - INTERVAL '2 day', 82, TRUE, TRUE, FALSE, TRUE, NOW() - INTERVAL '3 day', NOW() - INTERVAL '2 day', FALSE);

-- til / timestamp_note
INSERT INTO timestamp_notes (
    note_id,
    user_id,
    lesson_id,
    timestamp_second,
    content,
    created_at,
    updated_at,
    is_deleted
) VALUES
(13001, 1, 1, 120, 'DI?? IoC 筌△뫁?좂몴???쇰뻻 ?類ｂ봺??덈뼄.', NOW() - INTERVAL '6 day', NOW() - INTERVAL '6 day', FALSE),
(13002, 1, 2, 420, 'Bean lifecycle callback ?癒?カ????쇰뻻 ?듽끇??', NOW() - INTERVAL '5 day', NOW() - INTERVAL '5 day', FALSE),
(13003, 2, 3, 300, '?怨??온??筌띲끋釉??袁⑥셽 ??쑨??????紐? 筌롫뗀???덈뼄.', NOW() - INTERVAL '4 day', NOW() - INTERVAL '4 day', FALSE);

INSERT INTO til_drafts (
    til_id,
    user_id,
    lesson_id,
    title,
    content,
    status,
    published_url,
    created_at,
    updated_at,
    is_deleted
) VALUES
(14001, 1, 1, 'Spring IoC?? DI ?類ｂ봺', 'DI, IoC, BeanContainer ?癒?カ???類ｂ봺??덈뼄.', 'PUBLISHED', 'https://velog.io/@devpath/ioc-di', NOW() - INTERVAL '5 day', NOW() - INTERVAL '5 day', FALSE),
(14002, 1, 2, 'Bean ??몄구雅뚯눊由??類ｂ봺', 'Bean ??밴쉐?????늾 ?꾩뮆媛???뽰젎???類ｂ봺??덈뼄.', 'DRAFT', NULL, NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day', FALSE),
(14003, 2, 3, 'JPA ?怨??온??筌띲끋釉?筌롫뗀??, '?????? ?????筌띲끋釉?筌△뫁?좂몴??類ｂ봺??덈뼄.', 'PUBLISHED', 'https://velog.io/@devpath/jpa-mapping', NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day', FALSE);

-- supplement_recommendation
INSERT INTO supplement_recommendations (
    recommendation_id,
    user_id,
    node_id,
    reason,
    priority,
    coverage_percent,
    missing_tag_count,
    status,
    created_at,
    updated_at
) VALUES
(15001, 1, 2, 'HTTP 疫꿸퀣??癰귣떯而???袁⑹뒄???곕뗄荑????밴쉐??뤿???щ빍??', 90, 52.0, 2, 'PENDING', NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day'),
(15002, 1, 3, 'Spring Boot 疫꿸퀡??묾?癰귣떯而??곕뗄荑???諭???뤿???щ빍??', 85, 71.0, 1, 'APPROVED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(15003, 2, 2, 'HTTP ?遺욧퍕/?臾먮뼗 ?癒?カ 癰귣벊???곕뗄荑????밴쉐??뤿???щ빍??', 80, 58.0, 2, 'PENDING', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- node_clearance / reason
INSERT INTO node_clearances (
    node_clearance_id,
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
) VALUES
(16001, 1, 1, 'CLEARED', 100.00, TRUE, 0, TRUE, TRUE, TRUE, TRUE, NOW() - INTERVAL '4 day', NOW() - INTERVAL '4 day', NOW() - INTERVAL '4 day', NOW() - INTERVAL '4 day'),
(16002, 1, 2, 'NOT_CLEARED', 65.00, FALSE, 1, FALSE, FALSE, FALSE, FALSE, NULL, NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day'),
(16003, 2, 1, 'CLEARED', 100.00, TRUE, 0, TRUE, TRUE, TRUE, TRUE, NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day');

INSERT INTO node_clearance_reasons (
    node_clearance_reason_id,
    node_clearance_id,
    reason_type,
    is_satisfied,
    detail_message,
    created_at
) VALUES
(16101, 16001, 'LESSON_COMPLETION', TRUE, '??됰뮣 ?袁㏃뺏?? 100.00%', NOW() - INTERVAL '4 day'),
(16102, 16001, 'REQUIRED_TAGS', TRUE, '?袁⑸땾 ??볥젃??筌뤴뫀紐?癰귣똻???랁???됰뮸??덈뼄.', NOW() - INTERVAL '4 day'),
(16103, 16001, 'QUIZ_PASS', TRUE, '??곸グ 鈺곌퀗援??筌띾슣???됰뮸??덈뼄.', NOW() - INTERVAL '4 day'),
(16104, 16001, 'ASSIGNMENT_PASS', TRUE, '?⑥눘??鈺곌퀗援??筌띾슣???됰뮸??덈뼄.', NOW() - INTERVAL '4 day'),
(16105, 16001, 'PROOF_ELIGIBLE', TRUE, 'Proof Card 獄쏆뮄??揶쎛???怨밴묶??낅빍??', NOW() - INTERVAL '4 day'),
(16106, 16002, 'LESSON_COMPLETION', FALSE, '??됰뮣 ?袁㏃뺏?? 65.00%', NOW() - INTERVAL '2 day'),
(16107, 16002, 'MISSING_TAGS', FALSE, 'HTTP', NOW() - INTERVAL '2 day'),
(16108, 16002, 'PROOF_ELIGIBLE', FALSE, 'Proof Card 獄쏆뮄??鈺곌퀗援???袁⑹춦 ?겸뫗???? ??녿릭??щ빍??', NOW() - INTERVAL '2 day');

-- proof_card / certificate / share / download_history
INSERT INTO proof_cards (
    proof_card_id,
    user_id,
    node_id,
    node_clearance_id,
    title,
    description,
    proof_card_status,
    issued_at,
    created_at,
    updated_at
) VALUES
(17001, 1, 1, 16001, 'Java Basics Proof Card', 'Java Basics ?紐껊굡????덈뮸 ?袁⑥┷ 獄?野꺜筌?鈺곌퀗援??겸뫗??野껉퀗?든몴?筌앹빖梨??몃빍??', 'ISSUED', NOW() - INTERVAL '4 day', NOW() - INTERVAL '4 day', NOW() - INTERVAL '4 day'),
(17002, 2, 1, 16003, 'Java Basics Proof Card', 'Java Basics ?紐껊굡????덈뮸 ?袁⑥┷ 獄?野꺜筌?鈺곌퀗援??겸뫗??野껉퀗?든몴?筌앹빖梨??몃빍??', 'ISSUED', NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day');

INSERT INTO proof_card_tags (
    proof_card_tag_id,
    proof_card_id,
    tag_id,
    skill_evidence_type
) VALUES
(17101, 17001, 1, 'VERIFIED'),
(17102, 17001, 2, 'HELD'),
(17103, 17002, 1, 'VERIFIED');

INSERT INTO proof_card_shares (
    proof_card_share_id,
    proof_card_id,
    share_token,
    share_status,
    expires_at,
    access_count,
    created_at,
    updated_at
) VALUES
(17201, 17001, 'proof-share-token-17001', 'ACTIVE', NOW() + INTERVAL '30 day', 7, NOW() - INTERVAL '3 day', NOW() - INTERVAL '1 day'),
(17202, 17002, 'proof-share-token-17002', 'ACTIVE', NOW() + INTERVAL '15 day', 2, NOW() - INTERVAL '2 day', NOW() - INTERVAL '1 day');

INSERT INTO certificates (
    certificate_id,
    proof_card_id,
    certificate_number,
    certificate_status,
    issued_at,
    pdf_file_name,
    pdf_generated_at,
    last_downloaded_at,
    created_at,
    updated_at
) VALUES
(17301, 17001, 'CERT-20260329-A001', 'PDF_READY', NOW() - INTERVAL '3 day', 'certificate-CERT-20260329-A001.pdf', NOW() - INTERVAL '3 day', NOW() - INTERVAL '2 day', NOW() - INTERVAL '3 day', NOW() - INTERVAL '2 day'),
(17302, 17002, 'CERT-20260329-A002', 'ISSUED', NOW() - INTERVAL '2 day', NULL, NULL, NULL, NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day');

INSERT INTO certificate_download_histories (
    certificate_download_history_id,
    certificate_id,
    downloaded_by,
    download_reason,
    downloaded_at
) VALUES
(17401, 17301, 1, '??????????뽱뀱', NOW() - INTERVAL '2 day'),
(17402, 17301, 1, '?????類ｂ봺', NOW() - INTERVAL '1 day');

-- learning_history_share_link
INSERT INTO learning_history_share_links (
    learning_history_share_link_id,
    user_id,
    share_token,
    title,
    expires_at,
    access_count,
    is_active,
    created_at,
    updated_at
) VALUES
(17501, 1, 'history-share-token-17501', 'Learner Kim ??덈뮸 ????, NOW() + INTERVAL '30 day', 5, TRUE, NOW() - INTERVAL '2 day', NOW() - INTERVAL '1 day');

-- recommendation_change ??묐탣
INSERT INTO recommendation_changes (
    recommendation_change_id,
    user_id,
    node_id,
    source_recommendation_id,
    reason,
    context_summary,
    change_status,
    decision_status,
    suggested_at,
    applied_at,
    ignored_at,
    created_at,
    updated_at
) VALUES
(18001, 1, 2, 15001, '?봔鈺???볥젃?? 筌ㅼ뮄????덈뮸 疫꿸퀡以??獄쏆꼷????곕뗄荑??낅빍??', 'tilCount=2, weaknessSignal=true, warningCount=1, historyCount=1', 'SUGGESTED', 'UNDECIDED', NOW() - INTERVAL '1 day', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(18002, 1, 3, 15002, '??곸グ ??쎈솭 ?????獄쏆꼷????袁⑸꺗 ?紐껊굡 ?곕뗄荑??鈺곌퀣???됰뮸??덈뼄.', 'tilCount=2, weaknessSignal=true, warningCount=1, historyCount=2', 'APPLIED', 'APPLIED', NOW() - INTERVAL '12 hour', NOW() - INTERVAL '6 hour', NULL, NOW() - INTERVAL '12 hour', NOW() - INTERVAL '6 hour'),
(18003, 2, 2, 15003, '癰귣떯而??곕뗄荑??怨쀪퐨??뽰맄??鈺곌퀣?????뽯툧??낅빍??', 'tilCount=1, weaknessSignal=false, warningCount=0, historyCount=0', 'IGNORED', 'IGNORED', NOW() - INTERVAL '10 hour', NULL, NOW() - INTERVAL '4 hour', NOW() - INTERVAL '10 hour', NOW() - INTERVAL '4 hour');

-- learning_rule / metric_sample
INSERT INTO learning_automation_rules (
    learning_automation_rule_id,
    rule_key,
    rule_name,
    description,
    rule_value,
    priority,
    rule_status,
    created_at,
    updated_at
) VALUES
(19001, 'PROOF_CARD_AUTO_ISSUE', 'Proof Card ?癒?짗 獄쏆뮄??, '?紐껊굡 ???????Proof Card???癒?짗 獄쏆뮄???몃빍??', 'true', 100, 'ENABLED', NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day'),
(19002, 'PROOF_CARD_MANUAL_ISSUE', 'Proof Card ??롫짗 獄쏆뮄??, '??롫짗 獄쏆뮄??API ??됱뒠 ?????낅빍??', 'true', 90, 'ENABLED', NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day'),
(19003, 'RECOMMENDATION_CHANGE_ENABLED', '?곕뗄荑?癰궰野???뽮쉐??, '?곕뗄荑?癰궰野???뽯툧 疫꿸퀡????뽮쉐???????낅빍??', 'true', 80, 'ENABLED', NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day'),
(19004, 'RECOMMENDATION_CHANGE_MAX_LIMIT', '?곕뗄荑?癰궰野?筌ㅼ뮆? 揶쏆뮇??, '?곕뗄荑?癰궰野???뽯툧 筌ㅼ뮆? 揶쏆뮇???낅빍??', '5', 70, 'ENABLED', NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day'),
(19005, 'SUPPLEMENT_RECOMMENDATION_ENABLED', '癰귣떯而??곕뗄荑???뽮쉐??, '癰귣떯而??곕뗄荑???밴쉐 疫꿸퀡????뽮쉐???????낅빍??', 'true', 60, 'ENABLED', NOW() - INTERVAL '7 day', NOW() - INTERVAL '7 day');

INSERT INTO automation_monitor_snapshots (
    automation_monitor_snapshot_id,
    monitor_key,
    monitor_status,
    snapshot_value,
    snapshot_message,
    measured_at,
    created_at
) VALUES
(19101, 'PROOF_CARD_AUTO_ISSUE', 'HEALTHY', 1.0, '?癒?짗 獄쏆뮄???룰퀣????뽮쉐?遺얜┷????됰뮸??덈뼄.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(19102, 'PROOF_CARD_MANUAL_ISSUE', 'HEALTHY', 1.0, '??롫짗 獄쏆뮄???룰퀣????뽮쉐?遺얜┷????됰뮸??덈뼄.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(19103, 'RECOMMENDATION_CHANGE_ENABLED', 'HEALTHY', 1.0, '?곕뗄荑?癰궰野??룰퀣????뽮쉐?遺얜┷????됰뮸??덈뼄.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(19104, 'SUPPLEMENT_RECOMMENDATION_ENABLED', 'HEALTHY', 1.0, '癰귣떯而??곕뗄荑??룰퀣????뽮쉐?遺얜┷????됰뮸??덈뼄.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

INSERT INTO learning_metric_samples (
    learning_metric_sample_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
) VALUES
(19201, 'OVERVIEW', 'clearanceRate', 87.50, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(19202, 'COMPLETION_RATE', 'roadmapCompletionRate', 42.80, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(19203, 'AVERAGE_WATCH_TIME', 'averageLearningDurationSeconds', 1380.00, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(19204, 'QUIZ_STATS', 'quizQualityScore', 79.40, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- ??쀂???癰귣똻??
SELECT setval(pg_get_serial_sequence('quizzes', 'quiz_id'), COALESCE((SELECT MAX(quiz_id) FROM quizzes), 1), true);
SELECT setval(pg_get_serial_sequence('assignments', 'assignment_id'), COALESCE((SELECT MAX(assignment_id) FROM assignments), 1), true);
SELECT setval(pg_get_serial_sequence('lesson_progress', 'progress_id'), COALESCE((SELECT MAX(progress_id) FROM lesson_progress), 1), true);
SELECT setval(pg_get_serial_sequence('quiz_attempts', 'attempt_id'), COALESCE((SELECT MAX(attempt_id) FROM quiz_attempts), 1), true);
SELECT setval(pg_get_serial_sequence('assignment_submissions', 'submission_id'), COALESCE((SELECT MAX(submission_id) FROM assignment_submissions), 1), true);
SELECT setval(pg_get_serial_sequence('timestamp_notes', 'note_id'), COALESCE((SELECT MAX(note_id) FROM timestamp_notes), 1), true);
SELECT setval(pg_get_serial_sequence('til_drafts', 'til_id'), COALESCE((SELECT MAX(til_id) FROM til_drafts), 1), true);
SELECT setval(pg_get_serial_sequence('supplement_recommendations', 'recommendation_id'), COALESCE((SELECT MAX(recommendation_id) FROM supplement_recommendations), 1), true);
SELECT setval(pg_get_serial_sequence('node_clearances', 'node_clearance_id'), COALESCE((SELECT MAX(node_clearance_id) FROM node_clearances), 1), true);
SELECT setval(pg_get_serial_sequence('node_clearance_reasons', 'node_clearance_reason_id'), COALESCE((SELECT MAX(node_clearance_reason_id) FROM node_clearance_reasons), 1), true);
SELECT setval(pg_get_serial_sequence('proof_cards', 'proof_card_id'), COALESCE((SELECT MAX(proof_card_id) FROM proof_cards), 1), true);
SELECT setval(pg_get_serial_sequence('proof_card_tags', 'proof_card_tag_id'), COALESCE((SELECT MAX(proof_card_tag_id) FROM proof_card_tags), 1), true);
SELECT setval(pg_get_serial_sequence('proof_card_shares', 'proof_card_share_id'), COALESCE((SELECT MAX(proof_card_share_id) FROM proof_card_shares), 1), true);
SELECT setval(pg_get_serial_sequence('certificates', 'certificate_id'), COALESCE((SELECT MAX(certificate_id) FROM certificates), 1), true);
SELECT setval(pg_get_serial_sequence('certificate_download_histories', 'certificate_download_history_id'), COALESCE((SELECT MAX(certificate_download_history_id) FROM certificate_download_histories), 1), true);
SELECT setval(pg_get_serial_sequence('learning_history_share_links', 'learning_history_share_link_id'), COALESCE((SELECT MAX(learning_history_share_link_id) FROM learning_history_share_links), 1), true);
SELECT setval(pg_get_serial_sequence('recommendation_changes', 'recommendation_change_id'), COALESCE((SELECT MAX(recommendation_change_id) FROM recommendation_changes), 1), true);
SELECT setval(pg_get_serial_sequence('learning_automation_rules', 'learning_automation_rule_id'), COALESCE((SELECT MAX(learning_automation_rule_id) FROM learning_automation_rules), 1), true);
SELECT setval(pg_get_serial_sequence('automation_monitor_snapshots', 'automation_monitor_snapshot_id'), COALESCE((SELECT MAX(automation_monitor_snapshot_id) FROM automation_monitor_snapshots), 1), true);
SELECT setval(pg_get_serial_sequence('learning_metric_samples', 'learning_metric_sample_id'), COALESCE((SELECT MAX(learning_metric_sample_id) FROM learning_metric_samples), 1), true);

-- =====================================================
-- A SEED START
-- ?숈뒿 ?먮룞??+ Proof Card + ?숈뒿 ?대젰 + 異붿쿇 蹂寃?+ ?숈뒿 遺꾩꽍
-- =====================================================

-- A scenario base
INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT r.roadmap_id, 'A Swagger Clear Node', 'A ?꾩슜 Swagger 寃利앹슜 ?대━???몃뱶?낅땲??', 'CONCEPT', 101
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes n
      WHERE n.roadmap_id = r.roadmap_id
        AND n.title = 'A Swagger Clear Node'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT r.roadmap_id, 'A Swagger Gap Node', 'A ?꾩슜 Swagger 寃利앹슜 誘명겢由ъ뼱 ?몃뱶?낅땲??', 'PRACTICE', 102
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes n
      WHERE n.roadmap_id = r.roadmap_id
        AND n.title = 'A Swagger Gap Node'
  );

INSERT INTO node_completion_rules (node_id, criteria_type, criteria_value, created_at, updated_at)
SELECT n.node_id, 'LESSON_QUIZ_ASSIGNMENT', 'lesson,quiz,assignment', NOW() - INTERVAL '8' DAY, NOW() - INTERVAL '8' DAY
FROM roadmap_nodes n
WHERE n.title = 'A Swagger Clear Node'
  AND NOT EXISTS (
      SELECT 1
      FROM node_completion_rules r
      WHERE r.node_id = n.node_id
  );

INSERT INTO node_completion_rules (node_id, criteria_type, criteria_value, created_at, updated_at)
SELECT n.node_id, 'LESSON_QUIZ_ASSIGNMENT', 'lesson,quiz,assignment', NOW() - INTERVAL '8' DAY, NOW() - INTERVAL '8' DAY
FROM roadmap_nodes n
WHERE n.title = 'A Swagger Gap Node'
  AND NOT EXISTS (
      SELECT 1
      FROM node_completion_rules r
      WHERE r.node_id = n.node_id
  );

INSERT INTO node_required_tags (node_id, tag_id)
SELECT n.node_id, t.tag_id
FROM roadmap_nodes n, tags t
WHERE n.title = 'A Swagger Clear Node'
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
WHERE n.title = 'A Swagger Gap Node'
  AND t.name = 'Spring Security'
  AND NOT EXISTS (
      SELECT 1
      FROM node_required_tags req
      WHERE req.node_id = n.node_id
        AND req.tag_id = t.tag_id
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
    'A Java Proof Course',
    'A ?꾩슜 ?대━??寃利?肄붿뒪',
    'A Clear Node???곌껐?섎뒗 ?⑥씪 ?덉뒯 肄붿뒪?낅땲??',
    '/images/courses/a-java-proof.png',
    'https://cdn.devpath.com/courses/a-java-proof.mp4',
    'asset-a-java-proof',
    1800,
    0.00,
    0.00,
    'KRW',
    'BEGINNER',
    'ko',
    TRUE,
    'PUBLISHED',
    NOW() - INTERVAL '10' DAY
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.title = 'A Java Proof Course'
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
    'A Gap Recovery Course',
    'A ?꾩슜 誘명넻怨?寃利?肄붿뒪',
    'A Gap Node???곌껐?섎뒗 誘몄셿猷?肄붿뒪?낅땲??',
    '/images/courses/a-gap-recovery.png',
    'https://cdn.devpath.com/courses/a-gap-recovery.mp4',
    'asset-a-gap-recovery',
    2100,
    0.00,
    0.00,
    'KRW',
    'BEGINNER',
    'ko',
    TRUE,
    'PUBLISHED',
    NOW() - INTERVAL '9' DAY
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.title = 'A Gap Recovery Course'
  );

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT c.course_id, 'A Clear Section', '?대━??寃利앹슜 ?뱀뀡', 1, TRUE
FROM courses c
WHERE c.title = 'A Java Proof Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_sections cs
      WHERE cs.course_id = c.course_id
        AND cs.sort_order = 1
  );

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT c.course_id, 'A Gap Section', '誘명겢由ъ뼱 寃利앹슜 ?뱀뀡', 1, TRUE
FROM courses c
WHERE c.title = 'A Gap Recovery Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_sections cs
      WHERE cs.course_id = c.course_id
        AND cs.sort_order = 1
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
    'A Clear Lesson',
    '?대━???몃뱶???꾨즺 ?덉뒯',
    'VIDEO',
    'https://cdn.devpath.com/lessons/a-clear-lesson.mp4',
    'asset-a-clear-lesson',
    'MUX',
    '/images/lessons/a-clear-lesson.png',
    900,
    FALSE,
    TRUE,
    1
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = 'A Java Proof Course'
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
    'A Gap Lesson',
    '誘명겢由ъ뼱 ?몃뱶??誘몄셿猷??덉뒯',
    'VIDEO',
    'https://cdn.devpath.com/lessons/a-gap-lesson.mp4',
    'asset-a-gap-lesson',
    'MUX',
    '/images/lessons/a-gap-lesson.png',
    900,
    FALSE,
    TRUE,
    1
FROM course_sections cs
JOIN courses c ON c.course_id = cs.course_id
WHERE c.title = 'A Gap Recovery Course'
  AND cs.sort_order = 1
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.section_id = cs.section_id
        AND l.sort_order = 1
  );

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT c.course_id, n.node_id, NOW() - INTERVAL '8' DAY
FROM courses c, roadmap_nodes n
WHERE c.title = 'A Java Proof Course'
  AND n.title = 'A Swagger Clear Node'
  AND NOT EXISTS (
      SELECT 1
      FROM course_node_mappings m
      WHERE m.course_id = c.course_id
        AND m.node_id = n.node_id
  );

INSERT INTO course_node_mappings (course_id, node_id, created_at)
SELECT c.course_id, n.node_id, NOW() - INTERVAL '8' DAY
FROM courses c, roadmap_nodes n
WHERE c.title = 'A Gap Recovery Course'
  AND n.title = 'A Swagger Gap Node'
  AND NOT EXISTS (
      SELECT 1
      FROM course_node_mappings m
      WHERE m.course_id = c.course_id
        AND m.node_id = n.node_id
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
SELECT u.user_id, c.course_id, 'COMPLETED', NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '2' DAY, 100, NOW() - INTERVAL '1' DAY
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'A Java Proof Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments e
      WHERE e.user_id = u.user_id
        AND e.course_id = c.course_id
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
SELECT u.user_id, c.course_id, 'ACTIVE', NOW() - INTERVAL '7' DAY, NULL, 40, NOW() - INTERVAL '5' HOUR
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'A Gap Recovery Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_enrollments e
      WHERE e.user_id = u.user_id
        AND e.course_id = c.course_id
  );

-- 1. lesson_progress
-- ?꾨즺/誘몄셿猷?耳?댁뒪
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
SELECT u.user_id, l.lesson_id, 100, 900, 1.0, FALSE, TRUE, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '2' DAY
FROM users u, lessons l
WHERE u.email = 'learner@devpath.com'
  AND l.title = 'A Clear Lesson'
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
SELECT u.user_id, l.lesson_id, 40, 360, 1.25, FALSE, FALSE, NOW() - INTERVAL '5' HOUR, NOW() - INTERVAL '6' DAY, NOW() - INTERVAL '5' HOUR
FROM users u, lessons l
WHERE u.email = 'learner@devpath.com'
  AND l.title = 'A Gap Lesson'
  AND NOT EXISTS (
      SELECT 1
      FROM lesson_progress lp
      WHERE lp.user_id = u.user_id
        AND lp.lesson_id = l.lesson_id
  );

-- 2. quiz_attempt ?먮뒗 quiz_submission
-- ?듦낵/?ㅽ뙣 耳?댁뒪
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
SELECT n.node_id, 'A Clear Node Quiz', 'A Clear Node ?듦낵 寃利앹슜 ?댁쫰?낅땲??', 'MANUAL', 10, TRUE, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
FROM roadmap_nodes n
WHERE n.title = 'A Swagger Clear Node'
  AND NOT EXISTS (
      SELECT 1
      FROM quizzes q
      WHERE q.node_id = n.node_id
        AND q.title = 'A Clear Node Quiz'
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
SELECT n.node_id, 'A Gap Node Quiz', 'A Gap Node ?ㅽ뙣 寃利앹슜 ?댁쫰?낅땲??', 'MANUAL', 10, TRUE, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
FROM roadmap_nodes n
WHERE n.title = 'A Swagger Gap Node'
  AND NOT EXISTS (
      SELECT 1
      FROM quizzes q
      WHERE q.node_id = n.node_id
        AND q.title = 'A Gap Node Quiz'
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
    created_at,
    updated_at,
    is_deleted
)
SELECT q.quiz_id, u.user_id, 9, 10, NOW() - INTERVAL '2' DAY - INTERVAL '10' MINUTE, NOW() - INTERVAL '2' DAY, 600, TRUE, 1, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, FALSE
FROM quizzes q, users u
WHERE q.title = 'A Clear Node Quiz'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
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
    created_at,
    updated_at,
    is_deleted
)
SELECT q.quiz_id, u.user_id, 4, 10, NOW() - INTERVAL '1' DAY - INTERVAL '8' MINUTE, NOW() - INTERVAL '1' DAY, 480, FALSE, 1, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, FALSE
FROM quizzes q, users u
WHERE q.title = 'A Gap Node Quiz'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      WHERE qa.quiz_id = q.quiz_id
        AND qa.learner_id = u.user_id
        AND qa.attempt_number = 1
  );

-- 3. submission
-- ?쒖텧/誘몄젣異??듦낵 耳?댁뒪
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
SELECT n.node_id, 'A Clear Assignment', 'Proof Card 諛쒓툒 媛??耳?댁뒪 寃利앹슜 怨쇱젣?낅땲??', 'URL', NOW() + INTERVAL '3' DAY, NULL, TRUE, TRUE, FALSE, 'GitHub ??μ냼 URL???쒖텧?⑸땲??', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
FROM roadmap_nodes n
WHERE n.title = 'A Swagger Clear Node'
  AND NOT EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.node_id = n.node_id
        AND a.title = 'A Clear Assignment'
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
SELECT n.node_id, 'A Failed Assignment', '?쒖텧?덉?留?誘명넻怨?耳?댁뒪 寃利앹슜 怨쇱젣?낅땲??', 'URL', NOW() + INTERVAL '3' DAY, NULL, TRUE, TRUE, TRUE, 'GitHub ??μ냼 URL???쒖텧?⑸땲??', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
FROM roadmap_nodes n
WHERE n.title = 'A Swagger Gap Node'
  AND NOT EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.node_id = n.node_id
        AND a.title = 'A Failed Assignment'
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
SELECT n.node_id, 'A Missing Assignment', '誘몄젣異?耳?댁뒪 寃利앹슜 怨쇱젣?낅땲??', 'URL', NOW() + INTERVAL '4' DAY, NULL, FALSE, FALSE, FALSE, 'GitHub ??μ냼 URL???쒖텧?⑸땲??', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
FROM roadmap_nodes n
WHERE n.title = 'A Swagger Gap Node'
  AND NOT EXISTS (
      SELECT 1
      FROM assignments a
      WHERE a.node_id = n.node_id
        AND a.title = 'A Missing Assignment'
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    submission_status,
    submission_url,
    is_late,
    submitted_at,
    graded_at,
    total_score,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    created_at,
    updated_at,
    is_deleted
)
SELECT a.assignment_id, u.user_id, 'GRADED', 'https://github.com/example/a-clear-assignment', FALSE, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '1' DAY, 95, TRUE, TRUE, TRUE, TRUE, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '1' DAY, FALSE
FROM assignments a, users u
WHERE a.title = 'A Clear Assignment'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = u.user_id
  );

INSERT INTO assignment_submissions (
    assignment_id,
    learner_id,
    submission_status,
    submission_url,
    is_late,
    submitted_at,
    graded_at,
    total_score,
    readme_passed,
    test_passed,
    lint_passed,
    file_format_passed,
    created_at,
    updated_at,
    is_deleted
)
SELECT a.assignment_id, u.user_id, 'GRADED', 'https://github.com/example/a-failed-assignment', FALSE, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '12' HOUR, 0, FALSE, FALSE, FALSE, TRUE, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '12' HOUR, FALSE
FROM assignments a, users u
WHERE a.title = 'A Failed Assignment'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM assignment_submissions s
      WHERE s.assignment_id = a.assignment_id
        AND s.learner_id = u.user_id
  );

-- 4. til / timestamp_note
INSERT INTO timestamp_notes (
    user_id,
    lesson_id,
    timestamp_second,
    content,
    created_at,
    updated_at,
    is_deleted
)
SELECT u.user_id, l.lesson_id, 120, 'A Clear Lesson?먯꽌 Proof 議곌굔???ㅼ떆 ?뺤씤?덈떎.', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, FALSE
FROM users u, lessons l
WHERE u.email = 'learner@devpath.com'
  AND l.title = 'A Clear Lesson'
  AND NOT EXISTS (
      SELECT 1
      FROM timestamp_notes tn
      WHERE tn.user_id = u.user_id
        AND tn.lesson_id = l.lesson_id
        AND tn.timestamp_second = 120
  );

INSERT INTO timestamp_notes (
    user_id,
    lesson_id,
    timestamp_second,
    content,
    created_at,
    updated_at,
    is_deleted
)
SELECT u.user_id, l.lesson_id, 240, 'A Gap Lesson?먯꽌 鍮좎쭊 ?쒓렇? 怨쇱젣 ?곹깭瑜?硫붾え?덈떎.', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, FALSE
FROM users u, lessons l
WHERE u.email = 'learner@devpath.com'
  AND l.title = 'A Gap Lesson'
  AND NOT EXISTS (
      SELECT 1
      FROM timestamp_notes tn
      WHERE tn.user_id = u.user_id
        AND tn.lesson_id = l.lesson_id
        AND tn.timestamp_second = 240
  );

INSERT INTO til_drafts (
    user_id,
    lesson_id,
    title,
    content,
    status,
    published_url,
    created_at,
    updated_at,
    is_deleted
)
SELECT u.user_id, l.lesson_id, 'A Clear Node TIL', 'NodeClearance? Proof Card 諛쒓툒 議곌굔???뺣━?덈떎.', 'PUBLISHED', 'https://velog.io/@devpath/a-clear-proof', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, FALSE
FROM users u, lessons l
WHERE u.email = 'learner@devpath.com'
  AND l.title = 'A Clear Lesson'
  AND NOT EXISTS (
      SELECT 1
      FROM til_drafts td
      WHERE td.user_id = u.user_id
        AND td.title = 'A Clear Node TIL'
  );

INSERT INTO til_drafts (
    user_id,
    lesson_id,
    title,
    content,
    status,
    published_url,
    created_at,
    updated_at,
    is_deleted
)
SELECT u.user_id, l.lesson_id, 'A Gap Node TIL', '遺議??쒓렇? 怨쇱젣 誘명넻怨??먯씤???뺣━?덈떎.', 'DRAFT', NULL, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, FALSE
FROM users u, lessons l
WHERE u.email = 'learner@devpath.com'
  AND l.title = 'A Gap Lesson'
  AND NOT EXISTS (
      SELECT 1
      FROM til_drafts td
      WHERE td.user_id = u.user_id
        AND td.title = 'A Gap Node TIL'
  );

-- 5. supplement_recommendation
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
SELECT u.user_id, n.node_id, 'Spring Security ?쒓렇媛 遺議깊빐 蹂닿컯 ?숈뒿??異붿쿇?⑸땲??', 95, 35.00, 1, 'PENDING', NOW() - INTERVAL '12' HOUR, NOW() - INTERVAL '12' HOUR
FROM users u, roadmap_nodes n
WHERE u.email = 'learner@devpath.com'
  AND n.title = 'A Swagger Gap Node'
  AND NOT EXISTS (
      SELECT 1
      FROM supplement_recommendations sr
      WHERE sr.user_id = u.user_id
        AND sr.node_id = n.node_id
  );

-- 6. proof_card / certificate / share_link / download_history
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
SELECT u.user_id, n.node_id, 'CLEARED', 100.00, TRUE, 0, TRUE, TRUE, TRUE, TRUE, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY
FROM users u, roadmap_nodes n
WHERE u.email = 'learner@devpath.com'
  AND n.title = 'A Swagger Clear Node'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = n.node_id
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
SELECT u.user_id, n.node_id, 'NOT_CLEARED', 0.00, FALSE, 1, FALSE, FALSE, FALSE, FALSE, NULL, NOW() - INTERVAL '12' HOUR, NOW() - INTERVAL '12' HOUR, NOW() - INTERVAL '12' HOUR
FROM users u, roadmap_nodes n
WHERE u.email = 'learner@devpath.com'
  AND n.title = 'A Swagger Gap Node'
  AND NOT EXISTS (
      SELECT 1
      FROM node_clearances nc
      WHERE nc.user_id = u.user_id
        AND nc.node_id = n.node_id
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
SELECT u.user_id, n.node_id, nc.node_clearance_id, 'A Clear Node Proof Card', 'A Clear Node??NodeClearance? Proof 諛쒓툒 媛???곹깭瑜?利앸챸?⑸땲??', 'ISSUED', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY
FROM users u
JOIN roadmap_nodes n ON n.title = 'A Swagger Clear Node'
JOIN node_clearances nc ON nc.user_id = u.user_id AND nc.node_id = n.node_id
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM proof_cards pc
      WHERE pc.user_id = u.user_id
        AND pc.node_id = n.node_id
  );

INSERT INTO proof_card_tags (
    proof_card_id,
    tag_id,
    skill_evidence_type
)
SELECT pc.proof_card_id, t.tag_id, 'VERIFIED'
FROM proof_cards pc
JOIN roadmap_nodes n ON n.node_id = pc.node_id,
     tags t
WHERE n.title = 'A Swagger Clear Node'
  AND t.name = 'Java'
  AND NOT EXISTS (
      SELECT 1
      FROM proof_card_tags pt
      WHERE pt.proof_card_id = pc.proof_card_id
        AND pt.tag_id = t.tag_id
        AND pt.skill_evidence_type = 'VERIFIED'
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
SELECT pc.proof_card_id, 'proof-share-token-a-21101', 'ACTIVE', NOW() + INTERVAL '30' DAY, 3, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '6' HOUR
FROM proof_cards pc
JOIN roadmap_nodes n ON n.node_id = pc.node_id
WHERE n.title = 'A Swagger Clear Node'
  AND NOT EXISTS (
      SELECT 1
      FROM proof_card_shares ps
      WHERE ps.share_token = 'proof-share-token-a-21101'
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
SELECT pc.proof_card_id, 'CERT-20260330-A1001', 'PDF_READY', NOW() - INTERVAL '1' DAY, 'certificate-CERT-20260330-A1001.pdf', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '12' HOUR, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '12' HOUR
FROM proof_cards pc
JOIN roadmap_nodes n ON n.node_id = pc.node_id
WHERE n.title = 'A Swagger Clear Node'
  AND NOT EXISTS (
      SELECT 1
      FROM certificates c
      WHERE c.proof_card_id = pc.proof_card_id
  );

INSERT INTO certificate_download_histories (
    certificate_id,
    downloaded_by,
    download_reason,
    downloaded_at
)
SELECT c.certificate_id, u.user_id, 'A Swagger 寃利??ㅼ슫濡쒕뱶', NOW() - INTERVAL '12' HOUR
FROM certificates c, users u
WHERE c.certificate_number = 'CERT-20260330-A1001'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM certificate_download_histories h
      WHERE h.certificate_id = c.certificate_id
        AND h.download_reason = 'A Swagger 寃利??ㅼ슫濡쒕뱶'
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
SELECT u.user_id, 'history-share-token-a-21151', 'A Swagger Learning History', NOW() + INTERVAL '14' DAY, 1, TRUE, NOW() - INTERVAL '8' HOUR, NOW() - INTERVAL '8' HOUR
FROM users u
WHERE u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM learning_history_share_links l
      WHERE l.share_token = 'history-share-token-a-21151'
  );

-- 7. learning_rule / metric_sample
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
SELECT 'A_SWAGGER_HISTORY_REFRESH', 'A Swagger History Refresh', 'A ?꾩슜 寃利앹슜 ?쒖꽦 猷곗엯?덈떎.', 'true', 40, 'ENABLED', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'A_SWAGGER_HISTORY_REFRESH'
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
SELECT 'A_SWAGGER_PROOF_LOCK', 'A Swagger Proof Lock', 'A ?꾩슜 寃利앹슜 鍮꾪솢??猷곗엯?덈떎.', 'false', 30, 'DISABLED', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_automation_rules r
    WHERE r.rule_key = 'A_SWAGGER_PROOF_LOCK'
);

INSERT INTO learning_metric_samples (
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT 'OVERVIEW', 'aSwaggerClearanceRate', 50.00, NOW() - INTERVAL '6' HOUR, NOW() - INTERVAL '6' HOUR
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_metric_samples s
    WHERE s.metric_label = 'aSwaggerClearanceRate'
);

INSERT INTO learning_metric_samples (
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
)
SELECT 'QUIZ_STATS', 'aSwaggerQuizQuality', 65.00, NOW() - INTERVAL '6' HOUR, NOW() - INTERVAL '6' HOUR
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_metric_samples s
    WHERE s.metric_label = 'aSwaggerQuizQuality'
);

-- =====================================================
-- A SEED END
-- =====================================================
