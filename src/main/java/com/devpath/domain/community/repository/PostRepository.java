package com.devpath.domain.community.repository;

import com.devpath.domain.community.entity.CommunityCategory;
import com.devpath.domain.community.entity.Post;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {

    List<Post> findByCategoryAndIsDeletedFalseOrderByCreatedAtDesc(CommunityCategory category);

    Optional<Post> findByIdAndIsDeletedFalse(Long postId);

    List<Post> findAllByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long userId);
}
