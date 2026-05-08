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
@Table(name = "career_profile_skills")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareerProfileSkill {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "career_profile_skill_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "career_profile_id", nullable = false)
  private CareerProfile careerProfile;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(name = "level", length = 50)
  private String level;

  @Column(name = "self_reported", nullable = false)
  private Boolean selfReported;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private CareerProfileSkill(
      CareerProfile careerProfile, String name, String level, Boolean selfReported) {
    this.careerProfile = careerProfile;
    this.name = name;
    this.level = level;
    this.selfReported = selfReported;
    this.isDeleted = false;
  }

  public void delete() {
    this.isDeleted = true;
  }
}
