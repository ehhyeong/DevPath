package com.devpath.common.security;

import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
// Redis에 토큰 상태(활성 리프레시/블랙리스트)를 저장·조회하는 서비스
public class TokenRedisService {

  private static final String REFRESH_ACTIVE_PREFIX = "refresh:active:";
  private static final String ACCESS_BLACKLIST_PREFIX = "blacklist:access:";
  private static final String REFRESH_BLACKLIST_PREFIX = "blacklist:refresh:";

  private final StringRedisTemplate stringRedisTemplate;

  // 사용자별 현재 유효한 Refresh Token JTI 저장
  public void saveRefreshTokenJti(Long userId, String refreshJti, long ttlMillis) {
    stringRedisTemplate
        .opsForValue()
        .set(refreshActiveKey(userId), refreshJti, Duration.ofMillis(ttlMillis));
  }

  // 사용자별 현재 유효한 Refresh Token JTI 조회
  public Optional<String> getRefreshTokenJti(Long userId) {
    return Optional.ofNullable(stringRedisTemplate.opsForValue().get(refreshActiveKey(userId)));
  }

  // 사용자별 Refresh Token JTI 삭제(로그아웃 등)
  public void deleteRefreshToken(Long userId) {
    stringRedisTemplate.delete(refreshActiveKey(userId));
  }

  // Access Token JTI를 블랙리스트에 등록
  public void blacklistAccessJti(String jti, long ttlMillis) {
    if (ttlMillis <= 0) {
      return;
    }
    stringRedisTemplate
        .opsForValue()
        .set(accessBlacklistKey(jti), "1", Duration.ofMillis(ttlMillis));
  }

  // Access Token JTI 블랙리스트 여부 확인
  public boolean isAccessJtiBlacklisted(String jti) {
    return Boolean.TRUE.equals(stringRedisTemplate.hasKey(accessBlacklistKey(jti)));
  }

  // Refresh Token JTI를 블랙리스트에 등록
  public void blacklistRefreshJti(String jti, long ttlMillis) {
    if (ttlMillis <= 0) {
      return;
    }
    stringRedisTemplate
        .opsForValue()
        .set(refreshBlacklistKey(jti), "1", Duration.ofMillis(ttlMillis));
  }

  // Refresh Token JTI 블랙리스트 여부 확인
  public boolean isRefreshJtiBlacklisted(String jti) {
    return Boolean.TRUE.equals(stringRedisTemplate.hasKey(refreshBlacklistKey(jti)));
  }

  private String refreshActiveKey(Long userId) {
    return REFRESH_ACTIVE_PREFIX + userId;
  }

  private String accessBlacklistKey(String jti) {
    return ACCESS_BLACKLIST_PREFIX + jti;
  }

  private String refreshBlacklistKey(String jti) {
    return REFRESH_BLACKLIST_PREFIX + jti;
  }
}
