package com.devpath.api.voice.service;

import com.devpath.api.voice.dto.VoiceResponse;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.voice.entity.VoiceChatMessage;
import com.devpath.domain.voice.entity.VoiceMeetingMinutes;
import com.devpath.domain.workspace.entity.WorkspaceTaskPriority;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class VoiceMinutesAnalyzer {

  private static final int ACTION_ITEM_LIMIT = 20;

  private final GeminiProvider geminiProvider;
  private final ObjectMapper objectMapper;

  Analysis analyze(
      VoiceMeetingMinutes minutes, List<VoiceChatMessage> messages, String fallbackSummary) {
    String response = geminiProvider.generate(buildPrompt(minutes, messages));

    if (normalizeText(response).isBlank()) {
      return new Analysis(fallbackSummary, List.of());
    }

    try {
      JsonNode root = objectMapper.readTree(extractJsonObject(response));
      String summary = normalizeMultiline(root.path("summary").asText());
      List<VoiceResponse.MinutesActionItem> actionItems = parseActionItems(root);

      if (summary.isBlank()) {
        summary = fallbackSummary;
      }

      return new Analysis(summary, actionItems);
    } catch (JsonProcessingException | IllegalArgumentException exception) {
      return new Analysis(fallbackSummary, List.of());
    }
  }

  private String buildPrompt(VoiceMeetingMinutes minutes, List<VoiceChatMessage> messages) {
    String transcript = shorten(normalizeMultiline(minutes.getTranscript()), 12000);
    String chatLines = buildChatLines(messages);

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

  private String buildChatLines(List<VoiceChatMessage> messages) {
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
      if (actionItems.size() >= ACTION_ITEM_LIMIT) {
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
    } catch (IllegalArgumentException exception) {
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
    } catch (RuntimeException exception) {
      return null;
    }
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

  record Analysis(String summary, List<VoiceResponse.MinutesActionItem> actionItems) {}
}
