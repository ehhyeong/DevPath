package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.account.AccountDetailResponse;
import com.devpath.api.admin.dto.account.AccountLogResponse;
import com.devpath.api.admin.dto.account.AccountStatusUpdateRequest;
import com.devpath.api.admin.entity.AccountLog;
import com.devpath.api.admin.entity.AccountLogType;
import com.devpath.api.admin.repository.AccountLogRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAccountService {

  private final UserRepository userRepository;
  private final AccountLogRepository accountLogRepository;

  // 목록 조회는 읽기 전용 트랜잭션에서 제네릭 타입을 명확히 반환한다.
  public List<AccountDetailResponse> getAccounts() {
    return userRepository.findAllByOrderByCreatedAtDesc().stream()
        .map(AccountDetailResponse::from)
        .toList();
  }

  public AccountDetailResponse getAccount(Long userId) {
    return AccountDetailResponse.from(getUser(userId));
  }

  @Transactional
  public void restrictAccount(Long userId, Long adminId, AccountStatusUpdateRequest request) {
    User user = getUser(userId);
    validateTransition(user.getAccountStatus(), AccountStatus.RESTRICTED);
    user.restrict();
    saveLog(userId, adminId, AccountLogType.RESTRICT, request.getReason());
  }

  @Transactional
  public void deactivateAccount(Long userId, Long adminId, AccountStatusUpdateRequest request) {
    User user = getUser(userId);
    validateTransition(user.getAccountStatus(), AccountStatus.DEACTIVATED);
    user.deactivate();
    saveLog(userId, adminId, AccountLogType.DEACTIVATE, request.getReason());
  }

  @Transactional
  public void restoreAccount(Long userId, Long adminId, AccountStatusUpdateRequest request) {
    User user = getUser(userId);
    validateTransition(user.getAccountStatus(), AccountStatus.ACTIVE);
    user.restore();
    saveLog(userId, adminId, AccountLogType.RESTORE, request.getReason());
  }

  @Transactional
  public void withdrawAccount(Long userId, Long adminId, AccountStatusUpdateRequest request) {
    User user = getUser(userId);
    validateTransition(user.getAccountStatus(), AccountStatus.WITHDRAWN);
    user.withdraw();
    saveLog(userId, adminId, AccountLogType.WITHDRAW, request.getReason());
  }

  @Transactional
  public void approveInstructor(Long userId, Long adminId, AccountStatusUpdateRequest request) {
    User user = getUser(userId);

    // 탈퇴/비활성/제한 계정은 강사 승인 대상에서 제외한다.
    if (user.getAccountStatus() != AccountStatus.ACTIVE) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }

    user.approveInstructor();
    saveLog(userId, adminId, AccountLogType.APPROVE_INSTRUCTOR, request.getReason());
  }

  public List<AccountLogResponse> getAccountLogs(Long userId) {
    getUser(userId);

    return accountLogRepository.findByTargetUserIdOrderByProcessedAtDesc(userId).stream()
        .map(AccountLogResponse::from)
        .toList();
  }

  // 계정 상태 전이 규칙을 서비스 한 곳에서 고정한다.
  private void validateTransition(AccountStatus current, AccountStatus target) {
    boolean valid =
        switch (current) {
          case ACTIVE ->
              target == AccountStatus.RESTRICTED
                  || target == AccountStatus.DEACTIVATED
                  || target == AccountStatus.WITHDRAWN;
          case RESTRICTED, DEACTIVATED ->
              target == AccountStatus.ACTIVE || target == AccountStatus.WITHDRAWN;
          case WITHDRAWN -> false;
        };

    if (!valid) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.ACCOUNT_NOT_FOUND));
  }

  // 계정 운영 이력은 상태 전이 직후 공통 포맷으로 저장한다.
  private void saveLog(Long userId, Long adminId, AccountLogType logType, String reason) {
    accountLogRepository.save(
        AccountLog.builder()
            .targetUserId(userId)
            .adminId(adminId)
            .logType(logType)
            .reason(reason)
            .build());
  }
}
