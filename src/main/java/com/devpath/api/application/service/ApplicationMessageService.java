package com.devpath.api.application.service;

import com.devpath.api.application.dto.ApplicationMessageRequest;
import com.devpath.api.application.dto.ApplicationMessageResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.application.entity.ApplicationMessage;
import com.devpath.domain.application.entity.LoungeApplication;
import com.devpath.domain.application.repository.ApplicationMessageRepository;
import com.devpath.domain.application.repository.LoungeApplicationRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApplicationMessageService {

  private final ApplicationMessageRepository applicationMessageRepository;
  private final LoungeApplicationRepository loungeApplicationRepository;
  private final UserRepository userRepository;

  @Transactional
  public ApplicationMessageResponse.Detail create(
      Long applicationId, Long senderId, ApplicationMessageRequest.Create request) {
    LoungeApplication application = getActiveApplication(applicationId);
    User sender = getUser(senderId);

    // 라운지 신청서의 발신자 또는 수신자만 메시지를 작성할 수 있다.
    validateParticipant(application, sender.getId());

    ApplicationMessage message =
        ApplicationMessage.builder()
            .application(application)
            .sender(sender)
            .content(request.content())
            .build();

    return ApplicationMessageResponse.Detail.from(
        applicationMessageRepository.save(message), sender.getId());
  }

  public List<ApplicationMessageResponse.Detail> getMessages(Long applicationId, Long viewerId) {
    LoungeApplication application = getActiveApplication(applicationId);

    // 라운지 신청서의 발신자 또는 수신자만 메시지 목록을 조회할 수 있다.
    validateParticipant(application, viewerId);

    return applicationMessageRepository
        .findAllByApplication_IdAndIsDeletedFalseOrderByCreatedAtAsc(applicationId)
        .stream()
        .map(message -> ApplicationMessageResponse.Detail.from(message, viewerId))
        .toList();
  }

  private LoungeApplication getActiveApplication(Long applicationId) {
    // Soft Delete 된 신청서/제안서는 메시지 작성과 조회 대상에서 제외한다.
    return loungeApplicationRepository
        .findByIdAndIsDeletedFalse(applicationId)
        .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
  }

  private User getUser(Long userId) {
    // 잘못된 사용자 ID를 받은 경우 명확한 비즈니스 예외를 발생시킨다.
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateParticipant(LoungeApplication application, Long userId) {
    boolean sender = application.getSender().getId().equals(userId);
    boolean receiver = application.getReceiver().getId().equals(userId);

    if (!sender && !receiver) {
      throw new CustomException(ErrorCode.APPLICATION_MESSAGE_FORBIDDEN);
    }
  }
}
