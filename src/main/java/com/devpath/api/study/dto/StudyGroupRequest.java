package com.devpath.api.study.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "스터디 그룹 생성 및 수정 요청 DTO")
public class StudyGroupRequest {

  @NotBlank(message = "스터디 그룹명은 필수입니다.")
  @Schema(description = "스터디 그룹명", example = "Spring Boot 마스터 스터디")
  private String name;

  @Schema(description = "스터디 상세 설명", example = "매주 주말 온라인으로 진행하는 백엔드 스터디입니다.")
  private String description;

  @NotNull(message = "최대 인원 수는 필수입니다.")
  @Schema(description = "최대 인원 수", example = "6")
  private Integer maxMembers;
}
