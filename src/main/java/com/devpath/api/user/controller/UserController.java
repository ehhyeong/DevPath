package com.devpath.api.user.controller;

import com.devpath.api.user.dto.UserProfileSetupRequest;
import com.devpath.api.user.service.UserService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User API", description = "유저 프로필 및 온보딩 관련 API")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "프로필 및 기술 스택 초기 설정", description = "소셜 로그인 직후 온보딩 과정에서 프로필과 보유 기술 태그를 등록합니다.")
    @PostMapping("/profile/setup")
    public ResponseEntity<ApiResponse<Void>> setupProfile(
            // 🔥 필터에서 넘겨준 토큰 안의 유저 ID를 안전하게 주입받음
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UserProfileSetupRequest request
    ) {
        userService.setupUserProfileAndTags(userId, request);
        return ResponseEntity.ok(ApiResponse.success("프로필 및 기술 스택 등록이 완료되었습니다.", null));
    }
}