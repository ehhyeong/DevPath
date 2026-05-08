package com.devpath.api.instructor.dto.community;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityCommentRequest {

  @NotBlank private String content;
}
