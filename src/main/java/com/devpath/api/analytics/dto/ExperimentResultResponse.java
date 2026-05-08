package com.devpath.api.analytics.dto;

import com.devpath.domain.analytics.ExperimentResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "A/B 테스트 결과 응답 DTO")
public class ExperimentResultResponse {

  @Schema(description = "실험 고유 ID", example = "EXP-2026-001")
  private String experimentId;

  @Schema(description = "실험 이름", example = "홈 화면 추천 UI 변경 테스트")
  private String experimentName;

  @Schema(
      description = "결과 지표 (JSON 형식)",
      example = "{\"variantA_ctr\": 0.15, \"variantB_ctr\": 0.22}")
  private String metricsJson;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  public static ExperimentResultResponse from(ExperimentResult result) {
    return ExperimentResultResponse.builder()
        .experimentId(result.getExperimentId())
        .experimentName(result.getExperimentName())
        .metricsJson(result.getMetricsJson())
        .createdAt(result.getCreatedAt())
        .build();
  }
}
