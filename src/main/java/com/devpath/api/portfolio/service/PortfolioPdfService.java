package com.devpath.api.portfolio.service;

import com.devpath.api.portfolio.dto.PortfolioPdfDownloadHistoryResponse;
import com.devpath.api.portfolio.dto.PortfolioPdfVersionResponse;
import com.devpath.api.portfolio.dto.PortfolioResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.portfolio.entity.Portfolio;
import com.devpath.domain.portfolio.entity.PortfolioPdfDownloadHistory;
import com.devpath.domain.portfolio.entity.PortfolioPdfVersion;
import com.devpath.domain.portfolio.repository.PortfolioPdfDownloadHistoryRepository;
import com.devpath.domain.portfolio.repository.PortfolioPdfVersionRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioPdfService {

  private static final Path PORTFOLIO_UPLOAD_ROOT = Path.of("uploads", "portfolios");

  private final PortfolioPdfVersionRepository pdfVersionRepository;
  private final PortfolioPdfDownloadHistoryRepository downloadHistoryRepository;
  private final PortfolioService portfolioService;

  @Transactional
  public PortfolioPdfVersionResponse requestPdf(Long portfolioId, Long userId) {
    Portfolio portfolio = portfolioService.getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    int nextVersion = (int) pdfVersionRepository.countByPortfolioId(portfolioId) + 1;

    PortfolioPdfVersion pdfVersion =
        PortfolioPdfVersion.builder().portfolioId(portfolioId).version(nextVersion).build();

    PortfolioPdfVersion savedVersion = pdfVersionRepository.save(pdfVersion);
    Path pdfPath = buildPdfPath(portfolioId, nextVersion);
    String filePath = pdfPath.toString().replace("\\", "/");
    String fileUrl = "/" + filePath;

    try {
      Files.createDirectories(pdfPath.getParent());
      renderPdf(portfolioId, userId, pdfPath);
      savedVersion.complete(filePath, fileUrl);
    } catch (IOException | RuntimeException exception) {
      throw new CustomException(ErrorCode.PORTFOLIO_PDF_GENERATION_FAILED);
    }

    return PortfolioPdfVersionResponse.from(savedVersion);
  }

  public List<PortfolioPdfVersionResponse> getPdfVersions(Long portfolioId, Long userId) {
    Portfolio portfolio = portfolioService.getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    return pdfVersionRepository.findAllByPortfolioIdOrderByVersionDesc(portfolioId).stream()
        .map(PortfolioPdfVersionResponse::from)
        .toList();
  }

  public List<PortfolioPdfDownloadHistoryResponse> getDownloadHistories(
      Long portfolioId, Long userId) {
    Portfolio portfolio = portfolioService.getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    return downloadHistoryRepository.findAllByPortfolioIdOrderByDownloadedAtDesc(portfolioId)
        .stream()
        .map(PortfolioPdfDownloadHistoryResponse::from)
        .toList();
  }

  @Transactional
  public void recordDownloadHistory(
      Long portfolioId, Long userId, Long pdfVersionId, String ipAddress) {
    Portfolio portfolio = portfolioService.getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    PortfolioPdfVersion pdfVersion =
        pdfVersionRepository
            .findById(pdfVersionId)
            .orElseThrow(() -> new CustomException(ErrorCode.PORTFOLIO_PDF_VERSION_NOT_FOUND));

    if (!pdfVersion.getPortfolioId().equals(portfolioId)) {
      throw new CustomException(ErrorCode.PORTFOLIO_FORBIDDEN);
    }

    PortfolioPdfDownloadHistory history =
        PortfolioPdfDownloadHistory.builder()
            .portfolioId(portfolioId)
            .pdfVersion(pdfVersion)
            .userId(userId)
            .filePath(pdfVersion.getFilePath())
            .ipAddress(ipAddress)
            .build();

    downloadHistoryRepository.save(history);
  }

  private void renderPdf(Long portfolioId, Long userId, Path pdfPath) throws IOException {
    PortfolioResponse portfolio = portfolioService.getPortfolio(portfolioId, userId);
    String html = buildPortfolioHtml(portfolio);

    try (OutputStream outputStream = Files.newOutputStream(pdfPath)) {
      PdfRendererBuilder builder = new PdfRendererBuilder();
      builder.useFastMode();
      builder.withHtmlContent(html, pdfPath.getParent().toUri().toString());
      builder.toStream(outputStream);
      builder.run();
    }
  }

  private String buildPortfolioHtml(PortfolioResponse portfolio) {
    String safeTitle = escapeHtml(portfolio.getTitle());
    String safeBio = escapeHtml(portfolio.getBio());

    String itemHtml =
        portfolio.getItems().stream()
            .sorted(Comparator.comparingInt(item -> item.getSortOrder()))
            .map(
                item ->
                    """
                    <li>
                        <strong>%s</strong>
                        <span>#%d</span>
                    </li>
                    """
                        .formatted(
                            escapeHtml(item.getItemType().name()), item.getReferenceId()))
            .reduce("", String::concat);

    String commitHtml =
        portfolio.getGithubCommits().stream()
            .map(
                commit ->
                    """
                    <li>
                        <strong>%s</strong>
                        <p>%s</p>
                        <small>%s</small>
                    </li>
                    """
                        .formatted(
                            escapeHtml(commit.getRepoName()),
                            escapeHtml(commit.getCommitMessage()),
                            escapeHtml(commit.getCommitUrl())))
            .reduce("", String::concat);

    return """
        <!doctype html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8"/>
            <style>
                body {
                    font-family: sans-serif;
                    color: #111827;
                    padding: 32px;
                    line-height: 1.6;
                }
                h1 {
                    font-size: 28px;
                    margin-bottom: 8px;
                }
                h2 {
                    font-size: 18px;
                    margin-top: 28px;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 6px;
                }
                .bio {
                    color: #374151;
                    white-space: pre-wrap;
                }
                ul {
                    padding-left: 18px;
                }
                li {
                    margin-bottom: 10px;
                }
                small {
                    color: #6b7280;
                }
            </style>
        </head>
        <body>
            <h1>%s</h1>
            <p class="bio">%s</p>

            <h2>Portfolio Items</h2>
            <ul>%s</ul>

            <h2>GitHub Commits</h2>
            <ul>%s</ul>
        </body>
        </html>
        """
        .formatted(safeTitle, safeBio, itemHtml, commitHtml);
  }

  private Path buildPdfPath(Long portfolioId, int version) {
    return PORTFOLIO_UPLOAD_ROOT
        .resolve(String.valueOf(portfolioId))
        .resolve("portfolio-v" + version + ".pdf");
  }

  private void validateOwner(Portfolio portfolio, Long userId) {
    if (!portfolio.getUserId().equals(userId)) {
      throw new CustomException(ErrorCode.PORTFOLIO_FORBIDDEN);
    }
  }

  private String escapeHtml(String value) {
    if (!StringUtils.hasText(value)) {
      return "";
    }

    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }
}
