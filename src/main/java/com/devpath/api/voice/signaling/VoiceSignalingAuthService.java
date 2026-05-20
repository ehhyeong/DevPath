package com.devpath.api.voice.signaling;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.security.JwtAuthenticationException;
import com.devpath.common.security.JwtTokenProvider;
import com.devpath.common.security.TokenRedisService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class VoiceSignalingAuthService {

  private final JwtTokenProvider jwtTokenProvider;
  private final TokenRedisService tokenRedisService;
  private final VoiceChannelRepository voiceChannelRepository;
  private final UserRepository userRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;

  @Transactional(readOnly = true)
  public VoiceSignalingUser authenticate(Long channelId, String token) {
    if (channelId == null || !StringUtils.hasText(token)) {
      throw new JwtAuthenticationException(ErrorCode.JWT_EMPTY);
    }

    JwtTokenProvider.TokenClaims claims = jwtTokenProvider.parseAccessToken(token);

    if (tokenRedisService.isAccessJtiBlacklisted(claims.jti())) {
      throw new JwtAuthenticationException(ErrorCode.JWT_BLACKLISTED);
    }

    VoiceChannel channel =
        voiceChannelRepository
            .findByIdAndIsDeletedFalse(channelId)
            .orElseThrow(() -> new CustomException(ErrorCode.VOICE_CHANNEL_NOT_FOUND));

    if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(
        channel.getWorkspaceId(), claims.userId())) {
      throw new CustomException(ErrorCode.VOICE_FORBIDDEN);
    }

    User user =
        userRepository
            .findById(claims.userId())
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    return new VoiceSignalingUser(user.getId(), user.getName(), channel.getId());
  }
}
