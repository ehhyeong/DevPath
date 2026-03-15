package com.devpath.api.learner.controller;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.common.dto.CourseListItemResponse;
import com.devpath.api.learner.service.LearnerCourseService;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.course.entity.Course;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Learner - Course", description = "학습자 강의 조회 API")
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class LearnerCourseController {

    private final LearnerCourseService learnerCourseService;

    /**
     * 강의 목록 조회
     */
    @Operation(summary = "강의 목록 조회", description = "전체 강의 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseListItemResponse>>> getCourseList() {
        List<Course> courses = learnerCourseService.getCourseList();

        List<CourseListItemResponse> response = courses.stream()
                .map(course -> CourseListItemResponse.builder()
                        .courseId(course.getCourseId())
                        .title(course.getTitle())
                        .thumbnailUrl(course.getThumbnailUrl())
                        .instructorName(course.getInstructor().getName())
                        .price(course.getPrice() != null ? course.getPrice().intValue() : null)
                        .discountPrice(course.getOriginalPrice() != null ? course.getOriginalPrice().intValue() : null)
                        .status(course.getStatus())
                        // TODO: isBookmarked, isEnrolled, tags 등은 추후 구현
                        .isBookmarked(false)
                        .isEnrolled(false)
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * 강의 상세 조회
     */
    @Operation(summary = "강의 상세 조회", description = "강의 ID로 상세 정보를 조회합니다.")
    @GetMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseDetail(
            @PathVariable Long courseId
    ) {
        Course course = learnerCourseService.getCourseDetail(courseId);

        CourseDetailResponse response = CourseDetailResponse.builder()
                .courseId(course.getCourseId())
                .title(course.getTitle())
                .subtitle(course.getSubtitle())
                .description(course.getDescription())
                .status(course.getStatus().name())
                .price(course.getPrice())
                .originalPrice(course.getOriginalPrice())
                .currency(course.getCurrency())
                .difficultyLevel(course.getDifficultyLevel() != null ? course.getDifficultyLevel().name() : null)
                .language(course.getLanguage())
                .hasCertificate(course.getHasCertificate())
                .thumbnailUrl(course.getThumbnailUrl())
                .introVideoUrl(course.getIntroVideoUrl())
                .videoAssetKey(course.getVideoAssetKey())
                .durationSeconds(course.getDurationSeconds())
                .prerequisites(course.getPrerequisites())
                .jobRelevance(course.getJobRelevance())
                // TODO: sections, objectives, targetAudiences, tags, instructor, news 등은 추후 구현
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
