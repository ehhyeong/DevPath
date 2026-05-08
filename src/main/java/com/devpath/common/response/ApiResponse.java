package com.devpath.common.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "공통 API 응답 래퍼")
public class ApiResponse<T> {

  @Schema(description = "요청 성공 여부", example = "true")
  private boolean success;

  private String status;

  @Schema(description = "오류 코드. 성공 응답에서는 null입니다.", example = "INVALID_INPUT")
  private String code;

  private String message;

  private T data;

  private ApiResponse(boolean success, String status, String code, String message, T data) {
    this.success = success;
    this.status = status;
    this.code = code;
    this.message = message;
    this.data = data;
  }

  public static <T> ApiResponse<T> success(T data) {
    return new ApiResponse<>(true, "SUCCESS", null, "요청이 성공적으로 처리되었습니다.", data);
  }

  public static <T> ApiResponse<T> success(String message, T data) {
    return new ApiResponse<>(true, "SUCCESS", null, message, data);
  }

  public static <T> ApiResponse<T> error(String errorCode, String message) {
    return new ApiResponse<>(false, "ERROR", errorCode, message, null);
  }

  public static <T> ApiResponse<T> ok(T data) {
    return success(data);
  }

  public static ApiResponse<Void> ok() {
    return success(null);
  }
}
