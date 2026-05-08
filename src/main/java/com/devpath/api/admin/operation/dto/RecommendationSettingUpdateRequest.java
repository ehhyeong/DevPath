package com.devpath.api.admin.operation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "추천 알고리즘 설정 일괄 수정 요청 DTO")
public class RecommendationSettingUpdateRequest {

  @Schema(description = "변경할 설정 목록")
  private List<SettingItem> settings;

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class SettingItem {
    @NotBlank(message = "설정 키는 필수입니다.")
    @Schema(description = "설정 키", example = "algorithm.weight.recent_activity")
    private String key;

    @NotBlank(message = "설정 값은 필수입니다.")
    @Schema(description = "설정 값", example = "0.9")
    private String value;

    public SettingItem(String key, String value) {
      this.key = key;
      this.value = value;
    }
  }

  public RecommendationSettingUpdateRequest(List<SettingItem> settings) {
    this.settings = settings;
  }
}
