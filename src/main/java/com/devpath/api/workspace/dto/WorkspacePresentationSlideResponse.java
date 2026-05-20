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
public class WorkspacePresentationSlideResponse {

  private int slideNumber;
  private long width;
  private long height;
  private String backgroundColor;
  private List<WorkspacePresentationElementResponse> elements;
}
