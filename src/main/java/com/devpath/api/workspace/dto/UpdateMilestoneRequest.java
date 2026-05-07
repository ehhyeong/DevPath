package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.MilestoneStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateMilestoneRequest {

    @NotBlank
    @Schema(description = "마일스톤 제목", example = "v1.0 릴리즈 (수정)")
    private String title;

    @Schema(description = "마일스톤 설명", example = "MVP 기능 완성 및 스테이징 배포")
    private String description;

    @Schema(description = "시작일", example = "2026-06-01")
    private LocalDate startDate;

    @NotNull
    @Schema(description = "마감일", example = "2026-07-15")
    private LocalDate dueDate;

    @NotNull
    @Schema(description = "상태 (OPEN, IN_PROGRESS, DONE, CLOSED)", example = "IN_PROGRESS")
    private MilestoneStatus status;
}