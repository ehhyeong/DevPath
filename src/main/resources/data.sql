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
    'Spring Boot?? ????????썹땟戮녹???????????⑥쥓???汝뷴젆?????關???꾨き??熬곥룊??????????????ル늉??????汝뷴젆??녷뉩??읂?????ル늉??筌?類?域뱀옓堉??????戮?Ĳ??',
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
    '?????밸븶????????棺堉?뤃????? ????⑤슢堉?繹먮냱踰 ?饔낅챷維??????쑩??????????????꿔꺂??????',
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
SELECT 'DEBUGGING', 'Debugging question',
       'Use this template when you need help identifying the root cause of an error or failure.',
       'Explain the error message, when it happens, and what you already checked before asking.',
       1, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'DEBUGGING'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'IMPLEMENTATION', 'Implementation question',
       'Use this template when you are building a feature and need guidance on structure or approach.',
       'Describe the feature you are trying to build, the current design, and the exact part that blocks you.',
       2, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'IMPLEMENTATION'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'CODE_REVIEW', 'Code review question',
       'Use this template when you want feedback on code quality, readability, or tradeoffs.',
       'Share the relevant code, the expected behavior, and what kind of feedback you want most.',
       3, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'CODE_REVIEW'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'CAREER', 'Career question',
       'Use this template when you need advice on learning path, portfolio direction, or role preparation.',
       'Explain your current level, target role, and the decision you are trying to make next.',
       4, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'CAREER'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'STUDY', 'Study question',
       'Use this template when you want help planning what to study next or how to review effectively.',
       'Describe the topic, what you already understand, and what kind of study plan you want.',
       5, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'STUDY'
);

INSERT INTO qna_question_templates
    (template_type, name, description, guide_example, sort_order, is_active, created_at, updated_at)
SELECT 'PROJECT', 'Project question',
       'Use this template when you need help scoping, structuring, or improving a project idea or build.',
       'Explain the project goal, current progress, and the specific decision or risk you want reviewed.',
       6, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_question_templates
    WHERE template_type = 'PROJECT'
);

-- ===========================

-- ========================================
-- B SECTION START
-- ========================================

-- [B-01] review / review_reply / review_report / review_template
INSERT INTO review (
    course_id, learner_id, rating, content, status, is_hidden, is_deleted, issue_tags_raw, created_at, updated_at
)
SELECT c.course_id, u.user_id, 5,
       'Examples were practical and the explanation flow was very clear.',
       'ANSWERED', FALSE, FALSE, 'clear-examples,good-pacing',
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
       'The topic itself is useful, but I needed slower pacing around entity mapping and fetch strategy.',
       'UNANSWERED', FALSE, FALSE, 'too-fast,needs-more-diagrams',
       '2026-02-12 14:00:00', '2026-02-12 14:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM review r
      WHERE r.course_id = c.course_id AND r.learner_id = u.user_id
  );

INSERT INTO review_reply (
    review_id, instructor_id, content, is_deleted, created_at, updated_at
)
SELECT r.id, iu.user_id,
       'Thanks for the feedback. I will add more mapping diagrams and a slower walkthrough in the next update.',
       FALSE, '2026-02-10 12:00:00', '2026-02-10 12:00:00'
FROM review r, users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND r.course_id = c.course_id
  AND NOT EXISTS (
      SELECT 1 FROM review_reply rr WHERE rr.review_id = r.id AND rr.is_deleted = FALSE
  );

INSERT INTO review_report (
    review_id, reporter_id, reason, is_resolved, resolved_by, resolved_at, created_at, updated_at
)
SELECT r.id, au.user_id,
       'Contains vague wording and should be reviewed before public exposure.',
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
SELECT iu.user_id, 'Thanks and follow-up',
       'Thanks for leaving a detailed review. I will reflect your feedback in the next revision.',
       FALSE, '2026-02-01 00:00:00', '2026-02-01 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM review_template rt
      WHERE rt.instructor_id = iu.user_id AND rt.title = 'Thanks and follow-up'
  );

INSERT INTO review_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, 'Issue acknowledged',
       'I reproduced the issue and added it to the revision queue. I will update the course notes as well.',
       FALSE, '2026-02-02 00:00:00', '2026-02-02 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM review_template rt
      WHERE rt.instructor_id = iu.user_id AND rt.title = 'Issue acknowledged'
  );

-- [B-02] qna_questions / qna_answers / qna_answer_draft / qna_template
INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'DEBUGGING', 'EASY',
       'BeanCreationException during startup',
       'Spring Boot startup fails with BeanCreationException. Which bean should I inspect first and how do I narrow the cause?',
       NULL, c.course_id, NULL, 'ANSWERED', 3, FALSE, '2026-02-05 00:00:00', '2026-02-06 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = 'BeanCreationException during startup'
  );

INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content, adopted_answer_id,
    course_id, lecture_timestamp, qna_status, view_count, is_deleted, created_at, updated_at
)
SELECT u.user_id, 'IMPLEMENTATION', 'MEDIUM',
       'How to avoid JPA infinite recursion',
       'My entity graph loops when I serialize it to JSON. What is the safest way to stop recursive references?',
       NULL, c.course_id, '00:12:44', 'UNANSWERED', 5, FALSE, '2026-02-08 00:00:00', '2026-02-09 00:00:00'
FROM users u, courses c
WHERE u.email = 'learner@devpath.com'
  AND c.title = 'JPA Practical Design'
  AND NOT EXISTS (
      SELECT 1 FROM qna_questions q WHERE q.title = 'How to avoid JPA infinite recursion'
  );

INSERT INTO qna_answers (
    question_id, user_id, content, is_adopted, is_deleted, created_at, updated_at
)
SELECT q.question_id, iu.user_id,
       'Start from the root cause in the stack trace, then check configuration classes, component scanning, and constructor dependencies.',
       FALSE, FALSE, '2026-02-06 09:00:00', '2026-02-06 09:00:00'
FROM qna_questions q, users iu
WHERE q.title = 'BeanCreationException during startup'
  AND iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_answers a WHERE a.question_id = q.question_id AND a.is_deleted = FALSE
  );

INSERT INTO qna_answer_draft (
    question_id, instructor_id, draft_content, is_deleted, saved_at, updated_at
)
SELECT q.question_id, iu.user_id,
       'Prefer response DTOs for API output, and use reference annotations only when you must serialize the entity graph directly.',
       FALSE, '2026-02-09 00:00:00', '2026-02-09 00:00:00'
FROM qna_questions q, users iu
WHERE q.title = 'How to avoid JPA infinite recursion'
  AND iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_answer_draft d
      WHERE d.question_id = q.question_id AND d.instructor_id = iu.user_id AND d.is_deleted = FALSE
  );

INSERT INTO qna_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, 'Debugging startup errors',
       'Check stack trace order, configuration classes, environment variables, and recent dependency changes first.',
       FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_template qt
      WHERE qt.instructor_id = iu.user_id AND qt.title = 'Debugging startup errors'
  );

INSERT INTO qna_template (
    instructor_id, title, content, is_deleted, created_at, updated_at
)
SELECT iu.user_id, 'N+1 review checklist',
       'Compare repository query count, fetch strategy, and entity graph usage before changing domain structure.',
       FALSE, '2026-01-10 00:00:00', '2026-01-10 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM qna_template qt
      WHERE qt.instructor_id = iu.user_id AND qt.title = 'N+1 review checklist'
  );

-- [B-03] instructor_post / instructor_comment / likes
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

-- [B-04] coupon / promotion / conversion_stat
INSERT INTO coupon (
    instructor_id, coupon_code, discount_type, discount_value, target_course_id,
    max_usage_count, usage_count, expires_at, is_deleted, created_at
)
SELECT iu.user_id, 'BSPRING10', 'RATE', 10, c.course_id,
       100, 0, '2026-12-31 23:59:59', FALSE, '2026-02-15 00:00:00'
FROM users iu, courses c
WHERE iu.email = 'instructor@devpath.com'
  AND c.title = 'Spring Boot Intro'
  AND NOT EXISTS (
      SELECT 1 FROM coupon cp WHERE cp.coupon_code = 'BSPRING10'
  );

INSERT INTO promotion (
    instructor_id, course_id, promotion_type, discount_rate, start_at, end_at,
    is_active, is_deleted, created_at
)
SELECT iu.user_id, c.course_id, 'TIME_SALE', 15,
       '2026-02-20 00:00:00', '2026-02-28 23:59:59',
       TRUE, FALSE, '2026-02-20 00:00:00'
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

-- [B-05] refund_request / refund_review / settlement / settlement_hold
INSERT INTO settlement (
    instructor_id, amount, status, is_deleted, settled_at, created_at
)
SELECT iu.user_id, 250000, 'PENDING', FALSE, NULL, '2026-02-25 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id AND s.amount = 250000 AND s.status = 'PENDING'
  );

INSERT INTO settlement (
    instructor_id, amount, status, is_deleted, settled_at, created_at
)
SELECT iu.user_id, 50000, 'HELD', FALSE, NULL, '2026-02-24 00:00:00'
FROM users iu
WHERE iu.email = 'instructor@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM settlement s
      WHERE s.instructor_id = iu.user_id AND s.amount = 50000 AND s.status = 'HELD'
  );

