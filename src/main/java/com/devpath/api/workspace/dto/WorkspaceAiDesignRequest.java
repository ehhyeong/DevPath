package com.devpath.api.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record WorkspaceAiDesignRequest(
    @NotBlank(message = "프로젝트 규모를 선택해 주세요.")
        @Pattern(
            regexp = "toy|mvp|enterprise",
            message = "프로젝트 규모는 toy, mvp, enterprise 중 하나여야 합니다.")
        String difficulty,
    @NotBlank(message = "기술 스택 설정 방식을 선택해 주세요.")
        @Pattern(regexp = "auto|manual", message = "기술 스택 설정 방식은 auto 또는 manual이어야 합니다.")
        String stackMode,
    @Size(max = 80, message = "Frontend 선택값은 80자 이하여야 합니다.") String frontend,
    @Size(max = 80, message = "Backend 선택값은 80자 이하여야 합니다.") String backend,
    @Size(max = 80, message = "Database 선택값은 80자 이하여야 합니다.") String database,
    @Size(max = 1000, message = "서비스 아이디어는 1000자 이하여야 합니다.") String idea) {

  public String normalizedFrontend() {
    return normalize(frontend);
  }

  public String normalizedBackend() {
    return normalize(backend);
  }

  public String normalizedDatabase() {
    return normalize(database);
  }

  public String normalizedIdea() {
    return normalize(idea);
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
