package com.devpath.api.instructor.dto.mentoring;

import java.util.List;

public record InstructorMentoringBoardPayload(
    List<ProjectItem> projects,
    List<RequestItem> requests,
    List<OngoingProjectItem> ongoingProjects) {
  public InstructorMentoringBoardPayload() {
    this(List.of(), List.of(), List.of());
  }

  public record ProjectItem(
      String id,
      String title,
      String requestTitle,
      String description,
      String mode,
      String category,
      String recruitStatus,
      Integer current,
      Integer total,
      List<RoleItem> roles,
      List<String> tags,
      String mentorName,
      String mentorBio,
      String intro,
      Integer durationWeeks,
      List<String> weeks) {}

  public record RoleItem(String name, Integer current, Integer total) {}

  public record RequestItem(
      String id,
      String applicantName,
      String avatarSeed,
      String submittedAt,
      String projectId,
      String projectTitle,
      String mode,
      String role,
      String motivation,
      String portfolioUrl) {}

  public record OngoingProjectItem(
      String id,
      String title,
      String subtitle,
      Integer week,
      String mode,
      String category,
      Integer progress,
      String primaryAction,
      String secondaryAction,
      List<String> menuActions,
      Long workspaceId,
      String startDate) {}
}
