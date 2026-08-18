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
  private static final String SQL_RESOURCE_DIRECTORY = "db/local/learner-workspace/";

  private final JdbcTemplate jdbcTemplate;
  private final PasswordEncoder passwordEncoder;
  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    ensureSeedLearners(seedLearners());
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

  private List<LearnerSeed> seedLearners() {
    return seedSqlExecutor.query(
        "db/local/learner-workspace-accounts.sql",
        (resultSet, rowNumber) ->
            new LearnerSeed(
                resultSet.getString("email"),
                resultSet.getString("name"),
                resultSet.getString("bio"),
                resultSet.getString("profile_image")));
  }

  private void executeSql(String resourceName) {
    seedSqlExecutor.execute(SQL_RESOURCE_DIRECTORY + resourceName);
  }

  private record LearnerSeed(String email, String name, String bio, String profileImage) {}
}
