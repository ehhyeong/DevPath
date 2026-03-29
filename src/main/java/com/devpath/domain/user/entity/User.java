package com.devpath.domain.user.entity;

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

  @Column(name = "is_active", nullable = false)
  private Boolean isActive = true;

  @Enumerated(EnumType.STRING)
  @Column(name = "instructor_status", length = 20)
  private InstructorStatus instructorStatus;

  @Column(name = "instructor_grade", length = 20)
  private String instructorGrade;

  @Builder
  public User(String email, String password, String name, UserRole role) {
    this.email = email;
    this.password = password;
    this.name = name;
    this.role = role == null ? UserRole.ROLE_LEARNER : role;
    this.isActive = true;
  }

  public void updateLastLoginAt() {
    this.lastLoginAt = LocalDateTime.now();
  }

  public void deactivate() {
    this.isActive = false;
  }

  public void restrict() {
    this.isActive = false;
  }

  public void restore() {
    this.isActive = true;
  }

  public void withdraw() {
    this.isActive = false;
  }

  public void approveInstructor() {
    this.instructorStatus = InstructorStatus.APPROVED;
  }

  public void changeInstructorGrade(String grade) {
    this.instructorGrade = grade;
  }
}
