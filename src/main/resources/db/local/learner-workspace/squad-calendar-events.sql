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
INSERT INTO calendar_event (
    workspace_id, title, description, start_at, end_at,
    created_by_id, is_deleted, created_at, updated_at
)
SELECT squad_workspace.id, seed.title, seed.description,
       (CURRENT_DATE + seed.day_offset + seed.start_time)::timestamp,
       (CURRENT_DATE + seed.day_offset + seed.end_time)::timestamp,
       learner.user_id, FALSE, seed.created_at, seed.created_at
FROM squad_workspace
CROSS JOIN learner
CROSS JOIN (
    VALUES
        (
          'DB ERD 설계 리뷰',
          '[schedule-category:task-be]' || chr(10) || '테이블 관계와 인덱스 설계를 함께 검토합니다.',
          -2,
          TIME '10:00',
          TIME '11:00',
          CURRENT_DATE - 4 + TIME '17:00'
        ),
        (
          '카카오 소셜 로그인 연동',
          '[schedule-category:task-fe]' || chr(10) || 'OAuth 리다이렉트와 프론트 인증 상태를 확인합니다.',
          0,
          TIME '14:00',
          TIME '15:00',
          CURRENT_DATE - 3 + TIME '09:30'
        ),
        (
          '결제 모듈 API 구현',
          '[schedule-category:task-be]' || chr(10) || '주문 생성과 결제 승인 API 흐름을 마무리합니다.',
          1,
          TIME '10:00',
          TIME '12:00',
          CURRENT_DATE - 2 + TIME '09:30'
        ),
        (
          '스프린트 2주차 마감',
          '[schedule-category:milestone]' || chr(10) || '리뷰 대기 작업을 정리하고 데모 범위를 확정합니다.',
          3,
          TIME '18:00',
          TIME '19:00',
          CURRENT_DATE - 1 + TIME '09:30'
        ),
        (
          '중간 회고 회의',
          '[schedule-category:meeting]' || chr(10) || '진행 리스크와 다음 스프린트 우선순위를 공유합니다.',
          5,
          TIME '20:00',
          TIME '21:00',
          CURRENT_DATE + TIME '09:30'
        ),
        (
          '메인 화면 UI 퍼블리싱',
          '[schedule-category:task-fe]' || chr(10) || '랜딩 카드와 모바일 반응형 레이아웃을 정리합니다.',
          7,
          TIME '13:00',
          TIME '15:00',
          CURRENT_DATE + 1 + TIME '09:30'
        )
) AS seed(title, description, day_offset, start_time, end_time, created_at)
WHERE NOT EXISTS (
    SELECT 1
    FROM calendar_event existing
    WHERE existing.workspace_id = squad_workspace.id
      AND existing.title = seed.title
      AND existing.is_deleted = FALSE
);
