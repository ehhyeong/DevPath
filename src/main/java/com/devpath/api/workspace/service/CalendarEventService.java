package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.CalendarEventResponse;
import com.devpath.api.workspace.dto.CreateCalendarEventRequest;
import com.devpath.api.workspace.dto.UpdateCalendarEventRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.CalendarEvent;
import com.devpath.domain.workspace.repository.CalendarEventRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CalendarEventService {

  private final CalendarEventRepository calendarEventRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;

  @Transactional
  public CalendarEventResponse createEvent(
      Long workspaceId, Long userId, CreateCalendarEventRequest request) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    CalendarEvent event =
        CalendarEvent.builder()
            .workspaceId(workspaceId)
            .title(request.getTitle())
            .description(request.getDescription())
            .startAt(request.getStartAt())
            .endAt(request.getEndAt())
            .createdById(userId)
            .build();

    return CalendarEventResponse.from(calendarEventRepository.save(event));
  }

  public List<CalendarEventResponse> getEvents(
      Long workspaceId, Long userId, Integer year, Integer month) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    if (year != null && month != null) {
      YearMonth ym = YearMonth.of(year, month);
      LocalDateTime from = ym.atDay(1).atStartOfDay();
      LocalDateTime to = ym.atEndOfMonth().atTime(23, 59, 59);
      return calendarEventRepository
          .findAllByWorkspaceIdAndStartAtBetweenAndIsDeletedFalseOrderByStartAtAsc(
              workspaceId, from, to)
          .stream()
          .map(CalendarEventResponse::from)
          .toList();
    }

    return calendarEventRepository
        .findAllByWorkspaceIdAndIsDeletedFalseOrderByStartAtAsc(workspaceId)
        .stream()
        .map(CalendarEventResponse::from)
        .toList();
  }

  @Transactional
  public CalendarEventResponse updateEvent(
      Long eventId, Long userId, UpdateCalendarEventRequest request) {
    CalendarEvent event = getEventEntity(eventId);
    validateMember(event.getWorkspaceId(), userId);

    event.update(
        request.getTitle(), request.getDescription(), request.getStartAt(), request.getEndAt());
    return CalendarEventResponse.from(event);
  }

  @Transactional
  public void deleteEvent(Long eventId, Long userId) {
    CalendarEvent event = getEventEntity(eventId);
    validateMember(event.getWorkspaceId(), userId);
    event.delete();
  }

  // --- 내부 헬퍼 ---

  private void validateWorkspaceExists(Long workspaceId) {
    workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateMember(Long workspaceId, Long userId) {
    if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }

  private CalendarEvent getEventEntity(Long eventId) {
    return calendarEventRepository
        .findByIdAndIsDeletedFalse(eventId)
        .orElseThrow(() -> new CustomException(ErrorCode.CALENDAR_EVENT_NOT_FOUND));
  }
}
