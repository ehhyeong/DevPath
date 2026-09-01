package com.devpath.bootstrap.seed;

import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadLoungeType;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import com.devpath.domain.squad.repository.SquadMemberRepository;
import com.devpath.domain.squad.repository.SquadRepository;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
@RequiredArgsConstructor
public class LocalLoungeSeedInitializer implements CommandLineRunner {

  private static final String SEED_PASSWORD = "devpath1234";

  private final UserRepository userRepository;
  private final SquadRepository squadRepository;
  private final SquadMemberRepository squadMemberRepository;
  private final PasswordEncoder passwordEncoder;
  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    Map<String, User> usersByEmail = ensureUsers();
    postSeeds().forEach(seed -> ensurePost(seed, usersByEmail));
  }

  private Map<String, User> ensureUsers() {
    Map<String, User> usersByEmail = new HashMap<>();
    for (UserSeed seed : userSeeds()) {
      usersByEmail.put(seed.email(), ensureUser(seed));
    }
    return usersByEmail;
  }

  private User ensureUser(UserSeed seed) {
    return userRepository
        .findByEmail(seed.email())
        .map(user -> restoreUser(user, seed))
        .orElseGet(() -> createUser(seed));
  }

  private User createUser(UserSeed seed) {
    return userRepository.save(
        User.builder()
            .email(seed.email())
            .password(passwordEncoder.encode(SEED_PASSWORD))
            .name(seed.name())
            .role(seed.role())
            .build());
  }

  private User restoreUser(User user, UserSeed seed) {
    if (!seed.name().equals(user.getName())) {
      user.updateName(seed.name());
    }
    if (!passwordEncoder.matches(SEED_PASSWORD, user.getPassword())) {
      user.changePassword(passwordEncoder.encode(SEED_PASSWORD));
    }
    if (!Boolean.TRUE.equals(user.getIsActive())
        || user.getAccountStatus() != AccountStatus.ACTIVE) {
      user.restore();
    }
    return user;
  }

  private void ensurePost(PostSeed seed, Map<String, User> usersByEmail) {
    User leader = usersByEmail.get(seed.leaderEmail());
    Squad squad = findOrCreateSquad(seed);

    squad.updateLoungePost(
        seed.title(),
        seed.description().strip(),
        seed.type(),
        LocalDate.now().plusDays(seed.deadlineAfterDays()),
        seed.maxMembers(),
        seed.tags(),
        seed.roles());

    if (seed.closed() && !Boolean.TRUE.equals(squad.getIsArchived())) {
      squad.archive();
    }

    ensureMinimumViews(squad, seed.views());
    ensureMember(squad, leader, SquadRole.LEADER);
    for (String memberEmail : splitCsv(seed.memberEmails())) {
      ensureMember(squad, usersByEmail.get(memberEmail), SquadRole.MEMBER);
    }
  }

  private Squad findOrCreateSquad(PostSeed seed) {
    return squadRepository
        .findByNameAndIsDeletedFalse(seed.title())
        .orElseGet(
            () ->
                squadRepository.save(
                    Squad.builder()
                        .name(seed.title())
                        .description(seed.description().strip())
                        .build()));
  }

  private void ensureMember(Squad squad, User user, SquadRole role) {
    if (user == null || squadMemberRepository.existsBySquadAndUser(squad, user)) {
      return;
    }
    squadMemberRepository.save(SquadMember.builder().squad(squad).user(user).role(role).build());
  }

  private void ensureMinimumViews(Squad squad, long targetViews) {
    while ((squad.getViewCount() == null ? 0L : squad.getViewCount()) < targetViews) {
      squad.increaseViewCount();
    }
  }

  private List<UserSeed> userSeeds() {
    return seedSqlExecutor.query(
        "db/local/lounge-user-seeds.sql",
        (resultSet, rowNumber) ->
            new UserSeed(
                resultSet.getString("email"),
                resultSet.getString("name"),
                UserRole.valueOf(resultSet.getString("role_name"))));
  }

  private List<PostSeed> postSeeds() {
    return seedSqlExecutor.query(
        "db/local/lounge-post-seeds.sql",
        (resultSet, rowNumber) ->
            new PostSeed(
                resultSet.getString("title"),
                SquadLoungeType.valueOf(resultSet.getString("lounge_type")),
                resultSet.getInt("deadline_after_days"),
                resultSet.getInt("max_members"),
                resultSet.getString("tags"),
                resultSet.getString("roles"),
                resultSet.getString("description"),
                resultSet.getString("leader_email"),
                resultSet.getString("member_emails"),
                resultSet.getLong("views"),
                resultSet.getBoolean("closed")));
  }

  private List<String> splitCsv(String values) {
    if (values == null || values.isBlank()) {
      return List.of();
    }
    return List.of(values.split(","));
  }

  private record UserSeed(String email, String name, UserRole role) {}

  private record PostSeed(
      String title,
      SquadLoungeType type,
      int deadlineAfterDays,
      int maxMembers,
      String tags,
      String roles,
      String description,
      String leaderEmail,
      String memberEmails,
      long views,
      boolean closed) {}
}
