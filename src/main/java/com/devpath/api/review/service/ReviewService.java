package com.devpath.api.review.service;

import com.devpath.api.review.dto.ReviewRequest;
import com.devpath.api.review.dto.ReviewResponse;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;

    public ReviewResponse createReview(ReviewRequest request, Long learnerId) {
        if (reviewRepository.existsByCourseIdAndLearnerIdAndIsDeletedFalse(request.getCourseId(), learnerId)) {
            throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
        }

        Review review = Review.builder()
                .courseId(request.getCourseId())
                .learnerId(learnerId)
                .rating(request.getRating())
                .content(request.getContent())
                .build();

        return ReviewResponse.from(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByCourse(Long courseId) {
        return reviewRepository.findByCourseIdAndIsDeletedFalseAndIsHiddenFalseOrderByCreatedAtDesc(courseId)
                .stream()
                .map(ReviewResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReviewResponse getReview(Long reviewId) {
        Review review = reviewRepository.findByIdAndIsDeletedFalseAndIsHiddenFalse(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        return ReviewResponse.from(review);
    }
}
