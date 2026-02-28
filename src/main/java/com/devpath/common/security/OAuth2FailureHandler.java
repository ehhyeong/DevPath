package com.devpath.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

    private final ObjectMapper objectMapper;

    public OAuth2FailureHandler(Optional<ObjectMapper> objectMapper) {
        this.objectMapper = objectMapper.orElseGet(ObjectMapper::new);
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException, ServletException {
        String errorCode = "oauth2_authentication_failed";
        String errorDescription = exception.getMessage();

        if (exception instanceof OAuth2AuthenticationException oauth2Exception) {
            if (oauth2Exception.getError() != null) {
                errorCode = oauth2Exception.getError().getErrorCode();
                if (oauth2Exception.getError().getDescription() != null) {
                    errorDescription = oauth2Exception.getError().getDescription();
                }
            }
        }

        Throwable cause = exception.getCause();
        log.error("OAuth2 로그인에 실패했습니다. code={}, description={}, cause={}",
                errorCode,
                errorDescription,
                cause == null ? "없음" : cause.getMessage(),
                exception);

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");

        Map<String, String> body = new HashMap<>();
        body.put("error", errorCode);
        body.put("errorDescription", errorDescription);
        body.put("provider", "github");

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
