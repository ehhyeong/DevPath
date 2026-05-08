package com.devpath.api.squad.controller;

import com.devpath.api.squad.dto.CreateSquadRequest;
import com.devpath.api.squad.dto.InviteSquadMemberRequest;
import com.devpath.api.squad.dto.SquadInvitationResponse;
import com.devpath.api.squad.dto.SquadResponse;
import com.devpath.api.squad.dto.SquadSettingsResponse;
import com.devpath.api.squad.dto.UpdateSquadSettingsRequest;
import com.devpath.api.squad.service.SquadService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerDocConstants;
import com.devpath.common.swagger.SwaggerErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/squads")
@RequiredArgsConstructor
@Tag(
    name = "Squad API",
    description = "스쿼드(팀) 생성, 초대, 설정, 보관/복원, 해체 API입니다. userId=1은 팀장, userId=2는 팀원으로 테스트하세요.")
public class SquadController {

  private final SquadService squadService;

  @PostMapping
  @Operation(summary = "스쿼드 생성", description = "새 스쿼드를 생성하고 요청자를 LEADER로 등록합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "스쿼드 생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "400",
        description = "잘못된 요청",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "사용자를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadResponse> createSquad(
      @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
          @RequestParam
          Long userId,
      @Valid @RequestBody CreateSquadRequest request) {
    return ApiResponse.ok(squadService.createSquad(userId, request));
  }

  @GetMapping("/{squadId}")
  @Operation(summary = "스쿼드 조회", description = "스쿼드 상세 정보와 멤버 목록을 조회합니다. 보관된 스쿼드도 조회 가능합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "스쿼드 조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadResponse> getSquad(
      @Parameter(description = "스쿼드 ID", example = "1") @PathVariable Long squadId) {
    return ApiResponse.ok(squadService.getSquad(squadId));
  }

  @PostMapping("/{squadId}/invite")
  @Operation(summary = "멤버 초대", description = "LEADER만 팀원을 초대할 수 있습니다. 초대는 PENDING 상태로 생성됩니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "초대 생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드 또는 사용자를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "409",
        description = "이미 멤버이거나 초대 대기 중",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadInvitationResponse> inviteMember(
      @Parameter(description = "스쿼드 ID", example = "1") @PathVariable Long squadId,
      @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
          @RequestParam
          Long userId,
      @Valid @RequestBody InviteSquadMemberRequest request) {
    return ApiResponse.ok(squadService.inviteMember(squadId, userId, request));
  }

  @GetMapping("/{squadId}/settings")
  @Operation(
      summary = "스쿼드 설정 조회",
      description = "LEADER가 스쿼드 이름, 설명, 보관 여부, 멤버 수, 대표 LEADER 정보를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "스쿼드 설정 조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드 또는 사용자를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadSettingsResponse> getSettings(
      @Parameter(description = "스쿼드 ID", example = "1") @PathVariable Long squadId,
      @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
          @RequestParam
          Long userId) {
    return ApiResponse.ok(squadService.getSettings(squadId, userId));
  }

  @PatchMapping("/{squadId}/settings")
  @Operation(summary = "스쿼드 설정 수정", description = "LEADER만 이름과 설명을 수정할 수 있습니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "설정 수정 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadResponse> updateSettings(
      @Parameter(description = "스쿼드 ID", example = "1") @PathVariable Long squadId,
      @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
          @RequestParam
          Long userId,
      @Valid @RequestBody UpdateSquadSettingsRequest request) {
    return ApiResponse.ok(squadService.updateSettings(squadId, userId, request));
  }

  @PatchMapping("/{squadId}/archive")
  @Operation(summary = "스쿼드 보관", description = "LEADER만 스쿼드를 보관 상태로 전환할 수 있습니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "보관 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "400",
        description = "이미 보관된 스쿼드",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadResponse> archiveSquad(
      @Parameter(description = "스쿼드 ID", example = "1") @PathVariable Long squadId,
      @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
          @RequestParam
          Long userId) {
    return ApiResponse.ok(squadService.archiveSquad(squadId, userId));
  }

  @PatchMapping("/{squadId}/restore")
  @Operation(summary = "스쿼드 복원", description = "LEADER만 보관된 스쿼드를 활성 상태로 복원할 수 있습니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "복원 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "400",
        description = "보관 상태가 아닌 스쿼드",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadResponse> restoreSquad(
      @Parameter(description = "스쿼드 ID", example = "1") @PathVariable Long squadId,
      @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
          @RequestParam
          Long userId) {
    return ApiResponse.ok(squadService.restoreSquad(squadId, userId));
  }

  @DeleteMapping("/{squadId}")
  @Operation(summary = "스쿼드 해체", description = "LEADER만 스쿼드를 영구 해체(soft delete)할 수 있습니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "해체 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> deleteSquad(
      @Parameter(description = "스쿼드 ID", example = "1") @PathVariable Long squadId,
      @Parameter(description = SwaggerDocConstants.DUMMY_USER_ID_DESCRIPTION, example = "1")
          @RequestParam
          Long userId) {
    squadService.deleteSquad(squadId, userId);
    return ApiResponse.ok();
  }
}
