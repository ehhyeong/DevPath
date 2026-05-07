package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.CalendarEvent;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    Optional<CalendarEvent> findByIdAndIsDeletedFalse(Long id);

    List<CalendarEvent> findAllByWorkspaceIdAndIsDeletedFalseOrderByStartAtAsc(Long workspaceId);

    List<CalendarEvent> findAllByWorkspaceIdAndStartAtBetweenAndIsDeletedFalseOrderByStartAtAsc(
            Long workspaceId, LocalDateTime from, LocalDateTime to);
}