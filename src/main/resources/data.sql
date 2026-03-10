INSERT INTO roles (role_name, description)
VALUES ('ROLE_LEARNER', 'General learner')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO roles (role_name, description)
VALUES ('ROLE_INSTRUCTOR', 'Can register roadmaps')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO roles (role_name, description)
VALUES ('ROLE_ADMIN', 'System administrator')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO users (email, password, name, is_active, created_at, updated_at)
VALUES ('test@devpath.com', '1234', 'Test User', TRUE, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, name, is_active, created_at, updated_at)
VALUES (
    'admin@devpath.com',
    '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HCGKKG.u.A3L.T.M/Tq1m',
    'Admin User',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

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

INSERT INTO roadmaps (creator_id, title, description, is_official, is_public, is_deleted, created_at)
SELECT
    u.user_id,
    'Backend Master Roadmap',
    'Official DevPath roadmap covering Java, Spring Boot, JPA, and security.',
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
      WHERE title = 'Java Basics'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'Spring Boot Basics',
    'Understand DI, IoC, and the core annotations used in Spring Boot.',
    'CONCEPT',
    2
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE title = 'Spring Boot Basics'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'Spring Data JPA',
    'Learn ORM, entity mapping, and repository-based persistence.',
    'CONCEPT',
    3
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE title = 'Spring Data JPA'
  );

INSERT INTO roadmap_nodes (roadmap_id, title, content, node_type, sort_order)
SELECT
    r.roadmap_id,
    'Security and JWT',
    'Build authentication and authorization flows with Spring Security and JWT.',
    'CONCEPT',
    4
FROM roadmaps r
WHERE r.title = 'Backend Master Roadmap'
  AND NOT EXISTS (
      SELECT 1
      FROM roadmap_nodes
      WHERE title = 'Security and JWT'
  );

INSERT INTO prerequisites (node_id, pre_node_id)
SELECT n2.node_id, n1.node_id
FROM roadmap_nodes n1, roadmap_nodes n2
WHERE n1.title = 'Java Basics'
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

INSERT INTO user_tech_stacks (user_id, tag_id)
SELECT u.user_id, t.tag_id
FROM users u, tags t
WHERE u.email = 'test@devpath.com'
  AND t.name = 'Java'
  AND NOT EXISTS (
      SELECT 1
      FROM user_tech_stacks uts
      WHERE uts.user_id = u.user_id
        AND uts.tag_id = t.tag_id
  );
