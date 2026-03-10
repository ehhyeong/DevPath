package com.devpath.common.exception;

import com.devpath.common.response.ApiResponse;
import com.devpath.common.security.JwtAuthenticationException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
// 애플리케이션 전역에서 발생하는 예외를 공통 형식의 응답으로 변환한다.
public class GlobalExceptionHandler {

  @ExceptionHandler(CustomException.class)
  // 비즈니스 로직에서 의도적으로 발생시킨 예외를 처리한다.
  public ResponseEntity<ApiResponse<Void>> handleCustomException(CustomException e) {
    // 서비스 계층에서 정의한 ErrorCode를 그대로 응답에 반영한다.
    ErrorCode errorCode = e.getErrorCode();
    return ResponseEntity.status(errorCode.getStatus())
        .body(ApiResponse.error(errorCode.name(), e.getMessage()));
  }

  @ExceptionHandler(JwtAuthenticationException.class)
  // JWT 인증 실패 예외를 처리한다.
  public ResponseEntity<ApiResponse<Void>> handleJwtAuthenticationException(
      JwtAuthenticationException e) {
    // 토큰 만료, 위조, 형식 오류 등 인증 관련 실패를 한 곳에서 처리한다.
    ErrorCode errorCode = e.getErrorCode();
    return ResponseEntity.status(errorCode.getStatus())
        .body(ApiResponse.error(errorCode.name(), errorCode.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  // RequestBody 검증 실패 시 첫 번째 오류 메시지를 반환한다.
  public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValidException(
      MethodArgumentNotValidException e) {
    // 여러 검증 오류가 있어도 사용자에게는 가장 먼저 확인된 메시지를 우선 전달한다.
    String message =
        Optional.ofNullable(e.getBindingResult().getFieldError())
            .map(FieldError::getDefaultMessage)
            .orElse(ErrorCode.INVALID_INPUT.getMessage());

    return ResponseEntity.status(ErrorCode.INVALID_INPUT.getStatus())
        .body(ApiResponse.error(ErrorCode.INVALID_INPUT.name(), message));
  }

  @ExceptionHandler(BindException.class)
  // PathVariable, QueryString 등의 바인딩 오류를 처리한다.
  public ResponseEntity<ApiResponse<Void>> handleBindException(BindException e) {
    // 타입 변환 실패나 누락된 파라미터 같은 요청 형식 오류를 공통 처리한다.
    String message =
        Optional.ofNullable(e.getBindingResult().getFieldError())
            .map(FieldError::getDefaultMessage)
            .orElse(ErrorCode.INVALID_INPUT.getMessage());

    return ResponseEntity.status(ErrorCode.INVALID_INPUT.getStatus())
        .body(ApiResponse.error(ErrorCode.INVALID_INPUT.name(), message));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  // 메서드 파라미터 제약 조건 위반 예외를 처리한다.
  public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
      ConstraintViolationException e) {
    // @RequestParam, @PathVariable 등에 붙은 검증 조건 위반 메시지를 꺼내 사용한다.
    String message =
        e.getConstraintViolations().stream()
            .findFirst()
            .map(ConstraintViolation::getMessage)
            .orElse(ErrorCode.INVALID_INPUT.getMessage());

    return ResponseEntity.status(ErrorCode.INVALID_INPUT.getStatus())
        .body(ApiResponse.error(ErrorCode.INVALID_INPUT.name(), message));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  // DB 제약 조건 위반 시 중복 여부를 판단해 알맞은 오류 코드로 변환한다.
  public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
      DataIntegrityViolationException e) {
    // 실제 DB 오류 메시지에서 제약 조건 이름을 읽어 어떤 중복인지 구분한다.
    String rootMessage =
        Optional.ofNullable(e.getMostSpecificCause()).map(Throwable::getMessage).orElse("");
    String normalizedMessage = rootMessage.toLowerCase();

    // 현재는 커스텀 로드맵 중복 생성 제약만 별도로 구분하고, 나머지는 일반 중복으로 처리한다.
    ErrorCode errorCode =
        normalizedMessage.contains("uk_custom_roadmap_user_original")
            ? ErrorCode.CUSTOM_ROADMAP_ALREADY_EXISTS
            : ErrorCode.DUPLICATE_RESOURCE;

    return ResponseEntity.status(errorCode.getStatus())
        .body(ApiResponse.error(errorCode.name(), errorCode.getMessage()));
  }

  @ExceptionHandler(Exception.class)
  // 처리되지 않은 예외를 기록하고 500 오류 응답을 반환한다.
  public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
    // 예상하지 못한 오류는 로그로 남겨야 이후 원인 분석이 가능하다.
    log.error("Unhandled exception", e);
    return ResponseEntity.status(ErrorCode.INTERNAL_SERVER_ERROR.getStatus())
        .body(
            ApiResponse.error(
                ErrorCode.INTERNAL_SERVER_ERROR.name(),
                ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
  }
}
