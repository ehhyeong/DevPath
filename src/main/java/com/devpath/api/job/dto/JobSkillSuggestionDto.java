package com.devpath.api.job.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

// TASK-39: 성장공고 보완 스킬 "로드맵에서 학습하기" 요청/응답 DTO
public class JobSkillSuggestionDto {

  @Getter
  @NoArgsConstructor
  @Schema(description = "성장공고 보완 스킬 로드맵 연동 요청")
  public static class Request {

    @Schema(description = "학습할 보완 스킬명", example = "React")
    private String skill;

    @Schema(description = "출처 채용공고 제목(컨텍스트용, 선택)", example = "프론트엔드 개발자")
    private String jobTitle;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  @Builder
  @Schema(description = "성장공고 보완 스킬 로드맵 연동 응답")
  public static class Response {

    @Schema(
        description = "처리 모드: ADD(기존 로드맵에 노드 추가 제안) | CREATED(신규 기술 로드맵 생성)",
        example = "ADD")
    private String mode;

    @Schema(description = "ADD 모드일 때 수락/무시에 사용할 추천 변경 ID", example = "12")
    private Long changeId;

    @Schema(description = "대상(또는 생성된) 커스텀 로드맵 ID", example = "30")
    private Long targetCustomRoadmapId;

    @Schema(description = "대상(또는 생성된) 로드맵 제목", example = "내 프론트엔드 로드맵")
    private String roadmapTitle;

    @Schema(description = "ADD 모드일 때 삽입 기준 anchor 노드 제목", example = "React 상태관리")
    private String anchorNodeTitle;

    @Schema(description = "ADD 모드일 때 새로 추가될 노드 제목", example = "React 성능 최적화")
    private String newNodeTitle;

    @Schema(description = "ADD 모드일 때 분기 종류: ADVANCED(심화) | REVIEW(복습)", example = "ADVANCED")
    private String branchType;

    @Schema(description = "이동할 로드맵 상세 URL", example = "/my-roadmap?customRoadmapId=30")
    private String redirectUrl;
  }
}