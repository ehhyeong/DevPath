package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.TimestampNote;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TimestampNoteResponse {

    private Long noteId;
    private Long lessonId;
    private Integer timestampSecond;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TimestampNoteResponse from(TimestampNote note) {
        return TimestampNoteResponse.builder()
                .noteId(note.getId())
                .lessonId(note.getLesson().getLessonId())
                .timestampSecond(note.getTimestampSecond())
                .content(note.getContent())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}
