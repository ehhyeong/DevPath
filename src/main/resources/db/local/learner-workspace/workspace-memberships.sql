INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
SELECT workspace.id, learner.user_id, CURRENT_DATE - 4 + TIME '15:00'
FROM users learner
JOIN workspace workspace
  ON workspace.owner_id = learner.user_id
 AND workspace.name = '배달비 절약 플랫폼'
WHERE learner.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM workspace_member member
      WHERE member.workspace_id = workspace.id
        AND member.learner_id = learner.user_id
  );

INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
SELECT workspace.id, learner.user_id, CURRENT_DATE - 2 + TIME '09:00'
FROM users learner
JOIN workspace workspace
  ON workspace.name = '대용량 트래픽 커머스 서버'
 AND workspace.type = 'MENTORING'
 AND COALESCE(workspace.is_deleted, FALSE) = FALSE
WHERE learner.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM workspace_member member
      WHERE member.workspace_id = workspace.id
        AND member.learner_id = learner.user_id
  );

INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
SELECT workspace.id, learner.user_id, CURRENT_DATE - 1 + TIME '09:00'
FROM users learner
JOIN workspace workspace
  ON workspace.name = 'Next.js 블로그 플랫폼 구축'
 AND workspace.type = 'MENTORING'
 AND COALESCE(workspace.is_deleted, FALSE) = FALSE
WHERE learner.email = 'learner@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM workspace_member member
      WHERE member.workspace_id = workspace.id
        AND member.learner_id = learner.user_id
  );

INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
SELECT workspace.id, mentor.user_id, CURRENT_DATE - 2 + TIME '09:00'
FROM users mentor
JOIN workspace workspace
  ON workspace.owner_id = mentor.user_id
 AND workspace.name = '대용량 트래픽 커머스 서버'
 AND workspace.type = 'MENTORING'
 AND COALESCE(workspace.is_deleted, FALSE) = FALSE
WHERE mentor.email = 'mentor.backend@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM workspace_member member
      WHERE member.workspace_id = workspace.id
        AND member.learner_id = mentor.user_id
  );

INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
SELECT workspace.id, mentor.user_id, CURRENT_DATE - 1 + TIME '09:00'
FROM users mentor
JOIN workspace workspace
  ON workspace.owner_id = mentor.user_id
 AND workspace.name = 'Next.js 블로그 플랫폼 구축'
 AND workspace.type = 'MENTORING'
 AND COALESCE(workspace.is_deleted, FALSE) = FALSE
WHERE mentor.email = 'mentor.frontend@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM workspace_member member
      WHERE member.workspace_id = workspace.id
        AND member.learner_id = mentor.user_id
  );

UPDATE workspace_member member
   SET position_label = 'Frontend 개발자'
  FROM workspace workspace, users learner
 WHERE member.workspace_id = workspace.id
   AND member.learner_id = learner.user_id
   AND workspace.name = 'Next.js 블로그 플랫폼 구축'
   AND workspace.type = 'MENTORING'
   AND learner.email = 'learner@devpath.com'
   AND member.position_label IS DISTINCT FROM 'Frontend 개발자';
