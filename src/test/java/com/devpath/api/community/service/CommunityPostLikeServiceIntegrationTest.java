package com.devpath.api.community.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.community.dto.PostLikeResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.community.entity.CommunityCategory;
import com.devpath.domain.community.entity.Post;
import com.devpath.domain.community.repository.CommunityPostLikeRepository;
import com.devpath.domain.community.repository.PostRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import(CommunityPostLikeService.class)
class CommunityPostLikeServiceIntegrationTest {

  @Autowired private CommunityPostLikeService communityPostLikeService;

  @Autowired private CommunityPostLikeRepository communityPostLikeRepository;

  @Autowired private PostRepository postRepository;

  @Autowired private UserRepository userRepository;

  @Autowired private EntityManager entityManager;

  @Test
  @DisplayName("게시글 좋아요와 취소에 성공한다")
  void likeAndUnlikeSuccess() {
    User postAuthor = saveUser("community-like-post-owner@devpath.com");
    User liker = saveUser("community-like-user@devpath.com");
    Post post = savePost(postAuthor, "좋아요 테스트 글", LocalDateTime.of(2026, 3, 20, 8, 0));

    PostLikeResponse likeResponse = communityPostLikeService.likePost(liker.getId(), post.getId());
    flushAndClear();

    assertThat(likeResponse.getPostId()).isEqualTo(post.getId());
    assertThat(likeResponse.getLikeCount()).isEqualTo(1);
    assertThat(likeResponse.isLiked()).isTrue();
    assertThat(communityPostLikeRepository.existsByPostIdAndUserId(post.getId(), liker.getId()))
        .isTrue();
    assertThat(postRepository.findById(post.getId()))
        .get()
        .extracting(Post::getLikeCount)
        .isEqualTo(1);

    PostLikeResponse unlikeResponse =
        communityPostLikeService.unlikePost(liker.getId(), post.getId());
    flushAndClear();

    assertThat(unlikeResponse.getLikeCount()).isZero();
    assertThat(unlikeResponse.isLiked()).isFalse();
    assertThat(communityPostLikeRepository.findByPostIdAndUserId(post.getId(), liker.getId()))
        .isEmpty();
    assertThat(postRepository.findById(post.getId()))
        .get()
        .extracting(Post::getLikeCount)
        .isEqualTo(0);
  }

  @Test
  @DisplayName("이미 좋아요한 게시글은 중복 좋아요할 수 없다")
  void likeFailsWhenAlreadyExists() {
    User postAuthor = saveUser("community-like-duplicate-owner@devpath.com");
    User liker = saveUser("community-like-duplicate-user@devpath.com");
    Post post = savePost(postAuthor, "중복 좋아요 테스트 글", LocalDateTime.of(2026, 3, 20, 8, 0));

    communityPostLikeService.likePost(liker.getId(), post.getId());

    assertThatThrownBy(() -> communityPostLikeService.likePost(liker.getId(), post.getId()))
        .isInstanceOf(CustomException.class)
        .extracting(throwable -> ((CustomException) throwable).getErrorCode())
        .isEqualTo(ErrorCode.ALREADY_EXISTS);
  }

  @Test
  @DisplayName("좋아요가 없는 상태에서 취소해도 likeCount는 음수가 되지 않는다")
  void unlikeWithoutExistingLikeDoesNotMakeNegativeCount() {
    User postAuthor = saveUser("community-unlike-post-owner@devpath.com");
    User liker = saveUser("community-unlike-user@devpath.com");
    Post post = savePost(postAuthor, "좋아요 취소만 테스트", LocalDateTime.of(2026, 3, 20, 8, 0));
    flushAndClear();

    PostLikeResponse response = communityPostLikeService.unlikePost(liker.getId(), post.getId());
    flushAndClear();

    assertThat(response.getLikeCount()).isZero();
    assertThat(response.isLiked()).isFalse();
    assertThat(communityPostLikeRepository.findByPostIdAndUserId(post.getId(), liker.getId()))
        .isEmpty();
    assertThat(postRepository.findById(post.getId()))
        .get()
        .extracting(Post::getLikeCount)
        .isEqualTo(0);
  }

  private User saveUser(String email) {
    return userRepository.save(
        User.builder()
            .email(email)
            .password("encoded-password")
            .name(email)
            .role(UserRole.ROLE_LEARNER)
            .build());
  }

  private Post savePost(User user, String title, LocalDateTime createdAt) {
    Post post =
        Post.builder()
            .user(user)
            .category(CommunityCategory.TECH_SHARE)
            .title(title)
            .content(title + " content")
            .build();

    ReflectionTestUtils.setField(post, "createdAt", createdAt);
    ReflectionTestUtils.setField(post, "updatedAt", createdAt);

    return postRepository.save(post);
  }

  private void flushAndClear() {
    entityManager.flush();
    entityManager.clear();
  }
}
