package com.devpath.api.admin.dto.governance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CourseRejectRequest {

  @NotBlank
  @Size(min = 5, max = 1000)
  private String reason;
}
