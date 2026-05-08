package com.devpath.domain.resume.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "career_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareerProfile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "career_profile_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "target_role", nullable = false, length = 100)
  private String targetRole;

  @Column(nullable = false, length = 150)
  private String headline;

  @Column(columnDefinition = "TEXT")
  private String summary;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private CareerProfile(User user, String targetRole, String headline, String summary) {
    this.user = user;
    this.targetRole = targetRole;
    this.headline = headline;
    this.summary = summary;
    this.isDeleted = false;
  }

  public void update(String targetRole, String headline, String summary) {
    this.targetRole = targetRole;
    this.headline = headline;
    this.summary = summary;
  }

  public void delete() {
    this.isDeleted = true;
  }
}
