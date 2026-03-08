package com.devpath.common.response;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
// API 공통 응답 포맷
public class ApiResponse<T> {
  private boolean success;
  private String code;
  private String message;
  private T data;

  public ApiResponse(boolean success, String code, String message, T data) {
    this.success = success;
    this.code = code;
    this.message = message;
    this.data = data;
  }

  // 성공 응답 생성
  public static <T> ApiResponse<T> success(String message, T data) {
    return new ApiResponse<>(true, null, message, data);
  }

  // 성공 응답 생성 (간편 버전 - 데이터 있음)
  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, null, "success", data);
  }

  // 성공 응답 생성 (간편 버전 - 데이터 없음)
  public static ApiResponse<Void> ok() {
    return new ApiResponse<>(true, null, "success", null);
  }

  // 에러 코드와 메시지를 포함한 실패 응답 생성
  public static <T> ApiResponse<T> error(String code, String message) {
    return new ApiResponse<>(false, code, message, null);
  }
}
