package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.WorkspaceFileResponse;
import com.devpath.api.workspace.service.WorkspaceFileService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Workspace File API", description = "워크스페이스 파일 업로드/다운로드 API")
public class WorkspaceFileController {

    private final WorkspaceFileService workspaceFileService;

    @PostMapping(value = "/workspaces/{workspaceId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "파일 업로드", description = "워크스페이스에 파일을 업로드합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "업로드 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "워크스페이스 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<WorkspaceFileResponse> uploadFile(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(description = "업로드할 파일") @RequestParam("file") MultipartFile file,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(workspaceFileService.uploadFile(workspaceId, requireUserId(userId), file));
    }

    @GetMapping("/workspaces/{workspaceId}/files")
    @Operation(summary = "파일 목록 조회", description = "워크스페이스의 파일 목록을 조회합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<List<WorkspaceFileResponse>> getFiles(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(workspaceFileService.getFiles(workspaceId, requireUserId(userId)));
    }

    @GetMapping("/workspace-files/{fileId}/download")
    @Operation(summary = "파일 다운로드", description = "워크스페이스 파일을 다운로드합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "다운로드 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "파일 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "파일 ID", example = "1") @PathVariable Long fileId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        Resource resource = workspaceFileService.downloadFile(fileId, requireUserId(userId));
        String fileName = workspaceFileService.getOriginalFileName(fileId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\"")
                .body(resource);
    }

    @DeleteMapping("/workspace-files/{fileId}")
    @Operation(summary = "파일 삭제", description = "파일을 소프트 삭제합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "파일 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<Void> deleteFile(
            @Parameter(description = "파일 ID", example = "1") @PathVariable Long fileId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        workspaceFileService.deleteFile(fileId, requireUserId(userId));
        return ApiResponse.ok(null);
    }
}