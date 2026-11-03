-- 시연 PR로 식별한 김학습 프로젝트의 초기 미지정 카드만 배분한다. 직접 배정·이동·삭제한 카드는 보존한다.
MERGE INTO workspace_task task
USING (
  SELECT DISTINCT target_task.id AS task_id, assignee.user_id AS assignee_id,
         seed.task_title, seed.task_status
  FROM (
    SELECT '프로젝트 환경 및 DB 마이그레이션 구성' AS task_title, 'kim.taehyung@devpath.com' AS assignee_email, 'DONE' AS task_status, 'routinecare-records-v1#1' AS review_key
    UNION ALL
    SELECT '회원가입·로그인 API와 인증 사용자 검증', 'kim.taehyung@devpath.com', 'DONE', 'routinecare-records-v1#1'
    UNION ALL
    SELECT 'React 로그인 화면 및 API 클라이언트 구현', 'kim.hakseup@devpath.com', 'DONE', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '식단 계획 등록·조회 API 구현', 'kim.taehyung@devpath.com', 'DONE', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '복약 계획 등록·조회 API 구현', 'kim.taehyung@devpath.com', 'DONE', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '식단·복약 계획 입력 화면 구현', 'kim.hakseup@devpath.com', 'IN_REVIEW', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '일별 식단·복약 기록 저장 API 구현', 'kim.taehyung@devpath.com', 'IN_REVIEW', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '사용자·날짜 중복 기록 방지와 권한 테스트', 'park.juseung@devpath.com', 'IN_PROGRESS', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '주간 복약 이행률 조회 및 대시보드 구현', 'kim.hakseup@devpath.com', 'IN_PROGRESS', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '날짜 경계와 동시 저장 통합 테스트', 'park.juseung@devpath.com', 'TODO', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '반응형 화면과 접근성 점검', 'kim.hakseup@devpath.com', 'TODO', 'routinecare-records-v1#1'
    UNION ALL
    SELECT 'Docker 배포 및 운영 로그 구성', 'kim.taehyung@devpath.com', 'TODO', 'routinecare-records-v1#1'
    UNION ALL
    SELECT '스터디 ERD와 UNIQUE 제약 설계', 'kim.taehyung@devpath.com', 'DONE', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '회원 인증과 방장·참여자 권한 검증', 'kim.taehyung@devpath.com', 'DONE', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '스터디 목록과 로그인 화면 구현', 'kim.hakseup@devpath.com', 'DONE', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '스터디 개설·참여 API 구현', 'kim.taehyung@devpath.com', 'DONE', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '모임 일정 등록·조회 API 구현', 'kim.taehyung@devpath.com', 'DONE', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '스터디 상세와 모임 달력 구현', 'kim.hakseup@devpath.com', 'IN_REVIEW', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '모임 출석 체크 API 구현', 'kim.taehyung@devpath.com', 'IN_REVIEW', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '중복 체크인과 비참여자 접근 테스트', 'park.juseung@devpath.com', 'IN_PROGRESS', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '출석 현황 집계와 대시보드 구현', 'kim.hakseup@devpath.com', 'IN_PROGRESS', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '모임 시간 경계 통합 테스트', 'park.juseung@devpath.com', 'TODO', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '반응형 화면과 키보드 접근성 점검', 'kim.hakseup@devpath.com', 'TODO', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT 'Docker 배포와 운영 로그 구성', 'kim.taehyung@devpath.com', 'TODO', 'studymate-attendance-v1#1'
    UNION ALL
    SELECT '나눔·예약 ERD와 수량 제약 설계', 'kim.taehyung@devpath.com', 'DONE', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '회원 인증과 소유자 권한 구현', 'kim.taehyung@devpath.com', 'DONE', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT 'Vue 로그인과 API 클라이언트 구현', 'kim.hakseup@devpath.com', 'DONE', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '물품 등록·나눔 공개 API 구현', 'kim.taehyung@devpath.com', 'DONE', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '수령 기한과 게시 상태 검증', 'kim.taehyung@devpath.com', 'DONE', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '나눔 목록·상세 화면 구현', 'kim.hakseup@devpath.com', 'IN_REVIEW', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '예약 생성·취소 트랜잭션 구현', 'kim.taehyung@devpath.com', 'IN_REVIEW', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '동시 예약과 수량 복원 테스트', 'park.juseung@devpath.com', 'IN_PROGRESS', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '전달 완료 확인과 내 예약 화면 구현', 'kim.hakseup@devpath.com', 'IN_PROGRESS', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '소유권·수령 기한 경계 테스트', 'park.juseung@devpath.com', 'TODO', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '반응형 화면과 오류 상태 점검', 'kim.hakseup@devpath.com', 'TODO', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT 'Docker 배포와 로그 구성', 'kim.taehyung@devpath.com', 'TODO', 'pantryshare-reservations-v1#1'
    UNION ALL
    SELECT '프로젝트·스프린트·이슈 ERD 설계', 'kim.taehyung@devpath.com', 'DONE', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '회원 인증과 프로젝트 참여 권한 구현', 'kim.taehyung@devpath.com', 'DONE', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '프로젝트 목록·로그인 화면 구현', 'kim.hakseup@devpath.com', 'DONE', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '팀원 초대와 중복 참여 방지 구현', 'kim.taehyung@devpath.com', 'DONE', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '스프린트 생성과 기간 검증', 'kim.taehyung@devpath.com', 'DONE', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '스프린트 계획 화면 구현', 'kim.hakseup@devpath.com', 'IN_REVIEW', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '이슈 등록·담당자 검증 API 구현', 'kim.taehyung@devpath.com', 'IN_REVIEW', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '상태 전이와 낙관적 잠금 구현', 'kim.taehyung@devpath.com', 'IN_PROGRESS', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '드래그 보드와 충돌 복구 UI 구현', 'kim.hakseup@devpath.com', 'IN_PROGRESS', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '동시 수정·비참여자·종료 스프린트 테스트', 'park.juseung@devpath.com', 'TODO', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT '키보드로 조작 가능한 보드 점검', 'kim.hakseup@devpath.com', 'TODO', 'sprintdesk-issue-status-v1#1'
    UNION ALL
    SELECT 'Docker 배포와 운영 로그 구성', 'kim.taehyung@devpath.com', 'TODO', 'sprintdesk-issue-status-v1#1'
  ) seed
  JOIN workspace_code_reviews review ON review.external_id = seed.review_key
  JOIN workspace w ON w.id = review.workspace_id
  JOIN users owner_user ON owner_user.user_id = w.owner_id
  JOIN users assignee ON assignee.email = seed.assignee_email
  JOIN workspace_member member ON member.workspace_id = w.id AND member.learner_id = assignee.user_id
  JOIN workspace_task target_task ON target_task.workspace_id = w.id AND target_task.title = seed.task_title
  WHERE owner_user.email = 'kim.hakseup@devpath.com'
    AND w.type = 'SQUAD' AND w.is_deleted = FALSE
    AND review.external_provider = 'DEMO' AND review.is_deleted = FALSE
    AND target_task.assignee_id IS NULL AND target_task.status = 'TODO'
    AND target_task.created_by_id = w.owner_id AND target_task.is_deleted = FALSE
) seed
ON (task.id = seed.task_id)
WHEN MATCHED THEN UPDATE SET
  assignee_id = seed.assignee_id, status = seed.task_status, updated_at = CURRENT_TIMESTAMP;

