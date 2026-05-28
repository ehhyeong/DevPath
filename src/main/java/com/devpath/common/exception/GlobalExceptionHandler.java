package com.devpath.common.exception;

import com.devpath.common.response.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

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

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<ApiResponse<Void>> handleMaxUploadSizeExceededException(
      MaxUploadSizeExceededException e) {
    log.warn("MaxUploadSizeExceededException : {}", e.getMessage());
    return ResponseEntity.status(ErrorCode.FILE_SIZE_EXCEEDED.getHttpStatus())
        .body(
            ApiResponse.error(
                ErrorCode.FILE_SIZE_EXCEEDED.getCode(), ErrorCode.FILE_SIZE_EXCEEDED.getMessage()));
  }

  @ExceptionHandler(HttpMessageNotWritableException.class)
  public ResponseEntity<Void> handleHttpMessageNotWritableException(
      HttpMessageNotWritableException e) {
    if (isClientAbortException(e)) {
      log.debug("Client aborted response before it could be written: {}", rootMessage(e));
      return ResponseEntity.noContent().build();
    }

    log.error("HttpMessageNotWritableException : ", e);
    return ResponseEntity.status(ErrorCode.INTERNAL_SERVER_ERROR.getHttpStatus()).build();
  }

  @ExceptionHandler(AsyncRequestNotUsableException.class)
  public ResponseEntity<Void> handleAsyncRequestNotUsableException(
      AsyncRequestNotUsableException e) {
    log.debug("Client aborted async request before response completion: {}", rootMessage(e));
    return ResponseEntity.noContent().build();
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
    if (isClientAbortException(e)) {
      log.debug("Client aborted request before response completion: {}", rootMessage(e));
      return ResponseEntity.noContent().build();
    }

    log.error("Exception : ", e);
    return ResponseEntity.status(ErrorCode.INTERNAL_SERVER_ERROR.getHttpStatus())
        .body(
            ApiResponse.error(
                ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
                ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
  }

  private boolean isClientAbortException(Throwable throwable) {
    Throwable current = throwable;
    while (current != null) {
      String className = current.getClass().getName();
      if (current instanceof AsyncRequestNotUsableException
          || className.equals("org.apache.catalina.connector.ClientAbortException")) {
        return true;
      }
      current = current.getCause();
    }

    return false;
  }

  private String rootMessage(Throwable throwable) {
    Throwable current = throwable;
    while (current.getCause() != null) {
      current = current.getCause();
    }
    return current.getMessage();
  }
}
