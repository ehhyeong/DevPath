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
    'Spring Boot?? ?????熬곣뫖利?????????고뀘??β뼯猷??嚥싳쉶瑗??꾧틡?????Β????醫딆┫?????β뼯爰귨㎘???醫딆┫?뺢껴?귟떋?????뉖뤁??',
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
    '??ш끽維???????嚥▲굧????? ???곌떽?깆쓦 ?꿸쑨????臾먮?????????????嶺뚮ㅎ????',
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
SELECT 'DEBUGGING', '?類?????????癲ル슣??袁ｋ즵', '??????棺??짆??? ?????釉뚰???쨨??濚욌꼬?댄꺍????⑥??癲ル슣??袁ｋ즵??嚥▲꺂痢??????뭇?繹먮냱??????덊렡.',
       '??????棺??짆?? ??????影?됀? ??れ삀?? ?濡ろ뜏??? ???源놁졆 ?濡ろ뜏???醫듽걫???筌?留???????ㅼ굡?醫덉뜏??????', 1, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'DEBUGGING'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'IMPLEMENTATION', '????열野?癲ル슣??袁ｋ즵', '??れ삀???????열野??袁⑸젻泳?????????됰텑???袁⑸젻泳?떑?????醫됲뀷???????뭇?繹먮냱??????덊렡.',
       '??ш끽維??????깼?? 癲ル슢?꾤땟?룹춻???れ삀??? ??關履? 濚욌꼬?댄꺍?????ャ뀕?얜ŉ異?堉온????影?얠맽 ???ㅼ굡?醫덉뜏??????', 2, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'IMPLEMENTATION'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'CODE_REVIEW', '?熬곣뫀????域밸Ŧ留??癲ル슣??袁ｋ즵', '????????熬곣뫀??????????좊즵獒뺣돀????????域밸Ŧ肉????ル늉??????듬쐥???袁⑸즵????????뭇?繹먮냱??????덊렡.',
       '??????熬곣뫀??? ??ш끽維?????ㅻ깹????? ?濚밸Ŧ援앲짆??怨뚮옖???눀???좊읈?????좊렰 ???굿???獄???影?얠맽 ???ㅼ굡?醫덉뜏??????', 3, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'CODE_REVIEW'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'CAREER', '??節뗪콪???癲ル슣??袁ｋ즵', '???爾쏉쫯? ????????? ???⑤챷?? ??れ삀??????ャ뀕?????굿??癲ル슣??袁ｋ즵 ?????뭇?繹먮냱??????덊렡.',
       '??ш끽維???????? 癲ル슢?꾤땟?룹춻?????? ?怨뚮옖??? ?濡ろ뜑??? ??關履? ????嶺? ???ㅼ굡?醫덉뜏??????', 4, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'CAREER'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'STUDY', '????? 癲ル슣??袁ｋ즵', '????? ??筌?留????좊즵獒????熬곣뫂?????醫됲뀷???????뭇?繹먮냱??????덊렡.',
       '??ш끽維????熬곣뫂??????⑤챶裕??癲ル슢??쭕???癲ル슣?????獄???影?얠맽 ???ㅼ굡?醫덉뜏??????', 5, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'STUDY'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'PROJECT', '??ш끽維곩ㅇ???됰씭肄?癲ル슣??袁ｋ즵', '??ш끽維곩ㅇ???됰씭肄?????깼?? ?????? ?袁⑸즲???? ???⑤㈇猿 ???굿??癲ル슣??袁ｋ즵 ?????뭇?繹먮냱??????덊렡.',
       '??ш끽維곩ㅇ???됰씭肄??袁⑸즲??㏓き? ??ш끽維??????깼?? ?袁⑸즵獒뺣뎾??濚욌꼬?댄꺍?????뽮덫?影?뽧걫????ㅼ굡?醫덉뜏??????', 6, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'PROJECT'
);

-- ===========================
-- B ????????얜?源????Β????
-- ===========================

-- [1] review (5癲?
INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 5, '??좊즴甕?????⑤챶裕?????????レ뿴??? ???????좊즵獒?????熬곣뫗踰?????용럡???⑤ı???癲ル슢??? ???????筌???????', 'ANSWERED', FALSE, FALSE, NULL, '2026-01-20 00:00:00', '2026-01-20 00:00:00'
FROM courses c, users u
WHERE c.title = 'Spring Boot Intro' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = '??좊즴甕?????⑤챶裕?????????レ뿴??? ???????좊즵獒?????熬곣뫗踰?????용럡???⑤ı???癲ル슢??? ???????筌???????');

INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 4, 'JPA ???源놁벁 ???????嶺뚮㉡?ｇ빊????モ????怨?????덊렡. ????곷뼰 QueryDSL ??딅텑???됰슣維???釉뚰????????ㅳ늾????源끹걬癲????レ뿭????⑤챶萸?', 'UNANSWERED', FALSE, FALSE, NULL, '2026-01-22 00:00:00', '2026-01-22 00:00:00'
FROM courses c, users u
WHERE c.title = 'JPA Practical Design' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = 'JPA ???源놁벁 ???????嶺뚮㉡?ｇ빊????モ????怨?????덊렡. ????곷뼰 QueryDSL ??딅텑???됰슣維???釉뚰????????ㅳ늾????源끹걬癲????レ뿭????⑤챶萸?');

INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 3, '????용럡?? ??熬곣뫂?????꾨탿 ????????怨? ???源놁졆??좊읈? ??沅걔 ?????怨좊젳???源끹걬癲????レ뿭???????', 'ANSWERED', FALSE, FALSE, NULL, '2026-01-25 00:00:00', '2026-01-25 00:00:00'
FROM courses c, users u
WHERE c.title = 'Spring Boot Intro' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = '????용럡?? ??熬곣뫂?????꾨탿 ????????怨? ???源놁졆??좊읈? ??沅걔 ?????怨좊젳???源끹걬癲????レ뿭???????');

INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 5, 'N+1 ???뽮덫??????됰쐳 ?袁⑸젻泳?쉬??????源놁졆 ??ш끽維곩ㅇ???됰씭肄???袁⑸즴??繞????ㅼ굣??????????????? ??좊즴甕????⑤베毓???筌뤾퍓???', 'UNANSWERED', FALSE, FALSE, NULL, '2026-01-28 00:00:00', '2026-01-28 00:00:00'
FROM courses c, users u
WHERE c.title = 'JPA Practical Design' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = 'N+1 ???뽮덫??????됰쐳 ?袁⑸젻泳?쉬??????源놁졆 ??ш끽維곩ㅇ???됰씭肄???袁⑸즴??繞????ㅼ굣??????????????? ??좊즴甕????⑤베毓???筌뤾퍓???');

INSERT INTO review (course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at)
SELECT c.course_id, u.user_id, 2, '??좊즴甕?????⑤챶裕?? ???レ뿴?癲?????용럡 ????뽦뵣??좊읈? ??????泳???????ㅻ깹?앗꾨쨬??쎛?????????モ닪獒????덊렡.', 'UNSATISFIED', FALSE, FALSE, NULL, '2026-02-01 00:00:00', '2026-02-01 00:00:00'
FROM courses c, users u
WHERE c.title = 'Spring Boot Intro' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review r WHERE r.content = '??좊즴甕?????⑤챶裕?? ???レ뿴?癲?????용럡 ????뽦뵣??좊읈? ??????泳???????ㅻ깹?앗꾨쨬??쎛?????????モ닪獒????덊렡.');

-- [2] review_reply (3癲?
INSERT INTO review_reply (review_id, instructor_id, content, is_deleted, created_at, updated_at)
SELECT r.id, u.user_id, '???????域밸Ŧ留????좊즴??벧??筌뤾퍓??? ??嚥???棺??짆?븍쇀??????レ뿴? ??좊즴甕??紐꾨퓠??怨뚮옖??????깅굴?????? ??援??????? ?嶺뚮ㅎ????? 癲ル슣??袁ｋ즵????낆뒩??뗫빝??', FALSE, '2026-01-21 00:00:00', '2026-01-21 00:00:00'
FROM review r, users u
WHERE r.content = '??좊즴甕?????⑤챶裕?????????レ뿴??? ???????좊즵獒?????熬곣뫗踰?????용럡???⑤ı???癲ル슢??? ???????筌???????'
  AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.instructor_id = u.user_id);

INSERT INTO review_reply (review_id, instructor_id, content, is_deleted, created_at, updated_at)
SELECT r.id, u.user_id, '???⑤벚?????좊즴??벧??筌뤾퍓??? 癲ル슢??씙???筌뚯슜堉????怨? ???源놁졆 ??딅텑???됰슣維???怨뚮옖????筌뚯슦肉???????녿ぅ??熬곣뫀肄????깅굴?????? ???源낆쓱 ????녿ぅ??熬곣뫀肄????れ삀??????낆뒩??뗫빝??', FALSE, '2026-01-26 00:00:00', '2026-01-26 00:00:00'
FROM review r, users u
WHERE r.content = '????용럡?? ??熬곣뫂?????꾨탿 ????????怨? ???源놁졆??좊읈? ??沅걔 ?????怨좊젳???源끹걬癲????レ뿭???????'
  AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.instructor_id = u.user_id);

INSERT INTO review_reply (review_id, instructor_id, content, is_deleted, created_at, updated_at)
SELECT r.id, u.user_id, '??좊즴甕??????뽦뵣????????釉먯뒭??????⑤벚?????좊즴??벧??筌먯떜?????덊렡. ????용럡 ????뽦뵣???釉뚰??????좊즵獒????獄?濚욌꼬裕뼘??濚욌꼬?댄꺍?????덊렡. ??됰씭??????筌먦끉議???낆뒦????筌뤾퍓???', FALSE, '2026-02-02 00:00:00', '2026-02-02 00:00:00'
FROM review r, users u
WHERE r.content = '??좊즴甕?????⑤챶裕?? ???レ뿴?癲?????용럡 ????뽦뵣??좊읈? ??????泳???????ㅻ깹?앗꾨쨬??쎛?????????モ닪獒????덊렡.'
  AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.instructor_id = u.user_id);

