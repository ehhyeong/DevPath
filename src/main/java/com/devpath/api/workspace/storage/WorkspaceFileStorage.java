package com.devpath.api.workspace.storage;

import com.devpath.domain.workspace.entity.WorkspaceFile;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface WorkspaceFileStorage {

  String provider();

  StoredWorkspaceFile store(Long workspaceId, MultipartFile file);

  Resource load(WorkspaceFile file);
}
