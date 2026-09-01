package com.devpath.domain.instructor.repository;

import com.devpath.domain.instructor.entity.DmRoom;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DmRoomRepository extends JpaRepository<DmRoom, Long> {

  Optional<DmRoom> findByInstructorIdAndLearnerIdAndIsDeletedFalse(
      Long instructorId, Long learnerId);

  Optional<DmRoom> findByIdAndIsDeletedFalse(Long id);

  Optional<DmRoom> findByIdAndInstructorIdAndIsDeletedFalse(Long id, Long instructorId);
}
