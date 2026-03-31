package com.devpath.api.instructor.dto.revenue;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RevenueResponse {

    private long totalRevenue;
    private long monthlyRevenue;
    private double platformFeeRate;
    private long netRevenue;
    private long pendingSettlementCount;
    private long heldSettlementCount;
    private long completedSettlementCount;
    private long pendingSettlementAmount;
    private long heldSettlementAmount;
    private List<TransactionItem> recentTransactions;

    @Getter
    @Builder
    public static class TransactionItem {
        private Long settlementId;
        private Long amount;
        private LocalDateTime settledAt;
        private String status;
    }
}
