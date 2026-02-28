package com.devpath.api.auth.service;

import com.devpath.api.auth.dto.AuthDto;
import com.devpath.api.user.repository.UserRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.security.JwtTokenProvider;
import com.devpath.common.security.TokenRedisService;
import com.devpath.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String DEFAULT_ROLE = "ROLE_LEARNER";
    private static final String TOKEN_TYPE = "Bearer";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenRedisService tokenRedisService;

    @Transactional
    public void signUp(AuthDto.SignUpRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .build();

        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public AuthDto.TokenResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), DEFAULT_ROLE);
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId(), DEFAULT_ROLE);
        JwtTokenProvider.TokenClaims refreshClaims = jwtTokenProvider.parseRefreshToken(refreshToken);
        tokenRedisService.saveRefreshTokenJti(
                user.getId(),
                refreshClaims.jti(),
                jwtTokenProvider.getRefreshTokenExpiration()
        );

        return AuthDto.TokenResponse.builder()
                .tokenType(TOKEN_TYPE)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .name(user.getName())
                .build();
    }

    @Transactional
    public AuthDto.TokenResponse reissue(AuthDto.ReissueRequest request) {
        String refreshToken = request.getRefreshToken();
        JwtTokenProvider.TokenClaims claims = jwtTokenProvider.parseRefreshToken(refreshToken);

        if (tokenRedisService.isRefreshJtiBlacklisted(claims.jti())) {
            tokenRedisService.deleteRefreshToken(claims.userId());
            throw new CustomException(ErrorCode.REFRESH_TOKEN_REUSED);
        }

        String activeRefreshJti = tokenRedisService.getRefreshTokenJti(claims.userId())
                .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        if (!activeRefreshJti.equals(claims.jti())) {
            tokenRedisService.deleteRefreshToken(claims.userId());
            throw new CustomException(ErrorCode.REFRESH_TOKEN_REUSED);
        }

        tokenRedisService.blacklistRefreshJti(claims.jti(), jwtTokenProvider.getRemainingValidity(refreshToken));

        String newAccessToken = jwtTokenProvider.createAccessToken(claims.userId(), claims.role());
        String newRefreshToken = jwtTokenProvider.createRefreshToken(claims.userId(), claims.role());
        JwtTokenProvider.TokenClaims newRefreshClaims = jwtTokenProvider.parseRefreshToken(newRefreshToken);
        tokenRedisService.saveRefreshTokenJti(
                claims.userId(),
                newRefreshClaims.jti(),
                jwtTokenProvider.getRefreshTokenExpiration()
        );

        String name = userRepository.findById(claims.userId())
                .map(User::getName)
                .orElse(null);

        return AuthDto.TokenResponse.builder()
                .tokenType(TOKEN_TYPE)
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .name(name)
                .build();
    }

    @Transactional
    public void logout(Long userId, String authorizationHeader, String refreshToken) {
        if (userId == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        String accessToken = extractBearerToken(authorizationHeader);
        JwtTokenProvider.TokenClaims accessClaims = jwtTokenProvider.parseAccessToken(accessToken);
        if (!userId.equals(accessClaims.userId())) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        if (StringUtils.hasText(refreshToken)) {
            JwtTokenProvider.TokenClaims refreshClaims = jwtTokenProvider.parseRefreshToken(refreshToken);
            if (!userId.equals(refreshClaims.userId())) {
                throw new CustomException(ErrorCode.REFRESH_TOKEN_MISMATCH);
            }
            tokenRedisService.blacklistRefreshJti(refreshClaims.jti(), jwtTokenProvider.getRemainingValidity(refreshToken));
        }

        tokenRedisService.deleteRefreshToken(userId);

        long remaining = jwtTokenProvider.getRemainingValidity(accessToken);
        tokenRedisService.blacklistAccessJti(accessClaims.jti(), remaining);
    }

    private String extractBearerToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            throw new CustomException(ErrorCode.INVALID_AUTH_HEADER);
        }
        return authorizationHeader.substring(7);
    }
}
