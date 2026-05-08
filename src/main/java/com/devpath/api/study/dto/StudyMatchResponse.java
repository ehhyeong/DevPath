package com.devpath.api.study.dto;

import com.devpath.domain.study.entity.StudyMatch;
import com.devpath.domain.study.entity.StudyMatchStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "스터디 매칭 내역 응답 DTO")
public class StudyMatchResponse {

  @Schema(description = "매칭 ID", example = "1")
  private Long matchId;

  @Schema(description = "요청자 ID", example = "1")
  private Long requesterId;

  @Schema(description = "수신자 ID", example = "2")
  private Long receiverId;

  @Schema(description = "매칭 기준 노드 ID", example = "15")
  private Long nodeId;

  @Schema(description = "매칭 상태", example = "REQUESTED")
  private StudyMatchStatus status;

  @Schema(description = "요청 일시")
  private LocalDateTime createdAt;

  public static StudyMatchResponse from(StudyMatch match) {
    return StudyMatchResponse.builder()
        .matchId(match.getId())
        .requesterId(match.getRequesterId())
        .receiverId(match.getReceiverId())
        .nodeId(match.getNodeId())
        .status(match.getStatus())
        .createdAt(match.getCreatedAt())
        .build();
  }
}
