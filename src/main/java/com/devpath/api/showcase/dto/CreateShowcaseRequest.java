package com.devpath.api.showcase.dto;

import com.devpath.domain.showcase.entity.ShowcaseCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateShowcaseRequest {

  @NotBlank private String title;

  private String description;

  private String thumbnailUrl;

  @NotNull private ShowcaseCategory category;

  private boolean isPublic = true;
}
