package com.devpath.api.refund.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.refund.dto.RefundRequestDto;
import com.devpath.api.refund.dto.RefundResponse;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.refund.entity.RefundRequest;
import com.devpath.domain.refund.entity.RefundStatus;
import com.devpath.domain.refund.repository.RefundRepository;
import com.devpath.domain.system.service.SystemPolicyService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

  @Mock private RefundRepository refundRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private CourseEnrollmentRepository courseEnrollmentRepository;
  @Mock private SystemPolicyService systemPolicyService;

  private RefundService service;

  @BeforeEach
  void setUp() {
    service =
        new RefundService(
            refundRepository, courseRepository, courseEnrollmentRepository, systemPolicyService);
  }

  @Test
  void learnerCanSubmitRefundAndRequestSnapshotIsStored() {
    Course course =
        Course.builder()
            .courseId(10L)
            .instructorId(20L)
            .title("강의")
            .price(BigDecimal.valueOf(49000))
            .build();
    CourseEnrollment enrollment =
        CourseEnrollment.builder()
            .course(course)
            .status(EnrollmentStatus.ACTIVE)
            .enrolledAt(LocalDateTime.now().minusDays(2))
            .progressPercentage(20)
            .build();
    RefundRequestDto request = mock(RefundRequestDto.class);
    when(request.getCourseId()).thenReturn(10L);
    when(request.getReason()).thenReturn("학습 계획 변경");
    when(courseEnrollmentRepository.findByUser_IdAndCourse_CourseId(7L, 10L))
        .thenReturn(Optional.of(enrollment));
    when(refundRepository.existsByLearnerIdAndCourseIdAndStatusInAndIsDeletedFalse(
            7L, 10L, List.of(RefundStatus.PENDING, RefundStatus.APPROVED)))
        .thenReturn(false);
    when(systemPolicyService.currentPolicy())
        .thenReturn(new SystemPolicyService.Policy(0.15, 7, 0, true, "1080p", true, 3));
    when(courseRepository.findById(10L)).thenReturn(Optional.of(course));
    when(refundRepository.save(any(RefundRequest.class)))
        .thenAnswer(
            invocation -> {
              RefundRequest saved = invocation.getArgument(0);
              ReflectionTestUtils.setField(saved, "id", 40L);
              return saved;
            });

    RefundResponse response = service.requestRefund(request, 7L);

    assertThat(response.getId()).isEqualTo(40L);
    assertThat(response.getStatus()).isEqualTo(RefundStatus.PENDING);
    assertThat(response.getProgressPercentSnapshot()).isEqualTo(20);
    assertThat(response.getRefundAmount()).isEqualTo(49000L);
    assertThat(response.getReason()).isEqualTo("학습 계획 변경");
  }
}
