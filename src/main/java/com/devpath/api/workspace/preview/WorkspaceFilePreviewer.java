package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspaceArchivePreviewResponse;
import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkspaceFilePreviewer {

  private final WorkspaceArchivePreviewer archivePreviewer;
  private final WorkspaceDocumentPreviewer documentPreviewer;

  public WorkspaceArchivePreviewResponse getArchivePreview(WorkspaceFile file) {
    return archivePreviewer.getPreview(file);
  }

  public WorkspaceDocumentPreviewResponse getDocumentPreview(WorkspaceFile file) {
    return documentPreviewer.getDocumentPreview(file);
  }
}
