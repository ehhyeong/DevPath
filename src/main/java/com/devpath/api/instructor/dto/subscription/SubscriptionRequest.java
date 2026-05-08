package com.devpath.api.instructor.dto.subscription;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubscriptionRequest {

  @NotNull private Long channelId;
}
