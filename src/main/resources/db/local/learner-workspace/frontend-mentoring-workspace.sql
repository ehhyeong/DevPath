WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
participants(email, position_label, joined_day_offset, active_at) AS (
    VALUES
        ('learner@devpath.com', 'Frontend 개발자', -7, now() - INTERVAL '35 seconds'),
        ('team.frontend.ui@devpath.com', 'Frontend 개발자', -7, now() - INTERVAL '48 seconds'),
        ('team.frontend.api@devpath.com', 'Backend API', -7, now() - INTERVAL '3 hours'),
        ('team.frontend.design@devpath.com', 'UI/UX Designer', -7, now() - INTERVAL '1 day')
)
INSERT INTO workspace_member (
    workspace_id, learner_id, joined_at, last_active_at, position_label
)
SELECT frontend_workspace.id,
       learner.user_id,
       CURRENT_DATE + participants.joined_day_offset + TIME '10:00',
       participants.active_at,
       participants.position_label
FROM frontend_workspace
JOIN participants ON TRUE
JOIN users learner ON learner.email = participants.email
WHERE NOT EXISTS (
    SELECT 1
    FROM workspace_member member
    WHERE member.workspace_id = frontend_workspace.id
      AND member.learner_id = learner.user_id
);

WITH frontend_workspace AS (
    SELECT workspace.id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
participants(email, position_label, active_at) AS (
    VALUES
        ('learner@devpath.com', 'Frontend 개발자', now() - INTERVAL '35 seconds'),
        ('team.frontend.ui@devpath.com', 'Frontend 개발자', now() - INTERVAL '48 seconds'),
        ('team.frontend.api@devpath.com', 'Backend API', now() - INTERVAL '3 hours'),
        ('team.frontend.design@devpath.com', 'UI/UX Designer', now() - INTERVAL '1 day')
)
UPDATE workspace_member member
   SET position_label = participants.position_label,
       last_active_at = participants.active_at
  FROM frontend_workspace, participants, users learner
 WHERE member.workspace_id = frontend_workspace.id
   AND member.learner_id = learner.user_id
   AND learner.email = participants.email
   AND (
       member.position_label IS DISTINCT FROM participants.position_label
       OR member.last_active_at IS DISTINCT FROM participants.active_at
   );

WITH frontend_post AS (
    SELECT post.mentoring_post_id, post.mentor_id
    FROM mentoring_posts post
    JOIN users mentor ON mentor.user_id = post.mentor_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND post.title = 'Next.js 블로그 플랫폼 구축'
      AND post.is_deleted = FALSE
    ORDER BY post.created_at
    LIMIT 1
),
participants(email, desired_position, message) AS (
    VALUES
        ('team.frontend.ui@devpath.com', 'Frontend 개발자', 'App Router 기반 화면 구현과 성능 최적화를 팀 프로젝트로 경험하고 싶습니다.'),
        ('team.frontend.api@devpath.com', 'Backend API', '콘텐츠 저장 API와 프론트 연동 지점을 함께 설계해보고 싶습니다.'),
        ('team.frontend.design@devpath.com', 'UI/UX Designer', '디자인 시스템과 접근성 QA까지 포함해 블로그 플랫폼을 완성하고 싶습니다.')
)
INSERT INTO mentoring_applications (
    mentoring_post_id, applicant_id, message, desired_position, status, reject_reason,
    processed_at, is_deleted, created_at, updated_at
)
SELECT frontend_post.mentoring_post_id,
       learner.user_id,
       participants.message,
       participants.desired_position,
       'APPROVED',
       NULL,
       CURRENT_DATE - 7 + TIME '11:30',
       FALSE,
       CURRENT_DATE - 7 + TIME '11:10',
       CURRENT_DATE - 7 + TIME '11:30'
FROM frontend_post
JOIN participants ON TRUE
JOIN users learner ON learner.email = participants.email
WHERE NOT EXISTS (
    SELECT 1
    FROM mentoring_applications application
    WHERE application.mentoring_post_id = frontend_post.mentoring_post_id
      AND application.applicant_id = learner.user_id
);

WITH frontend_post AS (
    SELECT post.mentoring_post_id, post.mentor_id
    FROM mentoring_posts post
    JOIN users mentor ON mentor.user_id = post.mentor_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND post.title = 'Next.js 블로그 플랫폼 구축'
      AND post.is_deleted = FALSE
    ORDER BY post.created_at
    LIMIT 1
),
participants(email) AS (
    VALUES
        ('team.frontend.ui@devpath.com'),
        ('team.frontend.api@devpath.com'),
        ('team.frontend.design@devpath.com')
)
INSERT INTO mentorings (
    mentoring_post_id, mentor_id, mentee_id, status, started_at,
    ended_at, is_deleted, created_at, updated_at
)
SELECT frontend_post.mentoring_post_id,
       frontend_post.mentor_id,
       learner.user_id,
       'ONGOING',
       CURRENT_DATE - 7 + TIME '13:00',
       NULL,
       FALSE,
       CURRENT_DATE - 7 + TIME '13:00',
       CURRENT_DATE - 7 + TIME '13:00'
FROM frontend_post
JOIN participants ON TRUE
JOIN users learner ON learner.email = participants.email
WHERE NOT EXISTS (
    SELECT 1
    FROM mentorings mentoring
    WHERE mentoring.mentoring_post_id = frontend_post.mentoring_post_id
      AND mentoring.mentee_id = learner.user_id
);

UPDATE mentoring_posts post
   SET current_participants = GREATEST(COALESCE(post.current_participants, 0), 4),
       max_participants = GREATEST(COALESCE(post.max_participants, 0), 4),
       updated_at = now()
  FROM users mentor
 WHERE post.mentor_id = mentor.user_id
   AND mentor.email = 'mentor.frontend@devpath.com'
   AND post.title = 'Next.js 블로그 플랫폼 구축'
   AND post.is_deleted = FALSE;

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(title, description, start_date, due_date, status, created_at) AS (
    VALUES
        (
          'Week 1: 블로그 플랫폼 기획 및 라우팅 설계',
          '블로그 플랫폼의 핵심 사용자 흐름과 Next.js App Router 구조를 확정합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_TEAM_GUIDELINES---' || chr(10) ||
          'Frontend: 페이지 라우팅, 레이아웃, 로딩/에러 상태 기준을 문서화합니다.' || chr(10) ||
          'Backend: 게시글/태그/댓글 API 초안을 작성하고 mock 응답을 맞춥니다.' || chr(10) ||
          'Designer: 홈, 상세, 에디터 화면의 핵심 컴포넌트와 토큰을 정의합니다.',
          CURRENT_DATE - 21,
          CURRENT_DATE - 15,
          'DONE',
          CURRENT_DATE - 21 + TIME '09:00'
        ),
        (
          'Week 2: 마크다운 에디터와 게시글 CRUD',
          '게시글 작성, 수정, 미리보기, 목록 조회 흐름을 한 번에 연결합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_TEAM_GUIDELINES---' || chr(10) ||
          'Frontend: 마크다운 에디터, 이미지 삽입, 저장 후 리다이렉트 흐름을 구현합니다.' || chr(10) ||
          'Backend: 게시글 CRUD와 태그 필터 API를 안정화합니다.' || chr(10) ||
          'Designer: 에디터 입력 상태, 빈 상태, 오류 상태 시안을 보강합니다.',
          CURRENT_DATE - 14,
          CURRENT_DATE - 8,
          'DONE',
          CURRENT_DATE - 14 + TIME '09:00'
        ),
        (
          'Week 3: SEO, 접근성, 배포 전 품질 점검',
          '검색 노출과 접근성을 개선하고 배포 전 QA 기준을 통과시키는 주차입니다.' || chr(10) || chr(10) ||
          '---DEVPATH_TEAM_GUIDELINES---' || chr(10) ||
          'Frontend: 메타데이터, sitemap, 이미지 최적화, keyboard flow를 점검합니다.' || chr(10) ||
          'Backend: 공개 글 조회 성능과 캐시 정책을 검증합니다.' || chr(10) ||
          'Designer: 모바일 반응형과 명도 대비 이슈를 QA 체크리스트로 정리합니다.',
          CURRENT_DATE - 7,
          CURRENT_DATE + 1,
          'OPEN',
          CURRENT_DATE - 7 + TIME '09:00'
        ),
        (
          'Week 4: Vercel 배포와 최종 데모 리허설',
          '배포 환경변수, 장애 대응 체크리스트, 최종 데모 시나리오를 준비합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_TEAM_GUIDELINES---' || chr(10) ||
          'Frontend: Lighthouse 지표를 기록하고 배포 URL 기준으로 회귀 테스트합니다.' || chr(10) ||
          'Backend: API 오류 응답과 rate limit 정책을 데모 전 점검합니다.' || chr(10) ||
          'Designer: 최종 발표용 화면 캡처와 사용성 개선 리스트를 정리합니다.',
          CURRENT_DATE + 2,
          CURRENT_DATE + 8,
          'OPEN',
          CURRENT_DATE - 1 + TIME '09:00'
        )
)
INSERT INTO milestone (
    workspace_id, title, description, start_date, due_date, status,
    created_by_id, is_deleted, created_at, updated_at
)
SELECT frontend_workspace.id,
       seed.title,
       seed.description,
       seed.start_date,
       seed.due_date,
       seed.status,
       frontend_workspace.owner_id,
       FALSE,
       seed.created_at,
       seed.created_at
FROM frontend_workspace
JOIN seed ON TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM milestone existing
    WHERE existing.workspace_id = frontend_workspace.id
      AND existing.title = seed.title
      AND existing.is_deleted = FALSE
);

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(title, description, status, priority, assignee_email, due_date, created_at) AS (
    VALUES
        (
          '홈 피드 카드 반응형 UI 완성',
          '메인 피드 카드, 태그 필터, skeleton loading을 정리합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: fe',
          'DONE', 'HIGH', 'learner@devpath.com', CURRENT_DATE + 1, now() - INTERVAL '2 hours'
        ),
        (
          '마크다운 에디터 이미지 업로드 UX 보강',
          'drag and drop 업로드, 미리보기 삭제, 저장 실패 토스트를 마무리합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: fe',
          'IN_REVIEW', 'HIGH', 'team.frontend.ui@devpath.com', CURRENT_DATE + 1, now() - INTERVAL '90 minutes'
        ),
        (
          '게시글/태그 API mock 계약 확정',
          '목록 필터와 상세 조회 응답 DTO를 프론트 타입과 맞춥니다.' || chr(10) || chr(10) ||
          '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: be',
          'IN_PROGRESS', 'MEDIUM', 'team.frontend.api@devpath.com', CURRENT_DATE + 2, now() - INTERVAL '4 hours'
        ),
        (
          '디자인 토큰 QA 체크리스트 반영',
          '색상 토큰, spacing, heading scale을 페이지별로 점검합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: design',
          'TODO', 'MEDIUM', 'team.frontend.design@devpath.com', CURRENT_DATE + 2, now() - INTERVAL '1 day'
        ),
        (
          'SEO 메타데이터와 OG 이미지 적용',
          '게시글 상세의 metadata, canonical URL, OG 이미지 fallback을 연결합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: fe',
          'TODO', 'HIGH', 'learner@devpath.com', CURRENT_DATE + 4, now() - INTERVAL '3 hours'
        ),
        (
          '댓글 정책 및 신고 상태 API 정리',
          '댓글 숨김, 신고 접수, 삭제 권한 정책을 API 스펙에 반영합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: be',
          'IN_REVIEW', 'MEDIUM', 'team.frontend.api@devpath.com', CURRENT_DATE + 3, now() - INTERVAL '70 minutes'
        ),
        (
          '모바일 상세 페이지 접근성 점검',
          '키보드 포커스 순서와 aria-label 누락을 QA합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: design',
          'IN_PROGRESS', 'LOW', 'team.frontend.design@devpath.com', CURRENT_DATE + 5, now() - INTERVAL '5 hours'
        ),
        (
          'Week 3 통합 데모 시나리오 정리',
          '멘토 리뷰용 데모 순서와 확인 포인트를 팀 공통 문서로 정리합니다.' || chr(10) || chr(10) ||
          '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: common',
          'TODO', 'MEDIUM', NULL, CURRENT_DATE + 1, now() - INTERVAL '6 hours'
        )
)
INSERT INTO workspace_task (
    workspace_id, title, description, status, priority,
    assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at
)
SELECT frontend_workspace.id,
       seed.title,
       seed.description,
       seed.status,
       seed.priority,
       learner.user_id,
       seed.due_date,
       COALESCE(learner.user_id, frontend_workspace.owner_id),
       FALSE,
       seed.created_at,
       seed.created_at
