package com.devpath.domain.course.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "courses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Course {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "course_id")
  private Long courseId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "instructor_id", nullable = false)
  private User instructor;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 255)
  private String subtitle;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "thumbnail_url", length = 500)
  private String thumbnailUrl;

  @Column(name = "trailer_url", length = 500)
  private String trailerUrl;

  @Column(nullable = false)
  private Integer price;

  @Column(name = "discount_price")
  private Integer discountPrice;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private CourseDifficulty difficulty;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private CourseStatus status;

  @Builder.Default
  @ElementCollection
  @CollectionTable(name = "course_prerequisites", joinColumns = @JoinColumn(name = "course_id"))
  @Column(name = "content", nullable = false, length = 255)
  private List<String> prerequisites = new ArrayList<>();

  @Builder.Default
  @ElementCollection
  @CollectionTable(name = "course_job_relevance", joinColumns = @JoinColumn(name = "course_id"))
  @Column(name = "content", nullable = false, length = 255)
  private List<String> jobRelevance = new ArrayList<>();

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;
}
