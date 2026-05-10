package com.devpath.common.security;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class GithubEmailClient {

  private static final String GITHUB_EMAILS_API = "https://api.github.com/user/emails";

  private final RestTemplate restTemplate;

  public Optional<String> findPrimaryEmail(String accessToken) {
    try {
      HttpHeaders headers = new HttpHeaders();
      headers.setBearerAuth(accessToken);
      headers.setAccept(List.of(MediaType.valueOf("application/vnd.github+json")));

      ResponseEntity<List<Map<String, Object>>> response =
          restTemplate.exchange(
              GITHUB_EMAILS_API,
              HttpMethod.GET,
              new HttpEntity<>(headers),
              new ParameterizedTypeReference<>() {});

      List<Map<String, Object>> emails = response.getBody();
      if (emails == null || emails.isEmpty()) {
        return Optional.empty();
      }

      return emails.stream()
          .filter(
              email ->
                  Boolean.TRUE.equals(email.get("primary"))
                      && Boolean.TRUE.equals(email.get("verified")))
          .map(email -> (String) email.get("email"))
          .findFirst()
          .or(() -> Optional.ofNullable((String) emails.getFirst().get("email")));
    } catch (Exception e) {
      log.warn("GitHub email lookup failed.", e);
      return Optional.empty();
    }
  }
}
