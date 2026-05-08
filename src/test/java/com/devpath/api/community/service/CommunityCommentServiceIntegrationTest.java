package com.devpath.api.community.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.community.dto.CommentCreateRequest;
import com.devpath.api.community.dto.CommentResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.community.entity.Comment;
import com.devpath.domain.community.entity.CommunityCategory;
import com.devpath.domain.community.entity.Post;
import com.devpath.domain.community.repository.CommentRepository;
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
@Import(CommunityCommentService.class)
class CommunityCommentServiceIntegrationTest {

  @Autowired private CommunityCommentService communityCommentService;

  @Autowired private CommentRepository commentRepository;

  @Autowired private PostRepository postRepository;

  @Autowired private UserRepository userRepository;

  @Autowired private EntityManager entityManager;

  @Test
  @DisplayName("댓글과 대댓글을 등록하고 트리로 조회한다")
  void createCommentAndReplySuccess() {
    User postAuthor = saveUser("community-comment-post-owner@devpath.com");
    User commentAuthor = saveUser("community-comment-author@devpath.com");
    User replyAuthor = saveUser("community-reply-author@devpath.com");
    Post post = savePost(postAuthor, "댓글 테스트 게시글", LocalDateTime.of(2026, 3, 20, 9, 0));

    CommentResponse comment =
        communityCommentService.createComment(
            commentAuthor.getId(), post.getId(), commentCreateRequest("첫 번째 댓글입니다."));
    CommentResponse reply =
        communityCommentService.createReply(
            replyAuthor.getId(),
            post.getId(),
            comment.getId(),
            commentCreateRequest("좋은 포인트네요. 대댓글입니다."));
    flushAndClear();

    var comments = communityCommentService.getComments(post.getId());

    assertThat(reply.isReply()).isTrue();
    assertThat(reply.getParentCommentId()).isEqualTo(comment.getId());
    assertThat(comments).hasSize(1);
    assertThat(comments.get(0).getId()).isEqualTo(comment.getId());
    assertThat(comments.get(0).isReply()).isFalse();
    assertThat(comments.get(0).getChildren()).hasSize(1);
    assertThat(comments.get(0).getChildren().get(0).getId()).isEqualTo(reply.getId());
    assertThat(comments.get(0).getChildren().get(0).getParentCommentId())
        .isEqualTo(comment.getId());
  }

  @Test
  @DisplayName("다른 게시글의 댓글에는 대댓글을 달 수 없다")
  void createReplyFailsWhenCommentBelongsToDifferentPost() {
    User postAuthor = saveUser("community-different-post-owner@devpath.com");
    User commentAuthor = saveUser("community-different-comment-author@devpath.com");
    Post firstPost = savePost(postAuthor, "첫 번째 글", LocalDateTime.of(2026, 3, 20, 9, 0));
    Post secondPost = savePost(postAuthor, "두 번째 글", LocalDateTime.of(2026, 3, 20, 10, 0));

    CommentResponse comment =
        communityCommentService.createComment(
            commentAuthor.getId(), firstPost.getId(), commentCreateRequest("첫 번째 글의 댓글입니다."));

    assertThatThrownBy(
            () ->
                communityCommentService.createReply(
                    postAuthor.getId(),
                    secondPost.getId(),
                    comment.getId(),
                    commentCreateRequest("잘못된 게시글에 대댓글을 시도합니다.")))
        .isInstanceOf(CustomException.class)
        .extracting(throwable -> ((CustomException) throwable).getErrorCode())
        .isEqualTo(ErrorCode.INVALID_INPUT);
  }

  @Test
  @DisplayName("댓글 삭제 시 하위 대댓글까지 soft delete 된다")
  void deleteCommentSoftDeletesChildren() {
    User postAuthor = saveUser("community-delete-post-owner@devpath.com");
    User commentAuthor = saveUser("community-delete-comment-owner@devpath.com");
    User replyAuthor = saveUser("community-delete-reply-owner@devpath.com");
    Post post = savePost(postAuthor, "삭제 테스트 글", LocalDateTime.of(2026, 3, 21, 9, 0));
    Comment rootComment =
        saveComment(post, commentAuthor, null, "삭제 대상 루트 댓글", LocalDateTime.of(2026, 3, 21, 9, 10));
    Comment childComment =
        saveComment(
            post, replyAuthor, rootComment, "삭제 대상 대댓글", LocalDateTime.of(2026, 3, 21, 9, 20));
    flushAndClear();

    communityCommentService.deleteComment(commentAuthor.getId(), rootComment.getId());
    flushAndClear();

    assertThat(commentRepository.findByIdAndIsDeletedFalse(rootComment.getId())).isEmpty();
    assertThat(commentRepository.findByIdAndIsDeletedFalse(childComment.getId())).isEmpty();
    assertThat(communityCommentService.getComments(post.getId())).isEmpty();
  }

  @Test
  @DisplayName("작성자가 아니면 댓글을 삭제할 수 없다")
  void deleteCommentFailsWhenNotOwner() {
    User postAuthor = saveUser("community-comment-post-author@devpath.com");
    User commentAuthor = saveUser("community-real-comment-owner@devpath.com");
    User intruder = saveUser("community-comment-intruder@devpath.com");
    Post post = savePost(postAuthor, "권한 테스트 글", LocalDateTime.of(2026, 3, 22, 9, 0));
    Comment comment =
        saveComment(
            post, commentAuthor, null, "작성자만 삭제할 수 있어야 합니다.", LocalDateTime.of(2026, 3, 22, 9, 10));

    assertThatThrownBy(
            () -> communityCommentService.deleteComment(intruder.getId(), comment.getId()))
        .isInstanceOf(CustomException.class)
        .extracting(throwable -> ((CustomException) throwable).getErrorCode())
        .isEqualTo(ErrorCode.UNAUTHORIZED_ACTION);
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

  private Comment saveComment(
      Post post, User user, Comment parentComment, String content, LocalDateTime createdAt) {
    Comment comment =
        Comment.builder()
            .post(post)
            .user(user)
            .parentComment(parentComment)
            .content(content)
            .build();

    ReflectionTestUtils.setField(comment, "createdAt", createdAt);
    ReflectionTestUtils.setField(comment, "updatedAt", createdAt);

    return commentRepository.save(comment);
  }

  private CommentCreateRequest commentCreateRequest(String content) {
    CommentCreateRequest request = newInstance(CommentCreateRequest.class);
    ReflectionTestUtils.setField(request, "content", content);
    return request;
  }

  private void flushAndClear() {
    entityManager.flush();
    entityManager.clear();
  }

  private <T> T newInstance(Class<T> type) {
    try {
      var constructor = type.getDeclaredConstructor();
      constructor.setAccessible(true);
      return constructor.newInstance();
    } catch (ReflectiveOperationException e) {
      throw new IllegalStateException(
          "Failed to create test request instance: " + type.getName(), e);
    }
  }
}
