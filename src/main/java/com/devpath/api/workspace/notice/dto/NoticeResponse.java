package com.devpath.api.workspace.notice.dto;

import com.devpath.domain.operation.notice.WorkspaceNotice;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "공지사항 응답 DTO")
public class NoticeResponse {

  @Schema(description = "공지 ID", example = "1")
  private Long id;

  @Schema(description = "워크스페이스 ID", example = "1")
  private Long workspaceId;

  @Schema(description = "제목", example = "워크스페이스 정기 점검 안내")
  private String title;

  @Schema(description = "내용", example = "이번 주 금요일 자정부터 2시간 동안 서버 점검이 있습니다.")
  private String content;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  @Schema(description = "수정 일시")
  private LocalDateTime updatedAt;

  // Entity -> DTO 변환 팩토리 메서드
  public static NoticeResponse from(WorkspaceNotice notice) {
    return NoticeResponse.builder()
        .id(notice.getId())
        .workspaceId(notice.getWorkspaceId())
        .title(notice.getTitle())
        .content(notice.getContent())
        .createdAt(notice.getCreatedAt())
        .updatedAt(notice.getUpdatedAt())
        .build();
  }
}
