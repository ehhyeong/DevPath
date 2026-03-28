package com.devpath.domain.learning.repository.proof;

import com.devpath.domain.learning.entity.proof.CertificateDownloadHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

// Certificate Download History 저장소다.
public interface CertificateDownloadHistoryRepository extends JpaRepository<CertificateDownloadHistory, Long> {

    // 특정 증명서의 다운로드 이력을 조회한다.
    List<CertificateDownloadHistory> findAllByCertificateIdOrderByDownloadedAtDesc(Long certificateId);
}
