package com.devpath.domain.resume.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "career_profile_versions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareerProfileVersion {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "career_profile_version_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "career_profile_id", nullable = false)
  private CareerProfile careerProfile;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "career_profile_snapshot_id", nullable = false)
  private CareerProfileSnapshot snapshot;

  @Column(name = "version_number", nullable = false)
  private Integer versionNumber;

  @Column(length = 500)
  private String description;

  @Lob
  @Column(name = "version_content", nullable = false, columnDefinition = "TEXT")
  private String versionContent;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Builder
  private CareerProfileVersion(
      CareerProfile careerProfile,
      CareerProfileSnapshot snapshot,
      Integer versionNumber,
      String description,
      String versionContent) {
    this.careerProfile = careerProfile;
    this.snapshot = snapshot;
    this.versionNumber = versionNumber;
    this.description = description;
    this.versionContent = versionContent;
  }
}