/*
-- [3] review_template (3癲?
INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '??좊즴??벧??嶺뚮ㅎ???, '????⑺떍????낆뒩????癲ル슣??????⑥????좊즴??벧??筌먯떜?????덊렡. ???レ뿴? ?域밸Ŧ留?????좊즴甕??諛멥걫???釉먯뒭???袁⑸즵獒?????띾???????筌??????筌뤾퍓??? ??嚥???棺??짆?븍쇀?癲ル슔?됭짆?????좊즴甕??紐꾨퓠??怨뚮옖??????깅굴??????', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = '??좊즴??벧??嶺뚮ㅎ??? AND rt.instructor_id = u.user_id);

INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '??좊즵獒뺣돀????????, '?????????⑤벚?????좊즴??벧??筌뤾퍓??? 癲ル슢??씙?????낆뒩?????딅텑???됰슣維??????????濡ろ떟????ャ뀖???????? ??좊즴甕??紐꾨퓠?????녿ぅ??熬곣뫀肄????깅굴?????? 癲ル슣?????怨쀬뱾?????굿????????????딅텑????ㅿ폍??繹먮끏????', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = '??좊즵獒뺣돀???????? AND rt.instructor_id = u.user_id);

INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '癲ル슣??袁ｋ즵 ???ル늅筌?, '??좊즴甕??諛멥걫?????⑺떍????낆뒩??????좊즴??벧??筌뤾퍓??? ????? 濚???援????????????源끹걬??筌먯룆??Q&A ?濡ろ뜐?????獄??????癲ル슣??袁ｋ즵????낆뒩??뗫빝?? 癲ル슔?됭짆?????鴉????Ъ??????筌먯떜??濡ろ뜑鴉?????덊렡!', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = '癲ル슣??袁ｋ즵 ???ル늅筌? AND rt.instructor_id = u.user_id);

-- [4] refund_request (3癲?
INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, '??좊즴甕?????源녿뼥 ??됰씭?욃＄?낅뼸??, 'PENDING', FALSE, '2026-02-05 00:00:00', NULL
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = '??좊즴甕?????源녿뼥 ??됰씭?욃＄?낅뼸?? AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, '濚욌꼬?댄꺇??????⑺떍', 'APPROVED', FALSE, '2026-02-08 00:00:00', '2026-02-10 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = '濚욌꼬?댄꺇??????⑺떍' AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, '??좊즵獒??????, 'REJECTED', FALSE, '2026-02-12 00:00:00', '2026-02-13 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = '??좊즵獒?????? AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

-- [5] settlement (3癲?
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

-- [6] coupon (2癲?
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

-- [7] promotion (2癲?
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

-- [8] notice (3癲?
INSERT INTO notice (author_id, title, content, is_pinned, is_deleted, created_at, updated_at)
SELECT u.user_id, '??筌먐삳４????? ?????', '????읐??筌뚯뼚??? DevPath????낇돲?? ??筌먐삳４?????源녿뼥 ???뤿Ь????ш낄援??2026??2??15?????源놁벁 2?????4??癰귙룗琉癲ル슣?? ??筌먐삳４???????癲ル슣???몄춿??筌뤾퍓??? ??? ??癰???????딅떛???獒???좊즴甕??????⑺떍 ??Q&A ???⑤챶裕????繹먮굝六???ㅼ굣筌뤿뱶??????モ뵲???????怨?????덊렡. ???⑤챶裕????됰씭??????筌먦끉議???낆뒦????筌뤾퍓???', TRUE, FALSE, '2026-02-10 00:00:00', '2026-02-10 00:00:00'
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM notice n WHERE n.title = '??筌먐삳４????? ?????');

INSERT INTO notice (author_id, title, content, is_pinned, is_deleted, created_at, updated_at)
SELECT u.user_id, '??좊즵獒??嶺뚮㉡?€쾮戮レ땡影??꽟?????獄쏅챷????좊즵獒???????', '??좊즵獒??嶺뚮㉡?€쾮??怨뚮옖???蹂β뵛???좊즵獒??????ㅻ깹??DevPath????좊즵獒??嶺뚮㉡?€쾮戮レ땡影??꽟?????獄쏅챷???2026??3??1??????怨뚮뼚??濡ろ뜑?恝彛????덊렡. ??낆뒩????怨뚮뼚??????⑤챶裕?? ???쒓낯????????? ?釉뚰??????怨뚮옖??? ??れ삀??㉱?癲ル슢?뤸뤃???釉먯뒭?????덊렡. ?怨뚮뼚??濡ろ뜑?恝彛??袁⑸젻泳?⑤닱?? ??筌먐삳４????嚥▲꺂???????嶺뚮Ĳ?됮??筌뚯슜???????怨?????덊렡.', FALSE, FALSE, '2026-02-20 00:00:00', '2026-02-20 00:00:00'
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM notice n WHERE n.title = '??좊즵獒??嶺뚮㉡?€쾮戮レ땡影??꽟?????獄쏅챷????좊즵獒???????');

INSERT INTO notice (author_id, title, content, is_pinned, is_deleted, created_at, updated_at)
SELECT u.user_id, '???ル㎦????れ삀?????⑥レ툔???????', 'DevPath??????궈????れ삀??????⑤베堉???筌??????? ?????????녿ぅ??熬곣뫀肄????????좊즴甕겸넂苡?癲???紐?????㎣筌???れ삀??? ??얜?履?????ㅼ굣????れ삀??? AI ??れ삀??뫢?????? ?濡ろ뜑?灌鍮???⑤베毓????れ삀??????⑥レ툔???筌??????? ????궈????れ삀???????????釉먯뒭?????쒙쭗???ㅼ굣??????? ?濡ろ뜑????癲ル슣鍮뽱슙?怨쀫눨???⑤똻???', FALSE, FALSE, '2026-03-01 00:00:00', '2026-03-01 00:00:00'
FROM users u
WHERE u.email = 'admin@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM notice n WHERE n.title = '???ル㎦????れ삀?????⑥レ툔???????');

-- [9] admin_role (3癲?
INSERT INTO admin_role (role_name, description, is_deleted, created_at, updated_at)
SELECT 'SUPER_ADMIN', '癲ル슢?꾤땟?????筌?痢????れ삀????????癲ル슔?됭짆????援??????怨뚮옖??????????????援???????굿?? ??筌?痢?????源놁젳 ?怨뚮뼚??? ???Β???????쒋닪????ш끽維곻쭚????????筌뤾퍓???', FALSE, '2026-01-01 00:00:00', '2026-01-01 00:00:00'
WHERE NOT EXISTS (SELECT 1 FROM admin_role ar WHERE ar.role_name = 'SUPER_ADMIN');

INSERT INTO admin_role (role_name, description, is_deleted, created_at, updated_at)
SELECT 'CONTENT_MANAGER', '??좊즴甕???熬곣뫕???????濡ろ떟??? ?????? ?袁⑸즵???????癰궽쇱읇 癲꾧퀗???묐뼀???獒????????筌뤾퍓??? ????????Β???????쒋닪????援????? ???⑤８?????덊렡.', FALSE, '2026-01-01 00:00:00', '2026-01-01 00:00:00'
WHERE NOT EXISTS (SELECT 1 FROM admin_role ar WHERE ar.role_name = 'CONTENT_MANAGER');

INSERT INTO admin_role (role_name, description, is_deleted, created_at, updated_at)
SELECT 'CS_MANAGER', '??嚥↔퀡????釉먯뒜??癲ル슪?ｇ몭?? ????????뽮덫????? ?????ル㎦???熬곣뫕??????癲ル슢?꾤땟?????ㅻ깹?????????筌뤾퍓???', FALSE, '2026-01-01 00:00:00', '2026-01-01 00:00:00'
WHERE NOT EXISTS (SELECT 1 FROM admin_role ar WHERE ar.role_name = 'CS_MANAGER');

-- [10] instructor_post (5癲?
INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, '[???살쓴?] ????⑺떍??????野껁깿伊??곗맽 ??筌먯떜????????', '????읐??筌뚯뼚??? ??좊즴甕겸넂苡????낇돲?? ??????????癲ル슢???ъ낄????モ????????맗 2??筌?諭???繹먮끏???Q&A ?嶺뚮ㅎ????癲ル슣???몄춿??筌뤾퍓??? ????⑺떍??????野껁깿伊?諛멸틖 癲ル슢??? 癲ル슔?蹂?덫???袁⑸즴???????덊렡!', 'NOTICE', 0, 0, FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = '[???살쓴?] ????⑺떍??????野껁깿伊??곗맽 ??筌먯떜????????');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Spring Boot?? JPA????影?얠맽 ?????????낆뒩??????, 'Spring Boot ??ш끽維곩ㅇ???됰씭肄?????JPA???????????좊읈??????????濡ろ뜇??????뽮덫???N+1 ???뽮덫?????낇돲?? FetchType.LAZY????れ삀?????⑥?????源놁젳???寃뗏? ??ш끽維????濡ろ뜑???fetch join????筌믨퀡裕??嚥▲꺂痢?????????源낇꼧?嶺뚮ㅎ??? ????몄툜??癲ル슣鍮뽱슙???????? ??筌뚯뼚???', 'GENERAL', 0, 0, FALSE, '2026-01-20 00:00:00', '2026-01-20 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'Spring Boot?? JPA????影?얠맽 ?????????낆뒩??????);

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, '?袁⑸즲??援????좊즵獒뺣끇???? ??????????HTTP ???ㅺ컼???熬곣뫀????嶺뚮㉡?섌걡?, '200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error... REST API ???됰텑????????????????嚥▲꺂痢?HTTP ???ㅺ컼???熬곣뫀????ｏ쭗??嶺뚮㉡?섌걡???怨뚮옖???눀?????? ???????????ㅼ굣??????ㅺ컼???熬곣뫀????ｏ쭗??袁⑸즵????嚥▲꺂痢??濡ろ뜏??????⑥щ뼥??濚욌꼬?댄꺍???? ???甕곌퀋?삥뉩節뗭깓???', 'GENERAL', 0, 0, FALSE, '2026-01-25 00:00:00', '2026-01-25 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = '?袁⑸즲??援????좊즵獒뺣끇???? ??????????HTTP ???ㅺ컼???熬곣뫀????嶺뚮㉡?섌걡?);

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Docker ???爾??????ｊ뭔????좊즵獒뺣끇??????듬젿 ????????꾨탿', '?? ??ш끽維곩ㅇ???됰씭肄?????"??????묊뵓???Β??군??筌먲퐢痢???嚥▲꺂痢??.."???⑤베痢?癲? ???⑤챷?????? 癲ル슢???삳빝?? Docker Compose????좊즵獒뺣끇??????듬젿???熬곣뫀?????????굿?域밸Ŧ肉ョ뵳?異?????癲ル슢?꾤땟?嶺뚮ㅄ苑믭㎗? ????곕럡??????듬젿???????좊즵獒뺣끇????????怨?????덊렡. Spring Boot + PostgreSQL Docker Compose ???源놁젳 ?袁⑸젻泳?쉬??????살쓴????筌뤾퍓???', 'GENERAL', 0, 0, FALSE, '2026-02-03 00:00:00', '2026-02-03 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'Docker ???爾??????ｊ뭔????좊즵獒뺣끇??????듬젿 ????????꾨탿');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'JWT ?嶺뚮ㅎ?댐ℓ?????열野????怨뚮옖???눀????ш낄援???袁⑸즵?쀫쓧???癲ル슣????諛몄툔????????, 'JWT??????열野????Refresh Token?? ?袁⑸즵?쀫쓧???HttpOnly Cookie?????濚왿몾??嶺뚮ㅎ??? Access Token?? 癲ル슢???彛???癰????癲ル슣?㎫뙴蹂?뼀?15??1??癰??? ???源놁젳???寃뗏? 雅?퍔瑗??궰???嶺뚮㉡?€쾮????? Payload???????? 癲ル슢???삳빝?? ?怨뚮옖???눀?? 癲ル슪?ｇ몭??野???????筌??怨쀫쿊 ???됰텑????⑤；????筌뤾퍓???', 'GENERAL', 0, 0, FALSE, '2026-02-10 00:00:00', '2026-02-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'JWT ?嶺뚮ㅎ?댐ℓ?????열野????怨뚮옖???눀????ш낄援???袁⑸즵?쀫쓧???癲ル슣????諛몄툔????????);

-- [11] instructor_comment (5癲?
INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, '??繹먮끏???Q&A ?嶺뚮ㅎ????嶺뚮㉡?ｇ빊???れ삀????筌뤾퍓??? ??癲ル슔?蹂?덫?????깅굴??????', 0, FALSE, '2026-01-16 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = '[???살쓴?] ????⑺떍??????野껁깿伊??곗맽 ??筌먯떜????????' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = '??繹먮끏???Q&A ?嶺뚮ㅎ????嶺뚮㉡?ｇ빊???れ삀????筌뤾퍓??? ??癲ル슔?蹂?덫?????깅굴??????');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, '??좊즴甕겸넂苡???嶺뚮㉡????N+1 ???뽮덫?影?뽧걫???筌먲퐤爰????熬곣뫂????怨쀪퐨?? fetch join ???怨뺣빰??좊읈? ?嶺뚮㉡?ｇ빊?????????獒????덊렡!', 0, FALSE, '2026-01-21 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'Spring Boot?? JPA????影?얠맽 ?????????낆뒩?????? AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = '??좊즴甕겸넂苡???嶺뚮㉡????N+1 ???뽮덫?影?뽧걫???筌먲퐤爰????熬곣뫂????怨쀪퐨?? fetch join ???怨뺣빰??좊읈? ?嶺뚮㉡?ｇ빊?????????獒????덊렡!');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'HTTP ???ㅺ컼???熬곣뫀????嶺뚮㉡?섌걡???좊즴??벧??筌뤾퍓??? 癲ル슢????濚욌꼬裕뼘????ㅻ눀????????癲ル슔?蹂앸듋?????깅굴??????', 0, FALSE, '2026-01-26 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = '?袁⑸즲??援????좊즵獒뺣끇???? ??????????HTTP ???ㅺ컼???熬곣뫀????嶺뚮㉡?섌걡? AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'HTTP ???ㅺ컼???熬곣뫀????嶺뚮㉡?섌걡???좊즴??벧??筌뤾퍓??? 癲ル슢????濚욌꼬裕뼘????ㅻ눀????????癲ル슔?蹂앸듋?????깅굴??????');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'Docker Compose ???怨뺣빰 ?熬곣뫀???????살쓴??????낆뒩????놁떵????レ뿭????⑤챶萸? ??좊즵獒????ш끽維곩ㅇ???됰씭肄?????ㅼ굣???????뫢????ル봾?????덊렡.', 0, FALSE, '2026-02-04 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'Docker ???爾??????ｊ뭔????좊즵獒뺣끇??????듬젿 ????????꾨탿' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'Docker Compose ???怨뺣빰 ?熬곣뫀???????살쓴??????낆뒩????놁떵????レ뿭????⑤챶萸? ??좊즵獒????ш끽維곩ㅇ???됰씭肄?????ㅼ굣???????뫢????ル봾?????덊렡.');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'JWT Refresh Token??HttpOnly Cookie?????濚왿몾????袁⑸젻泳?쉬??????源낆쓱 ??좊즴甕????????????????섏꼳???????놁떵????レ뿭???????', 0, FALSE, '2026-02-11 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'JWT ?嶺뚮ㅎ?댐ℓ?????열野????怨뚮옖???눀????ш낄援???袁⑸즵?쀫쓧???癲ル슣????諛몄툔???????? AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'JWT Refresh Token??HttpOnly Cookie?????濚왿몾????袁⑸젻泳?쉬??????源낆쓱 ??좊즴甕????????????????섏꼳???????놁떵????レ뿭???????');

-- qna_questions (qna_answer_draft ?嶺뚮ㅎ????癲ル슔?蹂?덫???
INSERT INTO qna_questions (user_id, template_type, difficulty, title, content, adopted_answer_id, course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'DEBUGGING', 'EASY', 'Spring Boot ????덈틖 ??BeanCreationException???袁⑸즵獒뺣뎾???筌뤾퍓???, '????덈뭷癲???딅텑??????ャ뀖??域????⑤젰???????덈틖??嚥???BeanCreationException: Error creating bean with name ????곸씔??좊읈? ?袁⑸즵獒뺣뎾???筌뤾퍓??? ??筌뚮룧?????낆뒩??????源놁젳?? 癲ル슢???섎뼀???????좊즵?????????????뽮덫?影?놁씀? ???룸ħ逾??癲꾧퀗?????', NULL, c.course_id, NULL, 'UNANSWERED', 0, FALSE, '2026-02-05 00:00:00', '2026-02-05 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM qna_questions q WHERE q.title = 'Spring Boot ????덈틖 ??BeanCreationException???袁⑸즵獒뺣뎾???筌뤾퍓???);

INSERT INTO qna_questions (user_id, template_type, difficulty, title, content, adopted_answer_id, course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'IMPLEMENTATION', 'MEDIUM', 'JPA ??????굿?????源놁젳 ?????뺤깙????룸Ŧ爾?????뽮덫??, 'JPA????????쑦욆????????굿??節뚮쳥? ???源놁젳??嚥???toString()?????JSON 癲ル슣??????????뺤깙????룸Ŧ爾??녿쑕筌? ?袁⑸즵獒뺣뎾???筌뤾퍓??? @JsonIgnore??@JsonManagedReference 濚???????袁⑸젻泳??????ㅻ쿋獒??濡ろ뜏????????レ뿴?影?껊뼆????', NULL, c.course_id, NULL, 'UNANSWERED', 0, FALSE, '2026-02-08 00:00:00', '2026-02-08 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (SELECT 1 FROM qna_questions q WHERE q.title = 'JPA ??????굿?????源놁젳 ?????뺤깙????룸Ŧ爾?????뽮덫??);

-- [12] qna_answer_draft (2癲?
INSERT INTO qna_answer_draft (question_id, instructor_id, draft_content, is_deleted, saved_at, updated_at)
SELECT q.question_id, u.user_id, 'BeanCreationException?? ??낆뒩?戮⑤뭄?????瑗???筌뚮룧??濚밸Ŧ?깁?????濚밸Ŧ援욃ㅇ?????됰꽡???袁⑸즵獒뺣뎾???筌뤾퍓??? @Component, @Service ???????????쒓낮????ш끽維곲??? ????⒱봼??? ?嶺뚮Ĳ?됮??筌뚯슜六?? ??獄쏅똻?????낆뒩?????????嚥▲꺂痢??濡ろ뜑???????瑗?癲ル슔?蹂?덫??濡?씀? ????몄툗癲ル슣?? ????????嶺뚮ㅎ??? ???袁ⓓ??嶺뚮ㅎ?????⑤８痢?????Caused by ??딅텑???됰슣維?????????怨뚮옖????놁떵??嶺뚮쮳?곌섈????????癲ル슓??젆????????怨?????덊렡.', FALSE, '2026-02-06 00:00:00', '2026-02-06 00:00:00'
FROM qna_questions q, users u
WHERE q.title = 'Spring Boot ????덈틖 ??BeanCreationException???袁⑸즵獒뺣뎾???筌뤾퍓??? AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_answer_draft d WHERE d.question_id = q.question_id AND d.instructor_id = u.user_id);

INSERT INTO qna_answer_draft (question_id, instructor_id, draft_content, is_deleted, saved_at, updated_at)
SELECT q.question_id, u.user_id, '???쑦욆????????굿??節뚮쳮???筌믨퀡爰????뺤깙????룸Ŧ爾???DTO ?怨뚮뼚????쒓낮?????좊읈???嚥싲갭큔??濾????곕쿊 ????됰쐳???????怨?????덊렡. Entity??癲ル슣?????袁⑸즵????? 癲ル슢??슙??ResponseDTO???怨뚮뼚????얜Ŧ?껓┼?癲ル슣??????????뺤깙????룸Ŧ爾??????瓘琉??쎛 ?袁⑸즵獒뺣뎾???? ?????????덊렡. ??Entity??癲ル슣????????????筌먲퐢?뀐┼?@JsonIgnore?怨뚮옖???@JsonManagedReference/@JsonBackReference ?釉뚰????????援????筌뤾퍓???', FALSE, '2026-02-09 00:00:00', '2026-02-09 00:00:00'
FROM qna_questions q, users u
WHERE q.title = 'JPA ??????굿?????源놁젳 ?????뺤깙????룸Ŧ爾?????뽮덫?? AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_answer_draft d WHERE d.question_id = q.question_id AND d.instructor_id = u.user_id);

*/

