package com.devpath.domain.community.repository;

import com.devpath.domain.community.entity.Comment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Optional<Comment> findByIdAndIsDeletedFalse(Long commentId);

    List<Comment> findAllByPostIdAndIsDeletedFalseOrderByCreatedAtAsc(Long postId);

    List<Comment> findAllByParentCommentIdAndIsDeletedFalseOrderByCreatedAtAsc(Long parentCommentId);
}
