package com.devpath.domain.system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "system_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SystemSetting {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "setting_id")
  private Long settingId;

  @Column(name = "platform_fee_rate", precision = 5, scale = 2, nullable = false)
  private BigDecimal platformFeeRate;

  @Column(name = "instructor_settlement_rate", precision = 5, scale = 2, nullable = false)
  private BigDecimal instructorSettlementRate;

  @Column(name = "is_hls_encrypted", nullable = false)
  private Boolean isHlsEncrypted;

  @Column(name = "max_concurrent_devices", nullable = false)
  private Integer maxConcurrentDevices;

  @Builder.Default
  @Column(name = "refund_policy_days", nullable = false, columnDefinition = "integer default 7")
  private Integer refundPolicyDays = 7;

  @Builder.Default
  @Column(name = "max_course_price", nullable = false, columnDefinition = "bigint default 0")
  private Long maxCoursePrice = 0L;

  @Builder.Default
  @Column(
      name = "max_resolution",
      nullable = false,
      length = 10,
      columnDefinition = "varchar(10) default '1080p'")
  private String maxResolution = "1080p";

  @Builder.Default
  @Column(name = "watermark_enabled", nullable = false, columnDefinition = "boolean default true")
  private Boolean watermarkEnabled = true;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public void updateSystemPolicy(BigDecimal platformFeeRate, BigDecimal instructorSettlementRate) {
    this.platformFeeRate = platformFeeRate;
    this.instructorSettlementRate = instructorSettlementRate;
  }

  public void updateSystemPolicy(
      BigDecimal platformFeeRate,
      BigDecimal instructorSettlementRate,
      Integer refundPolicyDays,
      Long maxCoursePrice) {
    updateSystemPolicy(platformFeeRate, instructorSettlementRate);
    this.refundPolicyDays = refundPolicyDays;
    this.maxCoursePrice = maxCoursePrice;
  }

  public void updateStreamingPolicy(Boolean hlsEncrypted, Integer maxConcurrentDevices) {
    this.isHlsEncrypted = hlsEncrypted;
    this.maxConcurrentDevices = maxConcurrentDevices;
  }

  public void updateStreamingPolicy(
      Boolean hlsEncrypted,
      Integer maxConcurrentDevices,
      String maxResolution,
      Boolean watermarkEnabled) {
    updateStreamingPolicy(hlsEncrypted, maxConcurrentDevices);
    this.maxResolution = maxResolution;
    this.watermarkEnabled = watermarkEnabled;
  }
}
