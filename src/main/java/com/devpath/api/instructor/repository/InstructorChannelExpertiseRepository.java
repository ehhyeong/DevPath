package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorChannelExpertise;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorChannelExpertiseRepository
    extends JpaRepository<InstructorChannelExpertise, Long> {

  List<InstructorChannelExpertise> findAllByInstructorIdAndIsDeletedFalseOrderBySortOrderAsc(
      Long instructorId);
}
