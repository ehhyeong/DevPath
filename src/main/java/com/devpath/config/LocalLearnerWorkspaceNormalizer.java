package com.devpath.config;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@RequiredArgsConstructor
public class LocalLearnerWorkspaceNormalizer implements CommandLineRunner {

  private static final String SEED_PASSWORD = "devpath1234";

  private static final List<LearnerSeed> BACKEND_MENTORING_LEARNERS =
      List.of(
          new LearnerSeed(
              "assignment.backend.api@devpath.com",
              "박민준",
              "Spring Boot와 Redis 과제를 진행 중인 백엔드 학습자입니다.",
              "https://api.dicebear.com/7.x/avataaars/svg?seed=assignment-backend-api"),
          new LearnerSeed(
              "assignment.backend.test@devpath.com",
              "정서연",
              "테스트 코드와 장애 재현을 중심으로 학습합니다.",
              "https://api.dicebear.com/7.x/avataaars/svg?seed=assignment-backend-test"),
          new LearnerSeed(
              "assignment.backend.ops@devpath.com",
              "최현우",
              "성능 측정과 운영 체크리스트를 맡고 있습니다.",
              "https://api.dicebear.com/7.x/avataaars/svg?seed=assignment-backend-ops"));

  private static final List<LearnerSeed> FRONTEND_TEAM_LEARNERS =
      List.of(
          new LearnerSeed(
              "team.frontend.ui@devpath.com",
              "김유나",
              "Next.js App Router와 인터랙션 구현을 맡은 프론트엔드 학습자입니다.",
              "https://api.dicebear.com/7.x/avataaars/svg?seed=team-frontend-ui"),
          new LearnerSeed(
              "team.frontend.api@devpath.com",
              "오지훈",
              "콘텐츠 API와 배포 파이프라인 연동을 담당합니다.",
              "https://api.dicebear.com/7.x/avataaars/svg?seed=team-frontend-api"),
          new LearnerSeed(
              "team.frontend.design@devpath.com",
              "문서윤",
              "블로그 플랫폼의 디자인 시스템과 QA 플로우를 담당합니다.",
              "https://api.dicebear.com/7.x/avataaars/svg?seed=team-frontend-design"));

  private final JdbcTemplate jdbcTemplate;
  private final PasswordEncoder passwordEncoder;

  @Override
  @Transactional
  public void run(String... args) {
    ensureSeedLearners(BACKEND_MENTORING_LEARNERS);
    ensureSeedLearners(FRONTEND_TEAM_LEARNERS);
    ensureAllowedWorkspaces();
    ensureMentoringWorkspaceOwners();
    ensureMentoringPositionSchema();
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
    ensureBackendMentoringAssignmentWorkspaceData();
    ensureFrontendTeamWorkspaceData();
  }

  private void ensureSeedLearners(List<LearnerSeed> learners) {
    learners.forEach(
        seed -> {
          jdbcTemplate.update(
              """
              INSERT INTO users (email, password, name, role_name, is_active, created_at, updated_at)
              SELECT ?, ?, ?, 'ROLE_LEARNER', TRUE, now(), now()
              WHERE NOT EXISTS (
                  SELECT 1
                  FROM users
                  WHERE email = ?
              )
              """,
              seed.email(),
              passwordEncoder.encode(SEED_PASSWORD),
              seed.name(),
              seed.email());

          jdbcTemplate.update(
              """
              UPDATE users
                 SET name = ?,
                     is_active = TRUE,
                     updated_at = now()
               WHERE email = ?
                 AND (
                     name IS DISTINCT FROM ?
                     OR is_active IS DISTINCT FROM TRUE
                 )
              """,
              seed.name(),
              seed.email(),
              seed.name());

          jdbcTemplate.update(
              """
              INSERT INTO user_profiles (
                  user_id, profile_image, channel_name, bio, is_public, created_at, updated_at
              )
              SELECT user_id, ?, ?, ?, TRUE, now(), now()
              FROM users
              WHERE email = ?
                AND NOT EXISTS (
                    SELECT 1
                    FROM user_profiles profile
                    WHERE profile.user_id = users.user_id
                )
              """,
              seed.profileImage(),
              seed.name(),
              seed.bio(),
              seed.email());
        });
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
        SELECT mentor.user_id, '대용량 트래픽 커머스 서버',
               '공통 과제형 멘토링으로 Spring Boot와 Redis를 활용한 선착순 쿠폰 시스템을 구현하는 워크스페이스',
               'MENTORING', 'ACTIVE', FALSE,
               CURRENT_DATE - 2 + TIME '09:00', CURRENT_DATE - 2 + TIME '09:00'
        FROM users mentor
        WHERE mentor.email = 'mentor.backend@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace
              WHERE name = '대용량 트래픽 커머스 서버'
                AND type = 'MENTORING'
                AND COALESCE(is_deleted, FALSE) = FALSE
          );

