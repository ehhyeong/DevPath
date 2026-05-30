package com.devpath.api.application.dto;

import com.devpath.domain.application.entity.LoungeApplication;
import com.devpath.domain.application.entity.LoungeApplicationStatus;
import com.devpath.domain.application.entity.LoungeApplicationType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public class LoungeApplicationResponse {

  private LoungeApplicationResponse() {}

  @Schema(name = "LoungeApplicationSummaryResponse")
  public record Summary(
      @Schema(description = "Application ID", example = "1") Long applicationId,
      @Schema(description = "Application type", example = "SQUAD_APPLICATION")
          LoungeApplicationType type,
      @Schema(description = "Target ID", example = "1") Long targetId,
      @Schema(description = "Target title", example = "DevPath backend squad") String targetTitle,
      @Schema(description = "Sender user ID", example = "2") Long senderId,
      @Schema(description = "Sender name", example = "Learner") String senderName,
      @Schema(description = "Sender profile image") String senderProfileImage,
      @Schema(description = "Receiver user ID", example = "1") Long receiverId,
      @Schema(description = "Receiver name", example = "Leader") String receiverName,
      @Schema(description = "Receiver profile image") String receiverProfileImage,
      @Schema(description = "Application title", example = "I want to join.") String title,
      @Schema(description = "Application status", example = "PENDING")
          LoungeApplicationStatus status,
      @Schema(description = "Created datetime", example = "2026-05-03T14:00:00")
          LocalDateTime createdAt) {

    public static Summary from(LoungeApplication application) {
      return from(application, null, null);
    }

    public static Summary from(
        LoungeApplication application, String senderProfileImage, String receiverProfileImage) {
      return new Summary(
          application.getId(),
          application.getType(),
          application.getTargetId(),
          application.getTargetTitle(),
          application.getSender().getId(),
          application.getSender().getName(),
          senderProfileImage,
          application.getReceiver().getId(),
          application.getReceiver().getName(),
          receiverProfileImage,
          application.getTitle(),
          application.getStatus(),
          application.getCreatedAt());
    }
  }

  @Schema(name = "LoungeApplicationDetailResponse")
  public record Detail(
      @Schema(description = "Application ID", example = "1") Long applicationId,
      @Schema(description = "Application type", example = "SQUAD_APPLICATION")
          LoungeApplicationType type,
      @Schema(description = "Target ID", example = "1") Long targetId,
      @Schema(description = "Target title", example = "DevPath backend squad") String targetTitle,
      @Schema(description = "Sender user ID", example = "2") Long senderId,
      @Schema(description = "Sender name", example = "Learner") String senderName,
      @Schema(description = "Sender profile image") String senderProfileImage,
      @Schema(description = "Receiver user ID", example = "1") Long receiverId,
      @Schema(description = "Receiver name", example = "Leader") String receiverName,
      @Schema(description = "Receiver profile image") String receiverProfileImage,
      @Schema(description = "Application title", example = "I want to join.") String title,
      @Schema(description = "Application content", example = "I can handle backend work.")
          String content,
      @Schema(description = "Application status", example = "APPROVED")
          LoungeApplicationStatus status,
      @Schema(description = "Reject reason") String rejectReason,
      @Schema(description = "Processed datetime", example = "2026-05-03T15:00:00")
          LocalDateTime processedAt,
      @Schema(description = "Created datetime", example = "2026-05-03T14:00:00")
          LocalDateTime createdAt,
      @Schema(description = "Updated datetime", example = "2026-05-03T15:00:00")
          LocalDateTime updatedAt) {

    public static Detail from(LoungeApplication application) {
      return from(application, null, null);
    }

    public static Detail from(
        LoungeApplication application, String senderProfileImage, String receiverProfileImage) {
      return new Detail(
          application.getId(),
          application.getType(),
          application.getTargetId(),
          application.getTargetTitle(),
          application.getSender().getId(),
          application.getSender().getName(),
          senderProfileImage,
          application.getReceiver().getId(),
          application.getReceiver().getName(),
          receiverProfileImage,
          application.getTitle(),
          application.getContent(),
          application.getStatus(),
          application.getRejectReason(),
          application.getProcessedAt(),
          application.getCreatedAt(),
          application.getUpdatedAt());
    }
  }

  @Schema(name = "LoungeApplicationStatusResponse")
  public record Status(
      @Schema(description = "Application ID", example = "1") Long applicationId,
      @Schema(description = "Application status", example = "PENDING")
          LoungeApplicationStatus status,
      @Schema(description = "Reject reason") String rejectReason,
      @Schema(description = "Processed datetime", example = "2026-05-03T15:00:00")
          LocalDateTime processedAt) {

    public static Status from(LoungeApplication application) {
      return new Status(
          application.getId(),
          application.getStatus(),
          application.getRejectReason(),
          application.getProcessedAt());
    }
  }
}
