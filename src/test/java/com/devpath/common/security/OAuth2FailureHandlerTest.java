package com.devpath.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.test.util.ReflectionTestUtils;

class OAuth2FailureHandlerTest {

  private OAuth2FailureHandler handler;

  @BeforeEach
  void setUp() {
    handler = new OAuth2FailureHandler();
    ReflectionTestUtils.setField(
        handler, "oauth2RedirectUrl", "http://localhost:8084/oauth2/redirect");
  }

  @Test
  void onAuthenticationFailure_redirectsToSpaCallbackWithProviderAndError() throws Exception {
    MockHttpServletRequest request =
        new MockHttpServletRequest("GET", "/login/oauth2/code/google");
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.onAuthenticationFailure(
        request,
        response,
        new OAuth2AuthenticationException(
            new OAuth2Error("invalid_client", "client setting mismatch", null)));

    String redirectedUrl = response.getRedirectedUrl();
    assertThat(response.getStatus()).isEqualTo(302);
    assertThat(redirectedUrl).startsWith("http://localhost:8084/oauth2/redirect?");
    assertThat(redirectedUrl).contains("error=invalid_client");
    assertThat(redirectedUrl).contains("provider=google");
    assertThat(redirectedUrl).contains("errorDescription=client%20setting%20mismatch");
  }
}
