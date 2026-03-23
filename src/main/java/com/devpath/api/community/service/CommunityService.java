package com.devpath.api.community.service;

import com.devpath.api.community.dto.MyPostResponse;
import com.devpath.api.community.dto.PostPageResponse;
import com.devpath.api.community.dto.PostRequest;
import com.devpath.api.community.dto.PostResponse;
import com.devpath.api.community.dto.PostUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.community.entity.CommunityCategory;
import com.devpath.domain.community.entity.Post;
import com.devpath.domain.community.repository.PostRepository;
import com.devpath.domain.community.specification.PostSpecification;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public PostResponse createPost(Long userId, PostRequest request) {
        User user = getUser(userId);

        Post post = Post.builder()
                .user(user)
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        Post savedPost = postRepository.save(post);
        return PostResponse.from(savedPost);
    }

    // 게시글 목록을 동적 필터 + 페이지네이션 + 정렬 조건으로 조회한다.
    public PostPageResponse searchPosts(
            CommunityCategory category,
            Long authorId,
            String keyword,
            String sort,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size, resolveSort(sort));

        Page<Post> postPage = postRepository.findAll(
                PostSpecification.search(category, authorId, keyword),
                pageable
        );

        List<PostResponse> content = postPage.getContent()
                .stream()
                .map(PostResponse::from)
                .toList();

        return PostPageResponse.of(
                content,
                postPage.getNumber(),
                postPage.getSize(),
                postPage.getTotalElements(),
                postPage.getTotalPages(),
                postPage.hasNext()
        );
    }

    @Transactional
    public PostResponse getPostDetail(Long postId) {
        Post post = getActivePost(postId);

        post.incrementViewCount();

        return PostResponse.from(post);
    }

    @Transactional
    public PostResponse updatePost(Long userId, Long postId, PostUpdateRequest request) {
        Post post = getActivePost(postId);

        validatePostOwner(userId, post);

        post.updatePost(
                request.getTitle(),
                request.getContent(),
                request.getCategory()
        );

        return PostResponse.from(post);
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {
        Post post = getActivePost(postId);

        validatePostOwner(userId, post);

        post.deletePost();
    }

    public List<MyPostResponse> getMyPosts(Long userId) {
        getUser(userId);

        return postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(MyPostResponse::from)
                .toList();
    }

    // 정렬 조건 문자열을 실제 Sort 객체로 변환한다.
    private Sort resolveSort(String sort) {
        String normalizedSort = sort == null ? "latest" : sort.trim();

        return switch (normalizedSort) {
            case "latest" -> Sort.by(Sort.Order.desc("createdAt"));
            case "popular" -> Sort.by(
                    Sort.Order.desc("likeCount"),
                    Sort.Order.desc("createdAt")
            );
            case "mostViewed" -> Sort.by(
                    Sort.Order.desc("viewCount"),
                    Sort.Order.desc("createdAt")
            );
            default -> throw new CustomException(
                    ErrorCode.INVALID_INPUT,
                    "정렬 기준은 latest, popular, mostViewed 중 하나여야 합니다."
            );
        };
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Post getActivePost(Long postId) {
        return postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
    }

    private void validatePostOwner(Long userId, Post post) {
        if (!post.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
    }
}
