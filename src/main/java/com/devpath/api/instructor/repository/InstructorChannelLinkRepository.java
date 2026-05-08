package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorChannelLink;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorChannelLinkRepository
    extends JpaRepository<InstructorChannelLink, Long> {

  List<InstructorChannelLink> findAllByInstructorIdAndIsDeletedFalseOrderBySortOrderAsc(
      Long instructorId);
}
