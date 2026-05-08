package com.devpath.api.instructor.dto.subscription;

import com.devpath.api.instructor.entity.InstructorSubscription;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SubscriptionResponse {

  private Long subscriptionId;
  private Long channelId;
  private Long learnerId;
  private boolean notificationEnabled;
  private LocalDateTime subscribedAt;

  public static SubscriptionResponse from(InstructorSubscription subscription) {
    return SubscriptionResponse.builder()
        .subscriptionId(subscription.getId())
        .channelId(subscription.getChannelId())
        .learnerId(subscription.getLearnerId())
        .notificationEnabled(subscription.isNotificationEnabled())
        .subscribedAt(subscription.getSubscribedAt())
        .build();
  }
}
