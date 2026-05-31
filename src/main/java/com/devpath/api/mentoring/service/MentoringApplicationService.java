package com.devpath.api.mentoring.service;

import com.devpath.api.instructor.service.InstructorNotificationService;
import com.devpath.api.mentoring.dto.MentoringApplicationRequest;
import com.devpath.api.mentoring.dto.MentoringApplicationResponse;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringApplication;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import com.devpath.domain.mentoring.repository.MentoringApplicationRepository;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentoringApplicationService {

  private final MentoringApplicationRepository mentoringApplicationRepository;
  private final MentoringPostRepository mentoringPostRepository;
  private final MentoringRepository mentoringRepository;
  private final UserRepository userRepository;
  private final NotificationEventService notificationEventService;
  private final InstructorNotificationService instructorNotificationService;

  @Transactional
  public MentoringApplicationResponse.Detail apply(
      Long postId, Long applicantId, MentoringApplicationRequest.Create request) {
    // 삭제되지 않은 공고만 신청 대상으로 허용한다.
    MentoringPost post = getActivePost(postId);

    // 마감된 공고에는 신청할 수 없다.
    validatePostOpen(post);

    User applicant =
        userRepository
            .findById(applicantId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    // 멘토가 본인 공고에 신청하는 잘못된 흐름을 막는다.
    validateNotOwnPost(post, applicant);

    // 같은 공고에 같은 사용자가 중복 신청하지 못하게 막는다.
    validateNotDuplicatedApplication(post.getId(), applicant.getId());

    MentoringApplication application =
        MentoringApplication.builder()
            .post(post)
            .applicant(applicant)
            .message(request.message())
            .desiredPosition(request.desiredPosition())
            .build();

    MentoringApplication savedApplication = mentoringApplicationRepository.save(application);
    instructorNotificationService.notifyMentoringApplication(
        post.getMentor().getId(), post.getTitle(), applicant.getName());

    return MentoringApplicationResponse.Detail.from(savedApplication);
  }

  public List<MentoringApplicationResponse.Summary> getSentApplications(Long userId) {
    // 존재하지 않는 사용자 ID로 조회하는 경우 명확한 예외를 반환한다.
    validateUserExists(userId);

    return mentoringApplicationRepository
        .findAllByApplicant_IdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
        .stream()
        .map(MentoringApplicationResponse.Summary::from)
        .toList();
  }

  public List<MentoringApplicationResponse.Summary> getReceivedApplications(Long mentorId) {
    // 존재하지 않는 멘토 ID로 조회하는 경우 명확한 예외를 반환한다.
    validateUserExists(mentorId);

    return mentoringApplicationRepository
        .findAllByPost_Mentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(mentorId)
        .stream()
        .map(MentoringApplicationResponse.Summary::from)
        .toList();
  }

  public MentoringApplicationResponse.Status getStatus(Long applicationId) {
    return MentoringApplicationResponse.Status.from(getActiveApplication(applicationId));
  }

  @Transactional
  public MentoringApplicationResponse.Detail approve(
      Long applicationId, Long mentorId, MentoringApplicationRequest.Approve request) {
    MentoringApplication application = getActiveApplication(applicationId);

    // 공고 작성자인 멘토만 신청을 승인할 수 있다.
    validatePostOwner(application, mentorId);

    // 이미 승인 또는 거절된 신청은 다시 처리하지 못하게 막는다.
    validatePending(application);

    application.approve();

    Mentoring mentoring =
        Mentoring.builder()
            .post(application.getPost())
            .mentor(application.getPost().getMentor())
            .mentee(application.getApplicant())
            .build();

    Mentoring savedMentoring = mentoringRepository.save(mentoring);
    notificationEventService.notifyApplicationApproved(
        application.getApplicant().getId(), application.getPost().getTitle());

    return MentoringApplicationResponse.Detail.from(application, savedMentoring.getId());
  }

  @Transactional
  public MentoringApplicationResponse.Detail reject(
      Long applicationId, Long mentorId, MentoringApplicationRequest.Reject request) {
    MentoringApplication application = getActiveApplication(applicationId);

    // 공고 작성자인 멘토만 신청을 거절할 수 있다.
    validatePostOwner(application, mentorId);

    // 이미 승인 또는 거절된 신청은 다시 처리하지 못하게 막는다.
    validatePending(application);

    application.reject(request == null ? null : request.rejectReason());
    notificationEventService.notifyApplicationRejected(
        application.getApplicant().getId(), application.getPost().getTitle());

    return MentoringApplicationResponse.Detail.from(application);
  }

  private MentoringPost getActivePost(Long postId) {
    // Soft Delete 된 공고는 신청 대상으로 조회하지 않는다.
    return mentoringPostRepository
        .findByIdAndIsDeletedFalse(postId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_POST_NOT_FOUND));
  }

  private MentoringApplication getActiveApplication(Long applicationId) {
    // Soft Delete 된 신청은 조회하지 않는다.
    return mentoringApplicationRepository
        .findByIdAndIsDeletedFalse(applicationId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_APPLICATION_NOT_FOUND));
  }

  private void validatePostOpen(MentoringPost post) {
    if (post.getStatus() != MentoringPostStatus.OPEN) {
      throw new CustomException(ErrorCode.MENTORING_POST_ALREADY_CLOSED);
    }
  }

  private void validateNotOwnPost(MentoringPost post, User applicant) {
    if (post.getMentor().getId().equals(applicant.getId())) {
      throw new CustomException(ErrorCode.MENTORING_CANNOT_APPLY_OWN_POST);
    }
  }

  private void validateNotDuplicatedApplication(Long postId, Long applicantId) {
    boolean alreadyApplied =
        mentoringApplicationRepository.existsByPost_IdAndApplicant_IdAndIsDeletedFalse(
            postId, applicantId);

    if (alreadyApplied) {
      throw new CustomException(ErrorCode.MENTORING_ALREADY_APPLIED);
    }
  }

  private void validatePostOwner(MentoringApplication application, Long mentorId) {
    if (!application.getPost().getMentor().getId().equals(mentorId)) {
      throw new CustomException(ErrorCode.MENTORING_APPLICATION_FORBIDDEN);
    }
  }

  private void validatePending(MentoringApplication application) {
    if (!application.isPending()) {
      throw new CustomException(ErrorCode.MENTORING_APPLICATION_ALREADY_PROCESSED);
    }
  }

  private void validateUserExists(Long userId) {
    if (!userRepository.existsById(userId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }
}
