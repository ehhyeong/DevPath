package com.devpath.domain.operation.recommendation;

import com.devpath.domain.operation.recommendation.entity.RecommendationSetting;
import com.devpath.domain.operation.recommendation.repository.RecommendationSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationAlgorithmPolicy {

  private final RecommendationSettingRepository recommendationSettingRepository;

  public double recentActivityWeight() {
    return readPositiveDouble("algorithm.weight.recent_activity", 1.0);
  }

  public double skillMatchWeight() {
    return recommendationSettingRepository
        .findBySettingKey("algorithm.weight.skill_match")
        .or(() -> recommendationSettingRepository.findBySettingKey("algorithm.weight.tag_match"))
        .map(RecommendationSetting::getSettingValue)
        .map(value -> parsePositiveDouble(value, 1.0))
        .orElse(1.0);
  }

  private double readPositiveDouble(String key, double defaultValue) {
    return recommendationSettingRepository
        .findBySettingKey(key)
        .map(RecommendationSetting::getSettingValue)
        .map(value -> parsePositiveDouble(value, defaultValue))
        .orElse(defaultValue);
  }

  private double parsePositiveDouble(String value, double defaultValue) {
    try {
      double parsed = Double.parseDouble(value);
      return parsed >= 0.0 ? parsed : defaultValue;
    } catch (NumberFormatException exception) {
      return defaultValue;
    }
  }
}
