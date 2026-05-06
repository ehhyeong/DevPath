package com.devpath.api.job.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public class JobRecommendationRequest {

  private JobRecommendationRequest() {}

  @Schema(name = "JobRecommendationSearchCondition", description = "학습자 공고 추천 검색 조건")
  public record SearchCondition(
      @Schema(description = "사용자 ID", example = "2") Long userId,
      @Schema(description = "희망 지역", example = "SEOUL")
          @Size(max = 150, message = "지역 조건은 150자 이하여야 합니다.")
          String region,
      @Schema(description = "희망 경력 조건", example = "JUNIOR")
          @Size(max = 50, message = "경력 조건은 50자 이하여야 합니다.")
          String careerLevel,
      @Schema(description = "보유 스킬 목록", example = "Java,Spring Boot,JPA")
          @Size(max = 1000, message = "보유 스킬 목록은 1000자 이하여야 합니다.")
          String skillTags,
      @Schema(description = "Proof Card 검증 스킬 목록", example = "Docker,AWS")
          @Size(max = 1000, message = "Proof Card 스킬 목록은 1000자 이하여야 합니다.")
          String proofCardSkills,
      @Schema(description = "완료 로드맵 스킬 목록", example = "React,TypeScript")
          @Size(max = 1000, message = "완료 로드맵 스킬 목록은 1000자 이하여야 합니다.")
          String completedRoadmapSkills) {}
}
