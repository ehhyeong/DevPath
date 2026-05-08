package com.devpath.api.study.dto;

import com.devpath.domain.study.entity.StudyGroup;
import com.devpath.domain.study.entity.StudyGroupStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "스터디 그룹 응답 DTO")
public class StudyGroupResponse {

  @Schema(description = "스터디 그룹 ID", example = "1")
  private Long id;

  @Schema(description = "스터디 그룹명", example = "Spring Boot 마스터 스터디")
  private String name;

  @Schema(description = "스터디 상세 설명", example = "매주 주말 온라인으로 진행하는 백엔드 스터디입니다.")
  private String description;

  @Schema(description = "진행 상태", example = "RECRUITING")
  private StudyGroupStatus status;

  @Schema(description = "최대 인원 수", example = "6")
  private Integer maxMembers;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  // Entity -> DTO 변환을 위한 정적 팩토리 메서드
  public static StudyGroupResponse from(StudyGroup studyGroup) {
    return StudyGroupResponse.builder()
        .id(studyGroup.getId())
        .name(studyGroup.getName())
        .description(studyGroup.getDescription())
        .status(studyGroup.getStatus())
        .maxMembers(studyGroup.getMaxMembers())
        .createdAt(studyGroup.getCreatedAt())
        .build();
  }
}
