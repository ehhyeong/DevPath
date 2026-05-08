package com.devpath.api.community.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
@Import(CommunityService.class)
class CommunityServiceIntegrationTest {

  @Autowired private CommunityService communityService;

  @Autowired private PostRepository postRepository;

  @Autowired private UserRepository userRepository;

  @Autowired private EntityManager entityManager;

  @Test
  @DisplayName("게시글 작성 수정 삭제에 성공한다")
  void createUpdateDeletePostSuccess() {
    User author = saveUser("community-owner@devpath.com");

    PostResponse created =
        communityService.createPost(
            author.getId(),
            postRequest(
                CommunityCategory.TECH_SHARE,
                "Spring Boot N+1 문제 해결기",
                "FetchType.LAZY와 fetch join을 같이 적용해봤습니다."));
    flushAndClear();

    PostResponse updated =
        communityService.updatePost(
            author.getId(),
            created.getId(),
            postUpdateRequest(
                CommunityCategory.FREE,
                "Spring Boot N+1 문제 해결기 - 수정본",
                "LAZY 로딩과 fetch join을 함께 적용했습니다."));
    flushAndClear();

    Post savedUpdatedPost = postRepository.findById(created.getId()).orElseThrow();

    assertThat(updated.getCategory()).isEqualTo(CommunityCategory.FREE.name());
    assertThat(updated.getTitle()).isEqualTo("Spring Boot N+1 문제 해결기 - 수정본");
    assertThat(savedUpdatedPost.getCategory()).isEqualTo(CommunityCategory.FREE);
    assertThat(savedUpdatedPost.getTitle()).isEqualTo("Spring Boot N+1 문제 해결기 - 수정본");
    assertThat(savedUpdatedPost.getContent()).isEqualTo("LAZY 로딩과 fetch join을 함께 적용했습니다.");

    communityService.deletePost(author.getId(), created.getId());
    flushAndClear();

    assertThat(postRepository.findByIdAndIsDeletedFalse(created.getId())).isEmpty();
    assertThat(postRepository.findById(created.getId()))
        .get()
        .extracting(Post::isDeleted)
        .isEqualTo(true);
  }

  @Test
  @DisplayName("게시글 상세 조회 시 조회수가 증가한다")
  void getPostDetailIncrementsViewCount() {
    User author = saveUser("community-view@devpath.com");
    Post post =
        savePost(
            author,
            CommunityCategory.TECH_SHARE,
            "조회수 테스트",
            "상세 조회를 두 번 호출합니다.",
            LocalDateTime.of(2026, 3, 20, 10, 0),
            0,
            0);
    flushAndClear();

    PostResponse firstResponse = communityService.getPostDetail(post.getId());
    flushAndClear();

    PostResponse secondResponse = communityService.getPostDetail(post.getId());
    flushAndClear();

    assertThat(firstResponse.getViewCount()).isEqualTo(1);
    assertThat(secondResponse.getViewCount()).isEqualTo(2);
    assertThat(postRepository.findById(post.getId()))
        .get()
        .extracting(Post::getViewCount)
        .isEqualTo(2);
  }

  @Test
  @DisplayName("내 게시글 목록을 최신순으로 조회한다")
  void getMyPostsSuccess() {
    User author = saveUser("community-my-posts@devpath.com");
    User otherAuthor = saveUser("community-other@devpath.com");

    Post olderPost =
        savePost(
            author,
            CommunityCategory.TECH_SHARE,
            "첫 번째 글",
            "이 글은 오래된 글입니다.",
            LocalDateTime.of(2026, 3, 20, 10, 0),
            1,
            0);
    savePost(
        otherAuthor,
        CommunityCategory.FREE,
        "다른 사람 글",
        "내 글 목록에 나오면 안 됩니다.",
        LocalDateTime.of(2026, 3, 21, 10, 0),
        5,
        1);
    Post newerPost =
        savePost(
            author,
            CommunityCategory.CAREER,
            "두 번째 글",
            "이 글이 먼저 보여야 합니다.",
            LocalDateTime.of(2026, 3, 22, 10, 0),
            2,
            3);
    flushAndClear();

    var responses = communityService.getMyPosts(author.getId());

    assertThat(responses).hasSize(2);
    assertThat(responses)
        .extracting(MyPostResponse::getId)
        .containsExactly(newerPost.getId(), olderPost.getId());
  }

