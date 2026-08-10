SELECT created_by_owner, title, content
FROM (
    VALUES
        (
            1, TRUE, '킥오프 회의록',
            '## 결정 사항
- 프로젝트 이름은 DevPath로 고정합니다.
- MVP는 로드맵 탐색, 노드 상세, 학습 진행률 카드까지 포함합니다.
- GitHub 코드 피드백은 실제 저장소 연결 후 확인합니다.

## 액션 아이템
- learner: API 응답 필드 초안 정리
- squadmate: 진행률 카드 UI 상태 정리
'
        ),
        (
            2, FALSE, '진행률 카드 UI 리뷰 메모',
            '## 확인 내용
- 완료율은 퍼센트와 진행 바를 함께 노출합니다.
- 다음 추천 노드는 빈 상태와 데이터 로딩 상태를 분리합니다.
- 모바일에서는 카드가 1열로 쌓이도록 정리합니다.
'
        )
) AS seed(sort_order, created_by_owner, title, content)
ORDER BY sort_order;
