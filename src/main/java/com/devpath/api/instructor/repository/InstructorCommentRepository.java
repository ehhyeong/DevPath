package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorCommentRepository extends JpaRepository<InstructorComment, Long> {

    List<InstructorComment> findByPostIdAndIsDeletedFalse(Long postId);

    List<InstructorComment> findByPostIdAndIsDeletedFalseOrderByCreatedAtAsc(Long postId);

    List<InstructorComment> findAllByParentCommentIdAndIsDeletedFalse(Long parentCommentId);

    List<InstructorComment> findAllByPostIdInAndIsDeletedFalse(List<Long> postIds);

    Optional<InstructorComment> findByIdAndIsDeletedFalse(Long id);

    long countByPostIdInAndIsDeletedFalse(List<Long> postIds);
}
