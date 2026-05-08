package com.devpath.api.admin.operation.dto;

import com.devpath.domain.operation.recommendation.RecommendationSetting;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "추천 알고리즘 설정 응답 DTO")
public class RecommendationSettingResponse {

  @Schema(description = "설정 ID", example = "1")
  private Long id;

  @Schema(description = "설정 키", example = "algorithm.weight.recent_activity")
  private String settingKey;

  @Schema(description = "설정 값", example = "0.8")
  private String settingValue;

  @Schema(description = "설명", example = "최근 활동 가중치")
  private String description;

  @Schema(description = "수정 일시")
  private LocalDateTime updatedAt;

  public static RecommendationSettingResponse from(RecommendationSetting setting) {
    return RecommendationSettingResponse.builder()
        .id(setting.getId())
        .settingKey(setting.getSettingKey())
        .settingValue(setting.getSettingValue())
        .description(setting.getDescription())
        .updatedAt(setting.getUpdatedAt())
        .build();
  }
}
