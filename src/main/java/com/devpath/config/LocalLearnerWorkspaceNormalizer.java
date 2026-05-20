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
    ensureWorkspaceTaskStatusConstraint();
    ensureSquadWorkspaceTasks();
    ensureSquadCalendarEvents();
    ensureSquadCodeReviewSchema();
    ensureSquadCodeReviewData();
    ensureSquadErdSchema();
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
               CURRENT_DATE - 4 + TIME '15:00', CURRENT_DATE - 4 + TIME '15:00'
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
               CURRENT_DATE - 2 + TIME '09:00', CURRENT_DATE - 2 + TIME '09:00'
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
               CURRENT_DATE - 1 + TIME '09:00', CURRENT_DATE - 1 + TIME '09:00'
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
        SELECT workspace.id, learner.user_id, CURRENT_DATE - 4 + TIME '15:00'
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
        SELECT workspace.id, learner.user_id, CURRENT_DATE - 2 + TIME '09:00'
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
        SELECT workspace.id, learner.user_id, CURRENT_DATE - 1 + TIME '09:00'
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

  private void ensureWorkspaceTaskStatusConstraint() {
    jdbcTemplate.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('public.workspace_task') IS NULL THEN
                RETURN;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = 'public.workspace_task'::regclass
                  AND conname = 'workspace_task_status_check'
            ) THEN
                ALTER TABLE public.workspace_task DROP CONSTRAINT workspace_task_status_check;
            END IF;

            ALTER TABLE public.workspace_task
                ADD CONSTRAINT workspace_task_status_check
                CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'));
        END $$;
        """);
  }

  private void ensureSquadWorkspaceTasks() {
    jdbcTemplate.execute(
        """
        WITH learner AS (
            SELECT user_id FROM users WHERE email = 'learner@devpath.com'
        ),
        squad_workspace AS (
            SELECT workspace.id
            FROM workspace
            JOIN workspace_member member ON member.workspace_id = workspace.id
            JOIN learner ON learner.user_id = member.learner_id
            WHERE workspace.type = 'SQUAD'
              AND workspace.is_deleted = FALSE
            ORDER BY workspace.created_at
            LIMIT 1
        )
        INSERT INTO workspace_task (
            workspace_id, title, description, status, priority,
            assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at
        )
        SELECT squad_workspace.id, seed.title, seed.description, seed.status, seed.priority,
               learner.user_id, seed.due_date, learner.user_id, FALSE, seed.created_at, seed.created_at
        FROM squad_workspace
        CROSS JOIN learner
        CROSS JOIN (
            VALUES
                (
                  '메인 화면 반응형 UI 리빌딩',
                  'React와 Tailwind 기반으로 홈 피드와 모집 카드의 모바일/데스크톱 레이아웃을 정리합니다.',
                  'TODO',
                  'MEDIUM',
                  CURRENT_DATE + 7,
                  CURRENT_DATE - 4 + TIME '16:00'
                ),
                (
                  '결제 모듈 연동 API 구현',
                  '주문 생성, 결제 승인, 실패 롤백 흐름을 Spring Boot API로 구현합니다.',
                  'IN_PROGRESS',
                  'HIGH',
                  CURRENT_DATE + 1,
                  CURRENT_DATE - 3 + TIME '10:00'
                ),
                (
                  '카카오 소셜 로그인 프론트 연동',
                  'OAuth 리다이렉트 이후 토큰 저장과 사용자 프로필 동기화 흐름을 점검합니다.',
                  'IN_REVIEW',
                  'MEDIUM',
                  CURRENT_DATE,
                  CURRENT_DATE - 2 + TIME '11:00'
                ),
                (
                  'MVP 배포 체크리스트 작성',
                  '환경변수, DB 마이그레이션, 장애 대응 항목을 정리하고 팀 리뷰를 완료합니다.',
                  'DONE',
                  'LOW',
                  CURRENT_DATE - 1,
                  CURRENT_DATE - 1 + TIME '13:00'
                )
        ) AS seed(title, description, status, priority, due_date, created_at)
        WHERE NOT EXISTS (
            SELECT 1
            FROM workspace_task existing
            WHERE existing.workspace_id = squad_workspace.id
              AND existing.title = seed.title
              AND existing.is_deleted = FALSE
        );
        """);
  }

  private void ensureSquadCalendarEvents() {
    jdbcTemplate.execute(
        """
        WITH learner AS (
            SELECT user_id FROM users WHERE email = 'learner@devpath.com'
        ),
        squad_workspace AS (
            SELECT workspace.id
            FROM workspace
            JOIN workspace_member member ON member.workspace_id = workspace.id
            JOIN learner ON learner.user_id = member.learner_id
            WHERE workspace.type = 'SQUAD'
              AND workspace.is_deleted = FALSE
            ORDER BY workspace.created_at
            LIMIT 1
        )
        INSERT INTO calendar_event (
            workspace_id, title, description, start_at, end_at,
            created_by_id, is_deleted, created_at, updated_at
        )
        SELECT squad_workspace.id, seed.title, seed.description,
               (CURRENT_DATE + seed.day_offset + seed.start_time)::timestamp,
               (CURRENT_DATE + seed.day_offset + seed.end_time)::timestamp,
               learner.user_id, FALSE, seed.created_at, seed.created_at
        FROM squad_workspace
        CROSS JOIN learner
        CROSS JOIN (
            VALUES
                (
                  'DB ERD 설계 리뷰',
                  '[schedule-category:task-be]' || chr(10) || '테이블 관계와 인덱스 설계를 함께 검토합니다.',
                  -2,
                  TIME '10:00',
                  TIME '11:00',
                  CURRENT_DATE - 4 + TIME '17:00'
                ),
                (
                  '카카오 소셜 로그인 연동',
                  '[schedule-category:task-fe]' || chr(10) || 'OAuth 리다이렉트와 프론트 인증 상태를 확인합니다.',
                  0,
                  TIME '14:00',
                  TIME '15:00',
                  CURRENT_DATE - 3 + TIME '09:30'
                ),
                (
                  '결제 모듈 API 구현',
                  '[schedule-category:task-be]' || chr(10) || '주문 생성과 결제 승인 API 흐름을 마무리합니다.',
                  1,
                  TIME '10:00',
                  TIME '12:00',
                  CURRENT_DATE - 2 + TIME '09:30'
                ),
                (
                  '스프린트 2주차 마감',
                  '[schedule-category:milestone]' || chr(10) || '리뷰 대기 작업을 정리하고 데모 범위를 확정합니다.',
                  3,
                  TIME '18:00',
                  TIME '19:00',
                  CURRENT_DATE - 1 + TIME '09:30'
                ),
                (
                  '중간 회고 회의',
                  '[schedule-category:meeting]' || chr(10) || '진행 리스크와 다음 스프린트 우선순위를 공유합니다.',
                  5,
                  TIME '20:00',
                  TIME '21:00',
                  CURRENT_DATE + TIME '09:30'
                ),
                (
                  '메인 화면 UI 퍼블리싱',
                  '[schedule-category:task-fe]' || chr(10) || '랜딩 카드와 모바일 반응형 레이아웃을 정리합니다.',
                  7,
                  TIME '13:00',
                  TIME '15:00',
                  CURRENT_DATE + 1 + TIME '09:30'
                )
        ) AS seed(title, description, day_offset, start_time, end_time, created_at)
        WHERE NOT EXISTS (
            SELECT 1
            FROM calendar_event existing
            WHERE existing.workspace_id = squad_workspace.id
              AND existing.title = seed.title
              AND existing.is_deleted = FALSE
        );
        """);
  }

  private void ensureSquadCodeReviewSchema() {
    jdbcTemplate.execute(
        """
        CREATE TABLE IF NOT EXISTS workspace_code_reviews (
            id bigserial PRIMARY KEY,
            workspace_id bigint NOT NULL,
            title varchar(180) NOT NULL,
            description text,
            pr_url varchar(1000),
            file_path varchar(300) NOT NULL DEFAULT 'src/main/java/com/devpath/auth/AuthService.java',
            diff_text text NOT NULL,
            source_branch varchar(120) NOT NULL DEFAULT 'feature/manual-review',
            target_branch varchar(120) NOT NULL DEFAULT 'main',
            author_id bigint NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'OPEN',
            additions integer NOT NULL DEFAULT 0,
            deletions integer NOT NULL DEFAULT 0,
            ai_code_review_id bigint,
            is_deleted boolean NOT NULL DEFAULT false,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_workspace
            ON workspace_code_reviews(workspace_id, status, created_at DESC);

        CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_ai
            ON workspace_code_reviews(ai_code_review_id);

        CREATE TABLE IF NOT EXISTS workspace_code_review_comments (
            id bigserial PRIMARY KEY,
            review_id bigint NOT NULL,
            workspace_id bigint NOT NULL,
            author_id bigint NOT NULL,
            body text NOT NULL,
            status_label varchar(50) NOT NULL DEFAULT 'Commented',
            is_deleted boolean NOT NULL DEFAULT false,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS ix_workspace_code_review_comments_review
            ON workspace_code_review_comments(workspace_id, review_id, created_at ASC);
        """);
  }

  private void ensureSquadCodeReviewData() {
    jdbcTemplate.execute(
        """
        WITH learner AS (
            SELECT user_id FROM users WHERE email = 'learner@devpath.com'
        ),
        squad_workspace AS (
            SELECT workspace.id
            FROM workspace
            JOIN workspace_member member ON member.workspace_id = workspace.id
            JOIN learner ON learner.user_id = member.learner_id
            WHERE workspace.type = 'SQUAD'
              AND workspace.is_deleted = FALSE
            ORDER BY workspace.created_at
            LIMIT 1
        ),
        seed AS (
            SELECT *
            FROM (
                VALUES
                    (
                      'feat: 카카오 소셜 로그인 OAuth2 연동 및 JWT 발급 추가',
                      'OAuth 리다이렉트 이후 사용자 조회, 토큰 발급, 응답 DTO까지 머지 전에 확인합니다.',
                      'src/main/java/com/devpath/auth/AuthService.java',
                      'feature/auth-kakao',
                      'main',
                      E'    public AuthResponse login(LoginRequest request) {\\n        User user = userRepository.findByEmail(request.getEmail())\\n-           .orElseThrow(() -> new UserNotFoundException());\\n+           .orElseThrow(() -> new CustomApiException(ErrorCode.USER_NOT_FOUND));\\n+       // TODO: 카카오 액세스 토큰 검증 로직 추가\\n+       String jwtToken = jwtProvider.generateToken(user.getId(), user.getRole());\\n        return new AuthResponse(jwtToken);\\n    }',
                      'OPEN',
                      3,
                      1,
                      CURRENT_DATE + TIME '09:30'
                    ),
                    (
                      'fix: 결제 승인 실패 시 주문 상태 롤백 처리',
                      '결제 승인 API 실패 케이스에서 주문과 재고 상태가 일관되게 복구되는지 확인합니다.',
                      'src/main/java/com/devpath/payment/PaymentService.java',
                      'fix/payment-rollback',
                      'main',
                      E'+   if (!approvalResult.success()) {\\n+       order.cancel();\\n+       stockService.restore(order.getItems());\\n+       throw new CustomApiException(ErrorCode.INVALID_PAYMENT);\\n+   }',
                      'OPEN',
                      4,
                      0,
                      CURRENT_DATE + TIME '10:20'
                    ),
                    (
                      'test: 불필요한 콘솔 로그 삭제 작업',
                      '배포 전 디버깅 로그를 정리한 PR입니다.',
                      'frontend/src/pages/payment/PaymentResult.tsx',
                      'chore/remove-console',
                      'main',
                      E'- console.log(paymentResult);\\n+ logger.debug("payment result loaded");',
                      'CLOSED',
                      1,
                      1,
                      CURRENT_DATE - 5 + TIME '14:00'
                    )
            ) AS seed_values(title, description, file_path, source_branch, target_branch, diff_text, status, additions, deletions, created_at)
        )
        INSERT INTO workspace_code_reviews (
            workspace_id, title, description, file_path, source_branch, target_branch,
            diff_text, author_id, status, additions, deletions, ai_code_review_id,
            is_deleted, created_at, updated_at
        )
        SELECT squad_workspace.id, seed.title, seed.description, seed.file_path, seed.source_branch,
               seed.target_branch, seed.diff_text, learner.user_id, seed.status,
               seed.additions, seed.deletions, NULL, FALSE, seed.created_at, seed.created_at
        FROM squad_workspace
        CROSS JOIN learner
        CROSS JOIN seed
        WHERE NOT EXISTS (
            SELECT 1
            FROM workspace_code_reviews existing
            WHERE existing.workspace_id = squad_workspace.id
              AND existing.title = seed.title
              AND existing.is_deleted = FALSE
        );
        """);
  }

  private void ensureSquadErdSchema() {
    jdbcTemplate.execute(
        """
        CREATE TABLE IF NOT EXISTS workspace_erd_documents (
            workspace_id bigint PRIMARY KEY,
            mermaid_code text NOT NULL,
            schema_json text NOT NULL,
            version integer NOT NULL DEFAULT 1,
            updated_by_id bigint,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        );
        """);
    jdbcTemplate.execute(
        """
        CREATE TABLE IF NOT EXISTS workspace_erd_versions (
            version_id bigserial PRIMARY KEY,
            workspace_id bigint NOT NULL,
            version integer NOT NULL,
            mermaid_code text NOT NULL,
            schema_json text NOT NULL,
            summary varchar(500),
            updated_by_id bigint,
            discussion_message_id bigint,
            created_at timestamp NOT NULL DEFAULT now(),
            CONSTRAINT workspace_erd_versions_unique UNIQUE (workspace_id, version)
        );
        """);
    jdbcTemplate.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_workspace_erd_versions_workspace
            ON workspace_erd_versions(workspace_id, version DESC);
        """);
    jdbcTemplate.execute(
        """
        CREATE TABLE IF NOT EXISTS workspace_erd_comments (
            comment_id bigserial PRIMARY KEY,
            workspace_id bigint NOT NULL,
            target_type varchar(30) NOT NULL,
            target_id varchar(200) NOT NULL,
            target_label varchar(200),
            author_id bigint NOT NULL,
            body text NOT NULL,
            is_deleted boolean NOT NULL DEFAULT false,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        );
        """);
    jdbcTemplate.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_workspace_erd_comments_target
            ON workspace_erd_comments(workspace_id, target_type, target_id, created_at ASC);
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
              'avatars', to_char(CURRENT_DATE - 4, 'YYYY-MM-DD'), 'workspace-member-1,workspace-member-2', 2,
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
               CURRENT_DATE - 2 + TIME '10:00',
               CURRENT_DATE - 2 + TIME '10:00'
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
               CURRENT_DATE - 1 + TIME '10:00',
               CURRENT_DATE - 1 + TIME '10:00'
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
               CURRENT_DATE - 2 + TIME '10:20',
               FALSE,
               CURRENT_DATE - 2 + TIME '10:15',
               CURRENT_DATE - 2 + TIME '10:20'
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
               CURRENT_DATE - 1 + TIME '10:20',
               FALSE,
               CURRENT_DATE - 1 + TIME '10:15',
               CURRENT_DATE - 1 + TIME '10:20'
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
               CURRENT_DATE - 2 + TIME '11:00',
               NULL,
               FALSE,
               CURRENT_DATE - 2 + TIME '11:00',
               CURRENT_DATE - 2 + TIME '11:00'
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
               CURRENT_DATE - 1 + TIME '11:00',
               NULL,
               FALSE,
               CURRENT_DATE - 1 + TIME '11:00',
               CURRENT_DATE - 1 + TIME '11:00'
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
