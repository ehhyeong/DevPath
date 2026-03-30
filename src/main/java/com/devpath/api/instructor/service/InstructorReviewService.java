package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.review.ReviewHelpfulResponse;
import com.devpath.api.instructor.dto.review.ReviewIssueTagRequest;
import com.devpath.api.instructor.dto.review.ReviewReplyRequest;
import com.devpath.api.instructor.dto.review.ReviewReplyResponse;
import com.devpath.api.instructor.dto.review.ReviewStatusUpdateRequest;
import com.devpath.api.instructor.dto.review.ReviewSummaryResponse;
import com.devpath.api.instructor.dto.review.ReviewTemplateRequest;
import com.devpath.api.instructor.dto.review.ReviewTemplateResponse;
import com.devpath.api.instructor.entity.ReviewReply;
import com.devpath.api.instructor.entity.ReviewReport;
import com.devpath.api.instructor.entity.ReviewTemplate;
import com.devpath.api.instructor.repository.ReviewReplyRepository;
import com.devpath.api.instructor.repository.ReviewReportRepository;
import com.devpath.api.instructor.repository.ReviewTemplateRepository;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.entity.ReviewStatus;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewReplyRepository reviewReplyRepository;
    private final ReviewTemplateRepository reviewTemplateRepository;
    private final ReviewReportRepository reviewReportRepository;

    public ReviewReplyResponse createReply(Long reviewId, Long instructorId, ReviewReplyRequest request) {
        getActiveReview(reviewId);

        if (!reviewReplyRepository.findByReviewIdAndIsDeletedFalse(reviewId).isEmpty()) {
            throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
        }

        ReviewReply reply = ReviewReply.builder()
                .reviewId(reviewId)
                .instructorId(instructorId)
                .content(request.getContent())
                .build();

        return ReviewReplyResponse.from(reviewReplyRepository.save(reply));
    }

    public ReviewReplyResponse updateReply(Long reviewId, Long replyId, Long instructorId, ReviewReplyRequest request) {
        ReviewReply reply = getActiveReply(replyId);
        validateReplyOwner(reply, reviewId, instructorId);
        reply.updateContent(request.getContent());
        return ReviewReplyResponse.from(reply);
    }

    public void deleteReply(Long reviewId, Long replyId, Long instructorId) {
        ReviewReply reply = getActiveReply(replyId);
        validateReplyOwner(reply, reviewId, instructorId);
        reply.delete();
    }

    public void updateStatus(Long reviewId, ReviewStatusUpdateRequest request) {
        Review review = getActiveReview(reviewId);
        review.changeStatus(request.getStatus());
    }

    public void addIssueTags(Long reviewId, ReviewIssueTagRequest request) {
        Review review = getActiveReview(reviewId);
        String tagsRaw = String.join(",", request.getIssueTags());
        review.updateIssueTags(tagsRaw);
    }

    @Transactional(readOnly = true)
    public ReviewHelpfulResponse getHelpfulStats(Long instructorId) {
        long totalReviews = reviewRepository.countByInstructorId(instructorId);
        long answeredCount = reviewRepository.countByInstructorIdAndStatus(instructorId, ReviewStatus.ANSWERED);
        long unansweredCount = reviewRepository.countByInstructorIdAndStatus(instructorId, ReviewStatus.UNANSWERED);
        long unsatisfiedCount = reviewRepository.countByInstructorIdAndStatus(instructorId, ReviewStatus.UNSATISFIED);

        double answerRate = totalReviews == 0
                ? 0.0
                : Math.round((answeredCount * 100.0 / totalReviews) * 10.0) / 10.0;

        return ReviewHelpfulResponse.builder()
                .totalReviews(totalReviews)
                .answeredCount(answeredCount)
                .unansweredCount(unansweredCount)
                .unsatisfiedCount(unsatisfiedCount)
                .answerRate(answerRate)
                .build();
    }

    @Transactional(readOnly = true)
    public ReviewSummaryResponse getReviewSummary(Long instructorId) {
        long totalReviews = reviewRepository.countByInstructorId(instructorId);
        long unansweredCount = reviewRepository.countByInstructorIdAndStatus(instructorId, ReviewStatus.UNANSWERED);
        Double avgRating = reviewRepository.findAverageRatingByInstructorId(instructorId);

        double averageRating = avgRating == null ? 0.0 : Math.round(avgRating * 10.0) / 10.0;
        List<Object[]> rawDistribution = reviewRepository.findRatingDistributionByInstructorId(instructorId);

        Map<Integer, Long> ratingDistribution = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            ratingDistribution.put(i, 0L);
        }

        for (Object[] row : rawDistribution) {
            ratingDistribution.put((Integer) row[0], (Long) row[1]);
        }

        return ReviewSummaryResponse.builder()
                .totalReviews(totalReviews)
                .averageRating(averageRating)
                .unansweredCount(unansweredCount)
                .ratingDistribution(ratingDistribution)
                .build();
    }

    public ReviewTemplateResponse createTemplate(Long instructorId, ReviewTemplateRequest request) {
        ReviewTemplate template = ReviewTemplate.builder()
                .instructorId(instructorId)
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return ReviewTemplateResponse.from(reviewTemplateRepository.save(template));
    }

    @Transactional(readOnly = true)
    public List<ReviewTemplateResponse> getTemplates(Long instructorId) {
        return reviewTemplateRepository.findByInstructorIdAndIsDeletedFalse(instructorId)
                .stream()
                .map(ReviewTemplateResponse::from)
                .collect(Collectors.toList());
    }

    public ReviewTemplateResponse updateTemplate(Long templateId, Long instructorId, ReviewTemplateRequest request) {
        ReviewTemplate template = getActiveTemplate(templateId, instructorId);
        template.update(request.getTitle(), request.getContent());
        return ReviewTemplateResponse.from(template);
    }

    public void deleteTemplate(Long templateId, Long instructorId) {
        ReviewTemplate template = getActiveTemplate(templateId, instructorId);
        template.delete();
    }

    public void hideReview(Long reviewId, Long instructorId) {
        Review review = getActiveReview(reviewId);
        review.hide();
    }

    public void resolveReport(Long reviewId, Long instructorId) {
        Review review = getActiveReview(reviewId);

        List<ReviewReport> reports = reviewReportRepository.findAllByReviewIdAndIsResolvedFalse(reviewId);
        for (ReviewReport report : reports) {
            report.resolve(instructorId);
        }

        review.resolveReport();
    }

    private Review getActiveReview(Long reviewId) {
        return reviewRepository.findByIdAndIsDeletedFalse(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
    }

    private ReviewReply getActiveReply(Long replyId) {
        return reviewReplyRepository.findByIdAndIsDeletedFalse(replyId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private ReviewTemplate getActiveTemplate(Long templateId, Long instructorId) {
        ReviewTemplate template = reviewTemplateRepository.findByIdAndIsDeletedFalse(templateId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!template.getInstructorId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }

        return template;
    }

    private void validateReplyOwner(ReviewReply reply, Long reviewId, Long instructorId) {
        if (!reply.getReviewId().equals(reviewId) || !reply.getInstructorId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
    }
}
