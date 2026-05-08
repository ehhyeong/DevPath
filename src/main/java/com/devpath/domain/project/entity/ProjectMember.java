package com.devpath.domain.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "project_member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProjectMember {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "project_id", nullable = false)
  private Long projectId;

  @Column(name = "learner_id", nullable = false)
  private Long learnerId;

  @Enumerated(EnumType.STRING)
  @Column(name = "role_type", nullable = false)
  private ProjectRoleType roleType;

  @Column(name = "joined_at", updatable = false)
  @Builder.Default
  private LocalDateTime joinedAt = LocalDateTime.now();

  public void changeRole(ProjectRoleType newRole) {
    this.roleType = newRole;
  }
}
