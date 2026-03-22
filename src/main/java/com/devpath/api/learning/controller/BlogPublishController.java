package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.BlogPublishRequest;
import com.devpath.api.learning.dto.BlogPublishResponse;
import com.devpath.api.learning.service.BlogPublishService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강의 학습 - 블로그 발행", description = "TIL을 외부 블로그로 발행하는 기초 API")
@RestController
@RequestMapping("/api/learning/til")
@RequiredArgsConstructor
public class BlogPublishController {

    private final BlogPublishService blogPublishService;

    @Operation(
            summary = "블로그 발행 요청",
            description = "특정 TIL을 외부 블로그 플랫폼으로 발행합니다. 현재 단계에서는 MOCK provider를 사용합니다."
    )
    @PostMapping("/{tilId}/publish")
    public ResponseEntity<ApiResponse<BlogPublishResponse.Publish>> publish(
            @AuthenticationPrincipal Long userId,
            @Parameter(description = "TIL ID", example = "1")
            @PathVariable Long tilId,
            @Valid @RequestBody BlogPublishRequest.Publish request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "블로그 발행이 완료되었습니다.",
                        blogPublishService.publish(userId, tilId, request)
                ));
    }
}
