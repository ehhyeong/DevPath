package com.devpath.domain.builder.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "my_roadmaps",
    indexes = {@Index(name = "idx_my_roadmaps_user_id", columnList = "user_id")})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MyRoadmap {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "my_roadmap_id")
  private Long myRoadmapId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(name = "custom_roadmap_id")
  private Long customRoadmapId;

  @OneToMany(mappedBy = "myRoadmap", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<MyRoadmapModule> modules = new ArrayList<>();

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public MyRoadmap(User user, String title) {
    this.user = user;
    this.title = title;
  }

  public void addModule(MyRoadmapModule module) {
    this.modules.add(module);
  }

  public void changeTitle(String title) {
    this.title = title;
  }

  public void linkCustomRoadmap(Long customRoadmapId) {
    this.customRoadmapId = customRoadmapId;
  }
}
