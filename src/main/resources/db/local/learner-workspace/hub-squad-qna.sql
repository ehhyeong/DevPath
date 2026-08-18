SELECT template_type, difficulty, title, question_content, answer_content
FROM (
    VALUES
        (
            'PROJECT',
            'MEDIUM',
            '로드맵 노드 완료 기준을 어디까지 잡을까요?',
            '노드 상세에서 강의 수강, 과제 제출, 퀴즈 통과 중 어떤 조건을 완료 기준으로 먼저 볼지 정해야 할 것 같습니다.',
            'MVP에서는 강의 수강 완료와 과제 제출 여부를 먼저 완료 기준으로 두고, 퀴즈 통과 조건은 다음 스프린트에서 붙이는 방향이 좋겠습니다.'
        )
) AS seed(template_type, difficulty, title, question_content, answer_content);
