package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.review.InstructorReviewListResponse;
import com.devpath.api.instructor.dto.review.ReviewHelpfulResponse;
import com.devpath.api.instructor.dto.review.ReviewIssueTagRequest;
import com.devpath.api.instructor.dto.review.ReviewReplyRequest;
import com.devpath.api.instructor.dto.review.ReviewReplyResponse;
import com.devpath.api.instructor.dto.review.ReviewStatusUpdateRequest;
import com.devpath.api.instructor.dto.review.ReviewSummaryResponse;
import com.devpath.api.instructor.dto.review.ReviewTemplateRequest;
import com.devpath.api.instructor.dto.review.ReviewTemplateResponse;
import com.devpath.api.admin.entity.ModerationReport;
import com.devpath.api.admin.entity.ModerationReportStatus;
import com.devpath.api.admin.repository.ModerationReportRepository;
import com.devpath.api.instructor.entity.ReviewReply;
import com.devpath.api.instructor.entity.ReviewTemplate;
import com.devpath.api.instructor.repository.ReviewReplyRepository;
import com.devpath.api.instructor.repository.ReviewReportRepository;
import com.devpath.api.instructor.repository.ReviewTemplateRepository;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.entity.ReviewStatus;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.LinkedHashMap;
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
public class InstructorReviewService {

  private final ReviewRepository reviewRepository;
  private final ReviewReplyRepository reviewReplyRepository;
  private final ReviewTemplateRepository reviewTemplateRepository;
  private final ReviewReportRepository reviewReportRepository;
  private final ModerationReportRepository moderationReportRepository;
  private final CourseRepository courseRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;

