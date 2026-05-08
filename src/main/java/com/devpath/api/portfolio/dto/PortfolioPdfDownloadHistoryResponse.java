package com.devpath.api.portfolio.dto;

import com.devpath.domain.portfolio.entity.PortfolioPdfDownloadHistory;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "포트폴리오 PDF 다운로드 이력 응답")
public class PortfolioPdfDownloadHistoryResponse {

  @Schema(description = "다운로드 이력 ID", example = "1")
  private Long historyId;

  @Schema(description = "포트폴리오 ID", example = "1")
  private Long portfolioId;

  @Schema(description = "PDF 버전 ID", example = "1")
  private Long versionId;

  @Schema(description = "PDF 버전 번호", example = "2")
  private int version;

  @Schema(description = "다운로드 사용자 ID", example = "1")
  private Long userId;

  @Schema(description = "파일 경로", example = "/uploads/portfolios/1/portfolio-v2.pdf")
  private String filePath;

  @Schema(description = "요청 IP", example = "127.0.0.1")
  private String ipAddress;

  @Schema(description = "다운로드 일시")
  private LocalDateTime downloadedAt;

  @Builder
  private PortfolioPdfDownloadHistoryResponse(
      Long historyId,
      Long portfolioId,
      Long versionId,
      int version,
      Long userId,
      String filePath,
      String ipAddress,
      LocalDateTime downloadedAt) {
    this.historyId = historyId;
    this.portfolioId = portfolioId;
    this.versionId = versionId;
    this.version = version;
    this.userId = userId;
    this.filePath = filePath;
    this.ipAddress = ipAddress;
    this.downloadedAt = downloadedAt;
  }

  public static PortfolioPdfDownloadHistoryResponse from(PortfolioPdfDownloadHistory history) {
    return PortfolioPdfDownloadHistoryResponse.builder()
        .historyId(history.getId())
        .portfolioId(history.getPortfolioId())
        .versionId(history.getPdfVersion().getId())
        .version(history.getPdfVersion().getVersion())
        .userId(history.getUserId())
        .filePath(history.getFilePath())
        .ipAddress(history.getIpAddress())
        .downloadedAt(history.getDownloadedAt())
        .build();
  }
}
