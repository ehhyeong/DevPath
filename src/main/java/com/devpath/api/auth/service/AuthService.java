package com.devpath.api.auth.service;

import com.devpath.api.auth.dto.AuthDto;
import com.devpath.domain.user.entity.User;
import com.devpath.api.user.repository.UserRepository;
import com.devpath.common.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    // 회원가입 로직
    @Transactional
    public void signUp(AuthDto.SignUpRequest request) {
        // 1. 이메일 중복 검사
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다."); // 전역 예외 처리기가 잡아줌
        }

        // 2. 비밀번호 암호화 및 유저 엔티티 생성
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                // .role("ROLE_LEARNER") // 엔티티 설계에 따라 기본 권한 부여 (필요 시 주석 해제)
                .build();

        // 3. DB에 저장
        userRepository.save(user);
    }

    // 로그인 로직
    @Transactional(readOnly = true)
    public AuthDto.TokenResponse login(AuthDto.LoginRequest request) {
        // 1. 이메일로 유저 찾기
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일입니다."));

        // 2. 비밀번호 일치 여부 확인
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // 3. 로그인 성공 시 JWT 액세스 토큰 발급
        String token = jwtTokenProvider.createAccessToken(user.getEmail(), "ROLE_LEARNER");

        // 4. Controller에게 DTO 형태로 반환 (Entity 노출 금지 원칙)
        return AuthDto.TokenResponse.builder()
                .accessToken(token)
                .name(user.getName())
                .build();
    }
}