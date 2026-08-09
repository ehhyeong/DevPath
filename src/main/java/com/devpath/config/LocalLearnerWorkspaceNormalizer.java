package com.devpath.config;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.FileCopyUtils;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@RequiredArgsConstructor
public class LocalLearnerWorkspaceNormalizer implements CommandLineRunner {

  private static final String SEED_PASSWORD = "devpath1234";
  private static final String SQL_RESOURCE_DIRECTORY = "db/local/learner-workspace/";

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
    executeSql("allowed-workspaces.sql");
    executeSql("mentoring-workspace-owners.sql");
    executeSql("mentoring-position-schema.sql");
    executeSql("workspace-memberships.sql");
    executeSql("workspace-task-status-constraint.sql");
    executeSql("squad-workspace-tasks.sql");
    executeSql("squad-calendar-events.sql");
    executeSql("squad-code-review-schema.sql");
    executeSql("squad-code-review-data.sql");
    executeSql("squad-erd-document-schema.sql");
    executeSql("squad-erd-version-schema.sql");
    executeSql("squad-erd-version-index.sql");
    executeSql("squad-erd-comment-schema.sql");
    executeSql("squad-erd-comment-index.sql");
    executeSql("workspace-hub-projects.sql");
    executeSql("prune-learner-mentorings.sql");
    executeSql("learner-mentorings.sql");
    executeSql("backend-mentoring-workspace.sql");
    executeSql("frontend-mentoring-workspace.sql");
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

  private void executeSql(String resourceName) {
    ClassPathResource resource = new ClassPathResource(SQL_RESOURCE_DIRECTORY + resourceName);

    try (InputStreamReader reader =
        new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
      jdbcTemplate.execute(FileCopyUtils.copyToString(reader));
    } catch (IOException ex) {
      // A missing local seed script must fail startup to avoid accepting partially normalized data.
      throw new IllegalStateException(
          "Failed to read local workspace seed SQL: " + resourceName, ex);
    }
  }

  private record LearnerSeed(String email, String name, String bio, String profileImage) {}
}
