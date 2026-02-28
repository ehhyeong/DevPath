package com.devpath.api.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class AuthDto {

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @Schema(description = "회원가입 요청 DTO")
    public static class SignUpRequest {
        @Schema(description = "사용자 이메일", example = "test@devpath.com")
        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        private String email;

        @Schema(description = "사용자 비밀번호", example = "password123!")
        @NotBlank(message = "비밀번호는 필수입니다.")
        private String password;

        @Schema(description = "사용자 이름", example = "홍길동")
        @NotBlank(message = "이름은 필수입니다.")
        private String name;
    }

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @Schema(description = "로그인 요청 DTO")
    public static class LoginRequest {
        @Schema(description = "사용자 이메일", example = "test@devpath.com")
        @NotBlank(message = "이메일은 필수입니다.")
        private String email;

        @Schema(description = "사용자 비밀번호", example = "password123!")
        @NotBlank(message = "비밀번호는 필수입니다.")
        private String password;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @Schema(description = "인증 토큰 응답 DTO")
    public static class TokenResponse {
        @Schema(description = "액세스 토큰 (JWT)")
        private String accessToken;

        @Schema(description = "사용자 이름")
        private String name;
    }
}