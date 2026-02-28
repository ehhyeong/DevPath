package com.devpath.common.security;

import com.devpath.common.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private static final String TOKEN_TYPE_ACCESS = "ACCESS";
    private static final String TOKEN_TYPE_REFRESH = "REFRESH";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    private SecretKey secretKey;

    @PostConstruct
    protected void init() {
        secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    public String createAccessToken(Long userId, String role) {
        return createToken(userId, role, accessTokenExpiration, TOKEN_TYPE_ACCESS);
    }

    public String createRefreshToken(Long userId, String role) {
        return createToken(userId, role, refreshTokenExpiration, TOKEN_TYPE_REFRESH);
    }

    public TokenClaims parseAccessToken(String token) {
        return parseAndValidate(token, TOKEN_TYPE_ACCESS);
    }

    public TokenClaims parseRefreshToken(String token) {
        return parseAndValidate(token, TOKEN_TYPE_REFRESH);
    }

    public long getRefreshTokenExpiration() {
        return refreshTokenExpiration;
    }

    public long getRemainingValidity(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();
            return Math.max(0, claims.getExpiration().getTime() - System.currentTimeMillis());
        } catch (ExpiredJwtException e) {
            return 0;
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            throw new JwtAuthenticationException(ErrorCode.JWT_INVALID);
        } catch (UnsupportedJwtException e) {
            throw new JwtAuthenticationException(ErrorCode.JWT_UNSUPPORTED);
        } catch (IllegalArgumentException e) {
            throw new JwtAuthenticationException(ErrorCode.JWT_EMPTY);
        }
    }

    private String createToken(Long userId, String role, long expirationMillis, String tokenType) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("userId", userId)
                .claim("role", role)
                .claim("tokenType", tokenType)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    private TokenClaims parseAndValidate(String token, String expectedTokenType) {
        try {
            Claims claims = Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();

            Number userIdNumber = claims.get("userId", Number.class);
            String role = claims.get("role", String.class);
            String tokenType = claims.get("tokenType", String.class);

            if (userIdNumber == null || role == null || tokenType == null) {
                throw new JwtAuthenticationException(ErrorCode.JWT_INVALID);
            }

            if (!expectedTokenType.equals(tokenType)) {
                throw new JwtAuthenticationException(ErrorCode.JWT_TYPE_MISMATCH);
            }

            Long userId = userIdNumber.longValue();
            return new TokenClaims(userId, role, tokenType);
        } catch (ExpiredJwtException e) {
            throw new JwtAuthenticationException(ErrorCode.JWT_EXPIRED);
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            throw new JwtAuthenticationException(ErrorCode.JWT_INVALID);
        } catch (UnsupportedJwtException e) {
            throw new JwtAuthenticationException(ErrorCode.JWT_UNSUPPORTED);
        } catch (IllegalArgumentException e) {
            throw new JwtAuthenticationException(ErrorCode.JWT_EMPTY);
        }
    }

    public record TokenClaims(Long userId, String role, String tokenType) {
    }
}
