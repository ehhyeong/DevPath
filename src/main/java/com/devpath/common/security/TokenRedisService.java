package com.devpath.common.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TokenRedisService {

    private static final String REFRESH_ACTIVE_PREFIX = "refresh:active:";
    private static final String ACCESS_BLACKLIST_PREFIX = "blacklist:access:";
    private static final String REFRESH_BLACKLIST_PREFIX = "blacklist:refresh:";

    private final StringRedisTemplate stringRedisTemplate;

    public void saveRefreshTokenJti(Long userId, String refreshJti, long ttlMillis) {
        stringRedisTemplate.opsForValue()
                .set(refreshActiveKey(userId), refreshJti, Duration.ofMillis(ttlMillis));
    }

    public Optional<String> getRefreshTokenJti(Long userId) {
        return Optional.ofNullable(stringRedisTemplate.opsForValue().get(refreshActiveKey(userId)));
    }

    public void deleteRefreshToken(Long userId) {
        stringRedisTemplate.delete(refreshActiveKey(userId));
    }

    public void blacklistAccessJti(String jti, long ttlMillis) {
        if (ttlMillis <= 0) {
            return;
        }
        stringRedisTemplate.opsForValue()
                .set(accessBlacklistKey(jti), "1", Duration.ofMillis(ttlMillis));
    }

    public boolean isAccessJtiBlacklisted(String jti) {
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(accessBlacklistKey(jti)));
    }

    public void blacklistRefreshJti(String jti, long ttlMillis) {
        if (ttlMillis <= 0) {
            return;
        }
        stringRedisTemplate.opsForValue()
                .set(refreshBlacklistKey(jti), "1", Duration.ofMillis(ttlMillis));
    }

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
