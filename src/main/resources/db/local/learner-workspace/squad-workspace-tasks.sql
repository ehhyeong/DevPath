WITH learner AS (
    SELECT user_id FROM users WHERE email = 'learner@devpath.com'
),
squad_workspace AS (
    SELECT workspace.id
    FROM workspace
    JOIN workspace_member member ON member.workspace_id = workspace.id
    JOIN learner ON learner.user_id = member.learner_id
    WHERE workspace.type = 'SQUAD'
      AND workspace.is_deleted = FALSE
    ORDER BY workspace.created_at
    LIMIT 1
)
INSERT INTO workspace_task (
    workspace_id, title, description, status, priority,
    assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at
)
SELECT squad_workspace.id, seed.title, seed.description, seed.status, seed.priority,
       learner.user_id, seed.due_date, learner.user_id, FALSE, seed.created_at, seed.created_at
FROM squad_workspace
CROSS JOIN learner
CROSS JOIN (
    VALUES
        (
          '메인 화면 반응형 UI 리빌딩',
          'React와 Tailwind 기반으로 홈 피드와 모집 카드의 모바일/데스크톱 레이아웃을 정리합니다.',
          'TODO',
          'MEDIUM',
          CURRENT_DATE + 7,
          CURRENT_DATE - 4 + TIME '16:00'
        ),
        (
          '결제 모듈 연동 API 구현',
          '주문 생성, 결제 승인, 실패 롤백 흐름을 Spring Boot API로 구현합니다.',
          'IN_PROGRESS',
          'HIGH',
          CURRENT_DATE + 1,
          CURRENT_DATE - 3 + TIME '10:00'
        ),
        (
          '카카오 소셜 로그인 프론트 연동',
          'OAuth 리다이렉트 이후 토큰 저장과 사용자 프로필 동기화 흐름을 점검합니다.',
          'IN_REVIEW',
          'MEDIUM',
          CURRENT_DATE,
          CURRENT_DATE - 2 + TIME '11:00'
        ),
        (
          'MVP 배포 체크리스트 작성',
          '환경변수, DB 마이그레이션, 장애 대응 항목을 정리하고 팀 리뷰를 완료합니다.',
          'DONE',
          'LOW',
          CURRENT_DATE - 1,
          CURRENT_DATE - 1 + TIME '13:00'
        )
) AS seed(title, description, status, priority, due_date, created_at)
WHERE NOT EXISTS (
    SELECT 1
    FROM workspace_task existing
    WHERE existing.workspace_id = squad_workspace.id
      AND existing.title = seed.title
      AND existing.is_deleted = FALSE
);
