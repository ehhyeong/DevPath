package com.devpath;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionDifficulty;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.sql.init.mode=always",
      "spring.jpa.defer-datasource-initialization=true"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QnaDuplicateSuggestionIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private QuestionRepository questionRepository;
  @Autowired private UserRepository userRepository;

  private Long userId;
  private User learner;

  @BeforeEach
  void setUp() {
    jdbcTemplate.update("delete from qna_answers");
    jdbcTemplate.update("delete from qna_questions");

    learner =
        userRepository
            .findByEmail("learner@devpath.com")
            .orElseThrow(() -> new IllegalStateException("seed learner user not found"));
    userId = learner.getId();

    seedQuestion("Spring Boot JWT 필터가 두 번 실행됩니다", "OncePerRequestFilter인데 로그가 두 번 찍힙니다.");
    seedQuestion(
        "Spring Security에서 jwt filter가 두 번 호출됩니다",
        "JWT 인증 필터가 중복 실행되는 것 같습니다.");
    seedQuestion("JWT 인증 필터 중복 실행 원인이 뭘까요", "필터 체인 설정을 봐야 할까요?");
    seedQuestion("Redis 캐시 적용 방법", "캐시 만료 정책은 어떻게 잡는 게 좋을까요?");
  }

  @Test
  void duplicateSuggestionsPreferQuestionsWithMultipleOverlappingKeywords() throws Exception {
    mockMvc
        .perform(
            get("/api/qna/questions/duplicate-suggestions")
                .queryParam("title", "Spring Boot에서 JWT 필터가 2번 실행돼요")
                .with(authentication(userAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.length()").value(greaterThanOrEqualTo(2)))
        .andExpect(
            jsonPath("$.data[*].title")
                .value(
                    hasItems(
                        "Spring Boot JWT 필터가 두 번 실행됩니다",
                        "Spring Security에서 jwt filter가 두 번 호출됩니다")))
        .andExpect(
            jsonPath("$.data[*].title").value(not(hasItems("Redis 캐시 적용 방법"))))
        .andExpect(jsonPath("$.data[0].matchedKeyword").isNotEmpty());
  }

  @Test
  void duplicateSuggestionsRejectBlankTitle() throws Exception {
    mockMvc
        .perform(
            get("/api/qna/questions/duplicate-suggestions")
                .queryParam("title", "   ")
                .with(authentication(userAuthentication())))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
        .andExpect(jsonPath("$.message").value("중복 추천을 위한 title 값은 필수입니다."));
  }

  private void seedQuestion(String title, String content) {
    questionRepository.save(
        Question.builder()
            .user(learner)
            .templateType(QuestionTemplateType.DEBUGGING)
            .difficulty(QuestionDifficulty.MEDIUM)
            .title(title)
            .content(content)
            .build());
  }

  private UsernamePasswordAuthenticationToken userAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        userId, null, AuthorityUtils.createAuthorityList("ROLE_LEARNER"));
  }
}
