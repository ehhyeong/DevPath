package com.devpath.api.squad.controller;

import com.devpath.api.squad.dto.CreateSquadInviteLinkResponse;
import com.devpath.api.squad.dto.SendSquadInviteEmailRequest;
import com.devpath.api.squad.dto.SquadInviteResponse;
import com.devpath.api.squad.service.SquadInviteService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import com.devpath.domain.squad.entity.SquadInvitationStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/squads/{squadId}/invites")
@RequiredArgsConstructor
@Validated
@Tag(
    name = "Squad Invite API",
    description = "스쿼드 초대 링크 생성, 이메일 초대, 초대 목록 조회 API입니다.")
public class SquadInviteController {

  private final SquadInviteService squadInviteService;

  @PostMapping("/link")
  @Operation(summary = "스쿼드 초대 링크 생성", description = "LEADER가 만료 시간이 있는 스쿼드 초대 링크를 생성합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200", description = "초대 링크 생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드 또는 사용자를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<CreateSquadInviteLinkResponse> createInviteLink(
      @Parameter(description = "스쿼드 ID", example = "1")
          @PathVariable
          @Positive(message = "스쿼드 ID는 양수여야 합니다.")
          Long squadId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long inviterId) {
    return ApiResponse.ok(squadInviteService.createInviteLink(squadId, inviterId));
  }

  @PostMapping("/email")
  @Operation(
      summary = "스쿼드 이메일 초대",
      description = "LEADER가 이메일 주소를 기준으로 초대 토큰과 초대 URL을 생성합니다. 실제 메일 발송은 후속 연동 대상입니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200", description = "이메일 초대 생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "409",
        description = "이미 초대 대기 중인 이메일",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadInviteResponse> sendEmailInvite(
      @Parameter(description = "스쿼드 ID", example = "1")
          @PathVariable
          @Positive(message = "스쿼드 ID는 양수여야 합니다.")
          Long squadId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long inviterId,
      @Valid @RequestBody SendSquadInviteEmailRequest request) {
    return ApiResponse.ok(squadInviteService.sendEmailInvite(squadId, inviterId, request));
  }

  @GetMapping
  @Operation(
      summary = "스쿼드 초대 목록 조회",
      description = "스쿼드 기준 초대 목록을 조회합니다. status를 넘기면 PENDING, ACCEPTED, REJECTED, EXPIRED 상태별로 필터링합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200", description = "초대 목록 조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<SquadInviteResponse>> getInvites(
      @Parameter(description = "스쿼드 ID", example = "1")
          @PathVariable
          @Positive(message = "스쿼드 ID는 양수여야 합니다.")
          Long squadId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Parameter(description = "초대 상태 필터", example = "PENDING")
          @RequestParam(required = false)
          SquadInvitationStatus status) {
    return ApiResponse.ok(squadInviteService.getInvites(squadId, userId, status));
  }
}
