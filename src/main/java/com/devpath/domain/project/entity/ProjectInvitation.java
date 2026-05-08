package com.devpath.domain.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "project_invitation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProjectInvitation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "project_id", nullable = false)
  private Long projectId;

  @Column(name = "inviter_id", nullable = false)
  private Long inviterId;

  @Column(name = "invitee_id", nullable = false)
  private Long inviteeId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ProjectInvitationStatus status;

  @Column(name = "created_at", updatable = false)
  @Builder.Default
  private LocalDateTime createdAt = LocalDateTime.now();

  public void accept() {
    this.status = ProjectInvitationStatus.ACCEPTED;
  }

  public void reject() {
    this.status = ProjectInvitationStatus.REJECTED;
  }
}
