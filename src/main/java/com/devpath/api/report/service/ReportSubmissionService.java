package com.devpath.api.report.service;

import com.devpath.api.admin.entity.ModerationReport;
import com.devpath.api.admin.entity.ModerationReportStatus;
import com.devpath.api.admin.repository.ModerationReportRepository;
import com.devpath.api.report.dto.ReportCreateRequest;
import com.devpath.api.report.dto.ReportCreateResponse;
import com.devpath.api.report.dto.ReportTargetType;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportSubmissionService {

  private final ModerationReportRepository moderationReportRepository;
  private final ReviewRepository reviewRepository;
  private final UserRepository userRepository;

  @Transactional
  public ReportCreateResponse submit(Long reporterUserId, ReportCreateRequest request) {
    if (reporterUserId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }
    userRepository
        .findById(reporterUserId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    return switch (request.targetType()) {
      case REVIEW -> submitReviewReport(reporterUserId, request);
      case USER -> submitUserReport(reporterUserId, request);
    };
  }

  private ReportCreateResponse submitReviewReport(
      Long reporterUserId, ReportCreateRequest request) {
    Review review =
        reviewRepository
            .findByIdAndIsDeletedFalse(request.targetId())
            .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
    if (reporterUserId.equals(review.getLearnerId())) {
      throw new CustomException(ErrorCode.FORBIDDEN, "본인이 작성한 리뷰는 신고할 수 없습니다.");
    }
    if (moderationReportRepository.existsByReporterUserIdAndContentIdAndStatus(
        reporterUserId, review.getId(), ModerationReportStatus.PENDING)) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE, "이미 처리 대기 중인 신고가 있습니다.");
    }

    ModerationReport saved =
        moderationReportRepository.save(
            ModerationReport.builder()
                .reporterUserId(reporterUserId)
                .targetUserId(review.getLearnerId())
                .contentId(review.getId())
                .reason(request.reason().trim())
                .status(ModerationReportStatus.PENDING)
                .build());
    return ReportCreateResponse.from(saved, ReportTargetType.REVIEW, review.getId());
  }

  private ReportCreateResponse submitUserReport(Long reporterUserId, ReportCreateRequest request) {
    User targetUser =
        userRepository
            .findById(request.targetId())
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    if (reporterUserId.equals(targetUser.getId())) {
      throw new CustomException(ErrorCode.FORBIDDEN, "본인 계정은 신고할 수 없습니다.");
    }
    if (moderationReportRepository.existsByReporterUserIdAndTargetUserIdAndContentIdIsNullAndStatus(
        reporterUserId, targetUser.getId(), ModerationReportStatus.PENDING)) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE, "이미 처리 대기 중인 신고가 있습니다.");
    }

    ModerationReport saved =
        moderationReportRepository.save(
            ModerationReport.builder()
                .reporterUserId(reporterUserId)
                .targetUserId(targetUser.getId())
                .reason(request.reason().trim())
                .status(ModerationReportStatus.PENDING)
                .build());
    return ReportCreateResponse.from(saved, ReportTargetType.USER, targetUser.getId());
  }
}
