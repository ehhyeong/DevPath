package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.common.provider.GeminiProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
class WorkspaceAiAssistClient {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final int MAX_OUTPUT_TOKENS = 1024;

  private final GeminiProvider geminiProvider;

  String answer(
      String question,
      List<WorkspaceAiAssistRequest.Message> history,
      String workspaceContext,
      LocalDate today) {
    String prompt = buildPrompt(question, history, workspaceContext, today);

    try {
      String response = geminiProvider.generateJson(prompt, responseSchema(), MAX_OUTPUT_TOKENS);

      if (response == null) {
        return null;
      }

      int start = response.indexOf('{');
      int end = response.lastIndexOf('}');

      if (start < 0 || end <= start) {
        return null;
      }

      JsonNode root = OBJECT_MAPPER.readTree(response.substring(start, end + 1));
      return root.path("answer").asText("").trim();
    } catch (Exception e) {
      log.warn("[WorkspaceAiAssistClient] 워크스페이스 AI 답변 파싱 실패: {}", e.getMessage());
      return null;
    }
  }

  private String buildPrompt(
      String question,
      List<WorkspaceAiAssistRequest.Message> history,
      String workspaceContext,
      LocalDate today) {
    StringBuilder prompt = new StringBuilder();
    prompt.append("너는 개발자 학습 플랫폼 DevPath의 스쿼드 워크스페이스 AI 비서다.\n");
    prompt.append("팀원의 질문에 아래 워크스페이스 현재 정보만 근거로 답한다.\n\n");

    prompt.append(
        String.format(
            "[오늘] %s (%s요일)%n%n",
            today,
            today
                .getDayOfWeek()
                .getDisplayName(TextStyle.NARROW, Locale.KOREAN)));

    prompt.append(workspaceContext).append("\n");

    if (history != null && !history.isEmpty()) {
      prompt.append("[직전 대화]\n");
      history.forEach(
          message -> {
            if (!StringUtils.hasText(message.getText())) {
              return;
            }

            prompt.append(
                String.format(
                    "%s: %s%n",
                    "assistant".equals(message.getRole()) ? "비서" : "팀원", message.getText().trim()));
          });
      prompt.append("\n");
    }

    prompt.append("[팀원의 질문]\n").append(question).append("\n\n");

    prompt.append("[규칙]\n");
    prompt.append("1. 위 워크스페이스 정보에 없는 내용은 절대 지어내지 마라. 모르면 해당 정보가 워크스페이스에 없다고 답하라.\n");
    prompt.append("2. 너는 지금 조회만 할 수 있다. 작업 추가·수정·삭제, 일정 등록, ERD 저장 같은 변경 요청을 받으면 ");
    prompt.append("실행한 것처럼 말하지 말고 아직 조회만 지원한다고 안내하라.\n");
    prompt.append("3. 팀 자료실은 파일 목록만 알 수 있고 파일 내용은 읽을 수 없다. 내용을 물으면 솔직히 그렇게 답하라.\n");
    prompt.append("4. 날짜는 위 [오늘]을 기준으로 계산하라.\n");
    prompt.append("5. 답변은 한국어 존댓말로 3~5문장. 항목이 여럿이면 각 줄을 '- '로 시작하는 짧은 목록으로 쓰라.\n");
    prompt.append("6. 워크스페이스와 무관한 질문에는 답하지 말고 스쿼드 관련 질문을 유도하라.\n");
    prompt.append("7. 담당자는 이름으로 부르고 내부 ID는 언급하지 마라.\n\n");

    prompt.append("아래 JSON 스키마로만 응답하라.\n");
    prompt.append("{\"answer\":\"답변 문장\"}");
    return prompt.toString();
  }

  private Map<String, Object> responseSchema() {
    return Map.of(
        "type", "object", "properties", Map.of("answer", Map.of("type", "string")));
  }
}