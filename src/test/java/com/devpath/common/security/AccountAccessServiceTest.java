package com.devpath.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountAccessServiceTest {

  @Mock private UserRepository userRepository;
  @InjectMocks private AccountAccessService accountAccessService;

  @Test
  void blocksRestrictedAccountAndTokensIssuedBeforeRestriction() {
    User user = createUser();
    Instant issuedBeforeRestriction = Instant.now().minusSeconds(10);
    user.restrict();
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> accountAccessService.requireActiveAccount(1L))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.ACCOUNT_ACCESS_BLOCKED);
    assertThatThrownBy(() -> accountAccessService.validateAccessToken(1L, issuedBeforeRestriction))
        .isInstanceOf(JwtAuthenticationException.class);
  }

  @Test
  void acceptsNewTokenAfterAccountIsRestored() {
    User user = createUser();
    user.restrict();
    user.restore();
    Instant issuedAfterRestriction =
        user.getTokenInvalidatedAt().atZone(ZoneId.systemDefault()).toInstant().plusMillis(1);
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    assertThat(accountAccessService.validateAccessToken(1L, issuedAfterRestriction)).isSameAs(user);
  }

  private User createUser() {
    User user =
        User.builder()
            .email("access-test@devpath.com")
            .password("encoded")
            .name("접근 테스트")
            .role(UserRole.ROLE_LEARNER)
            .build();
    org.springframework.test.util.ReflectionTestUtils.setField(user, "id", 1L);
    return user;
  }
}
