package com.devpath.domain.learning.entity.proof;

// 증명서 상태를 나타낸다.
public enum CertificateStatus {

    // 증명서 발급 완료 상태다.
    ISSUED,

    // PDF 생성 완료 상태다.
    PDF_READY,

    // 증명서가 회수된 상태다.
    REVOKED
}
