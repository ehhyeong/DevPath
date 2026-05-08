package com.devpath.domain.resume.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "career_profile_projects")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareerProfileProject {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "career_profile_project_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "career_profile_id", nullable = false)
  private CareerProfile careerProfile;

  @Column(name = "project_id")
  private Long projectId;

  @Column(nullable = false, length = 150)
  private String title;

  @Column(nullable = false, length = 100)
  private String role;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String description;

  @Column(name = "skills", columnDefinition = "TEXT")
  private String skills;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private CareerProfileProject(
      CareerProfile careerProfile,
      Long projectId,
      String title,
      String role,
      String description,
      String skills) {
    this.careerProfile = careerProfile;
    this.projectId = projectId;
    this.title = title;
    this.role = role;
    this.description = description;
    this.skills = skills;
    this.isDeleted = false;
  }

  public void delete() {
    this.isDeleted = true;
  }
}
