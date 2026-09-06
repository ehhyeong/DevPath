package com.devpath.api.settlement.dto;

import com.devpath.domain.settlement.entity.Settlement;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SettlementResponse {

  private Long settlementId;
  private Long instructorId;
  private Long learnerId;
  private Long courseId;
  private Long grossAmount;
  private Long feeAmount;
  private Long amount;
  private LocalDateTime purchasedAt;
  private String status;
  private LocalDateTime settledAt;

  public static SettlementResponse from(Settlement settlement) {
    return SettlementResponse.builder()
        .settlementId(settlement.getId())
        .instructorId(settlement.getInstructorId())
        .learnerId(settlement.getLearnerId())
        .courseId(settlement.getCourseId())
        .grossAmount(settlement.getGrossAmount())
        .feeAmount(settlement.getFeeAmount())
        .amount(settlement.getAmount())
        .purchasedAt(settlement.getPurchasedAt())
        .status(settlement.getStatus() == null ? null : settlement.getStatus().name())
        .settledAt(settlement.getSettledAt())
        .build();
  }
}
