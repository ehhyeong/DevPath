package com.devpath.api.portfolio.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "포트폴리오 PDF 템플릿 응답")
public class PortfolioPdfTemplateResponse {

  @Schema(description = "포트폴리오 ID", example = "1")
  private Long portfolioId;

  @Schema(description = "템플릿 이름", example = "DEFAULT")
  private String templateName;

  @Schema(description = "PDF 렌더링용 HTML")
  private String html;

  @Builder
  private PortfolioPdfTemplateResponse(Long portfolioId, String templateName, String html) {
    this.portfolioId = portfolioId;
    this.templateName = templateName;
    this.html = html;
  }

  public static PortfolioPdfTemplateResponse of(
      Long portfolioId, String templateName, String html) {
    return PortfolioPdfTemplateResponse.builder()
        .portfolioId(portfolioId)
        .templateName(templateName)
        .html(html)
        .build();
  }
}