FROM frontend_workspace
JOIN seed ON TRUE
LEFT JOIN users learner ON learner.email = seed.assignee_email
WHERE (seed.assignee_email IS NULL OR learner.user_id IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1
      FROM workspace_task existing
      WHERE existing.workspace_id = frontend_workspace.id
        AND existing.title = seed.title
        AND existing.assignee_id IS NOT DISTINCT FROM learner.user_id
        AND existing.is_deleted = FALSE
  );

WITH frontend_workspace AS (
    SELECT workspace.id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(title, assignee_email, feedback) AS (
    VALUES
        (
          '홈 피드 카드 반응형 UI 완성',
          'learner@devpath.com',
          'learner|이학습|2일 전|홈 피드 카드 컴포넌트와 태그 필터를 붙였습니다. 데스크톱과 모바일 캡처를 PR에 올려두었습니다.' || chr(10) ||
          'mentor|프론트엔드 장인|1일 전|카드 간격과 skeleton 높이가 안정적입니다. 모바일 360px에서 태그가 두 줄로 밀릴 때 하단 여백만 8px 더 확보해주세요.' || chr(10) ||
          'learner|이학습|오늘 09:30|태그 wrap 케이스 여백을 반영했고 Lighthouse 모바일 점수도 다시 첨부했습니다.' || chr(10) ||
          'mentor|프론트엔드 장인|오늘 10:15|확인했습니다. 이 항목은 Pass 처리하고 다음 SEO 작업으로 넘어가도 됩니다.'
        ),
        (
          '마크다운 에디터 이미지 업로드 UX 보강',
          'team.frontend.ui@devpath.com',
          'learner|김유나|어제 16:20|drag and drop 업로드와 삭제 미리보기까지 구현했습니다. 실패 토스트 문구가 적절한지 확인 부탁드립니다.' || chr(10) ||
          'mentor|프론트엔드 장인|어제 19:10|흐름은 좋습니다. 네트워크 실패와 10MB 초과 파일을 분리해서 안내하고, 업로드 중 버튼 disabled 상태를 캡처로 남겨주세요.' || chr(10) ||
          'learner|김유나|오늘 11:40|파일 용량 초과 케이스와 업로드 중 상태를 추가했습니다. 리뷰 요청 상태로 다시 올렸습니다.' || chr(10) ||
          'mentor|프론트엔드 장인|오늘 12:05|좋습니다. 마지막으로 이미지 alt 입력이 비어 있을 때 저장을 막는지만 확인하면 통과 가능합니다.'
        ),
        (
          '댓글 정책 및 신고 상태 API 정리',
          'team.frontend.api@devpath.com',
          'learner|오지훈|어제 14:05|댓글 숨김과 신고 접수 상태를 mock API에 추가했습니다. 프론트에서 필요한 상태값은 HIDDEN, REPORTED, DELETED 세 가지로 정리했습니다.' || chr(10) ||
          'mentor|프론트엔드 장인|어제 18:30|상태값은 충분합니다. 다만 신고 접수 실패 시 재시도 가능 여부를 response message로 구분할 수 있게 에러 코드를 한 단계만 더 세분화해주세요.' || chr(10) ||
          'learner|오지훈|오늘 10:50|REPORT_DUPLICATED와 REPORT_RATE_LIMITED 에러 코드를 추가하고 API 명세 문서에 예시 응답을 반영했습니다.' || chr(10) ||
          'mentor|프론트엔드 장인|오늘 11:20|명세와 mock 응답이 맞습니다. 프론트 연결 후 QA에서 한 번 더 확인하겠습니다.'
        ),
        (
          '모바일 상세 페이지 접근성 점검',
          'team.frontend.design@devpath.com',
          'learner|문서윤|어제 13:15|모바일 상세 페이지 기준으로 focus order와 aria-label 누락 항목을 체크리스트에 정리했습니다.' || chr(10) ||
          'mentor|프론트엔드 장인|어제 17:45|정리가 좋습니다. 공유 버튼과 댓글 입력 영역은 실제 키보드 이동 순서 기준으로 한 번 더 검증하고, 스크린리더용 label 문구를 제안해주세요.' || chr(10) ||
          'learner|문서윤|오늘 09:10|공유 버튼 label 초안을 추가했습니다. 댓글 입력 영역은 FE 구현 확인 후 다시 코멘트 남기겠습니다.'
        )
)
UPDATE workspace_task task
SET description =
        COALESCE(NULLIF(task.description, ''), task.title)
        || chr(10) || chr(10)
        || '---DEVPATH_MILESTONE_FEEDBACK---' || chr(10)
        || seed.feedback,
    updated_at = GREATEST(COALESCE(task.updated_at, task.created_at, now()), now() - INTERVAL '45 minutes')
FROM frontend_workspace
JOIN seed ON TRUE
JOIN users learner ON learner.email = seed.assignee_email
WHERE task.workspace_id = frontend_workspace.id
  AND task.title = seed.title
  AND task.assignee_id IS NOT DISTINCT FROM learner.user_id
  AND task.is_deleted = FALSE
  AND task.description NOT LIKE '%---DEVPATH_MILESTONE_FEEDBACK---%';

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(title, description, day_offset, start_time, end_time, created_at) AS (
    VALUES
        (
          'Week 3 라이브 코드 리뷰',
          '[TEAM_EVENT:meetup]' || chr(10) || '마크다운 에디터와 게시글 상세 페이지 PR을 함께 리뷰합니다.',
          0, TIME '20:00', TIME '21:30', now() - INTERVAL '2 days'
        ),
        (
          'SEO QA 마감',
          '[TEAM_EVENT:deadline]' || chr(10) || 'sitemap, metadata, OG 이미지, Lighthouse 측정 결과를 제출합니다.',
          1, TIME '18:00', TIME '18:30', now() - INTERVAL '1 day'
        ),
        (
          '디자인 시스템 동기화 회의',
          '[TEAM_EVENT:team]' || chr(10) || '토큰명과 컴포넌트 상태명을 확정하고 프론트 구현과 맞춥니다.',
          2, TIME '14:00', TIME '15:00', now() - INTERVAL '8 hours'
        ),
        (
          '최종 데모 리허설',
          '[TEAM_EVENT:meetup]' || chr(10) || '배포 URL 기준으로 데모 흐름과 발표 순서를 리허설합니다.',
          6, TIME '19:00', TIME '20:00', now() - INTERVAL '3 hours'
        )
)
INSERT INTO calendar_event (
    workspace_id, title, description, start_at, end_at,
    created_by_id, is_deleted, created_at, updated_at
)
SELECT frontend_workspace.id,
       seed.title,
       seed.description,
       (CURRENT_DATE + seed.day_offset + seed.start_time)::timestamp,
       (CURRENT_DATE + seed.day_offset + seed.end_time)::timestamp,
       frontend_workspace.owner_id,
       FALSE,
       seed.created_at,
       seed.created_at
FROM frontend_workspace
JOIN seed ON TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM calendar_event existing
    WHERE existing.workspace_id = frontend_workspace.id
      AND existing.title = seed.title
      AND existing.is_deleted = FALSE
);

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(doc_type, content) AS (
    VALUES
        ('API_SPEC', $json${"externalLink":"https://www.notion.so/devpath-next-blog-api","notes":"Next.js 블로그 플랫폼의 프론트/백엔드 계약 문서입니다. Week 3 기준 게시글, 태그, 댓글, 이미지 업로드 API를 우선 점검합니다.","endpoints":[{"id":"posts-list","method":"GET","url":"/api/blog/posts?tag={tag}&page={page}","description":"공개 게시글 목록과 태그 필터 결과를 반환합니다.","request":"tag=react&page=1","response":"{\"items\":[{\"id\":101,\"title\":\"App Router 패턴\"}],\"page\":1,\"totalPages\":4}","status":"SYNCING","ownerId":null},{"id":"post-save","method":"POST","url":"/api/blog/posts","description":"마크다운 본문과 대표 이미지를 포함한 게시글을 저장합니다.","request":"{\"title\":\"...\",\"markdown\":\"...\",\"tags\":[\"Next.js\"]}","response":"{\"id\":120,\"slug\":\"nextjs-routing\"}","status":"NEEDS_FIX","ownerId":null},{"id":"comment-create","method":"POST","url":"/api/blog/posts/{postId}/comments","description":"게시글 댓글을 등록하고 moderation 상태를 반환합니다.","request":"{\"content\":\"좋은 글입니다.\"}","response":"{\"commentId\":77,\"status\":\"VISIBLE\"}","status":"DESIGNING","ownerId":null}],"feedback":[{"id":"seed-api-feedback","author":"이서준","role":"PM","content":"POST /api/blog/posts 응답에 slug 중복 시 에러 코드와 필드별 validation 메시지를 분리해 주세요.","createdAt":"seed","mine":false}],"logs":[{"id":"seed-api-log","actor":"김유나","role":"FE","message":"게시글 목록 API mock 응답을 프론트 타입과 동기화했습니다.","createdAt":"seed"}]}$json$),
        ('ERD', $json${"externalLink":"https://dbdiagram.io/d/devpath-next-blog","notes":"posts, post_tags, tags, comments, assets 중심의 간단한 블로그 ERD입니다. 댓글 moderation과 이미지 asset 소유 관계를 이번 주 리뷰 대상으로 둡니다.","endpoints":[],"feedback":[{"id":"seed-erd-feedback","author":"문서윤","role":"DES","content":"태그 컬러 토큰과 DB tag slug가 분리되어야 디자인 시스템 변경에 안전합니다.","createdAt":"seed","mine":false}],"logs":[{"id":"seed-erd-log","actor":"오지훈","role":"BE","message":"post_tags 중간 테이블과 assets 테이블 관계를 추가했습니다.","createdAt":"seed"}]}$json$),
        ('INFRA', $json${"externalLink":"https://miro.com/app/board/devpath-next-blog-infra","notes":"Vercel 프론트, API 서버, PostgreSQL, 이미지 스토리지, CDN 캐시 흐름을 정리했습니다. 배포 전 환경변수와 preview branch 정책을 확인해야 합니다.","endpoints":[],"feedback":[{"id":"seed-infra-feedback","author":"이서준","role":"PM","content":"preview 환경과 production 환경의 API base URL 분리 전략을 문서에 명시해 주세요.","createdAt":"seed","mine":false}],"logs":[{"id":"seed-infra-log","actor":"김유나","role":"FE","message":"Vercel preview 배포 체크리스트를 인프라 문서에 연결했습니다.","createdAt":"seed"}]}$json$)
)
INSERT INTO workspace_doc (
    workspace_id, doc_type, content, updated_by_id, created_at, updated_at
)
SELECT frontend_workspace.id,
       seed.doc_type,
       seed.content,
       frontend_workspace.owner_id,
       now() - INTERVAL '2 hours',
       now() - INTERVAL '2 hours'
