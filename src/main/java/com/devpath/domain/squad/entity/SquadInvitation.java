package com.devpath.domain.squad.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "squad_invitations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
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

  @Column(name = "invitee_id", nullable = false)
  private Long inviteeId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private SquadInvitationStatus status;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  public void accept() {
    this.status = SquadInvitationStatus.ACCEPTED;
  }

  public void reject() {
    this.status = SquadInvitationStatus.REJECTED;
  }
}
