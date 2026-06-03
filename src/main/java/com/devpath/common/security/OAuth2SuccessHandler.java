package com.devpath.common.security;

import com.devpath.domain.user.entity.User;
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
  private final OAuth2UserAccountService oAuth2UserAccountService;

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

    OAuthUserIdentity identity = resolveIdentity(attributes);
    Long userId = identity.userId();
    String role = identity.role();
    String name = identity.name();
    boolean newUser = identity.newUser();

    String accessToken = jwtTokenProvider.createAccessToken(userId, role);
    String refreshToken = jwtTokenProvider.createRefreshToken(userId, role);
    JwtTokenProvider.TokenClaims refreshClaims = jwtTokenProvider.parseRefreshToken(refreshToken);
    tokenRedisService.saveRefreshTokenJti(
        userId, refreshClaims.jti(), jwtTokenProvider.getRefreshTokenExpiration());

    String tokenFragment =
        UriComponentsBuilder.newInstance()
            .queryParam("accessToken", accessToken)
            .queryParam("refreshToken", refreshToken)
            .queryParam("tokenType", "Bearer")
            .queryParam("name", name)
            .queryParam("newUser", newUser)
            .build()
            .encode()
            .toUriString();
    if (tokenFragment.startsWith("?")) {
      tokenFragment = tokenFragment.substring(1);
    }

    String targetUrl =
        UriComponentsBuilder.fromUriString(oauth2RedirectUrl)
            .fragment(tokenFragment)
            .build()
            .toUriString();

    log.info("OAuth2 login success. userId={}, redirect={}", userId, oauth2RedirectUrl);
    getRedirectStrategy().sendRedirect(request, response, targetUrl);
  }

  private OAuthUserIdentity resolveIdentity(Map<String, Object> attributes) throws ServletException {
    Object userIdValue = attributes.get("userId");
    Object roleValue = attributes.get("role");
    if (userIdValue != null && roleValue != null) {
      return new OAuthUserIdentity(
          extractUserId(userIdValue),
          extractRole(roleValue),
          extractName(attributes),
          extractNewUser(attributes.get("newUser")));
    }

    String email = extractEmail(attributes.get("email"));
    String name = extractName(attributes);
    OAuth2UserAccountService.OAuth2UserAccount account =
        oAuth2UserAccountService.findOrCreateUserWithStatus(email, name);
    User user = account.user();
    return new OAuthUserIdentity(user.getId(), user.getRole().name(), user.getName(), account.newUser());
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

  private String extractEmail(Object emailValue) throws ServletException {
    if (emailValue instanceof String email && !email.isBlank()) {
      return email;
    }
    throw new ServletException("OAuth2 email attribute is missing.");
  }

  private String extractName(Map<String, Object> attributes) {
    Object nameValue = attributes.get("name");
    if (nameValue instanceof String name && !name.isBlank()) {
      return name;
    }
    Object loginValue = attributes.get("login");
    if (loginValue instanceof String login && !login.isBlank()) {
      return login;
    }
    Object emailValue = attributes.get("email");
    if (emailValue instanceof String email && !email.isBlank()) {
      return email;
    }
    return "OAuth User";
  }

  private boolean extractNewUser(Object newUserValue) {
    if (newUserValue instanceof Boolean newUser) {
      return newUser;
    }
    return false;
  }

  private record OAuthUserIdentity(Long userId, String role, String name, boolean newUser) {}
}
