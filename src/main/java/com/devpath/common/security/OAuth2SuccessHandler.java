package com.devpath.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;

    // 생성자 주입
    public OAuth2SuccessHandler(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public void onAuthenticationSuccess(
            @NotNull HttpServletRequest request,
            @NotNull HttpServletResponse response,
            @NotNull Authentication authentication
    ) throws IOException, ServletException {

        // 1. 유저 정보 꺼내기 (CustomOAuth2UserService에서 이메일을 강제로 넣어줬으므로 안전하게 가져옴)
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = (String) attributes.get("email");
        log.info("🎉 깃허브 로그인 최종 성공! 토큰 발급 프로세스 시작 - 이메일: {}", email);

        // 2. JWT 액세스 토큰 발급
        // 실제 운영 시에는 DB의 유저 권한 정보를 가져와서 넣어야 하지만, 지금은 기본 ROLE_LEARNER를 부여해
        String accessToken = jwtTokenProvider.createAccessToken(email, "ROLE_LEARNER");

        // 3. 현업 트렌드: 프론트엔드 리다이렉트 설정
        // 성공 시 토큰을 쿼리 스트링에 담아 프론트엔드 전용 리다이렉트 페이지로 보냅니다.
        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:3000/oauth2/redirect")
                .queryParam("accessToken", accessToken)
                .build().toUriString();

        log.info("Redirecting to: {}", targetUrl);

        // 프론트엔드로 유저를 이동시킴
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}