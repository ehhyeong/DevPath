package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateCalendarEventRequest {

    @NotBlank
    @Schema(description = "이벤트 제목", example = "스프린트 회의")
    private String title;

    @Schema(description = "이벤트 설명", example = "2주 스프린트 계획 회의")
    private String description;

    @NotNull
    @Schema(description = "시작 일시", example = "2026-06-10T10:00:00")
    private LocalDateTime startAt;

    @NotNull
    @Schema(description = "종료 일시", example = "2026-06-10T11:00:00")
    private LocalDateTime endAt;
}