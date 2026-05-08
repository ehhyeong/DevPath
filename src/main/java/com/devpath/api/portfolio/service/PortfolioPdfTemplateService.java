package com.devpath.api.portfolio.service;

import com.devpath.api.portfolio.dto.PortfolioPdfTemplateResponse;
import com.devpath.api.portfolio.dto.PortfolioResponse;
import java.util.Comparator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioPdfTemplateService {

  private static final String DEFAULT_TEMPLATE_NAME = "DEFAULT";

  private final PortfolioService portfolioService;

  public PortfolioPdfTemplateResponse getTemplate(Long portfolioId, Long userId) {
    PortfolioResponse portfolio = portfolioService.getPortfolio(portfolioId, userId);
    return PortfolioPdfTemplateResponse.of(
        portfolio.getPortfolioId(), DEFAULT_TEMPLATE_NAME, buildPortfolioHtml(portfolio));
  }

  public String buildPortfolioHtml(PortfolioResponse portfolio) {
    String safeTitle = escapeHtml(portfolio.getTitle());
    String safeBio = escapeHtml(portfolio.getBio());

    String itemHtml =
        portfolio.getItems().stream()
            .sorted(Comparator.comparingInt(item -> item.getSortOrder()))
            .map(
                item ->
                    """
                    <li>
                        <strong>%s</strong>
                        <span>#%d</span>
                    </li>
                    """
                        .formatted(
                            escapeHtml(item.getItemType().name()), item.getReferenceId()))
            .reduce("", String::concat);

    String commitHtml =
        portfolio.getGithubCommits().stream()
            .map(
                commit ->
                    """
                    <li>
                        <strong>%s</strong>
                        <p>%s</p>
                        <small>%s</small>
                    </li>
                    """
                        .formatted(
                            escapeHtml(commit.getRepoName()),
                            escapeHtml(commit.getCommitMessage()),
                            escapeHtml(commit.getCommitUrl())))
            .reduce("", String::concat);

    return """
        <!doctype html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8"/>
            <style>
                body {
                    font-family: sans-serif;
                    color: #111827;
                    padding: 32px;
                    line-height: 1.6;
                }
                h1 {
                    font-size: 28px;
                    margin-bottom: 8px;
                }
                h2 {
                    font-size: 18px;
                    margin-top: 28px;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 6px;
                }
                .bio {
                    color: #374151;
                    white-space: pre-wrap;
                }
                ul {
                    padding-left: 18px;
                }
                li {
                    margin-bottom: 10px;
                }
                small {
                    color: #6b7280;
                }
            </style>
        </head>
        <body>
            <h1>%s</h1>
            <p class="bio">%s</p>

            <h2>Portfolio Items</h2>
            <ul>%s</ul>

            <h2>GitHub Commits</h2>
            <ul>%s</ul>
        </body>
        </html>
        """
        .formatted(safeTitle, safeBio, itemHtml, commitHtml);
  }

  private String escapeHtml(String value) {
    if (!StringUtils.hasText(value)) {
      return "";
    }

    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }
}
