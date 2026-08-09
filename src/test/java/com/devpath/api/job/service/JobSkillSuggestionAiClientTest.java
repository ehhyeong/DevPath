package com.devpath.api.job.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.common.provider.GeminiProvider;
import org.junit.jupiter.api.Test;

class JobSkillSuggestionAiClientTest {

  @Test
  void extractsJsonObjectFromDecoratedGeminiResponse() {
    GeminiProvider geminiProvider = mock(GeminiProvider.class);
    when(geminiProvider.generateJson("prompt"))
        .thenReturn("결과입니다. ```json\n{\"officialRoadmapId\": 12}\n```");

    JobSkillSuggestionAiClient client = new JobSkillSuggestionAiClient(geminiProvider);
    var result = client.requestJson("prompt");

    assertThat(client.asLong(result.path("officialRoadmapId"))).isEqualTo(12L);
  }
}
