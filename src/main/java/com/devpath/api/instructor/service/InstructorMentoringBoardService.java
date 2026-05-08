package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.mentoring.InstructorMentoringBoardPayload;
import com.devpath.api.instructor.entity.InstructorMentoringBoard;
import com.devpath.api.instructor.repository.InstructorMentoringBoardRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InstructorMentoringBoardService {

  private final InstructorMentoringBoardRepository instructorMentoringBoardRepository;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  public InstructorMentoringBoardService(
      InstructorMentoringBoardRepository instructorMentoringBoardRepository,
      UserRepository userRepository,
      Optional<ObjectMapper> objectMapper) {
    this.instructorMentoringBoardRepository = instructorMentoringBoardRepository;
    this.userRepository = userRepository;
    this.objectMapper = objectMapper.orElseGet(() -> new ObjectMapper().findAndRegisterModules());
  }

  @Transactional(readOnly = true)
  public InstructorMentoringBoardPayload getBoard(Long instructorId) {
    validateInstructor(instructorId);

    return instructorMentoringBoardRepository
        .findByInstructorId(instructorId)
        .map(InstructorMentoringBoard::getPayloadJson)
        .map(this::readPayload)
        .orElseGet(this::createDefaultPayload);
  }

  public InstructorMentoringBoardPayload saveBoard(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    validateInstructor(instructorId);

    String payloadJson = writePayload(payload);
    InstructorMentoringBoard board =
        instructorMentoringBoardRepository
            .findByInstructorId(instructorId)
            .orElseGet(() -> new InstructorMentoringBoard(instructorId, payloadJson));

    board.updatePayload(payloadJson);
    instructorMentoringBoardRepository.save(board);
    return payload;
  }

  private void validateInstructor(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    if (!userRepository.existsById(instructorId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  private InstructorMentoringBoardPayload readPayload(String payloadJson) {
    try {
      return objectMapper.readValue(payloadJson, InstructorMentoringBoardPayload.class);
    } catch (JsonProcessingException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "Invalid mentoring board payload.");
    }
  }

  private String writePayload(InstructorMentoringBoardPayload payload) {
    try {
      return objectMapper.writeValueAsString(
          payload == null ? new InstructorMentoringBoardPayload() : payload);
    } catch (JsonProcessingException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "Invalid mentoring board payload.");
    }
  }

  private InstructorMentoringBoardPayload createDefaultPayload() {
    return new InstructorMentoringBoardPayload(
        List.of(
            new InstructorMentoringBoardPayload.ProjectItem(
                "commerce",
                "대용량 이커머스 서버 구축",
                "대용량 이커머스 서버",
                "실제 운영 환경과 유사한 이커머스 시나리오를 함께 구현합니다.",
                "study",
                "Backend",
                "모집중",
                8,
                10,
                List.of(),
                List.of("Spring Boot", "Redis", "Kafka", "MySQL"),
                "코드마스터 J",
                "스타트업 백엔드 리드 개발자",
                "쿠폰 발급, 주문 동시성, 캐시 전략까지 운영 감각으로 같이 설계하고 리뷰합니다.",
                4,
                List.of(
                    "요구사항 분석과 ERD 설계", "회원과 상품 API 구현", "주문 처리와 Redis/Kafka 적용", "성능 최적화와 최종 발표")),
            new InstructorMentoringBoardPayload.ProjectItem(
                "travel",
                "AI 여행 코스 추천 서비스",
                "AI 여행 코스",
                "프론트엔드와 백엔드가 함께 협업하는 풀스택 멘토링입니다.",
                "team",
                "Full Stack",
                "모집중",
                4,
                4,
                List.of(createRole("Frontend", 2, 2), createRole("Backend", 2, 2)),
                List.of("React", "Spring Boot", "OpenAI"),
                "조니 J",
                "서비스 기획부터 배포까지 리드한 풀스택 개발자",
                "추천 로직, 일정 UX, 협업 구조까지 실제 서비스처럼 끝까지 끌고 갑니다.",
                6,
                List.of(
                    "문제 정의와 화면 구조 설계",
                    "프론트엔드와 백엔드 역할 분리",
                    "추천 로직과 데이터 파이프라인 구현",
                    "일정 생성 화면 완성",
                    "배포와 운영 설정",
                    "데모데이 발표"))),
        List.of(
            new InstructorMentoringBoardPayload.RequestItem(
                "request-taehyeong",
                "김태형",
                "Taehyeong",
                "어제 14:30",
                "commerce",
                "대용량 이커머스 서버 구축",
                "study",
                "직접 무관",
                "Redis와 동시성 제어를 실전 프로젝트로 익히고 싶습니다.",
                "https://github.com/taehyeong"),
            new InstructorMentoringBoardPayload.RequestItem(
                "request-sarah",
                "김수아",
                "Sarah",
                "오늘 09:15",
                "travel",
                "AI 여행 코스 추천 서비스",
                "team",
                "Frontend",
                "실제 사용자 흐름을 고려한 프론트엔드 협업 경험을 쌓고 싶습니다.",
                "https://sarah-dev.blog")),
        List.of(
            new InstructorMentoringBoardPayload.OngoingProjectItem(
                "ongoing-legal-chatbot",
                "AI 법률 상담 챗봇",
                "학습자 4명, 주 1회 라이브 리뷰",
                3,
                "team",
                "AI/Data",
                60,
                "워크스페이스 이동",
                "일정 관리",
                List.of("워크스페이스 설정", "멤버 관리", "종료 처리")),
            new InstructorMentoringBoardPayload.OngoingProjectItem(
                "ongoing-kotlin-study",
                "Kotlin/Spring 스터디",
                "학습자 12명, 코드 리뷰 중심 운영",
                2,
                "study",
                "Backend",
                35,
                "워크스페이스 이동",
                "일정 관리",
                List.of("과제 설정", "공지 전송", "멘토링 종료"))));
  }

  private InstructorMentoringBoardPayload.RoleItem createRole(String name, int current, int total) {
    return new InstructorMentoringBoardPayload.RoleItem(name, current, total);
  }
}
