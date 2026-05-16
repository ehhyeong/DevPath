package com.devpath.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@RequiredArgsConstructor
public class LocalLearnerWorkspaceNormalizer implements CommandLineRunner {

  private final JdbcTemplate jdbcTemplate;

  @Override
  @Transactional
  public void run(String... args) {
    ensureAllowedWorkspaces();
    pruneLearnerWorkspaceMemberships();
    ensureAllowedWorkspaceMemberships();
    normalizeLegacyHubProjectRows();
    pruneLearnerMentorings();
    ensureLearnerMentorings();
  }

  private void ensureAllowedWorkspaces() {
    jdbcTemplate.execute(
        """
        INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
        SELECT learner.user_id, '배달비 절약 플랫폼',
               '위치 기반 실시간 공동 구매 매칭 서비스 MVP 개발',
               'SQUAD', 'ACTIVE', FALSE,
               TIMESTAMP '2026-03-23 15:00:00', TIMESTAMP '2026-03-23 15:00:00'
        FROM users learner
        WHERE learner.email = 'learner@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace
              WHERE owner_id = learner.user_id
                AND name = '배달비 절약 플랫폼'
          );

        INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
        SELECT learner.user_id, '대용량 트래픽 커머스 서버',
               '공통 과제형 멘토링으로 Spring Boot와 Redis를 활용한 선착순 쿠폰 시스템을 구현하는 워크스페이스',
               'MENTORING', 'ACTIVE', FALSE,
               TIMESTAMP '2026-03-25 09:00:00', TIMESTAMP '2026-03-25 09:00:00'
        FROM users learner
        WHERE learner.email = 'learner@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace
              WHERE owner_id = learner.user_id
                AND name = '대용량 트래픽 커머스 서버'
          );

        INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
        SELECT learner.user_id, 'Next.js 블로그 플랫폼 구축',
               '팀 프로젝트형 멘토링으로 역할을 나누어 Next.js 블로그 플랫폼을 완성하는 워크스페이스',
               'MENTORING', 'ACTIVE', FALSE,
               TIMESTAMP '2026-03-26 09:00:00', TIMESTAMP '2026-03-26 09:00:00'
        FROM users learner
        WHERE learner.email = 'learner@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace
              WHERE owner_id = learner.user_id
                AND name = 'Next.js 블로그 플랫폼 구축'
          );
        """);
  }

  private void pruneLearnerWorkspaceMemberships() {
    jdbcTemplate.execute(
        """
        DELETE FROM workspace_member member
        USING workspace workspace, users learner
        WHERE member.workspace_id = workspace.id
          AND member.learner_id = learner.user_id
          AND learner.email = 'learner@devpath.com'
          AND workspace.name NOT IN (
              '배달비 절약 플랫폼',
              '대용량 트래픽 커머스 서버',
              'Next.js 블로그 플랫폼 구축'
          );
        """);
  }

  private void ensureAllowedWorkspaceMemberships() {
    jdbcTemplate.execute(
        """
        INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
        SELECT workspace.id, learner.user_id, TIMESTAMP '2026-03-23 15:00:00'
        FROM users learner
        JOIN workspace workspace
          ON workspace.owner_id = learner.user_id
         AND workspace.name = '배달비 절약 플랫폼'
        WHERE learner.email = 'learner@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace_member member
              WHERE member.workspace_id = workspace.id
                AND member.learner_id = learner.user_id
          );

        INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
        SELECT workspace.id, learner.user_id, TIMESTAMP '2026-03-25 09:00:00'
        FROM users learner
        JOIN workspace workspace
          ON workspace.owner_id = learner.user_id
         AND workspace.name = '대용량 트래픽 커머스 서버'
        WHERE learner.email = 'learner@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace_member member
              WHERE member.workspace_id = workspace.id
                AND member.learner_id = learner.user_id
          );

        INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
        SELECT workspace.id, learner.user_id, TIMESTAMP '2026-03-26 09:00:00'
        FROM users learner
        JOIN workspace workspace
          ON workspace.owner_id = learner.user_id
         AND workspace.name = 'Next.js 블로그 플랫폼 구축'
        WHERE learner.email = 'learner@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace_member member
              WHERE member.workspace_id = workspace.id
                AND member.learner_id = learner.user_id
          );
        """);
  }

