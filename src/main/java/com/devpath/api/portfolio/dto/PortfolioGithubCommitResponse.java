package com.devpath.api.portfolio.dto;

import com.devpath.domain.portfolio.entity.PortfolioGithubCommit;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PortfolioGithubCommitResponse {

    private Long commitId;
    private Long portfolioId;
    private String repoName;
    private String commitMessage;
    private String commitUrl;
    private LocalDateTime committedAt;

    public static PortfolioGithubCommitResponse from(PortfolioGithubCommit commit) {
        return PortfolioGithubCommitResponse.builder()
                .commitId(commit.getId())
                .portfolioId(commit.getPortfolioId())
                .repoName(commit.getRepoName())
                .commitMessage(commit.getCommitMessage())
                .commitUrl(commit.getCommitUrl())
                .committedAt(commit.getCommittedAt())
                .build();
    }
}