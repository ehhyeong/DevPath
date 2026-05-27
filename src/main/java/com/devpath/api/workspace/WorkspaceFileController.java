package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.CreateWorkspaceFolderRequest;
import com.devpath.api.workspace.dto.CreateWorkspaceLinkRequest;
import com.devpath.api.workspace.dto.RenameWorkspaceFileRequest;
import com.devpath.api.workspace.dto.WorkspaceArchivePreviewResponse;
import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.dto.WorkspaceFileResponse;
import com.devpath.api.workspace.dto.WorkspaceFileStorageSummaryResponse;
import com.devpath.api.workspace.service.WorkspaceFileService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Workspace File API", description = "Workspace file and folder API")
public class WorkspaceFileController {

  private final WorkspaceFileService workspaceFileService;

  @PostMapping(
      value = "/workspaces/{workspaceId}/files",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Operation(
      summary = "Upload workspace file",
      description = "Uploads a file into workspace storage.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "Upload succeeded"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "Workspace member required",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "Workspace not found",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceFileResponse> uploadFile(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "File to upload") @RequestParam("file") MultipartFile file,
      @Parameter(description = "Parent folder ID")
          @RequestParam(value = "parentId", required = false)
          Long parentId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceFileService.uploadFile(workspaceId, requireUserId(userId), parentId, file));
  }

  @PostMapping("/workspaces/{workspaceId}/files/folders")
  @Operation(
      summary = "Create workspace folder",
      description = "Creates a folder in workspace storage.")
  public ApiResponse<WorkspaceFileResponse> createFolder(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Valid @RequestBody CreateWorkspaceFolderRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceFileService.createFolder(
            workspaceId, requireUserId(userId), request.getName(), request.getParentId()));
  }

  @PostMapping("/workspaces/{workspaceId}/files/links")
  @Operation(
      summary = "Create workspace external link",
      description = "Stores an external link in workspace resources.")
  public ApiResponse<WorkspaceFileResponse> createLink(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Valid @RequestBody CreateWorkspaceLinkRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceFileService.createLink(
            workspaceId,
            requireUserId(userId),
            request.getTitle(),
            request.getUrl(),
            request.getParentId()));
  }

  @GetMapping("/workspaces/{workspaceId}/files")
  @Operation(
      summary = "List workspace files",
      description = "Lists files and folders in workspace storage.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "List succeeded"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "Workspace member required",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<WorkspaceFileResponse>> getFiles(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(description = "Parent folder ID")
          @RequestParam(value = "parentId", required = false)
          Long parentId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceFileService.getFiles(workspaceId, requireUserId(userId), parentId));
  }

  @GetMapping("/workspaces/{workspaceId}/files/storage")
  @Operation(
      summary = "Get workspace file storage usage",
      description = "Returns storage usage for workspace files.")
  public ApiResponse<WorkspaceFileStorageSummaryResponse> getStorageSummary(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceFileService.getStorageSummary(workspaceId, requireUserId(userId)));
  }

  @GetMapping("/workspace-files/{fileId}/download")
  @Operation(summary = "Download workspace file", description = "Downloads a workspace file.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "Download succeeded"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "Workspace member required",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "File not found",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ResponseEntity<Resource> downloadFile(
      @Parameter(description = "File ID", example = "1") @PathVariable Long fileId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    Resource resource = workspaceFileService.downloadFile(fileId, requireUserId(userId));
    String fileName = workspaceFileService.getOriginalFileName(fileId);
    MediaType contentType = resolveDownloadContentType(workspaceFileService.getContentType(fileId));
    String contentDisposition =
        ContentDisposition.attachment()
            .filename(fileName, StandardCharsets.UTF_8)
            .build()
            .toString();
    return ResponseEntity.ok()
        .contentType(contentType)
        .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
        .body(resource);
  }

  @GetMapping("/workspace-files/{fileId}/archive")
  @Operation(
      summary = "Preview workspace archive entries",
      description = "Lists ZIP entries without extracting the archive.")
  public ApiResponse<WorkspaceArchivePreviewResponse> getArchivePreview(
      @Parameter(description = "File ID", example = "1") @PathVariable Long fileId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceFileService.getArchivePreview(fileId, requireUserId(userId)));
  }

  @GetMapping("/workspace-files/{fileId}/document-preview")
  @Operation(
      summary = "Preview workspace document text",
      description = "Extracts text from supported Office documents without extracting files.")
  public ApiResponse<WorkspaceDocumentPreviewResponse> getDocumentPreview(
      @Parameter(description = "File ID", example = "1") @PathVariable Long fileId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceFileService.getDocumentPreview(fileId, requireUserId(userId)));
  }

  @PatchMapping("/workspace-files/{fileId}")
  @Operation(summary = "Rename workspace file", description = "Renames a workspace file or folder.")
  public ApiResponse<WorkspaceFileResponse> renameFile(
      @Parameter(description = "File ID", example = "1") @PathVariable Long fileId,
      @Valid @RequestBody RenameWorkspaceFileRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceFileService.renameFile(fileId, requireUserId(userId), request.getName()));
  }

  @DeleteMapping("/workspace-files/{fileId}")
  @Operation(
      summary = "Delete workspace file",
      description = "Soft deletes a workspace file or folder.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "Delete succeeded"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "Workspace member required",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "File not found",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> deleteFile(
      @Parameter(description = "File ID", example = "1") @PathVariable Long fileId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    workspaceFileService.deleteFile(fileId, requireUserId(userId));
    return ApiResponse.ok(null);
  }

  private MediaType resolveDownloadContentType(String contentType) {
    if (!StringUtils.hasText(contentType)) {
      return MediaType.APPLICATION_OCTET_STREAM;
    }

    try {
      return MediaType.parseMediaType(contentType);
    } catch (InvalidMediaTypeException e) {
      return MediaType.APPLICATION_OCTET_STREAM;
    }
  }
}
