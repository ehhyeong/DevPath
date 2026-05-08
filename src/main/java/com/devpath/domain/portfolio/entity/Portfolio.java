package com.devpath.domain.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "portfolio")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@EntityListeners(AuditingEntityListener.class)
public class Portfolio {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String bio;

  @Builder.Default private boolean isPublic = false;

  private String publicLinkToken;

  @Builder.Default private boolean isDeleted = false;

  @CreatedDate private LocalDateTime createdAt;

  @LastModifiedDate private LocalDateTime updatedAt;

  public void update(String title, String bio, boolean isPublic) {
    this.title = title;
    this.bio = bio;
    this.isPublic = isPublic;
  }

  public void generatePublicLink(String token) {
    this.publicLinkToken = token;
    this.isPublic = true;
  }

  public void delete() {
    this.isDeleted = true;
  }
}
