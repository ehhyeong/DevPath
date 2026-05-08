package com.devpath.api.admin.dto.notice;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "공지 등록/수정 요청")
public class NoticeCreateRequest {

  @NotBlank(message = "공지 제목은 비어 있을 수 없습니다.")
  @Schema(description = "공지 제목", example = "4월 1일 정기 점검 안내")
  private String title;

  @NotBlank(message = "공지 내용은 비어 있을 수 없습니다.")
  @Schema(description = "공지 본문", example = "4월 1일 02:00부터 03:00까지 정기 점검이 진행됩니다.")
  private String content;

  @Schema(description = "상단 고정 여부", example = "true")
  private Boolean isPinned = false;
}
