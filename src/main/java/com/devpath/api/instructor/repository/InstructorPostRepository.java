package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorPost;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorPostRepository extends JpaRepository<InstructorPost, Long> {

  List<InstructorPost> findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(Long instructorId);

  List<InstructorPost> findByInstructorIdAndPostTypeAndIsDeletedFalseOrderByCreatedAtDesc(
      Long instructorId, String postType);

  List<InstructorPost> findByInstructorIdAndIsDeletedFalseOrderByLikeCountDesc(Long instructorId);

  List<InstructorPost> findByInstructorIdAndPostTypeAndIsDeletedFalseOrderByLikeCountDesc(
      Long instructorId, String postType);

  Optional<InstructorPost> findByIdAndIsDeletedFalse(Long id);

  long countByInstructorIdAndIsDeletedFalse(Long instructorId);

  long countByInstructorIdAndIsDeletedFalseAndCreatedAtAfter(
      Long instructorId, LocalDateTime after);
}
