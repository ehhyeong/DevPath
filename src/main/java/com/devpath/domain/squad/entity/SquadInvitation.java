package com.devpath.domain.squad.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(
    name = "squad_invitations",
    indexes = {
      @Index(name = "idx_squad_invitation_token", columnList = "invitation_token"),
      @Index(name = "idx_squad_invitation_status", columnList = "status")
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SquadInvitation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "squad_invitation_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "squad_id", nullable = false)
  private Squad squad;

  @Column(name = "inviter_id", nullable = false)
  private Long inviterId;

  @Column(name = "invitee_id")
  private Long inviteeId;

  @Column(name = "invite_email", length = 255)
  private String inviteEmail;

  @Column(name = "message", length = 500)
  private String message;

  @Column(name = "invitation_token", unique = true, length = 100)
  private String invitationToken;

  @Column(name = "expires_at")
  private LocalDateTime expiresAt;

  @Column(name = "accepted_at")
  private LocalDateTime acceptedAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private SquadInvitationStatus status;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @Builder
  public SquadInvitation(
      Squad squad,
      Long inviterId,
      Long inviteeId,
      String inviteEmail,
      String message,
      String invitationToken,
      LocalDateTime expiresAt,
      SquadInvitationStatus status) {
    this.squad = squad;
    this.inviterId = inviterId;
    this.inviteeId = inviteeId;
    this.inviteEmail = inviteEmail;
    this.message = message;
    this.invitationToken = invitationToken;
    this.expiresAt = expiresAt;
    this.status = status == null ? SquadInvitationStatus.PENDING : status;
  }

  public void accept(Long inviteeId) {
    this.inviteeId = inviteeId;
    this.status = SquadInvitationStatus.ACCEPTED;
    this.acceptedAt = LocalDateTime.now();
  }

  public void accept() {
    this.status = SquadInvitationStatus.ACCEPTED;
    this.acceptedAt = LocalDateTime.now();
  }

  public void reject() {
    this.status = SquadInvitationStatus.REJECTED;
  }

  public void expire() {
    this.status = SquadInvitationStatus.EXPIRED;
  }

  public boolean isExpired(LocalDateTime now) {
    return expiresAt != null && expiresAt.isBefore(now);
  }
}
