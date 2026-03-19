package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// DTOs for the public instructor channel response.
public class InstructorChannelDto {

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "강사 채널 상세 조회 응답 DTO")
  public static class ChannelResponse {

    @Schema(description = "강사 프로필 요약 정보")
    private InstructorPublicProfileDto.ProfileResponse profile;

    @Schema(
        description = "강사 채널 소개",
        example = "Spring Boot와 Security를 실전 중심으로 가르치는 강사입니다.")
    private String intro;

    @Schema(description = "강사 전문분야 목록")
    private List<String> specialties;

    @Schema(description = "강사 외부 링크 정보")
    private ExternalLinks externalLinks;

    @Schema(description = "대표 강의 목록")
    private List<FeaturedCourseItem> featuredCourses;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "강사 외부 링크 응답 DTO")
  public static class ExternalLinks {

    @Schema(description = "GitHub 링크", example = "https://github.com/taehyung")
    private String githubUrl;

    @Schema(description = "블로그 링크", example = "https://devlog.example.com")
    private String blogUrl;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "강사 대표 강의 응답 DTO")
  public static class FeaturedCourseItem {

    @Schema(description = "강의 ID", example = "12")
    private Long courseId;

    @Schema(description = "강의 제목", example = "Spring Security 완전 정복")
    private String title;

    @Schema(
        description = "강의 부제목",
        example = "JWT, OAuth2, SecurityFilterChain 실전 가이드")
    private String subtitle;

    @Schema(
        description = "강의 썸네일 URL",
        example = "https://cdn.devpath.com/course/12/thumbnail.png")
    private String thumbnailUrl;
  }
}
