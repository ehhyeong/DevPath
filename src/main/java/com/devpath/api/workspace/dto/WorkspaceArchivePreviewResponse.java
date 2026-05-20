package com.devpath.api.workspace.dto;

import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class WorkspaceArchivePreviewResponse {

  private List<WorkspaceArchiveEntryResponse> entries;
  private boolean truncated;
}
