package com.devpath.domain.learning.entity.proof;

import com.devpath.domain.user.entity.Tag;
import jakarta.persistence.Column;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Proof Card에 표시할 태그를 저장한다.
@Entity
@Table(
    name = "proof_card_tags",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_proof_card_tags_card_tag_type",
            columnNames = {"proof_card_id", "tag_id", "skill_evidence_type"}
        )
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProofCardTag {

    // Proof Card Tag PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proof_card_tag_id")
    private Long id;

    // 어떤 Proof Card에 속한 태그인지 나타낸다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proof_card_id", nullable = false)
    private ProofCard proofCard;

    // 연결된 기술 태그다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;

    // 태그 증빙 유형이다.
    @Enumerated(EnumType.STRING)
    @Column(name = "skill_evidence_type", nullable = false, length = 30)
    private SkillEvidenceType evidenceType;

    // Proof Card Tag 엔티티를 생성한다.
    @Builder
    public ProofCardTag(ProofCard proofCard, Tag tag, SkillEvidenceType evidenceType) {
        this.proofCard = proofCard;
        this.tag = tag;
        this.evidenceType = evidenceType;
    }
}