FROM frontend_workspace
JOIN seed ON TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM workspace_doc existing
    WHERE existing.workspace_id = frontend_workspace.id
      AND existing.doc_type = seed.doc_type
);

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(title, url, uploader_email, created_at) AS (
    VALUES
        ('Week 3 QA 체크리스트', 'https://www.notion.so/devpath-next-blog-week3-qa', 'mentor.frontend@devpath.com', now() - INTERVAL '1 day'),
        ('Figma 디자인 시스템 원본', 'https://www.figma.com/file/devpath-next-blog-design-system', 'team.frontend.design@devpath.com', now() - INTERVAL '20 hours'),
        ('Vercel Preview 배포 URL', 'https://devpath-next-blog-preview.vercel.app', 'team.frontend.ui@devpath.com', now() - INTERVAL '4 hours'),
        ('API mock 서버 Swagger', 'https://mock.devpath.com/next-blog/swagger-ui/index.html', 'team.frontend.api@devpath.com', now() - INTERVAL '3 hours')
)
INSERT INTO workspace_file (
    workspace_id, parent_id, original_file_name, stored_file_name, file_path, file_size,
    content_type, item_type, storage_provider, object_key, uploaded_by_id,
    is_deleted, created_at, updated_at
)
SELECT frontend_workspace.id,
       NULL,
       seed.title,
       '',
       '',
       0,
       'text/uri-list',
       'LINK',
       'LINK',
       seed.url,
       uploader.user_id,
       FALSE,
       seed.created_at,
       seed.created_at
