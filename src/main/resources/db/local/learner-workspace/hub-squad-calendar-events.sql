SELECT
    created_by_owner,
    title,
    description,
    start_offset_days,
    start_time,
    end_offset_days,
    end_time
FROM (
    VALUES
        (1, TRUE, '로드맵 플로우 스탠드업', '이번 주 구현 범위와 API 의존성을 30분 안에 정리합니다.', 1, TIME '10:30', 1, TIME '11:00'),
        (2, FALSE, '진행률 카드 UI 리뷰', '컴포넌트 상태, 빈 상태, 모바일 레이아웃을 함께 확인합니다.', 3, TIME '15:00', 3, TIME '16:00'),
        (3, TRUE, 'MVP 데모 리허설', '로드맵 선택부터 학습 대시보드까지 데모 동선을 리허설합니다.', 8, TIME '14:00', 8, TIME '15:00')
) AS seed(
    sort_order, created_by_owner, title, description,
    start_offset_days, start_time, end_offset_days, end_time
)
ORDER BY sort_order;
