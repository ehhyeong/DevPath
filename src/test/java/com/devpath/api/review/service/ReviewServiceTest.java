package com.devpath.api.review.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.repository.ReviewReplyRepository;
import com.devpath.api.instructor.service.InstructorNotificationService;
import com.devpath.api.review.dto.ReviewRequest;
import com.devpath.api.review.dto.ReviewResponse;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

  @Mock private ReviewRepository reviewRepository;
  @Mock private ReviewReplyRepository reviewReplyRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private CourseEnrollmentRepository courseEnrollmentRepository;
  @Mock private InstructorNotificationService instructorNotificationService;

  private ReviewService service;

  @BeforeEach
  void setUp() {
    service =
        new ReviewService(
            reviewRepository,
            reviewReplyRepository,
            courseRepository,
            courseEnrollmentRepository,
            instructorNotificationService);
  }

  @Test
  void activeLearnerCanCreateOneReviewAndInstructorIsNotified() {
    ReviewRequest request = request(10L, 5, "도움이 됐습니다.");
    Course course = Course.builder().courseId(10L).instructorId(20L).title("강의").build();
    CourseEnrollment enrollment =
        CourseEnrollment.builder().course(course).status(EnrollmentStatus.ACTIVE).build();
    when(courseRepository.findById(10L)).thenReturn(Optional.of(course));
    when(courseEnrollmentRepository.findByUser_IdAndCourse_CourseId(7L, 10L))
        .thenReturn(Optional.of(enrollment));
    when(reviewRepository.existsByCourseIdAndLearnerIdAndIsDeletedFalse(10L, 7L)).thenReturn(false);
    when(reviewRepository.save(any(Review.class)))
        .thenAnswer(
            invocation -> {
              Review review = invocation.getArgument(0);
              ReflectionTestUtils.setField(review, "id", 30L);
              return review;
            });

    ReviewResponse response = service.createReview(request, 7L);

    assertThat(response.getId()).isEqualTo(30L);
    assertThat(response.getLearnerId()).isEqualTo(7L);
    assertThat(response.getRating()).isEqualTo(5);
    verify(instructorNotificationService).notifyReview(20L, "강의");
  }

  @Test
  void cancelledEnrollmentCannotCreateReview() {
    ReviewRequest request = mock(ReviewRequest.class);
    when(request.getCourseId()).thenReturn(10L);
    Course course = Course.builder().courseId(10L).instructorId(20L).title("강의").build();
    CourseEnrollment enrollment =
        CourseEnrollment.builder().course(course).status(EnrollmentStatus.CANCELLED).build();
    when(courseRepository.findById(10L)).thenReturn(Optional.of(course));
    when(courseEnrollmentRepository.findByUser_IdAndCourse_CourseId(7L, 10L))
        .thenReturn(Optional.of(enrollment));

    assertThatThrownBy(() -> service.createReview(request, 7L))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.FORBIDDEN);
    verify(reviewRepository, never()).save(any());
  }

  private ReviewRequest request(Long courseId, int rating, String content) {
    ReviewRequest request = mock(ReviewRequest.class);
    when(request.getCourseId()).thenReturn(courseId);
    when(request.getRating()).thenReturn(rating);
    when(request.getContent()).thenReturn(content);
    return request;
  }
}
