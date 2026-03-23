package com.devpath.api.community.service;

import com.devpath.api.community.dto.PostLikeResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.community.entity.CommunityPostLike;
import com.devpath.domain.community.entity.Post;
import com.devpath.domain.community.repository.CommunityPostLikeRepository;
import com.devpath.domain.community.repository.PostRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityPostLikeService {

    private final CommunityPostLikeRepository communityPostLikeRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public PostLikeResponse likePost(Long userId, Long postId) {
        User user = getUser(userId);
        Post post = getActivePost(postId);

        if (communityPostLikeRepository.existsByPostIdAndUserId(postId, userId)) {
            throw new CustomException(ErrorCode.ALREADY_EXISTS, "이미 좋아요를 누른 게시글입니다.");
        }

        CommunityPostLike communityPostLike = CommunityPostLike.builder()
                .post(post)
                .user(user)
                .build();

        communityPostLikeRepository.save(communityPostLike);
        post.incrementLikeCount();

        return PostLikeResponse.of(post.getId(), post.getLikeCount(), true);
    }

    @Transactional
    public PostLikeResponse unlikePost(Long userId, Long postId) {
        getUser(userId);
        Post post = getActivePost(postId);

        CommunityPostLike communityPostLike = communityPostLikeRepository.findByPostIdAndUserId(postId, userId)
                .orElse(null);

        if (communityPostLike == null) {
            return PostLikeResponse.of(post.getId(), post.getLikeCount(), false);
        }

        communityPostLikeRepository.delete(communityPostLike);
        post.decrementLikeCount();

        return PostLikeResponse.of(post.getId(), post.getLikeCount(), false);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Post getActivePost(Long postId) {
        return postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
    }
}
