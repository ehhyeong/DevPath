package com.devpath.api.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.devpath.api.evaluation.dto.request.CreateAiQuizDraftRequest;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiQuizDraftQuestionGeneratorTest {

  @Mock private GeminiProvider geminiProvider;

  @Test
  void generateParsesGeminiQuestionAndOptions() {
    CreateAiQuizDraftRequest request =
        CreateAiQuizDraftRequest.builder()
            .nodeId(31L)
            .title("보안 퀴즈")
            .sourceText("Spring Security 인증과 인가")
            .questionCount(1)
            .preferredQuestionType(QuestionType.MULTIPLE_CHOICE)
            .difficultyLevel(2)
            .build();
    when(geminiProvider.generateJson(anyString(), eq(null), eq(null), eq(8192)))
        .thenReturn(
            """
            [{
              "questionType": "MULTIPLE_CHOICE",
              "questionText": "인증과 인가의 차이는 무엇인가요?",
              "explanation": "인증은 신원을 확인하고 인가는 접근 권한을 판단합니다.",
              "options": [
                {"optionText": "인증은 신원 확인이다.", "correct": true},
                {"optionText": "인증은 권한 부여만 담당한다.", "correct": false}
              ]
            }]
            """);
    AiQuizDraftQuestionGenerator generator = new AiQuizDraftQuestionGenerator(geminiProvider);

    List<DraftQuestionState> questions =
        generator.generate(RoadmapNode.builder().nodeId(31L).title("보안").build(), request);

    assertThat(questions).hasSize(1);
    assertThat(questions.getFirst().questionType).isEqualTo(QuestionType.MULTIPLE_CHOICE);
    assertThat(questions.getFirst().questionText).isEqualTo("인증과 인가의 차이는 무엇인가요?");
    assertThat(questions.getFirst().options).hasSize(2);
    assertThat(questions.getFirst().options.getFirst().correct).isTrue();
  }
}
