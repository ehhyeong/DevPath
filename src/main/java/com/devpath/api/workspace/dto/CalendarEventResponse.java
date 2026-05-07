package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.CalendarEvent;
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
public class CalendarEventResponse {

    private Long eventId;
    private Long workspaceId;
    private String title;
    private String description;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Long createdById;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CalendarEventResponse from(CalendarEvent event) {
        return CalendarEventResponse.builder()
                .eventId(event.getId())
                .workspaceId(event.getWorkspaceId())
                .title(event.getTitle())
                .description(event.getDescription())
                .startAt(event.getStartAt())
                .endAt(event.getEndAt())
                .createdById(event.getCreatedById())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .build();
    }
}