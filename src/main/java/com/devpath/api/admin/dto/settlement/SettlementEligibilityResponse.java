package com.devpath.api.admin.dto.settlement;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SettlementEligibilityResponse {

    private Long refundRequestId;
    private Long courseId;
    private Long learnerId;
    private LocalDateTime purchasedAt;
    private LocalDateTime refundDeadline;
    private Boolean isEligible;
    private Long remainingDays;
}