package com.devpath.api.workspace.integration;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.integration.dto.IntegrationResponse;
import com.devpath.api.workspace.integration.dto.IntegrationStatusUpdateRequest;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.operation.integration.ExternalIntegrationService;
import com.devpath.domain.operation.integration.IntegrationProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "External Integration", description = "워크스페이스 외부 서비스 연동 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExternalIntegrationController {

  private final ExternalIntegrationService integrationService;

  @Operation(summary = "외부 서비스 연동 상태 조회", description = "워크스페이스의 외부 서비스 연동 상태를 조회합니다.")
  @GetMapping("/workspaces/{workspaceId}/integrations")
  public ResponseEntity<ApiResponse<List<IntegrationResponse>>> getIntegrations(
      @Parameter(description = "워크스페이스 ID") @PathVariable Long workspaceId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {

    List<IntegrationResponse> responses =
        integrationService.getIntegrationsByWorkspace(workspaceId, requireUserId(userId));
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @Operation(summary = "외부 서비스 연동 상태 변경", description = "워크스페이스 소유자가 외부 서비스 연동 상태를 변경합니다.")
  @PatchMapping("/workspaces/{workspaceId}/integrations/{provider}")
  public ResponseEntity<ApiResponse<IntegrationResponse>> updateIntegrationStatus(
      @Parameter(description = "워크스페이스 ID") @PathVariable Long workspaceId,
      @Parameter(description = "외부 서비스 제공자") @PathVariable IntegrationProvider provider,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody IntegrationStatusUpdateRequest request) {

    IntegrationResponse response =
        integrationService.updateIntegrationStatus(
            workspaceId, requireUserId(userId), provider, request);
    return ResponseEntity.ok(ApiResponse.success("연동 상태가 변경되었습니다.", response));
  }
}
