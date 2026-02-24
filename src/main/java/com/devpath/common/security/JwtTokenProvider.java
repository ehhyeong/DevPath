package com.devpath.common.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String salt;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    private SecretKey secretKey;

    @PostConstruct
    protected void init() {
        // application.yml의 secret 값을 가져와서 강력한 암호화 키로 변환
        secretKey = Keys.hmacShaKeyFor(salt.getBytes(StandardCharsets.UTF_8));
    }

    // 1. 유저 정보(이메일, 권한)를 담아 새로운 액세스 토큰 생성
    public String createAccessToken(String email, String role) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + accessTokenExpiration);

        return Jwts.builder()
                .subject(email) // 토큰 주인을 이메일로 기록
                .claim("role", role) // 유저 권한 정보(예: ROLE_LEARNER) 추가
                .issuedAt(now) // 발행일
                .expiration(validity) // 만료일
                .signWith(secretKey) // 비밀키로 서명 쾅!
                .compact();
    }

    // 2. 클라이언트가 가져온 토큰을 뜯어서 이메일 추출
    public String getEmailFromToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey) // 우리 비밀키로 열어봄
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject(); // 아까 넣은 subject(이메일) 꺼내기
    }

    // 3. 토큰이 위조되었거나 만료되지 않았는지 검증
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            log.error("잘못된 JWT 서명입니다.");
        } catch (ExpiredJwtException e) {
            log.error("만료된 JWT 토큰입니다.");
        } catch (UnsupportedJwtException e) {
            log.error("지원되지 않는 JWT 토큰입니다.");
        } catch (IllegalArgumentException e) {
            log.error("JWT 토큰이 비어있거나 잘못되었습니다.");
        }
        return false;
    }
}