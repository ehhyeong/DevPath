package com.devpath.api.project.dto;

import com.devpath.domain.project.entity.ProjectMember;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectMemberResponse {

  private Long memberId;
  private Long learnerId;
  private String roleType;
  private LocalDateTime joinedAt;

  public static ProjectMemberResponse from(ProjectMember member) {
    return ProjectMemberResponse.builder()
        .memberId(member.getId())
        .learnerId(member.getLearnerId())
        .roleType(member.getRoleType().name())
        .joinedAt(member.getJoinedAt())
        .build();
  }
}
