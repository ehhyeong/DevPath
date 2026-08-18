package com.devpath.api.review.service;

import com.devpath.api.instructor.entity.ReviewReply;
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
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

  private final ReviewRepository reviewRepository;
  private final ReviewReplyRepository reviewReplyRepository;
  private final CourseRepository courseRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final InstructorNotificationService instructorNotificationService;

  public ReviewResponse createReview(ReviewRequest request, Long learnerId) {
    Course course =
        courseRepository
            .findById(request.getCourseId())
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    CourseEnrollment enrollment =
        courseEnrollmentRepository
            .findByUser_IdAndCourse_CourseId(learnerId, request.getCourseId())
            .orElseThrow(
                () -> new CustomException(ErrorCode.FORBIDDEN, "수강한 강의에만 리뷰를 작성할 수 있습니다."));
    if (enrollment.getStatus() != EnrollmentStatus.ACTIVE
        && enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
      throw new CustomException(ErrorCode.FORBIDDEN, "수강한 강의에만 리뷰를 작성할 수 있습니다.");
    }

    if (reviewRepository.existsByCourseIdAndLearnerIdAndIsDeletedFalse(
        request.getCourseId(), learnerId)) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
    }

    Review review =
        Review.builder()
            .courseId(request.getCourseId())
            .learnerId(learnerId)
            .rating(request.getRating())
            .content(request.getContent())
            .build();

    Review saved = reviewRepository.save(review);

    instructorNotificationService.notifyReview(course.getInstructorId(), course.getTitle());

    return ReviewResponse.from(saved, null);
  }

  @Transactional(readOnly = true)
  public List<ReviewResponse> getReviewsByCourse(Long courseId) {
    List<Review> reviews =
        reviewRepository.findByCourseIdAndIsDeletedFalseAndIsHiddenFalseOrderByCreatedAtDesc(
            courseId);

    Map<Long, ReviewReply> replyMap =
        reviewReplyRepository
            .findAllByReviewIdInAndIsDeletedFalse(reviews.stream().map(Review::getId).toList())
            .stream()
            .collect(Collectors.toMap(ReviewReply::getReviewId, Function.identity()));

    return reviews.stream()
        .map(review -> ReviewResponse.from(review, replyMap.get(review.getId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public ReviewResponse getReview(Long reviewId) {
    Review review =
        reviewRepository
            .findByIdAndIsDeletedFalseAndIsHiddenFalse(reviewId)
            .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

    ReviewReply officialReply =
        reviewReplyRepository.findByReviewIdAndIsDeletedFalse(reviewId).orElse(null);

    return ReviewResponse.from(review, officialReply);
  }
}
