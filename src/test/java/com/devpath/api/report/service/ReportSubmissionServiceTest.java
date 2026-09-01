package com.devpath.api.report.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.report.dto.ReportCreateRequest;
import com.devpath.api.report.dto.ReportTargetType;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.admin.entity.ModerationReport;
import com.devpath.domain.admin.entity.ModerationReportStatus;
import com.devpath.domain.admin.repository.ModerationReportRepository;
import com.devpath.domain.review.entity.Review;
import com.devpath.domain.review.repository.ReviewRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ReportSubmissionServiceTest {

  private final ModerationReportRepository reportRepository =
      mock(ModerationReportRepository.class);
  private final ReviewRepository reviewRepository = mock(ReviewRepository.class);
  private final UserRepository userRepository = mock(UserRepository.class);
  private final ReportSubmissionService service =
      new ReportSubmissionService(reportRepository, reviewRepository, userRepository);

  @Test
  void submitsReviewReportIntoAdminModerationFlow() {
    User reporter = user(1L, "reporter@devpath.com");
    Review review = Review.builder().courseId(10L).learnerId(2L).rating(1).content("신고 대상").build();
    ReflectionTestUtils.setField(review, "id", 20L);
    when(userRepository.findById(1L)).thenReturn(Optional.of(reporter));
    when(reviewRepository.findByIdAndIsDeletedFalse(20L)).thenReturn(Optional.of(review));
    when(reportRepository.save(org.mockito.ArgumentMatchers.any()))
        .thenAnswer(
            invocation -> {
              ModerationReport report = invocation.getArgument(0);
              ReflectionTestUtils.setField(report, "id", 30L);
              return report;
            });

    var result = service.submit(1L, new ReportCreateRequest(ReportTargetType.REVIEW, 20L, "욕설 포함"));

    assertThat(result.reportId()).isEqualTo(30L);
    assertThat(result.status()).isEqualTo("PENDING");
  }

  @Test
  void rejectsSelfAndDuplicateReports() {
    User reporter = user(1L, "self@devpath.com");
    when(userRepository.findById(1L)).thenReturn(Optional.of(reporter));

    assertThatThrownBy(
            () -> service.submit(1L, new ReportCreateRequest(ReportTargetType.USER, 1L, "본인 신고")))
        .isInstanceOf(CustomException.class);

    User target = user(2L, "target@devpath.com");
    when(userRepository.findById(2L)).thenReturn(Optional.of(target));
    when(reportRepository.existsByReporterUserIdAndTargetUserIdAndContentIdIsNullAndStatus(
            1L, 2L, ModerationReportStatus.PENDING))
        .thenReturn(true);
    assertThatThrownBy(
            () -> service.submit(1L, new ReportCreateRequest(ReportTargetType.USER, 2L, "중복 신고")))
        .isInstanceOf(CustomException.class);
  }

  private User user(Long id, String email) {
    User user =
        User.builder()
            .email(email)
            .password("encoded")
            .name("사용자")
            .role(UserRole.ROLE_LEARNER)
            .build();
    ReflectionTestUtils.setField(user, "id", id);
    return user;
  }
}
