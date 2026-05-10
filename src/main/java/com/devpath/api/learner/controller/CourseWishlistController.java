package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.CourseWishlistDto;
import com.devpath.api.learner.service.CourseWishlistService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "학습자 강의 찜", description = "학습자 강의 찜 API")
@RestController
@RequestMapping("/api/me/wishlist/courses")
@RequiredArgsConstructor
public class CourseWishlistController {

  private final CourseWishlistService courseWishlistService;

  /** 찜 추가 */
  @Operation(summary = "강의 찜 추가", description = "강의를 찜 목록에 추가합니다.")
  @PostMapping("/{courseId}")
  public ResponseEntity<ApiResponse<CourseWishlistDto.AddWishlistResponse>> addToWishlist(
      @AuthenticationPrincipal Long userId, @PathVariable Long courseId) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(courseWishlistService.addToWishlistResponse(userId, courseId)));
  }

  /** 찜 삭제 */
  @Operation(summary = "강의 찜 삭제", description = "강의를 찜 목록에서 제거합니다.")
  @DeleteMapping("/{courseId}")
  public ResponseEntity<ApiResponse<CourseWishlistDto.RemoveWishlistResponse>> removeFromWishlist(
      @AuthenticationPrincipal Long userId, @PathVariable Long courseId) {
    return ResponseEntity.ok(
        ApiResponse.ok(courseWishlistService.removeFromWishlistResponse(userId, courseId)));
  }

  /** 내 찜 목록 조회 */
  @Operation(summary = "내 찜 목록 조회", description = "내가 찜한 강의 목록을 조회합니다.")
  @GetMapping
  public ResponseEntity<ApiResponse<List<CourseWishlistDto.WishlistResponse>>> getMyWishlist(
      @AuthenticationPrincipal Long userId) {
    return ResponseEntity.ok(ApiResponse.ok(courseWishlistService.getMyWishlistResponses(userId)));
  }
}
