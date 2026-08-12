package com.devpath.domain.job.entity;

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
@Table(name = "companies")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Company {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "company_id")
  private Long id;

  @Column(nullable = false, length = 150)
  private String name;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "website_url", length = 1000)
  private String websiteUrl;

  @Column(name = "logo_url", length = 1000)
  private String logoUrl;

  @Column(length = 100)
  private String industry;

  @Column(length = 150)
  private String location;

  @Enumerated(EnumType.STRING)
  @Column(name = "verification_status", nullable = false, length = 20)
  private CompanyVerificationStatus verificationStatus;

  @Column(name = "verification_memo", length = 500)
  private String verificationMemo;

  @Column(name = "verified_at")
  private LocalDateTime verifiedAt;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private Company(
      String name,
      String description,
      String websiteUrl,
      String logoUrl,
      String industry,
      String location) {
    this.name = name;
    this.description = description;
    this.websiteUrl = websiteUrl;
    this.logoUrl = logoUrl;
    this.industry = industry;
    this.location = location;
    this.verificationStatus = CompanyVerificationStatus.PENDING;
    this.isDeleted = false;
  }

  public void updateProfile(
      String name,
      String description,
      String websiteUrl,
      String logoUrl,
      String industry,
      String location) {
    this.name = name;
    this.description = description;
    this.websiteUrl = websiteUrl;
    this.logoUrl = logoUrl;
    this.industry = industry;
    this.location = location;
  }

  public void changeVerificationStatus(CompanyVerificationStatus status, String memo) {
    this.verificationStatus = status;
    this.verificationMemo = memo;
    this.verifiedAt = LocalDateTime.now();
  }

  public void delete() {
    this.isDeleted = true;
  }

  public void restore() {
    this.isDeleted = false;
  }
}
