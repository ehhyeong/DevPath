package com.devpath.domain.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "project_proof_submission")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProjectProofSubmission {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "project_id", nullable = false)
  private Long projectId;

  @Column(name = "submitter_id", nullable = false)
  private Long submitterId;

  @Column(name = "proof_card_ref_id", nullable = false)
  private String proofCardRefId;

  @Column(name = "submitted_at", updatable = false)
  @Builder.Default
  private LocalDateTime submittedAt = LocalDateTime.now();
}