-- [3] review_template (3)
INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Quick acknowledgment', 'Thanks for the review. I checked the issue and will follow up with a concrete fix or guide.', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = 'Quick acknowledgment' AND rt.instructor_id = u.user_id);

INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Ask for reproduction steps', 'Please share the exact steps, environment, and expected result so I can reproduce the problem quickly.', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = 'Ask for reproduction steps' AND rt.instructor_id = u.user_id);

INSERT INTO review_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Share extra material', 'I added a follow-up explanation and extra material so you can review the topic in smaller steps.', FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM review_template rt WHERE rt.title = 'Share extra material' AND rt.instructor_id = u.user_id);

-- [4] refund_request (3)
INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, 'Schedule mismatch', 'PENDING', FALSE, '2026-02-05 00:00:00', NULL
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = 'Schedule mismatch' AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, 'Duplicate purchase', 'APPROVED', FALSE, '2026-02-08 00:00:00', '2026-02-10 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = 'Duplicate purchase' AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

INSERT INTO refund_request (learner_id, course_id, reason, status, is_deleted, requested_at, processed_at)
SELECT u.user_id, c.course_id, 'Not what I expected', 'REJECTED', FALSE, '2026-02-12 00:00:00', '2026-02-13 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM refund_request rr WHERE rr.reason = 'Not what I expected' AND rr.learner_id = u.user_id AND rr.course_id = c.course_id);

