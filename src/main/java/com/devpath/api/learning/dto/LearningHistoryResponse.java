package com.devpath.api.learning.dto;

import com.devpath.api.proof.dto.ProofCardResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class LearningHistoryResponse {

  @Getter
  @Builder
  @Schema(description = "Learning history summary response")
  public static class Summary {

    @Schema(description = "Completed node count", example = "8")
    private Long completedNodeCount;

    @Schema(description = "Issued proof card count", example = "3")
    private Long proofCardCount;

    @Schema(description = "TIL count", example = "6")
    private Long tilCount;

    @Schema(description = "Published TIL count", example = "2")
    private Long publishedTilCount;

    @Schema(description = "Assignment submission count", example = "5")
    private Long assignmentSubmissionCount;

    @Schema(description = "Passed assignment count", example = "4")
    private Long passedAssignmentCount;

    @Schema(description = "Supplement recommendation count", example = "3")
    private Long supplementRecommendationCount;
  }

  @Getter
  @Builder
  @Schema(description = "Completed node response")
  public static class CompletedNodeDetail {

    @Schema(description = "Roadmap node id", example = "10")
    private Long nodeId;

    @Schema(description = "Roadmap node title", example = "Spring Security JWT authentication")
    private String nodeTitle;

    @Schema(description = "Cleared time", example = "2026-03-28T13:20:00")
    private LocalDateTime clearedAt;

    @Schema(description = "Proof issued flag", example = "true")
    private Boolean proofIssued;
  }

  @Getter
  @Builder
  @Schema(description = "Assignment response")
  public static class AssignmentDetail {

    @Schema(description = "Submission id", example = "1")
    private Long submissionId;

    @Schema(description = "Assignment id", example = "3")
    private Long assignmentId;

    @Schema(description = "Roadmap node id", example = "10")
    private Long nodeId;

    @Schema(description = "Roadmap node title", example = "Spring Security JWT authentication")
    private String nodeTitle;

    @Schema(description = "Assignment title", example = "Implement JWT authentication filter")
    private String assignmentTitle;

    @Schema(description = "Submission status", example = "GRADED")
    private String submissionStatus;

    @Schema(description = "Total score", example = "95")
    private Integer totalScore;

    @Schema(description = "Submitted time", example = "2026-03-28T14:00:00")
    private LocalDateTime submittedAt;
  }

  @Getter
  @Builder
  @Schema(description = "Learning history detail response")
  public static class Detail {

    @Schema(description = "Learning history summary")
    private Summary summary;

    @Schema(description = "Completed nodes")
    private List<CompletedNodeDetail> completedNodes;

    @Schema(description = "Assignments")
    private List<AssignmentDetail> assignments;

    @Schema(description = "TIL list")
    private List<TilResponse> tils;

    @Schema(description = "Proof cards")
    private List<ProofCardResponse.Summary> proofCards;

    @Schema(description = "Supplement recommendations")
    private List<SupplementRecommendationResponse> supplementRecommendations;

    @Schema(description = "Latest weakness analysis")
    private WeaknessAnalysisResponse latestWeaknessAnalysis;
  }

  @Getter
  @Builder
  @Schema(description = "Learning history share-link response")
  public static class ShareLinkDetail {

    @Schema(description = "Share link id", example = "1")
    private Long shareLinkId;

    @Schema(description = "Share token", example = "history-share-token-123")
    private String shareToken;

    @Schema(description = "Share title", example = "Kim Taehyeong learning history")
    private String title;

    @Schema(
        description = "Share URL",
        example = "/api/me/learning-histories/share-links/history-share-token-123")
    private String shareUrl;

    @Schema(description = "Access count", example = "12")
    private Long accessCount;

    @Schema(description = "Expiration time", example = "2026-04-30T23:59:59")
    private LocalDateTime expiresAt;

    @Schema(description = "Created time", example = "2026-03-29T10:00:00")
    private LocalDateTime createdAt;
  }

  @Getter
  @Builder
  @Schema(description = "Shared learning history response")
  public static class SharedDetail {

    @Schema(description = "Share token", example = "history-share-token-123")
    private String shareToken;

    @Schema(description = "Share title", example = "Kim Taehyeong learning history")
    private String title;

    @Schema(description = "Access count", example = "12")
    private Long accessCount;

    @Schema(description = "Learning history detail")
    private Detail history;
  }

  @Getter
  @Builder
  @Schema(description = "Learning history organize response")
  public static class OrganizeResult {

    @Schema(description = "Organized time", example = "2026-03-29T10:30:00")
    private LocalDateTime organizedAt;

    @Schema(description = "Organized summary")
    private Summary summary;
  }
}
