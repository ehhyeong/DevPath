package com.devpath.api.portfolio.dto;

import com.devpath.domain.portfolio.entity.PortfolioItem;
import com.devpath.domain.portfolio.entity.PortfolioItemType;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PortfolioItemResponse {

  private Long itemId;
  private Long portfolioId;
  private PortfolioItemType itemType;
  private Long referenceId;
  private int sortOrder;
  private LocalDateTime addedAt;

  public static PortfolioItemResponse from(PortfolioItem item) {
    return PortfolioItemResponse.builder()
        .itemId(item.getId())
        .portfolioId(item.getPortfolioId())
        .itemType(item.getItemType())
        .referenceId(item.getReferenceId())
        .sortOrder(item.getSortOrder())
        .addedAt(item.getAddedAt())
        .build();
  }
}
