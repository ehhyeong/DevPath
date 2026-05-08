package com.devpath.api.instructor.dto.revenue;

import com.devpath.api.settlement.entity.Settlement;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SettlementResponse {

  private Long settlementId;
  private Long instructorId;
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
