package com.devpath.common.security;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.time.Instant;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AccountAccessService {

  private final UserRepository userRepository;

  @Transactional(readOnly = true)
  public User requireActiveAccount(Long userId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.ACCOUNT_ACCESS_BLOCKED));
    validateActive(user);
    return user;
  }

  public void validateActive(User user) {
    if (!user.canAuthenticate()) {
      throw new CustomException(ErrorCode.ACCOUNT_ACCESS_BLOCKED);
    }
  }

  @Transactional(readOnly = true)
  public User validateAccessToken(Long userId, Instant issuedAt) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new JwtAuthenticationException(ErrorCode.ACCOUNT_ACCESS_BLOCKED));

    if (!user.canAuthenticate() || wasIssuedBeforeInvalidation(user, issuedAt)) {
      throw new JwtAuthenticationException(ErrorCode.ACCOUNT_ACCESS_BLOCKED);
    }
    return user;
  }

  public boolean wasIssuedBeforeInvalidation(User user, Instant issuedAt) {
    if (user.getTokenInvalidatedAt() == null) {
      return false;
    }
    Instant invalidatedAt = user.getTokenInvalidatedAt().atZone(ZoneId.systemDefault()).toInstant();
    return issuedAt.isBefore(invalidatedAt);
  }
}
