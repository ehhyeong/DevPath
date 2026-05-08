package com.devpath.api.realtime.service;

import com.devpath.api.realtime.dto.RealtimeMessageRequest;
import com.devpath.api.realtime.dto.RealtimeMessageResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.realtime.entity.DirectMessage;
import com.devpath.domain.realtime.entity.LoungeChatMessage;
import com.devpath.domain.realtime.entity.MessageSortOrder;
import com.devpath.domain.realtime.repository.DirectMessageRepository;
import com.devpath.domain.realtime.repository.LoungeChatMessageRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RealtimeMessageService {

  private final LoungeChatMessageRepository loungeChatMessageRepository;
  private final DirectMessageRepository directMessageRepository;
  private final UserRepository userRepository;

  @Transactional
  public RealtimeMessageResponse.LoungeChatDetail createLoungeMessage(
      RealtimeMessageRequest.LoungeChatCreate request) {
    User sender = getUser(request.senderId());

    LoungeChatMessage message =
        LoungeChatMessage.builder()
            .loungeId(request.loungeId())
            .sender(sender)
            .content(request.content())
            .build();

    return RealtimeMessageResponse.LoungeChatDetail.from(
        loungeChatMessageRepository.save(message), sender.getId());
  }

  public List<RealtimeMessageResponse.LoungeChatDetail> getLoungeMessages(
      Long loungeId, Long viewerId, MessageSortOrder sort) {
    // viewerId가 실제 사용자 ID인지 검증한다.
    validateUserExists(viewerId);

    MessageSortOrder sortOrder = resolveSortOrder(sort);

    List<LoungeChatMessage> messages =
        sortOrder == MessageSortOrder.LATEST
            ? loungeChatMessageRepository.findAllByLoungeIdAndIsDeletedFalseOrderByCreatedAtDesc(
                loungeId)
            : loungeChatMessageRepository.findAllByLoungeIdAndIsDeletedFalseOrderByCreatedAtAsc(
                loungeId);

    return messages.stream()
        .map(message -> RealtimeMessageResponse.LoungeChatDetail.from(message, viewerId))
        .toList();
  }

  @Transactional
  public RealtimeMessageResponse.DirectDetail createDirectMessage(
      RealtimeMessageRequest.DirectCreate request) {
    User sender = getUser(request.senderId());
    User receiver = getUser(request.receiverId());

    // 자기 자신에게 1:1 메시지를 보내는 잘못된 흐름을 막는다.
    validateNotSelf(sender.getId(), receiver.getId());

    DirectMessage message =
        DirectMessage.builder()
            .sender(sender)
            .receiver(receiver)
            .content(request.content())
            .build();

    return RealtimeMessageResponse.DirectDetail.from(
        directMessageRepository.save(message), sender.getId());
  }

  public List<RealtimeMessageResponse.DirectDetail> getDirectMessages(
      Long userId, Long viewerId, MessageSortOrder sort) {
    // 대화 상대와 현재 조회자가 모두 존재하는 사용자여야 한다.
    validateUserExists(userId);
    validateUserExists(viewerId);

    // 자기 자신과의 1:1 대화 조회는 허용하지 않는다.
    validateNotSelf(userId, viewerId);

    MessageSortOrder sortOrder = resolveSortOrder(sort);

    List<DirectMessage> messages =
        sortOrder == MessageSortOrder.LATEST
            ? directMessageRepository
                .findAllBySender_IdAndReceiver_IdAndIsDeletedFalseOrReceiver_IdAndSender_IdAndIsDeletedFalseOrderByCreatedAtDesc(
                    viewerId, userId, viewerId, userId)
            : directMessageRepository
                .findAllBySender_IdAndReceiver_IdAndIsDeletedFalseOrReceiver_IdAndSender_IdAndIsDeletedFalseOrderByCreatedAtAsc(
                    viewerId, userId, viewerId, userId);

    return messages.stream()
        .map(message -> RealtimeMessageResponse.DirectDetail.from(message, viewerId))
        .toList();
  }

  private User getUser(Long userId) {
    // 잘못된 사용자 ID를 받은 경우 명확한 비즈니스 예외를 발생시킨다.
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateUserExists(Long userId) {
    if (!userRepository.existsById(userId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  private void validateNotSelf(Long senderId, Long receiverId) {
    if (senderId.equals(receiverId)) {
      throw new CustomException(ErrorCode.REALTIME_CANNOT_MESSAGE_SELF);
    }
  }

  private MessageSortOrder resolveSortOrder(MessageSortOrder sort) {
    // 정렬 조건이 없으면 채팅 UI 기본값인 오래된 순으로 반환한다.
    return sort == null ? MessageSortOrder.OLDEST : sort;
  }
}
