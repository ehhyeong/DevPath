package com.devpath.api.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * AI 비서의 변경 제안 한 건. 제안 응답으로 내려가고, 팀원이 실행을 확인하면 그대로 실행 요청으로 돌아온다. 서버는 실행 시점에 다시 검증하므로 클라이언트가 보낸
 * 값을 그대로 믿지 않는다.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Schema(description = "워크스페이스 AI 변경 제안")
public class WorkspaceAiAction {

  @Schema(description = "변경 종류", example = "TASK_CREATE")
  @NotNull(message = "변경 종류는 필수입니다.")
  private WorkspaceAiActionType type;

  @Schema(description = "수정·삭제 대상 ID (작업·일정·마일스톤·회의록)", example = "12")
  private Long targetId;

  @Schema(description = "제목", example = "로그인 API 구현")
  @Size(max = 255, message = "제목은 255자 이하여야 합니다.")
  private String title;

  @Schema(description = "설명. ERD 수정이면 변경 요약", example = "JWT 발급까지 포함")
  @Size(max = 2000, message = "설명은 2000자 이하여야 합니다.")
  private String description;

  @Schema(description = "본문 (회의록 본문, ERD mermaid 전체, API 명세 전체)")
  @Size(max = 50000, message = "본문은 50000자 이하여야 합니다.")
  private String content;

  @Schema(description = "작업 우선순위", example = "HIGH", allowableValues = "LOW,MEDIUM,HIGH")
  private String priority;

  @Schema(description = "작업 또는 마일스톤 상태", example = "IN_PROGRESS")
  private String status;

  @Schema(description = "작업 담당자 ID", example = "5")
  private Long assigneeId;

  @Schema(description = "작업·마일스톤 마감일", example = "2026-10-10")
  private LocalDate dueDate;

  @Schema(description = "마일스톤 시작일", example = "2026-10-01")
  private LocalDate startDate;

  @Schema(description = "일정 시작 시각", example = "2026-10-10T14:00:00")
  private LocalDateTime startAt;

  @Schema(description = "일정 종료 시각", example = "2026-10-10T15:00:00")
  private LocalDateTime endAt;

  @Schema(description = "ERD 편집기 스키마 JSON. ERD 수정 실행 시 클라이언트가 mermaid에서 변환해 채운다.")
  @Size(max = 50000, message = "schemaJson은 50000자 이하여야 합니다.")
  private String schemaJson;

  @Schema(description = "팀원에게 보여줄 변경 미리보기 (서버가 생성)", example = "작업 추가: 로그인 API 구현 · 담당 김민수")
  private String summary;
}