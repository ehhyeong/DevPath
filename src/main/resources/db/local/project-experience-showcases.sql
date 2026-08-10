SELECT owner_email, title, description, thumbnail_url, category, initial_views
FROM (
    VALUES
        (
            1, 'project.frontend@devpath.com', 'DevPath 포트폴리오 빌더',
            '학습 기록과 프로젝트 경험을 모아 PDF 포트폴리오로 정리하는 웹 서비스입니다.',
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900', 'FULLSTACK', 36
        ),
        (
            2, 'project.backend@devpath.com', 'AI 코드 리뷰 대시보드',
            'PR 리뷰 결과를 위험도, 수정 가이드, 히스토리로 분류해서 팀 단위로 추적합니다.',
            'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=900', 'AI', 42
        ),
        (
            3, 'project.ai@devpath.com', '스터디 매칭 모바일 MVP',
            '관심 스택과 시간대를 기반으로 스터디원을 추천하고 출석을 관리하는 모바일 MVP입니다.',
            'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900', 'MOBILE', 28
        )
) AS seed(sort_order, owner_email, title, description, thumbnail_url, category, initial_views)
ORDER BY sort_order;
