package com.devpath.domain.portfolio.repository;

import com.devpath.domain.portfolio.entity.Portfolio;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {

  Optional<Portfolio> findByIdAndIsDeletedFalse(Long id);

  Optional<Portfolio> findFirstByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long userId);

  Optional<Portfolio> findByPublicLinkToken(String token);
}
