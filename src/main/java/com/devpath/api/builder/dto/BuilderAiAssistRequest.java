package com.devpath.api.builder.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "로드맵 빌더 AI 네비게이터 요청")
public class BuilderAiAssistRequest {

  @Schema(description = "학습자가 입력한 자연어 요청", example = "3개월 안에 백엔드 기초부터 배포까지")
  @NotBlank(message = "질문은 필수입니다.")
  @Size(max = 500, message = "질문은 500자 이하여야 합니다.")
  private String question;

  @Schema(description = "현재 선택된 공식 로드맵 템플릿 ID", example = "1")
  @NotNull(message = "로드맵 템플릿 ID는 필수입니다.")
  private Long roadmapId;

  @Schema(description = "이미 캔버스에 올려둔 공식 노드 ID 목록")
  @Size(max = 200, message = "이미 추가한 모듈은 200개 이하여야 합니다.")
  private List<Long> usedNodeIds;
}