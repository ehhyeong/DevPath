package com.devpath.api.community.service;

import com.devpath.api.community.dto.PostRequest;
import com.devpath.api.community.dto.PostResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.community.entity.CommunityCategory;
import com.devpath.domain.community.entity.Post;
import com.devpath.domain.community.repository.PostRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor // 생성자 주입 원칙 (Lombok)
@Transactional(readOnly = true)
public class CommunityService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public PostResponse createPost(Long userId, PostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Post post = Post.builder()
                .user(user)
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        Post savedPost = postRepository.save(post);
        return PostResponse.from(savedPost);
    }

    public List<PostResponse> getPostsByCategory(CommunityCategory category) {
        return postRepository.findByCategoryAndIsDeletedFalseOrderByCreatedAtDesc(category)
                .stream()
                .map(PostResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public PostResponse getPostDetail(Long postId) {
        Post post = postRepository.findById(postId)
                // 수정: NOT_FOUND -> POST_NOT_FOUND
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));

        if (post.isDeleted()) {
            // 수정: NOT_FOUND -> POST_NOT_FOUND
            throw new CustomException(ErrorCode.POST_NOT_FOUND);
        }

        post.incrementViewCount(); // 조회수 증가 (비즈니스 메서드 사용)
        return PostResponse.from(post);
    }
}