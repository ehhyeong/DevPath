package com.devpath.api.proof.service;

import com.devpath.api.proof.component.CertificatePdfProvider;
import com.devpath.api.proof.dto.CertificateRequest;
import com.devpath.api.proof.dto.CertificateResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.proof.Certificate;
import com.devpath.domain.learning.entity.proof.CertificateDownloadHistory;
import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.entity.proof.ProofCardTag;
import com.devpath.domain.learning.repository.proof.CertificateDownloadHistoryRepository;
import com.devpath.domain.learning.repository.proof.CertificateRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Certificate 서비스
@Service
@RequiredArgsConstructor
public class CertificateService {

    // Certificate 저장소다.
    private final CertificateRepository certificateRepository;

    // Certificate Download History 저장소다.
    private final CertificateDownloadHistoryRepository certificateDownloadHistoryRepository;

    // Proof Card 저장소다.
    private final ProofCardRepository proofCardRepository;

    // Proof Card Tag 저장소다.
    private final ProofCardTagRepository proofCardTagRepository;

    // User 저장소다.
    private final UserRepository userRepository;

    // Certificate PDF 생성기다.
    private final CertificatePdfProvider certificatePdfProvider;

    // Proof Card 기준 증명서를 발급한다.
    @Transactional
    public CertificateResponse.Detail issue(Long userId, Long proofCardId) {
        ProofCard proofCard = proofCardRepository.findByIdAndUserId(proofCardId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.PROOF_CARD_NOT_FOUND));

        return certificateRepository.findByProofCardId(proofCardId)
            .map(this::toDetail)
            .orElseGet(() -> createCertificate(proofCard));
    }

    // 증명서 PDF를 생성한다.
    @Transactional
    public CertificateResponse.PdfDetail generatePdf(Long userId, Long proofCardId) {
        Certificate certificate = resolveCertificateByProofCard(userId, proofCardId);
        List<ProofCardTag> proofCardTags = proofCardTagRepository.findAllByProofCardIdOrderByIdAsc(proofCardId);
        byte[] pdfBytes = certificatePdfProvider.generate(certificate, proofCardTags);

        String fileName = "certificate-" + certificate.getCertificateNumber() + ".pdf";
        certificate.markPdfGenerated(fileName);

        return CertificateResponse.PdfDetail.builder()
            .certificateId(certificate.getId())
            .fileName(fileName)
            .mimeType("application/pdf")
            .base64Content(Base64.getEncoder().encodeToString(pdfBytes))
            .build();
    }

    // 증명서 상세를 조회한다.
    @Transactional(readOnly = true)
    public CertificateResponse.Detail getCertificate(Long userId, Long certificateId) {
        Certificate certificate = certificateRepository.findByIdAndProofCardUserId(certificateId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.CERTIFICATE_NOT_FOUND));

        return toDetail(certificate);
    }

    // 증명서 다운로드 이력을 저장한다.
    @Transactional
    public CertificateResponse.DownloadHistoryDetail recordDownload(
        Long userId,
        Long certificateId,
        CertificateRequest.Download request
    ) {
        User downloadedBy = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Certificate certificate = certificateRepository.findByIdAndProofCardUserId(certificateId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.CERTIFICATE_NOT_FOUND));

        certificate.markDownloaded();

        CertificateDownloadHistory savedHistory = certificateDownloadHistoryRepository.save(
            CertificateDownloadHistory.builder()
                .certificate(certificate)
                .downloadedBy(downloadedBy)
                .downloadReason(request.getReason())
                .build()
        );

        return toDownloadHistoryDetail(savedHistory);
    }

    // 증명서 다운로드 이력을 조회한다.
    @Transactional(readOnly = true)
    public List<CertificateResponse.DownloadHistoryDetail> getDownloadHistories(Long userId, Long certificateId) {
        certificateRepository.findByIdAndProofCardUserId(certificateId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.CERTIFICATE_NOT_FOUND));

        return certificateDownloadHistoryRepository.findAllByCertificateIdOrderByDownloadedAtDesc(certificateId)
            .stream()
            .map(this::toDownloadHistoryDetail)
            .toList();
    }

    // 증명서를 생성한다.
    private CertificateResponse.Detail createCertificate(ProofCard proofCard) {
        Certificate savedCertificate = certificateRepository.save(
            Certificate.builder()
                .proofCard(proofCard)
                .certificateNumber(generateCertificateNumber())
                .build()
        );

        return toDetail(savedCertificate);
    }

    // Proof Card 기준 증명서를 조회하거나 생성한다.
    private Certificate resolveCertificateByProofCard(Long userId, Long proofCardId) {
        ProofCard proofCard = proofCardRepository.findByIdAndUserId(proofCardId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.PROOF_CARD_NOT_FOUND));

        return certificateRepository.findByProofCardId(proofCardId)
            .orElseGet(() -> certificateRepository.save(
                Certificate.builder()
                    .proofCard(proofCard)
                    .certificateNumber(generateCertificateNumber())
                    .build()
            ));
    }

    // 증명서 번호를 생성한다.
    private String generateCertificateNumber() {
        return "CERT-" + LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE)
            + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    // 증명서 응답으로 변환한다.
    private CertificateResponse.Detail toDetail(Certificate certificate) {
        return CertificateResponse.Detail.builder()
            .certificateId(certificate.getId())
            .proofCardId(certificate.getProofCard().getId())
            .certificateNumber(certificate.getCertificateNumber())
            .status(certificate.getStatus().name())
            .issuedAt(certificate.getIssuedAt())
            .pdfGeneratedAt(certificate.getPdfGeneratedAt())
            .lastDownloadedAt(certificate.getLastDownloadedAt())
            .build();
    }

    // 다운로드 이력 응답으로 변환한다.
    private CertificateResponse.DownloadHistoryDetail toDownloadHistoryDetail(
        CertificateDownloadHistory certificateDownloadHistory
    ) {
        return CertificateResponse.DownloadHistoryDetail.builder()
            .downloadHistoryId(certificateDownloadHistory.getId())
            .downloadReason(certificateDownloadHistory.getDownloadReason())
            .downloadedAt(certificateDownloadHistory.getDownloadedAt())
            .build();
    }
}
