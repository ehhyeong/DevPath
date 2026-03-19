package com.devpath.domain.learning.entity;

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
@Table(name = "assignment_rubrics")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Rubric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rubric_id")
    private Long id;

    // 이 루브릭이 어떤 과제에 속하는지 나타내는 상위 연관관계다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    // 루브릭 평가 기준의 이름을 저장한다.
    @Column(name = "criteria_name", nullable = false, length = 100)
    private String criteriaName;

    // 루브릭 평가 기준의 상세 설명을 저장한다.
    @Column(name = "criteria_description", columnDefinition = "TEXT")
    private String criteriaDescription;

    // 해당 기준의 최대 배점을 저장한다.
    @Column(name = "max_points", nullable = false)
    private Integer maxPoints;

    // 루브릭 노출 순서를 저장한다.
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    // 실제 삭제 대신 논리 삭제를 적용하기 위한 플래그다.
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // 생성 시각을 자동 저장한다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각을 자동 갱신한다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public Rubric(
            Assignment assignment,
            String criteriaName,
            String criteriaDescription,
            Integer maxPoints,
            Integer displayOrder,
            Boolean isDeleted
    ) {
        this.assignment = assignment;
        this.criteriaName = criteriaName;
        this.criteriaDescription = criteriaDescription;
        this.maxPoints = maxPoints == null ? 0 : maxPoints;
        this.displayOrder = displayOrder == null ? 0 : displayOrder;
        this.isDeleted = isDeleted == null ? false : isDeleted;
    }

    // Assignment.addRubric()에서 내부적으로 사용하는 상위 과제 할당 메서드다.
    void assignAssignment(Assignment assignment) {
        this.assignment = assignment;
    }

    // 루브릭 이름, 설명, 최대 배점, 순서를 한 번에 수정한다.
    public void update(String criteriaName, String criteriaDescription, Integer maxPoints, Integer displayOrder) {
        this.criteriaName = criteriaName;
        this.criteriaDescription = criteriaDescription;
        this.maxPoints = maxPoints;
        this.displayOrder = displayOrder;
    }

    // 루브릭을 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
