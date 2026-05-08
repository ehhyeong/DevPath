package com.devpath.api.instructor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(
    name = "instructor_comment_like",
    uniqueConstraints = @UniqueConstraint(columnNames = {"comment_id", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class InstructorCommentLike {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "comment_id", nullable = false)
  private Long commentId;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @CreatedDate private LocalDateTime createdAt;
}
