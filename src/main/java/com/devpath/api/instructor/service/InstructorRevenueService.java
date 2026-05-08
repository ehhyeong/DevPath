package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.revenue.RevenueResponse;
import com.devpath.api.instructor.dto.revenue.SettlementResponse;
import com.devpath.api.settlement.entity.Settlement;
import com.devpath.api.settlement.entity.SettlementStatus;
import com.devpath.api.settlement.repository.SettlementRepository;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorRevenueService {

  private static final int MONTHLY_TREND_LIMIT = 6;
  private static final double PLATFORM_FEE_RATE = 0.2;
  private static final DateTimeFormatter MONTH_KEY_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

  private final SettlementRepository settlementRepository;
  private final CourseRepository courseRepository;

  public RevenueResponse getRevenue(Long instructorId) {
    List<Settlement> settlements =
        settlementRepository.findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(instructorId);
    Map<Long, Course> courseMap = loadCourseMap(settlements);

    long totalRevenue = settlements.stream().mapToLong(Settlement::getGrossAmount).sum();

    LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();

    long monthlyRevenue =
        settlements.stream()
            .filter(
                settlement ->
                    settlement.getPurchasedAt() != null
                        && !settlement.getPurchasedAt().isBefore(startOfMonth))
            .mapToLong(Settlement::getAmount)
            .sum();

    long completedRevenue = sumByStatus(settlements, SettlementStatus.COMPLETED);
    long pendingSettlementAmount = sumByStatus(settlements, SettlementStatus.PENDING);
    long heldSettlementAmount = sumByStatus(settlements, SettlementStatus.HELD);

    return RevenueResponse.builder()
        .totalRevenue(totalRevenue)
        .monthlyRevenue(monthlyRevenue)
        .platformFeeRate(PLATFORM_FEE_RATE)
        .netRevenue(completedRevenue)
        .pendingSettlementCount(countByStatus(settlements, SettlementStatus.PENDING))
        .heldSettlementCount(countByStatus(settlements, SettlementStatus.HELD))
        .completedSettlementCount(countByStatus(settlements, SettlementStatus.COMPLETED))
        .pendingSettlementAmount(pendingSettlementAmount)
        .heldSettlementAmount(heldSettlementAmount)
        .monthlyTrend(buildMonthlyTrend(settlements))
        .courseBreakdown(buildCourseBreakdown(settlements, courseMap))
        .recentTransactions(buildRecentTransactions(settlements, courseMap))
        .build();
  }

  public List<SettlementResponse> getSettlements(Long instructorId) {
    return settlementRepository
        .findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(instructorId)
        .stream()
        .map(SettlementResponse::from)
        .toList();
  }

  private Map<Long, Course> loadCourseMap(List<Settlement> settlements) {
    List<Long> courseIds =
        settlements.stream()
            .map(Settlement::getCourseId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();

    if (courseIds.isEmpty()) {
      return Map.of();
    }

    return courseRepository.findAllById(courseIds).stream()
        .collect(java.util.stream.Collectors.toMap(Course::getCourseId, Function.identity()));
  }

  private long sumByStatus(List<Settlement> settlements, SettlementStatus status) {
    return settlements.stream()
        .filter(settlement -> settlement.getStatus() == status)
        .mapToLong(Settlement::getAmount)
        .sum();
  }

  private long countByStatus(List<Settlement> settlements, SettlementStatus status) {
    return settlements.stream().filter(settlement -> settlement.getStatus() == status).count();
  }

  private List<RevenueResponse.MonthlyRevenueItem> buildMonthlyTrend(List<Settlement> settlements) {
    LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);
    Map<String, Long> amountByMonth = new LinkedHashMap<>();

    for (int offset = MONTHLY_TREND_LIMIT - 1; offset >= 0; offset -= 1) {
      LocalDate monthDate = currentMonth.minusMonths(offset);
      amountByMonth.put(MONTH_KEY_FORMAT.format(monthDate), 0L);
    }

    settlements.forEach(
        settlement -> {
          if (settlement.getPurchasedAt() == null) {
            return;
          }

          String monthKey =
              MONTH_KEY_FORMAT.format(settlement.getPurchasedAt().toLocalDate().withDayOfMonth(1));
          if (!amountByMonth.containsKey(monthKey)) {
            return;
          }

          amountByMonth.put(monthKey, amountByMonth.get(monthKey) + settlement.getAmount());
        });

    String currentMonthKey = MONTH_KEY_FORMAT.format(currentMonth);

    return amountByMonth.entrySet().stream()
        .map(
            entry -> {
              YearMonth yearMonth = YearMonth.parse(entry.getKey(), MONTH_KEY_FORMAT);

              return RevenueResponse.MonthlyRevenueItem.builder()
                  .key(entry.getKey())
                  .label(yearMonth.getMonthValue() + "월")
                  .amount(entry.getValue())
                  .current(entry.getKey().equals(currentMonthKey))
                  .build();
            })
        .toList();
  }

  private List<RevenueResponse.CourseBreakdownItem> buildCourseBreakdown(
      List<Settlement> settlements, Map<Long, Course> courseMap) {
    Map<Long, Long> amountByCourseId = new LinkedHashMap<>();

    settlements.forEach(
        settlement -> {
          Long courseId = settlement.getCourseId();
          if (courseId == null) {
            return;
          }

          amountByCourseId.put(
              courseId, amountByCourseId.getOrDefault(courseId, 0L) + settlement.getAmount());
        });

    long totalAmount = amountByCourseId.values().stream().mapToLong(Long::longValue).sum();
    if (totalAmount <= 0L) {
      return List.of();
    }

    return amountByCourseId.entrySet().stream()
        .sorted(Map.Entry.<Long, Long>comparingByValue(Comparator.reverseOrder()))
        .limit(3)
        .map(
            entry -> {
              Course course = courseMap.get(entry.getKey());
              int percentage = (int) Math.round((entry.getValue() * 100.0) / totalAmount);

              return RevenueResponse.CourseBreakdownItem.builder()
                  .courseId(entry.getKey())
                  .courseTitle(course == null ? "강의 #" + entry.getKey() : course.getTitle())
                  .amount(entry.getValue())
                  .percentage(percentage)
                  .build();
            })
        .toList();
  }

  private List<RevenueResponse.TransactionItem> buildRecentTransactions(
      List<Settlement> settlements, Map<Long, Course> courseMap) {
    return settlements.stream()
        .sorted(
            Comparator.comparing(
                    Settlement::getPurchasedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(
                    Settlement::getSettledAt, Comparator.nullsLast(Comparator.reverseOrder())))
        .limit(12)
        .map(
            settlement -> {
              Course course = courseMap.get(settlement.getCourseId());

              return RevenueResponse.TransactionItem.builder()
                  .settlementId(settlement.getId())
                  .courseId(settlement.getCourseId())
                  .courseTitle(
                      course == null ? "강의 #" + settlement.getCourseId() : course.getTitle())
                  .grossAmount(settlement.getGrossAmount())
                  .feeAmount(settlement.getFeeAmount())
                  .netAmount(settlement.getAmount())
                  .purchasedAt(settlement.getPurchasedAt())
                  .settledAt(settlement.getSettledAt())
                  .status(settlement.getStatus() == null ? null : settlement.getStatus().name())
                  .build();
            })
        .toList();
  }
}
