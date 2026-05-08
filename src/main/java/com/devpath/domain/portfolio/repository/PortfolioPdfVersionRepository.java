package com.devpath.domain.portfolio.repository;

import com.devpath.domain.portfolio.entity.PortfolioPdfVersion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioPdfVersionRepository extends JpaRepository<PortfolioPdfVersion, Long> {

  List<PortfolioPdfVersion> findAllByPortfolioIdOrderByVersionDesc(Long portfolioId);

  long countByPortfolioId(Long portfolioId);
}
