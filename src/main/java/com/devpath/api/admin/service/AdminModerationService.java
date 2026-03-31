package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.moderation.ContentBlindRequest;
import com.devpath.api.admin.dto.moderation.ModerationStatsResponse;
import com.devpath.api.admin.dto.moderation.ReportResolveRequest;
import com.devpath.api.admin.entity.AccountLog;
import com.devpath.api.admin.entity.AccountLogType;
import com.devpath.api.admin.entity.BlindedContent;
import com.devpath.api.admin.entity.ModerationActionType;
import com.devpath.api.admin.entity.ModerationReport;
import com.devpath.api.admin.entity.ModerationReportStatus;
import com.devpath.api.admin.repository.AccountLogRepository;
import com.devpath.api.admin.repository.BlindedContentRepository;
import com.devpath.api.admin.repository.ModerationReportRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminModerationService {

    private final ModerationReportRepository moderationReportRepository;
    private final BlindedContentRepository blindedContentRepository;
    private final UserRepository userRepository;
    private final AccountLogRepository accountLogRepository;

    public void resolveReport(Long reportId, Long adminId, ReportResolveRequest request) {
        ModerationReport report = moderationReportRepository.findByIdAndStatus(reportId, ModerationReportStatus.PENDING)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        report.resolve(adminId, request.getAction());

        // 신고 처리 액션이 SUSPEND이고 대상 사용자가 활성 상태면 제한 처리까지 같이 수행한다.
        if (request.getAction() == ModerationActionType.SUSPEND && report.getTargetUserId() != null) {
            User targetUser = userRepository.findById(report.getTargetUserId())
                    .orElseThrow(() -> new CustomException(ErrorCode.ACCOUNT_NOT_FOUND));

            if (targetUser.getAccountStatus() == AccountStatus.ACTIVE) {
                targetUser.restrict();

                accountLogRepository.save(
                        AccountLog.builder()
                                .targetUserId(targetUser.getId())
                                .adminId(adminId)
                                .logType(AccountLogType.RESTRICT)
                                .reason(request.getReason())
                                .build()
                );
            }
        }
    }

    public void blindContent(Long contentId, Long adminId, ContentBlindRequest request) {
        BlindedContent blindedContent = blindedContentRepository.findByContentIdAndIsActiveTrue(contentId)
                .orElse(null);

        if (blindedContent == null) {
            blindedContentRepository.save(
                    BlindedContent.builder()
                            .contentId(contentId)
                            .adminId(adminId)
                            .reason(request.getReason())
                            .build()
            );
            return;
        }

        blindedContent.blind(adminId, request.getReason());
    }

    @Transactional(readOnly = true)
    public ModerationStatsResponse getModerationStats() {
        long totalReports = moderationReportRepository.count();
        long resolvedReports = moderationReportRepository.countByStatus(ModerationReportStatus.RESOLVED);
        long pendingReports = moderationReportRepository.countByStatus(ModerationReportStatus.PENDING);
        long blindedContents = blindedContentRepository.countByIsActiveTrue();
        long suspendedUsers = moderationReportRepository.countByActionTaken(ModerationActionType.SUSPEND);

        return ModerationStatsResponse.builder()
                .totalReports(totalReports)
                .resolvedReports(resolvedReports)
                .pendingReports(pendingReports)
                .blindedContents(blindedContents)
                .suspendedUsers(suspendedUsers)
                .build();
    }
}
