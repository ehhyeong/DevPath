package com.devpath.api.review.service;

import com.devpath.api.instructor.entity.ReviewReply;
import com.devpath.api.instructor.repository.ReviewReplyRepository;
import com.devpath.api.review.dto.ReviewRequest;
import com.devpath.api.review.dto.ReviewResponse;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
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

  public ReviewResponse createReview(ReviewRequest request, Long learnerId) {
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
