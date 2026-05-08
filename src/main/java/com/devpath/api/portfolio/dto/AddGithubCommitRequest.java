package com.devpath.api.portfolio.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AddGithubCommitRequest {

  @NotBlank private String repoName;

  private String commitMessage;

  @NotBlank private String commitUrl;

  private LocalDateTime committedAt;
}
