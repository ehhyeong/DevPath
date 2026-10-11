package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.common.provider.GeminiProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class WorkspaceAiDesignClientTest {

  @Test
  void generatesDesignWithUserIdeaAndSelectedStack() {
    GeminiProvider geminiProvider = mock(GeminiProvider.class);
    when(geminiProvider.generateJsonOrThrowOnQuota(anyString(), anyMap(), eq(8192)))
        .thenReturn(validResponseJson());
    WorkspaceAiDesignClient client =
        new WorkspaceAiDesignClient(geminiProvider, new ObjectMapper());
    WorkspaceAiDesignRequest request =
        new WorkspaceAiDesignRequest(
            "enterprise", "manual", "React", "Java / Spring Boot", "PostgreSQL", "반려동물 병원 예약 서비스");

    WorkspaceAiDesignResponse response = client.generate(request);

    assertThat(response).isNotNull();
    assertThat(response.difficulty()).isEqualTo("enterprise");
    assertThat(response.title()).isEqualTo("펫케어 예약 플랫폼");
    assertThat(response.apis().getFirst().group()).isEqualTo("RESERVATIONS (예약)");
    assertThat(response.interviewQuestions().getFirst().tasks()).containsExactly("예약 엔티티 구현");
    assertThat(response.interviewQuestions().getFirst().apis())
        .containsExactly("POST /api/reservations");
    assertThat(response.interviewQuestions().getFirst().erd()).isEqualTo("RESERVATION");
    ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
    verify(geminiProvider)
        .generateJsonOrThrowOnQuota(
            prompt.capture(),
            argThat(
                schema -> {
                  var rootProperties = new ObjectMapper().valueToTree(schema).path("properties");
                  var properties =
                      rootProperties.path("interviewQuestions").path("items").path("properties");
                  var apiSchema = rootProperties.path("apis").path("items");
                  return apiSchema.path("properties").has("group")
                      && apiSchema.path("required").toString().contains("\"group\"")
                      && properties.has("tasks")
                      && properties.has("apis")
                      && properties.has("erd")
                      && properties.path("category").path("enum").toString().contains("핵심 난제");
                }),
            eq(8192));
    assertThat(prompt.getValue())
        .contains(
            "설계 난이도: enterprise",
            "Frontend: React",
            "Backend: Java / Spring Boot",
            "Database: PostgreSQL",
            "서비스 아이디어: 반려동물 병원 예약 서비스",
            "대용량 트래픽",
            "영문 대문자 (한글 뜻) 형식",
            "AUTH (인증)",
            "RESERVATIONS (예약)",
            "프로젝트의 고유한 분류도 한글 뜻을 함께",
            "같은 도메인은 같은 이름으로 묶고",
            "버전은 분류명으로 쓰지 마세요");
  }

  @Test
  void readsLegacyDesignWithoutApiGroup() throws Exception {
    ObjectMapper mapper = new ObjectMapper();
    ObjectNode legacy = (ObjectNode) mapper.readTree(validResponseJson());
    ((ObjectNode) legacy.path("apis").get(0)).remove("group");

    WorkspaceAiDesignResponse response =
        mapper.readValue(mapper.writeValueAsString(legacy), WorkspaceAiDesignResponse.class);

    assertThat(response.apis().getFirst().group()).isNull();
    assertThat(response.apis().getFirst().path()).isEqualTo("/api/reservations");
  }

  @Test
  void asksGeminiToInventTopicWhenIdeaIsBlank() {
    WorkspaceAiDesignClient client =
        new WorkspaceAiDesignClient(mock(GeminiProvider.class), new ObjectMapper());
    WorkspaceAiDesignRequest request =
        new WorkspaceAiDesignRequest("toy", "auto", null, null, null, "   ");

    assertThat(client.buildPrompt(request))
        .contains("서비스 아이디어: 입력 없음", "무작위 아이디어 탐색 방향:", "현실적인 주제를 새로 정하세요", "[토이 기준]");
  }

  @Test
  void rejectsResponseWhenRequiredSectionIsEmpty() throws Exception {
    GeminiProvider geminiProvider = mock(GeminiProvider.class);
    ObjectMapper objectMapper = new ObjectMapper();
    ObjectNode incompleteResponse = (ObjectNode) objectMapper.readTree(validResponseJson());
    incompleteResponse.putArray("apis");
    when(geminiProvider.generateJsonOrThrowOnQuota(anyString(), anyMap(), eq(8192)))
        .thenReturn(objectMapper.writeValueAsString(incompleteResponse));
    WorkspaceAiDesignClient client = new WorkspaceAiDesignClient(geminiProvider, objectMapper);

    WorkspaceAiDesignResponse response =
        client.generate(new WorkspaceAiDesignRequest("mvp", "auto", null, null, null, null));

    assertThat(response).isNull();
  }

  private String validResponseJson() {
    return """
        {
          "title": "펫케어 예약 플랫폼",
          "summary": "병원 예약과 진료 이력을 관리합니다.",
          "difficulty": "mvp",
          "stack": {
            "frontend": "React",
            "backend": "Spring Boot",
            "database": "PostgreSQL",
            "libraries": ["Spring Security"],
            "selectionReason": "트랜잭션 처리가 중요합니다."
          },
          "scenario": {
            "userFlows": [{"actor": "보호자", "action": "병원을 예약합니다."}],
            "coreFeatures": ["예약 관리"]
          },
          "architecture": {
            "style": "모듈형 모놀리스",
            "description": "도메인별 모듈을 분리합니다.",
            "components": [{"name": "예약 모듈", "responsibility": "예약을 관리합니다."}],
            "erdMermaid": "erDiagram\\nUSER ||--o{ RESERVATION : makes",
            "entities": [{
              "name": "RESERVATION",
              "purpose": "예약 저장",
              "columns": [{"name": "id", "type": "bigint", "constraints": "PK", "description": "식별자"}]
            }],
            "technicalChallenges": ["동시 예약 방지"]
          },
          "apis": [{
            "group": "RESERVATIONS (예약)",
            "method": "POST",
            "path": "/api/reservations",
            "description": "예약 생성",
            "auth": "USER",
            "requestExample": "{}",
            "responseExample": "{\\\"id\\\":1}"
          }],
          "roadmap": [{
            "phase": 1,
            "title": "예약 도메인",
            "goal": "예약 생성",
            "estimatedWeeks": 1,
            "tasks": ["예약 엔티티 구현"]
          }],
          "interviewQuestions": [{
            "category": "핵심 난제",
            "question": "중복 예약을 어떻게 막나요?",
            "answer": "유니크 제약과 잠금을 사용합니다.",
            "keywords": ["유니크 제약", "락"],
            "tasks": ["예약 엔티티 구현"],
            "apis": ["POST /api/reservations"],
            "erd": "RESERVATION"
          }]
        }
        """;
  }
}
