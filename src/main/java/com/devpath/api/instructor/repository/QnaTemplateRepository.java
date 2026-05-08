package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.QnaTemplate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QnaTemplateRepository extends JpaRepository<QnaTemplate, Long> {

  List<QnaTemplate> findByInstructorIdAndIsDeletedFalse(Long instructorId);

  Optional<QnaTemplate> findByIdAndIsDeletedFalse(Long id);
}
