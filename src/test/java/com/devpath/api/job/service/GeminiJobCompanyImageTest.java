package com.devpath.api.job.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.job.dto.JobRecommendationResponse;
import com.devpath.api.job.dto.JobkoreaJobResponse;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.job.entity.Company;
import com.devpath.domain.job.entity.JobPosting;
import java.util.List;
import org.junit.jupiter.api.Test;

class GeminiJobCompanyImageTest {
  @Test
  void preservesCompanyUrlThroughMatchedAndStretchAnalysis() {
    var api = mock(JobkoreaApiClient.class);
    var gemini = mock(GeminiProvider.class);
    var posting = mock(JobkoreaJobResponse.Posting.class);
    when(posting.companyUrl()).thenReturn("https://www.jobkorea.co.kr/Company/1/Info");
    when(posting.keywords()).thenReturn(List.of("Java"));
    when(api.search(any()))
        .thenReturn(
            new JobkoreaJobResponse.SearchResult(
                4, 4, 1, 4, false, null, List.of(posting, posting, posting, posting)));
    when(gemini.generateJson(anyString()))
        .thenReturn(
            "[{\"index\":0,\"matchScore\":90},{\"index\":1,\"matchScore\":80},{\"index\":2,\"matchScore\":70},{\"index\":3,\"matchScore\":60}]");
    var service = new GeminiJobAnalysisService(mock(JobActivityProfileService.class), api, gemini);

    var analysis = service.analyze(null, "Java", null, null, null);

    assertThat(analysis.recommendations())
        .hasSize(1)
        .allSatisfy(item -> assertThat(item.companyUrl()).isEqualTo(posting.companyUrl()));
    assertThat(analysis.stretchRecommendations())
        .hasSize(3)
        .allSatisfy(item -> assertThat(item.companyUrl()).isEqualTo(posting.companyUrl()));
  }

  @Test
  void exposesExistingRegisteredCompanyLogoInInternalRecommendation() {
    var company =
        Company.builder().name("등록 기업").logoUrl("https://cdn.example.com/logo.png").build();
    var job = JobPosting.builder().company(company).title("개발자").build();
    assertThat(JobRecommendationResponse.Recommendation.from(job, 90, List.of()).companyLogoUrl())
        .isEqualTo(company.getLogoUrl());
  }
}
