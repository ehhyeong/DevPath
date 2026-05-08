package com.devpath.api.portfolio.dto;

import com.devpath.domain.portfolio.entity.PortfolioPdfStatus;
import com.devpath.domain.portfolio.entity.PortfolioPdfVersion;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "포트폴리오 PDF 버전 응답")
public class PortfolioPdfVersionResponse {

  @Schema(description = "PDF 버전 ID", example = "1")
  private Long versionId;

  @Schema(description = "포트폴리오 ID", example = "1")
  private Long portfolioId;

  @Schema(description = "PDF 버전 번호", example = "2")
  private int version;

  @Schema(description = "PDF 생성 상태", example = "COMPLETED")
  private PortfolioPdfStatus status;

  @Schema(description = "파일 저장 경로", example = "/uploads/portfolios/1/portfolio-v2.pdf")
  private String filePath;

  @Schema(description = "파일 접근 URL", example = "/uploads/portfolios/1/portfolio-v2.pdf")
  private String fileUrl;

  @Schema(description = "생성 일시")
  private LocalDateTime createdAt;

  @Builder
  private PortfolioPdfVersionResponse(
      Long versionId,
      Long portfolioId,
      int version,
      PortfolioPdfStatus status,
      String filePath,
      String fileUrl,
      LocalDateTime createdAt) {
    this.versionId = versionId;
    this.portfolioId = portfolioId;
    this.version = version;
    this.status = status;
    this.filePath = filePath;
    this.fileUrl = fileUrl;
    this.createdAt = createdAt;
  }

  public static PortfolioPdfVersionResponse from(PortfolioPdfVersion pdfVersion) {
    return PortfolioPdfVersionResponse.builder()
        .versionId(pdfVersion.getId())
        .portfolioId(pdfVersion.getPortfolioId())
        .version(pdfVersion.getVersion())
        .status(pdfVersion.getStatus())
        .filePath(pdfVersion.getFilePath())
        .fileUrl(pdfVersion.getFileUrl())
        .createdAt(pdfVersion.getCreatedAt())
        .build();
  }
}
