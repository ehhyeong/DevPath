package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.TimestampNote;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Timestamp note response DTO")
public class TimestampNoteResponse {

    @Schema(description = "Note ID", example = "1")
    private Long noteId;

    @Schema(description = "Lesson ID", example = "10")
    private Long lessonId;

    @Schema(description = "Normalized timestamp in seconds", example = "125")
    private Integer timestampSecond;

    @Schema(description = "Seek position in seconds", example = "125")
    private Integer seekSecond;

    @Schema(description = "Display timestamp label", example = "01:02:05")
    private String timestampLabel;

    @Schema(description = "Note content", example = "Review the authentication flow again")
    private String content;

    @Schema(description = "Created timestamp", example = "2026-03-23T10:30:00")
    private LocalDateTime createdAt;

    @Schema(description = "Updated timestamp", example = "2026-03-23T10:40:00")
    private LocalDateTime updatedAt;

    public static TimestampNoteResponse from(TimestampNote note) {
        return TimestampNoteResponse.builder()
                .noteId(note.getId())
                .lessonId(note.getLesson().getLessonId())
                .timestampSecond(note.getTimestampSecond())
                .seekSecond(note.getTimestampSecond())
                .timestampLabel(toTimestampLabel(note.getTimestampSecond()))
                .content(note.getContent())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }

    private static String toTimestampLabel(Integer second) {
        int value = second == null ? 0 : Math.max(0, second);
        int hour = value / 3600;
        int minute = (value % 3600) / 60;
        int secondValue = value % 60;

        if (hour > 0) {
            return String.format("%02d:%02d:%02d", hour, minute, secondValue);
        }

        return String.format("%02d:%02d", minute, secondValue);
    }
}
