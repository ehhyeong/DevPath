package com.devpath.api.voice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.voice.entity.VoiceMeetingMinutes;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VoiceMinutesAnalyzerTest {

  @Mock private GeminiProvider geminiProvider;
  @Mock private VoiceMeetingMinutes minutes;

  private VoiceMinutesAnalyzer analyzer;

  @BeforeEach
  void setUp() {
    analyzer = new VoiceMinutesAnalyzer(geminiProvider, new ObjectMapper());
  }

  @Test
  void analyzeUsesFallbackForMalformedResponse() {
    when(minutes.getTranscript()).thenReturn("결제 화면 논의");
    when(geminiProvider.generate(anyString())).thenReturn("JSON 형식이 아닌 응답");

    VoiceMinutesAnalyzer.Analysis result = analyzer.analyze(minutes, List.of(), "기본 요약");

    assertThat(result.summary()).isEqualTo("기본 요약");
    assertThat(result.actionItems()).isEmpty();
  }

  @Test
  void analyzeNormalizesInvalidOptionalActionItemFields() {
    when(minutes.getTranscript()).thenReturn("결제 화면 논의");
    when(geminiProvider.generate(anyString()))
        .thenReturn(
            """
            {
              "summary": "",
              "actionItems": [
                {
                  "title": " 결제 UI 완성 ",
                  "description": "null",
                  "priority": "urgent",
                  "assigneeName": "null",
                  "dueDate": "tomorrow"
                },
                { "title": "   " }
              ]
            }
            """);

    VoiceMinutesAnalyzer.Analysis result = analyzer.analyze(minutes, List.of(), "기본 요약");

    assertThat(result.summary()).isEqualTo("기본 요약");
    assertThat(result.actionItems()).hasSize(1);
    assertThat(result.actionItems().getFirst().title()).isEqualTo("결제 UI 완성");
    assertThat(result.actionItems().getFirst().priority()).isEqualTo(WorkspaceTaskPriority.MEDIUM);
    assertThat(result.actionItems().getFirst().description()).isNull();
    assertThat(result.actionItems().getFirst().assigneeName()).isNull();
    assertThat(result.actionItems().getFirst().dueDate()).isNull();
  }
}
