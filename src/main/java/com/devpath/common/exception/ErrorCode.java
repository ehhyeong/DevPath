package com.devpath.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 요청 입력입니다."),
    INVALID_AUTH_HEADER(HttpStatus.BAD_REQUEST, "인증 헤더 형식이 올바르지 않습니다."),

    EMAIL_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "이미 가입된 이메일입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),

    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    JWT_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    JWT_EXPIRED(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
    JWT_UNSUPPORTED(HttpStatus.UNAUTHORIZED, "지원하지 않는 토큰입니다."),
    JWT_EMPTY(HttpStatus.UNAUTHORIZED, "토큰이 비어 있습니다."),
    JWT_BLACKLISTED(HttpStatus.UNAUTHORIZED, "로그아웃 처리된 토큰입니다."),
    JWT_TYPE_MISMATCH(HttpStatus.UNAUTHORIZED, "토큰 타입이 올바르지 않습니다."),
    REFRESH_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "저장된 리프레시 토큰이 없습니다."),
    REFRESH_TOKEN_MISMATCH(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 일치하지 않습니다."),
    REFRESH_TOKEN_REUSED(HttpStatus.UNAUTHORIZED, "리프레시 토큰 재사용이 감지되어 세션이 폐기되었습니다."),

    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
