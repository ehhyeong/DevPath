package com.devpath.api.voice.service;

import com.devpath.api.workspace.dto.WorkspaceTaskResponse;
import com.devpath.api.voice.dto.VoiceRequest;
import com.devpath.api.voice.dto.VoiceResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.entity.VoiceChatClearState;
import com.devpath.domain.voice.entity.VoiceChatMessage;
import com.devpath.domain.voice.entity.VoiceEvent;
import com.devpath.domain.voice.entity.VoiceEventType;
import com.devpath.domain.voice.entity.VoiceLobbyPresence;
import com.devpath.domain.voice.entity.VoiceMeetingMinutes;
import com.devpath.domain.voice.entity.VoiceParticipant;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.voice.repository.VoiceChatClearStateRepository;
import com.devpath.domain.voice.repository.VoiceChatMessageRepository;
import com.devpath.domain.voice.repository.VoiceEventRepository;
import com.devpath.domain.voice.repository.VoiceLobbyPresenceRepository;
import com.devpath.domain.voice.repository.VoiceMeetingMinutesRepository;
import com.devpath.domain.voice.repository.VoiceParticipantRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoiceChannelService {

  private static final int VOICE_CHAT_VISIBLE_MESSAGE_LIMIT = 500;
  private static final int VOICE_CHAT_RETENTION_DAYS = 30;
  private static final int VOICE_MINUTES_ACTION_ITEM_LIMIT = 20;
  private static final int VOICE_MINUTES_TRANSCRIPT_LIMIT = 20000;
  private static final int VOICE_MINUTES_TRANSCRIPT_LINE_LIMIT = 1000;
  private static final DateTimeFormatter VOICE_MINUTES_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("HH:mm");

  private final VoiceChannelRepository voiceChannelRepository;
  private final VoiceChatClearStateRepository voiceChatClearStateRepository;
  private final VoiceChatMessageRepository voiceChatMessageRepository;
  private final VoiceMeetingMinutesRepository voiceMeetingMinutesRepository;
  private final VoiceParticipantRepository voiceParticipantRepository;
  private final VoiceLobbyPresenceRepository voiceLobbyPresenceRepository;
  private final VoiceEventRepository voiceEventRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final UserRepository userRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final GeminiProvider geminiProvider;
  private final ObjectMapper objectMapper;

  @Transactional
  public VoiceResponse.ChannelDetail createChannel(
      Long creatorId, VoiceRequest.ChannelCreate request) {
    User creator = getUser(creatorId);
    validateWorkspaceMember(request.workspaceId(), creator.getId());

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
    validateWorkspaceMember(workspaceId, userId);

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
    VoiceChannel channel = getActiveChannel(channelId);
    validateWorkspaceMember(channel.getWorkspaceId(), userId);

    return voiceParticipantRepository
        .findAllByChannel_IdAndActiveTrueAndIsDeletedFalseOrderByJoinedAtAsc(channel.getId())
        .stream()
        .map(VoiceResponse.ParticipantDetail::from)
        .toList();
  }

  @Transactional
  public VoiceResponse.PresenceDetail touchPresence(Long channelId, Long userId) {
    VoiceChannel channel = getActiveChannel(channelId);
    User user = getUser(userId);
    validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

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
    VoiceChannel channel = getActiveChannel(channelId);
    validateWorkspaceMember(channel.getWorkspaceId(), userId);

    LocalDateTime threshold = LocalDateTime.now().minusSeconds(30);

    return voiceLobbyPresenceRepository
        .findAllByChannel_IdAndLastSeenAtAfterOrderByLastSeenAtDesc(channel.getId(), threshold)
        .stream()
        .map(VoiceResponse.PresenceDetail::from)
        .toList();
  }

  public List<VoiceResponse.ChatMessageDetail> getChatMessages(Long channelId, Long userId) {
    VoiceChannel channel = getActiveChannel(channelId);
    validateWorkspaceMember(channel.getWorkspaceId(), userId);
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

    return messages
        .stream()
        .map(VoiceResponse.ChatMessageDetail::from)
        .toList();
  }

  @Transactional
  public VoiceResponse.ChatMessageDetail sendChatMessage(
      Long channelId, Long senderId, VoiceRequest.ChatMessageCreate request) {
    VoiceChannel channel = getActiveChannel(channelId);
    User sender = getUser(senderId);
    validateWorkspaceMember(channel.getWorkspaceId(), sender.getId());

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
    VoiceChannel channel = getActiveChannel(channelId);
    User user = getUser(userId);
    validateWorkspaceMember(channel.getWorkspaceId(), user.getId());
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

  public VoiceResponse.MinutesDetail getMinutes(Long channelId, Long userId) {
    VoiceChannel channel = getActiveChannel(channelId);
    validateWorkspaceMember(channel.getWorkspaceId(), userId);

    return voiceMeetingMinutesRepository
        .findByChannel_IdAndIsDeletedFalse(channel.getId())
        .map(VoiceResponse.MinutesDetail::from)
        .orElseGet(() -> VoiceResponse.MinutesDetail.empty(channel));
  }

  @Transactional
  public VoiceResponse.MinutesDetail updateMinutes(
      Long channelId, Long userId, VoiceRequest.MinutesUpdate request) {
    VoiceChannel channel = getActiveChannel(channelId);
    User user = getUser(userId);
    validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    VoiceMeetingMinutes minutes = getOrCreateMinutes(channel, user);
    minutes.update(user, request.recording(), request.transcript(), request.summary());

    return VoiceResponse.MinutesDetail.from(minutes);
  }

  @Transactional
  public VoiceResponse.MinutesDetail appendMinutesTranscript(
      Long channelId, Long userId, VoiceRequest.MinutesTranscriptAppend request) {
    VoiceChannel channel = getActiveChannel(channelId);
    User user = getUser(userId);
    validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    VoiceMeetingMinutes minutes = getOrCreateMinutesForUpdate(channel, user);
    minutes.appendTranscript(
        user, buildMinutesTranscriptLine(user, request.text()), VOICE_MINUTES_TRANSCRIPT_LIMIT);

    return VoiceResponse.MinutesDetail.from(minutes);
  }

  @Transactional
  public VoiceResponse.MinutesAnalysisDetail generateMinutesSummary(Long channelId, Long userId) {
    VoiceChannel channel = getActiveChannel(channelId);
    User user = getUser(userId);
    validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    VoiceMeetingMinutes minutes = getOrCreateMinutes(channel, user);
    List<VoiceChatMessage> messages =
        voiceChatMessageRepository.findTop500ByChannel_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            channel.getId());
    Collections.reverse(messages);

    String fallbackSummary = buildMinutesSummary(minutes, messages);
    MinutesAnalysis analysis =
        hasMinutesInput(minutes, messages)
            ? analyzeMinutesWithGemini(minutes, messages, fallbackSummary)
            : new MinutesAnalysis(fallbackSummary, List.of());

    minutes.update(user, null, null, analysis.summary());

    return new VoiceResponse.MinutesAnalysisDetail(
        VoiceResponse.MinutesDetail.from(minutes), analysis.actionItems());
  }

  @Transactional
  public VoiceResponse.MinutesKanbanTasksDetail createKanbanTasksFromMinutes(
      Long channelId, Long userId, VoiceRequest.MinutesActionItemsCreate request) {
    VoiceChannel channel = getActiveChannel(channelId);
    User user = getUser(userId);
    validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    List<WorkspaceTaskResponse> createdTasks =
        request.actionItems().stream()
            .limit(VOICE_MINUTES_ACTION_ITEM_LIMIT)
            .map(item -> createWorkspaceTaskFromActionItem(channel, user, item))
            .map(workspaceTaskRepository::save)
            .map(WorkspaceTaskResponse::from)
            .toList();

    return new VoiceResponse.MinutesKanbanTasksDetail(createdTasks);
  }

  @Transactional
  public VoiceResponse.ParticipantDetail join(Long channelId, Long userId) {
    VoiceChannel channel = getActiveChannel(channelId);
    User user = getUser(userId);
    validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

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
    VoiceChannel channel = getActiveChannel(channelId);
    validateWorkspaceMember(channel.getWorkspaceId(), userId);

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
    VoiceChannel channel = getActiveChannel(channelId);
    User actor = getUser(actorId);
    validateWorkspaceMember(channel.getWorkspaceId(), actor.getId());

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

  private WorkspaceTask createWorkspaceTaskFromActionItem(
      VoiceChannel channel, User user, VoiceRequest.MinutesActionItemCreate item) {
    WorkspaceTaskPriority priority =
        item.priority() != null ? item.priority() : WorkspaceTaskPriority.MEDIUM;

    return WorkspaceTask.builder()
        .workspaceId(channel.getWorkspaceId())
        .title(shorten(normalizeText(item.title()), 150))
        .description(buildActionItemTaskDescription(channel, item))
        .priority(priority)
        .dueDate(item.dueDate())
        .createdById(user.getId())
        .build();
  }

  private String buildActionItemTaskDescription(
      VoiceChannel channel, VoiceRequest.MinutesActionItemCreate item) {
    List<String> lines = new ArrayList<>();
    String description = normalizeMultiline(item.description());
    String assigneeName = normalizeText(item.assigneeName());

    if (!description.isBlank()) {
      lines.add(description);
    }
    if (!assigneeName.isBlank()) {
      lines.add("회의에서 언급된 담당자: " + assigneeName);
    }
    lines.add("출처: " + channel.getName() + " AI 회의록");

    return String.join("\n\n", lines);
  }

  private String buildMinutesTranscriptLine(User user, String text) {
    String time = LocalTime.now().format(VOICE_MINUTES_TIME_FORMATTER);
    String speakerName = normalizeText(user.getName());
    String transcript = shorten(normalizeText(text), VOICE_MINUTES_TRANSCRIPT_LINE_LIMIT);

    return "[%s] %s: %s".formatted(time, speakerName.isBlank() ? "User" : speakerName, transcript);
  }

  private boolean hasMinutesInput(VoiceMeetingMinutes minutes, List<VoiceChatMessage> messages) {
    return !normalizeText(minutes.getTranscript()).isBlank() || !messages.isEmpty();
  }

  private MinutesAnalysis analyzeMinutesWithGemini(
      VoiceMeetingMinutes minutes, List<VoiceChatMessage> messages, String fallbackSummary) {
    String response = geminiProvider.generate(buildGeminiMinutesPrompt(minutes, messages));

    if (normalizeText(response).isBlank()) {
      return new MinutesAnalysis(fallbackSummary, List.of());
    }

    try {
      JsonNode root = objectMapper.readTree(extractJsonObject(response));
      String summary = normalizeMultiline(root.path("summary").asText());
      List<VoiceResponse.MinutesActionItem> actionItems = parseActionItems(root);

      if (summary.isBlank()) {
        summary = fallbackSummary;
      }

      return new MinutesAnalysis(summary, actionItems);
    } catch (JsonProcessingException | IllegalArgumentException e) {
      return new MinutesAnalysis(fallbackSummary, List.of());
    }
  }

  private String buildGeminiMinutesPrompt(
      VoiceMeetingMinutes minutes, List<VoiceChatMessage> messages) {
    String transcript = shorten(normalizeMultiline(minutes.getTranscript()), 12000);
    String chatLines = buildMinutesChatLines(messages);

    return """
        너는 스쿼드 음성 회의록을 정리하는 한국어 AI 비서다.
        아래 회의 기록과 회의 채팅을 읽고 JSON만 반환한다.
        summary는 일반 사용자가 바로 읽기 쉽게 결정 사항, 핵심 논의, 다음 진행을 짧은 문단 또는 불릿으로 정리한다.
        actionItems는 칸반 보드에 등록할 수 있는 실행 가능한 할 일만 넣는다.
        담당자나 마감일이 명확하지 않으면 assigneeName과 dueDate는 null로 둔다.
        priority는 LOW, MEDIUM, HIGH 중 하나만 사용한다.
        반환 형식은 반드시 다음 JSON 구조를 따른다.
        {
          "summary": "회의 핵심 요약",
          "actionItems": [
            {
              "title": "할 일 제목",
              "description": "작업 설명",
              "priority": "MEDIUM",
              "assigneeName": "담당자 이름 또는 null",
              "dueDate": "YYYY-MM-DD 또는 null"
            }
          ]
        }

        회의 기록:
        %s

        회의 채팅:
        %s
        """
        .formatted(transcript.isBlank() ? "(없음)" : transcript, chatLines);
  }

  private String buildMinutesChatLines(List<VoiceChatMessage> messages) {
    if (messages.isEmpty()) {
      return "(없음)";
    }

    return messages.stream()
        .limit(80)
        .map(
            message ->
                message.getSender().getName()
                    + ": "
                    + shorten(normalizeText(message.getContent()), 250))
        .collect(Collectors.joining("\n"));
  }

  private String extractJsonObject(String response) {
    String trimmed = response.trim();
    int start = trimmed.indexOf('{');
    int end = trimmed.lastIndexOf('}');

    if (start < 0 || end <= start) {
      throw new IllegalArgumentException("Gemini response does not contain a JSON object.");
    }

    return trimmed.substring(start, end + 1);
  }

  private List<VoiceResponse.MinutesActionItem> parseActionItems(JsonNode root) {
    JsonNode itemsNode = root.path("actionItems");

    if (!itemsNode.isArray()) {
      return List.of();
    }

    List<VoiceResponse.MinutesActionItem> actionItems = new ArrayList<>();

    for (JsonNode itemNode : itemsNode) {
      if (actionItems.size() >= VOICE_MINUTES_ACTION_ITEM_LIMIT) {
        break;
      }

      String title = shorten(normalizeText(itemNode.path("title").asText()), 150);

      if (title.isBlank()) {
        continue;
      }

      String description = parseNullableText(itemNode.path("description").asText());
      if (description != null) {
        description = shorten(normalizeMultiline(description), 1000);
      }

      actionItems.add(
          new VoiceResponse.MinutesActionItem(
              title,
              description,
              parseTaskPriority(itemNode.path("priority").asText()),
              parseNullableText(itemNode.path("assigneeName").asText()),
              parseNullableDate(itemNode.path("dueDate").asText())));
    }

    return actionItems;
  }

  private WorkspaceTaskPriority parseTaskPriority(String value) {
    String normalized = normalizeText(value);

    if (normalized.isBlank()) {
      return WorkspaceTaskPriority.MEDIUM;
    }

    try {
      return WorkspaceTaskPriority.valueOf(normalized.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      return WorkspaceTaskPriority.MEDIUM;
    }
  }

  private String parseNullableText(String value) {
    String normalized = normalizeText(value);
    return normalized.isBlank() || "null".equalsIgnoreCase(normalized) ? null : normalized;
  }

  private LocalDate parseNullableDate(String value) {
    String normalized = normalizeText(value);

    if (normalized.isBlank() || "null".equalsIgnoreCase(normalized)) {
      return null;
    }

    try {
      return LocalDate.parse(normalized);
    } catch (RuntimeException e) {
      return null;
    }
  }

  private VoiceChannel getActiveChannel(Long channelId) {
    return voiceChannelRepository
        .findByIdAndIsDeletedFalse(channelId)
        .orElseThrow(() -> new CustomException(ErrorCode.VOICE_CHANNEL_NOT_FOUND));
  }

  private VoiceMeetingMinutes getOrCreateMinutes(VoiceChannel channel, User user) {
    return voiceMeetingMinutesRepository
        .findByChannel_IdAndIsDeletedFalse(channel.getId())
        .orElseGet(
            () ->
                voiceMeetingMinutesRepository.save(
                    VoiceMeetingMinutes.builder().channel(channel).updatedBy(user).build()));
  }

  private VoiceMeetingMinutes getOrCreateMinutesForUpdate(VoiceChannel channel, User user) {
    return voiceMeetingMinutesRepository
        .findForUpdateByChannelId(channel.getId())
        .orElseGet(
            () ->
                voiceMeetingMinutesRepository.save(
                    VoiceMeetingMinutes.builder().channel(channel).updatedBy(user).build()));
  }

  private String buildMinutesSummary(
      VoiceMeetingMinutes minutes, List<VoiceChatMessage> messages) {
    List<String> parts = new ArrayList<>();
    String transcript = normalizeText(minutes.getTranscript());

    if (!transcript.isBlank()) {
      parts.add("회의 기록: " + shorten(transcript, 700));
    }

    if (!messages.isEmpty()) {
      String chatLines =
          messages.stream()
              .limit(12)
              .map(
                  message ->
                      message.getSender().getName()
                          + ": "
                          + shorten(normalizeText(message.getContent()), 120))
              .collect(Collectors.joining(" / "));
      parts.add("회의 채팅: " + chatLines);
    }

    if (parts.isEmpty()) {
      return "아직 요약할 회의 기록이나 채팅이 없습니다.";
    }

    return String.join("\n", parts);
  }

  private String normalizeText(String value) {
    return value == null ? "" : value.replaceAll("\\s+", " ").trim();
  }

  private String normalizeMultiline(String value) {
    if (value == null) {
      return "";
    }

    return value
        .replace("\r\n", "\n")
        .replace('\r', '\n')
        .replaceAll("[\\t ]+", " ")
        .replaceAll("\\n{3,}", "\n\n")
        .trim();
  }

  private String shorten(String value, int maxLength) {
    if (value.length() <= maxLength) {
      return value;
    }
    return value.substring(0, maxLength - 3) + "...";
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

  private void validateWorkspaceMember(Long workspaceId, Long userId) {
    if (userId == null
        || !workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      throw new CustomException(ErrorCode.VOICE_FORBIDDEN);
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

  private record MinutesAnalysis(
      String summary, List<VoiceResponse.MinutesActionItem> actionItems) {}
}
