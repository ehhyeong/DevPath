package com.devpath.api.squad.dto;

import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadMember;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SquadResponse {

  private Long squadId;
  private String name;
  private String description;
  private boolean archived;
  private LocalDateTime archivedAt;
  private LocalDateTime createdAt;
  private List<SquadMemberResponse> members;

  public static SquadResponse from(Squad squad, List<SquadMember> members) {
    return SquadResponse.builder()
        .squadId(squad.getId())
        .name(squad.getName())
        .description(squad.getDescription())
        .archived(squad.getIsArchived())
        .archivedAt(squad.getArchivedAt())
        .createdAt(squad.getCreatedAt())
        .members(members.stream().map(SquadMemberResponse::from).toList())
        .build();
  }
}
