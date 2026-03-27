package com.devpath.api.instructor.dto.revenue;

import com.devpath.api.settlement.entity.Settlement;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SettlementResponse {

    private Long settlementId;
    private Long instructorId;
    private Long amount;
    private String status;
    private LocalDateTime settledAt;

    public static SettlementResponse from(Settlement settlement) {
        return SettlementResponse.builder()
                .settlementId(settlement.getId())
                .instructorId(settlement.getInstructorId())
                .amount(settlement.getAmount())
                .status(settlement.getStatus().name())
                .settledAt(settlement.getSettledAt())
                .build();
    }
}