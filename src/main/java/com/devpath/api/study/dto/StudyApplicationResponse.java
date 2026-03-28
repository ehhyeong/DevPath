package com.devpath.api.study.dto;

import com.devpath.domain.study.entity.StudyGroupJoinStatus;
import com.devpath.domain.study.entity.StudyGroupMember;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(description = "스터디 그룹 참여 신청 응답 DTO")
public class StudyApplicationResponse {

    @Schema(description = "신청 ID (Member ID)", example = "1")
    private Long applicationId;

    @Schema(description = "스터디 그룹 ID", example = "1")
    private Long groupId;

    @Schema(description = "신청자(학습자) ID", example = "1")
    private Long learnerId;

    @Schema(description = "참여 상태", example = "PENDING")
    private StudyGroupJoinStatus joinStatus;

    @Schema(description = "가입 승인 일시")
    private LocalDateTime joinedAt;

    public static StudyApplicationResponse from(StudyGroupMember member) {
        return StudyApplicationResponse.builder()
                .applicationId(member.getId())
                .groupId(member.getStudyGroup().getId())
                .learnerId(member.getLearnerId())
                .joinStatus(member.getJoinStatus())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}