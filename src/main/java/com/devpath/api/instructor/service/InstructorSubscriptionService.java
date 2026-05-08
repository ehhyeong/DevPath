package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.subscription.SubscriptionResponse;
import com.devpath.api.instructor.entity.InstructorSubscription;
import com.devpath.api.instructor.repository.InstructorSubscriptionRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorSubscriptionService {

  private final InstructorSubscriptionRepository subscriptionRepository;
  private final UserProfileRepository userProfileRepository;

  public SubscriptionResponse subscribe(Long channelId, Long learnerId) {
    validateChannel(channelId);

    if (channelId.equals(learnerId)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    InstructorSubscription subscription =
        subscriptionRepository
            .findByChannelIdAndLearnerId(channelId, learnerId)
            .map(
                existing -> {
                  if (Boolean.FALSE.equals(existing.getIsDeleted())) {
                    throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
                  }
                  existing.resubscribe();
                  return existing;
                })
            .orElseGet(
                () ->
                    subscriptionRepository.save(
                        InstructorSubscription.builder()
                            .channelId(channelId)
                            .learnerId(learnerId)
                            .build()));

    return SubscriptionResponse.from(subscription);
  }

  public void unsubscribe(Long channelId, Long learnerId) {
    InstructorSubscription subscription =
        subscriptionRepository
            .findByChannelIdAndLearnerIdAndIsDeletedFalse(channelId, learnerId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    subscription.unsubscribe();
  }

  public void updateNotification(Long channelId, Long learnerId, boolean notificationEnabled) {
    InstructorSubscription subscription =
        subscriptionRepository
            .findByChannelIdAndLearnerIdAndIsDeletedFalse(channelId, learnerId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    subscription.updateNotification(notificationEnabled);
  }

  // Only real instructor channels can be followed.
  private void validateChannel(Long channelId) {
    userProfileRepository
        .findByUserId(channelId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
  }
}
