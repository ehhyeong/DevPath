package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.CreateAiQuizDraftRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class AiQuizDraftQuestionGenerator {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final int MAX_EXPLANATION_LENGTH = 120;
  private static final long FRONTEND_RENDERING_DEMO_FALLBACK_DELAY_MILLIS = 2300L;

  private final AtomicLong draftQuestionSequence = new AtomicLong(1L);
  private final AtomicLong draftOptionSequence = new AtomicLong(1L);
  private final GeminiProvider geminiProvider;

  List<DraftQuestionState> generate(RoadmapNode roadmapNode, CreateAiQuizDraftRequest request) {
    if (isFrontendRenderingDemoRequest(roadmapNode, request)) {
      log.info(
          "[AiQuizDraftQuestionGenerator] Frontend rendering demo fallback 실행. nodeId={}",
          request.getNodeId());
      pauseFrontendRenderingDemoFallback();
      return generateFrontendRenderingFallbackQuestions(request);
    }

    if (Boolean.TRUE.equals(request.getFallbackOnly())) {
      log.warn("[AiQuizDraftQuestionGenerator] AI input is empty. Fallback 실행.");
      return generateFallbackQuestions(request);
    }

    String prompt = buildPrompt(request);
    // thinking 비활성화 + JSON 강제로 생성 지연을 줄인다. (영상 모드는 inline_data 함께 전달)
    String raw =
        geminiProvider.generateJson(
            prompt, request.getSourceMimeType(), request.getSourceBase64Content(), 8192);

    if (raw == null) {
      log.warn("[AiQuizDraftQuestionGenerator] Gemini API 응답 없음. Fallback 실행.");
      return generateFallbackQuestions(request);
    }

    return parseGeminiResponse(raw, request);
  }

  private void pauseFrontendRenderingDemoFallback() {
    try {
      Thread.sleep(FRONTEND_RENDERING_DEMO_FALLBACK_DELAY_MILLIS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn(
          "[AiQuizDraftQuestionGenerator] Frontend rendering demo fallback delay interrupted.");
    }
  }

  private boolean isFrontendRenderingDemoRequest(
      RoadmapNode roadmapNode, CreateAiQuizDraftRequest request) {
    if (roadmapNode == null || request == null || isBlank(request.getSourceText())) {
      return false;
    }

    String nodeTitle = roadmapNode.getTitle();
    String sourceText = request.getSourceText();
    return "퀴즈: HTML CSS JavaScript 렌더링 점검".equals(nodeTitle)
        && sourceText.contains("HTML CSS JavaScript 렌더링")
        && sourceText.contains("DOM")
        && sourceText.contains("CSSOM")
        && sourceText.contains("Vite");
  }

  private String buildPrompt(CreateAiQuizDraftRequest request) {
    int questionCount = request.getQuestionCount() == null ? 3 : request.getQuestionCount();
    int difficultyLevel = request.getDifficultyLevel() == null ? 2 : request.getDifficultyLevel();

    String difficultyLabel;
    if (difficultyLevel == 1) {
      difficultyLabel = "1 (초급 - 기본 개념 이해 수준)";
    } else if (difficultyLevel == 3) {
      difficultyLabel = "3 (고급 - 심화 응용 및 분석 수준)";
    } else {
      difficultyLabel = "2 (중급 - 개념 적용 수준)";
    }

    String questionTypeInstruction;
    if (request.getPreferredQuestionType() == QuestionType.MULTIPLE_CHOICE) {
      questionTypeInstruction = "모두 객관식(MULTIPLE_CHOICE)으로 생성하세요.";
    } else if (request.getPreferredQuestionType() == QuestionType.TRUE_FALSE) {
      questionTypeInstruction = "모두 OX형(TRUE_FALSE)으로 생성하세요.";
    } else if (request.getPreferredQuestionType() == QuestionType.SHORT_ANSWER) {
      questionTypeInstruction = "모두 주관식(SHORT_ANSWER)으로 생성하세요.";
    } else {
      questionTypeInstruction = "MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER 유형을 적절히 혼합하여 생성하세요.";
    }

    return "당신은 IT 교육 퀴즈 전문가입니다. 아래 강의 내용을 분석하여 퀴즈 문항을 생성하세요.\n\n"
        + "[입력 정보]\n"
        + "- 강의 내용: "
        + request.getSourceText()
        + "\n"
        + "- 문항 수: "
        + questionCount
        + "개\n"
        + "- 난이도: "
        + difficultyLabel
        + "\n"
        + "- 문항 유형: "
        + questionTypeInstruction
        + "\n\n"
        + "[출력 형식]\n"
        + "아래 JSON 배열만 반환하세요. 설명, 코드블록(```), 기타 텍스트 없이 순수 JSON 배열만 출력하세요.\n\n"
        + "For every item, write explanation as one concise Korean sentence within 60 characters.\n\n"
        + "[\n"
        + "  {\n"
        + "    \"questionType\": \"MULTIPLE_CHOICE\",\n"
        + "    \"questionText\": \"문제 내용\",\n"
        + "    \"explanation\": \"해설 (왜 이 답이 정답인지)\",\n"
        + "    \"options\": [\n"
        + "      { \"optionText\": \"보기 내용\", \"correct\": true },\n"
        + "      { \"optionText\": \"보기 내용\", \"correct\": false }\n"
        + "    ]\n"
        + "  }\n"
        + "]\n\n"
        + "[유형별 제약사항]\n"
        + "- MULTIPLE_CHOICE: options 정확히 4개, correct true인 항목 정확히 1개\n"
        + "- TRUE_FALSE: options 정확히 2개, 첫 번째 { \"optionText\": \"O\", \"correct\": true }, 두 번째 { \"optionText\": \"X\", \"correct\": false }\n"
        + "- SHORT_ANSWER: options 정확히 1개, 핵심 키워드를 optionText에, correct true\n\n"
        + "[주의사항]\n"
        + "- 반드시 강의 내용에 근거한 문제만 출력하세요.\n"
        + "- 난이도에 맞게 문제 복잡도를 조절하세요.\n"
        + "- questionType 값은 반드시 MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER 중 하나여야 합니다.";
  }

  private List<DraftQuestionState> parseGeminiResponse(
      String raw, CreateAiQuizDraftRequest request) {
    try {
      String jsonArray = extractJsonArray(raw);
      if (jsonArray == null) {
        log.warn("[AiQuizDraftQuestionGenerator] Gemini 응답에서 JSON 배열 추출 실패. Fallback 실행.");
        return generateFallbackQuestions(request);
      }

      JsonNode rootNode = MAPPER.readTree(jsonArray);
      if (!rootNode.isArray()) {
        log.warn("[AiQuizDraftQuestionGenerator] Gemini 응답이 배열 형식이 아님. Fallback 실행.");
        return generateFallbackQuestions(request);
      }

      List<DraftQuestionState> questions = new ArrayList<>();
      int index = 1;
      for (JsonNode questionNode : rootNode) {
        DraftQuestionState question = parseQuestionNode(questionNode, index);
        if (question == null) {
          log.warn("[AiQuizDraftQuestionGenerator] {}번째 문항 파싱 실패. Fallback 실행.", index);
          return generateFallbackQuestions(request);
        }
        questions.add(question);
        index++;
      }

      if (questions.isEmpty()) {
        log.warn("[AiQuizDraftQuestionGenerator] Gemini가 빈 배열을 반환. Fallback 실행.");
        return generateFallbackQuestions(request);
      }

      validateQuestions(questions);
      return questions;

    } catch (Exception e) {
      log.warn("[AiQuizDraftQuestionGenerator] Gemini 응답 파싱 실패: {}. Fallback 실행.", e.getMessage());
      return generateFallbackQuestions(request);
    }
  }

  private String extractJsonArray(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    int start = raw.indexOf('[');
    int end = raw.lastIndexOf(']');
    if (start == -1 || end == -1 || start >= end) {
      return null;
    }
    return raw.substring(start, end + 1);
  }

  private DraftQuestionState parseQuestionNode(JsonNode node, int displayOrder) {
    try {
      String questionTypeStr = node.path("questionType").asText(null);
      String questionText = node.path("questionText").asText(null);

      if (questionTypeStr == null || questionText == null || questionText.isBlank()) {
        return null;
      }

      QuestionType questionType;
      try {
        questionType = QuestionType.valueOf(questionTypeStr);
      } catch (IllegalArgumentException e) {
        return null;
      }

      DraftQuestionState question = new DraftQuestionState();
      question.draftQuestionId = draftQuestionSequence.getAndIncrement();
      question.questionType = questionType;
      question.questionText = questionText;
      question.explanation = normalizeExplanation(node.path("explanation").asText(""));
      question.points = 5;
      question.displayOrder = displayOrder;
      question.options = new ArrayList<>();

      JsonNode optionsNode = node.path("options");
      if (!optionsNode.isArray()) {
        return null;
      }

      for (JsonNode optionNode : optionsNode) {
        DraftOptionState option = new DraftOptionState();
        option.draftOptionId = draftOptionSequence.getAndIncrement();
        option.optionText = optionNode.path("optionText").asText(null);
        option.correct = optionNode.path("correct").asBoolean(false);
        option.displayOrder = question.options.size() + 1;

        if (isBlank(option.optionText)) {
          return null;
        }
        question.options.add(option);
      }

      return question;
    } catch (Exception e) {
      return null;
    }
  }

  private List<DraftQuestionState> generateFrontendRenderingFallbackQuestions(
      CreateAiQuizDraftRequest request) {
    int questionCount =
        Math.min(request.getQuestionCount() == null ? 3 : request.getQuestionCount(), 4);
    List<DraftQuestionState> questions = new ArrayList<>();

    questions.add(
        draftQuestion(
            QuestionType.MULTIPLE_CHOICE,
            "브라우저가 HTML과 CSS를 해석해 화면을 그리기 전까지의 흐름으로 가장 적절한 것은 무엇인가요?",
            "DOM과 CSSOM이 결합되어 렌더 트리가 만들어진 뒤 레이아웃과 페인트가 진행됩니다.",
            1,
            request.getSourceTimestamp(),
            List.of(
                draftOption("HTML 파싱, DOM 생성, CSSOM 생성, 렌더 트리 구성, 레이아웃과 페인트", true, 1),
                draftOption("CSS 다운로드, JavaScript 번들링, 데이터베이스 조회, 화면 캡처", false, 2),
                draftOption("Vite 실행, Git 커밋, API 배포, 렌더 트리 삭제", false, 3),
                draftOption("JavaScript 이벤트 등록, 서버 재시작, HTML 압축, 이미지 업로드", false, 4))));

    if (questionCount >= 2) {
      questions.add(
          draftQuestion(
              QuestionType.MULTIPLE_CHOICE,
              "JavaScript가 버튼 클릭 이벤트에서 DOM의 텍스트와 클래스를 바꾸면 어떤 일이 일어날 수 있나요?",
              "DOM이나 클래스 변경은 스타일 재계산과 레이아웃 또는 페인트를 다시 유발할 수 있습니다.",
              2,
              request.getSourceTimestamp(),
              List.of(
                  draftOption("변경된 DOM과 스타일에 따라 브라우저가 필요한 렌더링 단계를 다시 수행할 수 있습니다.", true, 1),
                  draftOption("이미 그려진 화면은 어떤 경우에도 다시 계산되지 않습니다.", false, 2),
                  draftOption("JavaScript는 HTML 파일을 서버에서 삭제한 뒤 화면을 갱신합니다.", false, 3),
                  draftOption(
                      "CSSOM은 JavaScript 변경과 완전히 무관하므로 DevTools에서 확인할 수 없습니다.", false, 4))));
    }

    if (questionCount >= 3) {
      questions.add(
          draftQuestion(
              QuestionType.TRUE_FALSE,
              "Vite는 브라우저 렌더링 엔진을 바꾸는 도구다.",
              "Vite는 개발 서버와 번들링 도구이며 브라우저의 렌더링 엔진 자체를 바꾸지는 않습니다.",
              3,
              request.getSourceTimestamp(),
              List.of(draftOption("참", false, 1), draftOption("거짓", true, 2))));
    }

    if (questionCount >= 4) {
      questions.add(
          draftQuestion(
              QuestionType.SHORT_ANSWER,
              "Vite로 실행한 페이지가 빈 화면으로 보일 때 DevTools에서 먼저 확인할 항목 두 가지를 쓰세요.",
              "Console 오류, Elements의 DOM 생성 여부, Network의 리소스 로딩 상태를 확인하면 됩니다.",
              4,
              request.getSourceTimestamp(),
              List.of(draftOption("Console 오류와 Elements DOM 또는 Network 리소스 상태", true, 1))));
    }

    validateQuestions(questions);
    return questions;
  }

  private DraftQuestionState draftQuestion(
      QuestionType questionType,
      String questionText,
      String explanation,
      int displayOrder,
      String sourceTimestamp,
      List<DraftOptionState> options) {
    DraftQuestionState question = new DraftQuestionState();
    question.draftQuestionId = draftQuestionSequence.getAndIncrement();
    question.questionType = questionType;
    question.questionText = questionText;
    question.explanation = normalizeExplanation(explanation);
    question.points = 5;
    question.displayOrder = displayOrder;
    question.sourceTimestamp = sourceTimestamp;
    question.options = new ArrayList<>(options);
    return question;
  }

  private DraftOptionState draftOption(String optionText, boolean correct, int displayOrder) {
    DraftOptionState option = new DraftOptionState();
    option.draftOptionId = draftOptionSequence.getAndIncrement();
    option.optionText = optionText;
    option.correct = correct;
    option.displayOrder = displayOrder;
    return option;
  }

  private List<DraftQuestionState> generateFallbackQuestions(CreateAiQuizDraftRequest request) {
    int questionCount = request.getQuestionCount() == null ? 3 : request.getQuestionCount();
    String keyword = extractKeyword(request.getSourceText());

    List<DraftQuestionState> questions = new ArrayList<>();
    for (int index = 1; index <= questionCount; index++) {
      QuestionType questionType = resolveQuestionType(request.getPreferredQuestionType(), index);
      DraftQuestionState question = new DraftQuestionState();
      question.draftQuestionId = draftQuestionSequence.getAndIncrement();
      question.questionType = questionType;
      question.points = 5;
      question.displayOrder = index;
      question.sourceTimestamp = request.getSourceTimestamp();
      question.options = new ArrayList<>();

      if (questionType == QuestionType.SHORT_ANSWER) {
        question.questionText = keyword + "와 관련된 핵심 개념을 간단히 설명하세요.";
        question.explanation = "근거 원문에서 '" + keyword + "'와 연결되는 핵심 문장을 요약하면 됩니다.";

        DraftOptionState option = new DraftOptionState();
        option.draftOptionId = draftOptionSequence.getAndIncrement();
        option.optionText = keyword;
        option.correct = true;
        option.displayOrder = 1;
        question.options.add(option);
      } else if (questionType == QuestionType.TRUE_FALSE) {
        question.questionText = "'" + keyword + "'는 보안과 인증/인가 맥락과 관련이 있다.";
        question.explanation = "근거 원문에서 해당 개념이 보안 흐름과 연결되어 설명됩니다.";

        DraftOptionState option1 = new DraftOptionState();
        option1.draftOptionId = draftOptionSequence.getAndIncrement();
        option1.optionText = "O";
        option1.correct = true;
        option1.displayOrder = 1;

        DraftOptionState option2 = new DraftOptionState();
        option2.draftOptionId = draftOptionSequence.getAndIncrement();
        option2.optionText = "X";
        option2.correct = false;
        option2.displayOrder = 2;

        question.options.add(option1);
        question.options.add(option2);
      } else {
        question.questionText = "다음 중 '" + keyword + "'와 가장 관련 깊은 설명은 무엇인가?";
        question.explanation = "근거 원문에서 직접적으로 언급된 핵심 설명을 정답으로 둡니다.";

        DraftOptionState option1 = new DraftOptionState();
        option1.draftOptionId = draftOptionSequence.getAndIncrement();
        option1.optionText = keyword + "는 인증과 인가 흐름과 관련된 핵심 개념이다.";
        option1.correct = true;
        option1.displayOrder = 1;

        DraftOptionState option2 = new DraftOptionState();
        option2.draftOptionId = draftOptionSequence.getAndIncrement();
        option2.optionText = keyword + "는 프론트엔드 CSS 전용 개념이다.";
        option2.correct = false;
        option2.displayOrder = 2;

        DraftOptionState option3 = new DraftOptionState();
        option3.draftOptionId = draftOptionSequence.getAndIncrement();
        option3.optionText = keyword + "는 데이터베이스 물리 설계만 담당한다.";
        option3.correct = false;
        option3.displayOrder = 3;

        DraftOptionState option4 = new DraftOptionState();
        option4.draftOptionId = draftOptionSequence.getAndIncrement();
        option4.optionText = keyword + "는 네트워크 하드웨어 장비 이름이다.";
        option4.correct = false;
        option4.displayOrder = 4;

        question.options.add(option1);
        question.options.add(option2);
        question.options.add(option3);
        question.options.add(option4);
      }

      question.explanation = normalizeExplanation(question.explanation);
      questions.add(question);
    }

    validateQuestions(questions);
    return questions;
  }

  private QuestionType resolveQuestionType(QuestionType preferredQuestionType, int index) {
    if (preferredQuestionType != null) {
      return preferredQuestionType;
    }

    if (index % 3 == 0) {
      return QuestionType.SHORT_ANSWER;
    }

    if (index % 2 == 0) {
      return QuestionType.TRUE_FALSE;
    }

    return QuestionType.MULTIPLE_CHOICE;
  }

  void validateQuestions(List<DraftQuestionState> questions) {
    if (questions == null || questions.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "초안 문항은 최소 1개 이상 필요합니다.");
    }

    for (DraftQuestionState question : questions) {
      if (isBlank(question.questionText)) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "문항 본문은 비어 있을 수 없습니다.");
      }

      if (question.points == null || question.points < 0) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "문항 배점은 0 이상이어야 합니다.");
      }

      if (question.displayOrder == null || question.displayOrder < 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "문항 노출 순서는 1 이상이어야 합니다.");
      }

      validateDraftOptions(question);
    }
  }

  private void validateDraftOptions(DraftQuestionState question) {
    if (question.options == null || question.options.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "문항 선택지는 최소 1개 이상 필요합니다.");
    }

    long correctOptionCount =
        question.options.stream().filter(option -> Boolean.TRUE.equals(option.correct)).count();

    if (question.questionType == QuestionType.MULTIPLE_CHOICE) {
      if (question.options.size() < 2) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 초안은 선택지가 최소 2개 이상 필요합니다.");
      }
      if (correctOptionCount < 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 초안은 정답 선택지가 최소 1개 필요합니다.");
      }
      return;
    }

    if (question.questionType == QuestionType.TRUE_FALSE) {
      if (question.options.size() != 2) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "OX 초안은 선택지가 정확히 2개여야 합니다.");
      }
      if (correctOptionCount != 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "OX 초안은 정답 선택지가 정확히 1개여야 합니다.");
      }
      return;
    }

    if (question.questionType == QuestionType.SHORT_ANSWER) {
      if (question.options.size() != 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "주관식 초안은 정답 선택지가 1개여야 합니다.");
      }
      if (correctOptionCount != 1) {
        throw new CustomException(ErrorCode.INVALID_INPUT, "주관식 초안 정답은 반드시 1개여야 합니다.");
      }
    }
  }

  private String extractKeyword(String sourceText) {
    if (sourceText == null || sourceText.isBlank()) {
      return "핵심 개념";
    }

    String normalized = sourceText.replace("\n", " ").replace("\r", " ").trim();
    String[] tokens = normalized.split("\\s+");
    if (tokens.length == 0) {
      return "핵심 개념";
    }

    String candidate = tokens[0];
    return candidate.length() > 20 ? candidate.substring(0, 20) : candidate;
  }

  String normalizeExplanation(String value) {
    if (isBlank(value)) {
      return "";
    }

    String normalized = value.replace("\n", " ").replace("\r", " ").trim();
    return normalized.length() <= MAX_EXPLANATION_LENGTH
        ? normalized
        : normalized.substring(0, MAX_EXPLANATION_LENGTH).trim();
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  long nextQuestionId() {
    return draftQuestionSequence.getAndIncrement();
  }

  long nextOptionId() {
    return draftOptionSequence.getAndIncrement();
  }
}
