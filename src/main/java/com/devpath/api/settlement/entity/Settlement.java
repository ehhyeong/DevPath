package com.devpath.api.settlement.entity;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "settlement")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Settlement {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long instructorId;

  @Column(nullable = false)
  private Long amount;

  @Column(nullable = false)
  private Long grossAmount;

  @Column(nullable = false)
  private Long feeAmount;

  @Column(nullable = false)
  private Long courseId;

  @Column(nullable = false)
  private LocalDateTime purchasedAt;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  @Column(nullable = false, length = 20)
  private SettlementStatus status = SettlementStatus.PENDING;

  @Builder.Default private Boolean isDeleted = false;

  private LocalDateTime settledAt;

  @CreatedDate private LocalDateTime createdAt;

  public void hold() {
    if (this.status != SettlementStatus.PENDING) {
      throw new CustomException(ErrorCode.SETTLEMENT_NOT_PENDING);
    }
    this.status = SettlementStatus.HELD;
  }

  // 환불 승인 시 현재 강사의 정산 가능 금액에서 환불액만큼 차감한다.
  public void deductAmount(Long refundAmount) {
    if (this.status != SettlementStatus.PENDING) {
      throw new CustomException(ErrorCode.SETTLEMENT_NOT_PENDING);
    }

    if (refundAmount == null || refundAmount <= 0L) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    if (this.amount < refundAmount) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    this.amount = this.amount - refundAmount;
  }
}
