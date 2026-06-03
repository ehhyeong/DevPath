package com.devpath.api.application.service;

import com.devpath.api.application.dto.LoungeApplicationRequest;
import com.devpath.api.application.dto.LoungeApplicationResponse;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.application.entity.LoungeApplication;
import com.devpath.domain.application.repository.LoungeApplicationRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoungeApplicationService {

  private final LoungeApplicationRepository loungeApplicationRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final NotificationEventService notificationEventService;

  @Transactional
  public LoungeApplicationResponse.Detail create(
      Long senderId, LoungeApplicationRequest.Create request) {
    User sender = getUser(senderId);
    User receiver = getUser(request.receiverId());

    // 자기 자신에게 신청서나 제안서를 보내는 잘못된 흐름을 막는다.
    validateNotSelf(sender.getId(), receiver.getId());

    // 같은 대상에게 같은 타입의 신청서/제안서를 중복해서 보내지 못하게 막는다.
    validateNotDuplicated(request, sender.getId(), receiver.getId());

    LoungeApplication application =
        LoungeApplication.builder()
            .sender(sender)
            .receiver(receiver)
            .type(request.type())
            .targetId(request.targetId())
            .targetTitle(request.targetTitle())
            .title(request.title())
            .content(request.content())
            .build();

    LoungeApplication saved = loungeApplicationRepository.save(application);

    notificationEventService.notifyLoungeApplicationReceived(
        receiver.getId(), sender.getName(), request.title());

    return toDetail(saved);
  }

  public List<LoungeApplicationResponse.Summary> getSentApplications(Long senderId) {
    // 존재하지 않는 사용자 기준으로 목록을 조회하지 않도록 막는다.
    validateUserExists(senderId);

    return loungeApplicationRepository
        .findAllBySender_IdAndIsDeletedFalseOrderByCreatedAtDesc(senderId)
        .stream()
        .collect(Collectors.collectingAndThen(Collectors.toList(), this::toSummaries));
  }

  public List<LoungeApplicationResponse.Summary> getReceivedApplications(Long receiverId) {
    // 존재하지 않는 사용자 기준으로 목록을 조회하지 않도록 막는다.
    validateUserExists(receiverId);

    return loungeApplicationRepository
        .findAllByReceiver_IdAndIsDeletedFalseOrderByCreatedAtDesc(receiverId)
        .stream()
        .collect(Collectors.collectingAndThen(Collectors.toList(), this::toSummaries));
  }

  public LoungeApplicationResponse.Detail getApplication(Long applicationId) {
    return toDetail(getActiveApplication(applicationId));
  }

  public LoungeApplicationResponse.Status getStatus(Long applicationId) {
    return LoungeApplicationResponse.Status.from(getActiveApplication(applicationId));
  }

  @Transactional
  public LoungeApplicationResponse.Detail approve(
      Long applicationId, Long receiverId, LoungeApplicationRequest.Approve request) {
    LoungeApplication application = getActiveApplication(applicationId);

    // 신청을 받은 사용자만 승인할 수 있다.
    validateReceiverOwner(application, receiverId);

    // 이미 처리된 신청은 다시 승인할 수 없다.
    validatePending(application);

    application.approve();
    notificationEventService.notifyApplicationApproved(
        application.getSender().getId(), application.getTitle());

    return toDetail(application);
  }

  @Transactional
  public LoungeApplicationResponse.Detail reject(
      Long applicationId, Long receiverId, LoungeApplicationRequest.Reject request) {
    LoungeApplication application = getActiveApplication(applicationId);

    // 신청을 받은 사용자만 거절할 수 있다.
    validateReceiverOwner(application, receiverId);

    // 이미 처리된 신청은 다시 거절할 수 없다.
    validatePending(application);

    application.reject(request == null ? null : request.rejectReason());
    notificationEventService.notifyApplicationRejected(
        application.getSender().getId(), application.getTitle());

    return toDetail(application);
  }

  private List<LoungeApplicationResponse.Summary> toSummaries(
      List<LoungeApplication> applications) {
    Map<Long, String> profileImages = profileImages(applications);
    return applications.stream()
        .map(
            application ->
                LoungeApplicationResponse.Summary.from(
                    application,
                    profileImages.get(application.getSender().getId()),
                    profileImages.get(application.getReceiver().getId())))
        .toList();
  }

  private LoungeApplicationResponse.Detail toDetail(LoungeApplication application) {
    Map<Long, String> profileImages = profileImages(List.of(application));
    return LoungeApplicationResponse.Detail.from(
        application,
        profileImages.get(application.getSender().getId()),
        profileImages.get(application.getReceiver().getId()));
  }

  private Map<Long, String> profileImages(List<LoungeApplication> applications) {
    Set<Long> userIds =
        applications.stream()
            .flatMap(
                application ->
                    List.of(application.getSender().getId(), application.getReceiver().getId())
                        .stream())
            .collect(Collectors.toSet());

    if (userIds.isEmpty()) {
      return Map.of();
    }

    return userProfileRepository.findAllByUserIdIn(userIds).stream()
        .collect(
            Collectors.toMap(
                profile -> profile.getUser().getId(),
                UserProfile::getDisplayProfileImage,
                (left, right) -> left));
  }

  private LoungeApplication getActiveApplication(Long applicationId) {
    // Soft Delete 된 신청서/제안서는 조회 대상에서 제외한다.
    return loungeApplicationRepository
        .findByIdAndIsDeletedFalse(applicationId)
        .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
  }

  private User getUser(Long userId) {
    // 잘못된 사용자 ID를 받은 경우 명확한 비즈니스 예외를 발생시킨다.
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateUserExists(Long userId) {
    if (!userRepository.existsById(userId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  private void validateNotSelf(Long senderId, Long receiverId) {
    if (senderId.equals(receiverId)) {
      throw new CustomException(ErrorCode.APPLICATION_CANNOT_SEND_TO_SELF);
    }
  }

  private void validateNotDuplicated(
      LoungeApplicationRequest.Create request, Long senderId, Long receiverId) {
    boolean exists =
        loungeApplicationRepository
            .existsByTypeAndTargetIdAndSender_IdAndReceiver_IdAndIsDeletedFalse(
                request.type(), request.targetId(), senderId, receiverId);

    if (exists) {
      throw new CustomException(ErrorCode.APPLICATION_ALREADY_EXISTS);
    }
  }

  private void validateReceiverOwner(LoungeApplication application, Long receiverId) {
    if (!application.getReceiver().getId().equals(receiverId)) {
      throw new CustomException(ErrorCode.APPLICATION_FORBIDDEN);
    }
  }

  private void validatePending(LoungeApplication application) {
    if (!application.isPending()) {
      throw new CustomException(ErrorCode.APPLICATION_ALREADY_PROCESSED);
    }
  }
}
