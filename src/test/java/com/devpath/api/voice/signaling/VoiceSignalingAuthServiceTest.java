package com.devpath.api.voice.signaling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.common.security.JwtTokenProvider;
import com.devpath.common.security.TokenRedisService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VoiceSignalingAuthServiceTest {

  @Mock private JwtTokenProvider jwtTokenProvider;
  @Mock private TokenRedisService tokenRedisService;
  @Mock private VoiceChannelRepository voiceChannelRepository;
  @Mock private UserRepository userRepository;
  @Mock private WorkspaceMemberRepository workspaceMemberRepository;
  @Mock private WorkspaceRepository workspaceRepository;

  @InjectMocks private VoiceSignalingAuthService voiceSignalingAuthService;

  @Test
  void workspaceOwnerCanAuthenticateWithoutMemberRow() {
    long channelId = 6L;
    long workspaceId = 9L;
    long ownerId = 23L;
    String token = "access-token";
    VoiceChannel channel = mock(VoiceChannel.class);
    User owner = mock(User.class);

    when(jwtTokenProvider.parseAccessToken(token))
        .thenReturn(new JwtTokenProvider.TokenClaims(ownerId, "jti", "ROLE_INSTRUCTOR", "ACCESS"));
    when(tokenRedisService.isAccessJtiBlacklisted("jti")).thenReturn(false);
    when(voiceChannelRepository.findByIdAndIsDeletedFalse(channelId))
        .thenReturn(Optional.of(channel));
    when(channel.getId()).thenReturn(channelId);
    when(channel.getWorkspaceId()).thenReturn(workspaceId);
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, ownerId))
        .thenReturn(false);
    when(workspaceRepository.existsByIdAndOwnerIdAndIsDeletedFalse(workspaceId, ownerId))
        .thenReturn(true);
    when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
    when(owner.getId()).thenReturn(ownerId);
    when(owner.getName()).thenReturn("홍지훈");

    VoiceSignalingUser authenticated = voiceSignalingAuthService.authenticate(channelId, token);

    assertThat(authenticated).isEqualTo(new VoiceSignalingUser(ownerId, "홍지훈", channelId));
  }
}
