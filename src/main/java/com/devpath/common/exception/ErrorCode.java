package com.devpath.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
  INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 요청 입력입니다."),
  INVALID_AUTH_HEADER(HttpStatus.BAD_REQUEST, "인증 헤더 형식이 올바르지 않습니다."),
  ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 존재하는 데이터입니다."),

  EMAIL_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "이미 가입한 이메일입니다."),
  USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
  TAG_NOT_FOUND(HttpStatus.NOT_FOUND, "태그를 찾을 수 없습니다."),
  INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),

  UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
  FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
  JWT_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
  JWT_EXPIRED(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
  JWT_UNSUPPORTED(HttpStatus.UNAUTHORIZED, "지원하지 않는 토큰입니다."),
  JWT_EMPTY(HttpStatus.UNAUTHORIZED, "토큰이 비어 있습니다."),
  JWT_BLACKLISTED(HttpStatus.UNAUTHORIZED, "로그아웃 처리된 토큰입니다."),
  JWT_TYPE_MISMATCH(HttpStatus.UNAUTHORIZED, "토큰 타입이 올바르지 않습니다."),
  REFRESH_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "저장된 리프레시 토큰이 없습니다."),
  REFRESH_TOKEN_MISMATCH(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 일치하지 않습니다."),
  REFRESH_TOKEN_REUSED(HttpStatus.UNAUTHORIZED, "리프레시 토큰 재사용이 감지되어 세션이 만료되었습니다."),
  RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 리소스를 찾을 수 없습니다."),
  DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "이미 존재하는 리소스입니다."),
  INVALID_COURSE_STATUS(HttpStatus.BAD_REQUEST, "유효하지 않은 강의 상태입니다."),
  INVALID_COURSE_DIFFICULTY_LEVEL(HttpStatus.BAD_REQUEST, "유효하지 않은 강의 난이도입니다."),

  COURSE_NOT_FOUND(HttpStatus.NOT_FOUND, "강의를 찾을 수 없습니다."),
  LESSON_NOT_FOUND(HttpStatus.NOT_FOUND, "레슨을 찾을 수 없습니다."),
  LESSON_PROGRESS_NOT_FOUND(HttpStatus.NOT_FOUND, "학습 진도 정보를 찾을 수 없습니다."),
  TIMESTAMP_NOTE_NOT_FOUND(HttpStatus.NOT_FOUND, "타임스탬프 노트를 찾을 수 없습니다."),
  TIL_NOT_FOUND(HttpStatus.NOT_FOUND, "TIL 초안을 찾을 수 없습니다."),
  WISHLIST_NOT_FOUND(HttpStatus.NOT_FOUND, "찜한 강의를 찾을 수 없습니다."),
  ENROLLMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "수강 이력을 찾을 수 없습니다."),

  ROADMAP_NOT_FOUND(HttpStatus.NOT_FOUND, "로드맵을 찾을 수 없습니다."),
  CUSTOM_ROADMAP_NOT_FOUND(HttpStatus.NOT_FOUND, "커스텀 로드맵을 찾을 수 없습니다."),
  CUSTOM_ROADMAP_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 해당 사용자의 로드맵을 복사했습니다."),
  ROADMAP_NODE_NOT_FOUND(HttpStatus.NOT_FOUND, "로드맵 노드를 찾을 수 없습니다."),
  CUSTOM_NODE_NOT_FOUND(HttpStatus.NOT_FOUND, "커스텀 노드를 찾을 수 없습니다."),

  INSUFFICIENT_TAGS(HttpStatus.BAD_REQUEST, "노드 진입에 필요한 태그가 부족합니다."),
  NODE_ALREADY_COMPLETED(HttpStatus.BAD_REQUEST, "이미 완료된 노드입니다."),

  QUIZ_NOT_FOUND(HttpStatus.NOT_FOUND, "진단 퀴즈를 찾을 수 없습니다."),
  QUIZ_ALREADY_TAKEN(HttpStatus.CONFLICT, "이미 해당 로드맵의 진단 퀴즈를 수행했습니다."),
  QUIZ_ALREADY_SUBMITTED(HttpStatus.BAD_REQUEST, "이미 제출된 퀴즈입니다."),

  RECOMMENDATION_NOT_FOUND(HttpStatus.NOT_FOUND, "추천 정보를 찾을 수 없습니다."),
  RECOMMENDATION_ALREADY_PROCESSED(HttpStatus.BAD_REQUEST, "이미 처리된 추천입니다."),
  RECOMMENDATION_EXPIRED(HttpStatus.BAD_REQUEST, "만료된 추천입니다."),
  SUPPLEMENT_RECOMMENDATION_NOT_FOUND(HttpStatus.NOT_FOUND, "보강 노드 추천을 찾을 수 없습니다."),
  RISK_WARNING_NOT_FOUND(HttpStatus.NOT_FOUND, "리스크 경고를 찾을 수 없습니다."),
  OCR_RESULT_NOT_FOUND(HttpStatus.NOT_FOUND, "OCR 결과를 찾을 수 없습니다."),

  POST_NOT_FOUND(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."),
  QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "질문을 찾을 수 없습니다."),
  ANSWER_NOT_FOUND(HttpStatus.NOT_FOUND, "답변을 찾을 수 없습니다."),
  COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."),
  UNAUTHORIZED_ACTION(HttpStatus.FORBIDDEN, "해당 작업을 수행할 권한이 없습니다."),
  ALREADY_ADOPTED(HttpStatus.BAD_REQUEST, "이미 채택된 답변이 존재합니다."),
  CANNOT_ADOPT_OWN_ANSWER(HttpStatus.BAD_REQUEST, "자신의 답변은 채택할 수 없습니다."),

  NODE_CLEARANCE_NOT_FOUND(HttpStatus.NOT_FOUND, "노드 클리어 정보를 찾을 수 없습니다."),
  PROOF_CONDITION_NOT_MET(HttpStatus.BAD_REQUEST, "Proof 발급 조건을 만족하지 못했습니다."),
  PROOF_CARD_ALREADY_ISSUED(HttpStatus.CONFLICT, "이미 Proof Card가 발급된 노드입니다."),
  PROOF_CARD_NOT_FOUND(HttpStatus.NOT_FOUND, "Proof Card를 찾을 수 없습니다."),
  CERTIFICATE_NOT_FOUND(HttpStatus.NOT_FOUND, "증명서를 찾을 수 없습니다."),
  SHARE_LINK_NOT_FOUND(HttpStatus.NOT_FOUND, "공유 링크를 찾을 수 없습니다."),
  RECOMMENDATION_CHANGE_NOT_FOUND(HttpStatus.NOT_FOUND, "추천 변경 정보를 찾을 수 없습니다."),
  LEARNING_RULE_NOT_FOUND(HttpStatus.NOT_FOUND, "학습 자동화 룰을 찾을 수 없습니다."),
  LEARNING_METRIC_NOT_FOUND(HttpStatus.NOT_FOUND, "학습 지표 정보를 찾을 수 없습니다."),
  DUPLICATE_LEARNING_RULE(HttpStatus.CONFLICT, "동일한 학습 자동화 룰이 이미 존재합니다."),
  LEARNING_RULE_DISABLED(HttpStatus.BAD_REQUEST, "비활성화된 학습 자동화 룰입니다."),

  INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");

  private final HttpStatus status;
  private final String message;

  ErrorCode(HttpStatus status, String message) {
    this.status = status;
    this.message = message;
  }
}
