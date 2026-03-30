package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.subscription.SubscriptionResponse;
import com.devpath.api.instructor.entity.InstructorSubscription;
import com.devpath.api.instructor.repository.InstructorSubscriptionRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorSubscriptionService {

    private final InstructorSubscriptionRepository subscriptionRepository;

    public SubscriptionResponse subscribe(Long channelId, Long learnerId) {
        subscriptionRepository.findByChannelIdAndLearnerIdAndIsDeletedFalse(channelId, learnerId)
                .ifPresent(s -> { throw new CustomException(ErrorCode.DUPLICATE_RESOURCE); });
        InstructorSubscription subscription = InstructorSubscription.builder()
                .channelId(channelId)
                .learnerId(learnerId)
                .build();
        return SubscriptionResponse.from(subscriptionRepository.save(subscription));
    }

    public void unsubscribe(Long channelId, Long learnerId) {
        InstructorSubscription subscription = subscriptionRepository
                .findByChannelIdAndLearnerIdAndIsDeletedFalse(channelId, learnerId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        subscription.unsubscribe();
    }

    public void updateNotification(Long channelId, Long learnerId, boolean notificationEnabled) {
        InstructorSubscription subscription = subscriptionRepository
                .findByChannelIdAndLearnerIdAndIsDeletedFalse(channelId, learnerId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        subscription.updateNotification(notificationEnabled);
    }
}