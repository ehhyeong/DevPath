SELECT *
FROM (
    VALUES
        (
            'proj-squad-1', 'menu-1', 'squad', 'progress', '/workspace-hub',
            '배달비 절약 플랫폼', '위치 기반 실시간 공동 구매 매칭 서비스 MVP 개발', 40,
            NULL, NULL, NULL, NULL, 'avatars', '어제', 'A,B', 2,
            NULL, NULL, NULL, NULL, 1
        ),
        (
            'proj-mentor-1', 'menu-2', 'mentoring', 'progress', '/workspace-hub',
            '대용량 트래픽 커머스', 'Spring Boot & Redis를 활용한 선착순 쿠폰 시스템 구현 실습', 20,
            '공통 과제형', 'fas fa-puzzle-piece mr-1', 'Backend', NULL, 'mentor', NULL, NULL, NULL,
            'Jonas', '멘토 코드마스터 J', '리뷰 대기중', 'fas fa-comment-dots mr-1', 2
        ),
        (
            'proj-mentor-2', 'menu-3', 'mentoring', 'progress', '/workspace-hub',
            'React Native 습관 챌린지 앱', '기획부터 앱스토어 런칭까지 한 사이클을 경험하는 실전 프로젝트', 50,
            '팀 프로젝트형', 'fas fa-users mr-1', 'App', '💻 Backend', 'mentor', NULL, NULL, NULL,
            'Mobile', '멘토 1명, 팀원 4명', '2주차 진행중', NULL, 3
        )
) AS seed(
    dom_id, menu_id, card_type, card_status, dashboard_url,
    title, description, progress_percent,
    mentoring_mode_label, mentoring_mode_icon, category_label, role_label,
    footer_kind, footer_date_label, member_avatar_seeds, extra_member_count,
    footer_avatar_seed, footer_text, footer_meta_text, footer_meta_icon, sort_order
)
ORDER BY sort_order;