FROM frontend_workspace
JOIN seed ON TRUE
JOIN users uploader ON uploader.email = seed.uploader_email
WHERE NOT EXISTS (
    SELECT 1
    FROM workspace_file existing
    WHERE existing.workspace_id = frontend_workspace.id
      AND existing.original_file_name = seed.title
      AND existing.item_type = 'LINK'
      AND existing.is_deleted = FALSE
);

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(author_email, template_type, difficulty, title, content, qna_status, view_count, created_at) AS (
    VALUES
        (
          'team.frontend.ui@devpath.com',
          'CODE_REVIEW',
          'MEDIUM',
          '마크다운 에디터 이미지 업로드 실패 시 UX를 어떻게 처리할까요?',
          '이미지 업로드 API가 실패하면 현재는 토스트만 노출됩니다. 본문에 남은 임시 마크다운을 자동 제거하는 편이 좋을지 피드백 부탁드립니다.',
          'UNANSWERED',
          8,
          now() - INTERVAL '5 hours'
        ),
        (
          'team.frontend.api@devpath.com',
          'IMPLEMENTATION',
          'HARD',
          '게시글 slug 중복 처리를 프론트에서 선검증해야 할까요?',
          '저장 API에서 409를 반환하도록 설계했는데, 프론트에서도 debounce 기반 중복 확인을 넣을지 고민 중입니다.',
          'ANSWERED',
          14,
          now() - INTERVAL '1 day'
        ),
        (
          'team.frontend.design@devpath.com',
          'PROJECT',
          'MEDIUM',
          '다크모드 토큰을 MVP 범위에 포함해도 될까요?',
          '디자인 시스템에는 다크모드 토큰을 잡아두었지만 구현 범위가 늘어날 것 같습니다. 이번 주차 필수 범위인지 확인 부탁드립니다.',
          'UNANSWERED',
          5,
          now() - INTERVAL '2 hours'
        )
)
INSERT INTO qna_questions (
    user_id, template_type, difficulty, title, content,
    question_scope, workspace_id, qna_status, view_count, is_deleted,
    created_at, updated_at
)
SELECT author.user_id,
       seed.template_type,
       seed.difficulty,
       seed.title,
       seed.content,
       'WORKSPACE',
       frontend_workspace.id,
       seed.qna_status,
       seed.view_count,
       FALSE,
       seed.created_at,
       seed.created_at
