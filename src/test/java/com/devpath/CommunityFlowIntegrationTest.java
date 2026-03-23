package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(
    properties = {
      "spring.sql.init.mode=always",
      "spring.jpa.defer-datasource-initialization=true"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunityFlowIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private Long authorId;
  private Long actorId;

  @BeforeEach
  void setUp() {
    jdbcTemplate.update("delete from community_post_likes");
    jdbcTemplate.update("delete from community_comments");
    jdbcTemplate.update("delete from community_posts");

    authorId =
        jdbcTemplate.queryForObject(
            "select user_id from users where email = ?", Long.class, "learner@devpath.com");
    actorId =
        jdbcTemplate.queryForObject(
            "select user_id from users where email = ?", Long.class, "instructor@devpath.com");
  }

  @Test
  void communitySwaggerFlowWorksEndToEnd() throws Exception {
    JsonNode createdPost =
        postAsAuthor(
            "/api/posts",
            Map.of(
                "category", "TECH_SHARE",
                "title", "Spring Boot N+1 문제 해결기",
                "content", "FetchType.LAZY와 fetch join을 같이 적용해봤습니다."));

    long postId = createdPost.get("id").asLong();
    assertThat(postId).isPositive();
    assertThat(createdPost.get("authorName").asText()).isEqualTo("Learner Kim");
    assertThat(createdPost.get("category").asText()).isEqualTo("TECH_SHARE");
    assertThat(createdPost.get("viewCount").asInt()).isZero();
    assertThat(createdPost.get("likeCount").asInt()).isZero();

    JsonNode listResponse =
        getAsAuthenticated(
            authorAuthentication(),
            "/api/posts",
            Map.of("category", "TECH_SHARE", "sort", "latest", "page", "0", "size", "10"));

    assertThat(listResponse.get("content")).hasSize(1);
    assertThat(listResponse.get("content").get(0).get("id").asLong()).isEqualTo(postId);
    assertThat(listResponse.get("page").asInt()).isZero();
    assertThat(listResponse.get("size").asInt()).isEqualTo(10);

    JsonNode firstDetail = getAsAuthenticated(authorAuthentication(), "/api/posts/{postId}", postId);
    JsonNode secondDetail = getAsAuthenticated(authorAuthentication(), "/api/posts/{postId}", postId);

    assertThat(firstDetail.get("viewCount").asInt()).isEqualTo(1);
    assertThat(secondDetail.get("viewCount").asInt()).isEqualTo(2);

    JsonNode updatedPost =
        putAsAuthor(
            "/api/posts/{postId}",
            Map.of(
                "category", "TECH_SHARE",
                "title", "Spring Boot N+1 문제 해결기 - 수정본",
                "content", "LAZY 로딩과 fetch join을 함께 적용했습니다."),
            postId);

    assertThat(updatedPost.get("title").asText()).isEqualTo("Spring Boot N+1 문제 해결기 - 수정본");
    assertThat(updatedPost.get("content").asText()).contains("fetch join");

    expectError(
        put("/api/posts/{postId}", postId),
        actorAuthentication(),
        actorId,
        Map.of(
            "category", "TECH_SHARE",
            "title", "권한 없는 수정",
            "content", "다른 사람이 수정 시도"),
        HttpStatus.FORBIDDEN,
        "UNAUTHORIZED_ACTION",
        "해당 작업을 수행할 권한이 없습니다.");

    JsonNode myPosts = getAsAuthor("/api/posts/me");
    assertThat(myPosts).hasSize(1);
    assertThat(myPosts.get(0).get("id").asLong()).isEqualTo(postId);

    JsonNode createdComment =
        postAsActor(
            "/api/posts/{postId}/comments",
            Map.of("content", "이 방식이면 fetch join 없이도 해결 가능합니다."),
            postId);

    long commentId = createdComment.get("id").asLong();
    assertThat(createdComment.get("authorId").asLong()).isEqualTo(actorId);
    assertThat(createdComment.get("reply").asBoolean()).isFalse();
    assertThat(createdComment.get("parentCommentId").isNull()).isTrue();

    JsonNode createdReply =
        postAsAuthor(
            "/api/posts/{postId}/comments/{commentId}/replies",
            Map.of("content", "좋은 포인트네요. fetch join도 같이 비교해보겠습니다."),
            postId,
            commentId);

    assertThat(createdReply.get("reply").asBoolean()).isTrue();
    assertThat(createdReply.get("parentCommentId").asLong()).isEqualTo(commentId);

    JsonNode comments = getAsAuthenticated(authorAuthentication(), "/api/posts/{postId}/comments", postId);
    assertThat(comments).hasSize(1);
    assertThat(comments.get(0).get("id").asLong()).isEqualTo(commentId);
    assertThat(comments.get(0).get("children")).hasSize(1);
    assertThat(comments.get(0).get("children").get(0).get("reply").asBoolean()).isTrue();

    JsonNode liked = postAsActor("/api/posts/{postId}/likes", null, postId);
    assertThat(liked.get("liked").asBoolean()).isTrue();
    assertThat(liked.get("likeCount").asInt()).isEqualTo(1);

    expectError(
        post("/api/posts/{postId}/likes", postId),
        actorAuthentication(),
        actorId,
        null,
        HttpStatus.CONFLICT,
        "ALREADY_EXISTS",
        "이미 좋아요를 누른 게시글입니다.");

    JsonNode unliked = deleteAsActor("/api/posts/{postId}/likes", postId);
    assertThat(unliked.get("liked").asBoolean()).isFalse();
    assertThat(unliked.get("likeCount").asInt()).isZero();

    JsonNode unlikedAgain = deleteAsActor("/api/posts/{postId}/likes", postId);
    assertThat(unlikedAgain.get("liked").asBoolean()).isFalse();
    assertThat(unlikedAgain.get("likeCount").asInt()).isZero();

    expectError(
        delete("/api/comments/{commentId}", commentId),
        authorAuthentication(),
        authorId,
        null,
        HttpStatus.FORBIDDEN,
        "UNAUTHORIZED_ACTION",
        "해당 작업을 수행할 권한이 없습니다.");

    deleteOkAsActor("/api/comments/{commentId}", commentId);

    JsonNode commentsAfterDelete =
        getAsAuthenticated(authorAuthentication(), "/api/posts/{postId}/comments", postId);
    assertThat(commentsAfterDelete).isEmpty();

    deleteOkAsAuthor("/api/posts/{postId}", postId);

    JsonNode myPostsAfterDelete = getAsAuthor("/api/posts/me");
    assertThat(myPostsAfterDelete).isEmpty();

    JsonNode listAfterDelete =
        getAsAuthenticated(
            authorAuthentication(),
            "/api/posts",
            Map.of("category", "TECH_SHARE", "sort", "latest", "page", "0", "size", "10"));
    assertThat(listAfterDelete.get("content")).isEmpty();

    expectError(
        get("/api/posts/{postId}", postId),
        authorAuthentication(),
        null,
        null,
        HttpStatus.NOT_FOUND,
        "POST_NOT_FOUND",
        "게시글을 찾을 수 없습니다.");
  }

  @Test
  void replyRejectsCommentFromAnotherPost() throws Exception {
    JsonNode firstPost =
        postAsAuthor(
            "/api/posts",
            Map.of(
                "category", "FREE",
                "title", "첫 번째 글",
                "content", "첫 번째 댓글 테스트"));
    JsonNode secondPost =
        postAsAuthor(
            "/api/posts",
            Map.of(
                "category", "FREE",
                "title", "두 번째 글",
                "content", "두 번째 댓글 테스트"));

    JsonNode comment =
        postAsActor(
            "/api/posts/{postId}/comments",
            Map.of("content", "첫 번째 글 댓글"),
            firstPost.get("id").asLong());

    expectError(
        post(
            "/api/posts/{postId}/comments/{commentId}/replies",
            secondPost.get("id").asLong(),
            comment.get("id").asLong()),
        authorAuthentication(),
        authorId,
        Map.of("content", "잘못된 게시글에 대댓글 시도"),
        HttpStatus.BAD_REQUEST,
        "INVALID_INPUT",
        "해당 게시글에 속한 댓글에만 대댓글을 작성할 수 있습니다.");
  }

  private JsonNode postAsAuthor(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(post(url, uriVariables), authorAuthentication(), authorId, body, HttpStatus.OK);
  }

  private JsonNode putAsAuthor(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(put(url, uriVariables), authorAuthentication(), authorId, body, HttpStatus.OK);
  }

  private JsonNode getAsAuthor(String url, Object... uriVariables) throws Exception {
    return performAndReadData(get(url, uriVariables), authorAuthentication(), authorId, null, HttpStatus.OK);
  }

  private JsonNode postAsActor(String url, Object body, Object... uriVariables) throws Exception {
    return performAndReadData(post(url, uriVariables), actorAuthentication(), actorId, body, HttpStatus.OK);
  }

  private JsonNode deleteAsActor(String url, Object... uriVariables) throws Exception {
    return performAndReadData(delete(url, uriVariables), actorAuthentication(), actorId, null, HttpStatus.OK);
  }

  private void deleteOkAsAuthor(String url, Object... uriVariables) throws Exception {
    performAndReadData(delete(url, uriVariables), authorAuthentication(), authorId, null, HttpStatus.OK);
  }

  private void deleteOkAsActor(String url, Object... uriVariables) throws Exception {
    performAndReadData(delete(url, uriVariables), actorAuthentication(), actorId, null, HttpStatus.OK);
  }

  private JsonNode getAsAuthenticated(
      UsernamePasswordAuthenticationToken authenticationToken,
      String url,
      Map<String, String> queryParams)
      throws Exception {
    MockHttpServletRequestBuilder builder = get(url);
    for (Map.Entry<String, String> queryParam : queryParams.entrySet()) {
      builder = builder.param(queryParam.getKey(), queryParam.getValue());
    }
    return performAndReadData(builder, authenticationToken, null, null, HttpStatus.OK);
  }

  private JsonNode getAsAuthenticated(
      UsernamePasswordAuthenticationToken authenticationToken, String url, Object... uriVariables)
      throws Exception {
    return performAndReadData(get(url, uriVariables), authenticationToken, null, null, HttpStatus.OK);
  }

  private JsonNode performAndReadData(
      MockHttpServletRequestBuilder builder,
      UsernamePasswordAuthenticationToken authenticationToken,
      Long userId,
      Object body,
      HttpStatus expectedStatus)
      throws Exception {
    builder = builder.with(authentication(authenticationToken));

    if (userId != null) {
      builder = builder.param("userId", String.valueOf(userId));
    }

    if (body != null) {
      builder =
          builder
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(body));
    }

    MvcResult result =
        mockMvc
            .perform(builder)
            .andExpect(status().is(expectedStatus.value()))
            .andExpect(jsonPath("$.success").value(true))
            .andReturn();

    return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
  }

  private void expectError(
      MockHttpServletRequestBuilder builder,
      UsernamePasswordAuthenticationToken authenticationToken,
      Long userId,
      Object body,
      HttpStatus expectedStatus,
      String expectedCode,
      String expectedMessage)
      throws Exception {
    builder = builder.with(authentication(authenticationToken));

    if (userId != null) {
      builder = builder.param("userId", String.valueOf(userId));
    }

    if (body != null) {
      builder =
          builder
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(body));
    }

    mockMvc
        .perform(builder)
        .andExpect(status().is(expectedStatus.value()))
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.code").value(expectedCode))
        .andExpect(jsonPath("$.message").value(expectedMessage));
  }

  private UsernamePasswordAuthenticationToken authorAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        authorId, null, AuthorityUtils.createAuthorityList("ROLE_LEARNER"));
  }

  private UsernamePasswordAuthenticationToken actorAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        actorId, null, AuthorityUtils.createAuthorityList("ROLE_INSTRUCTOR"));
  }
}
