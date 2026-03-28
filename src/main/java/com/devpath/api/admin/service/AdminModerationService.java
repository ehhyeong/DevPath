package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.moderation.ContentBlindRequest;
import com.devpath.api.admin.dto.moderation.ModerationStatsResponse;
import com.devpath.api.admin.dto.moderation.ReportResolveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminModerationService {

    public void resolveReport(Long reportId, ReportResolveRequest request) {
        // TODO: Report Entity 연동 예정
        // reportId 기반으로 신고를 처리합니다. action: WARNING/SUSPEND/DISMISS
    }

    public void blindContent(Long contentId, ContentBlindRequest request) {
        // TODO: Content/Post Entity 연동 예정 (isBlinded 또는 isHidden 플래그 변경)
        // contentId 기반으로 콘텐츠를 블라인드 처리합니다.
    }

    @Transactional(readOnly = true)
    public ModerationStatsResponse getModerationStats() {
        // TODO: 실제 집계 연동 예정
        return ModerationStatsResponse.builder()
                .totalReports(142L)
                .resolvedReports(98L)
                .pendingReports(44L)
                .blindedContents(17L)
                .suspendedUsers(5L)
                .build();
    }
}