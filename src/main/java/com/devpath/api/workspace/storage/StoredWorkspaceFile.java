package com.devpath.api.workspace.storage;

public record StoredWorkspaceFile(
    String storageProvider,
    String objectKey,
    String storedFileName,
    String filePath,
    long fileSize,
    String contentType) {}
