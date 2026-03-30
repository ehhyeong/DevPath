package com.devpath.api.review.controller;

import com.devpath.api.review.dto.ReviewRequest;
import com.devpath.api.review.dto.ReviewResponse;
import com.devpath.api.review.service.ReviewService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Learner - Review", description = "학습자 리뷰 API")
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "리뷰 등록", description = "강의 수강 후 리뷰를 등록합니다.")
    @PostMapping
    public ApiResponse<ReviewResponse> createReview(
            @RequestBody @Valid ReviewRequest request,
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success("리뷰가 등록되었습니다.", reviewService.createReview(request, userId));
    }

    @Operation(summary = "강의별 리뷰 목록 조회")
    @GetMapping
    public ApiResponse<List<ReviewResponse>> getReviewsByCourse(
            @Parameter(description = "강의 ID") @RequestParam Long courseId) {
        return ApiResponse.success("리뷰 목록 조회 성공", reviewService.getReviewsByCourse(courseId));
    }

    @Operation(summary = "리뷰 상세 조회")
    @GetMapping("/{reviewId}")
    public ApiResponse<ReviewResponse> getReview(
            @PathVariable Long reviewId) {
        return ApiResponse.success("리뷰 조회 성공", reviewService.getReview(reviewId));
    }
}