package com.devpath.api.admin.dto.governance;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SystemPolicyResponse {

  private Integer platformFeeRate;
  private Integer refundPolicyDays;
  private Long maxCoursePrice;
  private LocalDateTime updatedAt;
}
