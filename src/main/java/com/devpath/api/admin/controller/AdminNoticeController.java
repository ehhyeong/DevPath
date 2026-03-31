package com.devpath.api.admin.controller;

import com.devpath.api.admin.dto.notice.NoticeCreateRequest;
import com.devpath.api.admin.dto.notice.NoticeResponse;
import com.devpath.api.admin.service.AdminNoticeService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin - Notice", description = "관리자 공지사항 API")
@RestController
@RequestMapping("/api/admin/notices")
@RequiredArgsConstructor
public class AdminNoticeController {

    private final AdminNoticeService adminNoticeService;

    @Operation(summary = "전사 공지 등록")
    @PostMapping
    public ApiResponse<NoticeResponse> createNotice(
            @RequestBody @Valid NoticeCreateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success("공지가 등록되었습니다.", adminNoticeService.createNotice(userId, request));
    }

    @Operation(summary = "공지 수정")
    @PutMapping("/{noticeId}")
    public ApiResponse<NoticeResponse> updateNotice(
            @PathVariable Long noticeId,
            @RequestBody @Valid NoticeCreateRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success("공지가 수정되었습니다.", adminNoticeService.updateNotice(noticeId, userId, request));
    }

    @Operation(summary = "공지 삭제", description = "Soft Delete 처리")
    @DeleteMapping("/{noticeId}")
    public ApiResponse<Void> deleteNotice(
            @PathVariable Long noticeId,
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        adminNoticeService.deleteNotice(noticeId, userId);
        return ApiResponse.success("공지가 삭제되었습니다.", null);
    }

    @Operation(summary = "공지 목록 조회", description = "고정 공지 우선, 최신순 정렬")
    @GetMapping
    public ApiResponse<List<NoticeResponse>> getNotices() {
        return ApiResponse.success("공지 목록을 조회했습니다.", adminNoticeService.getNotices());
    }

    @Operation(summary = "공지 상세 조회")
    @GetMapping("/{noticeId}")
    public ApiResponse<NoticeResponse> getNotice(@PathVariable Long noticeId) {
        return ApiResponse.success("공지를 조회했습니다.", adminNoticeService.getNotice(noticeId));
    }
}
