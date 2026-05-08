package com.devpath.api.instructor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "promotion")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Promotion {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long instructorId;

  @Column(nullable = false)
  private Long courseId;

  private String promotionType;

  private Integer discountRate;

  private LocalDateTime startAt;

  private LocalDateTime endAt;

  @Builder.Default private Boolean isActive = true;

  @Builder.Default private Boolean isDeleted = false;

  @CreatedDate private LocalDateTime createdAt;

  public void updateStatus(PromotionStatus status) {
    this.isActive = status == PromotionStatus.ACTIVE;
  }
}
