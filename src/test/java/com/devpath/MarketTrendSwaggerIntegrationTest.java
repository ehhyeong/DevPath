package com.devpath;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.devpath.domain.job.entity.Company;
import com.devpath.domain.job.entity.JobPosting;
import com.devpath.domain.job.entity.JobPostingStatus;
import com.devpath.domain.job.entity.JobSkillTag;
import com.devpath.domain.job.entity.JobSkillTagSource;
import com.devpath.domain.job.entity.JobSource;
import com.devpath.domain.job.repository.CompanyRepository;
import com.devpath.domain.job.repository.JobPostingRepository;
import com.devpath.domain.job.repository.JobSkillTagRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "spring.sql.init.mode=never")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MarketTrendSwaggerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private CompanyRepository companyRepository;
  @Autowired private JobPostingRepository jobPostingRepository;
  @Autowired private JobSkillTagRepository jobSkillTagRepository;

  private Company company;

  @BeforeEach
  void setUp() {
    jobSkillTagRepository.deleteAll();
    jobPostingRepository.deleteAll();
    companyRepository.deleteAll();

    company =
        companyRepository.save(
            Company.builder()
                .name("DevPath Labs")
                .description("채용 분석 테스트 기업")
                .websiteUrl("https://devpath.example")
                .industry("EDU")
                .location("SEOUL")
                .build());

    JobPosting backendOpen =
        jobPostingRepository.save(
            jobPosting(
                "Backend Developer",
                "Backend Developer",
                "SEOUL",
                "JUNIOR",
                JobPostingStatus.OPEN,
                "market-backend-open"));
    JobPosting backendClosed =
        jobPostingRepository.save(
            jobPosting(
                "Backend Developer 2",
                "Backend Developer",
                "SEOUL",
                "SENIOR",
                JobPostingStatus.CLOSED,
                "market-backend-closed"));
    jobPostingRepository.save(
        jobPosting(
            "Frontend Developer",
            "Frontend Developer",
            null,
            null,
            JobPostingStatus.DRAFT,
            "market-frontend-draft"));

    saveSkillTag(backendOpen, "Java");
    saveSkillTag(backendOpen, "Spring Boot");
    saveSkillTag(backendClosed, "Java");
  }

  @Test
  void marketTrendEndpointsAggregateJobAnalysisData() throws Exception {
    mockMvc
        .perform(get("/api/market/trends/stacks").with(authentication(learnerAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SUCCESS"))
        .andExpect(jsonPath("$.data[0].skillName").value("Java"))
        .andExpect(jsonPath("$.data[0].postingCount").value(2))
        .andExpect(jsonPath("$.data[1].skillName").value("Spring Boot"))
        .andExpect(jsonPath("$.data[1].postingCount").value(1));

    mockMvc
        .perform(get("/api/market/trends/jobs").with(authentication(learnerAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].jobRole").value("Backend Developer"))
        .andExpect(jsonPath("$.data[0].postingCount").value(2))
        .andExpect(jsonPath("$.data[1].jobRole").value("Frontend Developer"))
        .andExpect(jsonPath("$.data[1].postingCount").value(1));

    mockMvc
        .perform(get("/api/market/trends/indicators").with(authentication(learnerAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].type").value("REGION"))
        .andExpect(jsonPath("$.data[0].label").value("SEOUL"))
        .andExpect(jsonPath("$.data[0].postingCount").value(2))
        .andExpect(jsonPath("$.data[1].type").value("REGION"))
        .andExpect(jsonPath("$.data[1].label").value("UNKNOWN"))
        .andExpect(jsonPath("$.data[1].postingCount").value(1))
        .andExpect(jsonPath("$.data.length()").value(5));

    mockMvc
        .perform(get("/api/admin/market/reports").with(authentication(adminAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalPostingCount").value(3))
        .andExpect(jsonPath("$.data.openPostingCount").value(1))
        .andExpect(jsonPath("$.data.closedPostingCount").value(1))
        .andExpect(jsonPath("$.data.draftPostingCount").value(1))
        .andExpect(jsonPath("$.data.analyzedSkillTagCount").value(3))
        .andExpect(jsonPath("$.data.topSkills[0].skillName").value("Java"))
        .andExpect(jsonPath("$.data.topJobRoles[0].jobRole").value("Backend Developer"))
        .andExpect(jsonPath("$.data.indicators.length()").value(5))
        .andExpect(jsonPath("$.data.generatedAt").isNotEmpty());
  }

  @Test
  void swaggerDocsIncludeMarketTrendAndAdminReportPaths() throws Exception {
    mockMvc
        .perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/market/trends/stacks']").exists())
        .andExpect(jsonPath("$.paths['/api/market/trends/jobs']").exists())
        .andExpect(jsonPath("$.paths['/api/market/trends/indicators']").exists())
        .andExpect(jsonPath("$.paths['/api/admin/market/reports']").exists());

    mockMvc
        .perform(get("/v3/api-docs/learner"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/market/trends/stacks']").exists())
        .andExpect(jsonPath("$.paths['/api/admin/market/reports']").doesNotExist());

    mockMvc
        .perform(get("/v3/api-docs/admin"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/admin/market/reports']").exists())
        .andExpect(jsonPath("$.paths['/api/market/trends/stacks']").doesNotExist())
        .andExpect(jsonPath("$.tags.length()").value(greaterThanOrEqualTo(1)));
  }

  private JobPosting jobPosting(
      String title,
      String jobRole,
      String region,
      String careerLevel,
      JobPostingStatus status,
      String externalJobId) {
    return JobPosting.builder()
        .company(company)
        .title(title)
        .jobRole(jobRole)
        .description(title + " JD")
        .requiredSkills("Java, Spring Boot")
        .region(region)
        .careerLevel(careerLevel)
        .sourceUrl("https://jobs.example/" + externalJobId)
        .source(JobSource.INTERNAL)
        .status(status)
        .deadline(LocalDate.now().plusDays(30))
        .externalJobId(externalJobId)
        .build();
  }

  private void saveSkillTag(JobPosting jobPosting, String name) {
    jobSkillTagRepository.save(
        JobSkillTag.builder()
            .jobPosting(jobPosting)
            .name(name)
            .source(JobSkillTagSource.JD_RULE_BASED)
            .confidenceScore(1.0)
            .matchedKeyword(name)
            .build());
  }

  private UsernamePasswordAuthenticationToken learnerAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        1L, null, AuthorityUtils.createAuthorityList("ROLE_LEARNER"));
  }

  private UsernamePasswordAuthenticationToken adminAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        2L, null, AuthorityUtils.createAuthorityList("ROLE_ADMIN", "ADMIN_SUPER"));
  }
}
