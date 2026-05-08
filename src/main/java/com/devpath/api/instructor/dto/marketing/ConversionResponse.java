package com.devpath.api.instructor.dto.marketing;

import java.time.LocalDateTime;
import java.util.List;

public record ConversionResponse(
    long totalVisitors,
    long totalSignups,
    long totalPurchases,
    double signupRate,
    double purchaseRate,
    long dailySnapshotCount,
    long weeklySnapshotCount,
    List<CourseConversionItem> courseConversions) {

  public record CourseConversionItem(
      Long courseId,
      String courseTitle,
      long totalVisitors,
      long totalSignups,
      long totalPurchases,
      double signupRate,
      double purchaseRate,
      LocalDateTime calculatedAt) {}
}
