package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.dashboard.AdminDashboardOverviewResponse;
import com.devpath.api.admin.entity.ModerationReportStatus;
import com.devpath.api.admin.repository.ModerationReportRepository;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.learning.entity.proof.Certificate;
import com.devpath.domain.learning.repository.proof.CertificateRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
// 관리자 대시보드 카드와 차트에 들어갈 집계 데이터를 만든다.
public class AdminDashboardService {

  private static final int TREND_DAYS = 7;
  private static final DateTimeFormatter TRAFFIC_LABEL_FORMATTER =
      DateTimeFormatter.ofPattern("M.d", Locale.KOREAN);

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final CertificateRepository certificateRepository;
  private final ModerationReportRepository moderationReportRepository;

  // 여러 도메인 데이터를 한 번에 읽어서 대시보드 응답으로 묶는다.
  public AdminDashboardOverviewResponse getOverview() {
    List<User> users = userRepository.findAllByOrderByCreatedAtDesc();
    List<Course> courses = courseRepository.findAll();
    List<CourseTagMap> courseTagMaps = courseTagMapRepository.findAllWithCourseAndTag();
    List<Certificate> certificates = certificateRepository.findAll();

    long totalReports = moderationReportRepository.count();
    long pendingReports = moderationReportRepository.countByStatus(ModerationReportStatus.PENDING);

    return AdminDashboardOverviewResponse.builder()
        .weeklyActiveUsers(buildWeeklyActiveUsersMetric(users))
        .pendingCourseReviews(buildPendingCourseReviewsMetric(courses))
        .issuedCertificates(buildIssuedCertificatesMetric(certificates, users))
        .pendingReports(buildPendingReportsMetric(pendingReports, totalReports))
        .trafficTrend(buildTrafficTrend(users))
        .courseCategoryDistribution(buildCategoryDistribution(courses, courseTagMaps))
        .build();
  }

  private AdminDashboardOverviewResponse.SummaryMetric buildWeeklyActiveUsersMetric(
      List<User> users) {
    long totalUsers = users.size();
    long currentWeekActiveUsers = countUsersInPeriod(users, 0, TREND_DAYS - 1);
    long previousWeekActiveUsers = countUsersInPeriod(users, TREND_DAYS, TREND_DAYS * 2 - 1);
    long displayedValue =
        currentWeekActiveUsers > 0 ? currentWeekActiveUsers : countActiveUsers(users);
    int progressPercent = calculateRatio(displayedValue, totalUsers);
    int deltaPercent = calculateDeltaPercent(currentWeekActiveUsers, previousWeekActiveUsers);

    return AdminDashboardOverviewResponse.SummaryMetric.builder()
        .value(displayedValue)
        .suffix("")
        .progressPercent(progressPercent)
        .changeLabel(buildDeltaLabel(deltaPercent, "전주 대비"))
        .changeTone(resolveDeltaTone(deltaPercent))
        .build();
  }

  private AdminDashboardOverviewResponse.SummaryMetric buildPendingCourseReviewsMetric(
      List<Course> courses) {
    long totalCourses = courses.size();
    long pendingCourses =
        courses.stream().filter(course -> course.getStatus() == CourseStatus.IN_REVIEW).count();

    return AdminDashboardOverviewResponse.SummaryMetric.builder()
        .value(pendingCourses)
        .suffix("건")
        .progressPercent(calculateRatio(pendingCourses, totalCourses))
        .changeLabel(pendingCourses == 0 ? "검토 대기 없음" : "검토 필요")
        .changeTone(pendingCourses == 0 ? "positive" : "warning")
        .build();
  }

  private AdminDashboardOverviewResponse.SummaryMetric buildIssuedCertificatesMetric(
      List<Certificate> certificates, List<User> users) {
    long totalCertificates = certificates.size();
    long weeklyIssuedCertificates =
        certificates.stream()
            .map(Certificate::getIssuedAt)
            .filter(dateTime -> isWithinPeriod(dateTime, 0, TREND_DAYS - 1))
            .count();

    return AdminDashboardOverviewResponse.SummaryMetric.builder()
        .value(totalCertificates)
        .suffix("")
        .progressPercent(calculateRatio(totalCertificates, Math.max(countActiveUsers(users), 1)))
        .changeLabel(
            weeklyIssuedCertificates > 0
                ? String.format(Locale.KOREAN, "이번 주 %d건 발급", weeklyIssuedCertificates)
                : "이번 주 발급 없음")
        .changeTone(weeklyIssuedCertificates > 0 ? "positive" : "neutral")
        .build();
  }

  private AdminDashboardOverviewResponse.SummaryMetric buildPendingReportsMetric(
      long pendingReports, long totalReports) {
    return AdminDashboardOverviewResponse.SummaryMetric.builder()
        .value(pendingReports)
        .suffix("건")
        .progressPercent(calculateRatio(pendingReports, Math.max(totalReports, 1)))
        .changeLabel(
            pendingReports == 0
                ? "대기 신고 없음"
                : String.format(Locale.KOREAN, "%d건 접수 중", pendingReports))
        .changeTone(pendingReports == 0 ? "positive" : "warning")
        .build();
  }

