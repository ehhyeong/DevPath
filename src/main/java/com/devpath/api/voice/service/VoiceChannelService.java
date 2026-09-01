package com.devpath.api.voice.service;

import com.devpath.api.voice.dto.VoiceRequest;
import com.devpath.api.voice.dto.VoiceResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.entity.VoiceChatClearState;
import com.devpath.domain.voice.entity.VoiceChatMessage;
import com.devpath.domain.voice.entity.VoiceEvent;
import com.devpath.domain.voice.entity.VoiceEventType;
import com.devpath.domain.voice.entity.VoiceLobbyPresence;
import com.devpath.domain.voice.entity.VoiceParticipant;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.voice.repository.VoiceChatClearStateRepository;
import com.devpath.domain.voice.repository.VoiceChatMessageRepository;
import com.devpath.domain.voice.repository.VoiceEventRepository;
import com.devpath.domain.voice.repository.VoiceLobbyPresenceRepository;
import com.devpath.domain.voice.repository.VoiceMeetingMinutesRepository;
import com.devpath.domain.voice.repository.VoiceParticipantRepository;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoiceChannelService {

  private static final int VOICE_CHAT_VISIBLE_MESSAGE_LIMIT = 500;
  private static final int VOICE_CHAT_RETENTION_DAYS = 30;

  private final VoiceChannelAccess voiceChannelAccess;
  private final VoiceChannelRepository voiceChannelRepository;
  private final VoiceChatClearStateRepository voiceChatClearStateRepository;
  private final VoiceChatMessageRepository voiceChatMessageRepository;
  private final VoiceParticipantRepository voiceParticipantRepository;
  private final VoiceLobbyPresenceRepository voiceLobbyPresenceRepository;
  private final VoiceEventRepository voiceEventRepository;
  private final VoiceMeetingMinutesRepository voiceMeetingMinutesRepository;

  @Transactional
  public VoiceResponse.ChannelDetail createChannel(
      Long creatorId, VoiceRequest.ChannelCreate request) {
    User creator = voiceChannelAccess.getUser(creatorId);
    voiceChannelAccess.validateWorkspaceMember(request.workspaceId(), creator.getId());

    VoiceChannel channel =
        VoiceChannel.builder()
            .workspaceId(request.workspaceId())
            .creator(creator)
            .name(request.name())
            .description(request.description())
            .build();

    return VoiceResponse.ChannelDetail.from(voiceChannelRepository.save(channel));
  }

  public List<VoiceResponse.ChannelSummary> getChannels(Long workspaceId, Long userId) {
    voiceChannelAccess.validateWorkspaceMember(workspaceId, userId);

    return voiceChannelRepository
        .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtAsc(workspaceId)
        .stream()
        .map(
            channel ->
                VoiceResponse.ChannelSummary.from(
                    channel,
                    voiceParticipantRepository.countByChannel_IdAndActiveTrueAndIsDeletedFalse(
                        channel.getId())))
        .toList();
  }

  public List<VoiceResponse.ParticipantDetail> getParticipants(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), userId);

    return voiceParticipantRepository
        .findAllByChannel_IdAndActiveTrueAndIsDeletedFalseOrderByJoinedAtAsc(channel.getId())
        .stream()
        .map(VoiceResponse.ParticipantDetail::from)
        .toList();
  }

  @Transactional
  public VoiceResponse.PresenceDetail touchPresence(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User user = voiceChannelAccess.getUser(userId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    VoiceLobbyPresence presence =
        voiceLobbyPresenceRepository
            .findByChannel_IdAndUser_Id(channel.getId(), user.getId())
            .map(
                existingPresence -> {
                  existingPresence.touch();
                  return existingPresence;
                })
            .orElseGet(
                () ->
                    voiceLobbyPresenceRepository.save(
                        VoiceLobbyPresence.builder().channel(channel).user(user).build()));

    return VoiceResponse.PresenceDetail.from(presence);
  }

  public List<VoiceResponse.PresenceDetail> getPresence(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), userId);

    LocalDateTime threshold = LocalDateTime.now().minusSeconds(30);

    return voiceLobbyPresenceRepository
        .findAllByChannel_IdAndLastSeenAtAfterOrderByLastSeenAtDesc(channel.getId(), threshold)
        .stream()
        .map(VoiceResponse.PresenceDetail::from)
        .toList();
  }

  public List<VoiceResponse.ChatMessageDetail> getChatMessages(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), userId);
    LocalDateTime clearedAt =
        voiceChatClearStateRepository
            .findByChannel_IdAndUser_Id(channel.getId(), userId)
            .map(VoiceChatClearState::getClearedAt)
            .orElse(null);
    List<VoiceChatMessage> messages =
        clearedAt == null
            ? voiceChatMessageRepository
                .findTop500ByChannel_IdAndIsDeletedFalseOrderByCreatedAtDesc(channel.getId())
            : voiceChatMessageRepository
                .findTop500ByChannel_IdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtDesc(
                    channel.getId(), clearedAt);

    Collections.reverse(messages);

    return messages.stream().map(VoiceResponse.ChatMessageDetail::from).toList();
  }

  @Transactional
  public VoiceResponse.ChatMessageDetail sendChatMessage(
      Long channelId, Long senderId, VoiceRequest.ChatMessageCreate request) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User sender = voiceChannelAccess.getUser(senderId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), sender.getId());

    VoiceChatMessage message =
        VoiceChatMessage.builder()
            .channel(channel)
            .sender(sender)
            .content(request.content().trim())
            .build();

    VoiceChatMessage savedMessage = voiceChatMessageRepository.save(message);
    cleanupVoiceChatMessages(channel);

    return VoiceResponse.ChatMessageDetail.from(savedMessage);
  }

  @Transactional
  public VoiceResponse.ChatClearStateDetail clearChatMessages(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User user = voiceChannelAccess.getUser(userId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), user.getId());
    LocalDateTime clearedAt = LocalDateTime.now();

    VoiceChatClearState state =
        voiceChatClearStateRepository
            .findByChannel_IdAndUser_Id(channel.getId(), user.getId())
            .map(
                existingState -> {
                  existingState.clearAt(clearedAt);
                  return existingState;
                })
            .orElseGet(
                () ->
                    voiceChatClearStateRepository.save(
                        VoiceChatClearState.builder()
                            .channel(channel)
                            .user(user)
                            .clearedAt(clearedAt)
                            .build()));

    return VoiceResponse.ChatClearStateDetail.from(state);
  }

  @Transactional
  public VoiceResponse.ParticipantDetail join(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User user = voiceChannelAccess.getUser(userId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    // 이미 현재 접속 중인 사용자는 중복 참여할 수 없다.
    validateNotAlreadyJoined(channel.getId(), user.getId());

    long activeParticipantCount =
        voiceParticipantRepository.countByChannel_IdAndActiveTrueAndIsDeletedFalse(channel.getId());
    ensureCurrentSessionStarted(channel, activeParticipantCount == 0);

    VoiceParticipant participant =
        voiceParticipantRepository
            .findByChannel_IdAndUser_IdAndIsDeletedFalse(channel.getId(), user.getId())
            .map(
                existingParticipant -> {
                  existingParticipant.rejoin();
                  return existingParticipant;
                })
            .orElseGet(
                () ->
                    voiceParticipantRepository.save(
                        VoiceParticipant.builder().channel(channel).user(user).build()));

    return VoiceResponse.ParticipantDetail.from(participant);
  }

  @Transactional
  public VoiceResponse.ParticipantDetail leave(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), userId);

    VoiceParticipant participant =
        voiceParticipantRepository
            .findByChannel_IdAndUser_IdAndActiveTrueAndIsDeletedFalse(channelId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.VOICE_PARTICIPANT_NOT_FOUND));
    long activeParticipantCount =
        voiceParticipantRepository.countByChannel_IdAndActiveTrueAndIsDeletedFalse(channel.getId());

    // 퇴장 시 음소거, 손들기, 발언 상태를 모두 초기화한다.
    participant.leave();
    if (activeParticipantCount <= 1) {
      channel.endCurrentSession();
      resetVoiceRoomSessionData(channel, participant.getUser());
    }

    return VoiceResponse.ParticipantDetail.from(participant);
  }

  @Transactional
  public VoiceResponse.EventDetail createEvent(
      Long channelId, Long actorId, VoiceRequest.EventCreate request) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User actor = voiceChannelAccess.getUser(actorId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), actor.getId());

    VoiceParticipant participant =
        voiceParticipantRepository
            .findByChannel_IdAndUser_IdAndActiveTrueAndIsDeletedFalse(
                channel.getId(), actor.getId())
            .orElseThrow(() -> new CustomException(ErrorCode.VOICE_PARTICIPANT_NOT_FOUND));

    // 이벤트 타입에 맞춰 현재 참가자 상태를 갱신한다.
    applyParticipantState(participant, request.type());

    VoiceEvent event =
        VoiceEvent.builder()
            .channel(channel)
            .actor(actor)
            .type(request.type())
            .memo(request.memo())
            .build();

    return VoiceResponse.EventDetail.from(voiceEventRepository.save(event));
  }

  private void validateNotAlreadyJoined(Long channelId, Long userId) {
    boolean alreadyJoined =
        voiceParticipantRepository
            .findByChannel_IdAndUser_IdAndActiveTrueAndIsDeletedFalse(channelId, userId)
            .isPresent();

    if (alreadyJoined) {
      throw new CustomException(ErrorCode.VOICE_ALREADY_JOINED);
    }
  }

  private void ensureCurrentSessionStarted(VoiceChannel channel, boolean emptyBeforeJoin) {
    if (emptyBeforeJoin) {
      channel.startCurrentSession(LocalDateTime.now());
      return;
    }

    if (channel.getCurrentSessionStartedAt() != null) {
      return;
    }

    LocalDateTime existingStartedAt =
        voiceParticipantRepository
            .findFirstByChannel_IdAndActiveTrueAndIsDeletedFalseOrderByJoinedAtAsc(channel.getId())
            .map(VoiceParticipant::getJoinedAt)
            .orElseGet(LocalDateTime::now);

    channel.startCurrentSession(existingStartedAt);
  }

  private void cleanupVoiceChatMessages(VoiceChannel channel) {
    LocalDateTime retentionThreshold = LocalDateTime.now().minusDays(VOICE_CHAT_RETENTION_DAYS);

    voiceChatMessageRepository.deleteByChannel_IdAndCreatedAtBefore(
        channel.getId(), retentionThreshold);

    List<VoiceChatMessage> newestMessages =
        voiceChatMessageRepository.findTop500ByChannel_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            channel.getId());

    if (newestMessages.size() < VOICE_CHAT_VISIBLE_MESSAGE_LIMIT) {
      return;
    }

    VoiceChatMessage oldestVisibleMessage =
        newestMessages.get(VOICE_CHAT_VISIBLE_MESSAGE_LIMIT - 1);

    voiceChatMessageRepository.deleteByChannel_IdAndCreatedAtBefore(
        channel.getId(), oldestVisibleMessage.getCreatedAt());
  }

  private void resetVoiceRoomSessionData(VoiceChannel channel, User user) {
    voiceChatMessageRepository.deleteByChannel_Id(channel.getId());
    voiceChatClearStateRepository.deleteByChannel_Id(channel.getId());
    voiceMeetingMinutesRepository
        .findByChannel_IdAndIsDeletedFalse(channel.getId())
        .ifPresent(minutes -> minutes.reset(user));
  }

  private void applyParticipantState(VoiceParticipant participant, VoiceEventType type) {
    switch (type) {
      case MUTE -> participant.mute();
      case UNMUTE -> participant.unmute();
      case RAISE_HAND -> participant.raiseHand();
      case LOWER_HAND -> participant.lowerHand();
      case SPEAKING -> participant.startSpeaking();
      case STOP_SPEAKING -> participant.stopSpeaking();
    }
  }
}
