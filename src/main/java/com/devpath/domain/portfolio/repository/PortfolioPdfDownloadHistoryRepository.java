package com.devpath.domain.portfolio.repository;

import com.devpath.domain.portfolio.entity.PortfolioPdfDownloadHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioPdfDownloadHistoryRepository
    extends JpaRepository<PortfolioPdfDownloadHistory, Long> {

  List<PortfolioPdfDownloadHistory> findAllByPortfolioIdOrderByDownloadedAtDesc(Long portfolioId);
}
