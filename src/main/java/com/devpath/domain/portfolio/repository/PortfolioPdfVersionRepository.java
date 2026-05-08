package com.devpath.domain.portfolio.repository;

import com.devpath.domain.portfolio.entity.PortfolioPdfStatus;
import com.devpath.domain.portfolio.entity.PortfolioPdfVersion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioPdfVersionRepository extends JpaRepository<PortfolioPdfVersion, Long> {

  List<PortfolioPdfVersion> findAllByPortfolioIdOrderByVersionDesc(Long portfolioId);

  Optional<PortfolioPdfVersion> findFirstByPortfolioIdAndStatusOrderByVersionDesc(
      Long portfolioId, PortfolioPdfStatus status);

  long countByPortfolioId(Long portfolioId);
}
