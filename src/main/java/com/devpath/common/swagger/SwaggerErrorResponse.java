package com.devpath.common.swagger;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "공통 에러 응답 DTO")
public class SwaggerErrorResponse {

    @Schema(description = "성공 여부", example = "false")
    private boolean success = false;

    @Schema(description = "에러 코드", example = "INVALID_INPUT")
    private String code = "INVALID_INPUT";

    @Schema(description = "에러 메시지", example = "잘못된 요청 입력입니다.")
    private String message = "잘못된 요청 입력입니다.";

    @Schema(description = "에러 시 데이터는 null", nullable = true, example = "null")
    private Object data = null;
}
