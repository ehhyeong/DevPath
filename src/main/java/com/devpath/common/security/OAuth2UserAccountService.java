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
    return userRepository
        .findByEmail(email)
        .orElseGet(
            () ->
                userRepository.save(
                    User.builder()
                        .email(email)
                        .name(name)
                        .password(OAUTH_USER_PASSWORD_DUMMY)
                        .role(UserRole.ROLE_LEARNER)
                        .build()));
  }
}
