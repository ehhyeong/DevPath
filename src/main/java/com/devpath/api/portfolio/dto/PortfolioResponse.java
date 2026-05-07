package com.devpath.api.portfolio.dto;

import com.devpath.domain.portfolio.entity.Portfolio;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PortfolioResponse {

    private Long portfolioId;
    private Long userId;
    private String title;
    private String bio;
    private boolean isPublic;
    private String publicLinkToken;
    private List<PortfolioItemResponse> items;
    private List<PortfolioGithubCommitResponse> githubCommits;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PortfolioResponse of(Portfolio portfolio,
            List<PortfolioItemResponse> items,
            List<PortfolioGithubCommitResponse> githubCommits) {
        return PortfolioResponse.builder()
                .portfolioId(portfolio.getId())
                .userId(portfolio.getUserId())
                .title(portfolio.getTitle())
                .bio(portfolio.getBio())
                .isPublic(portfolio.isPublic())
                .publicLinkToken(portfolio.getPublicLinkToken())
                .items(items)
                .githubCommits(githubCommits)
                .createdAt(portfolio.getCreatedAt())
                .updatedAt(portfolio.getUpdatedAt())
                .build();
    }
}