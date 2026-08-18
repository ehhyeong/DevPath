package com.devpath.api.workspace.dto;

import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
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

  @Schema(description = "Learner display name", example = "김하늘")
  private String learnerName;

  @Schema(description = "Learner profile image URL")
  private String profileImage;

  @Schema(description = "워크스페이스에서 확정된 상세 포지션", example = "Frontend 개발자")
  private String position;

  @Schema(description = "화면 표시용 직군 약어", example = "FE")
  private String roleLabel;

  @Schema(description = "참여 일시")
  private LocalDateTime joinedAt;

  @Schema(description = "마지막 워크스페이스 접속 일시")
  private LocalDateTime lastActiveAt;

  @Schema(description = "현재 온라인 여부")
  private boolean online;

  public static WorkspaceMemberResponse from(WorkspaceMember member) {
    return from(member, false);
  }

  public static WorkspaceMemberResponse from(WorkspaceMember member, boolean online) {
    return builder()
        .memberId(member.getId())
        .learnerId(member.getLearnerId())
        .position(member.getPositionLabel())
        .roleLabel(toRoleLabel(member.getPositionLabel()))
        .joinedAt(member.getJoinedAt())
        .lastActiveAt(member.getLastActiveAt())
        .online(online)
        .build();
  }

  public static WorkspaceMemberResponse from(
      WorkspaceMember member, User user, UserProfile profile) {
    return from(member, user, profile, false);
  }

  public static WorkspaceMemberResponse from(
      WorkspaceMember member, User user, UserProfile profile, boolean online) {
    return from(member, user, profile, online, member.getPositionLabel());
  }

  public static WorkspaceMemberResponse from(
      WorkspaceMember member,
      User user,
      UserProfile profile,
      boolean online,
      String resolvedPositionLabel) {
    return builder()
        .memberId(member.getId())
        .learnerId(member.getLearnerId())
        .learnerName(user == null ? null : user.getName())
        .profileImage(profile == null ? null : profile.getDisplayProfileImage())
        .position(resolvedPositionLabel)
        .roleLabel(toRoleLabel(resolvedPositionLabel))
        .joinedAt(member.getJoinedAt())
        .lastActiveAt(member.getLastActiveAt())
        .online(online)
        .build();
  }

  private static String toRoleLabel(String positionLabel) {
    if (positionLabel == null || positionLabel.isBlank()) {
      return null;
    }
    String normalized = positionLabel.trim().toLowerCase();
    if (normalized.contains("front")) {
      return "FE";
    }
    if (normalized.contains("back")) {
      return "BE";
    }
    if (normalized.contains("full")) {
      return "FS";
    }
    if (normalized.contains("design") || normalized.contains("디자")) {
      return "DES";
    }
    if (normalized.contains("기획") || normalized.contains("pm")) {
      return "PM";
    }
    if (normalized.contains("devops")
        || normalized.contains("infra")
        || normalized.contains("인프라")) {
      return "OPS";
    }
    return positionLabel.trim();
  }
}
