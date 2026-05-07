package com.devpath.api.workspace;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.workspace.dto.CalendarEventResponse;
import com.devpath.api.workspace.dto.CreateCalendarEventRequest;
import com.devpath.api.workspace.dto.UpdateCalendarEventRequest;
import com.devpath.api.workspace.service.CalendarEventService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Calendar API", description = "워크스페이스 캘린더 이벤트 API")
public class CalendarEventController {

    private final CalendarEventService calendarEventService;

    @PostMapping("/workspaces/{workspaceId}/calendar-events")
    @Operation(summary = "캘린더 이벤트 생성", description = "워크스페이스에 캘린더 이벤트를 생성합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "생성 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "워크스페이스 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<CalendarEventResponse> createEvent(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Valid @RequestBody CreateCalendarEventRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(calendarEventService.createEvent(workspaceId, requireUserId(userId), request));
    }

    @GetMapping("/workspaces/{workspaceId}/calendar-events")
    @Operation(summary = "캘린더 이벤트 목록 조회",
            description = "워크스페이스의 캘린더 이벤트 목록을 조회합니다. year/month 파라미터로 월별 필터링 가능합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "워크스페이스 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<List<CalendarEventResponse>> getEvents(
            @Parameter(description = "워크스페이스 ID", example = "1") @PathVariable Long workspaceId,
            @Parameter(description = "연도 (월별 필터용)", example = "2026") @RequestParam(required = false) Integer year,
            @Parameter(description = "월 (월별 필터용, 1~12)", example = "6") @RequestParam(required = false) Integer month,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(calendarEventService.getEvents(workspaceId, requireUserId(userId), year, month));
    }

    @PatchMapping("/calendar-events/{eventId}")
    @Operation(summary = "캘린더 이벤트 수정", description = "캘린더 이벤트의 제목, 설명, 일시를 수정합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "수정 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "이벤트 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<CalendarEventResponse> updateEvent(
            @Parameter(description = "이벤트 ID", example = "1") @PathVariable Long eventId,
            @Valid @RequestBody UpdateCalendarEventRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(calendarEventService.updateEvent(eventId, requireUserId(userId), request));
    }

    @DeleteMapping("/calendar-events/{eventId}")
    @Operation(summary = "캘린더 이벤트 삭제", description = "캘린더 이벤트를 소프트 삭제합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "멤버 아님",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "이벤트 없음",
                    content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
    })
    public ApiResponse<Void> deleteEvent(
            @Parameter(description = "이벤트 ID", example = "1") @PathVariable Long eventId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        calendarEventService.deleteEvent(eventId, requireUserId(userId));
        return ApiResponse.ok(null);
    }
}