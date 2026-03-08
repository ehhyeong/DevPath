package com.devpath.common.security;

import com.devpath.common.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
// Access Token을 검증해 SecurityContext에 인증 정보를 세팅하는 필터
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtTokenProvider jwtTokenProvider;
  private final TokenRedisService tokenRedisService;
  private final ApiAuthenticationEntryPoint apiAuthenticationEntryPoint;

  // 요청 헤더의 JWT를 검증하고 인증 객체를 설정
  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    try {
      String token = resolveToken(request);

      if (token != null) {
        JwtTokenProvider.TokenClaims claims = jwtTokenProvider.parseAccessToken(token);
        if (tokenRedisService.isAccessJtiBlacklisted(claims.jti())) {
          throw new JwtAuthenticationException(ErrorCode.JWT_BLACKLISTED);
        }

        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(
                claims.userId(),
                null,
                Collections.singleton(new SimpleGrantedAuthority(claims.role())));
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
      }

      filterChain.doFilter(request, response);
    } catch (JwtAuthenticationException e) {
      SecurityContextHolder.clearContext();
      apiAuthenticationEntryPoint.commence(request, response, e);
    }
  }

  private String resolveToken(HttpServletRequest request) {
    // Authorization: Bearer <token> 형식에서 토큰만 추출
    String bearerToken = request.getHeader("Authorization");
    if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
      return bearerToken.substring(7);
    }
    return null;
  }
}
