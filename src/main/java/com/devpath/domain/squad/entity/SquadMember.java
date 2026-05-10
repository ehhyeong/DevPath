package com.devpath.domain.squad.entity;

import com.devpath.domain.user.entity.User;
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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "squad_members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SquadMember {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "squad_member_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "squad_id", nullable = false)
  private Squad squad;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private SquadRole role;

  @CreationTimestamp
  @Column(name = "joined_at", updatable = false)
  private LocalDateTime joinedAt;

  @Column(name = "is_deleted", nullable = false, columnDefinition = "boolean default false")
  private Boolean isDeleted = false;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  @Builder
  public SquadMember(Squad squad, User user, SquadRole role) {
    this.squad = squad;
    this.user = user;
    this.role = role;
    this.isDeleted = false;
  }

  public void changeRole(SquadRole newRole) {
    this.role = newRole;
  }

  public void delete() {
    this.isDeleted = true;
    this.deletedAt = LocalDateTime.now();
  }
}
