package com.devpath.api.project.dto;

import com.devpath.domain.project.entity.ProjectRoleType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class ProjectAdvancedRequests {

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "Project invitation request")
  public static class InvitationRequest {

    @NotNull(message = "Project id is required.")
    @Positive(message = "Project id must be positive.")
    @Schema(description = "Project id", example = "1")
    private Long projectId;

    @NotNull(message = "Invitee id is required.")
    @Positive(message = "Invitee id must be positive.")
    @Schema(description = "Invitee user id", example = "2")
    private Long inviteeId;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "Project role request")
  public static class RoleRequest {

    @NotNull(message = "Project id is required.")
    @Positive(message = "Project id must be positive.")
    @Schema(description = "Project id", example = "1")
    private Long projectId;

    @NotNull(message = "Role type is required.")
    @Schema(description = "Role type", example = "BACKEND")
    private ProjectRoleType roleType;

    @NotNull(message = "Required count is required.")
    @Min(value = 1, message = "Required count must be at least 1.")
    @Schema(description = "Required count", example = "2")
    private Integer requiredCount;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "Project mentoring request")
  public static class MentoringRequest {

    @NotNull(message = "Project id is required.")
    @Positive(message = "Project id must be positive.")
    @Schema(description = "Project id", example = "1")
    private Long projectId;

    @NotNull(message = "Mentor id is required.")
    @Positive(message = "Mentor id must be positive.")
    @Schema(description = "Mentor id", example = "5")
    private Long mentorId;

    @NotBlank(message = "Message is required.")
    @Size(max = 1000, message = "Message must be 1000 characters or fewer.")
    @Schema(
        description = "Request message",
        example = "I want feedback on our Spring Security design.")
    private String message;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "Project idea post request")
  public static class IdeaPostRequest {

    @NotBlank(message = "Title is required.")
    @Size(max = 100, message = "Title must be 100 characters or fewer.")
    @Schema(description = "Title", example = "Looking for backend members")
    private String title;

    @NotBlank(message = "Content is required.")
    @Size(max = 3000, message = "Content must be 3000 characters or fewer.")
    @Schema(description = "Content", example = "Project overview and recruiting details.")
    private String content;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "Project proof submission request")
  public static class ProofSubmissionRequest {

    @NotNull(message = "Project id is required.")
    @Positive(message = "Project id must be positive.")
    @Schema(description = "Project id", example = "1")
    private Long projectId;

    @NotBlank(message = "Proof card ref id is required.")
    @Size(max = 100, message = "Proof card ref id must be 100 characters or fewer.")
    @Schema(description = "Proof card ref id", example = "PROOF-2026-ABC")
    private String proofCardRefId;
  }
}
