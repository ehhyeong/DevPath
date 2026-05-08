package com.devpath.api.squad.dto;

import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "스쿼드 설정 조회 응답")
public class SquadSettingsResponse {

  @Schema(description = "스쿼드 ID", example = "1")
  private Long squadId;

  @Schema(description = "스쿼드 이름", example = "DevPath A Team")
  private String name;

  @Schema(description = "스쿼드 설명", example = "프로젝트 워크스페이스 담당")
  private String description;

  @Schema(description = "보관 여부", example = "false")
  private boolean archived;

  @Schema(description = "삭제 여부", example = "false")
  private boolean deleted;

  @Schema(description = "활성 멤버 수", example = "4")
  private int memberCount;

  @Schema(description = "대표 LEADER 사용자 ID", example = "1")
  private Long leaderId;

  @Schema(description = "보관 일시")
  private LocalDateTime archivedAt;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  @Schema(description = "수정 일시")
  private LocalDateTime updatedAt;

  @Builder
  private SquadSettingsResponse(
      Long squadId,
      String name,
      String description,
      boolean archived,
      boolean deleted,
      int memberCount,
      Long leaderId,
      LocalDateTime archivedAt,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
    this.squadId = squadId;
    this.name = name;
    this.description = description;
    this.archived = archived;
    this.deleted = deleted;
    this.memberCount = memberCount;
    this.leaderId = leaderId;
    this.archivedAt = archivedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public static SquadSettingsResponse from(Squad squad, List<SquadMember> members) {
    Long leaderId =
        members.stream()
            .filter(member -> member.getRole() == SquadRole.LEADER)
            .map(member -> member.getUser().getId())
            .findFirst()
            .orElse(null);

    return SquadSettingsResponse.builder()
        .squadId(squad.getId())
        .name(squad.getName())
        .description(squad.getDescription())
        .archived(Boolean.TRUE.equals(squad.getIsArchived()))
        .deleted(Boolean.TRUE.equals(squad.getIsDeleted()))
        .memberCount(members.size())
        .leaderId(leaderId)
        .archivedAt(squad.getArchivedAt())
        .createdAt(squad.getCreatedAt())
        .updatedAt(squad.getUpdatedAt())
        .build();
  }
}
