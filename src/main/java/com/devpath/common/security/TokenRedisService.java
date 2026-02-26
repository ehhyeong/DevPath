package com.devpath.common.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TokenRedisService {

    private static final String REFRESH_PREFIX = "refresh:";
    private static final String BLACKLIST_PREFIX = "blacklist:";

    private final StringRedisTemplate stringRedisTemplate;

    public void saveRefreshToken(Long userId, String refreshToken, long ttlMillis) {
        stringRedisTemplate.opsForValue()
                .set(refreshKey(userId), refreshToken, Duration.ofMillis(ttlMillis));
    }

    public Optional<String> getRefreshToken(Long userId) {
        return Optional.ofNullable(stringRedisTemplate.opsForValue().get(refreshKey(userId)));
    }

    public void deleteRefreshToken(Long userId) {
        stringRedisTemplate.delete(refreshKey(userId));
    }

    public void blacklistAccessToken(String accessToken, long ttlMillis) {
        if (ttlMillis <= 0) {
            return;
        }
        stringRedisTemplate.opsForValue()
                .set(blacklistKey(accessToken), "1", Duration.ofMillis(ttlMillis));
    }

    public boolean isBlacklisted(String accessToken) {
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(blacklistKey(accessToken)));
    }

    private String refreshKey(Long userId) {
        return REFRESH_PREFIX + userId;
    }

    private String blacklistKey(String accessToken) {
        return BLACKLIST_PREFIX + accessToken;
    }
}