  @Test
  @DisplayName("카테고리 작성자 키워드 정렬 페이지네이션 필터가 동작한다")
  void searchPostsWithFilterAndSortSuccess() {
    User firstAuthor = saveUser("community-filter-author1@devpath.com");
    User secondAuthor = saveUser("community-filter-author2@devpath.com");

    Post olderMatchingPost =
        savePost(
            firstAuthor,
            CommunityCategory.TECH_SHARE,
            "Spring Boot JPA fetch join 정리",
            "fetch join과 LAZY 로딩 차이를 정리했습니다.",
            LocalDateTime.of(2026, 3, 20, 10, 0),
            3,
            2);
    Post newerMatchingPost =
        savePost(
            firstAuthor,
            CommunityCategory.TECH_SHARE,
            "Redis 캐시 적용 후기",
            "Spring Cache와 Redis를 붙여본 경험 공유",
            LocalDateTime.of(2026, 3, 21, 10, 0),
            8,
            5);
    Post filteredByCategory =
        savePost(
            firstAuthor,
            CommunityCategory.CAREER,
            "백엔드 포트폴리오 구성 질문",
            "Spring 프로젝트를 어떻게 넣는 게 좋을까요?",
            LocalDateTime.of(2026, 3, 22, 10, 0),
            20,
            10);
    Post filteredByAuthor =
        savePost(
            secondAuthor,
            CommunityCategory.TECH_SHARE,
            "Spring Security 팁",
            "작성자 필터에서 제외되어야 합니다.",
            LocalDateTime.of(2026, 3, 23, 10, 0),
            30,
            1);
    flushAndClear();

    PostPageResponse latestResponse =
        communityService.searchPosts(
            CommunityCategory.TECH_SHARE, firstAuthor.getId(), "spring", "latest", 0, 10);
    PostPageResponse popularResponse =
        communityService.searchPosts(
            CommunityCategory.TECH_SHARE, firstAuthor.getId(), "spring", "popular", 0, 10);
    PostPageResponse mostViewedResponse =
        communityService.searchPosts(null, null, null, "mostViewed", 0, 10);
    PostPageResponse pagedResponse = communityService.searchPosts(null, null, null, "latest", 1, 2);

    assertThat(latestResponse.getContent())
        .extracting(PostResponse::getId)
        .containsExactly(newerMatchingPost.getId(), olderMatchingPost.getId());
    assertThat(latestResponse.getTotalElements()).isEqualTo(2);
    assertThat(latestResponse.isHasNext()).isFalse();

    assertThat(popularResponse.getContent())
        .extracting(PostResponse::getId)
        .containsExactly(newerMatchingPost.getId(), olderMatchingPost.getId());

    assertThat(mostViewedResponse.getContent())
        .extracting(PostResponse::getId)
        .startsWith(filteredByAuthor.getId(), filteredByCategory.getId());

    assertThat(pagedResponse.getPage()).isEqualTo(1);
    assertThat(pagedResponse.getSize()).isEqualTo(2);
    assertThat(pagedResponse.getTotalElements()).isEqualTo(4);
    assertThat(pagedResponse.getTotalPages()).isEqualTo(2);
    assertThat(pagedResponse.isHasNext()).isFalse();
    assertThat(pagedResponse.getContent()).hasSize(2);

    assertThatThrownBy(() -> communityService.searchPosts(null, null, null, "invalid", 0, 10))
        .isInstanceOf(CustomException.class)
        .extracting(throwable -> ((CustomException) throwable).getErrorCode())
        .isEqualTo(ErrorCode.INVALID_INPUT);
  }

  @Test
  @DisplayName("작성자가 아니면 게시글을 수정하거나 삭제할 수 없다")
  void updateOrDeletePostFailsWhenNotOwner() {
    User owner = saveUser("community-update-owner@devpath.com");
    User intruder = saveUser("community-update-intruder@devpath.com");
    Post post =
        savePost(
            owner,
            CommunityCategory.TECH_SHARE,
            "권한 테스트 글",
            "작성자만 수정 삭제할 수 있습니다.",
            LocalDateTime.of(2026, 3, 20, 12, 0),
            0,
            0);

    assertThatThrownBy(
            () ->
                communityService.updatePost(
                    intruder.getId(),
                    post.getId(),
                    postUpdateRequest(CommunityCategory.FREE, "수정 시도", "권한 없는 수정")))
        .isInstanceOf(CustomException.class)
        .extracting(throwable -> ((CustomException) throwable).getErrorCode())
        .isEqualTo(ErrorCode.UNAUTHORIZED_ACTION);

    assertThatThrownBy(() -> communityService.deletePost(intruder.getId(), post.getId()))
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

  private Post savePost(
      User user,
      CommunityCategory category,
      String title,
      String content,
      LocalDateTime createdAt,
      int viewCount,
      int likeCount) {
    Post post = Post.builder().user(user).category(category).title(title).content(content).build();

    ReflectionTestUtils.setField(post, "createdAt", createdAt);
    ReflectionTestUtils.setField(post, "updatedAt", createdAt);
    ReflectionTestUtils.setField(post, "viewCount", viewCount);
    ReflectionTestUtils.setField(post, "likeCount", likeCount);

    return postRepository.save(post);
  }

  private PostRequest postRequest(CommunityCategory category, String title, String content) {
    PostRequest request = newInstance(PostRequest.class);
    ReflectionTestUtils.setField(request, "category", category);
    ReflectionTestUtils.setField(request, "title", title);
    ReflectionTestUtils.setField(request, "content", content);
    return request;
  }

  private PostUpdateRequest postUpdateRequest(
      CommunityCategory category, String title, String content) {
    PostUpdateRequest request = newInstance(PostUpdateRequest.class);
    ReflectionTestUtils.setField(request, "category", category);
    ReflectionTestUtils.setField(request, "title", title);
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
