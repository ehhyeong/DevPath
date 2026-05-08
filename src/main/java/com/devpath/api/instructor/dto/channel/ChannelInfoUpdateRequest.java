package com.devpath.api.instructor.dto.channel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강사 채널 정보 수정 요청")
public class ChannelInfoUpdateRequest {

  @NotBlank
  @Schema(description = "채널명", example = "태형의 백엔드 연구소")
  private String channelName;

  @Schema(description = "채널 설명", example = "실전 백엔드 개발과 아키텍처 중심 강의 채널입니다.")
  private String channelDescription;

  @Size(max = 4)
  @Schema(description = "대표 강의 ID 목록", example = "[101, 102, 103]")
  private List<Long> featuredCourseIds;
}