  @Transactional(readOnly = true)
  public List<InstructorReviewListResponse> getReviews(Long instructorId) {
    List<Review> reviews = reviewRepository.findAllByInstructorIdOrderByCreatedAtDesc(instructorId);
    if (reviews.isEmpty()) {
      return List.of();
    }

    Map<Long, Course> coursesById =
        courseRepository.findAllByInstructorIdOrderByCourseIdDesc(instructorId).stream()
            .collect(
                Collectors.toMap(
                    Course::getCourseId,
                    Function.identity(),
                    (left, right) -> left,
                    LinkedHashMap::new));
    Map<Long, User> learnersById =
        userRepository
            .findAllById(reviews.stream().map(Review::getLearnerId).distinct().toList())
            .stream()
            .collect(
                Collectors.toMap(
                    User::getId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
    User instructor = userRepository.findById(instructorId).orElse(null);
    UserProfile instructorProfile = userProfileRepository.findByUserId(instructorId).orElse(null);
    String instructorName = instructor == null ? "강사" : instructor.getName();
    String instructorProfileImage =
        instructorProfile == null ? null : instructorProfile.getDisplayProfileImage();
    Map<Long, ReviewReply> repliesByReviewId =
        reviewReplyRepository
            .findAllByReviewIdInAndIsDeletedFalse(reviews.stream().map(Review::getId).toList())
            .stream()
            .collect(
                Collectors.toMap(
                    ReviewReply::getReviewId,
                    Function.identity(),
                    (left, right) -> left,
                    LinkedHashMap::new));

    return reviews.stream()
        .map(
            review -> {
              Course course = coursesById.get(review.getCourseId());
              User learner = learnersById.get(review.getLearnerId());
              ReviewReply reply = repliesByReviewId.get(review.getId());

              return new InstructorReviewListResponse(
                  review.getId(),
                  review.getCourseId(),
                  course == null ? "강의" : course.getTitle(),
                  review.getRating(),
                  learner == null ? "Learner" : learner.getName(),
                  review.getCreatedAt(),
                  review.getStatus() == null ? null : review.getStatus().name(),
                  review.getContent(),
                  splitIssueTags(review.getIssueTagsRaw()),
                  review.getIsHidden(),
                  reply == null
                      ? null
                      : new InstructorReviewListResponse.ReplyInfo(
                          reply.getId(),
                          instructorName,
                          instructorProfileImage,
                          reply.getContent(),
                          reply.getCreatedAt(),
                          reply.getUpdatedAt()));
            })
        .toList();
  }

  public ReviewReplyResponse createReply(
      Long reviewId, Long instructorId, ReviewReplyRequest request) {
    Review review = getManagedReview(reviewId, instructorId);

    if (reviewReplyRepository.findByReviewIdAndIsDeletedFalse(reviewId).isPresent()) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
    }

    ReviewReply reply =
        ReviewReply.builder()
            .reviewId(reviewId)
            .instructorId(instructorId)
            .content(request.getContent())
            .build();

    ReviewReply saved = reviewReplyRepository.save(reply);
    review.markAnswered();

    return ReviewReplyResponse.from(
        saved, getInstructorDisplayName(instructorId), getInstructorProfileImage(instructorId));
  }

  public ReviewReplyResponse updateReply(
      Long reviewId, Long replyId, Long instructorId, ReviewReplyRequest request) {
    getManagedReview(reviewId, instructorId);

    ReviewReply reply =
        reviewReplyRepository
            .findByIdAndIsDeletedFalse(replyId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    validateReplyOwner(reply, reviewId, instructorId);
    reply.updateContent(request.getContent());

    return ReviewReplyResponse.from(
        reply, getInstructorDisplayName(instructorId), getInstructorProfileImage(instructorId));
  }

  public void deleteReply(Long reviewId, Long replyId, Long instructorId) {
    Review review = getManagedReview(reviewId, instructorId);

    ReviewReply reply =
        reviewReplyRepository
            .findByIdAndIsDeletedFalse(replyId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    validateReplyOwner(reply, reviewId, instructorId);
    reply.delete();
    review.markUnanswered();
  }

  public void updateStatus(Long reviewId, Long instructorId, ReviewStatusUpdateRequest request) {
    Review review = getManagedReview(reviewId, instructorId);
    review.changeStatus(request.getStatus());
  }

  public void addIssueTags(Long reviewId, Long instructorId, ReviewIssueTagRequest request) {
    Review review = getManagedReview(reviewId, instructorId);

    String tagsRaw =
        request.getIssueTags().stream()
            .filter(tag -> tag != null && !tag.isBlank())
            .map(String::trim)
            .distinct()
            .collect(Collectors.joining(","));

    review.updateIssueTags(tagsRaw);
    createModerationReportIfMissing(review, instructorId, tagsRaw);
  }

  @Transactional(readOnly = true)
  public ReviewHelpfulResponse getHelpfulStats(Long instructorId) {
    long totalReviews = reviewRepository.countByInstructorId(instructorId);
    long answeredCount = reviewRepository.countAnsweredByInstructorId(instructorId);
    long unansweredCount = reviewRepository.countUnansweredByInstructorId(instructorId);
    long unsatisfiedCount =
        reviewRepository.countByInstructorIdAndStatus(instructorId, ReviewStatus.UNSATISFIED);

    double answerRate =
        totalReviews == 0 ? 0.0 : Math.round((answeredCount * 100.0 / totalReviews) * 10.0) / 10.0;

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
    long unansweredCount = reviewRepository.countUnansweredByInstructorId(instructorId);
    Double avgRating = reviewRepository.findAverageRatingByInstructorId(instructorId);

    double averageRating = avgRating == null ? 0.0 : Math.round(avgRating * 10.0) / 10.0;
    List<Object[]> rawDistribution =
        reviewRepository.findRatingDistributionByInstructorId(instructorId);

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
    ReviewTemplate template =
        ReviewTemplate.builder()
            .instructorId(instructorId)
            .title(request.getTitle())
            .content(request.getContent())
            .build();

    return ReviewTemplateResponse.from(reviewTemplateRepository.save(template));
  }

  @Transactional(readOnly = true)
  public List<ReviewTemplateResponse> getTemplates(Long instructorId) {
    return reviewTemplateRepository.findByInstructorIdAndIsDeletedFalse(instructorId).stream()
        .map(ReviewTemplateResponse::from)
        .toList();
  }

  public ReviewTemplateResponse updateTemplate(
      Long templateId, Long instructorId, ReviewTemplateRequest request) {
    ReviewTemplate template = getManagedTemplate(templateId, instructorId);
    template.update(request.getTitle(), request.getContent());
    return ReviewTemplateResponse.from(template);
  }

  public void deleteTemplate(Long templateId, Long instructorId) {
    ReviewTemplate template = getManagedTemplate(templateId, instructorId);
    template.delete();
  }

  public void hideReview(Long reviewId, Long instructorId) {
    Review review = getManagedReview(reviewId, instructorId);
    review.hide();
  }

  public void resolveReport(Long reviewId, Long instructorId) {
    Review review = getManagedReview(reviewId, instructorId);

    reviewReportRepository
        .findAllByReviewIdAndIsResolvedFalse(reviewId)
        .forEach(report -> report.resolve(instructorId));

    review.resolveReport();
  }

  // Ensure the review belongs to a course managed by the instructor.
  private Review getManagedReview(Long reviewId, Long instructorId) {
    Review review =
        reviewRepository
            .findByIdAndIsDeletedFalse(reviewId)
            .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

    if (!courseRepository.existsByCourseIdAndInstructorId(review.getCourseId(), instructorId)) {
      throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
    }

    return review;
  }

  private ReviewTemplate getManagedTemplate(Long templateId, Long instructorId) {
    ReviewTemplate template =
        reviewTemplateRepository
            .findByIdAndIsDeletedFalse(templateId)
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

  private List<String> splitIssueTags(String raw) {
    if (raw == null || raw.isBlank()) {
      return List.of();
    }

    return List.of(raw.split(",")).stream()
        .map(String::trim)
        .filter(tag -> !tag.isBlank())
        .toList();
  }

  private void createModerationReportIfMissing(
      Review review, Long instructorId, String issueTagsRaw) {
    if (moderationReportRepository.existsByReporterUserIdAndContentIdAndStatus(
        instructorId, review.getId(), ModerationReportStatus.PENDING)) {
      return;
    }

    String reason =
        issueTagsRaw == null || issueTagsRaw.isBlank()
            ? "강사가 리뷰 이슈로 등록했습니다."
            : "강사가 리뷰 이슈로 등록했습니다. 태그: %s".formatted(issueTagsRaw);

    moderationReportRepository.save(
        ModerationReport.builder()
            .reporterUserId(instructorId)
            .targetUserId(review.getLearnerId())
            .contentId(review.getId())
            .reason(reason)
            .status(ModerationReportStatus.PENDING)
            .build());
  }

  private String getInstructorDisplayName(Long instructorId) {
    return userRepository.findById(instructorId).map(User::getName).orElse("강사");
  }

  private String getInstructorProfileImage(Long instructorId) {
    return userProfileRepository
        .findByUserId(instructorId)
        .map(UserProfile::getDisplayProfileImage)
        .orElse(null);
  }
}
