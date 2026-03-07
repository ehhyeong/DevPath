package com.devpath.domain.roadmap.entity;

import com.devpath.domain.user.entity.Tag;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 노드 필수 태그 매핑 엔티티
 * - 특정 노드를 클리어하기 위해 필요한 필수 기술 태그들을 매핑
 * - 학습자가 해당 노드를 스킵하려면 이 테이블에 정의된 모든 태그를 보유해야 함
 */
@Entity
@Table(name = "node_required_tags")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NodeRequiredTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "node_required_tag_id")
    private Long id;

    // 이 필수 태그가 속한 노드
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode node;

    // 필수 기술 태그
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;

    @Builder
    public NodeRequiredTag(RoadmapNode node, Tag tag) {
        this.node = node;
        this.tag = tag;
    }
}
