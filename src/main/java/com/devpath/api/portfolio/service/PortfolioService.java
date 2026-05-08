package com.devpath.api.portfolio.service;

import com.devpath.api.portfolio.dto.AddGithubCommitRequest;
import com.devpath.api.portfolio.dto.AddPortfolioItemRequest;
import com.devpath.api.portfolio.dto.CreatePortfolioRequest;
import com.devpath.api.portfolio.dto.PortfolioGithubCommitResponse;
import com.devpath.api.portfolio.dto.PortfolioItemResponse;
import com.devpath.api.portfolio.dto.PortfolioResponse;
import com.devpath.api.portfolio.dto.UpdatePortfolioRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.portfolio.entity.Portfolio;
import com.devpath.domain.portfolio.entity.PortfolioGithubCommit;
import com.devpath.domain.portfolio.entity.PortfolioItem;
import com.devpath.domain.portfolio.entity.PortfolioItemType;
import com.devpath.domain.portfolio.repository.PortfolioGithubCommitRepository;
import com.devpath.domain.portfolio.repository.PortfolioItemRepository;
import com.devpath.domain.portfolio.repository.PortfolioRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioService {

  private final PortfolioRepository portfolioRepository;
  private final PortfolioItemRepository portfolioItemRepository;
  private final PortfolioGithubCommitRepository portfolioGithubCommitRepository;

  @Transactional
  public PortfolioResponse createPortfolio(Long userId, CreatePortfolioRequest request) {
    Portfolio portfolio =
        Portfolio.builder()
            .userId(userId)
            .title(request.getTitle())
            .bio(request.getBio())
            .isPublic(request.isPublic())
            .build();
    portfolioRepository.save(portfolio);
    return toResponse(portfolio);
  }

  public PortfolioResponse getMyPortfolio(Long userId) {
    Portfolio portfolio =
        portfolioRepository
            .findFirstByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.PORTFOLIO_NOT_FOUND));
    return toResponse(portfolio);
  }

  public PortfolioResponse getPortfolio(Long portfolioId, Long userId) {
    Portfolio portfolio = getPortfolioEntity(portfolioId);
    if (!portfolio.getUserId().equals(userId) && !portfolio.isPublic()) {
      throw new CustomException(ErrorCode.PORTFOLIO_FORBIDDEN);
    }
    return toResponse(portfolio);
  }

  @Transactional
  public PortfolioResponse updatePortfolio(
      Long portfolioId, Long userId, UpdatePortfolioRequest request) {
    Portfolio portfolio = getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);
    portfolio.update(request.getTitle(), request.getBio(), request.isPublic());
    return toResponse(portfolio);
  }

  @Transactional
  public PortfolioItemResponse addItem(
      Long portfolioId, Long userId, PortfolioItemType itemType, AddPortfolioItemRequest request) {
    Portfolio portfolio = getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    int nextOrder =
        portfolioItemRepository.findAllByPortfolioIdOrderBySortOrderAsc(portfolioId).size();

    PortfolioItem item =
        PortfolioItem.builder()
            .portfolioId(portfolioId)
            .itemType(itemType)
            .referenceId(request.getReferenceId())
            .sortOrder(nextOrder)
            .build();
    return PortfolioItemResponse.from(portfolioItemRepository.save(item));
  }

  @Transactional
  public PortfolioGithubCommitResponse addGithubCommit(
      Long portfolioId, Long userId, AddGithubCommitRequest request) {
    Portfolio portfolio = getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);

    PortfolioGithubCommit commit =
        PortfolioGithubCommit.builder()
            .portfolioId(portfolioId)
            .repoName(request.getRepoName())
            .commitMessage(request.getCommitMessage())
            .commitUrl(request.getCommitUrl())
            .committedAt(request.getCommittedAt())
            .build();
    return PortfolioGithubCommitResponse.from(portfolioGithubCommitRepository.save(commit));
  }

  @Transactional
  public PortfolioResponse generatePublicLink(Long portfolioId, Long userId) {
    Portfolio portfolio = getPortfolioEntity(portfolioId);
    validateOwner(portfolio, userId);
    portfolio.generatePublicLink(UUID.randomUUID().toString());
    return toResponse(portfolio);
  }

  // --- 내부 헬퍼 ---

  public Portfolio getPortfolioEntity(Long portfolioId) {
    return portfolioRepository
        .findByIdAndIsDeletedFalse(portfolioId)
        .orElseThrow(() -> new CustomException(ErrorCode.PORTFOLIO_NOT_FOUND));
  }

  private void validateOwner(Portfolio portfolio, Long userId) {
    if (!portfolio.getUserId().equals(userId)) {
      throw new CustomException(ErrorCode.PORTFOLIO_FORBIDDEN);
    }
  }

  private PortfolioResponse toResponse(Portfolio portfolio) {
    List<PortfolioItemResponse> items =
        portfolioItemRepository.findAllByPortfolioIdOrderBySortOrderAsc(portfolio.getId()).stream()
            .map(PortfolioItemResponse::from)
            .toList();

    List<PortfolioGithubCommitResponse> commits =
        portfolioGithubCommitRepository
            .findAllByPortfolioIdOrderByCommittedAtDesc(portfolio.getId())
            .stream()
            .map(PortfolioGithubCommitResponse::from)
            .toList();

    return PortfolioResponse.of(portfolio, items, commits);
  }
}
