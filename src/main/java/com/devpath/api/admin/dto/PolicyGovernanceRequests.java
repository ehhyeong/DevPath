package com.devpath.api.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class PolicyGovernanceRequests {

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "시스템 정책 수정 요청 DTO")
  public static class UpdateSystemPolicy {

    @Schema(description = "플랫폼 수수료율", example = "15.0")
    private Double platformFeeRate;

    @Schema(description = "강사 정산 비율", example = "85.0")
    private Double instructorSettlementRate;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "스트리밍 정책 수정 요청 DTO")
  public static class UpdateStreamingPolicy {

    @Schema(description = "HLS 암호화 적용 여부", example = "true")
    private Boolean isHlsEncrypted;

    @Schema(description = "최대 동시 접속 허용 기기 수", example = "3")
    private Integer maxConcurrentDevices;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "강의-노드 매핑 수정 요청 DTO")
  public static class UpdateNodeMapping {

    @Schema(description = "강의에 확정 저장할 노드 ID 목록")
    private List<Long> mappedNodeIds;
  }
}
