package com.devpath.domain.learning.repository.proof;

import com.devpath.domain.learning.entity.proof.ProofCardShare;
import com.devpath.domain.learning.entity.proof.ProofShareLinkStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// Proof Card Share 저장소다.
public interface ProofCardShareRepository extends JpaRepository<ProofCardShare, Long> {

    // 특정 공유 토큰의 링크를 조회한다.
    Optional<ProofCardShare> findByShareTokenAndStatus(String shareToken, ProofShareLinkStatus status);

    // 특정 Proof Card의 최신 활성 공유 링크를 조회한다.
    Optional<ProofCardShare> findTopByProofCardIdAndStatusOrderByIdDesc(Long proofCardId, ProofShareLinkStatus status);

    // 특정 공유 토큰의 존재 여부를 확인한다.
    boolean existsByShareToken(String shareToken);
}
