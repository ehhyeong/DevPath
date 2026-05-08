package com.devpath.api.planner.dto;

import com.devpath.domain.planner.entity.Streak;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "학습 스트릭(연속 학습) 응답 DTO")
public class StreakResponse {

  @Schema(description = "현재 연속 학습 일수", example = "5")
  private Integer currentStreak;

  @Schema(description = "최대 연속 학습 일수", example = "14")
  private Integer longestStreak;

  @Schema(description = "마지막 학습 일자", example = "2026-03-28")
  private LocalDate lastStudyDate;

  public static StreakResponse from(Streak streak) {
    return StreakResponse.builder()
        .currentStreak(streak.getCurrentStreak())
        .longestStreak(streak.getLongestStreak())
        .lastStudyDate(streak.getLastStudyDate())
        .build();
  }
}
