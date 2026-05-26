package com.devpath.common.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Component
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

  private static final int MAX_ERROR_DESCRIPTION_LENGTH = 300;

  @Value("${app.oauth2.redirect-url}")
  private String oauth2RedirectUrl;

  @Override
  public void onAuthenticationFailure(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
      throws IOException, ServletException {
    String errorCode = "oauth2_authentication_failed";
    String errorDescription = exception.getMessage();
    String provider = resolveProvider(request);

    if (exception instanceof OAuth2AuthenticationException oauth2Exception) {
      if (oauth2Exception.getError() != null) {
        errorCode = oauth2Exception.getError().getErrorCode();
        if (oauth2Exception.getError().getDescription() != null) {
          errorDescription = oauth2Exception.getError().getDescription();
        }
      }
    }

    Throwable cause = exception.getCause();
    log.error(
        "OAuth2 로그인에 실패했습니다. code={}, description={}, cause={}",
        errorCode,
        errorDescription,
        cause == null ? "없음" : cause.getMessage(),
        exception);

    UriComponentsBuilder redirectBuilder =
        UriComponentsBuilder.fromUriString(oauth2RedirectUrl)
            .queryParam("error", errorCode)
            .queryParam("provider", provider);

    String trimmedDescription = trimErrorDescription(errorDescription);
    if (trimmedDescription != null) {
      redirectBuilder.queryParam("errorDescription", trimmedDescription);
    }

    response.sendRedirect(redirectBuilder.build().encode().toUriString());
  }

  private String resolveProvider(HttpServletRequest request) {
    String requestUri = request.getRequestURI();
    String marker = "/login/oauth2/code/";
    int markerIndex = requestUri.lastIndexOf(marker);

    if (markerIndex >= 0) {
      String registrationId = requestUri.substring(markerIndex + marker.length());
      int pathSeparatorIndex = registrationId.indexOf('/');
      if (pathSeparatorIndex >= 0) {
        registrationId = registrationId.substring(0, pathSeparatorIndex);
      }
      if (!registrationId.isBlank()) {
        return registrationId.toLowerCase();
      }
    }

    String provider = request.getParameter("provider");
    if (provider != null && !provider.isBlank()) {
      return provider.toLowerCase();
    }

    return "unknown";
  }

  private String trimErrorDescription(String errorDescription) {
    if (errorDescription == null || errorDescription.isBlank()) {
      return null;
    }

    if (errorDescription.length() <= MAX_ERROR_DESCRIPTION_LENGTH) {
      return errorDescription;
    }

    return errorDescription.substring(0, MAX_ERROR_DESCRIPTION_LENGTH);
  }
}
