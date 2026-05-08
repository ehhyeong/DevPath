package com.devpath.common.exception;

import com.devpath.common.response.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(CustomException.class)
  public ResponseEntity<ApiResponse<Void>> handleCustomException(CustomException e) {
    log.warn("CustomException : {}", e.getMessage());
    ErrorCode errorCode = e.getErrorCode();
    return ResponseEntity.status(errorCode.getHttpStatus())
        .body(ApiResponse.error(errorCode.getCode(), errorCode.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidationException(
      MethodArgumentNotValidException e) {
    log.warn("MethodArgumentNotValidException : {}", e.getMessage());
    return ResponseEntity.status(ErrorCode.INVALID_INPUT_VALUE.getHttpStatus())
        .body(
            ApiResponse.error(
                ErrorCode.INVALID_INPUT_VALUE.getCode(),
                ErrorCode.INVALID_INPUT_VALUE.getMessage()));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
      ConstraintViolationException e) {
    log.warn("ConstraintViolationException : {}", e.getMessage());
    return ResponseEntity.status(ErrorCode.INVALID_INPUT_VALUE.getHttpStatus())
        .body(
            ApiResponse.error(
                ErrorCode.INVALID_INPUT_VALUE.getCode(),
                ErrorCode.INVALID_INPUT_VALUE.getMessage()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
    log.error("Exception : ", e);
    return ResponseEntity.status(ErrorCode.INTERNAL_SERVER_ERROR.getHttpStatus())
        .body(
            ApiResponse.error(
                ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
                ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
  }
}
