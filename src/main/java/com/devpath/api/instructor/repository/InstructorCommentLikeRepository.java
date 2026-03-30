package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorCommentLike;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorCommentLikeRepository extends JpaRepository<InstructorCommentLike, Long> {

    Optional<InstructorCommentLike> findByCommentIdAndUserId(Long commentId, Long userId);

    boolean existsByCommentIdAndUserId(Long commentId, Long userId);

    long countByCommentIdIn(List<Long> commentIds);
}