FROM frontend_workspace
JOIN seed ON TRUE
JOIN users author ON author.email = seed.author_email
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_questions existing
    WHERE existing.workspace_id = frontend_workspace.id
      AND existing.question_scope = 'WORKSPACE'
      AND existing.title = seed.title
      AND existing.is_deleted = FALSE
);

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
target_question AS (
    SELECT question.question_id
    FROM qna_questions question
    JOIN frontend_workspace ON frontend_workspace.id = question.workspace_id
    WHERE question.question_scope = 'WORKSPACE'
      AND question.title = '게시글 slug 중복 처리를 프론트에서 선검증해야 할까요?'
      AND question.is_deleted = FALSE
    LIMIT 1
)
INSERT INTO qna_answers (
    question_id, user_id, content, is_adopted, is_deleted, created_at, updated_at
)
SELECT target_question.question_id,
       frontend_workspace.owner_id,
       '서버 409 응답은 반드시 유지하고, 프론트 선검증은 작성 경험 개선용으로만 두는 편이 좋습니다. 저장 버튼 직전에는 서버 응답을 기준으로 최종 처리하세요.',
       FALSE,
       FALSE,
       now() - INTERVAL '20 hours',
       now() - INTERVAL '20 hours'
FROM frontend_workspace
JOIN target_question ON TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM qna_answers answer
    WHERE answer.question_id = target_question.question_id
      AND answer.user_id = frontend_workspace.owner_id
      AND answer.is_deleted = FALSE
);

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(title, content, creator_email, created_at) AS (
    VALUES
        (
          'Week 3 라이브 코드 리뷰 회의록',
          '1. 이미지 업로드 실패 시 임시 마크다운 제거 정책은 프론트에서 처리한다.' || chr(10) ||
          '2. slug 중복 확인은 UX 보조 기능으로만 두고 서버 409 응답을 최종 기준으로 삼는다.' || chr(10) ||
          '3. SEO QA는 sitemap, metadata, OG 이미지 순서로 체크한다.',
          'mentor.frontend@devpath.com',
          now() - INTERVAL '18 hours'
        ),
        (
          '디자인 시스템 싱크 노트',
          '색상 토큰은 semantic name으로 정리하고, 카드 radius는 8px 기준을 유지한다. 모바일 상세 페이지의 heading hierarchy를 다시 점검한다.',
          'team.frontend.design@devpath.com',
          now() - INTERVAL '6 hours'
        )
)
INSERT INTO meeting_note (
    workspace_id, title, content, created_by_id, is_deleted, created_at, updated_at
)
SELECT frontend_workspace.id,
       seed.title,
       seed.content,
       creator.user_id,
       FALSE,
       seed.created_at,
       seed.created_at
