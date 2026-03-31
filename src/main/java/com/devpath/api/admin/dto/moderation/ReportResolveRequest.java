package com.devpath.api.admin.dto.moderation;

import com.devpath.api.admin.entity.ModerationActionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "신고 처리 요청")
public class ReportResolveRequest {

    @NotBlank
    @Schema(description = "처리 사유", example = "욕설 및 부적절 표현 포함")
    private String reason;

    @NotNull
    @Schema(description = "처리 액션", example = "SUSPEND", allowableValues = {"WARNING", "SUSPEND", "DISMISS"})
    private ModerationActionType action;
}
