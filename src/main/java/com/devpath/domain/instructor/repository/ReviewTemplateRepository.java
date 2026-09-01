package com.devpath.domain.instructor.repository;

import com.devpath.domain.instructor.entity.ReviewTemplate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewTemplateRepository extends JpaRepository<ReviewTemplate, Long> {

  List<ReviewTemplate> findByInstructorIdAndIsDeletedFalse(Long instructorId);

  Optional<ReviewTemplate> findByIdAndIsDeletedFalse(Long id);
}
