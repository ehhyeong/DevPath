package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.CourseWishlistDto;
import com.devpath.api.learner.service.CourseWishlistService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.course.entity.CourseWishlist;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Learner - Course Wishlist", description = "학습자 강의 찜 API")
@RestController
@RequestMapping("/api/me/wishlist/courses")
@RequiredArgsConstructor
public class CourseWishlistController {

    private final CourseWishlistService courseWishlistService;

    /**
     * 찜 추가
     */
    @Operation(summary = "강의 찜 추가", description = "강의를 찜 목록에 추가합니다.")
    @PostMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseWishlistDto.AddWishlistResponse>> addToWishlist(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long courseId
    ) {
        courseWishlistService.addToWishlist(userId, courseId);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(CourseWishlistDto.AddWishlistResponse.of(courseId)));
    }

    /**
     * 찜 삭제
     */
    @Operation(summary = "강의 찜 삭제", description = "강의를 찜 목록에서 제거합니다.")
    @DeleteMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseWishlistDto.RemoveWishlistResponse>> removeFromWishlist(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long courseId
    ) {
        courseWishlistService.removeFromWishlist(userId, courseId);

        return ResponseEntity.ok(ApiResponse.success(CourseWishlistDto.RemoveWishlistResponse.of(courseId)));
    }

    /**
     * 내 찜 목록 조회
     */
    @Operation(summary = "내 찜 목록 조회", description = "내가 찜한 강의 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseWishlistDto.WishlistResponse>>> getMyWishlist(
            @AuthenticationPrincipal Long userId
    ) {
        List<CourseWishlist> wishlists = courseWishlistService.getMyWishlist(userId);

        List<CourseWishlistDto.WishlistResponse> response = wishlists.stream()
                .map(CourseWishlistDto.WishlistResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
