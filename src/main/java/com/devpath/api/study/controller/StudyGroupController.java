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
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*; // @PatchMapping을 포함하는 패키지

import java.util.List;

@RestController
@RequestMapping("/api/study-groups")
@RequiredArgsConstructor
@Tag(name = "Learner - Study Group", description = "스터디 그룹 모집 및 관리 API")
public class StudyGroupController {

    private final StudyGroupService studyGroupService;

    // --- 스터디 기본 CRUD ---
    @PostMapping
    @Operation(summary = "스터디 그룹 생성")
    public ApiResponse<StudyGroupResponse> createStudyGroup(@Valid @RequestBody StudyGroupRequest request) {
        return ApiResponse.ok(studyGroupService.createStudyGroup(request));
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
            @Valid @RequestBody StudyGroupRequest request) {
        return ApiResponse.ok(studyGroupService.updateStudyGroup(groupId, request));
    }

    @DeleteMapping("/{groupId}")
    @Operation(summary = "스터디 그룹 삭제 (논리적 삭제)")
    public ApiResponse<Void> deleteStudyGroup(@PathVariable Long groupId) {
        studyGroupService.deleteStudyGroup(groupId);
        return ApiResponse.ok(null);
    }

    // ✅ 오류 수정됨: @PATCH -> @PatchMapping
    @PatchMapping("/{groupId}/recruitment-status")
    @Operation(summary = "스터디 그룹 모집 상태 변경")
    public ApiResponse<StudyGroupResponse> changeRecruitmentStatus(
            @PathVariable Long groupId,
            @Valid @RequestBody StudyGroupStatusRequest request) {
        return ApiResponse.ok(studyGroupService.changeRecruitmentStatus(groupId, request.getStatus()));
    }

    // --- 스터디 참여 및 승인 프로세스 ---
    @PostMapping("/{groupId}/applications")
    @Operation(summary = "스터디 그룹 참여 신청", description = "현재 로그인한 유저가 특정 스터디에 가입 신청을 합니다.")
    public ApiResponse<StudyApplicationResponse> applyForStudyGroup(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "1") Long learnerId) { // TODO: 추후 Spring Security 연동 시 제거
        return ApiResponse.ok(studyGroupService.applyForStudyGroup(groupId, learnerId));
    }

    @PostMapping("/{groupId}/applications/{applicationId}/approve")
    @Operation(summary = "스터디 그룹 참여 승인")
    public ApiResponse<StudyApplicationResponse> approveApplication(
            @PathVariable Long groupId,
            @PathVariable Long applicationId) {
        return ApiResponse.ok(studyGroupService.approveApplication(groupId, applicationId));
    }

    @PostMapping("/{groupId}/applications/{applicationId}/reject")
    @Operation(summary = "스터디 그룹 참여 거절")
    public ApiResponse<StudyApplicationResponse> rejectApplication(
            @PathVariable Long groupId,
            @PathVariable Long applicationId) {
        return ApiResponse.ok(studyGroupService.rejectApplication(groupId, applicationId));
    }
}