-- [10] instructor_post (5)
INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, '[Notice] Weekly live QnA schedule', 'Weekly live QnA will be held every Tuesday. Please post questions in advance.', 'NOTICE', 0, 0, FALSE, '2026-01-15 00:00:00', '2026-01-15 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = '[Notice] Weekly live QnA schedule');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'How to avoid N+1 with JPA', 'Check fetch joins, entity graphs, and batch size settings before changing repository structure.', 'GENERAL', 0, 0, FALSE, '2026-01-20 00:00:00', '2026-01-20 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'How to avoid N+1 with JPA');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'HTTP status code guide', 'Review the difference between 200, 201, 400, 401, 403, 404, and 500 before debugging API flows.', 'GENERAL', 0, 0, FALSE, '2026-01-25 00:00:00', '2026-01-25 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'HTTP status code guide');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Docker Compose local setup tips', 'Keep app, database, and cache startup simple when debugging local environments.', 'GENERAL', 0, 0, FALSE, '2026-02-03 00:00:00', '2026-02-03 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'Docker Compose local setup tips');

INSERT INTO instructor_post (instructor_id, title, content, post_type, like_count, comment_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'JWT access and refresh token strategy', 'Use short-lived access tokens and store refresh tokens securely with rotation rules.', 'GENERAL', 0, 0, FALSE, '2026-02-10 00:00:00', '2026-02-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_post ip WHERE ip.title = 'JWT access and refresh token strategy');

-- [11] instructor_comment (5)
INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'The weekly QnA slot is useful. Please share the agenda early if possible.', 0, FALSE, '2026-01-16 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = '[Notice] Weekly live QnA schedule' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'The weekly QnA slot is useful. Please share the agenda early if possible.');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'This helped. A side-by-side example of fetch join versus lazy loading would be even better.', 0, FALSE, '2026-01-21 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'How to avoid N+1 with JPA' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'This helped. A side-by-side example of fetch join versus lazy loading would be even better.');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'A compact table for common status codes would make this easier to review.', 0, FALSE, '2026-01-26 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'HTTP status code guide' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'A compact table for common status codes would make this easier to review.');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'The Docker examples were helpful for local setup. Please add one troubleshooting checklist.', 0, FALSE, '2026-02-04 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'Docker Compose local setup tips' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'The Docker examples were helpful for local setup. Please add one troubleshooting checklist.');

INSERT INTO instructor_comment (post_id, author_id, parent_comment_id, content, like_count, is_deleted, created_at)
SELECT ip.id, u.user_id, NULL, 'Please add guidance on refresh token rotation and logout handling.', 0, FALSE, '2026-02-11 00:00:00'
FROM instructor_post ip, users u
WHERE ip.title = 'JWT access and refresh token strategy' AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM instructor_comment ic WHERE ic.post_id = ip.id AND ic.content = 'Please add guidance on refresh token rotation and logout handling.');

-- qna_questions
INSERT INTO qna_questions (user_id, template_type, difficulty, title, content, adopted_answer_id, course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'DEBUGGING', 'EASY', 'BeanCreationException during startup', 'Spring Boot startup fails with BeanCreationException. Which bean should I inspect first and how do I narrow the cause?', NULL, c.course_id, NULL, 'UNANSWERED', 0, FALSE, '2026-02-05 00:00:00', '2026-02-05 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (SELECT 1 FROM qna_questions q WHERE q.title = 'BeanCreationException during startup');

INSERT INTO qna_questions (user_id, template_type, difficulty, title, content, adopted_answer_id, course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at)
SELECT u.user_id, 'IMPLEMENTATION', 'MEDIUM', 'How to avoid JPA infinite recursion', 'My entity graph loops when I serialize it to JSON. What is the safest way to stop recursive references?', NULL, c.course_id, NULL, 'UNANSWERED', 0, FALSE, '2026-02-08 00:00:00', '2026-02-08 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com' AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (SELECT 1 FROM qna_questions q WHERE q.title = 'How to avoid JPA infinite recursion');

-- [12] qna_answer_draft (2)
INSERT INTO qna_answer_draft (question_id, instructor_id, draft_content, is_deleted, saved_at, updated_at)
SELECT q.question_id, u.user_id, 'Start from the root cause in the stack trace, then check configuration classes, component scanning, and constructor dependencies.', FALSE, '2026-02-06 00:00:00', '2026-02-06 00:00:00'
FROM qna_questions q, users u
WHERE q.title = 'BeanCreationException during startup' AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_answer_draft d WHERE d.question_id = q.question_id AND d.instructor_id = u.user_id);

INSERT INTO qna_answer_draft (question_id, instructor_id, draft_content, is_deleted, saved_at, updated_at)
SELECT q.question_id, u.user_id, 'Prefer response DTOs for API output, and use reference annotations only when you must serialize the entity graph directly.', FALSE, '2026-02-09 00:00:00', '2026-02-09 00:00:00'
FROM qna_questions q, users u
WHERE q.title = 'How to avoid JPA infinite recursion' AND u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_answer_draft d WHERE d.question_id = q.question_id AND d.instructor_id = u.user_id);

