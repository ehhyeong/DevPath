package com.devpath.api.workspace.notice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "공지사항 수정 요청 DTO")
public class NoticeUpdateRequest {

  @NotBlank(message = "제목은 필수 입력값입니다.")
  @Size(max = 200, message = "제목은 200자를 초과할 수 없습니다.")
  @Schema(description = "수정할 공지 제목", example = "[수정] 워크스페이스 정기 점검 안내")
  private String title;

  @NotBlank(message = "내용은 필수 입력값입니다.")
  @Schema(description = "수정할 공지 내용", example = "점검 시간이 1시간 단축되어 오전 1시에 완료됩니다.")
  private String content;

  public NoticeUpdateRequest(String title, String content) {
    this.title = title;
    this.content = content;
  }
}
