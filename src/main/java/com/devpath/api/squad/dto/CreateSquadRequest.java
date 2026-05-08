package com.devpath.api.squad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CreateSquadRequest {

  @NotBlank(message = "스쿼드 이름은 필수입니다.")
  @Size(max = 100, message = "스쿼드 이름은 100자 이하여야 합니다.")
  private String name;

  private String description;
}
