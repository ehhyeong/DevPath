package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.account.AccountDetailResponse;
import com.devpath.api.admin.dto.account.AccountLogResponse;
import com.devpath.api.admin.dto.account.AccountStatusUpdateRequest;
import com.devpath.api.admin.entity.AccountLog;
import com.devpath.api.admin.entity.AccountLogType;
import com.devpath.api.admin.repository.AccountLogRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminAccountService {

    private final UserRepository userRepository;
    private final AccountLogRepository accountLogRepository;

    @Transactional(readOnly = true)
    public List<AccountDetailResponse> getAccounts() {
        return userRepository.findAll().stream()
                .map(AccountDetailResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AccountDetailResponse getAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        return AccountDetailResponse.from(user);
    }

    public void restrictAccount(Long userId, Long adminId, AccountStatusUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        user.restrict();
        accountLogRepository.save(AccountLog.builder()
                .targetUserId(userId)
                .adminId(adminId)
                .logType(AccountLogType.RESTRICT)
                .reason(request.getReason())
                .build());
    }

    public void deactivateAccount(Long userId, Long adminId, AccountStatusUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        user.deactivate();
        accountLogRepository.save(AccountLog.builder()
                .targetUserId(userId)
                .adminId(adminId)
                .logType(AccountLogType.DEACTIVATE)
                .reason(request.getReason())
                .build());
    }

    public void restoreAccount(Long userId, Long adminId, AccountStatusUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        user.restore();
        accountLogRepository.save(AccountLog.builder()
                .targetUserId(userId)
                .adminId(adminId)
                .logType(AccountLogType.RESTORE)
                .reason(request.getReason())
                .build());
    }

    public void withdrawAccount(Long userId, Long adminId, AccountStatusUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        user.withdraw();
        accountLogRepository.save(AccountLog.builder()
                .targetUserId(userId)
                .adminId(adminId)
                .logType(AccountLogType.WITHDRAW)
                .reason(request.getReason())
                .build());
    }

    public void approveInstructor(Long userId, Long adminId, AccountStatusUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        user.approveInstructor();
        accountLogRepository.save(AccountLog.builder()
                .targetUserId(userId)
                .adminId(adminId)
                .logType(AccountLogType.APPROVE_INSTRUCTOR)
                .reason(request.getReason())
                .build());
    }

    @Transactional(readOnly = true)
    public List<AccountLogResponse> getAccountLogs(Long userId) {
        return accountLogRepository.findByTargetUserIdOrderByProcessedAtDesc(userId).stream()
                .map(AccountLogResponse::from)
                .collect(Collectors.toList());
    }
}