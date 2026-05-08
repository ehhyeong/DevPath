package com.devpath.api.admin.dto.settlement;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SettlementEligibilityResponse {

  private Long refundRequestId;
  private Long courseId;
  private Long learnerId;
  private Long instructorId;
  private LocalDateTime purchasedAt;
  private LocalDateTime refundDeadline;
  private Integer progressPercent;
  private Long refundAmount;
  private Boolean withinRefundPeriod;
  private Boolean progressEligible;
  private Boolean refundApprovable;
  private Boolean holdBlocked;
  private Boolean hasPendingSettlement;
  private Long candidateSettlementId;
  private Long candidateSettlementAmount;
  private Boolean isEligible;
  private Long remainingDays;
}
