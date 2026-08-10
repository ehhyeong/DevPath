SELECT
    email,
    name,
    preserve_existing_name,
    bio,
    channel_name,
    github_url,
    is_owner
FROM (
    VALUES
        (
            1,
            'learner@devpath.com',
            '이학습',
            TRUE,
            '로드맵 기반 학습 플랫폼을 기획하고 검증하는 학습자입니다.',
            'Learner DevPath',
            'https://github.com/ehhyeong/DevPath',
            TRUE
        ),
        (
            2,
            'devpath.squadmate@devpath.com',
            '김학습',
            FALSE,
            '프론트엔드 UI와 학습 경험 개선을 맡은 스쿼드 멤버입니다.',
            'DevPath Squadmate',
            'https://github.com/devpath-squadmate',
            FALSE
        )
) AS seed(
    sort_order, email, name, preserve_existing_name,
    bio, channel_name, github_url, is_owner
)
ORDER BY sort_order;
