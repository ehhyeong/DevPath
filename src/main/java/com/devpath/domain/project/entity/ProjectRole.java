package com.devpath.domain.project.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "project_role")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProjectRole {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "project_id", nullable = false)
  private Long projectId;

  @Enumerated(EnumType.STRING)
  @Column(name = "role_type", nullable = false)
  private ProjectRoleType roleType;

  @Column(name = "required_count", nullable = false)
  private Integer requiredCount;

  public void updateCount(Integer requiredCount) {
    this.requiredCount = requiredCount;
  }
}