  private void normalizeLegacyHubProjectRows() {
    jdbcTemplate.execute(
        """
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
              'proj-squad-1', 'menu-1', 'squad', 'progress', 'workspace-hub.html',
              '배달비 절약 플랫폼', '위치 기반 실시간 공동 구매 매칭 서비스 MVP 개발', 40,
              NULL, NULL, NULL, NULL,
              'avatars', '2026-03-23', 'workspace-member-1,workspace-member-2', 2,
              NULL, NULL, NULL, NULL,
              1, FALSE
            ),
            (
              'proj-mentor-1', 'menu-2', 'mentoring', 'progress', 'workspace-hub.html',
              '대용량 트래픽 커머스 서버', 'Spring Boot와 Redis를 활용한 선착순 쿠폰 시스템 구현 실습', 20,
              '공통 과제형', 'fas fa-users mr-1', 'Backend', NULL,
              'mentor', NULL, NULL, NULL,
              'Jonas', '멘토링 워크스페이스', '진행중', 'fas fa-comment-dots mr-1',
              2, FALSE
            ),
            (
              'proj-mentor-2', 'menu-3', 'mentoring', 'progress', 'workspace-hub.html',
              'Next.js 블로그 플랫폼 구축', '팀원들과 역할을 나누어 기획부터 배포까지 완성하는 팀 프로젝트형 멘토링', 50,
              '팀 프로젝트형', 'fas fa-puzzle-piece mr-1', 'Frontend', NULL,
              'mentor', NULL, NULL, NULL,
              'Mobile', '멘토링 워크스페이스', '진행중', 'fas fa-comment-dots mr-1',
              3, FALSE
            );
        """);
  }

  private void pruneLearnerMentorings() {
    jdbcTemplate.execute(
        """
        DELETE FROM mentorings mentoring
        USING mentoring_posts post, users learner
        WHERE mentoring.mentoring_post_id = post.mentoring_post_id
          AND mentoring.mentee_id = learner.user_id
          AND learner.email = 'learner@devpath.com'
          AND post.title NOT IN ('대용량 트래픽 커머스 서버', 'Next.js 블로그 플랫폼 구축');

        DELETE FROM mentoring_applications application
        USING mentoring_posts post, users learner
        WHERE application.mentoring_post_id = post.mentoring_post_id
          AND application.applicant_id = learner.user_id
          AND learner.email = 'learner@devpath.com'
          AND post.title NOT IN ('대용량 트래픽 커머스 서버', 'Next.js 블로그 플랫폼 구축');

        DELETE FROM mentorings mentoring
        USING mentoring_posts post, users instructor
        WHERE mentoring.mentoring_post_id = post.mentoring_post_id
          AND post.mentor_id = instructor.user_id
          AND instructor.email = 'instructor@devpath.com'
          AND post.title = '스쿼드 런칭 팀 프로젝트 멘토링';

        DELETE FROM mentoring_applications application
        USING mentoring_posts post, users instructor
        WHERE application.mentoring_post_id = post.mentoring_post_id
          AND post.mentor_id = instructor.user_id
          AND instructor.email = 'instructor@devpath.com'
          AND post.title = '스쿼드 런칭 팀 프로젝트 멘토링';

        DELETE FROM mentoring_posts
        USING users instructor
        WHERE mentoring_posts.mentor_id = instructor.user_id
          AND instructor.email = 'instructor@devpath.com'
          AND mentoring_posts.title = '스쿼드 런칭 팀 프로젝트 멘토링';
        """);
  }

