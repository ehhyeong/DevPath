package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceDoc;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceDocRepository extends JpaRepository<WorkspaceDoc, Long> {

    Optional<WorkspaceDoc> findByWorkspaceIdAndDocType(Long workspaceId, WorkspaceDocType docType);
}