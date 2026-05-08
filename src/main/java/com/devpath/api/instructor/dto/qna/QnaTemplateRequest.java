package com.devpath.api.instructor.dto.qna;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QnaTemplateRequest {

  @NotBlank private String title;

  @NotBlank private String content;
}
