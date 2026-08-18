SELECT assigned_to_owner, title, description, status, priority, due_offset_days
FROM (
    VALUES
        (1, TRUE, '로드맵 홈 MVP 와이어프레임 정리', '핵심 진입 화면, 추천 로드맵 카드, 최근 학습 영역의 우선순위를 정리합니다.', 'DONE', 'HIGH', -3),
        (2, FALSE, '학습 진행률 카드 컴포넌트 구현', '노드 완료율, 오늘 학습 시간, 다음 추천 노드를 카드 형태로 표시합니다.', 'IN_PROGRESS', 'HIGH', 2),
        (3, TRUE, '로드맵 노드 상세 API 응답 필드 정리', '노드 제목, 설명, 선행 조건, 연결 강의, 과제 상태 필드명을 정리합니다.', 'IN_REVIEW', 'MEDIUM', 3),
        (4, FALSE, '스쿼드 대시보드 빈 상태 문구 점검', '처음 접속한 팀원이 작업, 일정, 파일 영역을 이해할 수 있도록 빈 상태 문구를 점검합니다.', 'TODO', 'LOW', 5),
        (5, TRUE, '과제 제출 플로우 QA 체크리스트 작성', '파일 제출, URL 제출, 텍스트 제출 케이스와 실패 시나리오를 QA 체크리스트로 정리합니다.', 'TODO', 'MEDIUM', 7)
) AS seed(sort_order, assigned_to_owner, title, description, status, priority, due_offset_days)
ORDER BY sort_order;
