package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.ActivityLogResponse;
import com.devpath.api.workspace.service.ActivityLogService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Activity Log API", description = "워크스페이스 활동 로그 API")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping("/workspaces/{workspaceId}/activity-logs")
    @Operation(summary = "활동 로그 조회", description = "워크스페이스의 전체 활동 로그를 최신순으로 조회합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "워크스페이스 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<List<ActivityLogResponse>> getActivityLogs(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(activityLogService.getActivityLogs(workspaceId, requireUserId(userId)));
    }
}