  private void ensureLearnerMentorings() {
    jdbcTemplate.execute(
        """
        INSERT INTO mentoring_posts (
            mentor_id, title, content, required_stacks, category, mentoring_type,
            duration_weeks, curriculum, deadline_at, current_participants,
            max_participants, view_count, status, is_deleted, created_at, updated_at
        )
        SELECT instructor.user_id,
               '대용량 트래픽 커머스 서버',
               '실제 운영 환경과 유사한 트래픽 시나리오를 경험합니다. 선착순 쿠폰 발급, 재고 동시성 이슈 등을 해결해보는 백엔드 심화 과정입니다. 각자 동일한 과제를 수행하며 개별 피드백을 받습니다.',
               'Spring Boot,Redis,Kafka',
               'Backend',
               'study',
               4,
               E'요구사항 분석 및 ERD 설계, 아키텍처 리뷰\\n회원/상품 기능 구현 및 단위 테스트 작성\\n대용량 트래픽 처리를 위한 Redis/Kafka 도입\\n부하 테스트 및 성능 최적화, 최종 발표',
               CURRENT_DATE + 14,
               5,
               10,
               0,
               'OPEN',
               FALSE,
               TIMESTAMP '2026-03-25 10:00:00',
               TIMESTAMP '2026-03-25 10:00:00'
        FROM users instructor
        WHERE instructor.email = 'instructor@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM mentoring_posts post
              WHERE post.title = '대용량 트래픽 커머스 서버'
                AND post.is_deleted = FALSE
          );

        INSERT INTO mentoring_posts (
            mentor_id, title, content, required_stacks, category, mentoring_type,
            duration_weeks, curriculum, deadline_at, current_participants,
            max_participants, view_count, status, is_deleted, created_at, updated_at
        )
        SELECT instructor.user_id,
               'Next.js 블로그 플랫폼 구축',
               '하나의 블로그 플랫폼을 팀원들과 역할을 나누어 기획부터 배포까지 완성합니다. SEO 최적화, 마크다운 파싱, 다크모드 등 모던 프론트엔드의 실무 스킬을 멘토와 함께 적용해봅니다.',
               'React,Next.js 14,Tailwind',
               'Frontend',
               'team',
               4,
               E'기획 리뷰 및 Next.js 14 App Router 뼈대 세팅\\n각 파트별 기능 구현\\n디자인 시스템 적용 및 다크모드 통합\\nVercel 배포 및 성능 튜닝, 팀 회고',
               CURRENT_DATE + 2,
               3,
               4,
               0,
               'OPEN',
               FALSE,
               TIMESTAMP '2026-03-26 10:00:00',
               TIMESTAMP '2026-03-26 10:00:00'
        FROM users instructor
        WHERE instructor.email = 'instructor@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM mentoring_posts post
              WHERE post.title = 'Next.js 블로그 플랫폼 구축'
                AND post.is_deleted = FALSE
          );

        INSERT INTO mentoring_applications (
            mentoring_post_id, applicant_id, message, status, reject_reason,
            processed_at, is_deleted, created_at, updated_at
        )
        SELECT post.mentoring_post_id,
               learner.user_id,
               '공통 과제형 멘토링으로 대용량 트래픽 과제를 수행하며 피드백을 받고 싶습니다.',
               'APPROVED',
               NULL,
               TIMESTAMP '2026-03-25 10:20:00',
               FALSE,
               TIMESTAMP '2026-03-25 10:15:00',
               TIMESTAMP '2026-03-25 10:20:00'
        FROM mentoring_posts post
        JOIN users learner ON learner.email = 'learner@devpath.com'
        WHERE post.title = '대용량 트래픽 커머스 서버'
          AND NOT EXISTS (
              SELECT 1 FROM mentoring_applications application
              WHERE application.mentoring_post_id = post.mentoring_post_id
                AND application.applicant_id = learner.user_id
          );

        INSERT INTO mentoring_applications (
            mentoring_post_id, applicant_id, message, status, reject_reason,
            processed_at, is_deleted, created_at, updated_at
        )
        SELECT post.mentoring_post_id,
               learner.user_id,
               '팀 프로젝트형 멘토링으로 Next.js 블로그 플랫폼을 역할 분담해서 완성하고 싶습니다.',
               'APPROVED',
               NULL,
               TIMESTAMP '2026-03-26 10:20:00',
               FALSE,
               TIMESTAMP '2026-03-26 10:15:00',
               TIMESTAMP '2026-03-26 10:20:00'
        FROM mentoring_posts post
        JOIN users learner ON learner.email = 'learner@devpath.com'
        WHERE post.title = 'Next.js 블로그 플랫폼 구축'
          AND NOT EXISTS (
              SELECT 1 FROM mentoring_applications application
              WHERE application.mentoring_post_id = post.mentoring_post_id
                AND application.applicant_id = learner.user_id
          );

        INSERT INTO mentorings (
            mentoring_post_id, mentor_id, mentee_id, status, started_at,
            ended_at, is_deleted, created_at, updated_at
        )
        SELECT post.mentoring_post_id,
               post.mentor_id,
               learner.user_id,
               'ONGOING',
               TIMESTAMP '2026-03-25 11:00:00',
               NULL,
               FALSE,
               TIMESTAMP '2026-03-25 11:00:00',
               TIMESTAMP '2026-03-25 11:00:00'
        FROM mentoring_posts post
        JOIN users learner ON learner.email = 'learner@devpath.com'
        WHERE post.title = '대용량 트래픽 커머스 서버'
          AND NOT EXISTS (
              SELECT 1 FROM mentorings mentoring
              WHERE mentoring.mentoring_post_id = post.mentoring_post_id
                AND mentoring.mentee_id = learner.user_id
          );

        INSERT INTO mentorings (
            mentoring_post_id, mentor_id, mentee_id, status, started_at,
            ended_at, is_deleted, created_at, updated_at
        )
        SELECT post.mentoring_post_id,
               post.mentor_id,
               learner.user_id,
               'ONGOING',
               TIMESTAMP '2026-03-26 11:00:00',
               NULL,
               FALSE,
               TIMESTAMP '2026-03-26 11:00:00',
               TIMESTAMP '2026-03-26 11:00:00'
        FROM mentoring_posts post
        JOIN users learner ON learner.email = 'learner@devpath.com'
        WHERE post.title = 'Next.js 블로그 플랫폼 구축'
          AND NOT EXISTS (
              SELECT 1 FROM mentorings mentoring
              WHERE mentoring.mentoring_post_id = post.mentoring_post_id
                AND mentoring.mentee_id = learner.user_id
          );
        """);
  }
}
