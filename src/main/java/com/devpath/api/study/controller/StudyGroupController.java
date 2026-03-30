package com.devpath.api.study.controller;

import com.devpath.api.study.dto.StudyApplicationResponse;
import com.devpath.api.study.dto.StudyGroupRequest;
import com.devpath.api.study.dto.StudyGroupResponse;
import com.devpath.api.study.dto.StudyGroupStatusRequest;
import com.devpath.api.study.service.StudyGroupService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/study-groups")
@RequiredArgsConstructor
@Tag(name = "Learner - Study Group", description = "스터디 그룹 모집 및 관리 API")
public class StudyGroupController {

    private final StudyGroupService studyGroupService;

    @PostMapping
    @Operation(summary = "스터디 그룹 생성")
    public ApiResponse<StudyGroupResponse> createStudyGroup(
            @RequestParam(defaultValue = "1") Long learnerId,
            @Valid @RequestBody StudyGroupRequest request
    ) {
        return ApiResponse.ok(studyGroupService.createStudyGroup(learnerId, request));
    }

    @GetMapping
    @Operation(summary = "스터디 그룹 목록 조회")
    public ApiResponse<List<StudyGroupResponse>> getAllStudyGroups() {
        return ApiResponse.ok(studyGroupService.getAllStudyGroups());
    }

    @GetMapping("/{groupId}")
    @Operation(summary = "스터디 그룹 상세 조회")
    public ApiResponse<StudyGroupResponse> getStudyGroup(@PathVariable Long groupId) {
        return ApiResponse.ok(studyGroupService.getStudyGroup(groupId));
    }

    @PutMapping("/{groupId}")
    @Operation(summary = "스터디 그룹 수정")
    public ApiResponse<StudyGroupResponse> updateStudyGroup(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "1") Long learnerId,
            @Valid @RequestBody StudyGroupRequest request
    ) {
        return ApiResponse.ok(studyGroupService.updateStudyGroup(groupId, learnerId, request));
    }

    @DeleteMapping("/{groupId}")
    @Operation(summary = "스터디 그룹 삭제 (논리적 삭제)")
    public ApiResponse<Void> deleteStudyGroup(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "1") Long learnerId
    ) {
        studyGroupService.deleteStudyGroup(groupId, learnerId);
        return ApiResponse.ok(null);
    }

    @PatchMapping("/{groupId}/recruitment-status")
    @Operation(summary = "스터디 그룹 모집 상태 변경")
    public ApiResponse<StudyGroupResponse> changeRecruitmentStatus(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "1") Long learnerId,
            @Valid @RequestBody StudyGroupStatusRequest request
    ) {
        return ApiResponse.ok(studyGroupService.changeRecruitmentStatus(groupId, learnerId, request.getStatus()));
    }

    @PostMapping("/{groupId}/applications")
    @Operation(summary = "스터디 그룹 참여 신청", description = "현재 로그인한 유저가 특정 스터디에 가입 신청을 합니다.")
    public ApiResponse<StudyApplicationResponse> applyForStudyGroup(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "1") Long learnerId
    ) {
        return ApiResponse.ok(studyGroupService.applyForStudyGroup(groupId, learnerId));
    }

    @PostMapping("/{groupId}/applications/{applicationId}/approve")
    @Operation(summary = "스터디 그룹 참여 승인")
    public ApiResponse<StudyApplicationResponse> approveApplication(
            @PathVariable Long groupId,
            @PathVariable Long applicationId,
            @RequestParam(defaultValue = "1") Long learnerId
    ) {
        return ApiResponse.ok(studyGroupService.approveApplication(groupId, applicationId, learnerId));
    }

    @PostMapping("/{groupId}/applications/{applicationId}/reject")
    @Operation(summary = "스터디 그룹 참여 거절")
    public ApiResponse<StudyApplicationResponse> rejectApplication(
            @PathVariable Long groupId,
            @PathVariable Long applicationId,
            @RequestParam(defaultValue = "1") Long learnerId
    ) {
        return ApiResponse.ok(studyGroupService.rejectApplication(groupId, applicationId, learnerId));
    }
}
