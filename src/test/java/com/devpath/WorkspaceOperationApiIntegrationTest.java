package com.devpath;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.devpath.domain.analytics.ExperimentResult;
import com.devpath.domain.analytics.ExperimentResultRepository;
import com.devpath.domain.operation.integration.ExternalIntegration;
import com.devpath.domain.operation.integration.ExternalIntegrationRepository;
import com.devpath.domain.operation.integration.IntegrationProvider;
import com.devpath.domain.operation.notice.WorkspaceNoticeReadRepository;
import com.devpath.domain.operation.notice.WorkspaceNoticeRepository;
import com.devpath.domain.operation.recommendation.RecommendationSetting;
import com.devpath.domain.operation.recommendation.RecommendationSettingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkspaceOperationApiIntegrationTest {

  private static final Long WORKSPACE_ID = 101L;
  private static final Long LEARNER_ID = 1L;
  private static final Long OTHER_LEARNER_ID = 2L;
  private static final Long ADMIN_ID = 99L;

  @Autowired private MockMvc mockMvc;
  @Autowired private WorkspaceNoticeRepository noticeRepository;
  @Autowired private WorkspaceNoticeReadRepository noticeReadRepository;
  @Autowired private ExternalIntegrationRepository integrationRepository;
  @Autowired private RecommendationSettingRepository settingRepository;
  @Autowired private ExperimentResultRepository experimentResultRepository;

  private final ObjectMapper objectMapper = new ObjectMapper();

  @BeforeEach
  void setUp() {
    noticeReadRepository.deleteAll();
    noticeRepository.deleteAll();
    integrationRepository.deleteAll();
    settingRepository.deleteAll();
    experimentResultRepository.deleteAll();

    integrationRepository.save(
        ExternalIntegration.builder()
            .workspaceId(WORKSPACE_ID)
            .provider(IntegrationProvider.GITHUB)
            .build());

    settingRepository.save(
        RecommendationSetting.builder()
            .settingKey("algorithm.weight.recent_activity")
            .settingValue("0.8")
            .description("Recent activity weight")
            .build());

    experimentResultRepository.save(
        ExperimentResult.builder()
            .experimentId("EXP-2026-001")
            .experimentName("Recommendation UI experiment")
            .metricsJson("{\"variantA_ctr\":0.15,\"variantB_ctr\":0.22}")
            .build());
  }

  @Test
  void groupedSwaggerIncludesWorkspaceOperationEndpoints() throws Exception {
    mockMvc
        .perform(get("/v3/api-docs/learner"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/workspaces/{workspaceId}/notices']").exists())
        .andExpect(jsonPath("$.paths['/api/workspace-notices/{noticeId}']").exists())
        .andExpect(jsonPath("$.paths['/api/workspace-notices/{noticeId}/read']").exists())
        .andExpect(jsonPath("$.paths['/api/workspaces/{workspaceId}/integrations']").exists());

    mockMvc
        .perform(get("/v3/api-docs/admin"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/admin/recommendation-settings']").exists())
        .andExpect(jsonPath("$.paths['/api/admin/experiments/results']").exists())
        .andExpect(jsonPath("$.paths['/api/admin/analytics/dashboard']").exists());
  }

  @Test
  void workspaceNoticeFlowUsesJwtPrincipalAndDoesNotRequireWorkspaceIdOnRead() throws Exception {
    long noticeId = createNotice("Deploy notice", "Deploy starts at 10 PM.");

    mockMvc
        .perform(
            get("/api/workspaces/{workspaceId}/notices", WORKSPACE_ID)
                .with(authentication(learnerAuthentication(LEARNER_ID))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SUCCESS"))
        .andExpect(jsonPath("$.data.length()").value(1));

    mockMvc
        .perform(
            get("/api/workspace-notices/{noticeId}", noticeId)
                .with(authentication(learnerAuthentication(LEARNER_ID))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(noticeId))
        .andExpect(jsonPath("$.data.workspaceId").value(WORKSPACE_ID));

    mockMvc
        .perform(
            patch("/api/workspace-notices/{noticeId}", noticeId)
                .with(authentication(learnerAuthentication(LEARNER_ID)))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("title", "Updated notice", "content", "Updated content."))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.title").value("Updated notice"));

    mockMvc
        .perform(
            get("/api/workspaces/{workspaceId}/notices/unread/count", WORKSPACE_ID)
                .with(authentication(learnerAuthentication(LEARNER_ID))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").value(1));

    mockMvc
        .perform(
            post("/api/workspace-notices/{noticeId}/read", noticeId)
                .with(authentication(learnerAuthentication(LEARNER_ID))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SUCCESS"));

    mockMvc
        .perform(
            post("/api/workspace-notices/{noticeId}/read", noticeId)
                .with(authentication(learnerAuthentication(LEARNER_ID))))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            get("/api/workspaces/{workspaceId}/notices/unread/count", WORKSPACE_ID)
                .with(authentication(learnerAuthentication(LEARNER_ID))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").value(0));

    mockMvc
        .perform(
            get("/api/workspaces/{workspaceId}/notices/unread/count", WORKSPACE_ID)
                .with(authentication(learnerAuthentication(OTHER_LEARNER_ID))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").value(1));

    mockMvc
        .perform(
            delete("/api/workspace-notices/{noticeId}", noticeId)
                .with(authentication(learnerAuthentication(LEARNER_ID))))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            get("/api/workspaces/{workspaceId}/notices/unread/count", WORKSPACE_ID)
                .with(authentication(learnerAuthentication(OTHER_LEARNER_ID))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").value(0));
  }

  @Test
  void integrationAndAdminOperationApisRemainSwaggerTestableWithAuthentication() throws Exception {
    mockMvc
        .perform(
            get("/api/workspaces/{workspaceId}/integrations", WORKSPACE_ID)
                .with(authentication(learnerAuthentication(LEARNER_ID))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SUCCESS"))
        .andExpect(jsonPath("$.data.length()").value(1))
        .andExpect(jsonPath("$.data[0].provider").value("GITHUB"));

    mockMvc
        .perform(
            patch("/api/workspaces/{workspaceId}/integrations/{provider}", WORKSPACE_ID, "GITHUB")
                .with(authentication(learnerAuthentication(LEARNER_ID)))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("isActive", true))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SUCCESS"));

    mockMvc
        .perform(
            get("/api/admin/recommendation-settings").with(authentication(adminAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(greaterThanOrEqualTo(1)))
        .andExpect(
            jsonPath("$.data[*].settingKey").value(hasItem("algorithm.weight.recent_activity")));

    mockMvc
        .perform(
            patch("/api/admin/recommendation-settings")
                .with(authentication(adminAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json(
                        Map.of(
                            "settings",
                            java.util.List.of(
                                Map.of(
                                    "key", "algorithm.weight.recent_activity",
                                    "value", "0.9"))))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SUCCESS"));

    mockMvc
        .perform(get("/api/admin/experiments/results").with(authentication(adminAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(1));

    mockMvc
        .perform(
            get("/api/admin/experiments/{experimentId}/results", "EXP-2026-001")
                .with(authentication(adminAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.experimentId").value("EXP-2026-001"));

    mockMvc
        .perform(get("/api/admin/analytics/dashboard").with(authentication(adminAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalUsers").value(greaterThanOrEqualTo(1)));
  }

  private long createNotice(String title, String content) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/workspaces/{workspaceId}/notices", WORKSPACE_ID)
                    .with(authentication(learnerAuthentication(LEARNER_ID)))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json(Map.of("title", title, "content", content))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SUCCESS"))
            .andReturn();

    return objectMapper
        .readTree(result.getResponse().getContentAsString())
        .get("data")
        .get("id")
        .asLong();
  }

  private String json(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }

  private UsernamePasswordAuthenticationToken learnerAuthentication(Long userId) {
    return new UsernamePasswordAuthenticationToken(
        userId, null, AuthorityUtils.createAuthorityList("ROLE_LEARNER"));
  }

  private UsernamePasswordAuthenticationToken adminAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        ADMIN_ID, null, AuthorityUtils.createAuthorityList("ROLE_ADMIN"));
  }
}