/*
-- [13] qna_template (3癲?
INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '????듬젿???源놁젳 ???살씁?????', '????듬젿???源놁젳 ???굿?????뽮덫???????딅텑?????筌뚮룧????類?????野껊챶爾?? ?????野껊챶爾?? ???獒?application.properties ???源놁젳 ????곸씔??????袁⑸즵獒뺣뎾???筌뤾퍓??? ?沃섅굥?? pom.xml ???獒?build.gradle????筌뚮룧????類??????嶺뚮Ĳ?됮??筌뚯슜六?? ???살쓴?????뽮덫????????援????嚥▲꺂痢??類?????釉뚰????????????寃뗏?????덉툗癲ル슣?? 癲ル슪???띿물???怨뚮옖???빝??', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = '????듬젿???源놁젳 ???살씁?????' AND qt.instructor_id = u.user_id);

INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, 'N+1 ???뽮덫?????살씁?????', 'N+1 ???뽮덫???JPA?????癲ル슢??????????袁⑸즵獒뺣뎾???嚥▲꺂痢??濚밸Ŧ援앲짆????⑤８?????낇돲?? ????됰쐳 ?袁⑸젻泳?쉬????⑥???1) JPQL fetch join ???? 2) @EntityGraph ??筌믨퀡裕? 3) Batch Size ???源놁젳?????怨?????덊렡. ??? ???????? ???????影?얠맽 ?釉뚰????筌먲퐢?뀐┼?fetch join????れ삀?????⑥????????寃뗏? ??縕??癲ル슣?????棺??짆?승????ш끽維????濡ろ뜑?????獒?BatchSize????얜??????? 癲ル슔?됭짆???????嶺뚮ㅎ???', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = 'N+1 ???뽮덫?????살씁?????' AND qt.instructor_id = u.user_id);

INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, '?????????됰쐳 ??좊읈??????, '??????????됰쐳?????獒????源낆쓱 ??筌?留?????쒋닪????怨뚮옖???빝?? 1) ?????癲ル슢?????????????????源낆맫??? ??숆강筌????濡ろ떟??? 2) ???袁ⓓ??嶺뚮ㅎ?????⑤８痢????????熬곣뫀????싷㎗? ?????癲??類????濚??嶺뚮Ĳ?됮? 3) 癲ル슔?됭짆???怨뚮뼚??濡ろ뜑????熬곣뫀????棺堉??먯쾸?????????? ?嶺뚮Ĳ?됮? 4) ???살쓴?????뽮덫????GitHub Issues 癲ル슔?蹂앸듋?? ?????癲ル슢??????? ??ш끽維??????살쓴??????낆뒩????놁떵?????鴉????Ъ??????筌먯떜???????怨?????덊렡.', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = '?????????됰쐳 ??좊읈?????? AND qt.instructor_id = u.user_id);
-- ???袁⑸뙃????숆강筌?쓣爾?
INSERT INTO study_group (name, description, status, max_members, is_deleted, created_at)
SELECT 'Spring Boot 癲ル슢????????袁⑸뙃??, '癲ル슢???ъ낄???낆뒩?戮⑺맪?????곕럡?嶺뚮ㅎ?댐쭗?쒖뒙?癲ル슣???몄춿??嚥▲꺂痢??袁⑸즲??援?????袁⑸뙃??釉먯뒭?????덊렡.', 'RECRUITING', 6, false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_group WHERE name = 'Spring Boot 癲ル슢????????袁⑸뙃??);

INSERT INTO study_group (name, description, status, max_members, is_deleted, created_at)
SELECT 'React ???繞??熬곣뫀??????袁⑸뙃??, 'React?? Tailwind????筌믨퀡裕????ш끽維곩ㅇ?嶺뚮ㅎ????癲ル슣?띰ℓ癒ⓦ뀋????袁⑸뙃??, 'IN_PROGRESS', 4, false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_group WHERE name = 'React ???繞??熬곣뫀??????袁⑸뙃??);

-- ???袁⑸뙃????숆강筌?쓣爾?癲ル슢???볥뼀?(??좊읈??? COMMON BASE??learner_id 1, 2 ?釉뚰???
-- (study_group ID 1??2??좊읈? ?釉뚰????筌먲퐢?????좊읈???
INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 1, 1, 'APPROVED', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 1 AND learner_id = 1);

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 1, 2, 'PENDING', NULL
    WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 1 AND learner_id = 2);

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 2, 1, 'APPROVED', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 2 AND learner_id = 1);

-- ??????癲ル슢?꾤땟?룹춻?
INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT 1, 'WEEKLY_NODE_CLEAR', 3, true
    WHERE NOT EXISTS (SELECT 1 FROM learner_goal WHERE learner_id = 1 AND goal_type = 'WEEKLY_NODE_CLEAR');

INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT 2, 'WEEKLY_STUDY_TIME', 10, true
    WHERE NOT EXISTS (SELECT 1 FROM learner_goal WHERE learner_id = 2 AND goal_type = 'WEEKLY_STUDY_TIME');

-- ????덉쉐??(??釉먮폇?? - Unique ??筌???釉뚰???쨨??袁⑸젻泳?μ젂?
INSERT INTO streak (learner_id, current_streak, longest_streak, last_study_date)
SELECT 1, 5, 14, CURRENT_DATE - INTERVAL '1' DAY
WHERE NOT EXISTS (SELECT 1 FROM streak WHERE learner_id = 1);

INSERT INTO streak (learner_id, current_streak, longest_streak, last_study_date)
SELECT 2, 0, 7, CURRENT_DATE - INTERVAL '3' DAY
WHERE NOT EXISTS (SELECT 1 FROM streak WHERE learner_id = 2);

-- ??ш끽維곩ㅇ???됰씭肄?
INSERT INTO project (name, description, status, is_deleted, created_at)
SELECT 'DevPath ???繞??熬곣뫀???, 'React?? Spring Boot????筌믨퀡裕??????????좊즵獒뺣끇??, 'PREPARING', false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project WHERE name = 'DevPath ???繞??熬곣뫀???);

INSERT INTO project (name, description, status, is_deleted, created_at)
SELECT 'AI 癲????爰???筌먐삳４??, 'OpenAI API????筌믨퀡裕??癲ル슢?????癲ル슢?섊몭???異?癲????爰?, 'IN_PROGRESS', false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project WHERE name = 'AI 癲????爰???筌먐삳４??);

-- ??ш끽維곩ㅇ???됰씭肄???ш끽維쀩??釉먯뒠???濡ろ뜐????
INSERT INTO project_idea_post (author_id, title, content, status, is_deleted, created_at)
SELECT 1, 'Spring Boot ??れ삀??뫢???節뗪콪???API 癲ル슢???????', '?袁⑸즲??援????ш끽維?誘ｌ뒙?癲ル슣???몄춿?????源놁젳????낇돲??', 'PUBLISHED', false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project_idea_post WHERE title = 'Spring Boot ??れ삀??뫢???節뗪콪???API 癲ル슢???????');

-- ========================================
-- PostgreSQL Sequence ?怨뚮옖???癲ル슪?ｇ몭??(癲ル슢????濚욌꼬?댄꺍??
-- 癲ル슢?뤸뤃????ㅼ굣筌뤿뱶??ID???壤굿?袁り뭅????? ???Β????? ????????? ???沅걔???? ????뗫탿????????낆뒩??뉗젂????熬곣뫖??POST ??釉먯뒜????ID 濚욌꼬?댄꺇??????濡?쨬??쎛 ??? ?????????덊렡.
-- ========================================
SELECT setval('study_group_id_seq', (SELECT COALESCE(MAX(id), 1) FROM study_group));
SELECT setval('study_group_member_id_seq', (SELECT COALESCE(MAX(id), 1) FROM study_group_member));
SELECT setval('learner_goal_id_seq', (SELECT COALESCE(MAX(id), 1) FROM learner_goal));
SELECT setval('streak_id_seq', (SELECT COALESCE(MAX(id), 1) FROM streak));
SELECT setval('project_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project));
SELECT setval('project_idea_post_id_seq', (SELECT COALESCE(MAX(id), 1) FROM project_idea_post));
-- ==========================================
-- [??⑤베堉??? ??ш끽維곲??C ???⑤베肄???????ш끽維곮????? ???Β????(???源놁졆 ???????????깼??100% ?袁⑸즵???
-- ==========================================

-- 1. ???袁⑸뙃??癲ル슢????닱?(Study Match) - requester_id, receiver_id, node_id ????
INSERT INTO study_match (requester_id, receiver_id, node_id, status, created_at)
SELECT 1, 2, 101, 'ACCEPTED', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM study_match WHERE requester_id = 1 AND receiver_id = 2 AND node_id = 101);

-- 2. ?????? ??낆뒩??궰??????(Weekly Plan) - plan_content ????
INSERT INTO weekly_plan (learner_id, plan_content, status, created_at)
SELECT 1, '???????癲ル슢?꾤땟?룹춻? Spring Security ?嶺뚮ㅎ?댐ℓ???ш낄援????ш끽紐????熬곣뫂???????ㅼ굣??, 'IN_PROGRESS', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM weekly_plan WHERE learner_id = 1);

-- 3. ??ш끽維곩ㅇ???됰씭肄? 癲ル슢?꾤땟怨⑺맪?????(Project Role)
INSERT INTO project_role (project_id, role_type, required_count)
SELECT 1, 'BACKEND', 2
    WHERE NOT EXISTS (SELECT 1 FROM project_role WHERE project_id = 1 AND role_type = 'BACKEND');

INSERT INTO project_role (project_id, role_type, required_count)
SELECT 1, 'FRONTEND', 2
    WHERE NOT EXISTS (SELECT 1 FROM project_role WHERE project_id = 1 AND role_type = 'FRONTEND');

-- 4. ??ш끽維곩ㅇ???됰씭肄? 癲ル슔?蹂?덫??????(Project Member)
INSERT INTO project_member (project_id, learner_id, role_type, joined_at)
SELECT 1, 1, 'LEADER', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project_member WHERE project_id = 1 AND learner_id = 1);

-- 5. ??ш끽維곩ㅇ???됰씭肄? ?縕?? ???⑤９肉?(Project Invitation)
INSERT INTO project_invitation (project_id, inviter_id, invitee_id, status, created_at)
SELECT 1, 1, 3, 'PENDING', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project_invitation WHERE project_id = 1 AND invitee_id = 3);

-- 6. 癲ル슢?섊몭???異? 癲ル슣???????⑤９肉?(Mentoring Application)
INSERT INTO mentoring_application (project_id, mentor_id, message, status, created_at)
SELECT 1, 5, '?袁⑸즲??援????ш낄援????怨좊굇 ?域밸Ŧ留????딅텑????ㅿ폍??繹먮끏????', 'PENDING', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM mentoring_application WHERE project_id = 1 AND mentor_id = 5);

-- 7. ????? 癲ル슣鍮섌뜮戮녈럷? ??筌믨퉭?????⑤９肉?(Project Proof Submission)
INSERT INTO project_proof_submission (project_id, submitter_id, proof_card_ref_id, submitted_at)
SELECT 1, 1, 'PROOF-2026-ABC123X', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM project_proof_submission WHERE project_id = 1 AND submitter_id = 1);

-- 8. ?????(Learner Notification)
INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT 1, 'STUDY_GROUP', '????궈?????袁⑸뙃?????????癲ル슢????닱??筌???????', false, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM learner_notification WHERE learner_id = 1 AND type = 'STUDY_GROUP');

-- 9. ????筌먲퐡??????怨좊룴??(Dashboard Snapshot) - completed_nodes ????
INSERT INTO dashboard_snapshot (learner_id, snapshot_date, total_study_hours, completed_nodes)
SELECT 1, CURRENT_DATE, 45, 12
    WHERE NOT EXISTS (SELECT 1 FROM dashboard_snapshot WHERE learner_id = 1 AND snapshot_date = CURRENT_DATE);

*/

