package com.devpath.api.qna.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.api.qna.dto.DuplicateQuestionSuggestionResponse;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionDifficulty;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class QnaDuplicateSuggestionServiceTest {

  @Mock private QuestionRepository questionRepository;

  private QnaDuplicateSuggestionService service;

  @BeforeEach
  void setUp() {
    service = new QnaDuplicateSuggestionService(questionRepository);
  }

  @Test
  void getDuplicateSuggestionsDeduplicatesQuestionMatchedByMultipleKeywords() {
    Question question = question(31L, "Spring JWT filter");
    when(questionRepository
            .findTop10ByIsDeletedFalseAndTitleContainingIgnoreCaseOrderByCreatedAtDesc("spring"))
        .thenReturn(List.of(question));
    when(questionRepository
            .findTop10ByIsDeletedFalseAndTitleContainingIgnoreCaseOrderByCreatedAtDesc("jwt"))
        .thenReturn(List.of(question));

    List<DuplicateQuestionSuggestionResponse> result =
        service.getDuplicateSuggestions("Spring JWT");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst().getQuestionId()).isEqualTo(question.getId());
    assertThat(result.getFirst().getMatchedKeyword()).isEqualTo("title");
  }

  private Question question(Long id, String title) {
    User author =
        User.builder()
            .email("qna-author@devpath.com")
            .password("encoded-password")
            .name("QnA author")
            .role(UserRole.ROLE_LEARNER)
            .build();
    Question question =
        Question.builder()
            .user(author)
            .templateType(QuestionTemplateType.DEBUGGING)
            .difficulty(QuestionDifficulty.MEDIUM)
            .title(title)
            .content("content")
            .build();
    ReflectionTestUtils.setField(question, "id", id);
    return question;
  }
}
