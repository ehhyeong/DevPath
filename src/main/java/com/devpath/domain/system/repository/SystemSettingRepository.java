package com.devpath.domain.system.repository;

import com.devpath.domain.system.entity.SystemSetting;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {
  Optional<SystemSetting> findTopByOrderBySettingIdAsc();
}
