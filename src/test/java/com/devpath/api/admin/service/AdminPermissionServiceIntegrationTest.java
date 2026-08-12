package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.admin.dto.permission.AdminRoleAssignmentRequest;
import com.devpath.api.admin.dto.permission.InstructorGradeUpdateRequest;
import com.devpath.api.admin.dto.permission.RoleCreateRequest;
import com.devpath.api.admin.dto.permission.RoleResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.security.AdminAuthorityService;
import com.devpath.common.security.TokenRedisService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({AdminPermissionService.class, AdminAuthorityService.class})
class AdminPermissionServiceIntegrationTest {

  @MockitoBean private TokenRedisService tokenRedisService;

  @Autowired private AdminPermissionService adminPermissionService;
  @Autowired private AdminAuthorityService adminAuthorityService;
  @Autowired private UserRepository userRepository;
  @Autowired private EntityManager entityManager;

  @Test
  void createsAndUpdatesAdminRolePermissions() {
    RoleResponse created =
        adminPermissionService.createRole(
            roleRequest(
                "ROLE_ADMIN_SUPPORT",
                "고객 지원",
                List.of("ADMIN_NOTICE_WRITE", "ADMIN_MODERATION_RESOLVE")));

    RoleResponse updated =
        adminPermissionService.updateRole(
            created.getId(),
            roleRequest("ROLE_ADMIN_SUPPORT", "운영 지원", List.of("ADMIN_NOTICE_WRITE")));

    assertThat(updated.getDescription()).isEqualTo("운영 지원");
    assertThat(updated.getPermissionCodes()).containsExactly("ADMIN_NOTICE_WRITE");
    assertThat(adminPermissionService.getRoles())
        .extracting(RoleResponse::getRoleName)
        .contains("ROLE_ADMIN_SUPPORT");
  }

  @Test
  void changesOnlyActiveInstructorGrade() {
    User instructor =
        userRepository.save(
            User.builder()
                .email("grade-instructor@devpath.com")
                .password("encoded")
                .name("등급 강사")
                .role(UserRole.ROLE_INSTRUCTOR)
                .build());

    adminPermissionService.changeInstructorGrade(
        instructor.getId(), instructorGradeRequest("premium"));
    entityManager.flush();
    entityManager.clear();

    assertThat(userRepository.findById(instructor.getId()).orElseThrow().getInstructorGrade())
        .isEqualTo("PREMIUM");
    assertThat(adminPermissionService.getUserPermission(instructor.getId()).getRoles())
        .containsExactly("ROLE_INSTRUCTOR");
  }

  @Test
  void assignsAndClearsAdminRoleWhenRoleIsDeleted() {
    User admin =
        userRepository.save(
            User.builder()
                .email("role-admin@devpath.com")
                .password("encoded")
                .name("권한 관리자")
                .role(UserRole.ROLE_ADMIN)
                .build());
    RoleResponse role =
        adminPermissionService.createRole(
            roleRequest("ROLE_ADMIN_NOTICE", "공지 운영", List.of("ADMIN_NOTICE_WRITE")));
    AdminRoleAssignmentRequest assignment = newInstance(AdminRoleAssignmentRequest.class);
    ReflectionTestUtils.setField(assignment, "roleId", role.getId());

    var permission = adminPermissionService.assignAdminRole(admin.getId(), assignment);

    assertThat(permission.getAdminRoleId()).isEqualTo(role.getId());
    assertThat(permission.getPermissionCodes()).containsExactly("ADMIN_NOTICE_WRITE");
    assertThat(adminAuthorityService.resolveAuthorities(admin))
        .containsExactly("ROLE_ADMIN", "ADMIN_NOTICE_WRITE");

    adminPermissionService.deleteRole(role.getId());
    entityManager.flush();
    entityManager.clear();

    assertThat(userRepository.findById(admin.getId()).orElseThrow().getAdminRoleId()).isNull();
    assertThat(adminPermissionService.getRoles())
        .extracting(RoleResponse::getId)
        .doesNotContain(role.getId());
  }

  @Test
  void clearsAnAssignedAdminRoleWithoutDeletingTheRole() {
    User admin =
        userRepository.save(
            User.builder()
                .email("clear-role-admin@devpath.com")
                .password("encoded")
                .name("역할 해제 관리자")
                .role(UserRole.ROLE_ADMIN)
                .build());
    RoleResponse role =
        adminPermissionService.createRole(
            roleRequest("ROLE_ADMIN_FINANCE", "정산 운영", List.of("ADMIN_FINANCE_MANAGE")));
    AdminRoleAssignmentRequest assignment = newInstance(AdminRoleAssignmentRequest.class);
    ReflectionTestUtils.setField(assignment, "roleId", role.getId());
    adminPermissionService.assignAdminRole(admin.getId(), assignment);

    var cleared = adminPermissionService.clearAdminRole(admin.getId());
    entityManager.flush();
    entityManager.clear();

    assertThat(cleared.getAdminRoleId()).isNull();
    assertThat(userRepository.findById(admin.getId()).orElseThrow().getAdminRoleId()).isNull();
    assertThat(adminAuthorityService.resolveAuthorities(admin)).containsExactly("ROLE_ADMIN");
    assertThat(adminPermissionService.getRoles())
        .extracting(RoleResponse::getId)
        .contains(role.getId());
  }

  @Test
  void rejectsPermissionCodesThatAreNotConnectedToSecurityRules() {
    assertThatThrownBy(
            () ->
                adminPermissionService.createRole(
                    roleRequest("ROLE_ADMIN_UNKNOWN", "잘못된 권한", List.of("ADMIN_ANYTHING"))))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INVALID_INPUT);
  }

  private RoleCreateRequest roleRequest(
      String roleName, String description, List<String> permissionCodes) {
    RoleCreateRequest request = newInstance(RoleCreateRequest.class);
    ReflectionTestUtils.setField(request, "roleName", roleName);
    ReflectionTestUtils.setField(request, "description", description);
    ReflectionTestUtils.setField(request, "permissionCodes", permissionCodes);
    return request;
  }

  private InstructorGradeUpdateRequest instructorGradeRequest(String grade) {
    InstructorGradeUpdateRequest request = newInstance(InstructorGradeUpdateRequest.class);
    ReflectionTestUtils.setField(request, "grade", grade);
    return request;
  }

  private <T> T newInstance(Class<T> type) {
    try {
      var constructor = type.getDeclaredConstructor();
      constructor.setAccessible(true);
      return constructor.newInstance();
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException("Failed to create test request instance", exception);
    }
  }
}
