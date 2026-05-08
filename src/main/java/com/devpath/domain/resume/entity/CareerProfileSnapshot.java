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
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "career_profile_snapshots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareerProfileSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "career_profile_snapshot_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "career_profile_id", nullable = false)
  private CareerProfile careerProfile;

  @Lob
  @Column(name = "snapshot_content", nullable = false, columnDefinition = "TEXT")
  private String snapshotContent;

  @Column(length = 500)
  private String memo;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Builder
  private CareerProfileSnapshot(CareerProfile careerProfile, String snapshotContent, String memo) {
    this.careerProfile = careerProfile;
    this.snapshotContent = snapshotContent;
    this.memo = memo;
  }
}
