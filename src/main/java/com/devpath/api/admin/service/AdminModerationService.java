package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.moderation.ContentBlindRequest;
import com.devpath.api.admin.dto.moderation.ModerationReportSummaryResponse;
import com.devpath.api.admin.dto.moderation.ModerationStatsResponse;
import com.devpath.api.admin.dto.moderation.ReportResolveRequest;
import com.devpath.api.admin.entity.AccountLog;
import com.devpath.api.admin.entity.AccountLogType;
import com.devpath.api.admin.entity.BlindedContent;
import com.devpath.api.admin.entity.ModerationActionType;
import com.devpath.api.admin.entity.ModerationReport;
import com.devpath.api.admin.entity.ModerationReportStatus;
import com.devpath.api.admin.repository.AccountLogRepository;
import com.devpath.api.admin.repository.BlindedContentRepository;
import com.devpath.api.admin.repository.ModerationReportRepository;
import com.devpath.api.review.entity.Review;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
// 신고 처리와 콘텐츠 블라인드 같은 관리자 제재 로직을 담당한다.
public class AdminModerationService {

  private final ModerationReportRepository moderationReportRepository;
  private final BlindedContentRepository blindedContentRepository;
  private final UserRepository userRepository;
  private final ReviewRepository reviewRepository;
  private final CourseRepository courseRepository;
  private final AccountLogRepository accountLogRepository;

  // 처리 대기 신고를 완료 상태로 바꾸고 액션에 따라 계정 상태도 갱신한다.
  public void resolveReport(Long reportId, Long adminId, ReportResolveRequest request) {
    ModerationReport report =
        moderationReportRepository
            .findByIdAndStatus(reportId, ModerationReportStatus.PENDING)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    report.resolve(adminId, request.getAction());

    // 신고 액션이 정지이고 대상 사용자가 활성 상태면 계정 제한까지 함께 처리한다.
    if (request.getAction() == ModerationActionType.SUSPEND && report.getTargetUserId() != null) {
      User targetUser =
          userRepository
              .findById(report.getTargetUserId())
              .orElseThrow(() -> new CustomException(ErrorCode.ACCOUNT_NOT_FOUND));

      if (targetUser.getAccountStatus() == AccountStatus.ACTIVE) {
        targetUser.restrict();

        accountLogRepository.save(
            AccountLog.builder()
                .targetUserId(targetUser.getId())
                .adminId(adminId)
                .logType(AccountLogType.RESTRICT)
                .reason(request.getReason())
                .build());
      }
    }
  }

  // 동일 콘텐츠 블라인드 이력이 있으면 재활성화하고 없으면 새로 만든다.
  public void blindContent(Long contentId, Long adminId, ContentBlindRequest request) {
    BlindedContent blindedContent =
        blindedContentRepository.findByContentIdAndIsActiveTrue(contentId).orElse(null);

    if (blindedContent == null) {
      blindedContentRepository.save(
          BlindedContent.builder()
              .contentId(contentId)
              .adminId(adminId)
              .reason(request.getReason())
              .build());
      return;
    }

    blindedContent.blind(adminId, request.getReason());
  }

  @Transactional(readOnly = true)
  public ModerationStatsResponse getModerationStats() {
    long totalReports = moderationReportRepository.count();
    long resolvedReports =
        moderationReportRepository.countByStatus(ModerationReportStatus.RESOLVED);
    long pendingReports = moderationReportRepository.countByStatus(ModerationReportStatus.PENDING);
    long blindedContents = blindedContentRepository.countByIsActiveTrue();
    long suspendedUsers =
        moderationReportRepository.countByActionTaken(ModerationActionType.SUSPEND);

    return ModerationStatsResponse.builder()
        .totalReports(totalReports)
        .resolvedReports(resolvedReports)
        .pendingReports(pendingReports)
        .blindedContents(blindedContents)
        .suspendedUsers(suspendedUsers)
        .build();
  }

  @Transactional(readOnly = true)
  // 관리자 신고 목록 화면에 필요한 상태별 목록을 최신 순으로 반환한다.
  public List<ModerationReportSummaryResponse> getReports(ModerationReportStatus status) {
    return moderationReportRepository.findAllByStatusOrderByCreatedAtDesc(status).stream()
        .map(this::toModerationReportSummary)
        .toList();
  }

