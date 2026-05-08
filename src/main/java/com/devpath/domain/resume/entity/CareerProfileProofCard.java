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
@Table(name = "career_profile_proof_cards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareerProfileProofCard {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "career_profile_proof_card_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "career_profile_id", nullable = false)
  private CareerProfile careerProfile;

  @Column(name = "proof_card_id", nullable = false)
  private Long proofCardId;

  @Column(nullable = false, length = 150)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String summary;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private CareerProfileProofCard(
      CareerProfile careerProfile, Long proofCardId, String title, String summary) {
    this.careerProfile = careerProfile;
    this.proofCardId = proofCardId;
    this.title = title;
    this.summary = summary;
    this.isDeleted = false;
  }

  public void exclude() {
    this.isDeleted = true;
  }
}
