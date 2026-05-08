package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorPostLike;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorPostLikeRepository extends JpaRepository<InstructorPostLike, Long> {

  Optional<InstructorPostLike> findByPostIdAndUserId(Long postId, Long userId);

  boolean existsByPostIdAndUserId(Long postId, Long userId);

  long countByPostIdIn(List<Long> postIds);
}
