package com.devpath.domain.operation.recommendation;

import com.devpath.api.admin.operation.dto.RecommendationSettingResponse;
import com.devpath.api.admin.operation.dto.RecommendationSettingUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminRecommendationService {

  private final RecommendationSettingRepository settingRepository;

  public List<RecommendationSettingResponse> getAllSettings() {
    return settingRepository.findAll().stream()
        .map(RecommendationSettingResponse::from)
        .collect(Collectors.toList());
  }

  @Transactional
  public List<RecommendationSettingResponse> updateSettings(
      RecommendationSettingUpdateRequest request) {
    for (RecommendationSettingUpdateRequest.SettingItem item : request.getSettings()) {
      RecommendationSetting setting =
          settingRepository
              .findBySettingKey(item.getKey())
              .orElseThrow(() -> new CustomException(ErrorCode.SETTING_NOT_FOUND));

      setting.updateValue(item.getValue());
    }
    return getAllSettings();
  }
}
