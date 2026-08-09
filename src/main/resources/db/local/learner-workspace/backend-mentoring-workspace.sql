WITH backend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.backend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 7
          OR workspace.name = '대용량 트래픽 커머스 서버'
      )
    ORDER BY CASE WHEN workspace.id = 7 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
participants(email, position_label, joined_day_offset, active_day_offset, active_time) AS (
    VALUES
        ('learner@devpath.com', 'Backend API', -2, 0, TIME '10:10'),
        ('assignment.backend.api@devpath.com', 'Backend API', -2, 0, TIME '11:20'),
        ('assignment.backend.test@devpath.com', 'QA/Test', -2, -1, TIME '18:40'),
        ('assignment.backend.ops@devpath.com', 'Performance/Ops', -2, -2, TIME '21:15')
)
INSERT INTO workspace_member (
    workspace_id, learner_id, joined_at, last_active_at, position_label
)
SELECT backend_workspace.id,
       learner.user_id,
       CURRENT_DATE + participants.joined_day_offset + TIME '09:00',
       CURRENT_DATE + participants.active_day_offset + participants.active_time,
       participants.position_label
FROM backend_workspace
JOIN participants ON TRUE
JOIN users learner ON learner.email = participants.email
WHERE NOT EXISTS (
    SELECT 1
    FROM workspace_member member
    WHERE member.workspace_id = backend_workspace.id
      AND member.learner_id = learner.user_id
);

WITH backend_workspace AS (
    SELECT workspace.id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.backend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 7
          OR workspace.name = '대용량 트래픽 커머스 서버'
      )
    ORDER BY CASE WHEN workspace.id = 7 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
participants(email, position_label, active_day_offset, active_time) AS (
    VALUES
        ('learner@devpath.com', 'Backend API', 0, TIME '10:10'),
        ('assignment.backend.api@devpath.com', 'Backend API', 0, TIME '11:20'),
        ('assignment.backend.test@devpath.com', 'QA/Test', -1, TIME '18:40'),
        ('assignment.backend.ops@devpath.com', 'Performance/Ops', -2, TIME '21:15')
)
UPDATE workspace_member member
   SET position_label = participants.position_label,
       last_active_at = CURRENT_DATE + participants.active_day_offset + participants.active_time
  FROM backend_workspace, participants, users learner
 WHERE member.workspace_id = backend_workspace.id
   AND member.learner_id = learner.user_id
   AND learner.email = participants.email
   AND (
       member.position_label IS DISTINCT FROM participants.position_label
       OR member.last_active_at IS DISTINCT FROM CURRENT_DATE + participants.active_day_offset + participants.active_time
   );

WITH backend_post AS (
    SELECT post.mentoring_post_id
    FROM mentoring_posts post
    JOIN users mentor ON mentor.user_id = post.mentor_id
    WHERE mentor.email = 'mentor.backend@devpath.com'
      AND post.title = '대용량 트래픽 커머스 서버'
      AND post.is_deleted = FALSE
    ORDER BY post.created_at
    LIMIT 1
),
participants(email, message) AS (
    VALUES
        ('assignment.backend.api@devpath.com', '동시성 이슈와 Redis 캐시 전략을 실습하고 싶습니다.'),
        ('assignment.backend.test@devpath.com', '장애 재현 테스트와 회귀 테스트 작성까지 피드백 받고 싶습니다.'),
        ('assignment.backend.ops@devpath.com', '부하 테스트 결과를 보고 병목을 찾는 과정을 배우고 싶습니다.')
)
INSERT INTO mentoring_applications (
    mentoring_post_id, applicant_id, message, desired_position, status, reject_reason,
    processed_at, is_deleted, created_at, updated_at
)
SELECT backend_post.mentoring_post_id,
       learner.user_id,
       participants.message,
       NULL,
       'APPROVED',
       NULL,
       CURRENT_DATE - 2 + TIME '10:30',
       FALSE,
       CURRENT_DATE - 2 + TIME '10:15',
       CURRENT_DATE - 2 + TIME '10:30'
FROM backend_post
JOIN participants ON TRUE
JOIN users learner ON learner.email = participants.email
WHERE NOT EXISTS (
    SELECT 1
    FROM mentoring_applications application
    WHERE application.mentoring_post_id = backend_post.mentoring_post_id
      AND application.applicant_id = learner.user_id
);

