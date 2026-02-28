package com.devpath.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotNull; // 또는 jakarta.annotation.Nonnull
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    // 생성자 주입을 통해 ObjectMapper가 없을 경우의 예외를 방지합니다.
    public OAuth2SuccessHandler(JwtTokenProvider jwtTokenProvider, Optional<ObjectMapper> objectMapper) {
        this.jwtTokenProvider = jwtTokenProvider;
        // 빈으로 등록되어 있지 않다면 새 인스턴스를 생성하여 대응 (Jackson 3 호환)
        this.objectMapper = objectMapper.orElseGet(ObjectMapper::new);
    }

    @Override
    public void onAuthenticationSuccess(
            @NotNull HttpServletRequest request,
            @NotNull HttpServletResponse response,
            @NotNull Authentication authentication
    ) throws IOException, ServletException {

        // 1. 유저 정보 안전하게 꺼내기 (NPE 방어)
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User oAuth2User)) {
            log.error("인증 객체가 OAuth2User 타입이 아닙니다.");
            return;
        }

        Map<String, Object> attributes = oAuth2User.getAttributes();
        if (attributes == null) {
            log.error("OAuth2User의 속성(Attributes)이 비어있습니다.");
            return;
        }

        String email = (String) attributes.get("email");
        log.info("🎉 깃허브 로그인 최종 성공! 토큰을 발급합니다. 이메일: {}", email);

        // 2. JWT 액세스 토큰 발급
        String token = jwtTokenProvider.createAccessToken(email, "ROLE_LEARNER");

        // 3. 응답 설정
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_OK);

        Map<String, String> tokenMap = new HashMap<>();
        tokenMap.put("accessToken", token);
        tokenMap.put("message", "깃허브 소셜 로그인 성공! 발급된 토큰을 사용하세요.");

        // JSON 출력
        response.getWriter().write(objectMapper.writeValueAsString(tokenMap));

        // ServletException 경고 해결: 실제로 예외가 발생할 수 있는 코드가 없으므로 로그만 남기거나
        // 인터페이스 규격을 맞추기 위해 그대로 둡니다.
    }
}