package com.devpath.api.instructor.dto.revenue;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class RevenueResponse {

    private long totalRevenue;
    private long monthlyRevenue;
    private double platformFeeRate;
    private long netRevenue;
    private List<TransactionItem> recentTransactions;

    @Getter
    @Builder
    public static class TransactionItem {
        private Long courseId;
        private Long amount;
        private LocalDateTime settledAt;
        private String status;
    }
}