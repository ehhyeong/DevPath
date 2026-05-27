package com.devpath.api.squad.dto;

import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadLoungeType;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
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
public class SquadLoungePostResponse {

  private Long id;
  private Long authorId;
  private String authorName;
  private String title;
  private String type;
  private LocalDate deadline;
  private List<String> tags;
  private String description;
  private List<String> roles;
  private int currentMembers;
  private int maxMembers;
  private long views;
  private boolean closed;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private List<SquadMemberResponse> members;

  public static SquadLoungePostResponse from(Squad squad, List<SquadMember> members) {
    SquadMember leader =
        members.stream()
            .filter(member -> member.getRole() == SquadRole.LEADER)
            .findFirst()
            .orElseGet(() -> members.isEmpty() ? null : members.get(0));

    int currentMembers = members.size();
    int maxMembers =
        squad.getMaxMembers() == null ? Math.max(currentMembers, 1) : squad.getMaxMembers();

    return SquadLoungePostResponse.builder()
        .id(squad.getId())
        .authorId(leader == null ? null : leader.getUser().getId())
        .authorName(leader == null ? "사용자" : leader.getUser().getName())
        .title(squad.getName())
        .type(toWireType(squad.getLoungeType()))
        .deadline(squad.getRecruitingDeadline())
        .tags(splitCsv(squad.getTags()))
        .description(squad.getDescription())
        .roles(splitCsv(squad.getRoles()))
        .currentMembers(currentMembers)
        .maxMembers(maxMembers)
        .views(squad.getViewCount() == null ? 0L : squad.getViewCount())
        .closed(Boolean.TRUE.equals(squad.getIsArchived()))
        .createdAt(squad.getCreatedAt())
        .updatedAt(squad.getUpdatedAt())
        .members(members.stream().map(SquadMemberResponse::from).toList())
        .build();
  }

  private static String toWireType(SquadLoungeType loungeType) {
    SquadLoungeType safeType = loungeType == null ? SquadLoungeType.PROJECT : loungeType;
    return safeType.name().toLowerCase();
  }

  private static List<String> splitCsv(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return Arrays.stream(value.split(","))
        .map(String::trim)
        .filter(token -> !token.isBlank())
        .toList();
  }
}
