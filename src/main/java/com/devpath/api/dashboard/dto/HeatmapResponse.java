package com.devpath.api.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "학습 활동 히트맵(잔디) 응답 DTO")
public class HeatmapResponse {

  @Schema(description = "학습 일자", example = "2026-03-28")
  private LocalDate date;

  @Schema(description = "해당 일자의 활동량 점수 (0~4 단계)", example = "3")
  private Integer activityLevel;

  @Schema(description = "해당 일자의 학습 시간", example = "2")
  private Integer studyHours;
}
