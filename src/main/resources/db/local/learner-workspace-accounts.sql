SELECT email, name, bio, profile_image
FROM (
    VALUES
        (
            1,
            'assignment.backend.api@devpath.com',
            '박민준',
            'Spring Boot와 Redis 과제를 진행 중인 백엔드 학습자입니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=assignment-backend-api'
        ),
        (
            2,
            'assignment.backend.test@devpath.com',
            '정서연',
            '테스트 코드와 장애 재현을 중심으로 학습합니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=assignment-backend-test'
        ),
        (
            3,
            'assignment.backend.ops@devpath.com',
            '최현우',
            '성능 측정과 운영 체크리스트를 맡고 있습니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=assignment-backend-ops'
        ),
        (
            4,
            'team.frontend.ui@devpath.com',
            '김유나',
            'Next.js App Router와 인터랙션 구현을 맡은 프론트엔드 학습자입니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=team-frontend-ui'
        ),
        (
            5,
            'team.frontend.api@devpath.com',
            '오지훈',
            '콘텐츠 API와 배포 파이프라인 연동을 담당합니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=team-frontend-api'
        ),
        (
            6,
            'team.frontend.design@devpath.com',
            '문서윤',
            '블로그 플랫폼의 디자인 시스템과 QA 플로우를 담당합니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=team-frontend-design'
        )
) AS seed(sort_order, email, name, bio, profile_image)
ORDER BY sort_order;
