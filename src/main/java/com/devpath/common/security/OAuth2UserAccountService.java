package com.devpath.common.security;

import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OAuth2UserAccountService {

  private static final String OAUTH_USER_PASSWORD_DUMMY = "OAUTH_USER_PASSWORD_DUMMY";

  private final UserRepository userRepository;

  @Transactional
  public User findOrCreateUser(String email, String name) {
    return findOrCreateUserWithStatus(email, name).user();
  }

  @Transactional
  public OAuth2UserAccount findOrCreateUserWithStatus(String email, String name) {
    return userRepository
        .findByEmail(email)
        .map(user -> new OAuth2UserAccount(user, false))
        .orElseGet(() -> new OAuth2UserAccount(createUser(email, name), true));
  }

  private User createUser(String email, String name) {
    return userRepository
        .save(
            User.builder()
                .email(email)
                .name(name)
                .password(OAUTH_USER_PASSWORD_DUMMY)
                .role(UserRole.ROLE_LEARNER)
                .build());
  }

  public record OAuth2UserAccount(User user, boolean newUser) {}
}