FROM frontend_workspace
JOIN seed ON TRUE
JOIN users creator ON creator.email = seed.creator_email
WHERE NOT EXISTS (
    SELECT 1
    FROM meeting_note existing
    WHERE existing.workspace_id = frontend_workspace.id
      AND existing.title = seed.title
      AND existing.is_deleted = FALSE
);

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(actor_email, activity_type, description, created_at) AS (
    VALUES
        ('team.frontend.ui@devpath.com', 'TASK_CREATED', '마크다운 에디터 이미지 업로드 UX 보강 작업을 리뷰 요청했습니다.', now() - INTERVAL '90 minutes'),
        ('team.frontend.design@devpath.com', 'DOC_UPDATED', '디자인 시스템 원본 링크와 QA 체크리스트를 자료실에 공유했습니다.', now() - INTERVAL '6 hours'),
        ('mentor.frontend@devpath.com', 'MEETING_NOTE_CREATED', 'Week 3 라이브 코드 리뷰 회의록을 등록했습니다.', now() - INTERVAL '18 hours'),
        ('team.frontend.api@devpath.com', 'DOC_UPDATED', '게시글/태그 API mock 계약을 API 명세서에 반영했습니다.', now() - INTERVAL '20 hours')
)
INSERT INTO activity_log (
    workspace_id, actor_id, activity_type, description, created_at
)
SELECT frontend_workspace.id,
       actor.user_id,
       seed.activity_type,
       seed.description,
       seed.created_at
