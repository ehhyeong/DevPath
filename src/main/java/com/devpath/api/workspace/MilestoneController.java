package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.CreateMilestoneRequest;
import com.devpath.api.workspace.dto.MilestoneResponse;
import com.devpath.api.workspace.dto.UpdateMilestoneRequest;
import com.devpath.api.workspace.service.MilestoneService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Milestone API", description = "워크스페이스 마일스톤 API")
public class MilestoneController {

  private final MilestoneService milestoneService;

  @PostMapping("/workspaces/{workspaceId}/milestones")
  @Operation(summary = "마일스톤 생성", description = "워크스페이스에 마일스톤을 생성합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "워크스페이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<MilestoneResponse> createMilestone(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Valid @RequestBody CreateMilestoneRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        milestoneService.createMilestone(workspaceId, requireUserId(userId), request));
  }

  @GetMapping("/workspaces/{workspaceId}/milestones")
  @Operation(summary = "마일스톤 목록 조회", description = "워크스페이스의 마일스톤 목록을 마감일 오름차순으로 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "워크스페이스 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<MilestoneResponse>> getMilestones(
      @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(milestoneService.getMilestones(workspaceId, requireUserId(userId)));
  }

  @PatchMapping("/milestones/{milestoneId}")
  @Operation(summary = "마일스톤 수정", description = "마일스톤 제목, 설명, 날짜, 상태를 수정합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "수정 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "마일스톤 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<MilestoneResponse> updateMilestone(
      @Parameter(description = "마일스톤 ID", example = "1") @PathVariable Long milestoneId,
      @Valid @RequestBody UpdateMilestoneRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        milestoneService.updateMilestone(milestoneId, requireUserId(userId), request));
  }

  @DeleteMapping("/milestones/{milestoneId}")
  @Operation(summary = "마일스톤 삭제", description = "마일스톤을 소프트 삭제합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "삭제 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "멤버 아님",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "마일스톤 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> deleteMilestone(
      @Parameter(description = "마일스톤 ID", example = "1") @PathVariable Long milestoneId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    milestoneService.deleteMilestone(milestoneId, requireUserId(userId));
    return ApiResponse.ok(null);
  }
}
