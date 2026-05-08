package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.MeetingNote;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingNoteRepository extends JpaRepository<MeetingNote, Long> {

  List<MeetingNote> findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(Long workspaceId);
}
