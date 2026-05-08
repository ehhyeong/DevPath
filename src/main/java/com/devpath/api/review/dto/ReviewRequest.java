package com.devpath.api.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewRequest {

  @NotNull private Long courseId;

  @NotNull
  @Min(1)
  @Max(5)
  private Integer rating;

  @NotBlank private String content;
}
