package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiActionType;
import com.devpath.api.workspace.dto.WorkspaceAiAssistRequest;
import com.devpath.common.provider.GeminiProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Arrays;
import java.util.LinkedHashMap;
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
  // 구조 설명·분석 답변과 ERD·API 명세 전체 교체 제안은 길어 상한을 넉넉히 둔다.
  private static final int MAX_OUTPUT_TOKENS = 8192;

  private final GeminiProvider geminiProvider;

  /** answer와 actions를 담은 응답 JSON을 돌려준다. 호출·파싱에 실패하면 null. */
  JsonNode answer(
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

      return OBJECT_MAPPER.readTree(response.substring(start, end + 1));
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
    prompt.append("1. 워크스페이스 정보에 없는 '사실'을 지어내지 마라. 다만 주어진 정보를 근거로 한 분석·평가·제안은 네 역할이다. ");
    prompt.append("판단을 말할 때는 어떤 데이터를 근거로 했는지 함께 밝혀라.\n");
    prompt.append("2. 팀원이 작업·일정·마일스톤·회의록·ERD·API 명세의 생성·수정·삭제를 요청하면 아래 [변경 제안 작성법]대로 actions에 담는다. ");
    prompt.append("제안은 팀원이 확인 버튼을 눌러야 실행되므로 answer에서 '반영했다'고 말하지 말고 ");
    prompt.append("'아래 변경을 실행하면 반영된다'고 안내하라. 변경 요청이 아니면 actions는 빈 배열이다. 파일 업로드·설정 변경 등 ");
    prompt.append("그 밖의 변경은 지원하지 않는다고 안내하라.\n");
    prompt.append("3. [파일 본문]에 실린 팀 자료실 파일은 내용을 직접 읽고 요약·분석할 수 있다. ");
    prompt.append("본문이 실리지 않은 파일은 괄호 안의 이유(형식·용량·추출 실패)를 밝히고 내용을 추측하지 마라. ");
    prompt.append("본문이 잘려 있으면 일부만 확인했다는 점을 함께 알려라.\n");
    prompt.append("4. 날짜는 위 [오늘]을 기준으로 계산하라.\n");
    prompt.append("5. 단순 조회는 한국어 존댓말 3~5문장. 상세 설명이나 분석을 요구하면 필요한 만큼 길게, ");
    prompt.append("각 줄을 '- '로 시작하는 항목별 목록으로 답하라.\n");
    prompt.append("6. 워크스페이스와 무관한 질문에는 답하지 말고 스쿼드 관련 질문을 유도하라.\n");
    prompt.append("7. 담당자는 이름으로 부르고 내부 ID(id= 값)는 answer에 절대 쓰지 마라. ");
    prompt.append("answer는 화면에 그대로 표시되므로 **, ` 같은 마크다운 강조 기호를 쓰지 마라.\n");
    prompt.append("8. [ERD] 블록은 mermaid erDiagram 원문이다. 테이블·컬럼·PK/FK·관계 카디널리티를 직접 읽어 구조를 설명하고 ");
    prompt.append("정규화·인덱스·확장성 관점에서 분석할 수 있다. 다른 문서를 참고하라고 떠넘기지 마라. ");
    prompt.append("ERD가 비어 있거나 엔티티 이름만 있으면 그 사실을 알리고 무엇을 보완하면 좋을지 제안하라.\n\n");

    prompt.append("[변경 제안 작성법]\n");
    prompt.append("- type별 필드 (수정은 바꿀 필드만 채우고 나머지는 null로 둔다). 팀원이 말하지 않은 마감일·우선순위·담당자를 임의로 채우지 마라:\n");
    prompt.append("  TASK_CREATE: title 필수, description·priority·assigneeId·dueDate 선택\n");
    prompt.append("  TASK_UPDATE: targetId 필수, title·description·priority·status·assigneeId·dueDate 중 바꿀 것\n");
    prompt.append("  EVENT_CREATE: title·startAt 필수, endAt·description 선택\n");
    prompt.append("  EVENT_UPDATE: targetId 필수, title·description·startAt·endAt 중 바꿀 것\n");
    prompt.append("  MILESTONE_CREATE: title·dueDate 필수, startDate·description 선택\n");
    prompt.append("  MILESTONE_UPDATE: targetId 필수, title·description·startDate·dueDate·status 중 바꿀 것\n");
    prompt.append("  MEETING_NOTE_CREATE: title 필수, content 선택\n");
    prompt.append("  MEETING_NOTE_UPDATE: targetId 필수, title·content 중 바꿀 것. content는 수정 후 본문 전체다\n");
    prompt.append("  TASK_DELETE·EVENT_DELETE·MILESTONE_DELETE·MEETING_NOTE_DELETE: targetId 필수\n");
    prompt.append("  ERD_UPDATE: content에 수정 후 mermaid erDiagram 원문 전체, description에 변경 요약 한 줄\n");
    prompt.append("  API_SPEC_UPDATE: content에 수정 후 API 명세 전체, description에 변경 요약 한 줄\n");
    prompt.append("- targetId는 위 워크스페이스 정보의 id= 값, assigneeId는 [팀원]의 id= 값이다. 정보에 없는 id를 지어내지 마라.\n");
    prompt.append("- 날짜는 YYYY-MM-DD, 시각은 YYYY-MM-DDTHH:mm:00 형식이다. '내일', '금요일' 같은 표현은 [오늘] 기준으로 계산하라.\n");
    prompt.append("- priority는 LOW·MEDIUM·HIGH, 작업 status는 TODO·IN_PROGRESS·IN_REVIEW·DONE, ");
    prompt.append("마일스톤 status는 OPEN·IN_PROGRESS·DONE·CLOSED 중 하나다.\n");
    prompt.append("- ERD·API 명세·회의록 수정은 기존 내용을 모두 유지한 채 요청한 부분만 바꾼 전체 본문을 쓴다. ");
    prompt.append("'일부만 실었다. 수정 제안 불가' 표시가 있으면 제안하지 말고 화면에서 직접 수정하도록 안내하라.\n");
    prompt.append("- API 명세는 한 줄에 엔드포인트 하나이며 형식은 'METHOD /경로 | 설명 | 상태 | 담당자 | 요청 | 응답'이다. 기존 줄 형식을 따르라.\n");
    prompt.append("- 삭제·수정 대상이 여러 개와 겹쳐 모호하면 제안하지 말고 어느 것인지 되물어라.\n");
    prompt.append(String.format("- actions는 최대 %d건이다. 같은 대상을 두 번 변경하지 마라.%n", WorkspaceAiActionService.MAX_ACTIONS));
    prompt.append("- actions를 먼저 정한 뒤, answer에는 실제로 담은 변경만 설명하라.\n\n");

    prompt.append("아래 JSON 스키마로만 응답하라.\n");
    prompt.append("{\"actions\":[{\"type\":\"TASK_CREATE\",\"title\":\"...\",\"assigneeId\":숫자,\"dueDate\":\"YYYY-MM-DD\"}],");
    prompt.append("\"answer\":\"답변 문장\"}");
    return prompt.toString();
  }

  // required가 없으면 모델이 actions를 빠뜨리기도 하고, answer를 먼저 쓰면 실제로 담지 않은 변경까지
  // 설명한다(빌더 AI에서 확인). 그래서 필드를 required로 두고 actions → answer 순으로 생성하게 한다.
  // action 필드도 전부 required + nullable로 둔다. 선택 필드로 두면 예비 모델(flash-lite)이 질문 전체를
  // title에 넣고 담당자·마감일·시각을 빼먹는다. 쓰지 않는 필드는 null로 오고, 서버가 null을 값 없음으로 본다.
  private Map<String, Object> responseSchema() {
    Map<String, Object> stringType = Map.of("type", "string");
    Map<String, Object> nullableString = Map.of("type", "string", "nullable", true);
    Map<String, Object> nullableInteger = Map.of("type", "integer", "nullable", true);
    Map<String, Object> actionProperties = new LinkedHashMap<>();
    actionProperties.put(
        "type",
        Map.of(
            "type",
            "string",
            "enum",
            Arrays.stream(WorkspaceAiActionType.values()).map(Enum::name).toList()));
    actionProperties.put("targetId", nullableInteger);
    actionProperties.put("title", nullableString);
    actionProperties.put("description", nullableString);
    actionProperties.put("content", nullableString);
    actionProperties.put("priority", nullableString);
    actionProperties.put("status", nullableString);
    actionProperties.put("assigneeId", nullableInteger);
    actionProperties.put("dueDate", nullableString);
    actionProperties.put("startDate", nullableString);
    actionProperties.put("startAt", nullableString);
    actionProperties.put("endAt", nullableString);
    List<String> actionFields = List.copyOf(actionProperties.keySet());
    Map<String, Object> actionItem =
        Map.of(
            "type",
            "object",
            "properties",
            actionProperties,
            "required",
            actionFields,
            "propertyOrdering",
            actionFields);
    return Map.of(
        "type",
        "object",
        "properties",
        Map.of("actions", Map.of("type", "array", "items", actionItem), "answer", stringType),
        "required",
        List.of("actions", "answer"),
        "propertyOrdering",
        List.of("actions", "answer"));
  }
}