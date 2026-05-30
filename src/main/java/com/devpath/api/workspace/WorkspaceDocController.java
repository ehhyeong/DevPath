package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.CreateMeetingNoteRequest;
import com.devpath.api.workspace.dto.MeetingNoteResponse;
import com.devpath.api.workspace.dto.UpdateWorkspaceDocRequest;
import com.devpath.api.workspace.dto.WorkspaceDocResponse;
import com.devpath.api.workspace.service.WorkspaceDocService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Workspace Docs API", description = "워크스페이스 문서(ERD/API명세/회의록) API")
public class WorkspaceDocController {

  private final WorkspaceDocService workspaceDocService;

  @PutMapping("/workspaces/{workspaceId}/docs/erd")
  @Operation(summary = "ERD 문서 저장", description = "워크스페이스 ERD 문서를 저장합니다. 없으면 생성, 있으면 수정합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "저장 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceDocResponse> upsertErd(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @RequestBody UpdateWorkspaceDocRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.upsertDoc(
            workspaceId, requireUserId(userId), WorkspaceDocType.ERD, request));
  }

  @GetMapping("/workspaces/{workspaceId}/docs/erd")
  @Operation(summary = "ERD 문서 조회", description = "워크스페이스 ERD 문서를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "문서 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceDocResponse> getErd(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.getDoc(workspaceId, requireUserId(userId), WorkspaceDocType.ERD));
  }

  @PutMapping("/workspaces/{workspaceId}/api-spec")
  @Operation(summary = "API 명세 저장", description = "워크스페이스 API 명세를 저장합니다. 없으면 생성, 있으면 수정합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "저장 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceDocResponse> upsertApiSpec(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @RequestBody UpdateWorkspaceDocRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.upsertDoc(
            workspaceId, requireUserId(userId), WorkspaceDocType.API_SPEC, request));
  }

  @GetMapping("/workspaces/{workspaceId}/api-spec")
  @Operation(summary = "API 명세 조회", description = "워크스페이스 API 명세를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "문서 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<WorkspaceDocResponse> getApiSpec(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.getDoc(workspaceId, requireUserId(userId), WorkspaceDocType.API_SPEC));
  }

  @PutMapping("/workspaces/{workspaceId}/docs/infra")
  @Operation(
      summary = "Infra document upsert",
      description = "Stores workspace infrastructure architecture notes or links.")
  public ApiResponse<WorkspaceDocResponse> upsertInfra(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @RequestBody UpdateWorkspaceDocRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.upsertDoc(
            workspaceId, requireUserId(userId), WorkspaceDocType.INFRA, request));
  }

  @GetMapping("/workspaces/{workspaceId}/docs/infra")
  @Operation(
      summary = "Infra document lookup",
      description = "Loads workspace infrastructure architecture notes or links.")
  public ApiResponse<WorkspaceDocResponse> getInfra(
      @Parameter(description = "Workspace ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.getDoc(workspaceId, requireUserId(userId), WorkspaceDocType.INFRA));
  }

  @PutMapping("/workspaces/{workspaceId}/meeting-settings")
  @Operation(summary = "밋업 설정 저장", description = "워크스페이스 라이브 밋업 설정을 저장합니다.")
  public ApiResponse<WorkspaceDocResponse> upsertMeetingSettings(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @RequestBody UpdateWorkspaceDocRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.upsertMeetingSettings(workspaceId, requireUserId(userId), request));
  }

  @GetMapping("/workspaces/{workspaceId}/meeting-settings")
  @Operation(summary = "밋업 설정 조회", description = "워크스페이스 라이브 밋업 설정을 조회합니다.")
  public ApiResponse<WorkspaceDocResponse> getMeetingSettings(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.getDoc(
            workspaceId, requireUserId(userId), WorkspaceDocType.MEETING_SETTINGS));
  }

  @PostMapping("/workspaces/{workspaceId}/meeting-notes")
  @Operation(summary = "회의록 생성", description = "워크스페이스에 회의록을 생성합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<MeetingNoteResponse> createMeetingNote(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Valid @RequestBody CreateMeetingNoteRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.createMeetingNote(workspaceId, requireUserId(userId), request));
  }

  @GetMapping("/workspaces/{workspaceId}/meeting-notes")
  @Operation(summary = "회의록 목록 조회", description = "워크스페이스의 회의록 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<MeetingNoteResponse>> getMeetingNotes(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(workspaceDocService.getMeetingNotes(workspaceId, requireUserId(userId)));
  }

  @PutMapping("/meeting-notes/{noteId}")
  @Operation(summary = "Update meeting note", description = "Updates a workspace meeting note.")
  public ApiResponse<MeetingNoteResponse> updateMeetingNote(
      @Parameter(description = "Meeting note ID", example = "1") @PathVariable Long noteId,
      @Valid @RequestBody CreateMeetingNoteRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        workspaceDocService.updateMeetingNote(noteId, requireUserId(userId), request));
  }

  @org.springframework.web.bind.annotation.DeleteMapping("/meeting-notes/{noteId}")
  @Operation(
      summary = "Delete meeting note",
      description = "Soft deletes a workspace meeting note.")
  public ApiResponse<Void> deleteMeetingNote(
      @Parameter(description = "Meeting note ID", example = "1") @PathVariable Long noteId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    workspaceDocService.deleteMeetingNote(noteId, requireUserId(userId));
    return ApiResponse.ok(null);
  }
}
