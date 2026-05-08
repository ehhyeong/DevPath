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
  private List<MonthlyRevenueItem> monthlyTrend;
  private List<CourseBreakdownItem> courseBreakdown;
  private List<TransactionItem> recentTransactions;

  @Getter
  @Builder
  public static class MonthlyRevenueItem {
    private String key;
    private String label;
    private long amount;
    private boolean current;
  }

  @Getter
  @Builder
  public static class CourseBreakdownItem {
    private Long courseId;
    private String courseTitle;
    private long amount;
    private int percentage;
  }

  @Getter
  @Builder
  public static class TransactionItem {
    private Long settlementId;
    private Long courseId;
    private String courseTitle;
    private Long grossAmount;
    private Long feeAmount;
    private Long netAmount;
    private LocalDateTime purchasedAt;
    private LocalDateTime settledAt;
    private String status;
  }
}
