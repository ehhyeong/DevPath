package com.devpath.api.portfolio.service;

import com.devpath.api.portfolio.dto.PortfolioPdfVersionResponse;
import com.devpath.domain.portfolio.entity.PortfolioPdfVersion;
import com.devpath.domain.portfolio.repository.PortfolioPdfVersionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioPdfService {

  private final PortfolioPdfVersionRepository pdfVersionRepository;
  private final PortfolioService portfolioService;

  @Transactional
  public PortfolioPdfVersionResponse requestPdf(Long portfolioId, Long userId) {
    portfolioService.getPortfolioEntity(portfolioId);

    long nextVersion = pdfVersionRepository.countByPortfolioId(portfolioId) + 1;

    // [STUB] 실제 PDF 생성 없이 PENDING 상태 버전 레코드만 생성
    PortfolioPdfVersion pdfVersion =
        PortfolioPdfVersion.builder().portfolioId(portfolioId).version((int) nextVersion).build();
    return PortfolioPdfVersionResponse.from(pdfVersionRepository.save(pdfVersion));
  }

  public List<PortfolioPdfVersionResponse> getPdfVersions(Long portfolioId, Long userId) {
    portfolioService.getPortfolioEntity(portfolioId);
    return pdfVersionRepository.findAllByPortfolioIdOrderByVersionDesc(portfolioId).stream()
        .map(PortfolioPdfVersionResponse::from)
        .toList();
  }

  public List<Object> getDownloadHistories(Long portfolioId, Long userId) {
    portfolioService.getPortfolioEntity(portfolioId);
    // [STUB] 다운로드 이력 기능 추후 구현 예정
    return List.of();
  }
}
