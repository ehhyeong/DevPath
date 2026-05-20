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
public class WorkspacePresentationElementResponse {

  private String type;
  private long x;
  private long y;
  private long width;
  private long height;
  private String text;
  private String imageDataUri;
  private String fillColor;
  private String textColor;
  private Double fontSize;
  private boolean bold;
  private boolean italic;
}