  // 최근 7일 기준으로 학습자와 강사 유입 추이를 만든다.
  private List<AdminDashboardOverviewResponse.TrafficPoint> buildTrafficTrend(List<User> users) {
    List<AdminDashboardOverviewResponse.TrafficPoint> points = new ArrayList<>();

    for (int offset = TREND_DAYS - 1; offset >= 0; offset--) {
      LocalDate date = LocalDate.now().minusDays(offset);
      long learners = countUsersOnDate(users, date, UserRole.ROLE_LEARNER);
      long instructors = countUsersOnDate(users, date, UserRole.ROLE_INSTRUCTOR);

      points.add(
          AdminDashboardOverviewResponse.TrafficPoint.builder()
              .label(date.format(TRAFFIC_LABEL_FORMATTER))
              .learners(learners)
              .instructors(instructors)
              .build());
    }

    return points;
  }

  // 공개 강의의 대표 태그를 기준으로 카테고리 분포를 계산한다.
  private List<AdminDashboardOverviewResponse.CategoryDistribution> buildCategoryDistribution(
      List<Course> courses, List<CourseTagMap> courseTagMaps) {
    Set<Long> publishedCourseIds =
        courses.stream()
            .filter(course -> course.getStatus() == CourseStatus.PUBLISHED)
            .map(Course::getCourseId)
            .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

    if (publishedCourseIds.isEmpty()) {
      return List.of();
    }

    Map<Long, String> primaryCategoryByCourseId = new LinkedHashMap<>();
    for (CourseTagMap courseTagMap : courseTagMaps) {
      Long courseId = courseTagMap.getCourse().getCourseId();
      if (!publishedCourseIds.contains(courseId)
          || primaryCategoryByCourseId.containsKey(courseId)) {
        continue;
      }

      primaryCategoryByCourseId.put(
          courseId, normalizeCategory(courseTagMap.getTag().getCategory()));
    }

    Map<String, Long> countsByCategory = new LinkedHashMap<>();
    for (Long courseId : publishedCourseIds) {
      String category = primaryCategoryByCourseId.getOrDefault(courseId, "기타");
      countsByCategory.merge(category, 1L, Long::sum);
    }

    long totalPublishedCourses = publishedCourseIds.size();

    return countsByCategory.entrySet().stream()
        .sorted(
            Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                .thenComparing(Map.Entry::getKey))
        .limit(4)
        .map(
            entry ->
                AdminDashboardOverviewResponse.CategoryDistribution.builder()
                    .label(entry.getKey())
                    .count(entry.getValue())
                    .percentage(calculateRatio(entry.getValue(), totalPublishedCourses))
                    .build())
        .toList();
  }

  private long countUsersInPeriod(List<User> users, int startOffsetDays, int endOffsetDays) {
    return users.stream()
        .filter(user -> Boolean.TRUE.equals(user.getIsActive()))
        .map(this::resolveActivityDate)
        .filter(dateTime -> isWithinPeriod(dateTime, startOffsetDays, endOffsetDays))
        .count();
  }

  private long countActiveUsers(List<User> users) {
    return users.stream().filter(user -> Boolean.TRUE.equals(user.getIsActive())).count();
  }

  private long countUsersOnDate(List<User> users, LocalDate date, UserRole role) {
    return users.stream()
        .filter(user -> user.getRole() == role)
        .map(this::resolveActivityDate)
        .filter(dateTime -> dateTime != null && date.equals(dateTime.toLocalDate()))
        .count();
  }

  private LocalDateTime resolveActivityDate(User user) {
    return user.getLastLoginAt() != null ? user.getLastLoginAt() : user.getCreatedAt();
  }

  private boolean isWithinPeriod(LocalDateTime dateTime, int startOffsetDays, int endOffsetDays) {
    if (dateTime == null) {
      return false;
    }

    LocalDate currentDate = LocalDate.now();
    LocalDate periodStart = currentDate.minusDays(endOffsetDays);
    LocalDate periodEnd = currentDate.minusDays(startOffsetDays);
    LocalDate targetDate = dateTime.toLocalDate();

    return !targetDate.isBefore(periodStart) && !targetDate.isAfter(periodEnd);
  }

  private int calculateRatio(long numerator, long denominator) {
    if (denominator <= 0) {
      return 0;
    }

    return (int) Math.max(0, Math.min(100, Math.round((numerator * 100.0f) / denominator)));
  }

  private int calculateDeltaPercent(long current, long previous) {
    if (current <= 0 && previous <= 0) {
      return 0;
    }

    if (previous <= 0) {
      return 100;
    }

    return (int) Math.round(((current - previous) * 100.0f) / previous);
  }

  private String buildDeltaLabel(int deltaPercent, String prefix) {
    if (deltaPercent > 0) {
      return String.format(Locale.KOREAN, "%s +%d%%", prefix, deltaPercent);
    }

    if (deltaPercent < 0) {
      return String.format(Locale.KOREAN, "%s %d%%", prefix, deltaPercent);
    }

    return String.format(Locale.KOREAN, "%s 변화 없음", prefix);
  }

  private String resolveDeltaTone(int deltaPercent) {
    if (deltaPercent > 0) {
      return "positive";
    }

    if (deltaPercent < 0) {
      return "negative";
    }

    return "neutral";
  }

  private String normalizeCategory(String category) {
    if (category == null || category.isBlank()) {
      return "기타";
    }

    return switch (category.trim().toLowerCase(Locale.ROOT)) {
      case "backend" -> "백엔드";
      case "frontend" -> "프론트엔드";
      case "devops" -> "DevOps";
      case "cs" -> "CS";
      default -> category.trim();
    };
  }
}
