package com.devpath.api.workspace.notice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "공지사항 생성 요청 DTO")
public class NoticeCreateRequest {

  @NotBlank(message = "제목은 필수 입력값입니다.")
  @Size(max = 200, message = "제목은 200자를 초과할 수 없습니다.")
  @Schema(description = "공지 제목", example = "워크스페이스 정기 점검 안내")
  private String title;

  @NotBlank(message = "내용은 필수 입력값입니다.")
  @Schema(description = "공지 내용", example = "이번 주 금요일 자정부터 2시간 동안 서버 점검이 있습니다.")
  private String content;

  public NoticeCreateRequest(String title, String content) {
    this.title = title;
    this.content = content;
  }
}