  // 신고 엔티티를 관리자 표에서 바로 읽을 수 있는 판단용 응답으로 바꾼다.
  private ModerationReportSummaryResponse toModerationReportSummary(ModerationReport report) {
    Long targetId =
        report.getContentId() != null ? report.getContentId() : report.getTargetUserId();
    User reporter = loadUser(report.getReporterUserId()).orElse(null);
    User targetUser = loadUser(report.getTargetUserId()).orElse(null);
    Review review = loadReview(report.getContentId()).orElse(null);
    Course reviewCourse = review == null ? null : loadCourse(review.getCourseId()).orElse(null);

    String targetType;
    String targetLabel;
    String targetSummary;

    if (report.getContentId() != null) {
      targetType = "CONTENT";
      targetLabel = "리뷰 신고";
      targetSummary =
          buildContentTargetSummary(report.getContentId(), review, reviewCourse, targetUser);
    } else if (report.getTargetUserId() != null) {
      targetType = "USER";
      targetLabel = "회원 신고";
      targetSummary = buildUserTargetSummary(report.getTargetUserId(), targetUser);
    } else {
      targetType = "UNKNOWN";
      targetLabel = "대상 미확인";
      targetSummary = "신고 대상 정보를 찾을 수 없습니다.";
    }

    return ModerationReportSummaryResponse.builder()
        .reportId(report.getId())
        .targetType(targetType)
        .targetId(targetId)
        .contentId(report.getContentId())
        .targetLabel(targetLabel)
        .targetSummary(targetSummary)
        .reporterName(reporter == null ? null : reporter.getName())
        .reporterEmail(reporter == null ? null : reporter.getEmail())
        .targetUserName(targetUser == null ? null : targetUser.getName())
        .targetUserEmail(targetUser == null ? null : targetUser.getEmail())
        .contentTitle(reviewCourse == null ? null : reviewCourse.getTitle())
        .contentPreview(review == null ? null : abbreviate(review.getContent(), 90))
        .reason(report.getReason())
        .status(report.getStatus().name())
        .createdAt(report.getCreatedAt())
        .build();
  }

  // 사용자 대상 신고는 이름과 이메일을 함께 보여준다.
  private String buildUserTargetSummary(Long targetUserId, User targetUser) {
    if (targetUser != null) {
      return "%s (%s)".formatted(targetUser.getName(), targetUser.getEmail());
    }

    return "회원 ID #%d".formatted(targetUserId);
  }

  // 콘텐츠 신고는 리뷰를 우선 해석해서 강의명과 작성자를 묶어 보여준다.
  private String buildContentTargetSummary(
      Long contentId, Review review, Course reviewCourse, User targetUser) {
    if (review == null) {
      if (targetUser != null) {
        return "%s (%s) 작성 콘텐츠 / ID #%d"
            .formatted(targetUser.getName(), targetUser.getEmail(), contentId);
      }

      return "콘텐츠 ID #%d".formatted(contentId);
    }

    String courseTitle =
        (reviewCourse != null ? Optional.of(reviewCourse) : loadCourse(review.getCourseId()))
            .map(Course::getTitle)
            .orElse("강의 #%d".formatted(review.getCourseId()));
    String learnerName =
        (targetUser != null ? Optional.of(targetUser) : loadUser(review.getLearnerId()))
            .map(User::getName)
            .orElse("회원 #%d".formatted(review.getLearnerId()));

    return "%s / %s 작성 리뷰".formatted(courseTitle, learnerName);
  }

  private Optional<User> loadUser(Long userId) {
    if (userId == null) {
      return Optional.empty();
    }

    return userRepository.findById(userId);
  }

  private Optional<Review> loadReview(Long contentId) {
    if (contentId == null) {
      return Optional.empty();
    }

    return reviewRepository.findByIdAndIsDeletedFalse(contentId);
  }

  private Optional<Course> loadCourse(Long courseId) {
    if (courseId == null) {
      return Optional.empty();
    }

    return courseRepository.findById(courseId);
  }

  private String abbreviate(String value, int maxLength) {
    if (value == null || value.isBlank()) {
      return null;
    }

    String normalized = value.trim().replaceAll("\\s+", " ");
    if (normalized.length() <= maxLength) {
      return normalized;
    }

    return normalized.substring(0, maxLength - 1) + "…";
  }
}
