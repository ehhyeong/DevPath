package com.devpath.common.exception;

import lombok.Getter;

@Getter
// 비즈니스 에러 코드를 담아 전달하는 사용자 정의 예외
public class CustomException extends RuntimeException {
  private final ErrorCode errorCode;

  // 에러 코드의 기본 메시지로 예외 생성
  public CustomException(ErrorCode errorCode) {
    super(errorCode.getMessage());
    this.errorCode = errorCode;
  }

  // 커스텀 메시지로 예외 생성 (상세 정보 추가용)
  public CustomException(ErrorCode errorCode, String customMessage) {
    super(customMessage);
    this.errorCode = errorCode;
  }
}