-- [13] qna_template (3)
INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, 'Debugging startup errors', 'Check stack trace order, configuration classes, environment variables, and recent dependency changes first.', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = 'Debugging startup errors' AND qt.instructor_id = u.user_id);

INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, 'N+1 review checklist', 'Compare repository query count, fetch strategy, and entity graph usage before changing domain structure.', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = 'N+1 review checklist' AND qt.instructor_id = u.user_id);

INSERT INTO qna_template (instructor_id, title, content, is_deleted, created_at, updated_at)
SELECT u.user_id, 'API error triage guide', 'Write down request payload, response code, logs, and reproduction steps before escalating the issue.', FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users u
WHERE u.email = 'instructor@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM qna_template qt WHERE qt.title = 'API error triage guide' AND qt.instructor_id = u.user_id);

INSERT INTO study_group (name, description, status, max_members, is_deleted, created_at)
SELECT 'Spring Boot Study Group', 'Weekly study group for Spring Boot basics and deployment practice.', 'RECRUITING', 6, FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM study_group WHERE name = 'Spring Boot Study Group');

INSERT INTO study_group (name, description, status, max_members, is_deleted, created_at)
SELECT 'React UI Study Group', 'Study group focused on React components, state, and Tailwind usage.', 'IN_PROGRESS', 4, FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM study_group WHERE name = 'React UI Study Group');

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 1, 1, 'APPROVED', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 1 AND learner_id = 1);

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 1, 2, 'PENDING', NULL
WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 1 AND learner_id = 2);

INSERT INTO study_group_member (group_id, learner_id, join_status, joined_at)
SELECT 2, 1, 'APPROVED', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM study_group_member WHERE group_id = 2 AND learner_id = 1);

INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT 1, 'WEEKLY_NODE_CLEAR', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM learner_goal WHERE learner_id = 1 AND goal_type = 'WEEKLY_NODE_CLEAR');

INSERT INTO learner_goal (learner_id, goal_type, target_value, is_active)
SELECT 2, 'WEEKLY_STUDY_TIME', 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM learner_goal WHERE learner_id = 2 AND goal_type = 'WEEKLY_STUDY_TIME');

INSERT INTO streak (learner_id, current_streak, longest_streak, last_study_date)
SELECT 1, 5, 14, CURRENT_DATE - INTERVAL '1' DAY
WHERE NOT EXISTS (SELECT 1 FROM streak WHERE learner_id = 1);

INSERT INTO streak (learner_id, current_streak, longest_streak, last_study_date)
SELECT 2, 0, 7, CURRENT_DATE - INTERVAL '3' DAY
WHERE NOT EXISTS (SELECT 1 FROM streak WHERE learner_id = 2);

INSERT INTO project (name, description, status, is_deleted, created_at)
SELECT 'DevPath Team Project', 'Full stack team project with React and Spring Boot.', 'PREPARING', FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM project WHERE name = 'DevPath Team Project');

INSERT INTO project (name, description, status, is_deleted, created_at)
SELECT 'AI Assistant Project', 'Project using the OpenAI API for learning support workflows.', 'IN_PROGRESS', FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM project WHERE name = 'AI Assistant Project');

INSERT INTO project_idea_post (author_id, title, content, status, is_deleted, created_at)
SELECT 1, 'Spring Boot API idea', 'Build a production-style API with authentication, persistence, and monitoring.', 'PUBLISHED', FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM project_idea_post WHERE title = 'Spring Boot API idea');

INSERT INTO study_match (requester_id, receiver_id, node_id, status, created_at)
SELECT 1, 2, 101, 'ACCEPTED', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM study_match WHERE requester_id = 1 AND receiver_id = 2 AND node_id = 101);

INSERT INTO weekly_plan (learner_id, plan_content, status, created_at)
SELECT 1, 'Review Spring Security basics and finish one practice task.', 'IN_PROGRESS', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM weekly_plan WHERE learner_id = 1);

INSERT INTO project_role (project_id, role_type, required_count)
SELECT 1, 'BACKEND', 2
WHERE NOT EXISTS (SELECT 1 FROM project_role WHERE project_id = 1 AND role_type = 'BACKEND');

INSERT INTO project_role (project_id, role_type, required_count)
SELECT 1, 'FRONTEND', 2
WHERE NOT EXISTS (SELECT 1 FROM project_role WHERE project_id = 1 AND role_type = 'FRONTEND');

INSERT INTO project_member (project_id, learner_id, role_type, joined_at)
SELECT 1, 1, 'LEADER', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM project_member WHERE project_id = 1 AND learner_id = 1);

INSERT INTO project_invitation (project_id, inviter_id, invitee_id, status, created_at)
SELECT 1, 1, 3, 'PENDING', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM project_invitation WHERE project_id = 1 AND invitee_id = 3);

INSERT INTO mentoring_application (project_id, mentor_id, message, status, created_at)
SELECT 1, 5, 'I would like feedback on the backend architecture and deployment plan.', 'PENDING', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM mentoring_application WHERE project_id = 1 AND mentor_id = 5);

INSERT INTO project_proof_submission (project_id, submitter_id, proof_card_ref_id, submitted_at)
SELECT 1, 1, 'PROOF-2026-ABC123X', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM project_proof_submission WHERE project_id = 1 AND submitter_id = 1);

INSERT INTO learner_notification (learner_id, type, message, is_read, created_at)
SELECT 1, 'STUDY_GROUP', 'Your study group request was accepted.', FALSE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM learner_notification WHERE learner_id = 1 AND type = 'STUDY_GROUP');

INSERT INTO dashboard_snapshot (learner_id, snapshot_date, total_study_hours, completed_nodes)
SELECT 1, CURRENT_DATE, 45, 12
WHERE NOT EXISTS (SELECT 1 FROM dashboard_snapshot WHERE learner_id = 1 AND snapshot_date = CURRENT_DATE);

