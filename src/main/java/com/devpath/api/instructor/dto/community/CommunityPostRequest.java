package com.devpath.api.instructor.dto.community;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityPostRequest {

  @NotBlank private String title;

  @NotBlank private String content;

  private String postType;
}
