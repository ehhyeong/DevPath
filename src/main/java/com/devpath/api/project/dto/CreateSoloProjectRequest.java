package com.devpath.api.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CreateSoloProjectRequest {

  @NotBlank(message = "프로젝트 이름은 필수입니다.")
  @Size(max = 150, message = "프로젝트 이름은 150자 이하여야 합니다.")
  private String name;

  private String description;
}
