package com.devpath.api.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UpdateWorkspaceSettingsRequest {

  @NotBlank(message = "워크스페이스 이름을 입력해 주세요.")
  @Size(max = 100, message = "워크스페이스 이름은 100자 이하여야 합니다.")
  private String name;

  @Size(max = 2000, message = "워크스페이스 설명은 2000자 이하여야 합니다.")
  private String description;
}
