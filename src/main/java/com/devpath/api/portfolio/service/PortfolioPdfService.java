package com.devpath.api.portfolio.service;

import com.devpath.api.portfolio.dto.PortfolioPdfDownloadHistoryResponse;
import com.devpath.api.portfolio.dto.PortfolioPdfVersionResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.portfolio.entity.Portfolio;
import com.devpath.domain.portfolio.entity.PortfolioPdfDownloadHistory;
import com.devpath.domain.portfolio.entity.PortfolioPdfStatus;
import com.devpath.domain.portfolio.entity.PortfolioPdfVersion;
import com.devpath.domain.portfolio.repository.PortfolioPdfDownloadHistoryRepository;
import com.devpath.domain.portfolio.repository.PortfolioPdfVersionRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
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
  private final PortfolioPdfTemplateService portfolioPdfTemplateService;

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

    return downloadHistoryRepository
        .findAllByPortfolioIdOrderByDownloadedAtDesc(portfolioId)
        .stream()
        .map(PortfolioPdfDownloadHistoryResponse::from)
        .toList();
  }

  @Transactional
  public PdfDownloadFile downloadPdfVersion(
      Long portfolioId, Long userId, Long pdfVersionId, String ipAddress) {
    Portfolio portfolio = portfolioService.getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    PortfolioPdfVersion pdfVersion = getCompletedPdfVersion(portfolioId, pdfVersionId);
    Resource resource = toResource(pdfVersion, userId);
    saveDownloadHistory(portfolioId, userId, pdfVersion, ipAddress);

    return new PdfDownloadFile(
        resource, buildDownloadFileName(portfolioId, pdfVersion.getVersion()));
  }

  @Transactional
  public PdfDownloadFile downloadLatestPdf(Long portfolioId, Long userId, String ipAddress) {
    Portfolio portfolio = portfolioService.getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    PortfolioPdfVersion pdfVersion =
        pdfVersionRepository
            .findFirstByPortfolioIdAndStatusOrderByVersionDesc(
                portfolioId, PortfolioPdfStatus.COMPLETED)
            .orElseThrow(() -> new CustomException(ErrorCode.PORTFOLIO_PDF_VERSION_NOT_FOUND));
    Resource resource = toResource(pdfVersion, userId);
    saveDownloadHistory(portfolioId, userId, pdfVersion, ipAddress);

    return new PdfDownloadFile(
        resource, buildDownloadFileName(portfolioId, pdfVersion.getVersion()));
  }

  @Transactional
  public void recordDownloadHistory(
      Long portfolioId, Long userId, Long pdfVersionId, String ipAddress) {
    Portfolio portfolio = portfolioService.getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    PortfolioPdfVersion pdfVersion = getCompletedPdfVersion(portfolioId, pdfVersionId);
    saveDownloadHistory(portfolioId, userId, pdfVersion, ipAddress);
  }

  private void saveDownloadHistory(
      Long portfolioId, Long userId, PortfolioPdfVersion pdfVersion, String ipAddress) {
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
    String html =
        portfolioPdfTemplateService.buildPortfolioHtml(
            portfolioService.getPortfolio(portfolioId, userId));

    try (OutputStream outputStream = Files.newOutputStream(pdfPath)) {
      PdfRendererBuilder builder = new PdfRendererBuilder();
      builder.useFastMode();
      builder.withHtmlContent(html, pdfPath.getParent().toUri().toString());
      builder.toStream(outputStream);
      builder.run();
    }
  }

  private PortfolioPdfVersion getCompletedPdfVersion(Long portfolioId, Long pdfVersionId) {
    PortfolioPdfVersion pdfVersion =
        pdfVersionRepository
            .findById(pdfVersionId)
            .orElseThrow(() -> new CustomException(ErrorCode.PORTFOLIO_PDF_VERSION_NOT_FOUND));

    if (!pdfVersion.getPortfolioId().equals(portfolioId)
        || pdfVersion.getStatus() != PortfolioPdfStatus.COMPLETED) {
      throw new CustomException(ErrorCode.PORTFOLIO_PDF_VERSION_NOT_FOUND);
    }

    return pdfVersion;
  }

  private Resource toResource(PortfolioPdfVersion pdfVersion, Long userId) {
    if (!StringUtils.hasText(pdfVersion.getFilePath())) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    try {
      Path path = resolvePdfPath(pdfVersion.getFilePath());
      if (!Files.exists(path)) {
        Files.createDirectories(path.getParent());
        renderPdf(pdfVersion.getPortfolioId(), userId, path);
      }

      Resource resource = new UrlResource(path.toUri());
      if (!resource.exists() || !resource.isReadable()) {
        throw new CustomException(ErrorCode.FILE_NOT_FOUND);
      }
      return resource;
    } catch (IOException exception) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }
  }

  private Path resolvePdfPath(String filePath) {
    String normalized = filePath.replace("\\", "/");
    if (normalized.startsWith("/uploads/")) {
      normalized = normalized.substring(1);
    }
    return Path.of(normalized);
  }

  private String buildDownloadFileName(Long portfolioId, int version) {
    return "portfolio-" + portfolioId + "-v" + version + ".pdf";
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

  public record PdfDownloadFile(Resource resource, String fileName) {}
}
