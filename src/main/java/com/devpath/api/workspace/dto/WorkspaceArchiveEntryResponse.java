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
public class WorkspaceArchiveEntryResponse {

  private String name;
  private boolean directory;
  private Long size;
  private Long compressedSize;
}
