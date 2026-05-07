package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.MeetingNote;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class MeetingNoteResponse {

    private Long noteId;
    private Long workspaceId;
    private String title;
    private String content;
    private Long createdById;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MeetingNoteResponse from(MeetingNote note) {
        return MeetingNoteResponse.builder()
                .noteId(note.getId())
                .workspaceId(note.getWorkspaceId())
                .title(note.getTitle())
                .content(note.getContent())
                .createdById(note.getCreatedById())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}