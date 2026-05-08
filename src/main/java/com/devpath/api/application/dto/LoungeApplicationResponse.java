package com.devpath.api.application.dto;

import com.devpath.domain.application.entity.LoungeApplication;
import com.devpath.domain.application.entity.LoungeApplicationStatus;
import com.devpath.domain.application.entity.LoungeApplicationType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class LoungeApplicationResponse {

  private LoungeApplicationResponse() {}

  @Schema(name = "LoungeApplicationSummaryResponse", description = "라운지 신청서/제안서 목록 응답")
  public record Summary(
      @Schema(description = "라운지 신청 ID", example = "1") Long applicationId,
      @Schema(description = "신청 타입", example = "SQUAD_APPLICATION") LoungeApplicationType type,
      @Schema(description = "대상 ID", example = "1") Long targetId,
      @Schema(description = "대상 제목", example = "DevPath 백엔드 스쿼드") String targetTitle,
      @Schema(description = "보낸 사용자 ID", example = "2") Long senderId,
      @Schema(description = "보낸 사용자 이름", example = "이학습") String senderName,
      @Schema(description = "받는 사용자 ID", example = "1") Long receiverId,
      @Schema(description = "받는 사용자 이름", example = "김리더") String receiverName,
      @Schema(description = "신청 제목", example = "백엔드 역할로 스쿼드에 지원합니다.") String title,
      @Schema(description = "신청 상태", example = "PENDING") LoungeApplicationStatus status,
      @Schema(description = "생성일시", example = "2026-05-03T14:00:00") LocalDateTime createdAt) {

    // 보낸 신청/받은 요청 목록에 필요한 요약 정보를 DTO로 변환한다.
    public static Summary from(LoungeApplication application) {
      return new Summary(
          application.getId(),
          application.getType(),
          application.getTargetId(),
          application.getTargetTitle(),
          application.getSender().getId(),
          application.getSender().getName(),
          application.getReceiver().getId(),
          application.getReceiver().getName(),
          application.getTitle(),
          application.getStatus(),
          application.getCreatedAt());
    }
  }

  @Schema(name = "LoungeApplicationDetailResponse", description = "라운지 신청서/제안서 상세 응답")
  public record Detail(
      @Schema(description = "라운지 신청 ID", example = "1") Long applicationId,
      @Schema(description = "신청 타입", example = "SQUAD_APPLICATION") LoungeApplicationType type,
      @Schema(description = "대상 ID", example = "1") Long targetId,
      @Schema(description = "대상 제목", example = "DevPath 백엔드 스쿼드") String targetTitle,
      @Schema(description = "보낸 사용자 ID", example = "2") Long senderId,
      @Schema(description = "보낸 사용자 이름", example = "이학습") String senderName,
      @Schema(description = "받는 사용자 ID", example = "1") Long receiverId,
      @Schema(description = "받는 사용자 이름", example = "김리더") String receiverName,
      @Schema(description = "신청 제목", example = "백엔드 역할로 스쿼드에 지원합니다.") String title,
      @Schema(description = "신청 내용", example = "Spring Boot와 JPA 작업 경험이 있어 백엔드 역할로 참여하고 싶습니다.")
          String content,
      @Schema(description = "신청 상태", example = "APPROVED") LoungeApplicationStatus status,
      @Schema(description = "거절 사유", example = "현재 백엔드 포지션이 마감되었습니다.") String rejectReason,
      @Schema(description = "처리일시", example = "2026-05-03T15:00:00") LocalDateTime processedAt,
      @Schema(description = "생성일시", example = "2026-05-03T14:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-03T15:00:00") LocalDateTime updatedAt) {

    // 단건 조회, 승인, 거절 응답에 필요한 상세 정보를 DTO로 변환한다.
    public static Detail from(LoungeApplication application) {
      return new Detail(
          application.getId(),
          application.getType(),
          application.getTargetId(),
          application.getTargetTitle(),
          application.getSender().getId(),
          application.getSender().getName(),
          application.getReceiver().getId(),
          application.getReceiver().getName(),
          application.getTitle(),
          application.getContent(),
          application.getStatus(),
          application.getRejectReason(),
          application.getProcessedAt(),
          application.getCreatedAt(),
          application.getUpdatedAt());
    }
  }

  @Schema(name = "LoungeApplicationStatusResponse", description = "라운지 신청 상태 응답")
  public record Status(
      @Schema(description = "라운지 신청 ID", example = "1") Long applicationId,
      @Schema(description = "신청 상태", example = "PENDING") LoungeApplicationStatus status,
      @Schema(description = "거절 사유", example = "현재 백엔드 포지션이 마감되었습니다.") String rejectReason,
      @Schema(description = "처리일시", example = "2026-05-03T15:00:00") LocalDateTime processedAt) {

    // 지원 상태 추적 API에 필요한 최소 정보를 DTO로 변환한다.
    public static Status from(LoungeApplication application) {
      return new Status(
          application.getId(),
          application.getStatus(),
          application.getRejectReason(),
          application.getProcessedAt());
    }
  }
}
