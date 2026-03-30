package com.devpath.api.dashboard.dto;

import com.devpath.domain.study.entity.StudyGroupStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "학습자 대시보드 스터디 그룹 요약 응답 DTO")
public class DashboardStudyGroupResponse {

    @Schema(description = "현재 참여 중인 스터디 그룹 수", example = "2")
    private Integer joinedGroupCount;

    @Schema(description = "모집 중인 스터디 그룹 수", example = "1")
    private Integer recruitingGroupCount;

    @Schema(description = "진행 중인 스터디 그룹 수", example = "1")
    private Integer inProgressGroupCount;

    @Schema(description = "최근 참여 스터디 그룹 목록")
    private List<StudyGroupItem> groups;

    @Getter
    @Builder
    @Schema(description = "대시보드 스터디 그룹 항목 DTO")
    public static class StudyGroupItem {

        @Schema(description = "스터디 그룹 ID", example = "1")
        private Long groupId;

        @Schema(description = "스터디 그룹명", example = "Spring 백엔드 스터디")
        private String name;

        @Schema(description = "스터디 그룹 상태", example = "RECRUITING")
        private StudyGroupStatus status;

        @Schema(description = "최대 인원 수", example = "6")
        private Integer maxMembers;

        @Schema(description = "가입 승인 시각")
        private LocalDateTime joinedAt;
    }
}
