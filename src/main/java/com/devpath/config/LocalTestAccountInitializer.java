package com.devpath.config;

import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
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
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@RequiredArgsConstructor
public class LocalTestAccountInitializer implements CommandLineRunner {

  private static final String TEST_PASSWORD = "devpath1234";
  private static final List<TestAccountSeed> TEST_ACCOUNTS =
      List.of(
          new TestAccountSeed("learner@devpath.com", "\uC774\uD559\uC2B5", UserRole.ROLE_LEARNER),
          new TestAccountSeed(
              "instructor@devpath.com", "\uD64D\uC9C0\uD6C8", UserRole.ROLE_INSTRUCTOR),
          new TestAccountSeed("admin@devpath.com", "\uBC15\uC11C\uC5F0", UserRole.ROLE_ADMIN));

  private final JdbcTemplate jdbcTemplate;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  @Override
  @Transactional
  public void run(String... args) {
    ensureRoles();
    ensureTestAccounts();
  }

  private void ensureRoles() {
    List.of(
            new RoleSeed("ROLE_LEARNER", "General learner"),
            new RoleSeed("ROLE_INSTRUCTOR", "Can create and manage courses"),
            new RoleSeed("ROLE_ADMIN", "System administrator"))
        .forEach(this::ensureRole);
  }

  private void ensureRole(RoleSeed role) {
    jdbcTemplate.update(
        """
        INSERT INTO roles (role_name, description)
        SELECT ?, ?
        WHERE NOT EXISTS (
            SELECT 1
            FROM roles
            WHERE role_name = ?
        )
        """,
        role.name(),
        role.description(),
        role.name());
  }

  private void ensureTestAccounts() {
    TEST_ACCOUNTS.forEach(this::ensureTestAccount);
  }

  private void ensureTestAccount(TestAccountSeed account) {
    userRepository
        .findByEmail(account.email())
        .ifPresentOrElse(
            user -> restoreTestAccount(user, account), () -> createTestAccount(account));
  }

  private void createTestAccount(TestAccountSeed account) {
    User user =
        User.builder()
            .email(account.email())
            .password(passwordEncoder.encode(TEST_PASSWORD))
            .name(account.name())
            .role(account.role())
            .build();

    userRepository.save(user);
  }

  private void restoreTestAccount(User user, TestAccountSeed account) {
    if (!account.name().equals(user.getName())) {
      user.updateName(account.name());
    }

    if (!passwordEncoder.matches(TEST_PASSWORD, user.getPassword())) {
      user.changePassword(passwordEncoder.encode(TEST_PASSWORD));
    }

    if (!Boolean.TRUE.equals(user.getIsActive()) || user.getAccountStatus() != AccountStatus.ACTIVE) {
      user.restore();
    }
  }

  private record RoleSeed(String name, String description) {}

  private record TestAccountSeed(String email, String name, UserRole role) {}
}
