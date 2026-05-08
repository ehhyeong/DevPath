package com.devpath.api.project.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "프로젝트 생성 및 수정 요청 DTO")
public class ProjectRequest {

  @NotBlank(message = "프로젝트 이름은 필수입니다.")
  @Schema(description = "프로젝트 이름", example = "DevPath 클론 코딩")
  private String name;

  @Schema(description = "프로젝트 설명", example = "React와 Spring Boot를 활용한 플랫폼 개발")
  private String description;
}
