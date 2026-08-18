SELECT owner_email, name, description, project_type, workspace_type, project_status, member_emails
FROM (
    VALUES
        (
            1, 'project.frontend@devpath.com', '포트폴리오 빌더 솔로',
            '개인 포트폴리오 제작을 위한 솔로 워크스페이스. React, Spring Boot, PDF 자동화를 실험합니다.',
            'SOLO', 'SOLO', 'IN_PROGRESS', 'project.frontend@devpath.com'
        ),
        (
            2, 'project.backend@devpath.com', 'DevPath 팀 워크스페이스',
            '팀 협업과 멘토링 리뷰 흐름을 검증하는 스쿼드 워크스페이스. API, 알림, 회의 기록을 연결합니다.',
            'SQUAD', 'SQUAD', 'IN_PROGRESS',
            'project.frontend@devpath.com,project.backend@devpath.com,project.pm@devpath.com,project.ai@devpath.com'
        ),
        (
            3, 'project.pm@devpath.com', 'Next.js 스터디 운영툴',
            '스터디 모집부터 과제 제출까지 운영하는 프로젝트. 진행 기록과 쇼케이스 제출을 함께 관리합니다.',
            'SQUAD', 'SQUAD', 'COMPLETED',
            'project.frontend@devpath.com,project.pm@devpath.com,project.ai@devpath.com'
        )
) AS seed(
    sort_order, owner_email, name, description,
    project_type, workspace_type, project_status, member_emails
)
ORDER BY sort_order;