WITH backend_workspace AS (
    SELECT workspace.id, workspace.owner_id
    FROM workspace
    JOIN users mentor ON mentor.user_id = workspace.owner_id
    WHERE mentor.email = 'mentor.backend@devpath.com'
      AND workspace.type = 'MENTORING'
      AND COALESCE(workspace.is_deleted, FALSE) = FALSE
      AND (
          workspace.id = 7
          OR workspace.name = '대용량 트래픽 커머스 서버'
      )
    ORDER BY CASE WHEN workspace.id = 7 THEN 0 ELSE 1 END, workspace.created_at
    LIMIT 1
),
seed(title, description, status, priority, assignee_email, due_date, created_at) AS (
    VALUES
        (
          'Week 1: 주문 도메인 요구사항 분석',
          '주문, 상품, 재고, 쿠폰 도메인의 핵심 요구사항을 정리합니다.' || chr(10) || chr(10) ||
          '- 유스케이스별 정상/예외 흐름을 작성합니다.' || chr(10) ||
          '- ERD 초안과 API 목록을 함께 제출합니다.',
          'TODO', 'HIGH', NULL, CURRENT_DATE - 15, CURRENT_DATE - 23 + TIME '09:00'
        ),
        (
          'Week 2: 쿠폰 발급 API 구현',
          '선착순 쿠폰 발급 API와 중복 발급 방지 로직을 구현합니다.' || chr(10) || chr(10) ||
          '- Redis 기반 원자적 카운팅 전략을 설명합니다.' || chr(10) ||
          '- 성공/실패 케이스 테스트를 포함합니다.',
          'TODO', 'HIGH', NULL, CURRENT_DATE - 8, CURRENT_DATE - 16 + TIME '09:00'
        ),
        (
          'Week 3: 주문 재고 동시성 제어',
          '동시 주문 상황에서 재고 정합성을 유지하는 방식을 구현합니다.' || chr(10) || chr(10) ||
          '- 낙관적 락 또는 분산락 선택 근거를 남깁니다.' || chr(10) ||
          '- 재고 부족과 결제 실패 롤백 케이스를 검증합니다.',
          'TODO', 'HIGH', NULL, CURRENT_DATE - 1, CURRENT_DATE - 9 + TIME '09:00'
        ),
        (
          'Week 4: 주문 API 부하 테스트 결과 제출',
          '핵심 주문 API에 대한 부하 테스트 결과와 병목 개선안을 제출합니다.' || chr(10) || chr(10) ||
          '- 테스트 조건과 TPS, p95 응답 시간을 기록합니다.' || chr(10) ||
          '- 개선 전후 지표와 남은 리스크를 정리합니다.',
          'TODO', 'HIGH', NULL, CURRENT_DATE + 6, CURRENT_DATE - 2 + TIME '09:00'
        ),
        (
          'Week 1: 주문 도메인 요구사항 분석',
          '요구사항과 ERD 초안을 제출했습니다. 쿠폰 테이블과 재고 차감 트랜잭션 경계에 대한 리뷰를 받고 싶습니다.',
          'DONE', 'MEDIUM', 'learner@devpath.com', CURRENT_DATE - 15, CURRENT_DATE - 16 + TIME '20:10'
        ),
        (
          'Week 2: 쿠폰 발급 API 구현',
          'Redis INCR 기반으로 쿠폰 수량을 제어했고 중복 발급 방지 테스트를 추가했습니다.',
          'DONE', 'HIGH', 'learner@devpath.com', CURRENT_DATE - 8, CURRENT_DATE - 9 + TIME '22:20'
        ),
        (
          'Week 3: 주문 재고 동시성 제어',
          '낙관적 락 버전 충돌 케이스와 결제 실패 롤백 흐름을 구현했습니다. 테스트 격리 방식이 맞는지 확인 부탁드립니다.',
          'DONE', 'HIGH', 'learner@devpath.com', CURRENT_DATE - 1, CURRENT_DATE - 2 + TIME '21:35'
        ),
        (
          'Week 4: 주문 API 부하 테스트 결과 제출',
          'k6로 주문 생성 API를 300VU까지 올려 테스트했습니다. Redis 캐시 적용 전후 p95 차이를 첨부했습니다.',
          'IN_REVIEW', 'HIGH', 'learner@devpath.com', CURRENT_DATE + 6, CURRENT_DATE + TIME '10:10'
        ),
        (
          'Week 1: 주문 도메인 요구사항 분석',
          '주문 상태 전이와 쿠폰 발급 유스케이스를 정리했습니다. 예외 흐름을 시퀀스 다이어그램으로 보강했습니다.',
          'DONE', 'MEDIUM', 'assignment.backend.api@devpath.com', CURRENT_DATE - 15, CURRENT_DATE - 16 + TIME '19:30'
        ),
        (
          'Week 2: 쿠폰 발급 API 구현',
          '쿠폰 발급 API와 통합 테스트를 제출했습니다. Redis 장애 시 대체 흐름은 별도 문서로 남겼습니다.',
          'DONE', 'HIGH', 'assignment.backend.api@devpath.com', CURRENT_DATE - 8, CURRENT_DATE - 9 + TIME '20:45'
        ),
        (
          'Week 3: 주문 재고 동시성 제어',
          '분산락 적용 후 동시 주문 테스트 3종을 통과했습니다. 락 키 설계에 대한 피드백을 반영했습니다.',
          'DONE', 'HIGH', 'assignment.backend.api@devpath.com', CURRENT_DATE - 1, CURRENT_DATE - 2 + TIME '23:10'
        ),
        (
          'Week 4: 주문 API 부하 테스트 결과 제출',
          '부하 테스트 결과와 병목 분석 리포트를 제출했습니다. 커넥션 풀 설정 변경 전후 지표를 비교했습니다.',
          'DONE', 'HIGH', 'assignment.backend.api@devpath.com', CURRENT_DATE + 6, CURRENT_DATE + TIME '11:20'
        ),
        (
          'Week 1: 주문 도메인 요구사항 분석',
          '요구사항 명세와 ERD 초안을 제출했습니다. 테스트 데이터 생성 범위를 추가로 정리했습니다.',
          'DONE', 'MEDIUM', 'assignment.backend.test@devpath.com', CURRENT_DATE - 15, CURRENT_DATE - 16 + TIME '21:10'
        ),
        (
          'Week 2: 쿠폰 발급 API 구현',
          '쿠폰 발급 성공/중복/소진 케이스를 테스트로 제출했습니다. 경계값 테스트를 추가했습니다.',
          'DONE', 'HIGH', 'assignment.backend.test@devpath.com', CURRENT_DATE - 8, CURRENT_DATE - 9 + TIME '21:25'
        ),
        (
          'Week 3: 주문 재고 동시성 제어',
          '수정 요청 반영 중입니다. 동시성 테스트에서 간헐적으로 실패하는 케이스를 재현하고 있습니다.',
          'TODO', 'HIGH', 'assignment.backend.test@devpath.com', CURRENT_DATE - 1, CURRENT_DATE - 2 + TIME '18:40'
        ),
        (
          'Week 4: 주문 API 부하 테스트 결과 제출 - 수정 요청',
          '수정 요청 항목을 반영 중입니다. p95 지표 산출 스크립트와 테스트 조건 표기를 보완하고 있습니다.',
          'TODO', 'HIGH', 'assignment.backend.test@devpath.com', CURRENT_DATE + 6, CURRENT_DATE - 1 + TIME '18:40'
        ),
        (
          'Week 1: 주문 도메인 요구사항 분석',
          '운영 관점의 장애 시나리오와 모니터링 지표를 요구사항 문서에 추가했습니다.',
          'DONE', 'MEDIUM', 'assignment.backend.ops@devpath.com', CURRENT_DATE - 15, CURRENT_DATE - 16 + TIME '22:00'
        ),
        (
          'Week 2: 쿠폰 발급 API 구현',
          'Redis 장애 상황과 재시도 정책을 중심으로 구현했습니다. 알림 조건 초안을 함께 제출했습니다.',
          'DONE', 'HIGH', 'assignment.backend.ops@devpath.com', CURRENT_DATE - 8, CURRENT_DATE - 10 + TIME '21:15'
        ),
        (
          'Week 3: 주문 재고 동시성 제어',
          '락 대기 시간이 길어지는 구간을 분석 중입니다. Grafana 대시보드 초안을 추가했습니다.',
          'IN_PROGRESS', 'HIGH', 'assignment.backend.ops@devpath.com', CURRENT_DATE - 1, CURRENT_DATE - 3 + TIME '21:15'
        )
)
INSERT INTO workspace_task (
    workspace_id, title, description, status, priority,
    assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at
)
SELECT backend_workspace.id,
       seed.title,
       seed.description,
       seed.status,
       seed.priority,
       learner.user_id,
       seed.due_date,
       COALESCE(learner.user_id, backend_workspace.owner_id),
       FALSE,
       seed.created_at,
       seed.created_at
FROM backend_workspace
JOIN seed ON TRUE
LEFT JOIN users learner ON learner.email = seed.assignee_email
WHERE (seed.assignee_email IS NULL OR learner.user_id IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1
      FROM workspace_task existing
      WHERE existing.workspace_id = backend_workspace.id
        AND existing.title = seed.title
        AND existing.assignee_id IS NOT DISTINCT FROM learner.user_id
        AND existing.is_deleted = FALSE
  );
