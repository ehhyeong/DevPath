package com.devpath.api.auth.controller;

import com.devpath.api.auth.dto.AuthDto;
import com.devpath.api.auth.service.AuthService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "1. 인증 API", description = "회원가입, 로그인, 재발급, 로그아웃")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "이메일 회원가입")
    @PostMapping("/signup")
    public ApiResponse<Void> signUp(@Valid @RequestBody AuthDto.SignUpRequest request) {
        authService.signUp(request);
        return ApiResponse.success("회원가입이 완료되었습니다.", null);
    }

    @Operation(summary = "이메일 로그인")
    @PostMapping("/login")
    public ApiResponse<AuthDto.TokenResponse> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        AuthDto.TokenResponse response = authService.login(request);
        return ApiResponse.success("로그인에 성공했습니다.", response);
    }

    @Operation(summary = "토큰 재발급")
    @PostMapping({"/reissue", "/refresh"})
    public ApiResponse<AuthDto.TokenResponse> reissue(@Valid @RequestBody AuthDto.ReissueRequest request) {
        AuthDto.TokenResponse response = authService.reissue(request);
        return ApiResponse.success("토큰이 재발급되었습니다.", response);
    }

    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            @AuthenticationPrincipal Long userId,
            @RequestHeader("Authorization") String authorization,
            @RequestBody(required = false) AuthDto.LogoutRequest request
    ) {
        authService.logout(userId, authorization, request == null ? null : request.getRefreshToken());
        return ApiResponse.success("로그아웃이 완료되었습니다.", null);
    }
}
