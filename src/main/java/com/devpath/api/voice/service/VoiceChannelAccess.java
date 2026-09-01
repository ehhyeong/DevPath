package com.devpath.api.voice.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class VoiceChannelAccess {

  private final VoiceChannelRepository voiceChannelRepository;
  private final UserRepository userRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceRepository workspaceRepository;

  VoiceChannel getActiveChannel(Long channelId) {
    return voiceChannelRepository
        .findByIdAndIsDeletedFalse(channelId)
        .orElseThrow(() -> new CustomException(ErrorCode.VOICE_CHANNEL_NOT_FOUND));
  }

  User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  void validateWorkspaceMember(Long workspaceId, Long userId) {
    if (userId != null
        && (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)
            || workspaceRepository.existsByIdAndOwnerIdAndIsDeletedFalse(workspaceId, userId))) {
      return;
    }
    throw new CustomException(ErrorCode.VOICE_FORBIDDEN);
  }
}
