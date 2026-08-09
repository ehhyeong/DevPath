UPDATE workspace workspace
   SET owner_id = mentor.user_id,
       updated_at = now()
  FROM users mentor
 WHERE mentor.email = 'mentor.backend@devpath.com'
   AND workspace.name = '대용량 트래픽 커머스 서버'
   AND workspace.type = 'MENTORING'
   AND COALESCE(workspace.is_deleted, FALSE) = FALSE
   AND workspace.owner_id IS DISTINCT FROM mentor.user_id;

UPDATE workspace workspace
   SET owner_id = mentor.user_id,
       updated_at = now()
  FROM users mentor
 WHERE mentor.email = 'mentor.frontend@devpath.com'
   AND workspace.name = 'Next.js 블로그 플랫폼 구축'
   AND workspace.type = 'MENTORING'
   AND COALESCE(workspace.is_deleted, FALSE) = FALSE
   AND workspace.owner_id IS DISTINCT FROM mentor.user_id;
