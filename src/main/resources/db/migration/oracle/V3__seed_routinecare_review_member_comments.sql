-- 김학습 소유 시연 PR에 실제로 초대된 팀원의 누락 댓글만 추가한다. 기존 댓글과 삭제 이력은 보존한다.
INSERT INTO workspace_code_review_comments (
    review_id, workspace_id, author_id, file_path, body, status_label,
    is_deleted, created_at, updated_at
)
SELECT r.id, r.workspace_id, u.user_id, r.file_path,
       CASE u.email
           WHEN 'kim.taehyung@devpath.com' THEN 'memberId는 요청 본문 대신 인증된 사용자 정보에서 가져오면 좋겠습니다. 같은 사용자가 같은 날짜에 동시에 저장해도 기록이 중복되지 않도록 member_id·record_date 유니크 제약도 확인해 주세요.'
           ELSE '프론트에서는 저장 응답의 날짜·식단·복약 여부로 오늘 기록 카드를 갱신하겠습니다. 식단은 그대로 두고 복약 여부만 바꾸는 경우에도 값이 유지되는지 테스트해 보면 좋겠습니다.'
       END,
       'Commented', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users owner_user ON owner_user.user_id = w.owner_id
JOIN workspace_member m ON m.workspace_id = w.id
JOIN users u ON u.user_id = m.learner_id
WHERE owner_user.email = 'kim.hakseup@devpath.com'
  AND w.type = 'SQUAD'
  AND w.is_deleted = 0
  AND r.is_deleted = 0
  AND r.external_provider = 'DEMO'
  AND r.external_id = 'routinecare-records-v1#1'
  AND u.email IN ('kim.taehyung@devpath.com', 'park.juseung@devpath.com')
  AND NOT EXISTS (
      SELECT 1 FROM workspace_code_review_comments c
      WHERE c.workspace_id = r.workspace_id AND c.review_id = r.id AND c.author_id = u.user_id
  );
