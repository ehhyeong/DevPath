DELETE FROM workspace_hub_project
WHERE dom_id IN ('proj-squad-1', 'proj-mentor-1', 'proj-mentor-2')
   OR title IN (
      '배달비 절약 플랫폼',
      '대용량 트래픽 커머스',
      '대용량 트래픽 커머스 서버',
      'React Native 습관 챌린지 앱',
      'Next.js 블로그 플랫폼 구축',
      '포트폴리오 빌더 솔로',
      '멘토링 세션 워크스페이스'
   );

INSERT INTO workspace_hub_project (
    dom_id, menu_id, card_type, card_status, dashboard_url,
    title, description, progress_percent,
    mentoring_mode_label, mentoring_mode_icon, category_label, role_label,
    footer_kind, footer_date_label, member_avatar_seeds, extra_member_count,
    footer_avatar_seed, footer_text, footer_meta_text, footer_meta_icon,
    sort_order, is_deleted
)
VALUES
    (
      'proj-squad-1', 'menu-1', 'squad', 'progress', '/workspace-hub',
      '배달비 절약 플랫폼', '위치 기반 실시간 공동 구매 매칭 서비스 MVP 개발', 40,
      NULL, NULL, NULL, NULL,
      'avatars', to_char(CURRENT_DATE - 4, 'YYYY-MM-DD'), 'workspace-member-1,workspace-member-2', 2,
      NULL, NULL, NULL, NULL,
      1, FALSE
    ),
    (
      'proj-mentor-1', 'menu-2', 'mentoring', 'progress', '/workspace-hub',
      '대용량 트래픽 커머스 서버', 'Spring Boot와 Redis를 활용한 선착순 쿠폰 시스템 구현 실습', 20,
      '공통 과제형', 'fas fa-puzzle-piece mr-1', 'Backend', NULL,
      'mentor', NULL, NULL, NULL,
      'Jonas', '멘토링 워크스페이스', '진행중', 'fas fa-comment-dots mr-1',
      2, FALSE
    ),
    (
      'proj-mentor-2', 'menu-3', 'mentoring', 'progress', '/workspace-hub',
      'Next.js 블로그 플랫폼 구축', '팀원들과 역할을 나누어 기획부터 배포까지 완성하는 팀 프로젝트형 멘토링', 50,
      '팀 프로젝트형', 'fas fa-users mr-1', 'Frontend', NULL,
      'mentor', NULL, NULL, NULL,
      'Mobile', '멘토링 워크스페이스', '진행중', 'fas fa-comment-dots mr-1',
      3, FALSE
    );
