INSERT INTO mentoring_posts (
    mentor_id, title, content, required_stacks, category, mentoring_type,
    duration_weeks, curriculum, deadline_at, current_participants,
    max_participants, view_count, status, is_deleted, created_at, updated_at
)
SELECT mentor.user_id,
       '대용량 트래픽 커머스 서버',
       '실제 운영 환경과 유사한 트래픽 시나리오를 경험합니다. 선착순 쿠폰 발급, 재고 동시성 이슈 등을 해결해보는 백엔드 심화 과정입니다. 각자 동일한 과제를 수행하며 개별 피드백을 받습니다.',
       'Spring Boot,Redis,Kafka',
       'Backend',
       'study',
       4,
       E'요구사항 분석 및 ERD 설계, 아키텍처 리뷰\\n회원/상품 기능 구현 및 단위 테스트 작성\\n대용량 트래픽 처리를 위한 Redis/Kafka 도입\\n부하 테스트 및 성능 최적화, 최종 발표',
       CURRENT_DATE + 14,
       5,
       10,
       0,
       'OPEN',
       FALSE,
       CURRENT_DATE - 2 + TIME '10:00',
       CURRENT_DATE - 2 + TIME '10:00'
FROM users mentor
WHERE mentor.email = 'mentor.backend@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM mentoring_posts post
      WHERE post.title = '대용량 트래픽 커머스 서버'
        AND post.is_deleted = FALSE
  );

INSERT INTO mentoring_posts (
    mentor_id, title, content, required_stacks, category, mentoring_type,
    duration_weeks, curriculum, deadline_at, current_participants,
    max_participants, view_count, status, is_deleted, created_at, updated_at
)
SELECT mentor.user_id,
       'Next.js 블로그 플랫폼 구축',
       '하나의 블로그 플랫폼을 팀원들과 역할을 나누어 기획부터 배포까지 완성합니다. SEO 최적화, 마크다운 파싱, 다크모드 등 모던 프론트엔드의 실무 스킬을 멘토와 함께 적용해봅니다.',
       'React,Next.js 14,Tailwind',
       'Frontend',
       'team',
       4,
       E'기획 리뷰 및 Next.js 14 App Router 뼈대 세팅\\n각 파트별 기능 구현\\n디자인 시스템 적용 및 다크모드 통합\\nVercel 배포 및 성능 튜닝, 팀 회고',
       CURRENT_DATE + 2,
       3,
       4,
       0,
       'OPEN',
       FALSE,
       CURRENT_DATE - 1 + TIME '10:00',
       CURRENT_DATE - 1 + TIME '10:00'
FROM users mentor
WHERE mentor.email = 'mentor.frontend@devpath.com'
  AND NOT EXISTS (
      SELECT 1 FROM mentoring_posts post
      WHERE post.title = 'Next.js 블로그 플랫폼 구축'
        AND post.is_deleted = FALSE
  );

UPDATE mentoring_posts post
   SET mentor_id = mentor.user_id,
       updated_at = now()
  FROM users mentor
 WHERE mentor.email = 'mentor.backend@devpath.com'
   AND post.title = '대용량 트래픽 커머스 서버'
   AND post.is_deleted = FALSE
   AND post.mentor_id IS DISTINCT FROM mentor.user_id;

UPDATE mentoring_posts post
   SET mentor_id = mentor.user_id,
       updated_at = now()
  FROM users mentor
 WHERE mentor.email = 'mentor.frontend@devpath.com'
   AND post.title = 'Next.js 블로그 플랫폼 구축'
   AND post.is_deleted = FALSE
   AND post.mentor_id IS DISTINCT FROM mentor.user_id;

INSERT INTO mentoring_applications (
    mentoring_post_id, applicant_id, message, desired_position, status, reject_reason,
    processed_at, is_deleted, created_at, updated_at
)
SELECT post.mentoring_post_id,
       learner.user_id,
       '공통 과제형 멘토링으로 대용량 트래픽 과제를 수행하며 피드백을 받고 싶습니다.',
       NULL,
       'APPROVED',
       NULL,
       CURRENT_DATE - 2 + TIME '10:20',
       FALSE,
       CURRENT_DATE - 2 + TIME '10:15',
       CURRENT_DATE - 2 + TIME '10:20'
