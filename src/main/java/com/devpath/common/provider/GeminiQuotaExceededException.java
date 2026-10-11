package com.devpath.common.provider;

public class GeminiQuotaExceededException extends RuntimeException {

  public GeminiQuotaExceededException() {
    super("Gemini 요청 한도가 초과되었습니다. 잠시 후 다시 시도해 주세요.");
  }
}
