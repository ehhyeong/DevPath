package com.devpath.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GithubEmailClientTest {

  @Mock private RestTemplate restTemplate;

  private GithubEmailClient client;

  @BeforeEach
  void setUp() {
    client = new GithubEmailClient(restTemplate);
  }

  @Test
  @SuppressWarnings({"unchecked", "rawtypes"})
  void findPrimaryEmail_prefersPrimaryVerifiedEmail() {
    when(restTemplate.exchange(
            eq("https://api.github.com/user/emails"),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            any(ParameterizedTypeReference.class)))
        .thenReturn(
            ResponseEntity.ok(
                List.of(
                    Map.of("email", "fallback@test.com", "primary", false, "verified", true),
                    Map.of("email", "primary@test.com", "primary", true, "verified", true))));

    assertThat(client.findPrimaryEmail("token")).contains("primary@test.com");
  }

  @Test
  @SuppressWarnings({"unchecked", "rawtypes"})
  void findPrimaryEmail_returnsEmptyWhenLookupFails() {
    when(restTemplate.exchange(
            eq("https://api.github.com/user/emails"),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            any(ParameterizedTypeReference.class)))
        .thenThrow(new RestClientException("failed"));

    assertThat(client.findPrimaryEmail("token")).isEmpty();
  }
}
