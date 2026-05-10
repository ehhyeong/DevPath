package com.devpath.common.security;

import com.devpath.common.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtTokenProvider jwtTokenProvider;
  private final TokenRedisService tokenRedisService;
  private final ApiAuthenticationEntryPoint apiAuthenticationEntryPoint;

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

        SecurityContextHolder.getContext()
            .setAuthentication(AuthenticationUtils.createAuthentication(claims, request));
      }

      filterChain.doFilter(request, response);
    } catch (JwtAuthenticationException e) {
      SecurityContextHolder.clearContext();
      apiAuthenticationEntryPoint.commence(request, response, e);
    }
  }

  private String resolveToken(HttpServletRequest request) {
    String bearerToken = request.getHeader("Authorization");
    if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
      return bearerToken.substring(7);
    }
    return null;
  }
}
