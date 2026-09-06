package com.devpath.api.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.evaluation.dto.request.CreateAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.response.AiQuizDraftResponse;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.QuizType;
import com.devpath.domain.learning.service.QuizDraftGenerator;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiQuizDraftGeneratorAdapterTest {

  @Mock private AiQuizDraftService aiQuizDraftService;

  @Test
  void generateMapsDomainCommandAndApiDraft() {
    long instructorId = 7L;
    QuizDraftGenerator.Command command =
        new QuizDraftGenerator.Command(
            41L, "AI 퀴즈", "초안 설명", QuizType.AI_TOPIC, "생성 근거", null, null, null, false, 3, 2);
    AiQuizDraftResponse response =
        AiQuizDraftResponse.builder()
            .title("AI 퀴즈")
            .description("초안 설명")
            .quizType(QuizType.AI_TOPIC)
            .questions(
                List.of(
                    AiQuizDraftResponse.QuestionDraftItem.builder()
                        .questionType(QuestionType.MULTIPLE_CHOICE)
                        .questionText("핵심 개념은?")
                        .points(5)
                        .displayOrder(1)
                        .options(
                            List.of(
                                AiQuizDraftResponse.OptionDraftItem.builder()
                                    .optionText("트랜잭션")
                                    .correct(true)
                                    .displayOrder(1)
                                    .build()))
                        .build()))
            .build();
    when(aiQuizDraftService.createDraft(eq(instructorId), org.mockito.ArgumentMatchers.any()))
        .thenReturn(response);

    QuizDraftGenerator.Draft draft =
        new AiQuizDraftGeneratorAdapter(aiQuizDraftService).generate(instructorId, command);

    ArgumentCaptor<CreateAiQuizDraftRequest> requestCaptor =
        ArgumentCaptor.forClass(CreateAiQuizDraftRequest.class);
    verify(aiQuizDraftService).createDraft(eq(instructorId), requestCaptor.capture());
    assertThat(requestCaptor.getValue().getNodeId()).isEqualTo(41L);
    assertThat(requestCaptor.getValue().getSourceText()).isEqualTo("생성 근거");
    assertThat(draft.title()).isEqualTo("AI 퀴즈");
    assertThat(draft.questions()).hasSize(1);
    assertThat(draft.questions().getFirst().options().getFirst().correct()).isTrue();
  }
}
