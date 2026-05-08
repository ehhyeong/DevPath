package com.devpath.domain.portfolio.repository;

import com.devpath.domain.portfolio.entity.PortfolioItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {

  List<PortfolioItem> findAllByPortfolioIdOrderBySortOrderAsc(Long portfolioId);
}
