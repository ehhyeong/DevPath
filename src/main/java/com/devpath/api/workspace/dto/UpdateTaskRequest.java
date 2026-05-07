package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateTaskRequest {

    @NotBlank
    @Schema(description = "태스크 제목", example = "로그인 기능 구현 (수정)")
    private String title;

    @Schema(description = "태스크 설명", example = "JWT + OAuth2 기반 로그인 API 구현")
    private String description;

    @Schema(description = "우선순위 (LOW, MEDIUM, HIGH)", example = "HIGH")
    private WorkspaceTaskPriority priority;

    @Schema(description = "마감일", example = "2026-06-15")
    private LocalDate dueDate;
}