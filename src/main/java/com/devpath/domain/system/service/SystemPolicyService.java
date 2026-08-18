package com.devpath.domain.system.service;

import com.devpath.domain.system.entity.SystemSetting;
import com.devpath.domain.system.repository.SystemSettingRepository;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SystemPolicyService {

  private static final BigDecimal DEFAULT_PLATFORM_FEE_PERCENT = BigDecimal.valueOf(15);
  private static final int DEFAULT_REFUND_DAYS = 7;
  private static final String DEFAULT_MAX_RESOLUTION = "1080p";

  private final SystemSettingRepository systemSettingRepository;

  public Policy currentPolicy() {
    return systemSettingRepository
        .findTopByOrderBySettingIdAsc()
        .map(this::toPolicy)
        .orElseGet(Policy::defaults);
  }

  public void validateCoursePrice(BigDecimal price) {
    long maxCoursePrice = currentPolicy().maxCoursePrice();
    if (price != null
        && maxCoursePrice > 0
        && price.compareTo(BigDecimal.valueOf(maxCoursePrice)) > 0) {
      throw new com.devpath.common.exception.CustomException(
          com.devpath.common.exception.ErrorCode.INVALID_INPUT, "강의 가격이 시스템 최대 가격을 초과했습니다.");
    }
  }

  private Policy toPolicy(SystemSetting setting) {
    return new Policy(
        normalizeRate(setting.getPlatformFeeRate()),
        setting.getRefundPolicyDays() == null ? DEFAULT_REFUND_DAYS : setting.getRefundPolicyDays(),
        setting.getMaxCoursePrice() == null ? 0L : setting.getMaxCoursePrice(),
        Boolean.TRUE.equals(setting.getIsHlsEncrypted()),
        setting.getMaxResolution() == null ? DEFAULT_MAX_RESOLUTION : setting.getMaxResolution(),
        Boolean.TRUE.equals(setting.getWatermarkEnabled()),
        setting.getMaxConcurrentDevices() == null ? 3 : setting.getMaxConcurrentDevices());
  }

  private double normalizeRate(BigDecimal percentage) {
    BigDecimal value = percentage == null ? DEFAULT_PLATFORM_FEE_PERCENT : percentage;
    return value.movePointLeft(2).doubleValue();
  }

  public record Policy(
      double platformFeeRate,
      int refundPolicyDays,
      long maxCoursePrice,
      boolean hlsEncrypted,
      String maxResolution,
      boolean watermarkEnabled,
      int maxConcurrentDevices) {

    private static Policy defaults() {
      return new Policy(0.15, 7, 0L, true, "1080p", true, 3);
    }
  }
}
