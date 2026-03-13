package com.devpath.common.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotNull;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

  private final JwtTokenProvider jwtTokenProvider;
  private final TokenRedisService tokenRedisService;

  @Value("${app.oauth2.redirect-url}")
  private String oauth2RedirectUrl;

  @Override
  public void onAuthenticationSuccess(
      @NotNull HttpServletRequest request,
      @NotNull HttpServletResponse response,
      @NotNull Authentication authentication)
      throws IOException, ServletException {

    OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
    Map<String, Object> attributes = oAuth2User.getAttributes();

    Long userId = extractUserId(attributes.get("userId"));
    String role = extractRole(attributes.get("role"));

    String accessToken = jwtTokenProvider.createAccessToken(userId, role);
    String refreshToken = jwtTokenProvider.createRefreshToken(userId, role);
    JwtTokenProvider.TokenClaims refreshClaims = jwtTokenProvider.parseRefreshToken(refreshToken);
    tokenRedisService.saveRefreshTokenJti(
        userId, refreshClaims.jti(), jwtTokenProvider.getRefreshTokenExpiration());

    String targetUrl =
        UriComponentsBuilder.fromUriString(oauth2RedirectUrl)
            .queryParam("accessToken", accessToken)
            .queryParam("refreshToken", refreshToken)
            .queryParam("tokenType", "Bearer")
            .build()
            .toUriString();

    log.info("OAuth2 login success. userId={}, target={}", userId, targetUrl);
    getRedirectStrategy().sendRedirect(request, response, targetUrl);
  }

  private Long extractUserId(Object userIdValue) throws ServletException {
    if (userIdValue instanceof Number number) {
      return number.longValue();
    }
    throw new ServletException("OAuth2 userId attribute is missing.");
  }

  private String extractRole(Object roleValue) throws ServletException {
    if (roleValue instanceof String role && !role.isBlank()) {
      return role;
    }
    throw new ServletException("OAuth2 role attribute is missing.");
  }
}
