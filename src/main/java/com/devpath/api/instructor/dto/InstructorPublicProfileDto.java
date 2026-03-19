package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// DTOs for public instructor profile responses.
public class InstructorPublicProfileDto {

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "강사 공개 프로필 조회 응답 DTO")
  public static class ProfileResponse {

    @Schema(description = "강사 회원 ID", example = "3")
    private Long instructorId;

    @Schema(description = "강사 표시명", example = "태형의 백엔드 실험실")
    private String nickname;

    @Schema(
        description = "프로필 이미지 URL",
        example = "https://cdn.devpath.com/profile/instructor-3.png")
    private String profileImageUrl;

    @Schema(
        description = "한줄 소개",
        example = "Spring Boot와 Security를 실전 위주로 가르치는 강사입니다.")
    private String headline;

    @Schema(description = "프로필 공개 여부", example = "true")
    private Boolean isPublic;
  }
}