FROM frontend_workspace
JOIN seed ON TRUE
JOIN users actor ON actor.email = seed.actor_email
WHERE NOT EXISTS (
    SELECT 1
    FROM activity_log existing
    WHERE existing.workspace_id = frontend_workspace.id
      AND existing.activity_type = seed.activity_type
      AND existing.description = seed.description
);

WITH frontend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
)
INSERT INTO voice_channels (
    workspace_id, creator_id, name, description, current_session_started_at,
    is_deleted, created_at, updated_at
)
SELECT frontend_workspace.id,
       frontend_workspace.owner_id,
       '프론트 통합 리뷰룸',
       '팀원이 PR 리뷰와 화면 QA를 빠르게 논의하는 상시 음성 채널입니다.',
       now() - INTERVAL '12 minutes',
       FALSE,
       CURRENT_DATE - 3 + TIME '18:00',
       now() - INTERVAL '12 minutes'
FROM frontend_workspace
WHERE NOT EXISTS (
    SELECT 1
    FROM voice_channels existing
    WHERE existing.workspace_id = frontend_workspace.id
      AND existing.name = '프론트 통합 리뷰룸'
      AND existing.is_deleted = FALSE
);

WITH frontend_workspace AS (
    SELECT workspace.id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.frontend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 8
          OR workspace.name = 'Next.js 블로그 플랫폼 구축'
      )
    ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
