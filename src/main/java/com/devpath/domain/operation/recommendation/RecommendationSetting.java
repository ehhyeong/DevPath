package com.devpath.domain.operation.recommendation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "recommendation_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class RecommendationSetting {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "setting_key", nullable = false, unique = true, length = 100)
  private String settingKey;

  @Column(name = "setting_value", nullable = false)
  private String settingValue;

  @Column(length = 255)
  private String description;

  @CreatedDate
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public RecommendationSetting(String settingKey, String settingValue, String description) {
    this.settingKey = settingKey;
    this.settingValue = settingValue;
    this.description = description;
  }

  public void updateValue(String settingValue) {
    this.settingValue = settingValue;
  }
}
