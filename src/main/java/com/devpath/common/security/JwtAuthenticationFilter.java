package com.devpath.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    // 요청/응답의 최전단 제어
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 1. HTTP 헤더에서 "Bearer ~" 토큰만 쏙 빼오기
        String token = resolveToken(request);

        // 2. 토큰이 존재하고, 위조되지 않았으며 만료되지 않았는지 검사
        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {

            // 3. 정상 토큰이면 이메일 추출
            String email = jwtTokenProvider.getEmailFromToken(token);

            // 4. Spring Security Context에 "이 사람은 인증된 사람이다!" 라고 도장 쾅 찍어줌 (임시 권한 부여)
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    email, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_LEARNER")));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("Security Context에 '{}' 인증 정보를 저장했습니다.", email);
        }

        // 5. 다음 필터나 Controller로 정상적으로 넘겨줌
        filterChain.doFilter(request, response);
    }

    // 헤더에서 토큰을 파싱하는 유틸 메서드
    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // "Bearer " 이후의 진짜 토큰 값만 자르기
        }
        return null;
    }
}