INSERT INTO settlement_hold (
    settlement_id, admin_id, reason, held_at
)
SELECT s.id, au.user_id, 'Refund dispute review in progress', '2026-02-24 10:00:00'
FROM settlement s, users au
WHERE s.status = 'HELD'
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

-- [B-06] restricted / deactivated / withdrawn accounts
INSERT INTO users (
    email, password, name, role_name, is_active, account_status, created_at, updated_at
)
SELECT 'restricted-user@devpath.com',
       '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
       'Restricted Learner', 'ROLE_LEARNER', FALSE, 'RESTRICTED',
       '2026-02-01 00:00:00', '2026-02-15 00:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'restricted-user@devpath.com'
);

INSERT INTO users (
    email, password, name, role_name, is_active, account_status, created_at, updated_at
)
SELECT 'deactivated-user@devpath.com',
       '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
       'Deactivated Learner', 'ROLE_LEARNER', FALSE, 'DEACTIVATED',
       '2026-02-01 00:00:00', '2026-02-16 00:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'deactivated-user@devpath.com'
);

INSERT INTO users (
    email, password, name, role_name, is_active, account_status, created_at, updated_at
)
SELECT 'withdrawn-user@devpath.com',
       '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
       'Withdrawn Learner', 'ROLE_LEARNER', FALSE, 'WITHDRAWN',
       '2026-02-01 00:00:00', '2026-02-17 00:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'withdrawn-user@devpath.com'
);

-- [B-07] notice / admin_role / admin_permission / account_log
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

-- [B-08] instructor_notification / dm_room / dm_message
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
    'Learner Park',
    'ROLE_LEARNER',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'learner2@devpath.com'
);

INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'learner3@devpath.com',
    '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
    'Learner Lee',
    'ROLE_LEARNER',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'learner3@devpath.com'
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
INSERT INTO project (name, description, status, is_deleted, created_at)
SELECT
    'DevPath Team Workspace',
    'DevPath 팀 협업 워크스페이스용 프로젝트. 역할 배정, 멘토링, Proof 제출 테스트용 데이터',
    'IN_PROGRESS',
    FALSE,
    '2026-03-23 14:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM project
    WHERE name = 'DevPath Team Workspace'
      AND is_deleted = FALSE
);

INSERT INTO project (name, description, status, is_deleted, created_at)
SELECT
    'Portfolio Builder Squad',
    '포트폴리오 제작 중심의 준비중 프로젝트. 초대 거절/멘토링 승인 시나리오 테스트용 데이터',
    'PREPARING',
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
    question,
    answer,
    options,
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
    'Which statement best describes dependency injection in Spring?',
    'Spring manages object wiring for application components.',
    'Constructor injection,Field injection,Manual new object creation,Random bean discovery',
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
    'CERT-20260328-0001',
    'PDF_READY',
    TIMESTAMP '2026-03-28 23:20:00',
    'proof-card-1.pdf',
    TIMESTAMP '2026-03-28 23:20:00',
    TIMESTAMP '2026-03-29 09:10:00',
    TIMESTAMP '2026-03-28 23:20:00',
    TIMESTAMP '2026-03-29 09:10:00'
FROM proof_cards pc
JOIN users u ON u.user_id = pc.user_id
WHERE u.email = 'learner@devpath.com'
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
SELECT 'A_CASE_TAG_JAVA', 'BACKEND', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'A_CASE_TAG_JAVA'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'A_CASE_TAG_SPRING', 'BACKEND', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'A_CASE_TAG_SPRING'
);

INSERT INTO tags (name, category, is_official, is_deleted)
SELECT 'A_CASE_TAG_DB', 'BACKEND', TRUE, FALSE
WHERE NOT EXISTS (
    SELECT 1
    FROM tags
    WHERE name = 'A_CASE_TAG_DB'
);

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
    question,
    answer,
    options,
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
    'What must be true for the A-case node to clear?',
    'Lessons, tags, quiz, and assignment must all pass.',
    'Only lessons,Lessons and tags,Lessons tags quiz and assignment,Only quiz and assignment',
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

INSERT INTO quizzes (
    question,
    answer,
    options,
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
    'Why should the B-case node remain uncleared?',
    'A required tag is still missing.',
    'No lessons were completed,A required tag is missing,The assignment is absent,The node has no course',
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

INSERT INTO quizzes (
    question,
    answer,
    options,
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
    'Why should the C-case node remain uncleared?',
    'The quiz was failed even though the tags and assignment passed.',
    'A tag is missing,The lesson is incomplete,The quiz failed,No assignment exists',
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

INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
SELECT
    'learner4@devpath.com',
    '$2a$10$RcdWJBwl.kuttYmqm/BN..6aZKeLNlq9DiNFHbZgZxfTzzNDD33o2',
    'Learner Choi',
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
