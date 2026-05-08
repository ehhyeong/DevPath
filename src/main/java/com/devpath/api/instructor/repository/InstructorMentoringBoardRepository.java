package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorMentoringBoard;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorMentoringBoardRepository
    extends JpaRepository<InstructorMentoringBoard, Long> {

  Optional<InstructorMentoringBoard> findByInstructorId(Long instructorId);
}
