DELETE FROM mentorings mentoring
USING mentoring_posts post, users learner
WHERE mentoring.mentoring_post_id = post.mentoring_post_id
  AND mentoring.mentee_id = learner.user_id
  AND learner.email = 'learner@devpath.com'
  AND post.title NOT IN ('대용량 트래픽 커머스 서버', 'Next.js 블로그 플랫폼 구축');

DELETE FROM mentoring_applications application
USING mentoring_posts post, users learner
WHERE application.mentoring_post_id = post.mentoring_post_id
  AND application.applicant_id = learner.user_id
  AND learner.email = 'learner@devpath.com'
  AND post.title NOT IN ('대용량 트래픽 커머스 서버', 'Next.js 블로그 플랫폼 구축');

DELETE FROM mentorings mentoring
USING mentoring_posts post, users instructor
WHERE mentoring.mentoring_post_id = post.mentoring_post_id
  AND post.mentor_id = instructor.user_id
  AND instructor.email = 'instructor@devpath.com'
  AND post.title = '스쿼드 런칭 팀 프로젝트 멘토링';

DELETE FROM mentoring_applications application
USING mentoring_posts post, users instructor
WHERE application.mentoring_post_id = post.mentoring_post_id
  AND post.mentor_id = instructor.user_id
  AND instructor.email = 'instructor@devpath.com'
  AND post.title = '스쿼드 런칭 팀 프로젝트 멘토링';

DELETE FROM mentoring_posts
USING users instructor
WHERE mentoring_posts.mentor_id = instructor.user_id
  AND instructor.email = 'instructor@devpath.com'
  AND mentoring_posts.title = '스쿼드 런칭 팀 프로젝트 멘토링';
