package com.devpath.api.project.dto;

import com.devpath.domain.project.entity.ProjectVisibility;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UpdateProjectVisibilityRequest {

  @NotNull(message = "공개 범위는 필수입니다.")
  private ProjectVisibility visibility;
}
