SELECT acted_by_owner, activity_type, description
FROM (
    VALUES
        (1, TRUE, 'MEMBER_JOINED', 'learner@devpath.com님이 DevPath 스쿼드를 생성했습니다.'),
        (2, FALSE, 'MEMBER_JOINED', '김학습님이 DevPath 스쿼드에 참여했습니다.'),
        (3, TRUE, 'MILESTONE_CREATED', 'MVP 범위 확정 마일스톤이 생성되었습니다.'),
        (4, FALSE, 'TASK_CREATED', '학습 진행률 카드 컴포넌트 구현 작업이 등록되었습니다.'),
        (5, TRUE, 'DOC_UPDATED', 'DevPath API 초안 문서가 업데이트되었습니다.')
) AS seed(sort_order, acted_by_owner, activity_type, description)
ORDER BY sort_order;
