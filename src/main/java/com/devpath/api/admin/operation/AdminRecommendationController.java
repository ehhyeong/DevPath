package com.devpath.api.admin.operation;

import com.devpath.api.admin.operation.dto.RecommendationSettingResponse;
import com.devpath.api.admin.operation.dto.RecommendationSettingUpdateRequest;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.operation.recommendation.AdminRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin Recommendation Setting", description = "관리자 추천 알고리즘 설정 API")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminRecommendationController {

  private final AdminRecommendationService recommendationService;

  @Operation(summary = "추천 알고리즘 설정 조회", description = "현재 추천 알고리즘 가중치 및 설정값 목록을 조회합니다.")
  @GetMapping("/recommendation-settings")
  public ResponseEntity<ApiResponse<List<RecommendationSettingResponse>>> getSettings() {
    List<RecommendationSettingResponse> responses = recommendationService.getAllSettings();
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @Operation(summary = "추천 알고리즘 설정 일괄 수정", description = "추천 알고리즘의 특정 설정값들을 일괄 수정합니다.")
  @PatchMapping("/recommendation-settings")
  public ResponseEntity<ApiResponse<List<RecommendationSettingResponse>>> updateSettings(
      @Valid @RequestBody RecommendationSettingUpdateRequest request) {
    List<RecommendationSettingResponse> responses = recommendationService.updateSettings(request);
    return ResponseEntity.ok(ApiResponse.success("추천 알고리즘 설정이 업데이트되었습니다.", responses));
  }
}