FROM mentoring_posts post
JOIN users learner ON learner.email = 'learner@devpath.com'
WHERE post.title = '대용량 트래픽 커머스 서버'
  AND NOT EXISTS (
      SELECT 1 FROM mentoring_applications application
      WHERE application.mentoring_post_id = post.mentoring_post_id
        AND application.applicant_id = learner.user_id
  );

INSERT INTO mentoring_applications (
    mentoring_post_id, applicant_id, message, desired_position, status, reject_reason,
    processed_at, is_deleted, created_at, updated_at
)
SELECT post.mentoring_post_id,
       learner.user_id,
       '팀 프로젝트형 멘토링으로 Next.js 블로그 플랫폼을 역할 분담해서 완성하고 싶습니다.',
       'Frontend 개발자',
       'APPROVED',
       NULL,
       CURRENT_DATE - 1 + TIME '10:20',
       FALSE,
       CURRENT_DATE - 1 + TIME '10:15',
       CURRENT_DATE - 1 + TIME '10:20'
FROM mentoring_posts post
JOIN users learner ON learner.email = 'learner@devpath.com'
WHERE post.title = 'Next.js 블로그 플랫폼 구축'
  AND NOT EXISTS (
      SELECT 1 FROM mentoring_applications application
      WHERE application.mentoring_post_id = post.mentoring_post_id
        AND application.applicant_id = learner.user_id
  );

UPDATE mentoring_applications application
   SET desired_position = 'Frontend 개발자',
       updated_at = now()
  FROM mentoring_posts post, users learner
 WHERE application.mentoring_post_id = post.mentoring_post_id
   AND application.applicant_id = learner.user_id
   AND post.title = 'Next.js 블로그 플랫폼 구축'
   AND learner.email = 'learner@devpath.com'
   AND application.desired_position IS DISTINCT FROM 'Frontend 개발자';

INSERT INTO mentorings (
    mentoring_post_id, mentor_id, mentee_id, status, started_at,
    ended_at, is_deleted, created_at, updated_at
)
SELECT post.mentoring_post_id,
       post.mentor_id,
       learner.user_id,
       'ONGOING',
       CURRENT_DATE - 2 + TIME '11:00',
       NULL,
       FALSE,
       CURRENT_DATE - 2 + TIME '11:00',
       CURRENT_DATE - 2 + TIME '11:00'
FROM mentoring_posts post
JOIN users learner ON learner.email = 'learner@devpath.com'
WHERE post.title = '대용량 트래픽 커머스 서버'
  AND NOT EXISTS (
      SELECT 1 FROM mentorings mentoring
      WHERE mentoring.mentoring_post_id = post.mentoring_post_id
        AND mentoring.mentee_id = learner.user_id
  );

INSERT INTO mentorings (
    mentoring_post_id, mentor_id, mentee_id, status, started_at,
    ended_at, is_deleted, created_at, updated_at
)
SELECT post.mentoring_post_id,
       post.mentor_id,
       learner.user_id,
       'ONGOING',
       CURRENT_DATE - 1 + TIME '11:00',
       NULL,
       FALSE,
       CURRENT_DATE - 1 + TIME '11:00',
       CURRENT_DATE - 1 + TIME '11:00'
FROM mentoring_posts post
JOIN users learner ON learner.email = 'learner@devpath.com'
WHERE post.title = 'Next.js 블로그 플랫폼 구축'
  AND NOT EXISTS (
      SELECT 1 FROM mentorings mentoring
      WHERE mentoring.mentoring_post_id = post.mentoring_post_id
        AND mentoring.mentee_id = learner.user_id
  );

UPDATE mentorings mentoring
   SET mentor_id = post.mentor_id,
       updated_at = now()
  FROM mentoring_posts post
 WHERE mentoring.mentoring_post_id = post.mentoring_post_id
   AND post.title IN ('대용량 트래픽 커머스 서버', 'Next.js 블로그 플랫폼 구축')
   AND mentoring.is_deleted = FALSE
   AND mentoring.mentor_id IS DISTINCT FROM post.mentor_id;
