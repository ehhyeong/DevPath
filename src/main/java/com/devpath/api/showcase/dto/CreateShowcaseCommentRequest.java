package com.devpath.api.showcase.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateShowcaseCommentRequest {

  @NotBlank private String content;
}
