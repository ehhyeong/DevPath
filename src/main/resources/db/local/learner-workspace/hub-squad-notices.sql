SELECT title, content
FROM (
    VALUES
        (1, '이번 주 목표', '로드맵 상세 API 필드 확정과 학습 진행률 카드 1차 구현을 이번 주 목표로 잡습니다.'),
        (2, 'GitHub 연동 안내', '코드 피드백 영역은 실제 DevPath 저장소 연결 후 확인할 예정이므로 현재 시드에서는 제외합니다.')
) AS seed(sort_order, title, content)
ORDER BY sort_order;
