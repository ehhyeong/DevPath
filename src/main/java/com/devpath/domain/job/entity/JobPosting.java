package com.devpath.domain.job.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "job_postings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPosting {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "job_posting_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(name = "job_role", nullable = false, length = 100)
  private String jobRole;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String description;

  @Column(name = "required_skills", columnDefinition = "TEXT")
  private String requiredSkills;

  @Column(length = 150)
  private String region;

  @Column(name = "career_level", length = 50)
  private String careerLevel;

  @Column(name = "source_url", length = 1000)
  private String sourceUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private JobSource source;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private JobPostingStatus status;

  @Column(name = "deadline")
  private LocalDate deadline;

  @Column(name = "external_job_id", length = 150)
  private String externalJobId;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private JobPosting(
      Company company,
      String title,
      String jobRole,
      String description,
      String requiredSkills,
      String region,
      String careerLevel,
      String sourceUrl,
      JobSource source,
      JobPostingStatus status,
      LocalDate deadline,
      String externalJobId) {
    this.company = company;
    this.title = title;
    this.jobRole = jobRole;
    this.description = description;
    this.requiredSkills = requiredSkills;
    this.region = region;
    this.careerLevel = careerLevel;
    this.sourceUrl = sourceUrl;
    this.source = source;
    this.status = status;
    this.deadline = deadline;
    this.externalJobId = externalJobId;
    this.isDeleted = false;
  }

  public void update(
      String title,
      String jobRole,
      String description,
      String requiredSkills,
      String region,
      String careerLevel,
      String sourceUrl,
      JobSource source,
      JobPostingStatus status,
      LocalDate deadline,
      String externalJobId) {
    this.title = title;
    this.jobRole = jobRole;
    this.description = description;
    this.requiredSkills = requiredSkills;
    this.region = region;
    this.careerLevel = careerLevel;
    this.sourceUrl = sourceUrl;
    this.source = source;
    this.status = status;
    this.deadline = deadline;
    this.externalJobId = externalJobId;
  }

  public void close() {
    this.status = JobPostingStatus.CLOSED;
  }

  public void delete() {
    this.isDeleted = true;
    this.status = JobPostingStatus.CLOSED;
  }

  public void restore() {
    this.isDeleted = false;
  }
}
