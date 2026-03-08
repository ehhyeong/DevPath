package com.devpath.api.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List; // [추가] List 임포트
import lombok.Builder;
import lombok.Getter;

public class RoadmapDto {

  @Getter
  @Schema(description = "오피셜 로드맵 생성 요청 DTO")
  public static class CreateRequest {
    @NotBlank(message = "로드맵 제목은 필수입니다.")
    @Schema(description = "로드맵 제목", example = "백엔드 마스터 로드맵")
    private String title;

    @Schema(description = "로드맵 상세 설명", example = "Java와 Spring Boot를 기초부터 실무까지 마스터하는 로드맵입니다.")
    private String description;
  }

  @Getter
  @Builder
  @Schema(description = "오피셜 로드맵 응답 DTO")
  public static class Response {
    @Schema(description = "로드맵 ID", example = "1")
    private Long roadmapId;

    @Schema(description = "로드맵 제목", example = "백엔드 마스터 로드맵")
    private String title;

    @Schema(description = "로드맵 설명")
    private String description;

    @Schema(description = "공식 로드맵 여부", example = "true")
    private Boolean isOfficial;

    @Schema(description = "생성 일시")
    private LocalDateTime createdAt;
  }

  // [추가] 로드맵 상세(트리) 응답 DTO
  @Getter
  @Builder
  @Schema(description = "오피셜 로드맵 상세(트리) 응답 DTO")
  public static class DetailResponse {
    @Schema(description = "로드맵 ID", example = "1")
    private Long roadmapId;

    @Schema(description = "로드맵 제목", example = "백엔드 마스터 로드맵")
    private String title;

    @Schema(description = "로드맵 설명")
    private String description;

    @Schema(description = "공식 로드맵 여부", example = "true")
    private Boolean isOfficial;

    @Schema(description = "생성 일시")
    private LocalDateTime createdAt;

    @Schema(description = "로드맵에 속한 세부 노드 리스트 (정렬됨)")
    private List<RoadmapNodeDto.Response> nodes;
  }
}
