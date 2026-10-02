package com.devpath.api.builder.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Schema(description = "로드맵 빌더 AI 네비게이터 응답")
public class BuilderAiAssistResponse {

  @Schema(description = "학습자에게 보여줄 AI 답변", example = "백엔드 기초부터 배포까지 3개월 분량으로 구성했습니다.")
  private String answer;

  @Schema(description = "캔버스 끝에 이어 붙일 학습 단계 (학습 순서대로). 추천할 단계가 없으면 빈 배열이다.")
  private List<Step> steps;

  @Schema(description = "캔버스에 이미 있는 노드 옆에 대안 갈래로 붙일 분기. 없으면 빈 배열이다.")
  private List<Branch> branches;

  @Getter
  @Builder
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  @Schema(name = "BuilderAiAssistStep", description = "학습 단계. 모듈 1개면 척추, 2개면 좌/우 분기다.")
  public static class Step {

    @Schema(description = "단계에 놓을 모듈 (1~2개)")
    private List<Module> modules;

    public static Step of(List<Module> modules) {
      return Step.builder().modules(modules).build();
    }
  }

  @Getter
  @Builder
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  @Schema(name = "BuilderAiAssistBranch", description = "캔버스 기존 노드에 붙일 분기")
  public static class Branch {

    @Schema(description = "분기를 붙일 캔버스의 공식 노드 ID", example = "12")
    private Long anchorNodeId;

    @Schema(description = "대안 갈래로 붙일 모듈")
    private Module module;

    public static Branch of(Long anchorNodeId, Module module) {
      return Branch.builder().anchorNodeId(anchorNodeId).module(module).build();
    }
  }

  @Getter
  @Builder
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  @Schema(name = "BuilderAiAssistModule", description = "AI가 추천한 공식 로드맵 노드")
  public static class Module {

    @Schema(description = "공식 로드맵 노드 ID", example = "12")
    private Long nodeId;

    @Schema(description = "노드가 속한 공식 로드맵 ID", example = "3")
    private Long roadmapId;

    @Schema(description = "노드가 속한 공식 로드맵 제목", example = "백엔드 개발자")
    private String roadmapTitle;

    @Schema(description = "노드 제목", example = "HTTP & 네트워크")
    private String title;

    @Schema(description = "노드 소주제", example = "HTTP 메서드, 상태 코드")
    private String subTopics;

    @Schema(description = "노드 유형", example = "CONCEPT")
    private String nodeType;

    @Schema(description = "추천 사유", example = "API 설계 전에 요청/응답 흐름을 먼저 이해해야 합니다.")
    private String reason;
  }
}