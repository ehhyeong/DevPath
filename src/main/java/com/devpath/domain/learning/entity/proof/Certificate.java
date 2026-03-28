package com.devpath.domain.learning.entity.proof;

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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

// Proof Card 기반 증명서를 저장한다.
@Entity
@Table(
    name = "certificates",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_certificates_proof_card",
            columnNames = {"proof_card_id"}
        ),
        @UniqueConstraint(
            name = "uk_certificates_certificate_number",
            columnNames = {"certificate_number"}
        )
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Certificate {

    // Certificate PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "certificate_id")
    private Long id;

    // 원본 Proof Card다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proof_card_id", nullable = false)
    private ProofCard proofCard;

    // 증명서 번호다.
    @Column(name = "certificate_number", nullable = false, length = 100)
    private String certificateNumber;

    // 증명서 상태다.
    @Enumerated(EnumType.STRING)
    @Column(name = "certificate_status", nullable = false, length = 30)
    private CertificateStatus status;

    // 발급 시각이다.
    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    // 마지막 생성된 PDF 파일명이다.
    @Column(name = "pdf_file_name", length = 255)
    private String pdfFileName;

    // PDF 생성 시각이다.
    @Column(name = "pdf_generated_at")
    private LocalDateTime pdfGeneratedAt;

    // 마지막 다운로드 시각이다.
    @Column(name = "last_downloaded_at")
    private LocalDateTime lastDownloadedAt;

    // 생성 시각이다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각이다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Certificate 엔티티를 생성한다.
    @Builder
    public Certificate(
        ProofCard proofCard,
        String certificateNumber,
        CertificateStatus status,
        LocalDateTime issuedAt
    ) {
        this.proofCard = proofCard;
        this.certificateNumber = certificateNumber;
        this.status = status == null ? CertificateStatus.ISSUED : status;
        this.issuedAt = issuedAt == null ? LocalDateTime.now() : issuedAt;
    }

    // PDF 생성 정보를 반영한다.
    public void markPdfGenerated(String pdfFileName) {
        this.pdfFileName = pdfFileName;
        this.pdfGeneratedAt = LocalDateTime.now();
        this.status = CertificateStatus.PDF_READY;
    }

    // 다운로드 시각을 갱신한다.
    public void markDownloaded() {
        this.lastDownloadedAt = LocalDateTime.now();
    }

    // 증명서 상태를 회수로 변경한다.
    public void revoke() {
        this.status = CertificateStatus.REVOKED;
    }
}
