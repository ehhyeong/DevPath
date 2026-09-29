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

  @Schema(description = "캔버스에 추가할 추천 모듈 (학습 순서대로). 추천할 모듈이 없으면 빈 배열이다.")
  private List<Module> modules;

  @Getter
  @Builder
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  @Schema(name = "BuilderAiAssistModule", description = "AI가 추천한 공식 로드맵 노드")
  public static class Module {

    @Schema(description = "공식 로드맵 노드 ID", example = "12")
    private Long nodeId;

    @Schema(description = "노드 제목", example = "HTTP & 네트워크")
    private String title;

    @Schema(description = "추천 사유", example = "API 설계 전에 요청/응답 흐름을 먼저 이해해야 합니다.")
    private String reason;

    public static Module of(Long nodeId, String title, String reason) {
      return Module.builder().nodeId(nodeId).title(title).reason(reason).build();
    }
  }
}