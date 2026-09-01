package com.devpath.api.voice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.devpath.api.voice.dto.VoiceResponse;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.entity.VoiceMeetingMinutes;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.voice.repository.VoiceChatMessageRepository;
import com.devpath.domain.voice.repository.VoiceMeetingMinutesRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class VoiceMeetingMinutesServiceTest {

  @Mock private VoiceChannelRepository voiceChannelRepository;
  @Mock private UserRepository userRepository;
  @Mock private WorkspaceMemberRepository workspaceMemberRepository;
  @Mock private WorkspaceRepository workspaceRepository;
  @Mock private VoiceMeetingMinutesRepository voiceMeetingMinutesRepository;
  @Mock private VoiceChatMessageRepository voiceChatMessageRepository;
  @Mock private WorkspaceTaskRepository workspaceTaskRepository;
  @Mock private GeminiProvider geminiProvider;
  private VoiceMeetingMinutesService voiceMeetingMinutesService;

  @BeforeEach
  void setUp() {
    VoiceChannelAccess voiceChannelAccess =
        new VoiceChannelAccess(
            voiceChannelRepository, userRepository, workspaceMemberRepository, workspaceRepository);
    voiceMeetingMinutesService =
        new VoiceMeetingMinutesService(
            voiceChannelAccess,
            voiceMeetingMinutesRepository,
            voiceChatMessageRepository,
            workspaceTaskRepository,
            new VoiceMinutesAnalyzer(geminiProvider, new ObjectMapper()));
  }

  @Test
  void generateMinutesSummaryParsesGeminiSummaryAndActionItems() {
    long channelId = 5L;
    long workspaceId = 9L;
    long userId = 23L;
    User user =
        User.builder().email("voice@example.com").password("encoded").name("Voice User").build();
    ReflectionTestUtils.setField(user, "id", userId);
    VoiceChannel channel =
        VoiceChannel.builder().workspaceId(workspaceId).creator(user).name("스쿼드 회의").build();
    ReflectionTestUtils.setField(channel, "id", channelId);
    VoiceMeetingMinutes minutes =
        VoiceMeetingMinutes.builder().channel(channel).updatedBy(user).build();
    minutes.update(user, null, "결제 화면을 완성하고 내일 리뷰한다.", null);

    when(voiceChannelRepository.findByIdAndIsDeletedFalse(channelId))
        .thenReturn(Optional.of(channel));
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId))
        .thenReturn(true);
    when(voiceMeetingMinutesRepository.findByChannel_IdAndIsDeletedFalse(channelId))
        .thenReturn(Optional.of(minutes));
    when(voiceChatMessageRepository.findTop500ByChannel_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            channelId))
        .thenReturn(new ArrayList<>());
    when(geminiProvider.generate(anyString()))
        .thenReturn(
            """
            ```json
            {
              "summary": "결제 화면을 완성하고 리뷰 일정을 확정했다.",
              "actionItems": [
                {
                  "title": "결제 UI 완성",
                  "description": "리뷰 전에 결제 화면을 마무리한다.",
                  "priority": "HIGH",
                  "assigneeName": "Voice User",
                  "dueDate": "2026-08-10"
                }
              ]
            }
            ```
            """);

    VoiceResponse.MinutesAnalysisDetail result =
        voiceMeetingMinutesService.generateMinutesSummary(channelId, userId);

    assertThat(result.minutes().summary()).isEqualTo("결제 화면을 완성하고 리뷰 일정을 확정했다.");
    assertThat(result.actionItems()).hasSize(1);
    assertThat(result.actionItems().getFirst().title()).isEqualTo("결제 UI 완성");
    assertThat(result.actionItems().getFirst().dueDate()).isEqualTo(LocalDate.of(2026, 8, 10));
  }
}
