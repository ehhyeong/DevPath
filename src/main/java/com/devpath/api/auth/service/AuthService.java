package com.devpath.api.auth.service;

import com.devpath.api.auth.dto.AuthDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.security.AccountAccessService;
import com.devpath.common.security.JwtTokenProvider;
import com.devpath.common.security.TokenRedisService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AuthService {

  private static final String TOKEN_TYPE = "Bearer";

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider jwtTokenProvider;
  private final TokenRedisService tokenRedisService;
  private final AccountAccessService accountAccessService;

  @Transactional
  public void signUp(AuthDto.SignUpRequest request) {
    if (userRepository.existsByEmail(request.getEmail())) {
      throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
    }

    User user =
        User.builder()
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .name(request.getName())
            .role(UserRole.ROLE_LEARNER)
            .build();

    userRepository.save(user);
  }

  @Transactional
  public AuthDto.TokenResponse login(AuthDto.LoginRequest request) {
    User user =
        userRepository
            .findByEmail(request.getEmail())
            .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

    if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
      throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
    }
    accountAccessService.validateActive(user);
    user.updateLastLoginAt();

    String roleName = user.getRole().name();
    String accessToken = jwtTokenProvider.createAccessToken(user.getId(), roleName);
    String refreshToken = jwtTokenProvider.createRefreshToken(user.getId(), roleName);
    JwtTokenProvider.TokenClaims refreshClaims = jwtTokenProvider.parseRefreshToken(refreshToken);
    tokenRedisService.saveRefreshTokenJti(
        user.getId(), refreshClaims.jti(), jwtTokenProvider.getRefreshTokenExpiration());

    return AuthDto.TokenResponse.builder()
        .tokenType(TOKEN_TYPE)
        .accessToken(accessToken)
        .refreshToken(refreshToken)
        .name(user.getName())
        .build();
  }

  @Transactional
  public AuthDto.TokenResponse reissue(AuthDto.ReissueRequest request) {
    String refreshToken = request.getRefreshToken();
    JwtTokenProvider.TokenClaims claims = jwtTokenProvider.parseRefreshToken(refreshToken);

    if (tokenRedisService.isRefreshJtiBlacklisted(claims.jti())) {
      throw new CustomException(ErrorCode.REFRESH_TOKEN_REUSED);
    }

    String activeRefreshJti =
        tokenRedisService
            .getRefreshTokenJti(claims.userId())
            .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

    if (!activeRefreshJti.equals(claims.jti())) {
      throw new CustomException(ErrorCode.REFRESH_TOKEN_REUSED);
    }

    User user = accountAccessService.requireActiveAccount(claims.userId());
    if (accountAccessService.wasIssuedBeforeInvalidation(user, claims.issuedAt())) {
      tokenRedisService.deleteRefreshToken(claims.userId());
      throw new CustomException(ErrorCode.ACCOUNT_ACCESS_BLOCKED);
    }

    tokenRedisService.blacklistRefreshJti(
        claims.jti(), jwtTokenProvider.getRemainingValidity(refreshToken));

    String roleName = user.getRole().name();
    String newAccessToken = jwtTokenProvider.createAccessToken(claims.userId(), roleName);
    String newRefreshToken = jwtTokenProvider.createRefreshToken(claims.userId(), roleName);
    JwtTokenProvider.TokenClaims newRefreshClaims =
        jwtTokenProvider.parseRefreshToken(newRefreshToken);
    tokenRedisService.saveRefreshTokenJti(
        claims.userId(), newRefreshClaims.jti(), jwtTokenProvider.getRefreshTokenExpiration());

    return AuthDto.TokenResponse.builder()
        .tokenType(TOKEN_TYPE)
        .accessToken(newAccessToken)
        .refreshToken(newRefreshToken)
        .name(user.getName())
        .build();
  }

  @Transactional
  public void logout(Long userId, String authorizationHeader, String refreshToken) {
    if (userId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    String accessToken = extractBearerToken(authorizationHeader);
    JwtTokenProvider.TokenClaims accessClaims = jwtTokenProvider.parseAccessToken(accessToken);
    if (!userId.equals(accessClaims.userId())) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    if (StringUtils.hasText(refreshToken)) {
      JwtTokenProvider.TokenClaims refreshClaims = jwtTokenProvider.parseRefreshToken(refreshToken);
      if (!userId.equals(refreshClaims.userId())) {
        throw new CustomException(ErrorCode.REFRESH_TOKEN_MISMATCH);
      }
      tokenRedisService.blacklistRefreshJti(
          refreshClaims.jti(), jwtTokenProvider.getRemainingValidity(refreshToken));
    }

    tokenRedisService.deleteRefreshToken(userId);

    long remaining = jwtTokenProvider.getRemainingValidity(accessToken);
    tokenRedisService.blacklistAccessJti(accessClaims.jti(), remaining);
  }

  private String extractBearerToken(String authorizationHeader) {
    if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
      throw new CustomException(ErrorCode.INVALID_AUTH_HEADER);
    }
    return authorizationHeader.substring(7);
  }
}
