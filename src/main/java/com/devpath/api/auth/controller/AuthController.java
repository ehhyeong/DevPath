package com.devpath.api.auth.controller;

import com.devpath.api.auth.dto.AuthDto;
import com.devpath.api.auth.service.AuthService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Swagger 문서화 어노테이션
@Tag(name = "1. 인증 API", description = "회원가입 및 로그인 등 인증 관련 API")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "이메일 회원가입", description = "이메일, 비밀번호, 이름으로 회원가입을 진행합니다.")
    @PostMapping("/signup")
    public ApiResponse<Void> signUp(@Valid @RequestBody AuthDto.SignUpRequest request) {
        authService.signUp(request);
        return ApiResponse.success("회원가입이 완료되었습니다.", null); // 공통 응답 포맷 사용
    }

    @Operation(summary = "이메일 로그인", description = "로그인 성공 시 JWT 액세스 토큰을 발급합니다.")
    @PostMapping("/login")
    public ApiResponse<AuthDto.TokenResponse> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        AuthDto.TokenResponse response = authService.login(request);
        return ApiResponse.success("로그인에 성공했습니다.", response);
    }
}