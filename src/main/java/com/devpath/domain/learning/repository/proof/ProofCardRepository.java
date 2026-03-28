package com.devpath.domain.learning.repository.proof;

import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.entity.proof.ProofCardStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// Proof Card 저장소다.
public interface ProofCardRepository extends JpaRepository<ProofCard, Long> {

    // 특정 학습자의 특정 노드 Proof Card를 조회한다.
    Optional<ProofCard> findByUserIdAndNodeNodeId(Long userId, Long nodeId);

    // 특정 학습자의 특정 Node Clearance 기반 Proof Card를 조회한다.
    Optional<ProofCard> findByNodeClearanceId(Long nodeClearanceId);

    // 특정 학습자의 특정 Proof Card를 조회한다.
    Optional<ProofCard> findByIdAndUserId(Long proofCardId, Long userId);

    // 특정 학습자의 발급된 Proof Card 목록을 조회한다.
    List<ProofCard> findAllByUserIdAndStatusOrderByIssuedAtDesc(Long userId, ProofCardStatus status);

    // 특정 학습자의 전체 Proof Card 목록을 조회한다.
    List<ProofCard> findAllByUserIdOrderByIssuedAtDesc(Long userId);

    // 특정 학습자의 특정 노드 Proof Card 존재 여부를 확인한다.
    boolean existsByUserIdAndNodeNodeId(Long userId, Long nodeId);
}
