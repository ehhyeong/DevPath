package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.admin.dto.dashboard.AdminDashboardOverviewResponse;
import com.devpath.api.admin.dto.moderation.ContentBlindRequest;
import com.devpath.api.admin.dto.moderation.ModerationReportSummaryResponse;
import com.devpath.api.admin.dto.moderation.ReportResolveRequest;
import com.devpath.api.admin.entity.ModerationActionType;
import com.devpath.api.admin.entity.ModerationReport;
import com.devpath.api.admin.entity.ModerationReportStatus;
import com.devpath.api.admin.repository.ModerationReportRepository;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.report.dto.ReportCreateRequest;
import com.devpath.api.report.dto.ReportTargetType;
import com.devpath.api.report.service.ReportSubmissionService;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.security.TokenRedisService;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({AdminDashboardService.class, AdminModerationService.class, ReportSubmissionService.class})
// 관리자 대시보드 집계와 신고 목록 변환이 실제 JPA 데이터로 동작하는지 검증한다.
class AdminDashboardServiceIntegrationTest {

  @MockitoBean private NotificationEventService notificationEventService;
  @MockitoBean private TokenRedisService tokenRedisService;

  @Autowired private AdminDashboardService adminDashboardService;
  @Autowired private AdminModerationService adminModerationService;
  @Autowired private ReportSubmissionService reportSubmissionService;

  @Autowired private UserRepository userRepository;
  @Autowired private TagRepository tagRepository;
  @Autowired private CourseRepository courseRepository;
  @Autowired private CourseTagMapRepository courseTagMapRepository;
  @Autowired private ModerationReportRepository moderationReportRepository;
  @Autowired private ReviewRepository reviewRepository;
  @Autowired private EntityManager entityManager;

