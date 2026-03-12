package com.devpath.domain.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "user_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "profile_id")
  private Long id;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false, unique = true)
  private User user;

  @Column(name = "profile_image", length = 500)
  private String profileImage;

  @Column(name = "channel_name", length = 120)
  private String channelName;

  @Column(columnDefinition = "TEXT")
  private String bio;

  @Column(length = 20)
  private String phone;

  @Column(name = "date_of_birth")
  private LocalDate dateOfBirth;

  @Column(name = "github_url", length = 500)
  private String githubUrl;

  @Column(name = "blog_url", length = 500)
  private String blogUrl;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public UserProfile(
      User user,
      String profileImage,
      String channelName,
      String bio,
      String phone,
      LocalDate dateOfBirth,
      String githubUrl,
      String blogUrl) {
    this.user = user;
    this.profileImage = profileImage;
    this.channelName = channelName;
    this.bio = bio;
    this.phone = phone;
    this.dateOfBirth = dateOfBirth;
    this.githubUrl = githubUrl;
    this.blogUrl = blogUrl;
  }

  public void updateProfile(
      String bio, String profileImage, String channelName, String githubUrl, String blogUrl) {
    this.bio = bio;
    this.profileImage = profileImage;
    this.channelName = channelName;
    this.githubUrl = githubUrl;
    this.blogUrl = blogUrl;
  }

  public void updateOnboardingProfile(String bio, String phone) {
    this.bio = bio;
    this.phone = phone;
  }
}
