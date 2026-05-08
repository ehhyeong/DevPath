package com.devpath.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
  INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "C001", "잘못된 입력값입니다."),
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

  BUILDER_MODULE_NOT_FOUND(HttpStatus.NOT_FOUND, "빌더 모듈을 찾을 수 없습니다."),
  MY_ROADMAP_NOT_FOUND(HttpStatus.NOT_FOUND, "나만의 로드맵을 찾을 수 없습니다."),

  ROADMAP_NOT_FOUND(HttpStatus.NOT_FOUND, "로드맵을 찾을 수 없습니다."),
  CUSTOM_ROADMAP_NOT_FOUND(HttpStatus.NOT_FOUND, "커스텀 로드맵을 찾을 수 없습니다."),
  CUSTOM_ROADMAP_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 해당 사용자의 로드맵을 복사했습니다."),
  ROADMAP_NODE_NOT_FOUND(HttpStatus.NOT_FOUND, "로드맵 노드를 찾을 수 없습니다."),
  CUSTOM_NODE_NOT_FOUND(HttpStatus.NOT_FOUND, "커스텀 노드를 찾을 수 없습니다."),

  INSUFFICIENT_TAGS(HttpStatus.BAD_REQUEST, "노드 진입에 필요한 태그가 부족합니다."),
  NODE_LOCKED(HttpStatus.FORBIDDEN, "선행 노드를 먼저 완료해야 합니다."),
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

  REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "리뷰를 찾을 수 없습니다."),
  REVIEW_ALREADY_HIDDEN(HttpStatus.BAD_REQUEST, "이미 숨김 처리된 리뷰입니다."),
  REFUND_NOT_FOUND(HttpStatus.NOT_FOUND, "환불 요청을 찾을 수 없습니다."),
  REFUND_ALREADY_PROCESSED(HttpStatus.BAD_REQUEST, "이미 처리된 환불 요청입니다."),
  SETTLEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "정산 내역을 찾을 수 없습니다."),
  SETTLEMENT_NOT_PENDING(HttpStatus.BAD_REQUEST, "PENDING 상태의 정산만 처리할 수 있습니다."),
  ACCOUNT_ALREADY_RESTRICTED(HttpStatus.BAD_REQUEST, "이미 제한된 계정입니다."),
  ACCOUNT_NOT_FOUND(HttpStatus.NOT_FOUND, "계정을 찾을 수 없습니다."),
  NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "N001", "해당 공지사항을 찾을 수 없습니다."),
  QNA_QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "QnA 질문을 찾을 수 없습니다."),
  QNA_ANSWER_NOT_FOUND(HttpStatus.NOT_FOUND, "QnA 답변을 찾을 수 없습니다."),
  COUPON_NOT_FOUND(HttpStatus.NOT_FOUND, "쿠폰을 찾을 수 없습니다."),
  PROMOTION_NOT_FOUND(HttpStatus.NOT_FOUND, "프로모션을 찾을 수 없습니다."),
  INVALID_STATUS_TRANSITION(HttpStatus.BAD_REQUEST, "유효하지 않은 상태 전이입니다."),

  MENTORING_POST_NOT_FOUND(HttpStatus.NOT_FOUND, "멘토링 공고를 찾을 수 없습니다."),
  MENTORING_POST_ALREADY_CLOSED(HttpStatus.BAD_REQUEST, "이미 마감된 멘토링 공고입니다."),
  MENTORING_POST_FORBIDDEN(HttpStatus.FORBIDDEN, "멘토링 공고를 수정할 권한이 없습니다."),

  MENTORING_APPLICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "멘토링 신청을 찾을 수 없습니다."),
  MENTORING_ALREADY_APPLIED(HttpStatus.CONFLICT, "이미 해당 멘토링 공고에 신청했습니다."),
  MENTORING_CANNOT_APPLY_OWN_POST(HttpStatus.BAD_REQUEST, "본인이 작성한 멘토링 공고에는 신청할 수 없습니다."),
  MENTORING_APPLICATION_ALREADY_PROCESSED(HttpStatus.BAD_REQUEST, "이미 처리된 멘토링 신청입니다."),
  MENTORING_APPLICATION_FORBIDDEN(HttpStatus.FORBIDDEN, "멘토링 신청을 처리할 권한이 없습니다."),
  MENTORING_NOT_FOUND(HttpStatus.NOT_FOUND, "멘토링을 찾을 수 없습니다."),
  MENTORING_MISSION_NOT_FOUND(HttpStatus.NOT_FOUND, "멘토링 미션을 찾을 수 없습니다."),
  MENTORING_MISSION_WEEK_DUPLICATED(HttpStatus.CONFLICT, "이미 해당 주차의 멘토링 미션이 존재합니다."),
  MENTORING_MISSION_FORBIDDEN(HttpStatus.FORBIDDEN, "멘토링 미션을 관리할 권한이 없습니다."),
  MENTORING_MISSION_ALREADY_CLOSED(HttpStatus.BAD_REQUEST, "이미 마감된 멘토링 미션입니다."),
  MENTORING_MATERIAL_NOT_FOUND(HttpStatus.NOT_FOUND, "멘토링 미션 자료를 찾을 수 없습니다."),
  MENTORING_MATERIAL_FORBIDDEN(HttpStatus.FORBIDDEN, "멘토링 미션 자료를 관리할 권한이 없습니다."),
  MENTORING_MATERIAL_INVALID_PAYLOAD(HttpStatus.BAD_REQUEST, "자료 타입에 맞는 필수값이 누락되었습니다."),

  REVIEW_PULL_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "PR 제출을 찾을 수 없습니다."),
  REVIEW_PULL_REQUEST_FORBIDDEN(HttpStatus.FORBIDDEN, "PR 제출 또는 리뷰를 처리할 권한이 없습니다."),
  REVIEW_DECISION_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 리뷰를 승인 또는 반려할 권한이 없습니다."),
  REVIEW_ALREADY_DECIDED(HttpStatus.BAD_REQUEST, "이미 승인 또는 반려 처리된 리뷰입니다."),
  REVIEW_MISSION_SUBMISSION_NOT_FOUND(HttpStatus.NOT_FOUND, "미션 제출을 찾을 수 없습니다."),
  REVIEW_MISSION_SUBMISSION_FORBIDDEN(HttpStatus.FORBIDDEN, "미션 제출을 판정할 권한이 없습니다."),
  REVIEW_MISSION_ALREADY_SUBMITTED(HttpStatus.CONFLICT, "이미 해당 미션에 제출했습니다."),
  REVIEW_MISSION_SUBMISSION_ALREADY_DECIDED(HttpStatus.BAD_REQUEST, "이미 최종 판정된 미션 제출입니다."),
  APPLICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "라운지 신청을 찾을 수 없습니다."),
  APPLICATION_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 동일한 대상에게 신청 또는 제안을 보냈습니다."),
  APPLICATION_CANNOT_SEND_TO_SELF(HttpStatus.BAD_REQUEST, "자기 자신에게 신청 또는 제안을 보낼 수 없습니다."),
  APPLICATION_ALREADY_PROCESSED(HttpStatus.BAD_REQUEST, "이미 처리된 라운지 신청입니다."),
  APPLICATION_FORBIDDEN(HttpStatus.FORBIDDEN, "라운지 신청을 처리할 권한이 없습니다."),
  APPLICATION_MESSAGE_FORBIDDEN(HttpStatus.FORBIDDEN, "라운지 신청 메시지를 조회하거나 작성할 권한이 없습니다."),
  QNA_MENTORING_QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "멘토링 질문을 찾을 수 없습니다."),
  QNA_WORKSPACE_QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "워크스페이스 질문을 찾을 수 없습니다."),
  QNA_FORBIDDEN(HttpStatus.FORBIDDEN, "Q&A를 처리할 권한이 없습니다."),
  QNA_QUESTION_CLOSED(HttpStatus.BAD_REQUEST, "닫힌 질문에는 답변을 작성할 수 없습니다."),
  QNA_ACCESS_DENIED(HttpStatus.FORBIDDEN, "질문에 접근할 권한이 없습니다."),
  QNA_INVALID_STATUS(HttpStatus.BAD_REQUEST, "유효하지 않은 질문 상태입니다."),
  QNA_ALREADY_ANSWERED(HttpStatus.BAD_REQUEST, "이미 답변 완료 처리된 질문입니다."),
  QNA_NOT_MENTORING_MEMBER(HttpStatus.FORBIDDEN, "해당 멘토링 참여자가 아닙니다."),
  QNA_NOT_WORKSPACE_MEMBER(HttpStatus.FORBIDDEN, "해당 워크스페이스 참여자가 아닙니다."),

  REALTIME_CANNOT_MESSAGE_SELF(HttpStatus.BAD_REQUEST, "자기 자신에게 메시지를 보낼 수 없습니다."),

  NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),

  MEETING_NOT_FOUND(HttpStatus.NOT_FOUND, "회의방을 찾을 수 없습니다."),
  MEETING_FORBIDDEN(HttpStatus.FORBIDDEN, "회의를 관리하거나 참가할 권한이 없습니다."),
  MEETING_ALREADY_ENDED(HttpStatus.BAD_REQUEST, "이미 종료된 회의입니다."),
  MEETING_ALREADY_JOINED(HttpStatus.CONFLICT, "이미 회의에 참가 중입니다."),
  MEETING_PARTICIPANT_NOT_FOUND(HttpStatus.NOT_FOUND, "회의 참가자를 찾을 수 없습니다."),
  MEETING_ATTENDANCE_NOT_FOUND(HttpStatus.NOT_FOUND, "회의 출석 이력을 찾을 수 없습니다."),
  MEETING_AI_SUMMARY_NOT_FOUND(HttpStatus.NOT_FOUND, "AI 회의 요약을 찾을 수 없습니다."),
  MEETING_AI_SUMMARY_FORBIDDEN(HttpStatus.FORBIDDEN, "AI 회의 요약을 저장할 권한이 없습니다."),

  VOICE_CHANNEL_NOT_FOUND(HttpStatus.NOT_FOUND, "보이스 채널을 찾을 수 없습니다."),
  VOICE_PARTICIPANT_NOT_FOUND(HttpStatus.NOT_FOUND, "보이스 채널 참가자를 찾을 수 없습니다."),
  VOICE_ALREADY_JOINED(HttpStatus.CONFLICT, "이미 보이스 채널에 참여 중입니다."),
  VOICE_FORBIDDEN(HttpStatus.FORBIDDEN, "보이스 채널을 처리할 권한이 없습니다."),

  AIREVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "AI 코드 리뷰를 찾을 수 없습니다."),
  AIREVIEW_FORBIDDEN(HttpStatus.FORBIDDEN, "AI 코드 리뷰를 요청할 권한이 없습니다."),
  AIREVIEW_COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "AI 리뷰 코멘트를 찾을 수 없습니다."),
  AIREVIEW_COMMENT_FORBIDDEN(HttpStatus.FORBIDDEN, "AI 리뷰 코멘트를 처리할 권한이 없습니다."),
  AIREVIEW_DESIGN_NOT_FOUND(HttpStatus.NOT_FOUND, "AI 설계 리뷰를 찾을 수 없습니다."),
  AIREVIEW_DESIGN_FORBIDDEN(HttpStatus.FORBIDDEN, "AI 설계 리뷰를 처리할 권한이 없습니다."),

  INTEGRATION_NOT_FOUND(HttpStatus.NOT_FOUND, "I001", "해당 연동 정보를 찾을 수 없습니다."),
  SETTING_NOT_FOUND(HttpStatus.NOT_FOUND, "A001", "해당 설정값을 찾을 수 없습니다."),
  EXPERIMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "A002", "해당 실험 결과를 찾을 수 없습니다."),
  JOB_COMPANY_NOT_FOUND(HttpStatus.NOT_FOUND, "기업을 찾을 수 없습니다."),
  JOB_COMPANY_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 등록된 기업입니다."),
  JOB_POSTING_NOT_FOUND(HttpStatus.NOT_FOUND, "채용 공고를 찾을 수 없습니다."),
  JOB_POSTING_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 등록된 외부 채용 공고입니다."),
  JOB_COLLECT_FAILED(HttpStatus.BAD_REQUEST, "채용 데이터 수집에 실패했습니다."),
  JOB_SKILL_TAG_NOT_FOUND(HttpStatus.NOT_FOUND, "채용 기술 태그를 찾을 수 없습니다."),
  JOB_JD_ANALYSIS_FAILED(HttpStatus.BAD_REQUEST, "JD 분석에 실패했습니다."),

  RESUME_CAREER_PROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "채용 분석용 프로필을 찾을 수 없습니다."),
  RESUME_CAREER_PROFILE_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 채용 분석용 프로필이 존재합니다."),
  RESUME_SKILL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 등록된 프로필 스킬입니다."),
  RESUME_PROOF_CARD_NOT_FOUND(HttpStatus.NOT_FOUND, "선택된 Proof Card를 찾을 수 없습니다."),
  RESUME_PROOF_CARD_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 선택된 Proof Card입니다."),

  MARKET_LEARNING_FEEDBACK_SKILL_GAP_NOT_FOUND(HttpStatus.NOT_FOUND, "로드맵에 추가할 스킬 갭을 찾을 수 없습니다."),
  PROJECT_NOT_FOUND(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."),
  PROJECT_FORBIDDEN(HttpStatus.FORBIDDEN, "프로젝트를 관리할 권한이 없습니다."),
  IDEA_POST_NOT_FOUND(HttpStatus.NOT_FOUND, "아이디어 게시글을 찾을 수 없습니다."),
  IDEA_POST_FORBIDDEN(HttpStatus.FORBIDDEN, "아이디어 게시글을 관리할 권한이 없습니다."),

  SQUAD_NOT_FOUND(HttpStatus.NOT_FOUND, "스쿼드를 찾을 수 없습니다."),
  SQUAD_ALREADY_ARCHIVED(HttpStatus.BAD_REQUEST, "이미 보관된 스쿼드입니다."),
  SQUAD_NOT_ARCHIVED(HttpStatus.BAD_REQUEST, "보관 상태가 아닌 스쿼드입니다."),
  SQUAD_MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "스쿼드 멤버를 찾을 수 없습니다."),
  SQUAD_ALREADY_MEMBER(HttpStatus.CONFLICT, "이미 스쿼드에 속한 멤버입니다."),
  SQUAD_INVITATION_ALREADY_PENDING(HttpStatus.CONFLICT, "이미 초대 대기 중인 사용자입니다."),
  SQUAD_FORBIDDEN(HttpStatus.FORBIDDEN, "스쿼드를 관리할 권한이 없습니다."),

  WORKSPACE_NOT_FOUND(HttpStatus.NOT_FOUND, "워크스페이스를 찾을 수 없습니다."),
  WORKSPACE_FORBIDDEN(HttpStatus.FORBIDDEN, "워크스페이스에 접근할 권한이 없습니다."),
  TASK_NOT_FOUND(HttpStatus.NOT_FOUND, "태스크를 찾을 수 없습니다."),
  TASK_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 워크스페이스의 태스크가 아닙니다."),
  MILESTONE_NOT_FOUND(HttpStatus.NOT_FOUND, "마일스톤을 찾을 수 없습니다."),
  MILESTONE_FORBIDDEN(HttpStatus.FORBIDDEN, "마일스톤을 관리할 권한이 없습니다."),
  CALENDAR_EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "캘린더 이벤트를 찾을 수 없습니다."),
  CALENDAR_EVENT_FORBIDDEN(HttpStatus.FORBIDDEN, "캘린더 이벤트를 관리할 권한이 없습니다."),
  FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다."),
  FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "파일 업로드에 실패했습니다."),
  DOC_NOT_FOUND(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다."),
  MEETING_NOTE_NOT_FOUND(HttpStatus.NOT_FOUND, "회의록을 찾을 수 없습니다."),
  SHOWCASE_NOT_FOUND(HttpStatus.NOT_FOUND, "쇼케이스를 찾을 수 없습니다."),
  SHOWCASE_FORBIDDEN(HttpStatus.FORBIDDEN, "쇼케이스를 관리할 권한이 없습니다."),
  SHOWCASE_COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."),
  SHOWCASE_COMMENT_FORBIDDEN(HttpStatus.FORBIDDEN, "댓글을 관리할 권한이 없습니다."),
  SHOWCASE_ALREADY_LIKED(HttpStatus.CONFLICT, "이미 좋아요한 쇼케이스입니다."),
  SHOWCASE_NOT_LIKED(HttpStatus.CONFLICT, "좋아요하지 않은 쇼케이스입니다."),
  PORTFOLIO_NOT_FOUND(HttpStatus.NOT_FOUND, "포트폴리오를 찾을 수 없습니다."),
  PORTFOLIO_FORBIDDEN(HttpStatus.FORBIDDEN, "포트폴리오에 접근할 권한이 없습니다."),

  INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C002", "서버 내부 오류가 발생했습니다.");

  private final HttpStatus httpStatus;
  private final String code;
  private final String message;

  ErrorCode(HttpStatus httpStatus, String message) {
    this(httpStatus, null, message);
  }

  ErrorCode(HttpStatus httpStatus, String code, String message) {
    this.httpStatus = httpStatus;
    this.code = code == null ? name() : code;
    this.message = message;
  }

  public HttpStatus getStatus() {
    return httpStatus;
  }
}
