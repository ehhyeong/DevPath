package com.devpath.api.voice.service;

import com.devpath.api.voice.dto.VoiceRequest;
import com.devpath.api.voice.dto.VoiceResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.entity.VoiceEvent;
import com.devpath.domain.voice.entity.VoiceEventType;
import com.devpath.domain.voice.entity.VoiceParticipant;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.voice.repository.VoiceEventRepository;
import com.devpath.domain.voice.repository.VoiceParticipantRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoiceChannelService {

  private final VoiceChannelRepository voiceChannelRepository;
  private final VoiceParticipantRepository voiceParticipantRepository;
  private final VoiceEventRepository voiceEventRepository;
  private final UserRepository userRepository;

  @Transactional
  public VoiceResponse.ChannelDetail createChannel(VoiceRequest.ChannelCreate request) {
    User creator = getUser(request.creatorId());

    VoiceChannel channel =
        VoiceChannel.builder()
            .workspaceId(request.workspaceId())
            .creator(creator)
            .name(request.name())
            .description(request.description())
            .build();

    return VoiceResponse.ChannelDetail.from(voiceChannelRepository.save(channel));
  }

  public List<VoiceResponse.ChannelSummary> getChannels(Long workspaceId) {
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

  @Transactional
  public VoiceResponse.ParticipantDetail join(Long channelId, VoiceRequest.Join request) {
    VoiceChannel channel = getActiveChannel(channelId);
    User user = getUser(request.userId());

    // 이미 현재 접속 중인 사용자는 중복 참여할 수 없다.
    validateNotAlreadyJoined(channel.getId(), user.getId());

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
  public VoiceResponse.ParticipantDetail leave(Long channelId, VoiceRequest.Leave request) {
    VoiceParticipant participant =
        voiceParticipantRepository
            .findByChannel_IdAndUser_IdAndActiveTrueAndIsDeletedFalse(channelId, request.userId())
            .orElseThrow(() -> new CustomException(ErrorCode.VOICE_PARTICIPANT_NOT_FOUND));

    // 퇴장 시 음소거, 손들기, 발언 상태를 모두 초기화한다.
    participant.leave();

    return VoiceResponse.ParticipantDetail.from(participant);
  }

  @Transactional
  public VoiceResponse.EventDetail createEvent(Long channelId, VoiceRequest.EventCreate request) {
    VoiceChannel channel = getActiveChannel(channelId);
    User actor = getUser(request.actorId());

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

  private VoiceChannel getActiveChannel(Long channelId) {
    return voiceChannelRepository
        .findByIdAndIsDeletedFalse(channelId)
        .orElseThrow(() -> new CustomException(ErrorCode.VOICE_CHANNEL_NOT_FOUND));
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
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
