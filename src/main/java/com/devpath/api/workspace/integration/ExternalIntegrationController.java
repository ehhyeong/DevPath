package com.devpath.api.workspace.integration;

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
import org.springframework.web.bind.annotation.*;

@Tag(name = "External Integration", description = "외부 서비스 연동 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExternalIntegrationController {

  private final ExternalIntegrationService integrationService;

  @Operation(summary = "외부 서비스 연동 상태 조회", description = "특정 워크스페이스의 모든 외부 서비스 연동 상태를 조회합니다.")
  @GetMapping("/workspaces/{workspaceId}/integrations")
  public ResponseEntity<ApiResponse<List<IntegrationResponse>>> getIntegrations(
      @Parameter(description = "워크스페이스 ID") @PathVariable Long workspaceId) {

    List<IntegrationResponse> responses =
        integrationService.getIntegrationsByWorkspace(workspaceId);
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @Operation(summary = "외부 서비스 연동 상태 변경", description = "특정 외부 서비스의 연동 상태를 활성화 또는 비활성화합니다.")
  @PatchMapping("/workspaces/{workspaceId}/integrations/{provider}")
  public ResponseEntity<ApiResponse<IntegrationResponse>> updateIntegrationStatus(
      @Parameter(description = "워크스페이스 ID") @PathVariable Long workspaceId,
      @Parameter(description = "외부 서비스 제공자 (GITHUB, SLACK 등)") @PathVariable
          IntegrationProvider provider,
      @Valid @RequestBody IntegrationStatusUpdateRequest request) {

    IntegrationResponse response =
        integrationService.updateIntegrationStatus(workspaceId, provider, request);
    return ResponseEntity.ok(ApiResponse.success("연동 상태가 성공적으로 변경되었습니다.", response));
  }
}
