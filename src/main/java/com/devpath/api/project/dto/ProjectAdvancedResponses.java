package com.devpath.api.project.dto;

import com.devpath.domain.project.entity.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

public class ProjectAdvancedResponses {

  @Getter
  @Builder
  @Schema(description = "프로젝트 초대 응답 DTO")
  public static class InvitationResponse {
    @Schema(description = "초대 ID", example = "1")
    private Long id;

    @Schema(description = "초대 상태", example = "PENDING")
    private ProjectInvitationStatus status;

    public static InvitationResponse from(ProjectInvitation inv) {
      return builder().id(inv.getId()).status(inv.getStatus()).build();
    }
  }

  @Getter
  @Builder
  @Schema(description = "프로젝트 역할 응답 DTO")
  public static class RoleResponse {
    @Schema(description = "역할 ID", example = "1")
    private Long id;

    @Schema(description = "역할 타입", example = "BACKEND")
    private ProjectRoleType roleType;

    @Schema(description = "필요 인원", example = "2")
    private Integer requiredCount;

    public static RoleResponse from(ProjectRole role) {
      return builder()
          .id(role.getId())
          .roleType(role.getRoleType())
          .requiredCount(role.getRequiredCount())
          .build();
    }
  }

  @Getter
  @Builder
  @Schema(description = "프로젝트 아이디어 게시판 응답 DTO")
  public static class IdeaPostResponse {
    @Schema(description = "게시글 ID", example = "1")
    private Long id;

    @Schema(description = "작성자 ID", example = "1")
    private Long authorId;

    @Schema(description = "게시글 제목", example = "O2O 펫 시터 플랫폼 팀원 구합니다.")
    private String title;

    @Schema(description = "게시글 내용")
    private String content;

    @Schema(description = "생성 일시")
    private java.time.LocalDateTime createdAt;

    @Schema(description = "수정 일시")
    private java.time.LocalDateTime updatedAt;

    public static IdeaPostResponse from(ProjectIdeaPost post) {
      return builder()
          .id(post.getId())
          .authorId(post.getAuthorId())
          .title(post.getTitle())
          .content(post.getContent())
          .createdAt(post.getCreatedAt())
          .updatedAt(post.getUpdatedAt())
          .build();
    }
  }

  @Getter
  @Builder
  @Schema(description = "멘토링 지원 내역 응답 DTO")
  public static class MentoringResponse {
    @Schema(description = "멘토링 지원 ID", example = "1")
    private Long id;

    @Schema(description = "지원 메시지", example = "열심히 하겠습니다!")
    private String message;

    @Schema(description = "지원 상태", example = "PENDING")
    private MentoringApplicationStatus status;

    public static MentoringResponse from(MentoringApplication application) {
      return builder()
          .id(application.getId())
          .message(application.getMessage())
          .status(application.getStatus())
          .build();
    }
  }

  @Getter
  @Builder
  @Schema(description = "프로젝트 제출 내역 응답 DTO")
  public static class ProofSubmissionResponse {
    @Schema(description = "제출 ID", example = "1")
    private Long id;

    @Schema(description = "Proof Card 참조 ID", example = "PROOF-2026-ABC")
    private String proofCardRefId;

    @Schema(description = "제출 일시")
    private LocalDateTime submittedAt;

    public static ProofSubmissionResponse from(ProjectProofSubmission submission) {
      return builder()
          .id(submission.getId())
          .proofCardRefId(submission.getProofCardRefId())
          .submittedAt(submission.getSubmittedAt())
          .build();
    }
  }
}