  @Test
  @DisplayName("관리자 대시보드 개요는 실제 저장 데이터를 집계한다")
  // 대시보드 개요가 저장된 사용자, 강의, 신고 데이터를 집계하는지 확인한다.
  void getOverviewAggregatesPersistedData() {
    User learner = saveUser("overview-learner@devpath.com", UserRole.ROLE_LEARNER);
    User instructor = saveUser("overview-instructor@devpath.com", UserRole.ROLE_INSTRUCTOR);
    Tag backend = saveTag("Spring Boot", "backend");

    Course publishedCourse = saveCourse(instructor, "Published Course", CourseStatus.PUBLISHED);
    saveCourse(instructor, "Review Course", CourseStatus.IN_REVIEW);
    courseTagMapRepository.save(
        CourseTagMap.builder().course(publishedCourse).tag(backend).proficiencyLevel(5).build());
    moderationReportRepository.save(
        ModerationReport.builder()
            .reporterUserId(learner.getId())
            .targetUserId(instructor.getId())
            .reason("Spam content")
            .status(ModerationReportStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .build());
    flushAndClear();

    AdminDashboardOverviewResponse response = adminDashboardService.getOverview();

    assertThat(response.getWeeklyActiveUsers().getValue()).isGreaterThanOrEqualTo(2);
    assertThat(response.getPendingCourseReviews().getValue()).isEqualTo(1);
    assertThat(response.getPendingReports().getValue()).isEqualTo(1);
    assertThat(response.getTrafficTrend()).hasSize(7);
    assertThat(response.getCourseCategoryDistribution())
        .extracting(AdminDashboardOverviewResponse.CategoryDistribution::getLabel)
        .contains("백엔드");
  }

  @Test
  @DisplayName("신고 목록 조회는 상태 기준으로 반환한다")
  // 신고 목록 조회가 상태 필터를 적용해 대기 신고만 반환하는지 확인한다.
  void getReportsReturnsPendingReports() {
    User learner = saveUser("report-learner@devpath.com", UserRole.ROLE_LEARNER);
    User instructor = saveUser("report-instructor@devpath.com", UserRole.ROLE_INSTRUCTOR);

    moderationReportRepository.save(
        ModerationReport.builder()
            .reporterUserId(learner.getId())
            .targetUserId(instructor.getId())
            .reason("Pending report")
            .status(ModerationReportStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .build());
    moderationReportRepository.save(
        ModerationReport.builder()
            .reporterUserId(learner.getId())
            .contentId(77L)
            .reason("Resolved report")
            .status(ModerationReportStatus.RESOLVED)
            .createdAt(LocalDateTime.now().minusHours(1))
            .build());
    flushAndClear();

    List<ModerationReportSummaryResponse> reports =
        adminModerationService.getReports(ModerationReportStatus.PENDING);

    assertThat(reports).hasSize(1);
    assertThat(reports.get(0).getStatus()).isEqualTo("PENDING");
    assertThat(reports.get(0).getTargetType()).isEqualTo("USER");
    assertThat(reports.get(0).getTargetLabel()).isEqualTo("회원 신고");
    assertThat(reports.get(0).getTargetSummary())
        .contains(instructor.getName(), instructor.getEmail());
  }

  @Test
  @DisplayName("콘텐츠 신고는 리뷰 기준 대상 설명을 함께 반환한다")
  void getReportsReturnsReadableContentTargetSummary() {
    User learner = saveUser("content-report-learner@devpath.com", UserRole.ROLE_LEARNER);
    User instructor = saveUser("content-report-instructor@devpath.com", UserRole.ROLE_INSTRUCTOR);
    Course course = saveCourse(instructor, "Readable Review Course", CourseStatus.PUBLISHED);
    Review review =
        reviewRepository.save(
            Review.builder()
                .courseId(course.getCourseId())
                .learnerId(learner.getId())
                .rating(4)
                .content("Review content")
                .build());

    moderationReportRepository.save(
        ModerationReport.builder()
            .reporterUserId(instructor.getId())
            .contentId(review.getId())
            .reason("Review report")
            .status(ModerationReportStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .build());
    flushAndClear();

    List<ModerationReportSummaryResponse> reports =
        adminModerationService.getReports(ModerationReportStatus.PENDING);

    assertThat(reports).hasSize(1);
    assertThat(reports.get(0).getTargetType()).isEqualTo("CONTENT");
    assertThat(reports.get(0).getTargetLabel()).isEqualTo("리뷰 신고");
    assertThat(reports.get(0).getTargetSummary())
        .contains("Readable Review Course", learner.getName());
  }

  @Test
  @DisplayName("리뷰 블라인드와 해제는 공개 노출 상태와 관리 이력을 함께 변경한다")
  void blindAndUnblindReviewUpdatesVisibility() {
    User learner = saveUser("blind-review-learner@devpath.com", UserRole.ROLE_LEARNER);
    User instructor = saveUser("blind-review-instructor@devpath.com", UserRole.ROLE_INSTRUCTOR);
    Course course = saveCourse(instructor, "Blind Review Course", CourseStatus.PUBLISHED);
    Review review =
        reviewRepository.save(
            Review.builder()
                .courseId(course.getCourseId())
                .learnerId(learner.getId())
                .rating(3)
                .content("숨김 대상 리뷰")
                .build());
    ModerationReport report =
        moderationReportRepository.save(
            ModerationReport.builder()
                .reporterUserId(instructor.getId())
                .contentId(review.getId())
                .reason("부적절한 리뷰")
                .status(ModerationReportStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build());
    ContentBlindRequest blindRequest = newInstance(ContentBlindRequest.class);
    ReflectionTestUtils.setField(blindRequest, "reason", "운영 정책 위반");

    adminModerationService.blindContent(review.getId(), instructor.getId(), blindRequest);
    flushAndClear();

    assertThat(reviewRepository.findById(review.getId()).orElseThrow().getIsHidden()).isTrue();
    assertThat(
            adminModerationService.getReports(ModerationReportStatus.PENDING).stream()
                .filter(item -> item.getReportId().equals(report.getId()))
                .findFirst()
                .orElseThrow()
                .isBlinded())
        .isTrue();

    adminModerationService.unblindContent(review.getId(), instructor.getId(), blindRequest);
    flushAndClear();

    assertThat(reviewRepository.findById(review.getId()).orElseThrow().getIsHidden()).isFalse();
    assertThat(adminModerationService.getModerationStats().getBlindedContents()).isZero();
  }

  @Test
  @DisplayName("일반 사용자 리뷰 신고는 중복을 막고 관리자 블라인드와 해제까지 연결된다")
  void reportSubmissionFlowsThroughModerationAndPublicVisibility() {
    User author = saveUser("submission-author@devpath.com", UserRole.ROLE_LEARNER);
    User reporter = saveUser("submission-reporter@devpath.com", UserRole.ROLE_LEARNER);
    User admin = saveUser("submission-admin@devpath.com", UserRole.ROLE_ADMIN);
    Course course =
        saveCourse(
            saveUser("submission-instructor@devpath.com", UserRole.ROLE_INSTRUCTOR),
            "Submission Course",
            CourseStatus.PUBLISHED);
    Review review =
        reviewRepository.save(
            Review.builder()
                .courseId(course.getCourseId())
                .learnerId(author.getId())
                .rating(1)
                .content("신고 대상 리뷰")
                .build());
    ReportCreateRequest request =
        new ReportCreateRequest(ReportTargetType.REVIEW, review.getId(), "운영 정책 위반");

    var submitted = reportSubmissionService.submit(reporter.getId(), request);
    assertThatThrownBy(() -> reportSubmissionService.submit(reporter.getId(), request))
        .isInstanceOf(CustomException.class);

    ContentBlindRequest blindRequest = newInstance(ContentBlindRequest.class);
    ReflectionTestUtils.setField(blindRequest, "reason", "검토 중 공개 차단");
    adminModerationService.blindContent(review.getId(), admin.getId(), blindRequest);
    flushAndClear();
    assertThat(
            reviewRepository.findByCourseIdAndIsDeletedFalseAndIsHiddenFalseOrderByCreatedAtDesc(
                course.getCourseId()))
        .isEmpty();

    adminModerationService.unblindContent(review.getId(), admin.getId(), blindRequest);
    flushAndClear();
    assertThat(
            reviewRepository.findByCourseIdAndIsDeletedFalseAndIsHiddenFalseOrderByCreatedAtDesc(
                course.getCourseId()))
        .extracting(Review::getId)
        .containsExactly(review.getId());
    assertThat(submitted.reportId()).isNotNull();
  }

  @Test
  @DisplayName("계정 정지 신고 처리는 이력과 대상 계정 상태를 함께 갱신한다")
  void suspendReportUpdatesHistoryAndAccount() {
    User admin = saveUser("moderation-admin@devpath.com", UserRole.ROLE_ADMIN);
    User reporter = saveUser("moderation-reporter@devpath.com", UserRole.ROLE_LEARNER);
    User target = saveUser("moderation-target@devpath.com", UserRole.ROLE_LEARNER);
    ModerationReport report =
        moderationReportRepository.save(
            ModerationReport.builder()
                .reporterUserId(reporter.getId())
                .targetUserId(target.getId())
                .reason("Repeated abuse")
                .status(ModerationReportStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build());
    ReportResolveRequest request = newInstance(ReportResolveRequest.class);
    ReflectionTestUtils.setField(request, "reason", "운영 정책 반복 위반");
    ReflectionTestUtils.setField(request, "action", ModerationActionType.SUSPEND);

    adminModerationService.resolveReport(report.getId(), admin.getId(), request);
    flushAndClear();

    ModerationReportSummaryResponse resolved =
        adminModerationService.getReports(ModerationReportStatus.RESOLVED).stream()
            .filter(item -> item.getReportId().equals(report.getId()))
            .findFirst()
            .orElseThrow();
    assertThat(resolved.getActionTaken()).isEqualTo("SUSPEND");
    assertThat(resolved.getResolvedBy()).isEqualTo(admin.getId());
    assertThat(resolved.getResolvedAt()).isNotNull();
    assertThat(userRepository.findById(target.getId()).orElseThrow().getAccountStatus())
        .isEqualTo(AccountStatus.RESTRICTED);
    assertThat(adminModerationService.getModerationStats().getSuspendedUsers())
        .isGreaterThanOrEqualTo(1);
  }

  @Test
  @DisplayName("정지 통계는 처리 건수가 아니라 현재 제한된 고유 사용자 수를 반환한다")
  void suspendedStatsCountCurrentUniqueRestrictedUsers() {
    User admin = saveUser("stats-admin@devpath.com", UserRole.ROLE_ADMIN);
    User reporter = saveUser("stats-reporter@devpath.com", UserRole.ROLE_LEARNER);
    User target = saveUser("stats-target@devpath.com", UserRole.ROLE_LEARNER);
    target.restrict();
    userRepository.save(target);
    moderationReportRepository.save(
        ModerationReport.builder()
            .reporterUserId(reporter.getId())
            .targetUserId(target.getId())
            .reason("첫 신고")
            .status(ModerationReportStatus.RESOLVED)
            .actionTaken(ModerationActionType.SUSPEND)
            .resolvedBy(admin.getId())
            .build());
    moderationReportRepository.save(
        ModerationReport.builder()
            .reporterUserId(admin.getId())
            .targetUserId(target.getId())
            .reason("중복 신고")
            .status(ModerationReportStatus.RESOLVED)
            .actionTaken(ModerationActionType.SUSPEND)
            .resolvedBy(admin.getId())
            .build());
    flushAndClear();

    long beforeRestore = adminModerationService.getModerationStats().getSuspendedUsers();
    User stored = userRepository.findById(target.getId()).orElseThrow();
    stored.restore();
    flushAndClear();

    assertThat(adminModerationService.getModerationStats().getSuspendedUsers())
        .isEqualTo(beforeRestore - 1);
  }

  private User saveUser(String email, UserRole role) {
    User user =
        userRepository.save(
            User.builder()
                .email(email)
                .password("encoded-password")
                .name(email)
                .role(role)
                .build());
    ReflectionTestUtils.setField(user, "lastLoginAt", LocalDateTime.now());
    return userRepository.save(user);
  }

  private Tag saveTag(String name, String category) {
    return tagRepository.save(Tag.builder().name(name).category(category).isOfficial(true).build());
  }

  private Course saveCourse(User instructor, String title, CourseStatus status) {
    return courseRepository.save(
        Course.builder()
            .instructor(instructor)
            .title(title)
            .subtitle(title + " subtitle")
            .status(status)
            .price(BigDecimal.valueOf(10000))
            .originalPrice(BigDecimal.valueOf(12000))
            .currency("KRW")
            .build());
  }

  private void flushAndClear() {
    entityManager.flush();
    entityManager.clear();
  }

  private <T> T newInstance(Class<T> type) {
    try {
      var constructor = type.getDeclaredConstructor();
      constructor.setAccessible(true);
      return constructor.newInstance();
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException("Failed to create test request instance", exception);
    }
  }
}
