package com.devpath.config;

import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * legacy seed-data.sql 로 적재되는 계정들은 WHERE NOT EXISTS 패턴이라 한 번 생성되면 비밀번호가 갱신되지 않는다. 과거 시드의 비밀번호 해시가
 * 통일되어 있지 않아(devpath1234! 등) 부팅 시 devpath1234 로 정규화해 모든 시드 계정의 로그인 비밀번호를 일치시킨다. 계정 상태(restricted /
 * deactivated / withdrawn)는 테스트 의도가 있으므로 비밀번호만 변경한다.
 */
@Slf4j
@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
@RequiredArgsConstructor
public class LocalLegacySeedPasswordNormalizer implements CommandLineRunner {

  private static final String SEED_PASSWORD = "devpath1234";

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    int normalized = 0;

    for (String email : legacySeedEmails()) {
      var user = userRepository.findByEmail(email).orElse(null);
      if (user == null) {
        continue;
      }

      if (!passwordEncoder.matches(SEED_PASSWORD, user.getPassword())) {
        user.changePassword(passwordEncoder.encode(SEED_PASSWORD));
        normalized += 1;
      }
    }

    if (normalized > 0) {
      log.info(
          "Normalized {} legacy seed account password(s) to the shared seed password.", normalized);
    }
  }

  private List<String> legacySeedEmails() {
    return seedSqlExecutor.query(
        "db/local/legacy-seed-password-accounts.sql",
        (resultSet, rowNumber) -> resultSet.getString("email"));
  }
}
