package com.devpath.domain.project.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity(name = "ProjectMentoringApplication")
@Table(name = "mentoring_application")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class MentoringApplication {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "project_id", nullable = false)
  private Long projectId;

  @Column(name = "mentor_id", nullable = false)
  private Long mentorId;

  @Column(columnDefinition = "TEXT")
  private String message;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private MentoringApplicationStatus status;

  @Column(name = "created_at", updatable = false)
  @Builder.Default
  private LocalDateTime createdAt = LocalDateTime.now();
}
