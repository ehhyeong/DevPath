package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class WorkspaceCodeReviewResponse {

  private WorkspaceCodeReviewResponse() {}

  @Schema(name = "WorkspaceCodeReviewBoardResponse", description = "스쿼드 코드 리뷰 보드 응답")
  public record Board(
      @Schema(description = "워크스페이스 ID", example = "1") Long workspaceId,
      @Schema(description = "프로젝트명", example = "배달비 예약 플랫폼") String projectName,
      @Schema(description = "멤버 목록") List<WorkspaceMemberResponse> members,
      @Schema(description = "열린 리뷰 요청") List<Summary> openReviews,
      @Schema(description = "닫힌 리뷰 요청") List<Summary> closedReviews) {}

  @Schema(name = "WorkspaceCodeReviewSummaryResponse", description = "스쿼드 코드 리뷰 요약")
  public record Summary(
      @Schema(description = "리뷰 요청 ID", example = "9") Long reviewId,
      @Schema(description = "워크스페이스 ID", example = "1") Long workspaceId,
      @Schema(description = "표시용 PR 번호", example = "#PR-9") String issueKey,
      @Schema(description = "제목", example = "feat: 카카오 로그인 연동") String title,
      @Schema(description = "상태", example = "OPEN") String status,
      @Schema(description = "작성자 ID", example = "2") Long authorId,
      @Schema(description = "작성자명", example = "김하늘") String authorName,
      @Schema(description = "작성자 프로필 이미지") String authorProfileImage,
      @Schema(description = "작성자 역할", example = "FE") String authorRole,
      @Schema(description = "대표 파일 경로", example = "src/main/java/com/devpath/auth/AuthService.java")
          String filePath,
      @Schema(description = "변경 파일 수", example = "4") Integer fileCount,
      @Schema(description = "소스 브랜치", example = "feature/auth-kakao") String sourceBranch,
      @Schema(description = "타깃 브랜치", example = "main") String targetBranch,
      @Schema(description = "추가 라인 수", example = "18") Integer additions,
      @Schema(description = "삭제 라인 수", example = "4") Integer deletions,
      @Schema(description = "AI 코멘트 수", example = "2") Integer aiCommentCount,
      @Schema(description = "AI 리뷰 ID", example = "12") Long aiCodeReviewId,
      @Schema(description = "생성일시") LocalDateTime createdAt,
      @Schema(description = "수정일시") LocalDateTime updatedAt) {}

  @Schema(name = "WorkspaceCodeReviewDetailResponse", description = "스쿼드 코드 리뷰 상세")
  public record Detail(
      @Schema(description = "요약 정보") Summary summary,
      @Schema(description = "설명") String description,
      @Schema(description = "PR URL") String prUrl,
      @Schema(description = "리뷰 대상 전체 diff") String diffText,
      @Schema(description = "파일별 diff 목록") List<FileDiff> files,
      @Schema(description = "AI 리뷰 결과") AiReview aiReview,
      @Schema(description = "멤버 목록") List<WorkspaceMemberResponse> members,
      @Schema(description = "팀원 피드백 목록") List<MemberComment> comments) {}

  @Schema(name = "WorkspaceAiCodeReviewResponse", description = "워크스페이스 AI 코드 리뷰 결과")
  public record AiReview(
      @Schema(description = "AI 코드 리뷰 ID", example = "1") Long reviewId,
      @Schema(description = "요청자 ID", example = "2") Long requesterId,
      @Schema(description = "요청자 이름", example = "이학습") String requesterName,
      @Schema(description = "PR 제출 ID", example = "1") Long pullRequestId,
      @Schema(description = "AI 리뷰 제목", example = "1주차 PR 자동 리뷰") String title,
      @Schema(description = "AI 리뷰 요약") String summary,
      @Schema(description = "코멘트 개수", example = "4") Integer commentCount,
      @Schema(description = "리뷰 Provider 이름", example = "RULE_BASED") String providerName,
      @Schema(description = "AI 리뷰 코멘트 목록") List<AiComment> comments,
      @Schema(description = "생성일시") LocalDateTime createdAt) {}

  @Schema(name = "WorkspaceAiReviewCommentResponse", description = "워크스페이스 AI 리뷰 코멘트")
  public record AiComment(
      @Schema(description = "AI 리뷰 코멘트 ID", example = "1") Long commentId,
      @Schema(description = "AI 코드 리뷰 ID", example = "1") Long reviewId,
      @Schema(description = "카테고리", example = "LOMBOK_CONVENTION") String category,
      @Schema(description = "라인 번호", example = "10") Integer lineNumber,
      @Schema(description = "코멘트 제목") String title,
      @Schema(description = "코멘트 메시지") String message,
      @Schema(description = "개선 제안") String suggestion,
      @Schema(description = "코멘트 상태", example = "PENDING") String status,
      @Schema(description = "처리일시") LocalDateTime decidedAt,
      @Schema(description = "생성일시") LocalDateTime createdAt) {}

  @Schema(name = "WorkspaceCodeReviewFileDiffResponse", description = "코드 리뷰 파일별 diff")
  public record FileDiff(
      @Schema(description = "파일 diff ID", example = "1") Long fileId,
      @Schema(description = "리뷰 요청 ID", example = "9") Long reviewId,
      @Schema(description = "파일 경로", example = "src/main/java/com/devpath/auth/AuthService.java")
          String filePath,
      @Schema(description = "파일 diff") String diffText,
      @Schema(description = "추가 라인 수", example = "18") Integer additions,
      @Schema(description = "삭제 라인 수", example = "4") Integer deletions,
      @Schema(description = "변경 유형", example = "modified") String changeType) {}

  @Schema(name = "WorkspaceCodeReviewMemberCommentResponse", description = "스쿼드 코드 리뷰 팀원 피드백")
  public record MemberComment(
      @Schema(description = "댓글 ID", example = "1") Long commentId,
      @Schema(description = "리뷰 요청 ID", example = "9") Long reviewId,
      @Schema(description = "작성자 ID", example = "2") Long authorId,
      @Schema(description = "작성자명", example = "김하늘") String authorName,
      @Schema(description = "작성자 프로필 이미지") String authorProfileImage,
      @Schema(description = "피드백 내용") String body,
      @Schema(description = "피드백 대상 파일 경로") String filePath,
      @Schema(description = "상태 라벨", example = "Commented") String statusLabel,
      @Schema(description = "생성일시") LocalDateTime createdAt) {}
}
