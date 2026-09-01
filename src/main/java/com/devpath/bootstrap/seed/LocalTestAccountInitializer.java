package com.devpath.bootstrap.seed;

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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@RequiredArgsConstructor
public class LocalTestAccountInitializer implements CommandLineRunner {

  private static final String TEST_PASSWORD = "devpath1234";
  private final LocalSeedSqlExecutor seedSqlExecutor;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  @Override
  @Transactional
  public void run(String... args) {
    ensureRoles();
    ensureTestAccounts();
  }

  private void ensureRoles() {
    seedSqlExecutor.execute("db/local/test-account-roles.sql");
  }

  private void ensureTestAccounts() {
    testAccounts().forEach(this::ensureTestAccount);
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

    if (!Boolean.TRUE.equals(user.getIsActive())
        || user.getAccountStatus() != AccountStatus.ACTIVE) {
      user.restore();
    }
  }

  private List<TestAccountSeed> testAccounts() {
    return seedSqlExecutor.query(
        "db/local/test-accounts.sql",
        (resultSet, rowNumber) ->
            new TestAccountSeed(
                resultSet.getString("email"),
                resultSet.getString("name"),
                UserRole.valueOf(resultSet.getString("role_name"))));
  }

  private record TestAccountSeed(String email, String name, UserRole role) {}
}
