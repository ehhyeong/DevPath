package com.devpath.domain.study.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "study_group")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class StudyGroup {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StudyGroupStatus status;

  @Column(name = "max_members", nullable = false)
  private Integer maxMembers;

  @Column(name = "planned_end_date")
  private LocalDateTime plannedEndDate;

  @Column(name = "is_deleted", nullable = false)
  @Builder.Default
  private Boolean isDeleted = false;

  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @PrePersist
  protected void onCreate() {
    this.createdAt = LocalDateTime.now();
  }

  // 비즈니스 메서드 (Setter 대체)
  public void updateInfo(String name, String description, Integer maxMembers) {
    this.name = name;
    this.description = description;
    this.maxMembers = maxMembers;
  }

  public void changeStatus(StudyGroupStatus status) {
    this.status = status;
  }

  public void markAsDeleted() {
    this.isDeleted = true;
  }
}