        INSERT INTO workspace (owner_id, name, description, type, status, is_deleted, created_at, updated_at)
        SELECT mentor.user_id, 'Next.js 블로그 플랫폼 구축',
               '팀 프로젝트형 멘토링으로 역할을 나누어 Next.js 블로그 플랫폼을 완성하는 워크스페이스',
               'MENTORING', 'ACTIVE', FALSE,
               CURRENT_DATE - 1 + TIME '09:00', CURRENT_DATE - 1 + TIME '09:00'
        FROM users mentor
        WHERE mentor.email = 'mentor.frontend@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace
              WHERE name = 'Next.js 블로그 플랫폼 구축'
                AND type = 'MENTORING'
                AND COALESCE(is_deleted, FALSE) = FALSE
          );
        """);
  }

  private void ensureMentoringWorkspaceOwners() {
    jdbcTemplate.execute(
        """
        UPDATE workspace workspace
           SET owner_id = mentor.user_id,
               updated_at = now()
          FROM users mentor
         WHERE mentor.email = 'mentor.backend@devpath.com'
           AND workspace.name = '대용량 트래픽 커머스 서버'
           AND workspace.type = 'MENTORING'
           AND COALESCE(workspace.is_deleted, FALSE) = FALSE
           AND workspace.owner_id IS DISTINCT FROM mentor.user_id;

        UPDATE workspace workspace
           SET owner_id = mentor.user_id,
               updated_at = now()
          FROM users mentor
         WHERE mentor.email = 'mentor.frontend@devpath.com'
           AND workspace.name = 'Next.js 블로그 플랫폼 구축'
           AND workspace.type = 'MENTORING'
           AND COALESCE(workspace.is_deleted, FALSE) = FALSE
           AND workspace.owner_id IS DISTINCT FROM mentor.user_id;
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
          ON workspace.name = '대용량 트래픽 커머스 서버'
         AND workspace.type = 'MENTORING'
         AND COALESCE(workspace.is_deleted, FALSE) = FALSE
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
          ON workspace.name = 'Next.js 블로그 플랫폼 구축'
         AND workspace.type = 'MENTORING'
         AND COALESCE(workspace.is_deleted, FALSE) = FALSE
        WHERE learner.email = 'learner@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace_member member
              WHERE member.workspace_id = workspace.id
                AND member.learner_id = learner.user_id
          );

        INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
        SELECT workspace.id, mentor.user_id, CURRENT_DATE - 2 + TIME '09:00'
        FROM users mentor
        JOIN workspace workspace
          ON workspace.owner_id = mentor.user_id
         AND workspace.name = '대용량 트래픽 커머스 서버'
         AND workspace.type = 'MENTORING'
         AND COALESCE(workspace.is_deleted, FALSE) = FALSE
        WHERE mentor.email = 'mentor.backend@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace_member member
              WHERE member.workspace_id = workspace.id
                AND member.learner_id = mentor.user_id
          );

        INSERT INTO workspace_member (workspace_id, learner_id, joined_at)
        SELECT workspace.id, mentor.user_id, CURRENT_DATE - 1 + TIME '09:00'
        FROM users mentor
        JOIN workspace workspace
          ON workspace.owner_id = mentor.user_id
         AND workspace.name = 'Next.js 블로그 플랫폼 구축'
         AND workspace.type = 'MENTORING'
         AND COALESCE(workspace.is_deleted, FALSE) = FALSE
        WHERE mentor.email = 'mentor.frontend@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM workspace_member member
              WHERE member.workspace_id = workspace.id
                AND member.learner_id = mentor.user_id
          );

        UPDATE workspace_member member
           SET position_label = 'Frontend 개발자'
          FROM workspace workspace, users learner
         WHERE member.workspace_id = workspace.id
           AND member.learner_id = learner.user_id
           AND workspace.name = 'Next.js 블로그 플랫폼 구축'
           AND workspace.type = 'MENTORING'
           AND learner.email = 'learner@devpath.com'
           AND member.position_label IS DISTINCT FROM 'Frontend 개발자';
        """);
  }

  private void ensureMentoringPositionSchema() {
    jdbcTemplate.execute(
        """
        ALTER TABLE workspace_member
            ADD COLUMN IF NOT EXISTS position_label VARCHAR(80);

        ALTER TABLE workspace_member
            ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP(6);

        ALTER TABLE mentoring_applications
            ADD COLUMN IF NOT EXISTS desired_position VARCHAR(80);
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

  private void ensureBackendMentoringAssignmentWorkspaceData() {
    jdbcTemplate.execute(
        """
        WITH backend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.backend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 7
                  OR workspace.name = '대용량 트래픽 커머스 서버'
              )
            ORDER BY CASE WHEN workspace.id = 7 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        participants(email, position_label, joined_day_offset, active_day_offset, active_time) AS (
            VALUES
                ('learner@devpath.com', 'Backend API', -2, 0, TIME '10:10'),
                ('assignment.backend.api@devpath.com', 'Backend API', -2, 0, TIME '11:20'),
                ('assignment.backend.test@devpath.com', 'QA/Test', -2, -1, TIME '18:40'),
                ('assignment.backend.ops@devpath.com', 'Performance/Ops', -2, -2, TIME '21:15')
        )
        INSERT INTO workspace_member (
            workspace_id, learner_id, joined_at, last_active_at, position_label
        )
        SELECT backend_workspace.id,
               learner.user_id,
               CURRENT_DATE + participants.joined_day_offset + TIME '09:00',
               CURRENT_DATE + participants.active_day_offset + participants.active_time,
               participants.position_label
        FROM backend_workspace
        JOIN participants ON TRUE
        JOIN users learner ON learner.email = participants.email
        WHERE NOT EXISTS (
            SELECT 1
            FROM workspace_member member
            WHERE member.workspace_id = backend_workspace.id
              AND member.learner_id = learner.user_id
        );

        WITH backend_workspace AS (
            SELECT workspace.id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.backend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 7
                  OR workspace.name = '대용량 트래픽 커머스 서버'
              )
            ORDER BY CASE WHEN workspace.id = 7 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        participants(email, position_label, active_day_offset, active_time) AS (
            VALUES
                ('learner@devpath.com', 'Backend API', 0, TIME '10:10'),
                ('assignment.backend.api@devpath.com', 'Backend API', 0, TIME '11:20'),
                ('assignment.backend.test@devpath.com', 'QA/Test', -1, TIME '18:40'),
                ('assignment.backend.ops@devpath.com', 'Performance/Ops', -2, TIME '21:15')
        )
        UPDATE workspace_member member
           SET position_label = participants.position_label,
               last_active_at = CURRENT_DATE + participants.active_day_offset + participants.active_time
          FROM backend_workspace, participants, users learner
         WHERE member.workspace_id = backend_workspace.id
           AND member.learner_id = learner.user_id
           AND learner.email = participants.email
           AND (
               member.position_label IS DISTINCT FROM participants.position_label
               OR member.last_active_at IS DISTINCT FROM CURRENT_DATE + participants.active_day_offset + participants.active_time
           );

        WITH backend_post AS (
            SELECT post.mentoring_post_id
            FROM mentoring_posts post
            JOIN users mentor ON mentor.user_id = post.mentor_id
            WHERE mentor.email = 'mentor.backend@devpath.com'
              AND post.title = '대용량 트래픽 커머스 서버'
              AND post.is_deleted = FALSE
            ORDER BY post.created_at
            LIMIT 1
        ),
        participants(email, message) AS (
            VALUES
                ('assignment.backend.api@devpath.com', '동시성 이슈와 Redis 캐시 전략을 실습하고 싶습니다.'),
                ('assignment.backend.test@devpath.com', '장애 재현 테스트와 회귀 테스트 작성까지 피드백 받고 싶습니다.'),
                ('assignment.backend.ops@devpath.com', '부하 테스트 결과를 보고 병목을 찾는 과정을 배우고 싶습니다.')
        )
        INSERT INTO mentoring_applications (
            mentoring_post_id, applicant_id, message, desired_position, status, reject_reason,
            processed_at, is_deleted, created_at, updated_at
        )
        SELECT backend_post.mentoring_post_id,
               learner.user_id,
               participants.message,
               NULL,
               'APPROVED',
               NULL,
               CURRENT_DATE - 2 + TIME '10:30',
               FALSE,
               CURRENT_DATE - 2 + TIME '10:15',
               CURRENT_DATE - 2 + TIME '10:30'
        FROM backend_post
        JOIN participants ON TRUE
        JOIN users learner ON learner.email = participants.email
        WHERE NOT EXISTS (
            SELECT 1
            FROM mentoring_applications application
            WHERE application.mentoring_post_id = backend_post.mentoring_post_id
              AND application.applicant_id = learner.user_id
        );

        WITH backend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.backend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 7
                  OR workspace.name = '대용량 트래픽 커머스 서버'
              )
            ORDER BY CASE WHEN workspace.id = 7 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(title, description, status, priority, assignee_email, due_date, created_at) AS (
            VALUES
                (
                  'Week 1: 주문 도메인 요구사항 분석',
                  '주문, 상품, 재고, 쿠폰 도메인의 핵심 요구사항을 정리합니다.' || chr(10) || chr(10) ||
                  '- 유스케이스별 정상/예외 흐름을 작성합니다.' || chr(10) ||
                  '- ERD 초안과 API 목록을 함께 제출합니다.',
                  'TODO', 'HIGH', NULL, CURRENT_DATE - 15, CURRENT_DATE - 23 + TIME '09:00'
                ),
                (
                  'Week 2: 쿠폰 발급 API 구현',
                  '선착순 쿠폰 발급 API와 중복 발급 방지 로직을 구현합니다.' || chr(10) || chr(10) ||
                  '- Redis 기반 원자적 카운팅 전략을 설명합니다.' || chr(10) ||
                  '- 성공/실패 케이스 테스트를 포함합니다.',
                  'TODO', 'HIGH', NULL, CURRENT_DATE - 8, CURRENT_DATE - 16 + TIME '09:00'
                ),
                (
                  'Week 3: 주문 재고 동시성 제어',
                  '동시 주문 상황에서 재고 정합성을 유지하는 방식을 구현합니다.' || chr(10) || chr(10) ||
                  '- 낙관적 락 또는 분산락 선택 근거를 남깁니다.' || chr(10) ||
                  '- 재고 부족과 결제 실패 롤백 케이스를 검증합니다.',
                  'TODO', 'HIGH', NULL, CURRENT_DATE - 1, CURRENT_DATE - 9 + TIME '09:00'
                ),
                (
                  'Week 4: 주문 API 부하 테스트 결과 제출',
                  '핵심 주문 API에 대한 부하 테스트 결과와 병목 개선안을 제출합니다.' || chr(10) || chr(10) ||
                  '- 테스트 조건과 TPS, p95 응답 시간을 기록합니다.' || chr(10) ||
                  '- 개선 전후 지표와 남은 리스크를 정리합니다.',
                  'TODO', 'HIGH', NULL, CURRENT_DATE + 6, CURRENT_DATE - 2 + TIME '09:00'
                ),
                (
                  'Week 1: 주문 도메인 요구사항 분석',
                  '요구사항과 ERD 초안을 제출했습니다. 쿠폰 테이블과 재고 차감 트랜잭션 경계에 대한 리뷰를 받고 싶습니다.',
                  'DONE', 'MEDIUM', 'learner@devpath.com', CURRENT_DATE - 15, CURRENT_DATE - 16 + TIME '20:10'
                ),
                (
                  'Week 2: 쿠폰 발급 API 구현',
                  'Redis INCR 기반으로 쿠폰 수량을 제어했고 중복 발급 방지 테스트를 추가했습니다.',
                  'DONE', 'HIGH', 'learner@devpath.com', CURRENT_DATE - 8, CURRENT_DATE - 9 + TIME '22:20'
                ),
                (
                  'Week 3: 주문 재고 동시성 제어',
                  '낙관적 락 버전 충돌 케이스와 결제 실패 롤백 흐름을 구현했습니다. 테스트 격리 방식이 맞는지 확인 부탁드립니다.',
                  'DONE', 'HIGH', 'learner@devpath.com', CURRENT_DATE - 1, CURRENT_DATE - 2 + TIME '21:35'
                ),
                (
                  'Week 4: 주문 API 부하 테스트 결과 제출',
                  'k6로 주문 생성 API를 300VU까지 올려 테스트했습니다. Redis 캐시 적용 전후 p95 차이를 첨부했습니다.',
                  'IN_REVIEW', 'HIGH', 'learner@devpath.com', CURRENT_DATE + 6, CURRENT_DATE + TIME '10:10'
                ),
                (
                  'Week 1: 주문 도메인 요구사항 분석',
                  '주문 상태 전이와 쿠폰 발급 유스케이스를 정리했습니다. 예외 흐름을 시퀀스 다이어그램으로 보강했습니다.',
                  'DONE', 'MEDIUM', 'assignment.backend.api@devpath.com', CURRENT_DATE - 15, CURRENT_DATE - 16 + TIME '19:30'
                ),
                (
                  'Week 2: 쿠폰 발급 API 구현',
                  '쿠폰 발급 API와 통합 테스트를 제출했습니다. Redis 장애 시 대체 흐름은 별도 문서로 남겼습니다.',
                  'DONE', 'HIGH', 'assignment.backend.api@devpath.com', CURRENT_DATE - 8, CURRENT_DATE - 9 + TIME '20:45'
                ),
                (
                  'Week 3: 주문 재고 동시성 제어',
                  '분산락 적용 후 동시 주문 테스트 3종을 통과했습니다. 락 키 설계에 대한 피드백을 반영했습니다.',
                  'DONE', 'HIGH', 'assignment.backend.api@devpath.com', CURRENT_DATE - 1, CURRENT_DATE - 2 + TIME '23:10'
                ),
                (
                  'Week 4: 주문 API 부하 테스트 결과 제출',
                  '부하 테스트 결과와 병목 분석 리포트를 제출했습니다. 커넥션 풀 설정 변경 전후 지표를 비교했습니다.',
                  'DONE', 'HIGH', 'assignment.backend.api@devpath.com', CURRENT_DATE + 6, CURRENT_DATE + TIME '11:20'
                ),
                (
                  'Week 1: 주문 도메인 요구사항 분석',
                  '요구사항 명세와 ERD 초안을 제출했습니다. 테스트 데이터 생성 범위를 추가로 정리했습니다.',
                  'DONE', 'MEDIUM', 'assignment.backend.test@devpath.com', CURRENT_DATE - 15, CURRENT_DATE - 16 + TIME '21:10'
                ),
                (
                  'Week 2: 쿠폰 발급 API 구현',
                  '쿠폰 발급 성공/중복/소진 케이스를 테스트로 제출했습니다. 경계값 테스트를 추가했습니다.',
                  'DONE', 'HIGH', 'assignment.backend.test@devpath.com', CURRENT_DATE - 8, CURRENT_DATE - 9 + TIME '21:25'
                ),
                (
                  'Week 3: 주문 재고 동시성 제어',
                  '수정 요청 반영 중입니다. 동시성 테스트에서 간헐적으로 실패하는 케이스를 재현하고 있습니다.',
                  'TODO', 'HIGH', 'assignment.backend.test@devpath.com', CURRENT_DATE - 1, CURRENT_DATE - 2 + TIME '18:40'
                ),
                (
                  'Week 4: 주문 API 부하 테스트 결과 제출 - 수정 요청',
                  '수정 요청 항목을 반영 중입니다. p95 지표 산출 스크립트와 테스트 조건 표기를 보완하고 있습니다.',
                  'TODO', 'HIGH', 'assignment.backend.test@devpath.com', CURRENT_DATE + 6, CURRENT_DATE - 1 + TIME '18:40'
                ),
                (
                  'Week 1: 주문 도메인 요구사항 분석',
                  '운영 관점의 장애 시나리오와 모니터링 지표를 요구사항 문서에 추가했습니다.',
                  'DONE', 'MEDIUM', 'assignment.backend.ops@devpath.com', CURRENT_DATE - 15, CURRENT_DATE - 16 + TIME '22:00'
                ),
                (
                  'Week 2: 쿠폰 발급 API 구현',
                  'Redis 장애 상황과 재시도 정책을 중심으로 구현했습니다. 알림 조건 초안을 함께 제출했습니다.',
                  'DONE', 'HIGH', 'assignment.backend.ops@devpath.com', CURRENT_DATE - 8, CURRENT_DATE - 10 + TIME '21:15'
                ),
                (
                  'Week 3: 주문 재고 동시성 제어',
                  '락 대기 시간이 길어지는 구간을 분석 중입니다. Grafana 대시보드 초안을 추가했습니다.',
                  'IN_PROGRESS', 'HIGH', 'assignment.backend.ops@devpath.com', CURRENT_DATE - 1, CURRENT_DATE - 3 + TIME '21:15'
                )
        )
        INSERT INTO workspace_task (
            workspace_id, title, description, status, priority,
            assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at
        )
        SELECT backend_workspace.id,
               seed.title,
               seed.description,
               seed.status,
               seed.priority,
               learner.user_id,
               seed.due_date,
               COALESCE(learner.user_id, backend_workspace.owner_id),
               FALSE,
               seed.created_at,
               seed.created_at
        FROM backend_workspace
        JOIN seed ON TRUE
        LEFT JOIN users learner ON learner.email = seed.assignee_email
        WHERE (seed.assignee_email IS NULL OR learner.user_id IS NOT NULL)
          AND NOT EXISTS (
              SELECT 1
              FROM workspace_task existing
              WHERE existing.workspace_id = backend_workspace.id
                AND existing.title = seed.title
                AND existing.assignee_id IS NOT DISTINCT FROM learner.user_id
                AND existing.is_deleted = FALSE
          );
        """);
  }

  private void ensureFrontendTeamWorkspaceData() {
    jdbcTemplate.execute(
        """
        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        participants(email, position_label, joined_day_offset, active_at) AS (
            VALUES
                ('learner@devpath.com', 'Frontend 개발자', -7, now() - INTERVAL '35 seconds'),
                ('team.frontend.ui@devpath.com', 'Frontend 개발자', -7, now() - INTERVAL '48 seconds'),
                ('team.frontend.api@devpath.com', 'Backend API', -7, now() - INTERVAL '3 hours'),
                ('team.frontend.design@devpath.com', 'UI/UX Designer', -7, now() - INTERVAL '1 day')
        )
        INSERT INTO workspace_member (
            workspace_id, learner_id, joined_at, last_active_at, position_label
        )
        SELECT frontend_workspace.id,
               learner.user_id,
               CURRENT_DATE + participants.joined_day_offset + TIME '10:00',
               participants.active_at,
               participants.position_label
        FROM frontend_workspace
        JOIN participants ON TRUE
        JOIN users learner ON learner.email = participants.email
        WHERE NOT EXISTS (
            SELECT 1
            FROM workspace_member member
            WHERE member.workspace_id = frontend_workspace.id
              AND member.learner_id = learner.user_id
        );

        WITH frontend_workspace AS (
            SELECT workspace.id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        participants(email, position_label, active_at) AS (
            VALUES
                ('learner@devpath.com', 'Frontend 개발자', now() - INTERVAL '35 seconds'),
                ('team.frontend.ui@devpath.com', 'Frontend 개발자', now() - INTERVAL '48 seconds'),
                ('team.frontend.api@devpath.com', 'Backend API', now() - INTERVAL '3 hours'),
                ('team.frontend.design@devpath.com', 'UI/UX Designer', now() - INTERVAL '1 day')
        )
        UPDATE workspace_member member
           SET position_label = participants.position_label,
               last_active_at = participants.active_at
          FROM frontend_workspace, participants, users learner
         WHERE member.workspace_id = frontend_workspace.id
           AND member.learner_id = learner.user_id
           AND learner.email = participants.email
           AND (
               member.position_label IS DISTINCT FROM participants.position_label
               OR member.last_active_at IS DISTINCT FROM participants.active_at
           );

        WITH frontend_post AS (
            SELECT post.mentoring_post_id, post.mentor_id
            FROM mentoring_posts post
            JOIN users mentor ON mentor.user_id = post.mentor_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND post.title = 'Next.js 블로그 플랫폼 구축'
              AND post.is_deleted = FALSE
            ORDER BY post.created_at
            LIMIT 1
        ),
        participants(email, desired_position, message) AS (
            VALUES
                ('team.frontend.ui@devpath.com', 'Frontend 개발자', 'App Router 기반 화면 구현과 성능 최적화를 팀 프로젝트로 경험하고 싶습니다.'),
                ('team.frontend.api@devpath.com', 'Backend API', '콘텐츠 저장 API와 프론트 연동 지점을 함께 설계해보고 싶습니다.'),
                ('team.frontend.design@devpath.com', 'UI/UX Designer', '디자인 시스템과 접근성 QA까지 포함해 블로그 플랫폼을 완성하고 싶습니다.')
        )
        INSERT INTO mentoring_applications (
            mentoring_post_id, applicant_id, message, desired_position, status, reject_reason,
            processed_at, is_deleted, created_at, updated_at
        )
        SELECT frontend_post.mentoring_post_id,
               learner.user_id,
               participants.message,
               participants.desired_position,
               'APPROVED',
               NULL,
               CURRENT_DATE - 7 + TIME '11:30',
               FALSE,
               CURRENT_DATE - 7 + TIME '11:10',
               CURRENT_DATE - 7 + TIME '11:30'
        FROM frontend_post
        JOIN participants ON TRUE
        JOIN users learner ON learner.email = participants.email
        WHERE NOT EXISTS (
            SELECT 1
            FROM mentoring_applications application
            WHERE application.mentoring_post_id = frontend_post.mentoring_post_id
              AND application.applicant_id = learner.user_id
        );

        WITH frontend_post AS (
            SELECT post.mentoring_post_id, post.mentor_id
            FROM mentoring_posts post
            JOIN users mentor ON mentor.user_id = post.mentor_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND post.title = 'Next.js 블로그 플랫폼 구축'
              AND post.is_deleted = FALSE
            ORDER BY post.created_at
            LIMIT 1
        ),
        participants(email) AS (
            VALUES
                ('team.frontend.ui@devpath.com'),
                ('team.frontend.api@devpath.com'),
                ('team.frontend.design@devpath.com')
        )
        INSERT INTO mentorings (
            mentoring_post_id, mentor_id, mentee_id, status, started_at,
            ended_at, is_deleted, created_at, updated_at
        )
        SELECT frontend_post.mentoring_post_id,
               frontend_post.mentor_id,
               learner.user_id,
               'ONGOING',
               CURRENT_DATE - 7 + TIME '13:00',
               NULL,
               FALSE,
               CURRENT_DATE - 7 + TIME '13:00',
               CURRENT_DATE - 7 + TIME '13:00'
        FROM frontend_post
        JOIN participants ON TRUE
        JOIN users learner ON learner.email = participants.email
        WHERE NOT EXISTS (
            SELECT 1
            FROM mentorings mentoring
            WHERE mentoring.mentoring_post_id = frontend_post.mentoring_post_id
              AND mentoring.mentee_id = learner.user_id
        );

        UPDATE mentoring_posts post
           SET current_participants = GREATEST(COALESCE(post.current_participants, 0), 4),
               max_participants = GREATEST(COALESCE(post.max_participants, 0), 4),
               updated_at = now()
          FROM users mentor
         WHERE post.mentor_id = mentor.user_id
           AND mentor.email = 'mentor.frontend@devpath.com'
           AND post.title = 'Next.js 블로그 플랫폼 구축'
           AND post.is_deleted = FALSE;

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(title, description, start_date, due_date, status, created_at) AS (
            VALUES
                (
                  'Week 1: 블로그 플랫폼 기획 및 라우팅 설계',
                  '블로그 플랫폼의 핵심 사용자 흐름과 Next.js App Router 구조를 확정합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_TEAM_GUIDELINES---' || chr(10) ||
                  'Frontend: 페이지 라우팅, 레이아웃, 로딩/에러 상태 기준을 문서화합니다.' || chr(10) ||
                  'Backend: 게시글/태그/댓글 API 초안을 작성하고 mock 응답을 맞춥니다.' || chr(10) ||
                  'Designer: 홈, 상세, 에디터 화면의 핵심 컴포넌트와 토큰을 정의합니다.',
                  CURRENT_DATE - 21,
                  CURRENT_DATE - 15,
                  'DONE',
                  CURRENT_DATE - 21 + TIME '09:00'
                ),
                (
                  'Week 2: 마크다운 에디터와 게시글 CRUD',
                  '게시글 작성, 수정, 미리보기, 목록 조회 흐름을 한 번에 연결합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_TEAM_GUIDELINES---' || chr(10) ||
                  'Frontend: 마크다운 에디터, 이미지 삽입, 저장 후 리다이렉트 흐름을 구현합니다.' || chr(10) ||
                  'Backend: 게시글 CRUD와 태그 필터 API를 안정화합니다.' || chr(10) ||
                  'Designer: 에디터 입력 상태, 빈 상태, 오류 상태 시안을 보강합니다.',
                  CURRENT_DATE - 14,
                  CURRENT_DATE - 8,
                  'DONE',
                  CURRENT_DATE - 14 + TIME '09:00'
                ),
                (
                  'Week 3: SEO, 접근성, 배포 전 품질 점검',
                  '검색 노출과 접근성을 개선하고 배포 전 QA 기준을 통과시키는 주차입니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_TEAM_GUIDELINES---' || chr(10) ||
                  'Frontend: 메타데이터, sitemap, 이미지 최적화, keyboard flow를 점검합니다.' || chr(10) ||
                  'Backend: 공개 글 조회 성능과 캐시 정책을 검증합니다.' || chr(10) ||
                  'Designer: 모바일 반응형과 명도 대비 이슈를 QA 체크리스트로 정리합니다.',
                  CURRENT_DATE - 7,
                  CURRENT_DATE + 1,
                  'OPEN',
                  CURRENT_DATE - 7 + TIME '09:00'
                ),
                (
                  'Week 4: Vercel 배포와 최종 데모 리허설',
                  '배포 환경변수, 장애 대응 체크리스트, 최종 데모 시나리오를 준비합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_TEAM_GUIDELINES---' || chr(10) ||
                  'Frontend: Lighthouse 지표를 기록하고 배포 URL 기준으로 회귀 테스트합니다.' || chr(10) ||
                  'Backend: API 오류 응답과 rate limit 정책을 데모 전 점검합니다.' || chr(10) ||
                  'Designer: 최종 발표용 화면 캡처와 사용성 개선 리스트를 정리합니다.',
                  CURRENT_DATE + 2,
                  CURRENT_DATE + 8,
                  'OPEN',
                  CURRENT_DATE - 1 + TIME '09:00'
                )
        )
        INSERT INTO milestone (
            workspace_id, title, description, start_date, due_date, status,
            created_by_id, is_deleted, created_at, updated_at
        )
        SELECT frontend_workspace.id,
               seed.title,
               seed.description,
               seed.start_date,
               seed.due_date,
               seed.status,
               frontend_workspace.owner_id,
               FALSE,
               seed.created_at,
               seed.created_at
        FROM frontend_workspace
        JOIN seed ON TRUE
        WHERE NOT EXISTS (
            SELECT 1
            FROM milestone existing
            WHERE existing.workspace_id = frontend_workspace.id
              AND existing.title = seed.title
              AND existing.is_deleted = FALSE
        );

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(title, description, status, priority, assignee_email, due_date, created_at) AS (
            VALUES
                (
                  '홈 피드 카드 반응형 UI 완성',
                  '메인 피드 카드, 태그 필터, skeleton loading을 정리합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: fe',
                  'DONE', 'HIGH', 'learner@devpath.com', CURRENT_DATE + 1, now() - INTERVAL '2 hours'
                ),
                (
                  '마크다운 에디터 이미지 업로드 UX 보강',
                  'drag and drop 업로드, 미리보기 삭제, 저장 실패 토스트를 마무리합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: fe',
                  'IN_REVIEW', 'HIGH', 'team.frontend.ui@devpath.com', CURRENT_DATE + 1, now() - INTERVAL '90 minutes'
                ),
                (
                  '게시글/태그 API mock 계약 확정',
                  '목록 필터와 상세 조회 응답 DTO를 프론트 타입과 맞춥니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: be',
                  'IN_PROGRESS', 'MEDIUM', 'team.frontend.api@devpath.com', CURRENT_DATE + 2, now() - INTERVAL '4 hours'
                ),
                (
                  '디자인 토큰 QA 체크리스트 반영',
                  '색상 토큰, spacing, heading scale을 페이지별로 점검합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: design',
                  'TODO', 'MEDIUM', 'team.frontend.design@devpath.com', CURRENT_DATE + 2, now() - INTERVAL '1 day'
                ),
                (
                  'SEO 메타데이터와 OG 이미지 적용',
                  '게시글 상세의 metadata, canonical URL, OG 이미지 fallback을 연결합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: fe',
                  'TODO', 'HIGH', 'learner@devpath.com', CURRENT_DATE + 4, now() - INTERVAL '3 hours'
                ),
                (
                  '댓글 정책 및 신고 상태 API 정리',
                  '댓글 숨김, 신고 접수, 삭제 권한 정책을 API 스펙에 반영합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: be',
                  'IN_REVIEW', 'MEDIUM', 'team.frontend.api@devpath.com', CURRENT_DATE + 3, now() - INTERVAL '70 minutes'
                ),
                (
                  '모바일 상세 페이지 접근성 점검',
                  '키보드 포커스 순서와 aria-label 누락을 QA합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: design',
                  'IN_PROGRESS', 'LOW', 'team.frontend.design@devpath.com', CURRENT_DATE + 5, now() - INTERVAL '5 hours'
                ),
                (
                  'Week 3 통합 데모 시나리오 정리',
                  '멘토 리뷰용 데모 순서와 확인 포인트를 팀 공통 문서로 정리합니다.' || chr(10) || chr(10) ||
                  '---DEVPATH_KANBAN_ROLE---' || chr(10) || 'role: common',
                  'TODO', 'MEDIUM', NULL, CURRENT_DATE + 1, now() - INTERVAL '6 hours'
                )
        )
        INSERT INTO workspace_task (
            workspace_id, title, description, status, priority,
            assignee_id, due_date, created_by_id, is_deleted, created_at, updated_at
        )
        SELECT frontend_workspace.id,
               seed.title,
               seed.description,
               seed.status,
               seed.priority,
               learner.user_id,
               seed.due_date,
               COALESCE(learner.user_id, frontend_workspace.owner_id),
               FALSE,
               seed.created_at,
               seed.created_at
        FROM frontend_workspace
        JOIN seed ON TRUE
        LEFT JOIN users learner ON learner.email = seed.assignee_email
        WHERE (seed.assignee_email IS NULL OR learner.user_id IS NOT NULL)
          AND NOT EXISTS (
              SELECT 1
              FROM workspace_task existing
              WHERE existing.workspace_id = frontend_workspace.id
                AND existing.title = seed.title
                AND existing.assignee_id IS NOT DISTINCT FROM learner.user_id
                AND existing.is_deleted = FALSE
          );

        WITH frontend_workspace AS (
            SELECT workspace.id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(title, assignee_email, feedback) AS (
            VALUES
                (
                  '홈 피드 카드 반응형 UI 완성',
                  'learner@devpath.com',
                  'learner|이학습|2일 전|홈 피드 카드 컴포넌트와 태그 필터를 붙였습니다. 데스크톱과 모바일 캡처를 PR에 올려두었습니다.' || chr(10) ||
                  'mentor|프론트엔드 장인|1일 전|카드 간격과 skeleton 높이가 안정적입니다. 모바일 360px에서 태그가 두 줄로 밀릴 때 하단 여백만 8px 더 확보해주세요.' || chr(10) ||
                  'learner|이학습|오늘 09:30|태그 wrap 케이스 여백을 반영했고 Lighthouse 모바일 점수도 다시 첨부했습니다.' || chr(10) ||
                  'mentor|프론트엔드 장인|오늘 10:15|확인했습니다. 이 항목은 Pass 처리하고 다음 SEO 작업으로 넘어가도 됩니다.'
                ),
                (
                  '마크다운 에디터 이미지 업로드 UX 보강',
                  'team.frontend.ui@devpath.com',
                  'learner|김유나|어제 16:20|drag and drop 업로드와 삭제 미리보기까지 구현했습니다. 실패 토스트 문구가 적절한지 확인 부탁드립니다.' || chr(10) ||
                  'mentor|프론트엔드 장인|어제 19:10|흐름은 좋습니다. 네트워크 실패와 10MB 초과 파일을 분리해서 안내하고, 업로드 중 버튼 disabled 상태를 캡처로 남겨주세요.' || chr(10) ||
                  'learner|김유나|오늘 11:40|파일 용량 초과 케이스와 업로드 중 상태를 추가했습니다. 리뷰 요청 상태로 다시 올렸습니다.' || chr(10) ||
                  'mentor|프론트엔드 장인|오늘 12:05|좋습니다. 마지막으로 이미지 alt 입력이 비어 있을 때 저장을 막는지만 확인하면 통과 가능합니다.'
                ),
                (
                  '댓글 정책 및 신고 상태 API 정리',
                  'team.frontend.api@devpath.com',
                  'learner|오지훈|어제 14:05|댓글 숨김과 신고 접수 상태를 mock API에 추가했습니다. 프론트에서 필요한 상태값은 HIDDEN, REPORTED, DELETED 세 가지로 정리했습니다.' || chr(10) ||
                  'mentor|프론트엔드 장인|어제 18:30|상태값은 충분합니다. 다만 신고 접수 실패 시 재시도 가능 여부를 response message로 구분할 수 있게 에러 코드를 한 단계만 더 세분화해주세요.' || chr(10) ||
                  'learner|오지훈|오늘 10:50|REPORT_DUPLICATED와 REPORT_RATE_LIMITED 에러 코드를 추가하고 API 명세 문서에 예시 응답을 반영했습니다.' || chr(10) ||
                  'mentor|프론트엔드 장인|오늘 11:20|명세와 mock 응답이 맞습니다. 프론트 연결 후 QA에서 한 번 더 확인하겠습니다.'
                ),
                (
                  '모바일 상세 페이지 접근성 점검',
                  'team.frontend.design@devpath.com',
                  'learner|문서윤|어제 13:15|모바일 상세 페이지 기준으로 focus order와 aria-label 누락 항목을 체크리스트에 정리했습니다.' || chr(10) ||
                  'mentor|프론트엔드 장인|어제 17:45|정리가 좋습니다. 공유 버튼과 댓글 입력 영역은 실제 키보드 이동 순서 기준으로 한 번 더 검증하고, 스크린리더용 label 문구를 제안해주세요.' || chr(10) ||
                  'learner|문서윤|오늘 09:10|공유 버튼 label 초안을 추가했습니다. 댓글 입력 영역은 FE 구현 확인 후 다시 코멘트 남기겠습니다.'
                )
        )
        UPDATE workspace_task task
        SET description =
                COALESCE(NULLIF(task.description, ''), task.title)
                || chr(10) || chr(10)
                || '---DEVPATH_MILESTONE_FEEDBACK---' || chr(10)
                || seed.feedback,
            updated_at = GREATEST(COALESCE(task.updated_at, task.created_at, now()), now() - INTERVAL '45 minutes')
        FROM frontend_workspace
        JOIN seed ON TRUE
        JOIN users learner ON learner.email = seed.assignee_email
        WHERE task.workspace_id = frontend_workspace.id
          AND task.title = seed.title
          AND task.assignee_id IS NOT DISTINCT FROM learner.user_id
          AND task.is_deleted = FALSE
          AND task.description NOT LIKE '%---DEVPATH_MILESTONE_FEEDBACK---%';

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(title, description, day_offset, start_time, end_time, created_at) AS (
            VALUES
                (
                  'Week 3 라이브 코드 리뷰',
                  '[TEAM_EVENT:meetup]' || chr(10) || '마크다운 에디터와 게시글 상세 페이지 PR을 함께 리뷰합니다.',
                  0, TIME '20:00', TIME '21:30', now() - INTERVAL '2 days'
                ),
                (
                  'SEO QA 마감',
                  '[TEAM_EVENT:deadline]' || chr(10) || 'sitemap, metadata, OG 이미지, Lighthouse 측정 결과를 제출합니다.',
                  1, TIME '18:00', TIME '18:30', now() - INTERVAL '1 day'
                ),
                (
                  '디자인 시스템 동기화 회의',
                  '[TEAM_EVENT:team]' || chr(10) || '토큰명과 컴포넌트 상태명을 확정하고 프론트 구현과 맞춥니다.',
                  2, TIME '14:00', TIME '15:00', now() - INTERVAL '8 hours'
                ),
                (
                  '최종 데모 리허설',
                  '[TEAM_EVENT:meetup]' || chr(10) || '배포 URL 기준으로 데모 흐름과 발표 순서를 리허설합니다.',
                  6, TIME '19:00', TIME '20:00', now() - INTERVAL '3 hours'
                )
        )
        INSERT INTO calendar_event (
            workspace_id, title, description, start_at, end_at,
            created_by_id, is_deleted, created_at, updated_at
        )
        SELECT frontend_workspace.id,
               seed.title,
               seed.description,
               (CURRENT_DATE + seed.day_offset + seed.start_time)::timestamp,
               (CURRENT_DATE + seed.day_offset + seed.end_time)::timestamp,
               frontend_workspace.owner_id,
               FALSE,
               seed.created_at,
               seed.created_at
        FROM frontend_workspace
        JOIN seed ON TRUE
        WHERE NOT EXISTS (
            SELECT 1
            FROM calendar_event existing
            WHERE existing.workspace_id = frontend_workspace.id
              AND existing.title = seed.title
              AND existing.is_deleted = FALSE
        );

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(doc_type, content) AS (
            VALUES
                ('API_SPEC', $json${"externalLink":"https://www.notion.so/devpath-next-blog-api","notes":"Next.js 블로그 플랫폼의 프론트/백엔드 계약 문서입니다. Week 3 기준 게시글, 태그, 댓글, 이미지 업로드 API를 우선 점검합니다.","endpoints":[{"id":"posts-list","method":"GET","url":"/api/blog/posts?tag={tag}&page={page}","description":"공개 게시글 목록과 태그 필터 결과를 반환합니다.","request":"tag=react&page=1","response":"{\"items\":[{\"id\":101,\"title\":\"App Router 패턴\"}],\"page\":1,\"totalPages\":4}","status":"SYNCING","ownerId":null},{"id":"post-save","method":"POST","url":"/api/blog/posts","description":"마크다운 본문과 대표 이미지를 포함한 게시글을 저장합니다.","request":"{\"title\":\"...\",\"markdown\":\"...\",\"tags\":[\"Next.js\"]}","response":"{\"id\":120,\"slug\":\"nextjs-routing\"}","status":"NEEDS_FIX","ownerId":null},{"id":"comment-create","method":"POST","url":"/api/blog/posts/{postId}/comments","description":"게시글 댓글을 등록하고 moderation 상태를 반환합니다.","request":"{\"content\":\"좋은 글입니다.\"}","response":"{\"commentId\":77,\"status\":\"VISIBLE\"}","status":"DESIGNING","ownerId":null}],"feedback":[{"id":"seed-api-feedback","author":"이서준","role":"PM","content":"POST /api/blog/posts 응답에 slug 중복 시 에러 코드와 필드별 validation 메시지를 분리해 주세요.","createdAt":"seed","mine":false}],"logs":[{"id":"seed-api-log","actor":"김유나","role":"FE","message":"게시글 목록 API mock 응답을 프론트 타입과 동기화했습니다.","createdAt":"seed"}]}$json$),
                ('ERD', $json${"externalLink":"https://dbdiagram.io/d/devpath-next-blog","notes":"posts, post_tags, tags, comments, assets 중심의 간단한 블로그 ERD입니다. 댓글 moderation과 이미지 asset 소유 관계를 이번 주 리뷰 대상으로 둡니다.","endpoints":[],"feedback":[{"id":"seed-erd-feedback","author":"문서윤","role":"DES","content":"태그 컬러 토큰과 DB tag slug가 분리되어야 디자인 시스템 변경에 안전합니다.","createdAt":"seed","mine":false}],"logs":[{"id":"seed-erd-log","actor":"오지훈","role":"BE","message":"post_tags 중간 테이블과 assets 테이블 관계를 추가했습니다.","createdAt":"seed"}]}$json$),
                ('INFRA', $json${"externalLink":"https://miro.com/app/board/devpath-next-blog-infra","notes":"Vercel 프론트, API 서버, PostgreSQL, 이미지 스토리지, CDN 캐시 흐름을 정리했습니다. 배포 전 환경변수와 preview branch 정책을 확인해야 합니다.","endpoints":[],"feedback":[{"id":"seed-infra-feedback","author":"이서준","role":"PM","content":"preview 환경과 production 환경의 API base URL 분리 전략을 문서에 명시해 주세요.","createdAt":"seed","mine":false}],"logs":[{"id":"seed-infra-log","actor":"김유나","role":"FE","message":"Vercel preview 배포 체크리스트를 인프라 문서에 연결했습니다.","createdAt":"seed"}]}$json$)
        )
        INSERT INTO workspace_doc (
            workspace_id, doc_type, content, updated_by_id, created_at, updated_at
        )
        SELECT frontend_workspace.id,
               seed.doc_type,
               seed.content,
               frontend_workspace.owner_id,
               now() - INTERVAL '2 hours',
               now() - INTERVAL '2 hours'
        FROM frontend_workspace
        JOIN seed ON TRUE
        WHERE NOT EXISTS (
            SELECT 1
            FROM workspace_doc existing
            WHERE existing.workspace_id = frontend_workspace.id
              AND existing.doc_type = seed.doc_type
        );

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(title, url, uploader_email, created_at) AS (
            VALUES
                ('Week 3 QA 체크리스트', 'https://www.notion.so/devpath-next-blog-week3-qa', 'mentor.frontend@devpath.com', now() - INTERVAL '1 day'),
                ('Figma 디자인 시스템 원본', 'https://www.figma.com/file/devpath-next-blog-design-system', 'team.frontend.design@devpath.com', now() - INTERVAL '20 hours'),
                ('Vercel Preview 배포 URL', 'https://devpath-next-blog-preview.vercel.app', 'team.frontend.ui@devpath.com', now() - INTERVAL '4 hours'),
                ('API mock 서버 Swagger', 'https://mock.devpath.com/next-blog/swagger-ui/index.html', 'team.frontend.api@devpath.com', now() - INTERVAL '3 hours')
        )
        INSERT INTO workspace_file (
            workspace_id, parent_id, original_file_name, stored_file_name, file_path, file_size,
            content_type, item_type, storage_provider, object_key, uploaded_by_id,
            is_deleted, created_at, updated_at
        )
        SELECT frontend_workspace.id,
               NULL,
               seed.title,
               '',
               '',
               0,
               'text/uri-list',
               'LINK',
               'LINK',
               seed.url,
               uploader.user_id,
               FALSE,
               seed.created_at,
               seed.created_at
        FROM frontend_workspace
        JOIN seed ON TRUE
        JOIN users uploader ON uploader.email = seed.uploader_email
        WHERE NOT EXISTS (
            SELECT 1
            FROM workspace_file existing
            WHERE existing.workspace_id = frontend_workspace.id
              AND existing.original_file_name = seed.title
              AND existing.item_type = 'LINK'
              AND existing.is_deleted = FALSE
        );

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(author_email, template_type, difficulty, title, content, qna_status, view_count, created_at) AS (
            VALUES
                (
                  'team.frontend.ui@devpath.com',
                  'CODE_REVIEW',
                  'MEDIUM',
                  '마크다운 에디터 이미지 업로드 실패 시 UX를 어떻게 처리할까요?',
                  '이미지 업로드 API가 실패하면 현재는 토스트만 노출됩니다. 본문에 남은 임시 마크다운을 자동 제거하는 편이 좋을지 피드백 부탁드립니다.',
                  'UNANSWERED',
                  8,
                  now() - INTERVAL '5 hours'
                ),
                (
                  'team.frontend.api@devpath.com',
                  'IMPLEMENTATION',
                  'HARD',
                  '게시글 slug 중복 처리를 프론트에서 선검증해야 할까요?',
                  '저장 API에서 409를 반환하도록 설계했는데, 프론트에서도 debounce 기반 중복 확인을 넣을지 고민 중입니다.',
                  'ANSWERED',
                  14,
                  now() - INTERVAL '1 day'
                ),
                (
                  'team.frontend.design@devpath.com',
                  'PROJECT',
                  'MEDIUM',
                  '다크모드 토큰을 MVP 범위에 포함해도 될까요?',
                  '디자인 시스템에는 다크모드 토큰을 잡아두었지만 구현 범위가 늘어날 것 같습니다. 이번 주차 필수 범위인지 확인 부탁드립니다.',
                  'UNANSWERED',
                  5,
                  now() - INTERVAL '2 hours'
                )
        )
        INSERT INTO qna_questions (
            user_id, template_type, difficulty, title, content,
            question_scope, workspace_id, qna_status, view_count, is_deleted,
            created_at, updated_at
        )
        SELECT author.user_id,
               seed.template_type,
               seed.difficulty,
               seed.title,
               seed.content,
               'WORKSPACE',
               frontend_workspace.id,
               seed.qna_status,
               seed.view_count,
               FALSE,
               seed.created_at,
               seed.created_at
        FROM frontend_workspace
        JOIN seed ON TRUE
        JOIN users author ON author.email = seed.author_email
        WHERE NOT EXISTS (
            SELECT 1
            FROM qna_questions existing
            WHERE existing.workspace_id = frontend_workspace.id
              AND existing.question_scope = 'WORKSPACE'
              AND existing.title = seed.title
              AND existing.is_deleted = FALSE
        );

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        target_question AS (
            SELECT question.question_id
            FROM qna_questions question
            JOIN frontend_workspace ON frontend_workspace.id = question.workspace_id
            WHERE question.question_scope = 'WORKSPACE'
              AND question.title = '게시글 slug 중복 처리를 프론트에서 선검증해야 할까요?'
              AND question.is_deleted = FALSE
            LIMIT 1
        )
        INSERT INTO qna_answers (
            question_id, user_id, content, is_adopted, is_deleted, created_at, updated_at
        )
        SELECT target_question.question_id,
               frontend_workspace.owner_id,
               '서버 409 응답은 반드시 유지하고, 프론트 선검증은 작성 경험 개선용으로만 두는 편이 좋습니다. 저장 버튼 직전에는 서버 응답을 기준으로 최종 처리하세요.',
               FALSE,
               FALSE,
               now() - INTERVAL '20 hours',
               now() - INTERVAL '20 hours'
        FROM frontend_workspace
        JOIN target_question ON TRUE
        WHERE NOT EXISTS (
            SELECT 1
            FROM qna_answers answer
            WHERE answer.question_id = target_question.question_id
              AND answer.user_id = frontend_workspace.owner_id
              AND answer.is_deleted = FALSE
        );

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(title, content, creator_email, created_at) AS (
            VALUES
                (
                  'Week 3 라이브 코드 리뷰 회의록',
                  '1. 이미지 업로드 실패 시 임시 마크다운 제거 정책은 프론트에서 처리한다.' || chr(10) ||
                  '2. slug 중복 확인은 UX 보조 기능으로만 두고 서버 409 응답을 최종 기준으로 삼는다.' || chr(10) ||
                  '3. SEO QA는 sitemap, metadata, OG 이미지 순서로 체크한다.',
                  'mentor.frontend@devpath.com',
                  now() - INTERVAL '18 hours'
                ),
                (
                  '디자인 시스템 싱크 노트',
                  '색상 토큰은 semantic name으로 정리하고, 카드 radius는 8px 기준을 유지한다. 모바일 상세 페이지의 heading hierarchy를 다시 점검한다.',
                  'team.frontend.design@devpath.com',
                  now() - INTERVAL '6 hours'
                )
        )
        INSERT INTO meeting_note (
            workspace_id, title, content, created_by_id, is_deleted, created_at, updated_at
        )
        SELECT frontend_workspace.id,
               seed.title,
               seed.content,
               creator.user_id,
               FALSE,
               seed.created_at,
               seed.created_at
        FROM frontend_workspace
        JOIN seed ON TRUE
        JOIN users creator ON creator.email = seed.creator_email
        WHERE NOT EXISTS (
            SELECT 1
            FROM meeting_note existing
            WHERE existing.workspace_id = frontend_workspace.id
              AND existing.title = seed.title
              AND existing.is_deleted = FALSE
        );

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        seed(actor_email, activity_type, description, created_at) AS (
            VALUES
                ('team.frontend.ui@devpath.com', 'TASK_CREATED', '마크다운 에디터 이미지 업로드 UX 보강 작업을 리뷰 요청했습니다.', now() - INTERVAL '90 minutes'),
                ('team.frontend.design@devpath.com', 'DOC_UPDATED', '디자인 시스템 원본 링크와 QA 체크리스트를 자료실에 공유했습니다.', now() - INTERVAL '6 hours'),
                ('mentor.frontend@devpath.com', 'MEETING_NOTE_CREATED', 'Week 3 라이브 코드 리뷰 회의록을 등록했습니다.', now() - INTERVAL '18 hours'),
                ('team.frontend.api@devpath.com', 'DOC_UPDATED', '게시글/태그 API mock 계약을 API 명세서에 반영했습니다.', now() - INTERVAL '20 hours')
        )
        INSERT INTO activity_log (
            workspace_id, actor_id, activity_type, description, created_at
        )
        SELECT frontend_workspace.id,
               actor.user_id,
               seed.activity_type,
               seed.description,
               seed.created_at
        FROM frontend_workspace
        JOIN seed ON TRUE
        JOIN users actor ON actor.email = seed.actor_email
        WHERE NOT EXISTS (
            SELECT 1
            FROM activity_log existing
            WHERE existing.workspace_id = frontend_workspace.id
              AND existing.activity_type = seed.activity_type
              AND existing.description = seed.description
        );

        WITH frontend_workspace AS (
            SELECT workspace.id, workspace.owner_id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        )
        INSERT INTO voice_channels (
            workspace_id, creator_id, name, description, current_session_started_at,
            is_deleted, created_at, updated_at
        )
        SELECT frontend_workspace.id,
               frontend_workspace.owner_id,
               '프론트 통합 리뷰룸',
               '팀원이 PR 리뷰와 화면 QA를 빠르게 논의하는 상시 음성 채널입니다.',
               now() - INTERVAL '12 minutes',
               FALSE,
               CURRENT_DATE - 3 + TIME '18:00',
               now() - INTERVAL '12 minutes'
        FROM frontend_workspace
        WHERE NOT EXISTS (
            SELECT 1
            FROM voice_channels existing
            WHERE existing.workspace_id = frontend_workspace.id
              AND existing.name = '프론트 통합 리뷰룸'
              AND existing.is_deleted = FALSE
        );

        WITH frontend_workspace AS (
            SELECT workspace.id
            FROM workspace
            JOIN users mentor ON mentor.user_id = workspace.owner_id
            WHERE mentor.email = 'mentor.frontend@devpath.com'
              AND workspace.type = 'MENTORING'
              AND COALESCE(workspace.is_deleted, FALSE) = FALSE
              AND (
                  workspace.id = 8
                  OR workspace.name = 'Next.js 블로그 플랫폼 구축'
              )
            ORDER BY CASE WHEN workspace.id = 8 THEN 0 ELSE 1 END, workspace.created_at
            LIMIT 1
        ),
        channel AS (
            SELECT voice_channel_id
            FROM voice_channels
            JOIN frontend_workspace ON frontend_workspace.id = voice_channels.workspace_id
            WHERE voice_channels.name = '프론트 통합 리뷰룸'
              AND voice_channels.is_deleted = FALSE
            LIMIT 1
        ),
        participants(email, muted, speaking) AS (
            VALUES
                ('learner@devpath.com', FALSE, TRUE),
                ('team.frontend.ui@devpath.com', FALSE, FALSE)
        )
        INSERT INTO voice_participants (
            voice_channel_id, user_id, active, muted, hand_raised, speaking,
            joined_at, left_at, is_deleted, created_at, updated_at
        )
        SELECT channel.voice_channel_id,
               participant.user_id,
               TRUE,
               participants.muted,
               FALSE,
               participants.speaking,
               now() - INTERVAL '10 minutes',
               NULL,
               FALSE,
               now() - INTERVAL '10 minutes',
               now() - INTERVAL '2 minutes'
        FROM channel
        JOIN participants ON TRUE
        JOIN users participant ON participant.email = participants.email
        WHERE NOT EXISTS (
            SELECT 1
            FROM voice_participants existing
            WHERE existing.voice_channel_id = channel.voice_channel_id
              AND existing.user_id = participant.user_id
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
        SELECT mentor.user_id,
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
        FROM users mentor
        WHERE mentor.email = 'mentor.backend@devpath.com'
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
        SELECT mentor.user_id,
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
        FROM users mentor
        WHERE mentor.email = 'mentor.frontend@devpath.com'
          AND NOT EXISTS (
              SELECT 1 FROM mentoring_posts post
              WHERE post.title = 'Next.js 블로그 플랫폼 구축'
                AND post.is_deleted = FALSE
          );

        UPDATE mentoring_posts post
           SET mentor_id = mentor.user_id,
               updated_at = now()
          FROM users mentor
         WHERE mentor.email = 'mentor.backend@devpath.com'
           AND post.title = '대용량 트래픽 커머스 서버'
           AND post.is_deleted = FALSE
           AND post.mentor_id IS DISTINCT FROM mentor.user_id;

        UPDATE mentoring_posts post
           SET mentor_id = mentor.user_id,
               updated_at = now()
          FROM users mentor
         WHERE mentor.email = 'mentor.frontend@devpath.com'
           AND post.title = 'Next.js 블로그 플랫폼 구축'
           AND post.is_deleted = FALSE
           AND post.mentor_id IS DISTINCT FROM mentor.user_id;

        INSERT INTO mentoring_applications (
            mentoring_post_id, applicant_id, message, desired_position, status, reject_reason,
            processed_at, is_deleted, created_at, updated_at
        )
        SELECT post.mentoring_post_id,
               learner.user_id,
               '공통 과제형 멘토링으로 대용량 트래픽 과제를 수행하며 피드백을 받고 싶습니다.',
               NULL,
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
            mentoring_post_id, applicant_id, message, desired_position, status, reject_reason,
            processed_at, is_deleted, created_at, updated_at
        )
        SELECT post.mentoring_post_id,
               learner.user_id,
               '팀 프로젝트형 멘토링으로 Next.js 블로그 플랫폼을 역할 분담해서 완성하고 싶습니다.',
               'Frontend 개발자',
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

        UPDATE mentoring_applications application
           SET desired_position = 'Frontend 개발자',
               updated_at = now()
          FROM mentoring_posts post, users learner
         WHERE application.mentoring_post_id = post.mentoring_post_id
           AND application.applicant_id = learner.user_id
           AND post.title = 'Next.js 블로그 플랫폼 구축'
           AND learner.email = 'learner@devpath.com'
           AND application.desired_position IS DISTINCT FROM 'Frontend 개발자';

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

        UPDATE mentorings mentoring
           SET mentor_id = post.mentor_id,
               updated_at = now()
          FROM mentoring_posts post
         WHERE mentoring.mentoring_post_id = post.mentoring_post_id
           AND post.title IN ('대용량 트래픽 커머스 서버', 'Next.js 블로그 플랫폼 구축')
           AND mentoring.is_deleted = FALSE
           AND mentoring.mentor_id IS DISTINCT FROM post.mentor_id;
        """);
  }

  private record LearnerSeed(String email, String name, String bio, String profileImage) {}
}
