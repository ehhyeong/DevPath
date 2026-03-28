package com.devpath.domain.learning.repository.proof;

import com.devpath.domain.learning.entity.proof.Certificate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// Certificate 저장소다.
public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    // 특정 Proof Card 기반 증명서를 조회한다.
    Optional<Certificate> findByProofCardId(Long proofCardId);

    // 특정 학습자의 특정 증명서를 조회한다.
    Optional<Certificate> findByIdAndProofCardUserId(Long certificateId, Long userId);
}
