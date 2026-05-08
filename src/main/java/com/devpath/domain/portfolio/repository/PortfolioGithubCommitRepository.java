package com.devpath.domain.portfolio.repository;

import com.devpath.domain.portfolio.entity.PortfolioGithubCommit;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioGithubCommitRepository
    extends JpaRepository<PortfolioGithubCommit, Long> {

  List<PortfolioGithubCommit> findAllByPortfolioIdOrderByCommittedAtDesc(Long portfolioId);
}