-- 역할을 직접 설정한 팀원은 보존하고 미지정 또는 기존 OWNER 표기만 직군으로 보정한다.
MERGE INTO workspace_member member
USING (
  SELECT DISTINCT w.id AS workspace_id, u.user_id, seed.position_label
  FROM (
    SELECT 'kim.hakseup@devpath.com' AS email, 'Frontend 개발자' AS position_label
    UNION ALL
    SELECT 'kim.taehyung@devpath.com', 'Backend·인프라'
    UNION ALL
    SELECT 'park.juseung@devpath.com', 'QA·테스트'
  ) seed
  JOIN users u ON u.email = seed.email
  JOIN workspace w ON w.type = 'SQUAD' AND w.is_deleted = FALSE
  JOIN users owner_user ON owner_user.user_id = w.owner_id
  JOIN workspace_code_reviews review ON review.workspace_id = w.id
  JOIN workspace_member current_member ON current_member.workspace_id = w.id AND current_member.learner_id = u.user_id
  WHERE owner_user.email = 'kim.hakseup@devpath.com'
    AND review.external_provider = 'DEMO' AND review.is_deleted = FALSE
    AND review.external_id IN ('routinecare-records-v1#1', 'studymate-attendance-v1#1', 'pantryshare-reservations-v1#1', 'sprintdesk-issue-status-v1#1')
    AND (current_member.position_label IS NULL OR current_member.position_label = 'OWNER')
) seed
ON (member.workspace_id = seed.workspace_id AND member.learner_id = seed.user_id)
WHEN MATCHED THEN UPDATE SET position_label = seed.position_label;