/*
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
(10901, 1, 'Java Basics ????????⑤ı沅?, 'Java Basics ?嶺뚮ㅎ?볠뤃?????? ?嶺뚮Ĳ?됮?????⑤ı沅????낇돲??', 'MANUAL', 10, TRUE, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY),
(10902, 2, 'HTTP Fundamentals ????????⑤ı沅?, 'HTTP Fundamentals ?嶺뚮ㅎ?볠뤃?????? ?嶺뚮Ĳ?됮?????⑤ı沅????낇돲??', 'MANUAL', 10, TRUE, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY);

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
(11901, 1, 'Java Basics ???怨? ??貫???, '??れ삀??????뽮덧??れ뒉????좊즵??꼯?????????れ삀??獄????嶺뚮㉡?섌걡??嚥▲꺂痢???貫??????낇돲??', 'URL', NOW() - INTERVAL '4' DAY, NULL, TRUE, FALSE, FALSE, 'GitHub ??????URL????筌믨퉭???筌뤾퍓???', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY),
(11902, 2, 'HTTP Fundamentals ?嶺뚮㉡?섌걡???貫???, 'HTTP 癲ル슢??袁λ빝??? ???ㅺ컼???熬곣뫀????ｏ쭗??嶺뚮㉡?섌걡??嚥▲꺂痢???貫??????낇돲??', 'URL', NOW() - INTERVAL '1' DAY, NULL, TRUE, FALSE, FALSE, 'GitHub ??????URL????筌믨퉭???筌뤾퍓???', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY);

-- lesson_progress ??ш끽維??雅?퍔瑗띰㎖???뺤??
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
(10001, 1, 1, 100, 780, 1.0, FALSE, TRUE, NOW() - INTERVAL '5' DAY, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '5' DAY),
(10002, 1, 2, 65, 598, 1.25, TRUE, FALSE, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '6' DAY, NOW() - INTERVAL '2' DAY),
(10003, 2, 1, 100, 780, 1.0, FALSE, TRUE, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '8' DAY, NOW() - INTERVAL '3' DAY),
(10004, 2, 3, 40, 440, 1.0, FALSE, FALSE, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '4' DAY, NOW() - INTERVAL '1' DAY);

-- quiz_attempts ???亦?????됰꽡
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
(11001, 10901, 1, 9, 10, NOW() - INTERVAL '5' DAY - INTERVAL '10' MINUTE, NOW() - INTERVAL '5' DAY, 600, TRUE, 1, NOW() - INTERVAL '5' DAY, NOW() - INTERVAL '5' DAY, FALSE),
(11002, 10902, 1, 4, 10, NOW() - INTERVAL '2' DAY - INTERVAL '8' MINUTE, NOW() - INTERVAL '2' DAY, 480, FALSE, 1, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, FALSE),
(11003, 10901, 2, 8, 10, NOW() - INTERVAL '3' DAY - INTERVAL '9' MINUTE, NOW() - INTERVAL '3' DAY, 540, TRUE, 1, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '3' DAY, FALSE);

-- assignment_submissions ??筌믨퉭??雅?퍔瑗띰㎖?影?뽱돯????亦?
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
(12001, 11901, 1, 'GRADED', 'https://github.com/example/devpath-assignment-1', FALSE, NOW() - INTERVAL '5' DAY, NOW() - INTERVAL '4' DAY, 95, TRUE, TRUE, TRUE, TRUE, NOW() - INTERVAL '5' DAY, NOW() - INTERVAL '4' DAY, FALSE),
(12002, 11902, 1, 'SUBMITTED', 'https://github.com/example/devpath-assignment-2', FALSE, NOW() - INTERVAL '2' DAY, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, FALSE),
(12003, 11901, 2, 'GRADED', 'https://github.com/example/devpath-assignment-3', FALSE, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '2' DAY, 82, TRUE, TRUE, FALSE, TRUE, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '2' DAY, FALSE);

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
(13001, 1, 1, 120, 'DI?? IoC 癲ル슓堉곁땟??リ랜?????怨뺣빰 ?嶺뚮㉡?섌걡????덊렡.', NOW() - INTERVAL '6' DAY, NOW() - INTERVAL '6' DAY, FALSE),
(13002, 1, 2, 420, 'Bean lifecycle callback ?????????怨뺣빰 ???덇콪??', NOW() - INTERVAL '5' DAY, NOW() - INTERVAL '5' DAY, FALSE),
(13003, 2, 3, 300, '??????굿??癲ル슢???⑸눀???ш끽維???????????嶺? 癲ル슢????????덊렡.', NOW() - INTERVAL '4' DAY, NOW() - INTERVAL '4' DAY, FALSE);

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
(14001, 1, 1, 'Spring IoC?? DI ?嶺뚮㉡?섌걡?, 'DI, IoC, BeanContainer ???????嶺뚮㉡?섌걡????덊렡.', 'PUBLISHED', 'https://velog.io/@devpath/ioc-di', NOW() - INTERVAL '5' DAY, NOW() - INTERVAL '5' DAY, FALSE),
(14002, 1, 2, 'Bean ??筌뤾쑨???낆뒩??곷뎨??嶺뚮㉡?섌걡?, 'Bean ??獄쏅똻?????????熬곣뫖痢딀뤆???筌믨퀣????嶺뚮㉡?섌걡????덊렡.', 'DRAFT', NULL, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, FALSE),
(14003, 2, 3, 'JPA ??????굿??癲ル슢???⑸눀?癲ル슢?????, '?????? ?????癲ル슢???⑸눀?癲ル슓堉곁땟??リ랜???嶺뚮㉡?섌걡????덊렡.', 'PUBLISHED', 'https://velog.io/@devpath/jpa-mapping', NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '3' DAY, FALSE);

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
(15001, 1, 2, 'HTTP ??れ삀????怨뚮옖???????ш끽維?????⑤베毓?????獄쏅똻???筌???????', 90, 52.0, 2, 'PENDING', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY),
(15002, 1, 3, 'Spring Boot ??れ삀??????怨뚮옖??????⑤베毓??????????筌???????', 85, 71.0, 1, 'APPROVED', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(15003, 2, 2, 'HTTP ??釉먯뒜?????쑩?젆???????怨뚮옖甕????⑤베毓?????獄쏅똻???筌???????', 80, 58.0, 2, 'PENDING', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY);

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
(16001, 1, 1, 'CLEARED', 100.00, TRUE, 0, TRUE, TRUE, TRUE, TRUE, NOW() - INTERVAL '4' DAY, NOW() - INTERVAL '4' DAY, NOW() - INTERVAL '4' DAY, NOW() - INTERVAL '4' DAY),
(16002, 1, 2, 'NOT_CLEARED', 65.00, FALSE, 1, FALSE, FALSE, FALSE, FALSE, NULL, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY),
(16003, 2, 1, 'CLEARED', 100.00, TRUE, 0, TRUE, TRUE, TRUE, TRUE, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '3' DAY);

INSERT INTO node_clearance_reasons (
    node_clearance_reason_id,
    node_clearance_id,
    reason_type,
    is_satisfied,
    detail_message,
    created_at
) VALUES
(16101, 16001, 'LESSON_COMPLETION', TRUE, '???怨? ??ш낄猷귨쭚?? 100.00%', NOW() - INTERVAL '4' DAY),
(16102, 16001, 'REQUIRED_TAGS', TRUE, '??ш끽維????癰궽쇱읇??癲ル슢?꾤땟?嶺??怨뚮옖??????寃뗏????怨?????덊렡.', NOW() - INTERVAL '4' DAY),
(16103, 16001, 'QUIZ_PASS', TRUE, '???⑤ı沅??釉뚰???쨨??癲ル슢??????怨?????덊렡.', NOW() - INTERVAL '4' DAY),
(16104, 16001, 'ASSIGNMENT_PASS', TRUE, '??貫????釉뚰???쨨??癲ル슢??????怨?????덊렡.', NOW() - INTERVAL '4' DAY),
(16105, 16001, 'PROOF_ELIGIBLE', TRUE, 'Proof Card ?袁⑸즵獒????좊읈??????ㅺ컼?????낇돲??', NOW() - INTERVAL '4' DAY),
(16106, 16002, 'LESSON_COMPLETION', FALSE, '???怨? ??ш낄猷귨쭚?? 65.00%', NOW() - INTERVAL '2' DAY),
(16107, 16002, 'MISSING_TAGS', FALSE, 'HTTP', NOW() - INTERVAL '2' DAY),
(16108, 16002, 'PROOF_ELIGIBLE', FALSE, 'Proof Card ?袁⑸즵獒???釉뚰???쨨????ш끽維쀧빊??野껊챶爾???? ????⒱봼??????', NOW() - INTERVAL '2' DAY);

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
(17001, 1, 1, 16001, 'Java Basics Proof Card', 'Java Basics ?嶺뚮ㅎ?볠뤃??????? ??ш끽維?????濡ろ떟?癲??釉뚰???쨨??野껊챶爾???濡ろ뜏???醫듽걫?癲ル슣鍮섌뜮戮녈럷??筌뤾퍓???', 'ISSUED', NOW() - INTERVAL '4' DAY, NOW() - INTERVAL '4' DAY, NOW() - INTERVAL '4' DAY),
(17002, 2, 1, 16003, 'Java Basics Proof Card', 'Java Basics ?嶺뚮ㅎ?볠뤃??????? ??ш끽維?????濡ろ떟?癲??釉뚰???쨨??野껊챶爾???濡ろ뜏???醫듽걫?癲ル슣鍮섌뜮戮녈럷??筌뤾퍓???', 'ISSUED', NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '3' DAY);

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
(17201, 17001, 'proof-share-token-17001', 'ACTIVE', NOW() + INTERVAL '30' DAY, 7, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '1' DAY),
(17202, 17002, 'proof-share-token-17002', 'ACTIVE', NOW() + INTERVAL '15' DAY, 2, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '1' DAY);

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
(17301, 17001, 'CERT-20260329-A001', 'PDF_READY', NOW() - INTERVAL '3' DAY, 'certificate-CERT-20260329-A001.pdf', NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '3' DAY, NOW() - INTERVAL '2' DAY),
(17302, 17002, 'CERT-20260329-A002', 'ISSUED', NOW() - INTERVAL '2' DAY, NULL, NULL, NULL, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY);

INSERT INTO certificate_download_histories (
    certificate_download_history_id,
    certificate_id,
    downloaded_by,
    download_reason,
    downloaded_at
) VALUES
(17401, 17301, 1, '???????????筌믨퉭??, NOW() - INTERVAL '2' DAY),
(17402, 17301, 1, '??????嶺뚮㉡?섌걡?, NOW() - INTERVAL '1' DAY);

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
(17501, 1, 'history-share-token-17501', 'Learner Kim ????? ?????, NOW() + INTERVAL '30' DAY, 5, TRUE, NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '1' DAY);

-- recommendation_change ???얜?源?
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
(18001, 1, 2, 15001, '??딅텑?????癰궽쇱읇?? 癲ル슔?됭짆??????? ??れ삀??쎈뭄???袁⑸즵??????⑤베毓?????낇돲??', 'tilCount=2, weaknessSignal=true, warningCount=1, historyCount=1', 'SUGGESTED', 'UNDECIDED', NOW() - INTERVAL '1' DAY, NULL, NULL, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(18002, 1, 3, 15002, '???⑤ı沅?????됰꽡 ???????袁⑸즵??????ш끽維뽫댆??嶺뚮ㅎ?볠뤃???⑤베毓????釉뚰?????怨?????덊렡.', 'tilCount=2, weaknessSignal=true, warningCount=1, historyCount=2', 'APPLIED', 'APPLIED', NOW() - INTERVAL '12' HOUR, NOW() - INTERVAL '6' HOUR, NULL, NOW() - INTERVAL '12' HOUR, NOW() - INTERVAL '6' HOUR),
(18003, 2, 2, 15003, '?怨뚮옖??????⑤베毓?????Β?띾쭡??筌믨퀡彛???釉뚰??????筌??????낇돲??', 'tilCount=1, weaknessSignal=false, warningCount=0, historyCount=0', 'IGNORED', 'IGNORED', NOW() - INTERVAL '10' HOUR, NULL, NOW() - INTERVAL '4' HOUR, NOW() - INTERVAL '10' HOUR, NOW() - INTERVAL '4' HOUR);

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
(19001, 'PROOF_CARD_AUTO_ISSUE', 'Proof Card ???筌??袁⑸즵獒??, '?嶺뚮ㅎ?볠뤃?????????Proof Card?????筌??袁⑸즵獒???筌뤾퍓???', 'true', 100, 'ENABLED', NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY),
(19002, 'PROOF_CARD_MANUAL_ISSUE', 'Proof Card ??嚥▲꺃彛??袁⑸즵獒??, '??嚥▲꺃彛??袁⑸즵獒??API ???源낅츛 ???????낇돲??', 'true', 90, 'ENABLED', NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY),
(19003, 'RECOMMENDATION_CHANGE_ENABLED', '??⑤베毓???怨뚮뼚?????筌????, '??⑤베毓???怨뚮뼚?????筌?????れ삀?????筌???????????낇돲??', 'true', 80, 'ENABLED', NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY),
(19004, 'RECOMMENDATION_CHANGE_MAX_LIMIT', '??⑤베毓???怨뚮뼚???癲ル슔?됭짆? ??좊즵獒??, '??⑤베毓???怨뚮뼚?????筌???癲ル슔?됭짆? ??좊즵獒?????낇돲??', '5', 70, 'ENABLED', NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY),
(19005, 'SUPPLEMENT_RECOMMENDATION_ENABLED', '?怨뚮옖??????⑤베毓????筌????, '?怨뚮옖??????⑤베毓????獄쏅똻????れ삀?????筌???????????낇돲??', 'true', 60, 'ENABLED', NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY);

INSERT INTO automation_monitor_snapshots (
    automation_monitor_snapshot_id,
    monitor_key,
    monitor_status,
    snapshot_value,
    snapshot_message,
    measured_at,
    created_at
) VALUES
(19101, 'PROOF_CARD_AUTO_ISSUE', 'HEALTHY', 1.0, '???筌??袁⑸즵獒????룰퀬?????筌????釉먮폇??????怨?????덊렡.', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(19102, 'PROOF_CARD_MANUAL_ISSUE', 'HEALTHY', 1.0, '??嚥▲꺃彛??袁⑸즵獒????룰퀬?????筌????釉먮폇??????怨?????덊렡.', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(19103, 'RECOMMENDATION_CHANGE_ENABLED', 'HEALTHY', 1.0, '??⑤베毓???怨뚮뼚?????룰퀬?????筌????釉먮폇??????怨?????덊렡.', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(19104, 'SUPPLEMENT_RECOMMENDATION_ENABLED', 'HEALTHY', 1.0, '?怨뚮옖??????⑤베毓????룰퀬?????筌????釉먮폇??????怨?????덊렡.', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY);

INSERT INTO learning_metric_samples (
    learning_metric_sample_id,
    metric_type,
    metric_label,
    metric_value,
    sampled_at,
    created_at
) VALUES
(19201, 'OVERVIEW', 'clearanceRate', 87.50, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(19202, 'COMPLETION_RATE', 'roadmapCompletionRate', 42.80, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(19203, 'AVERAGE_WATCH_TIME', 'averageLearningDurationSeconds', 1380.00, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY),
(19204, 'QUIZ_STATS', 'quizQualityScore', 79.40, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY);

-- ???沅걔????怨뚮옖???
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
*/

