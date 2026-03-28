package com.devpath.api.admin.dto.account;

import com.devpath.api.admin.entity.AccountLog;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AccountLogResponse {

    private Long logId;
    private Long targetUserId;
    private Long adminId;
    private String logType;
    private String reason;
    private LocalDateTime processedAt;

    public static AccountLogResponse from(AccountLog accountLog) {
        return AccountLogResponse.builder()
                .logId(accountLog.getId())
                .targetUserId(accountLog.getTargetUserId())
                .adminId(accountLog.getAdminId())
                .logType(accountLog.getLogType().name())
                .reason(accountLog.getReason())
                .processedAt(accountLog.getProcessedAt())
                .build();
    }
}