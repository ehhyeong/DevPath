package com.devpath.api.voice.service;

import com.devpath.api.voice.dto.VoiceRequest;
import com.devpath.api.voice.dto.VoiceResponse;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.voice.entity.VoiceChannel;
import com.devpath.domain.voice.entity.VoiceChatMessage;
import com.devpath.domain.voice.entity.VoiceMeetingMinutes;
import com.devpath.domain.voice.repository.VoiceChatMessageRepository;
import com.devpath.domain.voice.repository.VoiceMeetingMinutesRepository;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoiceMeetingMinutesService {

  private static final int ACTION_ITEM_LIMIT = 20;
  private static final int TRANSCRIPT_LIMIT = 20000;
  private static final int TRANSCRIPT_LINE_LIMIT = 1000;
  private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

  private final VoiceChannelAccess voiceChannelAccess;
  private final VoiceMeetingMinutesRepository voiceMeetingMinutesRepository;
  private final VoiceChatMessageRepository voiceChatMessageRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final VoiceMinutesAnalyzer voiceMinutesAnalyzer;

  public VoiceResponse.MinutesDetail getMinutes(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), userId);

    return voiceMeetingMinutesRepository
        .findByChannel_IdAndIsDeletedFalse(channel.getId())
        .map(VoiceResponse.MinutesDetail::from)
        .orElseGet(() -> VoiceResponse.MinutesDetail.empty(channel));
  }

  @Transactional
  public VoiceResponse.MinutesDetail updateMinutes(
      Long channelId, Long userId, VoiceRequest.MinutesUpdate request) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User user = voiceChannelAccess.getUser(userId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    VoiceMeetingMinutes minutes = getOrCreateMinutes(channel, user);
    minutes.update(user, request.recording(), request.transcript(), request.summary());

    return VoiceResponse.MinutesDetail.from(minutes);
  }

  @Transactional
  public VoiceResponse.MinutesDetail appendMinutesTranscript(
      Long channelId, Long userId, VoiceRequest.MinutesTranscriptAppend request) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User user = voiceChannelAccess.getUser(userId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    VoiceMeetingMinutes minutes = getOrCreateMinutesForUpdate(channel, user);
    minutes.appendTranscript(user, buildTranscriptLine(user, request.text()), TRANSCRIPT_LIMIT);

    return VoiceResponse.MinutesDetail.from(minutes);
  }

  @Transactional
  public VoiceResponse.MinutesAnalysisDetail generateMinutesSummary(Long channelId, Long userId) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User user = voiceChannelAccess.getUser(userId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    VoiceMeetingMinutes minutes = getOrCreateMinutes(channel, user);
    List<VoiceChatMessage> messages =
        voiceChatMessageRepository.findTop500ByChannel_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            channel.getId());
    Collections.reverse(messages);

    String fallbackSummary = buildSummary(minutes, messages);
    VoiceMinutesAnalyzer.Analysis analysis =
        hasInput(minutes, messages)
            ? voiceMinutesAnalyzer.analyze(minutes, messages, fallbackSummary)
            : new VoiceMinutesAnalyzer.Analysis(fallbackSummary, List.of());

    minutes.update(user, null, null, analysis.summary());

    return new VoiceResponse.MinutesAnalysisDetail(
        VoiceResponse.MinutesDetail.from(minutes), analysis.actionItems());
  }

  @Transactional
  public VoiceResponse.MinutesKanbanTasksDetail createKanbanTasksFromMinutes(
      Long channelId, Long userId, VoiceRequest.MinutesActionItemsCreate request) {
    VoiceChannel channel = voiceChannelAccess.getActiveChannel(channelId);
    User user = voiceChannelAccess.getUser(userId);
    voiceChannelAccess.validateWorkspaceMember(channel.getWorkspaceId(), user.getId());

    List<VoiceResponse.MinutesKanbanTask> createdTasks =
        request.actionItems().stream()
            .limit(ACTION_ITEM_LIMIT)
            .map(item -> createWorkspaceTask(channel, user, item))
            .map(workspaceTaskRepository::save)
            .map(VoiceResponse.MinutesKanbanTask::from)
            .toList();

    return new VoiceResponse.MinutesKanbanTasksDetail(createdTasks);
  }

  private WorkspaceTask createWorkspaceTask(
      VoiceChannel channel, User user, VoiceRequest.MinutesActionItemCreate item) {
    WorkspaceTaskPriority priority =
        item.priority() != null ? item.priority() : WorkspaceTaskPriority.MEDIUM;

    return WorkspaceTask.builder()
        .workspaceId(channel.getWorkspaceId())
        .title(shorten(normalizeText(item.title()), 150))
        .description(buildTaskDescription(channel, item))
        .priority(priority)
        .dueDate(item.dueDate())
        .createdById(user.getId())
        .build();
  }

  private String buildTaskDescription(
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

  private String buildTranscriptLine(User user, String text) {
    String time = LocalTime.now().format(TIME_FORMATTER);
    String speakerName = normalizeText(user.getName());
    String transcript = shorten(normalizeText(text), TRANSCRIPT_LINE_LIMIT);

    return "[%s] %s: %s".formatted(time, speakerName.isBlank() ? "User" : speakerName, transcript);
  }

  private boolean hasInput(VoiceMeetingMinutes minutes, List<VoiceChatMessage> messages) {
    return !normalizeText(minutes.getTranscript()).isBlank() || !messages.isEmpty();
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

  private String buildSummary(VoiceMeetingMinutes minutes, List<VoiceChatMessage> messages) {
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
}