channel AS (
    SELECT voice_channel_id
    FROM voice_channels
    JOIN frontend_workspace ON frontend_workspace.id = voice_channels.workspace_id
    WHERE voice_channels.name = '프론트 통합 리뷰룸'
      AND voice_channels.is_deleted = FALSE
    LIMIT 1
),
participants(email, muted, speaking) AS (
    VALUES
        ('learner@devpath.com', FALSE, TRUE),
        ('team.frontend.ui@devpath.com', FALSE, FALSE)
)
INSERT INTO voice_participants (
    voice_channel_id, user_id, active, muted, hand_raised, speaking,
    joined_at, left_at, is_deleted, created_at, updated_at
)
SELECT channel.voice_channel_id,
       participant.user_id,
       TRUE,
       participants.muted,
       FALSE,
       participants.speaking,
       now() - INTERVAL '10 minutes',
       NULL,
       FALSE,
       now() - INTERVAL '10 minutes',
       now() - INTERVAL '2 minutes'
FROM channel
JOIN participants ON TRUE
JOIN users participant ON participant.email = participants.email
WHERE NOT EXISTS (
    SELECT 1
    FROM voice_participants existing
    WHERE existing.voice_channel_id = channel.voice_channel_id
      AND existing.user_id = participant.user_id
      AND existing.is_deleted = FALSE
);
