package com.devpath.common.security;

import com.devpath.domain.user.entity.User;
import com.devpath.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    // 깃허브에서 유저 정보를 성공적으로 가져오면 이 메서드가 자동으로 실행됩니다.
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 1. 부모 클래스(DefaultOAuth2UserService)를 통해 깃허브에서 유저 기본 정보를 다 받아옴
        OAuth2User oAuth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oAuth2User.getAttributes();

        log.info("🐙 Github에서 받아온 유저 정보: {}", attributes);

        // 2. 필요한 데이터만 쏙쏙 뽑아내기
        String email = (String) attributes.get("email");
        String name = (String) attributes.get("name");
        String loginId = (String) attributes.get("login"); // 깃허브 닉네임

        // 깃허브에 이름이 안 적혀있으면 닉네임을 이름으로 씀
        if (name == null) name = loginId;

        // 이메일이 숨김 처리되어 못 가져온 경우 방어 로직
        if (email == null) {
            throw new OAuth2AuthenticationException("깃허브 이메일 정보가 필요합니다.");
        }

        // 3. 우리 DB에 이메일이 있는지 확인하고, 없으면 '자동 회원가입' 처리!
        Optional<User> optionalUser = userRepository.findByEmail(email);

        if (optionalUser.isEmpty()) {
            User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .password("OAUTH_USER_PASSWORD_DUMMY") // 소셜 로그인은 비번이 필요없으니 가짜 비번을 넣음
                    .build();
            userRepository.save(newUser);
            log.info("🎉 새로운 깃허브 유저 자동 회원가입 완료: {}", email);
        } else {
            log.info("👋 기존 유저 깃허브 로그인: {}", email);
        }

        // 4. 추출한 유저 정보를 시큐리티에게 넘겨줌
        return oAuth2User;
    }
}