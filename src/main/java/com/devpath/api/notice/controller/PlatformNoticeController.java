package com.devpath.api.notice.controller;

import com.devpath.api.notice.dto.PlatformNoticeResponse;
import com.devpath.api.notice.service.PlatformNoticeQueryService;
import com.devpath.common.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class PlatformNoticeController {

  private final PlatformNoticeQueryService platformNoticeQueryService;

  @GetMapping
  public ApiResponse<List<PlatformNoticeResponse>> getNotices() {
    return ApiResponse.success("플랫폼 공지 목록을 조회했습니다.", platformNoticeQueryService.getNotices());
  }

  @GetMapping("/{noticeId}")
  public ApiResponse<PlatformNoticeResponse> getNotice(@PathVariable Long noticeId) {
    return ApiResponse.success("플랫폼 공지를 조회했습니다.", platformNoticeQueryService.getNotice(noticeId));
  }
}
