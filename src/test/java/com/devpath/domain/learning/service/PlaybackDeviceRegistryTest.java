package com.devpath.domain.learning.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import org.junit.jupiter.api.Test;

class PlaybackDeviceRegistryTest {

  private final PlaybackDeviceRegistry registry = new PlaybackDeviceRegistry();

  @Test
  void allowsReturningDevicesAndRejectsNewDevicesOverTheLimit() {
    registry.register(1L, "laptop", 2);
    registry.register(1L, "phone", 2);
    registry.register(1L, "laptop", 2);

    assertThatThrownBy(() -> registry.register(1L, "tablet", 2))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.PLAYBACK_DEVICE_LIMIT_EXCEEDED);
  }
}
