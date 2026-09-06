package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateStreamingPolicy;
import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateSystemPolicy;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.SystemPolicyResponse;
import com.devpath.api.admin.dto.governance.StreamingPolicyUpdateRequest;
import com.devpath.api.admin.dto.governance.SystemPolicyUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.system.entity.SystemSetting;
import com.devpath.domain.system.repository.SystemSettingRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminSystemPolicyService {

  private static final BigDecimal DEFAULT_PLATFORM_FEE_RATE =
      BigDecimal.valueOf(15.0).setScale(1, RoundingMode.HALF_UP);
  private static final BigDecimal DEFAULT_INSTRUCTOR_SETTLEMENT_RATE =
      BigDecimal.valueOf(85.0).setScale(1, RoundingMode.HALF_UP);
  private static final Boolean DEFAULT_HLS_ENCRYPTED = true;
  private static final Integer DEFAULT_MAX_CONCURRENT_DEVICES = 3;
  private static final Integer DEFAULT_REFUND_POLICY_DAYS = 7;
  private static final Long DEFAULT_MAX_COURSE_PRICE = 0L;
  private static final String DEFAULT_MAX_RESOLUTION = "1080p";
  private static final Boolean DEFAULT_WATERMARK_ENABLED = true;
  private static final BigDecimal HUNDRED =
      BigDecimal.valueOf(100).setScale(1, RoundingMode.HALF_UP);

  private final SystemSettingRepository systemSettingRepository;

  @Transactional(readOnly = true)
  public SystemPolicyResponse getSystemPolicies() {
    SystemSetting setting = systemSettingRepository.findTopByOrderBySettingIdAsc().orElse(null);
    return toSystemPolicyResponse(setting);
  }

  public void updateSystemPolicies(UpdateSystemPolicy request) {
    SystemSetting setting = getOrCreateSystemSetting();

    BigDecimal platformFeeRate =
        request != null && request.getPlatformFeeRate() != null
            ? normalizeRate(request.getPlatformFeeRate())
            : setting.getPlatformFeeRate();
    BigDecimal instructorSettlementRate =
        request != null && request.getInstructorSettlementRate() != null
            ? normalizeRate(request.getInstructorSettlementRate())
            : setting.getInstructorSettlementRate();

    validateRatePair(platformFeeRate, instructorSettlementRate);
    setting.updateSystemPolicy(platformFeeRate, instructorSettlementRate);
  }

  public void updateStreamingPolicy(UpdateStreamingPolicy request) {
    SystemSetting setting = getOrCreateSystemSetting();

    Boolean hlsEncrypted =
        request != null && request.getIsHlsEncrypted() != null
            ? request.getIsHlsEncrypted()
            : setting.getIsHlsEncrypted();
    Integer maxConcurrentDevices =
        request != null && request.getMaxConcurrentDevices() != null
            ? request.getMaxConcurrentDevices()
            : setting.getMaxConcurrentDevices();

    if (hlsEncrypted == null || maxConcurrentDevices == null || maxConcurrentDevices <= 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    setting.updateStreamingPolicy(hlsEncrypted, maxConcurrentDevices);
  }

  @Transactional(readOnly = true)
  public com.devpath.api.admin.dto.governance.SystemPolicyResponse getSystemPoliciesSimple() {
    SystemSetting setting = systemSettingRepository.findTopByOrderBySettingIdAsc().orElse(null);

    return com.devpath.api.admin.dto.governance.SystemPolicyResponse.builder()
        .platformFeeRate(
            setting == null
                ? DEFAULT_PLATFORM_FEE_RATE.intValue()
                : setting.getPlatformFeeRate().intValue())
        .refundPolicyDays(
            setting == null ? DEFAULT_REFUND_POLICY_DAYS : setting.getRefundPolicyDays())
        .maxCoursePrice(setting == null ? DEFAULT_MAX_COURSE_PRICE : setting.getMaxCoursePrice())
        .hlsEnabled(setting == null ? DEFAULT_HLS_ENCRYPTED : setting.getIsHlsEncrypted())
        .maxResolution(setting == null ? DEFAULT_MAX_RESOLUTION : setting.getMaxResolution())
        .watermarkEnabled(
            setting == null ? DEFAULT_WATERMARK_ENABLED : setting.getWatermarkEnabled())
        .updatedAt(setting == null ? null : setting.getUpdatedAt())
        .build();
  }

  public void updateSystemPoliciesSimple(SystemPolicyUpdateRequest request) {
    if (request == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
    SystemSetting setting = getOrCreateSystemSetting();
    BigDecimal platformFeeRate = normalizeRate(request.getPlatformFeeRate().doubleValue());
    BigDecimal instructorSettlementRate = HUNDRED.subtract(platformFeeRate);
    validateRatePair(platformFeeRate, instructorSettlementRate);
    setting.updateSystemPolicy(
        platformFeeRate,
        instructorSettlementRate,
        request.getRefundPolicyDays(),
        request.getMaxCoursePrice());
  }

  public void updateStreamingPolicySimple(StreamingPolicyUpdateRequest request) {
    if (request == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
    SystemSetting setting = getOrCreateSystemSetting();
    Boolean hlsEncrypted = request.getHlsEnabled();
    Integer maxConcurrentDevices = setting.getMaxConcurrentDevices();

    if (hlsEncrypted == null
        || maxConcurrentDevices == null
        || maxConcurrentDevices <= 0
        || request.getMaxResolution() == null
        || request.getWatermarkEnabled() == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    setting.updateStreamingPolicy(
        hlsEncrypted,
        maxConcurrentDevices,
        request.getMaxResolution(),
        request.getWatermarkEnabled());
  }

  private BigDecimal normalizeRate(Double value) {
    if (value == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    BigDecimal normalized = BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP);
    if (normalized.compareTo(BigDecimal.ZERO) < 0 || normalized.compareTo(HUNDRED) > 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return normalized;
  }

  private void validateRatePair(BigDecimal platformFeeRate, BigDecimal instructorSettlementRate) {
    if (platformFeeRate.add(instructorSettlementRate).compareTo(HUNDRED) != 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private SystemSetting getOrCreateSystemSetting() {
    return systemSettingRepository
        .findTopByOrderBySettingIdAsc()
        .orElseGet(
            () ->
                systemSettingRepository.save(
                    SystemSetting.builder()
                        .platformFeeRate(DEFAULT_PLATFORM_FEE_RATE)
                        .instructorSettlementRate(DEFAULT_INSTRUCTOR_SETTLEMENT_RATE)
                        .isHlsEncrypted(DEFAULT_HLS_ENCRYPTED)
                        .maxConcurrentDevices(DEFAULT_MAX_CONCURRENT_DEVICES)
                        .refundPolicyDays(DEFAULT_REFUND_POLICY_DAYS)
                        .maxCoursePrice(DEFAULT_MAX_COURSE_PRICE)
                        .maxResolution(DEFAULT_MAX_RESOLUTION)
                        .watermarkEnabled(DEFAULT_WATERMARK_ENABLED)
                        .build()));
  }

  private SystemPolicyResponse toSystemPolicyResponse(SystemSetting setting) {
    if (setting == null) {
      return SystemPolicyResponse.builder()
          .platformFeeRate(DEFAULT_PLATFORM_FEE_RATE)
          .instructorSettlementRate(DEFAULT_INSTRUCTOR_SETTLEMENT_RATE)
          .isHlsEncrypted(DEFAULT_HLS_ENCRYPTED)
          .maxConcurrentDevices(DEFAULT_MAX_CONCURRENT_DEVICES)
          .build();
    }

    return SystemPolicyResponse.builder()
        .platformFeeRate(setting.getPlatformFeeRate())
        .instructorSettlementRate(setting.getInstructorSettlementRate())
        .isHlsEncrypted(setting.getIsHlsEncrypted())
        .maxConcurrentDevices(setting.getMaxConcurrentDevices())
        .build();
  }
}
