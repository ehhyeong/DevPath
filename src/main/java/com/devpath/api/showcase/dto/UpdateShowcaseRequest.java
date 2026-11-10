package com.devpath.api.showcase.dto;

import com.devpath.domain.showcase.entity.ShowcaseCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateShowcaseRequest {

  @NotBlank private String title;

  private String description;

  private String thumbnailUrl;

  @Size(max = 500)
  private String techStack;

  @NotNull private ShowcaseCategory category;

  private boolean isPublic;
}
