package com.devpath.api.admin;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.devpath.api.admin.service.AdminCourseGovernanceService;
import com.devpath.api.admin.service.AdminDashboardService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false",
      "app.upload.dir=./build/security-test-uploads"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminAuthorizationIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @MockitoBean private AdminDashboardService adminDashboardService;
  @MockitoBean private AdminCourseGovernanceService adminCourseGovernanceService;

  @Test
  void allowsOnlyThePermissionAssignedToALimitedAdmin() throws Exception {
    when(adminDashboardService.getOverview()).thenReturn(null);

    mockMvc
        .perform(
            get("/api/admin/dashboard/overview")
                .with(authentication(admin("ADMIN_DASHBOARD_READ"))))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/admin/accounts").with(authentication(admin("ADMIN_DASHBOARD_READ"))))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(get("/api/admin/settlements").with(authentication(admin("ADMIN_DASHBOARD_READ"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void superAdminCanAccessEveryAdminArea() throws Exception {
    when(adminDashboardService.getOverview()).thenReturn(null);

    mockMvc
        .perform(get("/api/admin/dashboard/overview").with(authentication(admin("ADMIN_SUPER"))))
        .andExpect(status().isOk());
  }

  @Test
  void courseReviewerCanOpenReviewDetailButUnrelatedAdminCannot() throws Exception {
    when(adminCourseGovernanceService.getCourseReview(12L, 1L)).thenReturn(null);

    mockMvc
        .perform(
            get("/api/admin/courses/12/review")
                .with(authentication(admin("ADMIN_MODERATION_RESOLVE"))))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            get("/api/admin/courses/12/review").with(authentication(admin("ADMIN_DASHBOARD_READ"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void directHlsUploadIsDeniedWhileOtherPublicUploadsRemainPublic() throws Exception {
    Path publicFile = Path.of("build", "security-test-uploads", "public-thumbnail.txt");
    Files.createDirectories(publicFile.getParent());
    Files.writeString(publicFile, "public thumbnail");

    mockMvc
        .perform(get("/uploads/courses/1/lesson-video/sample_hls/index.m3u8"))
        .andExpect(status().isUnauthorized());
    try {
      mockMvc.perform(get("/uploads/public-thumbnail.txt")).andExpect(status().isOk());
    } finally {
      Files.deleteIfExists(publicFile);
    }
  }

  private UsernamePasswordAuthenticationToken admin(String authority) {
    return new UsernamePasswordAuthenticationToken(
        1L, null, AuthorityUtils.createAuthorityList("ROLE_ADMIN", authority));
  }
}
