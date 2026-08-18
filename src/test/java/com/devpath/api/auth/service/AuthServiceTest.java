package com.devpath.api.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.auth.dto.AuthDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.security.AccountAccessService;
import com.devpath.common.security.JwtTokenProvider;
import com.devpath.common.security.TokenRedisService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtTokenProvider jwtTokenProvider;
  @Mock private TokenRedisService tokenRedisService;
  @Mock private AccountAccessService accountAccessService;
  @InjectMocks private AuthService authService;

  @Test
  void successfulLoginUpdatesActivityAndIssuesTokens() {
    User user = createUser();
    AuthDto.LoginRequest request = loginRequest();
    when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("password", user.getPassword())).thenReturn(true);
    when(jwtTokenProvider.createAccessToken(1L, "ROLE_LEARNER")).thenReturn("access");
    when(jwtTokenProvider.createRefreshToken(1L, "ROLE_LEARNER")).thenReturn("refresh");
    when(jwtTokenProvider.parseRefreshToken("refresh"))
        .thenReturn(
            new JwtTokenProvider.TokenClaims(
                1L, "refresh-jti", "ROLE_LEARNER", "REFRESH", Instant.now()));
    when(jwtTokenProvider.getRefreshTokenExpiration()).thenReturn(1000L);

    var response = authService.login(request);

    assertThat(response.getAccessToken()).isEqualTo("access");
    assertThat(user.getLastLoginAt()).isNotNull();
    verify(accountAccessService).validateActive(user);
    verify(tokenRedisService).saveRefreshTokenJti(1L, "refresh-jti", 1000L);
  }

  @Test
  void blockedAccountDoesNotReceiveTokens() {
    User user = createUser();
    user.restrict();
    AuthDto.LoginRequest request = loginRequest();
    when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("password", user.getPassword())).thenReturn(true);
    org.mockito.Mockito.doThrow(new CustomException(ErrorCode.ACCOUNT_ACCESS_BLOCKED))
        .when(accountAccessService)
        .validateActive(user);

    assertThatThrownBy(() -> authService.login(request))
        .isInstanceOf(CustomException.class)
        .hasMessageContaining("제한");
    verify(jwtTokenProvider, never()).createAccessToken(any(), any());
  }

  private User createUser() {
    User user =
        User.builder()
            .email("login-test@devpath.com")
            .password("encoded")
            .name("로그인 테스트")
            .role(UserRole.ROLE_LEARNER)
            .build();
    ReflectionTestUtils.setField(user, "id", 1L);
    return user;
  }

  private AuthDto.LoginRequest loginRequest() {
    try {
      var constructor = AuthDto.LoginRequest.class.getDeclaredConstructor();
      constructor.setAccessible(true);
      AuthDto.LoginRequest request = constructor.newInstance();
      ReflectionTestUtils.setField(request, "email", "login-test@devpath.com");
      ReflectionTestUtils.setField(request, "password", "password");
      return request;
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
