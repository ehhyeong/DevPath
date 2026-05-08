package com.devpath.api.dashboard.dto;

import com.devpath.domain.project.entity.MentoringApplicationStatus;
import com.devpath.domain.project.entity.ProjectStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Learner dashboard mentoring summary response")
public class DashboardMentoringResponse {

  @Schema(description = "Number of joined projects", example = "2")
  private Integer joinedProjectCount;

  @Schema(description = "Number of mentoring applications on joined projects", example = "1")
  private Integer applicationCount;

  @Schema(description = "Number of pending mentoring applications", example = "1")
  private Integer pendingApplicationCount;

  @Schema(description = "Most recent joined project")
  private ProjectItem latestProject;

  @Schema(description = "Most recent mentoring application")
  private ApplicationItem latestApplication;

  @Getter
  @Builder
  @Schema(description = "Recent project item")
  public static class ProjectItem {

    @Schema(description = "Project ID", example = "1")
    private Long projectId;

    @Schema(description = "Project name", example = "DevPath Dashboard Sprint")
    private String name;

    @Schema(description = "Project status", example = "IN_PROGRESS")
    private ProjectStatus status;

    @Schema(description = "Joined at")
    private LocalDateTime joinedAt;
  }

  @Getter
  @Builder
  @Schema(description = "Recent mentoring application item")
  public static class ApplicationItem {

    @Schema(description = "Application ID", example = "3")
    private Long applicationId;

    @Schema(description = "Mentor user ID", example = "24")
    private Long mentorId;

    @Schema(description = "Mentor display name", example = "김멘토")
    private String mentorName;

    @Schema(description = "Application status", example = "PENDING")
    private MentoringApplicationStatus status;

    @Schema(description = "Application message")
    private String message;

    @Schema(description = "Applied at")
    private LocalDateTime createdAt;
  }
}
