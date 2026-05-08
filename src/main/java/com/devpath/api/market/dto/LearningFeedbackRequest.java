package com.devpath.api.market.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class LearningFeedbackRequest {

  private LearningFeedbackRequest() {}

  @Schema(name = "LearningFeedbackRefreshRequest", description = "학습 데이터 재추출 요청")
  public record Refresh(
      @Schema(description = "채용 분석용 프로필 ID", example = "1") @NotNull(message = "프로필 ID는 필수입니다.")
          Long profileId) {}

  @Schema(name = "RelatedRoadmapRequest", description = "관련 로드맵 추천 요청")
  public record RelatedRoadmaps(
      @Schema(description = "채용 분석용 프로필 ID", example = "1") @NotNull(message = "프로필 ID는 필수입니다.")
          Long profileId,
      @Schema(description = "대상 스킬명", example = "Docker")
          @Size(max = 100, message = "대상 스킬명은 100자 이하여야 합니다.")
          String targetSkill) {}

  @Schema(name = "AddToRoadmapRequest", description = "로드맵에 추가하기 요청")
  public record AddToRoadmap(
      @Schema(description = "채용 분석용 프로필 ID", example = "1") @NotNull(message = "프로필 ID는 필수입니다.")
          Long profileId,
      @Schema(description = "로드맵 ID", example = "1") @NotNull(message = "로드맵 ID는 필수입니다.")
          Long roadmapId,
      @Schema(description = "추가할 스킬명", example = "Docker")
          @NotNull(message = "추가할 스킬명은 필수입니다.")
          @Size(max = 100, message = "스킬명은 100자 이하여야 합니다.")
          String skillName) {}

  @Schema(name = "RecommendedCourseRequest", description = "스킬 갭 기반 추천 강의 요청")
  public record Courses(
      @Schema(description = "채용 분석용 프로필 ID", example = "1") @NotNull(message = "프로필 ID는 필수입니다.")
          Long profileId,
      @Schema(description = "대상 스킬명", example = "AWS")
          @Size(max = 100, message = "대상 스킬명은 100자 이하여야 합니다.")
          String targetSkill) {}
}
