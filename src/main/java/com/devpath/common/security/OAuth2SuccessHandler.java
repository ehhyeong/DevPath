package com.devpath.common.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final String DEFAULT_ROLE = "ROLE_LEARNER";

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenRedisService tokenRedisService;

    @Value("${app.oauth2.redirect-url}")
    private String oauth2RedirectUrl;

    @Override
    public void onAuthenticationSuccess(
            @NotNull HttpServletRequest request,
            @NotNull HttpServletResponse response,
            @NotNull Authentication authentication
    ) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        Long userId = extractUserId(attributes.get("userId"));

        String accessToken = jwtTokenProvider.createAccessToken(userId, DEFAULT_ROLE);
        String refreshToken = jwtTokenProvider.createRefreshToken(userId, DEFAULT_ROLE);
        tokenRedisService.saveRefreshToken(userId, refreshToken, jwtTokenProvider.getRefreshTokenExpiration());

        String targetUrl = UriComponentsBuilder.fromUriString(oauth2RedirectUrl)
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshToken)
                .queryParam("tokenType", "Bearer")
                .build()
                .toUriString();

        log.info("OAuth2 success redirect. userId={}, target={}", userId, targetUrl);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private Long extractUserId(Object userIdValue) throws ServletException {
        if (userIdValue instanceof Number number) {
            return number.longValue();
        }
        throw new ServletException("OAuth2 userId attribute is missing");
    }
}
