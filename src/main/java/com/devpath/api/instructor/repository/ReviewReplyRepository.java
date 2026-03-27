package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.ReviewReply;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewReplyRepository extends JpaRepository<ReviewReply, Long> {

    Optional<ReviewReply> findByIdAndIsDeletedFalse(Long id);

    List<ReviewReply> findByReviewIdAndIsDeletedFalse(Long reviewId);
}