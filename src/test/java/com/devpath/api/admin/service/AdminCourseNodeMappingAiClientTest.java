package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.admin.dto.PolicyGovernanceResponses.CourseMappingCandidateItem;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.NodeCandidateItem;
import com.devpath.common.provider.GeminiProvider;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminCourseNodeMappingAiClientTest {

  @Test
  void keepsOnlyValidUniqueNodeIdsFromGemini() {
    GeminiProvider geminiProvider = mock(GeminiProvider.class);
    when(geminiProvider.generateJson(anyString())).thenReturn("{\"nodeIds\":[12,999,12,11]}");
    AdminCourseNodeMappingAiClient client = new AdminCourseNodeMappingAiClient(geminiProvider);

    List<Long> recommendations = client.recommend(courseCandidate());

    assertThat(recommendations).containsExactly(12L, 11L);
  }

  @Test
  void returnsEmptySuggestionsWhenGeminiResponseIsInvalid() {
    GeminiProvider geminiProvider = mock(GeminiProvider.class);
    when(geminiProvider.generateJson(anyString())).thenReturn("not-json");
    AdminCourseNodeMappingAiClient client = new AdminCourseNodeMappingAiClient(geminiProvider);

    assertThat(client.recommend(courseCandidate())).isEmpty();
  }

  private CourseMappingCandidateItem courseCandidate() {
    return CourseMappingCandidateItem.builder()
        .courseId(7L)
        .courseTitle("Spring Security")
        .courseStatus("PUBLISHED")
        .courseTags(List.of("Spring", "Security"))
        .mappedNodeIds(List.of())
        .totalCandidates(2)
        .candidates(
            List.of(
                nodeCandidate(11L, "Spring Security", "100.0"),
                nodeCandidate(12L, "OAuth2", "50.0")))
        .build();
  }

  private NodeCandidateItem nodeCandidate(Long nodeId, String title, String coverage) {
    return NodeCandidateItem.builder()
        .roadmapId(3L)
        .roadmapTitle("Backend")
        .nodeId(nodeId)
        .nodeTitle(title)
        .nodeType("CONCEPT")
        .sortOrder(nodeId.intValue())
        .requiredTags(List.of("Spring", "Security"))
        .matchedTags(List.of("Spring"))
        .missingTags(List.of("Security"))
        .coveragePercent(new BigDecimal(coverage))
        .fullyMatched(false)
        .build();
  }
}
