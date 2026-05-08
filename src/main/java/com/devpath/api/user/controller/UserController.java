package com.devpath.api.user.controller;

import com.devpath.api.user.dto.UserPasswordChangeRequest;
import com.devpath.api.user.dto.UserProfileResponse;
import com.devpath.api.user.dto.UserProfileSetupRequest;
import com.devpath.api.user.dto.UserProfileUpdateRequest;
import com.devpath.api.user.service.UserService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "사용자 API", description = "사용자 프로필과 계정 설정을 다루는 API")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  // 마이페이지 진입 시 현재 로그인한 사용자의 프로필을 내려준다.
  @Operation(summary = "내 프로필 조회", description = "로그인한 사용자의 프로필 정보와 태그를 조회합니다.")
  @GetMapping("/me/profile")
  public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
      @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(userService.getMyProfile(userId)));
  }

  // 프로필 편집 화면에서 수정한 정보를 저장한다.
  @Operation(summary = "내 프로필 수정", description = "로그인한 사용자의 프로필 정보를 수정합니다.")
  @PutMapping("/me/profile")
  public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
      @AuthenticationPrincipal Long userId, @Valid @RequestBody UserProfileUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.ok(userService.updateMyProfile(userId, request)));
  }

  // 계정 설정 화면에서 비밀번호를 변경한다.
  @Operation(summary = "비밀번호 변경", description = "로그인한 사용자의 비밀번호를 변경합니다.")
  @PatchMapping("/me/password")
  public ResponseEntity<ApiResponse<Void>> changePassword(
      @AuthenticationPrincipal Long userId, @Valid @RequestBody UserPasswordChangeRequest request) {
    userService.changePassword(userId, request);
    return ResponseEntity.ok(ApiResponse.success("비밀번호를 변경했습니다.", null));
  }

  // 프로필 편집에 필요한 공식 태그 목록을 제공한다.
  @Operation(summary = "공식 태그 조회", description = "프로필 편집 화면에서 사용할 공식 태그 목록을 조회합니다.")
  @GetMapping("/tags/official")
  public ResponseEntity<ApiResponse<List<UserProfileResponse.TagItem>>> getOfficialTags() {
    return ResponseEntity.ok(ApiResponse.ok(userService.getOfficialTags()));
  }

  // 회원가입 직후 온보딩 화면에서 기본 프로필과 기술 태그를 저장한다.
  @Operation(summary = "프로필 온보딩 저장", description = "회원가입 직후 온보딩 과정에서 프로필과 기술 태그를 저장합니다.")
  @PostMapping("/profile/setup")
  public ResponseEntity<ApiResponse<Void>> setupProfile(
      @AuthenticationPrincipal Long userId, @Valid @RequestBody UserProfileSetupRequest request) {
    userService.setupUserProfileAndTags(userId, request);
    return ResponseEntity.ok(ApiResponse.success("프로필과 기술 태그 저장이 완료되었습니다.", null));
  }
}
