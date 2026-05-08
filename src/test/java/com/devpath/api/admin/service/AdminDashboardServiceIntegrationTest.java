package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.api.admin.dto.dashboard.AdminDashboardOverviewResponse;
import com.devpath.api.admin.dto.moderation.ModerationReportSummaryResponse;
import com.devpath.api.admin.entity.ModerationReport;
import com.devpath.api.admin.entity.ModerationReportStatus;
import com.devpath.api.admin.repository.ModerationReportRepository;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
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
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({AdminDashboardService.class, AdminModerationService.class})
// 관리자 대시보드 집계와 신고 목록 변환이 실제 JPA 데이터로 동작하는지 검증한다.
class AdminDashboardServiceIntegrationTest {

  @Autowired private AdminDashboardService adminDashboardService;
  @Autowired private AdminModerationService adminModerationService;

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
}
