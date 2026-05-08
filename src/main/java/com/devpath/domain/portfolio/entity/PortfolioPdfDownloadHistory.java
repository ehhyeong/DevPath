package com.devpath.domain.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "portfolio_pdf_download_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class PortfolioPdfDownloadHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "portfolio_pdf_download_history_id")
  private Long id;

  @Column(nullable = false)
  private Long portfolioId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "portfolio_pdf_version_id", nullable = false)
  private PortfolioPdfVersion pdfVersion;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false, length = 500)
  private String filePath;

  @Column(length = 45)
  private String ipAddress;

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private LocalDateTime downloadedAt;

  @Builder
  public PortfolioPdfDownloadHistory(
      Long portfolioId,
      PortfolioPdfVersion pdfVersion,
      Long userId,
      String filePath,
      String ipAddress) {
    this.portfolioId = portfolioId;
    this.pdfVersion = pdfVersion;
    this.userId = userId;
    this.filePath = filePath;
    this.ipAddress = ipAddress;
  }
}
