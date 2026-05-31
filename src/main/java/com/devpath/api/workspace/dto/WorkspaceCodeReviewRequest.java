package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class WorkspaceCodeReviewRequest {

  private WorkspaceCodeReviewRequest() {}

  @Schema(name = "WorkspaceCodeReviewCreateRequest", description = "스쿼드 코드 리뷰 요청 생성")
  public record Create(
      @Schema(description = "리뷰 요청 제목", example = "feat: 카카오 로그인 연동 리뷰")
          @NotBlank(message = "리뷰 요청 제목은 필수입니다.")
          @Size(max = 180, message = "리뷰 요청 제목은 180자 이하여야 합니다.")
          String title,
      @Schema(description = "설명", example = "OAuth 리다이렉트와 JWT 발급 흐름을 확인해주세요.")
          @Size(max = 2000, message = "설명은 2000자 이하여야 합니다.")
          String description,
      @Schema(description = "PR URL", example = "https://github.com/devpath/app/pull/9")
          @Size(max = 1000, message = "PR URL은 1000자 이하여야 합니다.")
          String prUrl,
      @Schema(description = "대표 파일 경로", example = "src/main/java/com/devpath/auth/AuthService.java")
          @Size(max = 300, message = "파일 경로는 300자 이하여야 합니다.")
          String filePath,
      @Schema(description = "소스 브랜치", example = "feature/auth-kakao")
          @Size(max = 120, message = "소스 브랜치는 120자 이하여야 합니다.")
          String sourceBranch,
      @Schema(description = "타깃 브랜치", example = "main")
          @Size(max = 120, message = "타깃 브랜치는 120자 이하여야 합니다.")
          String targetBranch,
      @Schema(description = "리뷰할 diff 또는 코드", example = "+ // TODO: 카카오 토큰 검증")
          @NotBlank(message = "diffText는 필수입니다.")
          @Size(max = 30000, message = "diffText는 30000자 이하여야 합니다.")
          String diffText) {}

  @Schema(name = "WorkspaceCodeReviewAiReviewCreateRequest", description = "스쿼드 AI 코드 리뷰 실행")
  public record AiReviewCreate(
      @Schema(description = "기본으로 표시할 선택 파일 경로", example = "src/main/java/com/devpath/auth/AuthService.java")
          @Size(max = 500, message = "파일 경로는 500자 이하여야 합니다.")
          String filePath) {}

  @Schema(name = "WorkspaceCodeReviewCommentCreateRequest", description = "스쿼드 코드 리뷰 팀원 피드백 등록")
  public record CommentCreate(
      @Schema(description = "피드백 내용", example = "토큰 만료 예외 케이스도 같이 확인하면 좋겠습니다.")
          @NotBlank(message = "피드백 내용을 입력해주세요.")
          @Size(max = 4000, message = "피드백 내용은 4000자 이하여야 합니다.")
          String body,
      @Schema(description = "피드백 대상 파일 경로", example = "src/main/java/com/devpath/auth/AuthService.java")
          @Size(max = 500, message = "파일 경로는 500자 이하여야 합니다.")
          String filePath) {}
}
