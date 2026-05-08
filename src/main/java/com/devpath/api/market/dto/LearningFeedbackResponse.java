package com.devpath.api.market.dto;

import com.devpath.domain.market.model.LearningNextStep;
import com.devpath.domain.market.model.LearningSkillGap;
import com.devpath.domain.market.model.RelatedLearningResource;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class LearningFeedbackResponse {

  private LearningFeedbackResponse() {}

  @Schema(name = "LearningFeedbackRefreshResponse", description = "학습 데이터 재추출 응답")
  public record RefreshResult(
      @Schema(description = "프로필 ID", example = "1") Long profileId,
      @Schema(description = "보유 스킬 수", example = "3") Integer ownedSkillCount,
      @Schema(description = "시장 인기 기술 수", example = "10") Integer marketSkillCount,
      @Schema(description = "부족 스킬 수", example = "5") Integer skillGapCount,
      @Schema(description = "처리 메시지", example = "학습 데이터 재추출이 완료되었습니다.") String message,
      @Schema(description = "재추출 일시", example = "2026-05-06T16:00:00") LocalDateTime refreshedAt,
      @Schema(
              description = "계산된 스킬 갭 목록",
              example = "[{\"skillName\":\"Docker\",\"priorityScore\":120}]")
          List<SkillGapDetail> skillGaps) {}

  @Schema(name = "LearningSkillGapResponse", description = "스킬 갭 응답")
  public record SkillGapDetail(
      @Schema(description = "스킬명", example = "Docker") String skillName,
      @Schema(description = "시장 수요 count", example = "12") Long marketDemandCount,
      @Schema(description = "보유 여부", example = "false") Boolean owned,
      @Schema(description = "우선순위 점수", example = "120") Integer priorityScore,
      @Schema(description = "추천 사유", example = "시장 공고에서 자주 등장하지만 내 프로필에는 없는 기술입니다.")
          String reason) {

    public static SkillGapDetail from(LearningSkillGap gap) {
      return new SkillGapDetail(
          gap.skillName(), gap.marketDemandCount(), gap.owned(), gap.priorityScore(), gap.reason());
    }
  }

  @Schema(name = "LearningNextStepResponse", description = "다음 학습 스텝 응답")
  public record NextStepDetail(
      @Schema(description = "스킬명", example = "Docker") String skillName,
      @Schema(description = "학습 순서", example = "1") Integer stepOrder,
      @Schema(description = "학습 제목", example = "Docker 컨테이너 기초 학습") String title,
      @Schema(description = "학습 설명", example = "Docker 기본 개념부터 컨테이너 실행과 이미지 빌드까지 학습합니다.")
          String description,
      @Schema(description = "추천 액션", example = "관련 로드맵에 Docker 노드를 추가하세요.")
          String recommendedAction) {

    public static NextStepDetail from(LearningNextStep step) {
      return new NextStepDetail(
          step.skillName(),
          step.stepOrder(),
          step.title(),
          step.description(),
          step.recommendedAction());
    }
  }

  @Schema(name = "LearningNextStepsResponse", description = "다음 학습 스텝 목록 응답")
  public record NextSteps(
      @Schema(description = "프로필 ID", example = "1") Long profileId,
      @Schema(
              description = "스킬 갭 목록",
              example = "[{\"skillName\":\"Docker\",\"priorityScore\":120}]")
          List<SkillGapDetail> skillGaps,
      @Schema(description = "다음 학습 스텝 목록", example = "[{\"skillName\":\"Docker\",\"stepOrder\":1}]")
          List<NextStepDetail> nextSteps) {}

  @Schema(name = "RelatedLearningResourceResponse", description = "관련 로드맵/강의 추천 응답")
  public record RelatedResourceDetail(
      @Schema(description = "추천 리소스 타입", example = "ROADMAP") String resourceType,
      @Schema(description = "스킬명", example = "Docker") String skillName,
      @Schema(description = "추천 제목", example = "Docker 실무 입문 로드맵") String title,
      @Schema(description = "추천 설명", example = "Docker 학습 노드를 추가해 시장 수요가 높은 부족 기술을 보완합니다.")
          String description,
      @Schema(description = "우선순위 점수", example = "120") Integer priorityScore) {

    public static RelatedResourceDetail from(RelatedLearningResource resource) {
      return new RelatedResourceDetail(
          resource.resourceType(),
          resource.skillName(),
          resource.title(),
          resource.description(),
          resource.priorityScore());
    }
  }

  @Schema(name = "RelatedRoadmapResponse", description = "관련 로드맵 추천 응답")
  public record RelatedRoadmaps(
      @Schema(description = "프로필 ID", example = "1") Long profileId,
      @Schema(
              description = "추천 로드맵 목록",
              example = "[{\"resourceType\":\"ROADMAP\",\"skillName\":\"Docker\"}]")
          List<RelatedResourceDetail> roadmaps) {}

  @Schema(name = "AddToRoadmapResponse", description = "로드맵 추가 결과 응답")
  public record AddToRoadmapResult(
      @Schema(description = "프로필 ID", example = "1") Long profileId,
      @Schema(description = "로드맵 ID", example = "1") Long roadmapId,
      @Schema(description = "추가한 스킬명", example = "Docker") String skillName,
      @Schema(description = "추가 상태", example = "READY_TO_ADD") String status,
      @Schema(description = "처리 메시지", example = "로드맵 도메인 연동 전 단계로 추가 후보가 생성되었습니다.")
          String message) {}

  @Schema(name = "RecommendedCourseResponse", description = "추천 강의 응답")
  public record RecommendedCourses(
      @Schema(description = "프로필 ID", example = "1") Long profileId,
      @Schema(
              description = "추천 강의 목록",
              example = "[{\"resourceType\":\"COURSE\",\"skillName\":\"AWS\"}]")
          List<RelatedResourceDetail> courses) {}
}
