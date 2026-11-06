package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceAiDesign;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class WorkspaceDeletionApiIntegrationTest {

  private static final long OWNER = 987001L;
  private static final long MEMBER = 987002L;

  @Autowired private MockMvc mockMvc;
  @Autowired private WorkspaceRepository workspaces;
  @Autowired private WorkspaceMemberRepository members;
  @Autowired private WorkspaceAiDesignRepository designs;
  private Long workspaceId;

  @BeforeEach
  void setUp() {
    workspaceId =
        workspaces
            .save(
                Workspace.builder()
                    .ownerId(OWNER)
                    .name("AI 생성 삭제 검증")
                    .type(WorkspaceType.SQUAD)
                    .build())
            .getId();
    members.saveAll(
        List.of(
            WorkspaceMember.builder().workspaceId(workspaceId).learnerId(OWNER).build(),
            WorkspaceMember.builder().workspaceId(workspaceId).learnerId(MEMBER).build()));
    designs.save(new WorkspaceAiDesign(workspaceId, UUID.randomUUID(), "{}"));
  }

  @Test
  void aiWorkspaceOwnerDeletesForEveryMemberWithoutLegacyProject() throws Exception {
    mockMvc
        .perform(get("/api/workspaces/hub/projects").with(authentication(user(OWNER))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].owner").value(true))
        .andExpect(jsonPath("$.data[0].canDelete").value(true));

    mockMvc
        .perform(
            delete("/api/workspaces/{id}/settings", workspaceId).with(authentication(user(OWNER))))
        .andExpect(status().isOk());

    for (long userId : List.of(OWNER, MEMBER)) {
      mockMvc
          .perform(get("/api/workspaces/hub/projects").with(authentication(user(userId))))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data").isEmpty());
      mockMvc
          .perform(
              get("/api/workspaces/{id}/dashboard", workspaceId).with(authentication(user(userId))))
          .andExpect(status().isNotFound());
    }
  }

  @Test
  void ownerCannotLeaveMembershipInsteadOfDeletingTheWorkspace() throws Exception {
    mockMvc
        .perform(
            delete("/api/workspaces/hub/projects/{id}/membership", workspaceId)
                .with(authentication(user(OWNER))))
        .andExpect(status().isForbidden());
    assertThat(members.findAllByWorkspaceId(workspaceId)).hasSize(2);
    assertThat(workspaces.findByIdAndIsDeletedFalse(workspaceId)).isPresent();
  }

  @Test
  void regularMemberCannotDeleteTheWorkspace() throws Exception {
    mockMvc
        .perform(get("/api/workspaces/hub/projects").with(authentication(user(MEMBER))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].canDelete").value(false));
    mockMvc
        .perform(
            delete("/api/workspaces/{id}/settings", workspaceId).with(authentication(user(MEMBER))))
        .andExpect(status().isForbidden());
    assertThat(workspaces.findByIdAndIsDeletedFalse(workspaceId)).isPresent();
  }

  private UsernamePasswordAuthenticationToken user(long userId) {
    return new UsernamePasswordAuthenticationToken(
        userId, null, AuthorityUtils.createAuthorityList("ROLE_LEARNER"));
  }
}
