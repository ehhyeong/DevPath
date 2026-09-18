package com.devpath.api.voice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.entity.VoiceParticipant;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.voice.repository.VoiceChatClearStateRepository;
import com.devpath.domain.voice.repository.VoiceChatMessageRepository;
import com.devpath.domain.voice.repository.VoiceEventRepository;
import com.devpath.domain.voice.repository.VoiceLobbyPresenceRepository;
import com.devpath.domain.voice.repository.VoiceMeetingMinutesRepository;
import com.devpath.domain.voice.repository.VoiceParticipantRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VoiceChannelServiceTest {

  private static final long CHANNEL_ID = 51L;
  private static final long WORKSPACE_ID = 9L;

  @Mock private VoiceChannelRepository voiceChannelRepository;
  @Mock private VoiceChatClearStateRepository voiceChatClearStateRepository;
  @Mock private VoiceChatMessageRepository voiceChatMessageRepository;
  @Mock private VoiceMeetingMinutesRepository voiceMeetingMinutesRepository;
  @Mock private VoiceParticipantRepository voiceParticipantRepository;
  @Mock private VoiceLobbyPresenceRepository voiceLobbyPresenceRepository;
  @Mock private VoiceEventRepository voiceEventRepository;
  @Mock private WorkspaceTaskRepository workspaceTaskRepository;
  @Mock private UserRepository userRepository;
  @Mock private WorkspaceMemberRepository workspaceMemberRepository;
  @Mock private WorkspaceRepository workspaceRepository;
  private VoiceChannelService voiceChannelService;

  @BeforeEach
  void setUp() {
    VoiceChannelAccess voiceChannelAccess =
        new VoiceChannelAccess(
            voiceChannelRepository, userRepository, workspaceMemberRepository, workspaceRepository);
    voiceChannelService =
        new VoiceChannelService(
            voiceChannelAccess,
            voiceChannelRepository,
            voiceChatClearStateRepository,
            voiceChatMessageRepository,
            voiceParticipantRepository,
            voiceLobbyPresenceRepository,
            voiceEventRepository,
            voiceMeetingMinutesRepository);
  }

  @Test
  void participantWithStoppedHeartbeatIsReleasedOnParticipantRead() {
    VoiceChannel channel = channel();
    VoiceParticipant alive = participant(31L, LocalDateTime.now().minusMinutes(10));
    VoiceParticipant stale = participant(32L, LocalDateTime.now().minusMinutes(10));
    givenChannelRead(channel, List.of(alive, stale));
    when(voiceLobbyPresenceRepository.findAliveUserIds(eq(CHANNEL_ID), any()))
        .thenReturn(List.of(31L));

    voiceChannelService.getParticipants(CHANNEL_ID, 31L);

    verify(stale).leave();
    verify(alive, never()).leave();
    // 남은 참가자가 있으면 회의 세션은 유지한다.
    verify(channel, never()).endCurrentSession();
  }

  @Test
  void recentlyJoinedParticipantIsKeptUntilFirstHeartbeat() {
    VoiceChannel channel = channel();
    VoiceParticipant justJoined = participant(33L, LocalDateTime.now());
    givenChannelRead(channel, List.of(justJoined));
    when(voiceLobbyPresenceRepository.findAliveUserIds(eq(CHANNEL_ID), any()))
        .thenReturn(List.of());

    voiceChannelService.getParticipants(CHANNEL_ID, 33L);

    verify(justJoined, never()).leave();
  }

  @Test
  void lastStaleParticipantEndsSessionAndClearsRoomData() {
    VoiceChannel channel = channel();
    VoiceParticipant stale = participant(34L, LocalDateTime.now().minusMinutes(10));
    givenChannelRead(channel, List.of(stale));
    when(voiceLobbyPresenceRepository.findAliveUserIds(eq(CHANNEL_ID), any()))
        .thenReturn(List.of());

    voiceChannelService.getParticipants(CHANNEL_ID, 34L);

    verify(stale).leave();
    verify(channel).endCurrentSession();
    verify(voiceChatMessageRepository).deleteByChannel_Id(CHANNEL_ID);
    verify(voiceChatClearStateRepository).deleteByChannel_Id(CHANNEL_ID);
  }

  private void givenChannelRead(VoiceChannel channel, List<VoiceParticipant> activeParticipants) {
    when(voiceChannelRepository.findByIdAndIsDeletedFalse(CHANNEL_ID))
        .thenReturn(Optional.of(channel));
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(eq(WORKSPACE_ID), any()))
        .thenReturn(true);
    // 첫 조회는 정리 대상 판별용, 두 번째 조회는 정리 후 응답용이다.
    when(voiceParticipantRepository
            .findAllByChannel_IdAndActiveTrueAndIsDeletedFalseOrderByJoinedAtAsc(CHANNEL_ID))
        .thenReturn(activeParticipants, List.of());
  }

  private VoiceChannel channel() {
    VoiceChannel channel = mock(VoiceChannel.class);
    when(channel.getId()).thenReturn(CHANNEL_ID);
    when(channel.getWorkspaceId()).thenReturn(WORKSPACE_ID);
    return channel;
  }

  private VoiceParticipant participant(Long userId, LocalDateTime joinedAt) {
    VoiceParticipant participant = mock(VoiceParticipant.class);
    User user = mock(User.class);
    when(user.getId()).thenReturn(userId);
    when(participant.getUser()).thenReturn(user);
    // 하트비트가 살아 있는 참가자는 입장 시각까지 보지 않으므로 느슨하게 스텁한다.
    lenient().when(participant.getJoinedAt()).thenReturn(joinedAt);
    return participant;
  }

  @Test
  void workspaceOwnerCanReadVoiceChannelsWithoutMemberRow() {
    long workspaceId = 9L;
    long ownerId = 23L;
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, ownerId))
        .thenReturn(false);
    when(workspaceRepository.existsByIdAndOwnerIdAndIsDeletedFalse(workspaceId, ownerId))
        .thenReturn(true);
    when(voiceChannelRepository.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtAsc(
            workspaceId))
        .thenReturn(List.of());

    assertThat(voiceChannelService.getChannels(workspaceId, ownerId)).isEmpty();
  }
}
