package com.devpath.domain.roadmap.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "custom_roadmaps",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_custom_roadmap_user_original",
          columnNames = {"user_id", "original_roadmap_id"})
    },
    indexes = {
      @Index(name = "idx_custom_roadmaps_user_id", columnList = "user_id"),
      @Index(name = "idx_custom_roadmaps_original_roadmap_id", columnList = "original_roadmap_id")
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomRoadmap {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "custom_roadmap_id")
  private Long id;

  // 이 로드맵을 복사해서 내 것으로 만든 유저 (LAZY 로딩)
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  // 복사의 원본이 된 마스터 로드맵 (빌더 기원 로드맵은 null)
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "original_roadmap_id", nullable = true)
  private Roadmap originalRoadmap;

  @Column(name = "is_builder_origin", nullable = false)
  private boolean isBuilderOrigin = false;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(name = "progress_rate", nullable = false)
  private Integer progressRate = 0; // 진행률 (0~100%)

  // 사용자가 순서/선행관계를 직접 편집한 로드맵 여부. true면 공식 선행관계 자동 재적용을 중단하고
  // 현재 영속 엣지를 단일 진실로 사용한다.
  @Column(name = "prerequisites_customized", nullable = false, columnDefinition = "boolean default false")
  private boolean prerequisitesCustomized = false;

  // 사용자가 분기 소속을 직접 편집한 로드맵 여부. true면 각 노드의 branch_group override를 분기 소속의 진실로 사용한다.
  @Column(name = "branches_customized", nullable = false, columnDefinition = "boolean default false")
  private boolean branchesCustomized = false;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public CustomRoadmap(User user, Roadmap originalRoadmap, String title) {
    this.user = user;
    this.originalRoadmap = originalRoadmap;
    this.title = title;
    this.progressRate = 0; // 처음 복사했을 땐 진척도 0%
  }

  @Builder(builderMethodName = "builderOriginBuilder", builderClassName = "BuilderOriginBuilder")
  public CustomRoadmap(User user, String title) {
    this.user = user;
    this.originalRoadmap = null;
    this.title = title;
    this.progressRate = 0;
    this.isBuilderOrigin = true;
  }

  // 진척도 업데이트 비즈니스 메서드 (무분별한 Setter 금지)
  public void updateProgressRate(Integer newRate) {
    this.progressRate = newRate;
  }

  // 제목 변경 비즈니스 메서드
  public void changeTitle(String newTitle) {
    this.title = newTitle;
  }

  // 선행관계를 사용자 편집본으로 고정한다(공식 선행관계 자동 재적용 중단).
  public void markPrerequisitesCustomized() {
    this.prerequisitesCustomized = true;
  }

  // 분기 소속을 사용자 편집본으로 고정한다(각 노드 branch_group override를 진실로 사용).
  public void markBranchesCustomized() {
    this.branchesCustomized = true;
  }
}
