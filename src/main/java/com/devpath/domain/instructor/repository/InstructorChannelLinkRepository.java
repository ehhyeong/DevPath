package com.devpath.domain.instructor.repository;

import com.devpath.domain.instructor.entity.InstructorChannelLink;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorChannelLinkRepository
    extends JpaRepository<InstructorChannelLink, Long> {

  List<InstructorChannelLink> findAllByInstructorIdAndIsDeletedFalseOrderBySortOrderAsc(
      Long instructorId);
}
