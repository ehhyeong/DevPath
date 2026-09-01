package com.devpath.api.voice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.domain.user.repository.UserRepository;
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
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VoiceChannelServiceTest {

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
