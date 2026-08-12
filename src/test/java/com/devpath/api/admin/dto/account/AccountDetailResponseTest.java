package com.devpath.api.admin.dto.account;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.InstructorStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import org.junit.jupiter.api.Test;

class AccountDetailResponseTest {

  @Test
  void preservesRestrictedAccountStatus() {
    User user = createUser();
    user.restrict();

    AccountDetailResponse response = AccountDetailResponse.from(user);

    assertThat(response.getAccountStatus()).isEqualTo(AccountStatus.RESTRICTED);
  }

  @Test
  void preservesDeactivatedAndWithdrawnAccountStatus() {
    User deactivatedUser = createUser();
    deactivatedUser.deactivate();
    User withdrawnUser = createUser();
    withdrawnUser.withdraw();

    assertThat(AccountDetailResponse.from(deactivatedUser).getAccountStatus())
        .isEqualTo(AccountStatus.DEACTIVATED);
    assertThat(AccountDetailResponse.from(withdrawnUser).getAccountStatus())
        .isEqualTo(AccountStatus.WITHDRAWN);
  }

  @Test
  void includesInstructorApprovalFields() {
    User user = createUser();
    user.approveInstructor();
    user.changeInstructorGrade("STANDARD");

    AccountDetailResponse response = AccountDetailResponse.from(user);

    assertThat(response.getInstructorStatus()).isEqualTo(InstructorStatus.APPROVED);
    assertThat(response.getInstructorGrade()).isEqualTo("STANDARD");
  }

  private User createUser() {
    return User.builder()
        .email("instructor@devpath.com")
        .password("encoded-password")
        .name("강사 계정")
        .role(UserRole.ROLE_INSTRUCTOR)
        .build();
  }
}
