package com.devpath.domain.community.repository;

import com.devpath.domain.community.entity.CommunityPostLike;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityPostLikeRepository extends JpaRepository<CommunityPostLike, Long> {

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    Optional<CommunityPostLike> findByPostIdAndUserId(Long postId, Long userId);
}
