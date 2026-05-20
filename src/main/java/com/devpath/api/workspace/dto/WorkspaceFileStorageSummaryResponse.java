package com.devpath.api.workspace.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class WorkspaceFileStorageSummaryResponse {

  private long usedBytes;
  private long quotaBytes;
  private String storageProvider;
}
