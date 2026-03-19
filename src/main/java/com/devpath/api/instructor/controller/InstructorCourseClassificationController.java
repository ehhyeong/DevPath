package com.devpath.api.instructor.controller;

import com.devpath.api.instructor.dto.InstructorNodeClassificationDto;
import com.devpath.api.instructor.dto.InstructorNodeCoverageDto;
import com.devpath.api.instructor.service.InstructorNodeClassificationQueryService;
import com.devpath.api.instructor.service.InstructorNodeCoverageQueryService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "태그 기반 노드 분류 API", description = "강의 태그 기반 자동 분류 및 커버리지 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/instructor")
public class InstructorCourseClassificationController {

  private final InstructorNodeClassificationQueryService instructorNodeClassificationQueryService;
  private final InstructorNodeCoverageQueryService instructorNodeCoverageQueryService;

  @Operation(summary = "강의 자동 노드 분류 결과 조회")
  @GetMapping("/courses/{courseId}/node-classifications")
  public ApiResponse<InstructorNodeClassificationDto.AutoClassificationResponse>
      getCourseNodeClassifications(
          @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
          @PathVariable Long courseId) {
    InstructorNodeClassificationDto.AutoClassificationResponse response =
        instructorNodeClassificationQueryService.getAutoClassifications(userId, courseId);

    return ApiResponse.success("강의 자동 노드 분류 결과를 조회했습니다.", response);
  }

  @Operation(summary = "강의 노드 태그 커버리지 조회")
  @GetMapping("/courses/{courseId}/node-coverages")
  public ApiResponse<InstructorNodeCoverageDto.NodeCoverageResponse> getCourseNodeCoverages(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @PathVariable Long courseId) {
    InstructorNodeCoverageDto.NodeCoverageResponse response =
        instructorNodeCoverageQueryService.getNodeCoverages(userId, courseId);

    return ApiResponse.success("강의 노드 태그 커버리지를 조회했습니다.", response);
  }
}
