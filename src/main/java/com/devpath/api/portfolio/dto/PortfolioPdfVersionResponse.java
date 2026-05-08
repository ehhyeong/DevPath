package com.devpath.api.portfolio.dto;

import com.devpath.domain.portfolio.entity.PortfolioPdfStatus;
import com.devpath.domain.portfolio.entity.PortfolioPdfVersion;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PortfolioPdfVersionResponse {

  private Long versionId;
  private Long portfolioId;
  private int version;
  private PortfolioPdfStatus status;
  private String filePath;
  private LocalDateTime createdAt;

  public static PortfolioPdfVersionResponse from(PortfolioPdfVersion pdfVersion) {
    return PortfolioPdfVersionResponse.builder()
        .versionId(pdfVersion.getId())
        .portfolioId(pdfVersion.getPortfolioId())
        .version(pdfVersion.getVersion())
        .status(pdfVersion.getStatus())
        .filePath(pdfVersion.getFilePath())
        .createdAt(pdfVersion.getCreatedAt())
        .build();
  }
}
