package com.devpath.api.squad.controller;

import com.devpath.api.squad.dto.ChangeSquadMemberRoleRequest;
import com.devpath.api.squad.dto.InviteSquadMemberRequest;
import com.devpath.api.squad.dto.SquadMemberResponse;
import com.devpath.api.squad.dto.SquadResponse;
import com.devpath.api.squad.service.SquadMemberService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/squads")
@RequiredArgsConstructor
@Validated
@Tag(name = "Squad Member API", description = "스쿼드 멤버 조회, 직접 추가, 역할 변경, 강퇴 API입니다.")
public class SquadMemberController {

  private final SquadMemberService squadMemberService;

  @GetMapping("/me")
  @Operation(summary = "내 참여 스쿼드 목록 조회", description = "요청 사용자가 활성 멤버로 참여 중인 스쿼드 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "내 참여 스쿼드 목록 조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "사용자를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<List<SquadResponse>> getMySquads(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(squadMemberService.getMySquads(userId));
  }

  @PostMapping("/{squadId}/members")
  @Operation(summary = "스쿼드 멤버 직접 추가", description = "LEADER가 특정 사용자를 스쿼드 멤버로 직접 추가합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "스쿼드 멤버 추가 성공"),
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
        description = "이미 스쿼드 멤버",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadMemberResponse> addMember(
      @Parameter(description = "스쿼드 ID", example = "1")
          @PathVariable
          @Positive(message = "스쿼드 ID는 양수여야 합니다.")
          Long squadId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long leaderId,
      @Valid @RequestBody InviteSquadMemberRequest request) {
    return ApiResponse.ok(squadMemberService.addMember(squadId, leaderId, request.getInviteeId()));
  }

  @PatchMapping("/{squadId}/members/{memberId}/role")
  @Operation(summary = "스쿼드 멤버 역할 변경", description = "LEADER가 스쿼드 멤버의 역할을 LEADER 또는 MEMBER로 변경합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "스쿼드 멤버 역할 변경 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "400",
        description = "마지막 LEADER 강등 불가",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드 또는 멤버를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<SquadMemberResponse> changeMemberRole(
      @Parameter(description = "스쿼드 ID", example = "1")
          @PathVariable
          @Positive(message = "스쿼드 ID는 양수여야 합니다.")
          Long squadId,
      @Parameter(description = "스쿼드 멤버 ID", example = "2")
          @PathVariable
          @Positive(message = "멤버 ID는 양수여야 합니다.")
          Long memberId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long leaderId,
      @Valid @RequestBody ChangeSquadMemberRoleRequest request) {
    return ApiResponse.ok(
        squadMemberService.changeMemberRole(squadId, leaderId, memberId, request.getRole()));
  }

  @DeleteMapping("/{squadId}/members/{memberId}")
  @Operation(
      summary = "스쿼드 멤버 강퇴",
      description = "LEADER가 특정 멤버를 스쿼드에서 제거합니다. 실제 삭제 대신 soft delete 처리합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "스쿼드 멤버 강퇴 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "400",
        description = "자기 자신 강퇴 또는 마지막 LEADER 제거 불가",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "LEADER 권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "스쿼드 또는 멤버를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<Void> removeMember(
      @Parameter(description = "스쿼드 ID", example = "1")
          @PathVariable
          @Positive(message = "스쿼드 ID는 양수여야 합니다.")
          Long squadId,
      @Parameter(description = "스쿼드 멤버 ID", example = "2")
          @PathVariable
          @Positive(message = "멤버 ID는 양수여야 합니다.")
          Long memberId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long leaderId) {
    squadMemberService.removeMember(squadId, leaderId, memberId);
    return ApiResponse.ok();
  }
}