-- =====================================================
-- A SEED START
-- ???덈? ???吏??+ Proof Card + ???덈? ?????+ ?怨뺣뾼???곌떠???+ ???덈? ?釉뚯뫒??
-- =====================================================

-- A scenario base
INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT r.roadmap_id, 'A Swagger Clear Node', 'A ?熬곣뫗??Swagger ?롪틵?嶺뚯빘鍮?????????筌뤾퍓援???낅퉵??', 'CONCEPT', 101
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes n
      WHERE n.roadmap_id = r.roadmap_id
        AND n.title = 'A Swagger Clear Node'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT r.roadmap_id, 'A Swagger Gap Node', 'A ?熬곣뫗??Swagger ?롪틵?嶺뚯빘鍮??亦껋꼶梨멨칰짰逾????筌뤾퍓援???낅퉵??', 'PRACTICE', 102
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
    'A Swagger proof validation course',
    'Course for validating the cleared node to proof-card flow.',
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
    'A Swagger recovery validation course',
    'Course for validating the uncleared node recovery flow.',
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
SELECT c.course_id, 'A Clear Section', 'Section for the cleared-node Swagger validation flow.', 1, TRUE
FROM courses c
WHERE c.title = 'A Java Proof Course'
  AND NOT EXISTS (
      SELECT 1
      FROM course_sections cs
      WHERE cs.course_id = c.course_id
        AND cs.sort_order = 1
  );

INSERT INTO course_sections (course_id, title, description, sort_order, is_published)
SELECT c.course_id, 'A Gap Section', 'Section for the uncleared-node Swagger validation flow.', 1, TRUE
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
    '???????筌뤾퍓援???熬곣뫁?????곕?',
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
    '亦껋꼶梨멨칰짰逾????筌뤾퍓援??亦껋꼶梨??쒕쇀????곕?',
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
-- ?熬곣뫁??亦껋꼶梨??쒕쇀???댟??怨룸츩
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

-- 2. quiz_attempt ???裕?quiz_submission
-- ???沅????덉넮 ??댟??怨룸츩
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
SELECT n.node_id, 'A Clear Node Quiz', 'A Clear Node ???沅??롪틵?嶺뚯빘鍮????怨멥궛???낅퉵??', 'MANUAL', 10, TRUE, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
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
SELECT n.node_id, 'A Gap Node Quiz', 'A Gap Node ???덉넮 ?롪틵?嶺뚯빘鍮????怨멥궛???낅퉵??', 'MANUAL', 10, TRUE, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
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
-- ??戮깅?亦껋꼶梨?節뉖퉲????沅???댟??怨룸츩
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
SELECT n.node_id, 'A Clear Assignment', 'Proof Card ?꾩룇裕???띠럾?????댟??怨룸츩 ?롪틵?嶺뚯빘鍮????λ닔????낅퉵??', 'URL', NOW() + INTERVAL '3' DAY, NULL, TRUE, TRUE, FALSE, 'GitHub ??????URL????戮깅??紐껊퉵??', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
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
SELECT n.node_id, 'A Failed Assignment', '??戮깅???嶺?亦껋꼶梨??Β???댟??怨룸츩 ?롪틵?嶺뚯빘鍮????λ닔????낅퉵??', 'URL', NOW() + INTERVAL '3' DAY, NULL, TRUE, TRUE, TRUE, 'GitHub ??????URL????戮깅??紐껊퉵??', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
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
SELECT n.node_id, 'A Missing Assignment', '亦껋꼶梨?節뉖퉲???댟??怨룸츩 ?롪틵?嶺뚯빘鍮????λ닔????낅퉵??', 'URL', NOW() + INTERVAL '4' DAY, NULL, FALSE, FALSE, FALSE, 'GitHub ??????URL????戮깅??紐껊퉵??', 100, TRUE, TRUE, TRUE, FALSE, NOW() - INTERVAL '7' DAY, NOW() - INTERVAL '7' DAY
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
SELECT u.user_id, l.lesson_id, 120, 'A Clear Lesson?????Proof ?브퀗?쀦뤃?????곕뻣 ?筌먦끉逾???덈펲.', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, FALSE
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
SELECT u.user_id, l.lesson_id, 240, 'A Gap Lesson???????伊쇿퐲???蹂μ쟽?? ??λ닔????⑤객臾??嶺뚮∥?????덈펲.', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, FALSE
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
SELECT u.user_id, l.lesson_id, 'A Clear Node TIL', 'NodeClearance?? Proof Card ?꾩룇裕???브퀗?쀦뤃???筌먲퐘遊???덈펲.', 'PUBLISHED', 'https://velog.io/@devpath/a-clear-proof', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY, FALSE
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
SELECT u.user_id, l.lesson_id, 'A Gap Node TIL', '?遊붋????蹂μ쟽?? ??λ닔??亦껋꼶梨??Β????逾???筌먲퐘遊???덈펲.', 'DRAFT', NULL, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, FALSE
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
SELECT u.user_id, n.node_id, 'Spring Security ??蹂μ쟽?띠럾? ?遊붋?브퀗?꿴뜮??곌랜??????덈????怨뺣뾼???紐껊퉵??', 95, 35.00, 1, 'PENDING', NOW() - INTERVAL '12' HOUR, NOW() - INTERVAL '12' HOUR
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
SELECT u.user_id, n.node_id, nc.node_clearance_id, 'A Clear Node Proof Card', 'A Clear Node??NodeClearance?? Proof ?꾩룇裕???띠럾?????⑤객臾??嶺뚯빘鍮뽳㎖??紐껊퉵??', 'ISSUED', NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY, NOW() - INTERVAL '1' DAY
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
SELECT c.certificate_id, u.user_id, 'A Swagger certificate download', NOW() - INTERVAL '12' HOUR
FROM certificates c, users u
WHERE c.certificate_number = 'CERT-20260330-A1001'
  AND u.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1
      FROM certificate_download_histories h
      WHERE h.certificate_id = c.certificate_id
        AND h.download_reason = 'A Swagger certificate download'
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
SELECT 'A_SWAGGER_HISTORY_REFRESH', 'A Swagger History Refresh', 'A ?熬곣뫗???롪틵?嶺뚯빘鍮????戮?뎽 ?猷고????덈펲.', 'true', 40, 'ENABLED', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY
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
SELECT 'A_SWAGGER_PROOF_LOCK', 'A Swagger Proof Lock', 'A ?熬곣뫗???롪틵?嶺뚯빘鍮?????????猷고????덈펲.', 'false', 30, 'DISABLED', NOW() - INTERVAL '2' DAY, NOW() - INTERVAL '2' DAY
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

