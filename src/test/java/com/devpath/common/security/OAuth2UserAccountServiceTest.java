package com.devpath.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OAuth2UserAccountServiceTest {

  @Mock private UserRepository userRepository;

  private OAuth2UserAccountService service;

  @BeforeEach
  void setUp() {
    service = new OAuth2UserAccountService(userRepository);
  }

  @Test
  void findOrCreateUser_returnsExistingUser() {
    User existingUser = User.builder().email("learner@test.com").name("learner").build();
    when(userRepository.findByEmail("learner@test.com")).thenReturn(Optional.of(existingUser));

    User result = service.findOrCreateUser("learner@test.com", "ignored");

    assertThat(result).isSameAs(existingUser);
    verify(userRepository, never()).save(any(User.class));
  }

  @Test
  void findOrCreateUser_createsLearnerForNewEmail() {
    when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    User result = service.findOrCreateUser("new@test.com", "new user");

    assertThat(result.getEmail()).isEqualTo("new@test.com");
    assertThat(result.getName()).isEqualTo("new user");
    assertThat(result.getRole()).isEqualTo(UserRole.ROLE_LEARNER);
  }
}
