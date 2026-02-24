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
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
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

        // 1. 비공개 이메일인 경우 직접 API 호출해서 가져오기
        if (email == null || email.isBlank()) {
            email = fetchGithubEmail(userRequest.getAccessToken().getTokenValue());
            log.info("Email fetched from GitHub API: {}", email);
        }

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException("github_email_required");
        }

        // 2. DB 저장 및 회원가입 로직
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) {
            User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .password("OAUTH_USER_PASSWORD_DUMMY")
                    .build();
            userRepository.save(newUser);
            log.info("New github user auto-signup completed: {}", email);
        }

        // 3. 🚨 중요: SuccessHandler에서 이메일을 꺼낼 수 있도록 Attributes 수정 🚨
        Map<String, Object> modifiedAttributes = new HashMap<>(attributes);
        modifiedAttributes.put("email", email);

        String userNameAttributeName = userRequest.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        return new DefaultOAuth2User(
                oAuth2User.getAuthorities(),
                modifiedAttributes,
                userNameAttributeName
        );
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
                    new ParameterizedTypeReference<>() {}
            );

            List<Map<String, Object>> emails = response.getBody();
            if (emails == null || emails.isEmpty()) return null;

            return emails.stream()
                    .filter(e -> Boolean.TRUE.equals(e.get("primary")) && Boolean.TRUE.equals(e.get("verified")))
                    .map(e -> (String) e.get("email"))
                    .findFirst()
                    .orElseGet(() -> (String) emails.get(0).get("email"));
        } catch (Exception e) {
            log.warn("Failed to fetch github emails API", e);
            return null;
        }
    }
}