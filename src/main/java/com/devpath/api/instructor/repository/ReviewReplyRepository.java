package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.ReviewReply;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewReplyRepository extends JpaRepository<ReviewReply, Long> {

  Optional<ReviewReply> findByIdAndIsDeletedFalse(Long id);

  Optional<ReviewReply> findByReviewIdAndIsDeletedFalse(Long reviewId);

  List<ReviewReply> findAllByReviewIdInAndIsDeletedFalse(List<Long> reviewIds);
}
