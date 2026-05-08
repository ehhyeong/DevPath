package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.WorkspaceMember;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "워크스페이스 멤버 응답 DTO")
public class WorkspaceMemberResponse {

  @Schema(description = "멤버 ID", example = "1")
  private Long memberId;

  @Schema(description = "학습자 ID", example = "1")
  private Long learnerId;

  @Schema(description = "참여 일시")
  private LocalDateTime joinedAt;

  public static WorkspaceMemberResponse from(WorkspaceMember member) {
    return builder()
        .memberId(member.getId())
        .learnerId(member.getLearnerId())
        .joinedAt(member.getJoinedAt())
        .build();
  }
}
