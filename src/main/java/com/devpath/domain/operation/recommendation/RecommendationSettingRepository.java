package com.devpath.domain.operation.recommendation;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecommendationSettingRepository
    extends JpaRepository<RecommendationSetting, Long> {

  Optional<RecommendationSetting> findBySettingKey(String settingKey);
}
