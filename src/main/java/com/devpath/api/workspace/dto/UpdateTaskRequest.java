package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
import java.util.List;
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

  @Schema(description = "MVP 기능 연결. 생략 시 유지, 빈 배열이면 해제", example = "[\"F1\"]")
  private List<@NotNull @Pattern(regexp = "F[1-9][0-9]*") String> featureIds;

  @Schema(description = "우선순위 (LOW, MEDIUM, HIGH)", example = "HIGH")
  private WorkspaceTaskPriority priority;

  @Schema(description = "마감일", example = "2026-06-15")
  private LocalDate dueDate;
}
