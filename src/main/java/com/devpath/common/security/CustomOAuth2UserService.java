package com.devpath.common.security;

import com.devpath.domain.user.entity.User;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

  private final GithubEmailClient githubEmailClient;
  private final OAuth2UserAccountService oAuth2UserAccountService;

  @Override
  public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
    OAuth2User oAuth2User = super.loadUser(userRequest);
    Map<String, Object> attributes = oAuth2User.getAttributes();

    String email = resolveEmail(userRequest, attributes);
    if (email == null || email.isBlank()) {
      throw new OAuth2AuthenticationException("github_email_required");
    }

    OAuth2UserAccountService.OAuth2UserAccount account =
        oAuth2UserAccountService.findOrCreateUserWithStatus(email, resolveName(attributes));
    User user = account.user();

    Map<String, Object> modifiedAttributes = new HashMap<>(attributes);
    modifiedAttributes.put("email", email);
    modifiedAttributes.put("name", user.getName());
    modifiedAttributes.put("userId", user.getId());
    modifiedAttributes.put("role", user.getRole().name());
    modifiedAttributes.put("newUser", account.newUser());

    String userNameAttributeName =
        userRequest
            .getClientRegistration()
            .getProviderDetails()
            .getUserInfoEndpoint()
            .getUserNameAttributeName();

    return new DefaultOAuth2User(
        oAuth2User.getAuthorities(), modifiedAttributes, userNameAttributeName);
  }

  private String resolveEmail(OAuth2UserRequest userRequest, Map<String, Object> attributes) {
    String email = (String) attributes.get("email");
    if (email != null && !email.isBlank()) {
      return email;
    }
    return githubEmailClient
        .findPrimaryEmail(userRequest.getAccessToken().getTokenValue())
        .orElse(null);
  }

  private String resolveName(Map<String, Object> attributes) {
    String name = (String) attributes.get("name");
    if (name != null && !name.isBlank()) {
      return name;
    }
    return (String) attributes.get("login");
  }
}
