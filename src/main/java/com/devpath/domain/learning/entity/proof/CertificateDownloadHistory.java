package com.devpath.domain.learning.entity.proof;

import com.devpath.domain.user.entity.User;
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

// 증명서 다운로드 이력을 저장한다.
@Entity
@Table(name = "certificate_download_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CertificateDownloadHistory {

    // 다운로드 이력 PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "certificate_download_history_id")
    private Long id;

    // 어떤 증명서의 다운로드 이력인지 나타낸다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "certificate_id", nullable = false)
    private Certificate certificate;

    // 다운로드한 사용자다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "downloaded_by")
    private User downloadedBy;

    // 다운로드 사유다.
    @Column(name = "download_reason", length = 255)
    private String downloadReason;

    // 다운로드 시각이다.
    @Column(name = "downloaded_at", nullable = false)
    private LocalDateTime downloadedAt;

    // Certificate Download History 엔티티를 생성한다.
    @Builder
    public CertificateDownloadHistory(
        Certificate certificate,
        User downloadedBy,
        String downloadReason,
        LocalDateTime downloadedAt
    ) {
        this.certificate = certificate;
        this.downloadedBy = downloadedBy;
        this.downloadReason = downloadReason;
        this.downloadedAt = downloadedAt == null ? LocalDateTime.now() : downloadedAt;
    }
}
