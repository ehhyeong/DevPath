package com.devpath.domain.learning.repository.proof;

import com.devpath.domain.learning.entity.proof.ProofCardTag;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

// Proof Card Tag 저장소다.
public interface ProofCardTagRepository extends JpaRepository<ProofCardTag, Long> {

    // 특정 Proof Card의 태그 목록을 조회한다.
    List<ProofCardTag> findAllByProofCardIdOrderByIdAsc(Long proofCardId);

    // 여러 Proof Card의 태그 목록을 조회한다.
    List<ProofCardTag> findAllByProofCardIdInOrderByProofCardIdAscIdAsc(Collection<Long> proofCardIds);

    // 특정 Proof Card의 기존 태그를 전부 삭제한다.
    void deleteAllByProofCardId(Long proofCardId);
}
