package com.devpath.common.security;

import com.devpath.api.user.repository.UserRepository;
import com.devpath.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final String GITHUB_EMAILS_API = "https://api.github.com/user/emails";

    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oAuth2User.getAttributes();

        log.info("Github user attributes: {}", attributes);

        String email = (String) attributes.get("email");
        String name = (String) attributes.get("name");
        String loginId = (String) attributes.get("login");

        if (name == null || name.isBlank()) {
            name = loginId;
        }

        if (email == null || email.isBlank()) {
            email = fetchGithubEmail(userRequest.getAccessToken().getTokenValue());
            log.info("Email from /user/emails: {}", email);
        }

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException("github_email_required");
        }

        Optional<User> optionalUser = userRepository.findByEmail(email);

        if (optionalUser.isEmpty()) {
            User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .password("OAUTH_USER_PASSWORD_DUMMY")
                    .build();
            userRepository.save(newUser);
            log.info("New github user auto-signup completed: {}", email);
        } else {
            log.info("Existing github user login: {}", email);
        }

        return oAuth2User;
    }

    private String fetchGithubEmail(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setAccept(List.of(MediaType.valueOf("application/vnd.github+json")));
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    GITHUB_EMAILS_API,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<>() {
                    }
            );

            List<Map<String, Object>> emails = response.getBody();
            if (emails == null || emails.isEmpty()) {
                return null;
            }

            for (Map<String, Object> item : emails) {
                boolean primary = Boolean.TRUE.equals(item.get("primary"));
                boolean verified = Boolean.TRUE.equals(item.get("verified"));
                String email = (String) item.get("email");
                if (primary && verified && email != null && !email.isBlank()) {
                    return email;
                }
            }

            for (Map<String, Object> item : emails) {
                boolean verified = Boolean.TRUE.equals(item.get("verified"));
                String email = (String) item.get("email");
                if (verified && email != null && !email.isBlank()) {
                    return email;
                }
            }

            String fallback = (String) emails.get(0).get("email");
            return (fallback == null || fallback.isBlank()) ? null : fallback;
        } catch (Exception e) {
            log.warn("Failed to fetch github emails API", e);
            return null;
        }
    }
}
