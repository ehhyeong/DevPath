package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.WorkspaceDoc;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class WorkspaceDocResponse {

  private Long docId;
  private Long workspaceId;
  private WorkspaceDocType docType;
  private String content;
  private Long updatedById;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static WorkspaceDocResponse from(WorkspaceDoc doc) {
    return WorkspaceDocResponse.builder()
        .docId(doc.getId())
        .workspaceId(doc.getWorkspaceId())
        .docType(doc.getDocType())
        .content(doc.getContent())
        .updatedById(doc.getUpdatedById())
        .createdAt(doc.getCreatedAt())
        .updatedAt(doc.getUpdatedAt())
        .build();
  }
}
