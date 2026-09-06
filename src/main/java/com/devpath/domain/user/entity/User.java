package com.devpath.domain.user.entity;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "user_id")
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String password;

  @Column(nullable = false, length = 100)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "role_name", nullable = false, length = 50)
  private UserRole role;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "last_login_at")
  private LocalDateTime lastLoginAt;

  @Column(name = "token_invalidated_at")
  private LocalDateTime tokenInvalidatedAt;

  @Column(name = "is_active", nullable = false)
  private Boolean isActive = true;

  @Enumerated(EnumType.STRING)
  @Column(name = "account_status", length = 20)
  private AccountStatus accountStatus = AccountStatus.ACTIVE;

  @Enumerated(EnumType.STRING)
  @Column(name = "instructor_status", length = 20)
  private InstructorStatus instructorStatus;

  @Column(name = "instructor_grade", length = 20)
  private String instructorGrade;

  @Column(name = "admin_role_id")
  private Long adminRoleId;

  @Column(name = "is_super_admin", nullable = false, columnDefinition = "boolean default false")
  private Boolean isSuperAdmin = false;

  @Builder
  public User(String email, String password, String name, UserRole role) {
    this.email = email;
    this.password = password;
    this.name = name;
    this.role = role == null ? UserRole.ROLE_LEARNER : role;
    this.isActive = true;
    this.isSuperAdmin = false;
  }

  public void updateLastLoginAt() {
    this.lastLoginAt = LocalDateTime.now();
  }

  public void updateName(String name) {
    this.name = name;
  }

  public void changePassword(String encodedPassword) {
    this.password = encodedPassword;
  }

  public void restrict() {
    if (this.accountStatus == AccountStatus.RESTRICTED) {
      throw new CustomException(ErrorCode.ACCOUNT_ALREADY_RESTRICTED);
    }
    this.isActive = false;
    this.accountStatus = AccountStatus.RESTRICTED;
    invalidateTokens();
  }

  public void deactivate() {
    this.isActive = false;
    this.accountStatus = AccountStatus.DEACTIVATED;
    invalidateTokens();
  }

  public void restore() {
    this.isActive = true;
    this.accountStatus = AccountStatus.ACTIVE;
  }

  // 탈퇴 계정은 재로그인 경로를 막고 식별 정보를 즉시 파기해 같은 이메일로 재가입할 수 있게 한다.
  public void withdraw() {
    this.isActive = false;
    this.accountStatus = AccountStatus.WITHDRAWN;
    this.email = "withdrawn_" + this.id + "@devpath.invalid";
    this.name = "탈퇴한 회원";
    invalidateTokens();
  }

  public boolean canAuthenticate() {
    return Boolean.TRUE.equals(this.isActive) && this.accountStatus == AccountStatus.ACTIVE;
  }

  private void invalidateTokens() {
    this.tokenInvalidatedAt = LocalDateTime.now();
  }

  public void approveInstructor() {
    this.instructorStatus = InstructorStatus.APPROVED;
  }

  public void changeInstructorGrade(String grade) {
    this.instructorGrade = grade;
  }

  public void assignAdminRole(Long adminRoleId) {
    if (this.role != UserRole.ROLE_ADMIN) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
    this.adminRoleId = adminRoleId;
    invalidateTokens();
  }

  public void clearAdminRole() {
    this.adminRoleId = null;
    invalidateTokens();
  }

  public boolean hasSuperAdminAccess() {
    return Boolean.TRUE.equals(this.isSuperAdmin);
  }
}
