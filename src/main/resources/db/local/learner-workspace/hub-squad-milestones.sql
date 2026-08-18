SELECT title, description, start_offset_days, due_offset_days, status
FROM (
    VALUES
        (1, 'MVP 범위 확정', '로드맵 탐색, 노드 상세, 학습 현황 카드까지 1차 MVP 범위를 잠급니다.', -8, -2, 'DONE'),
        (2, '로드맵 학습 플로우 구현', '로드맵 선택부터 노드별 학습 상태 저장까지 핵심 플로우를 연결합니다.', -1, 6, 'IN_PROGRESS'),
        (3, '대시보드와 회고 정리', '학습 진행률, 과제 제출 현황, 회고 문서를 묶어 데모 가능한 상태로 정리합니다.', 7, 14, 'OPEN')
) AS seed(sort_order, title, description, start_offset_days, due_offset_days, status)
ORDER BY sort_order;
