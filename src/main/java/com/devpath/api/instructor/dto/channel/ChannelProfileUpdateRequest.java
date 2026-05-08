package com.devpath.api.instructor.dto.channel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사 프로필 수정 요청")
public class ChannelProfileUpdateRequest {

  @Schema(description = "강사 소개글", example = "Spring Boot와 JPA를 중심으로 백엔드 강의를 진행합니다.")
  private String introduction;

  @Schema(
      description = "프로필 이미지 URL",
      example = "https://cdn.devpath.com/profiles/instructor-1.png")
  private String profileImageUrl;

  @Schema(description = "전문분야 목록", example = "[\"Spring Boot\", \"JPA\", \"PostgreSQL\"]")
  private List<String> expertiseList;

  @Schema(
      description = "외부 링크 목록",
      example = "[\"https://github.com/devpath\", \"https://velog.io/@devpath\"]")
  private List<String> externalLinks;
}
