# 백엔드 구조 리뷰 체크리스트

## 현재 작업. 아키텍처 규칙 자동화

- [x] 기존 로드맵 파일 3개의 Spotless 위반 정리
- [x] ArchUnit 1.5.0 테스트 의존성 추가
- [x] `domain → api` 금지 테스트 추가
- [x] `common → api` 금지 테스트 추가
- [x] 아키텍처 테스트와 전체 백엔드 테스트 실행
- [x] 전체 Spotless 검사 통과
- [x] 구조 검색과 경로-package 일치 최종 확인
- [x] 후속 구조 개선 항목 갱신

## 완료된 common 기능 코드 정리

- [x] `common → api` 의존 파일과 호출자 확인
- [x] 블로그 발행 Provider와 결과 모델을 `api.learning.provider`로 이동
- [x] Q&A WebSocket Config를 `api.qna.realtime`로 이동
- [x] Voice WebSocket Config를 `api.voice.signaling`으로 이동
- [x] `common → api` import가 남지 않았는지 확인
- [x] 전체 컴파일과 백엔드 테스트 실행
- [x] 경로-package 일치 검사
- [x] Spotless 검사 실행. 기존 로드맵 파일 3개의 위반으로 실패
- [x] 후속 구조 개선 항목 갱신

## 완료된 역방향 의존성 제거

- [x] `domain → api` 의존 Service와 호출자 확인
- [x] 애플리케이션 Service 4개를 대응하는 `api` 패키지로 이동
- [x] `AdminAnalyticsService` 테스트 2개를 `api` 테스트 패키지로 이동
- [x] `domain → api` import가 남지 않았는지 확인
- [x] 관련 테스트와 전체 백엔드 테스트 실행
- [x] 컴파일과 경로-package 일치 검사
- [x] Spotless 검사 실행. 기존 로드맵 파일 3개의 위반으로 실패
- [x] 후속 구조 개선 항목 갱신

## 완료된 패키지 구조 정리

- [x] `api` 아래 Entity와 Repository 현황 확인
- [x] 변경 전 백엔드 컴파일과 관련 테스트 확인
- [x] `notice` Entity와 Repository를 `domain`으로 이동
- [x] `refund` Entity와 Repository를 `domain`으로 이동
- [x] `settlement` Entity와 Repository를 `domain`으로 이동
- [x] `review` Entity와 Repository를 `domain`으로 이동
- [x] `admin` Entity와 Repository를 `domain`으로 이동
- [x] `instructor` Entity와 Repository를 `domain`으로 이동
- [x] `api` 아래 Entity와 Repository가 남지 않았는지 확인
- [x] 전체 백엔드 테스트 실행
- [x] Spotless 검사 실행. 기존 로드맵 파일 3개의 위반으로 실패
- [x] 후속 구조 개선 항목 기록

## 완료된 구조 리뷰

- [x] 저장소와 `src` 디렉터리 구조 목록화
- [x] Gradle, 실행 환경, 설정 파일 확인
- [x] Controller, Service, Repository 의존 방향 확인
- [x] DTO와 Entity 경계 및 API 노출 확인
- [x] 보안, 예외 처리, 트랜잭션 구조 확인
- [x] 테스트 구성과 주요 검증 명령 확인
- [x] 문제를 심각도와 근거 파일별로 정리
## 완료된 잔여 폴더 일관성 정리

- [x] Controller 21개를 각 기능의 `controller` 하위 패키지로 이동
- [x] JPA Entity 5개와 관련 enum 2개를 `entity` 하위 패키지로 이동
- [x] Repository 5개를 `repository` 하위 패키지로 이동
- [x] API Service 2개를 `service` 하위 패키지로 이동
- [x] package 선언과 전체 import 갱신
- [x] 폴더 외부 잔여 파일 및 경로-package 불일치 재검사
- [x] 컴파일, 전체 테스트, Spotless 검증
## 완료된 admin-roadmap 양방향 의존 제거

- [x] `admin → roadmap`, `roadmap → admin` 호출 흐름 확인
- [x] 관리자 응답 조립을 `AdminRoadmapHubService`로 이동
- [x] `RoadmapHubQueryService`의 admin DTO 의존 제거
- [x] `roadmap → admin` 금지 아키텍처 테스트 추가
- [x] 관련 통합 테스트와 전체 구조 검사 실행
## 완료된 instructor-qna 양방향 의존 제거

- [x] 강사 알림 Service의 전체 호출자와 DTO 사용 범위 확인
- [x] 강사 알림 Service를 `api.notification.service`로 이동
- [x] 강사 알림 응답 DTO를 충돌 없는 이름으로 `api.notification.dto`에 이동
- [x] 강사 알림 Controller를 `api.notification.controller`로 이동
- [x] 전체 package·import와 테스트 mock 갱신
- [x] `qna → instructor` 금지 아키텍처 테스트 추가
- [x] 관련 테스트와 전체 검증 실행

## 완료된 workspace와 AI 코드 리뷰 경계 정리

- [x] `workspace → ai` 6건의 실제 호출 흐름과 응답 계약 확인
- [x] 워크스페이스 전용 AI 리뷰 응답 모델 추가
- [x] AI 연동과 응답 변환을 `WorkspaceCodeReviewAiReviewer`로 집중
- [x] 그 외 workspace 코드의 AI API 직접 의존 금지 규칙 추가
- [x] 기존 JSON 필드와 코드 리뷰 동작을 테스트로 확인
- [x] 전체 테스트와 Spotless, 구조 수치 재검증

## 완료된 강사 대시보드 분석 조립 책임 분리

- [x] `InstructorAnalyticsService`의 공개 유스케이스와 내부 계산 책임 분류
- [x] Service를 엔드포인트별로 나누지 않고 조회 조정 책임을 유지하기로 결정
- [x] 학습 현황 계산을 전용 Assembler로 분리
- [x] 평가 현황 계산을 전용 Assembler로 분리
- [x] 기존 `/api/instructor/analytics/dashboard` 계약과 필터 동작 유지 확인
- [x] 관련 테스트와 전체 테스트, Spotless, 600줄 이상 Service 수 재검증

## 완료된 강사 학습 분석 Service 책임 분리

- [x] `InstructorLearningAnalyticsService`의 공개 메서드와 Repository 의존성 분류
- [x] 수강·진도 분석과 과제·퀴즈 분석의 독립 책임 경계 확정
- [x] 두 책임을 별도 Service로 분리하고 기존 전달 전용 Service 제거
- [x] Controller의 기존 URL·응답 계약을 유지한 채 호출 대상 변경
- [x] 관련 테스트와 전체 테스트, Spotless, 600줄 이상 Service 수 재검증
## 완료된 config와 bootstrap 역할 분리

- [x] 루트 `config` 12개의 역할과 프로필 확인
- [x] 로컬·개발 seed 운영 파일을 `bootstrap.seed`로 이동
- [x] 관련 테스트를 동일한 테스트 패키지로 이동
- [x] `common.config`와 `bootstrap.seed`의 역할을 package 문서로 명시
- [x] `src/AGENTS.md`에 향후 배치 규칙 추가
- [x] 경로-package, 컴파일, 전체 테스트, Spotless 검증
## 완료된 Q&A 범위 기능의 교차 import 정리

- [x] API 교차 import 120건의 방향·대상 계층 분류
- [x] workspace Q&A Controller·Service를 `api.qna.workspace`로 이동
- [x] mentoring Q&A Controller·Service를 `api.qna.mentoring`으로 이동
- [x] 기존 URL·DTO·비즈니스 로직 유지 확인
- [x] workspace·mentoring에서 qna API 역참조 금지 규칙 추가
- [x] 교차 import 재집계와 전체 테스트·Spotless 검증
## 완료된 모호한 api.common 제거

- [x] `learner → common` 6건과 `api.common` 전체 사용처 확인
- [x] 강의 응답 DTO 2개를 `api.course.dto`로 이동
- [x] 강의 메타데이터 Mapper를 `api.course.mapper`로 이동
- [x] 로드맵 응답 DTO를 `api.roadmap.dto`로 이동
- [x] 이전 `api.common` 참조 제거와 재발 방지 규칙 추가
- [x] 관련 테스트와 전체 검증 실행

## 완료된 job과 roadmap 경계 정리

- [x] `job → roadmap` 6건의 실제 호출 흐름과 소유권 확인
- [x] 공유 로드맵 컴포넌트 3개를 `domain.roadmap.service`로 이동
- [x] production과 test의 package·import 갱신
- [x] job의 roadmap API 호출을 `JobSkillRoadmapWriter` 한 곳으로 제한
- [x] domain과 API 의존 규칙을 아키텍처 테스트로 확인
- [x] 관련 테스트와 전체 테스트, Spotless, 구조 수치 재검증

## 완료된 kanban 호환 Controller 소유권 정리

- [x] `kanban → workspace` 5건과 `/api/tasks` 사용처 확인
- [x] `api.kanban`이 독립 기능인지 실제 소유권 확인
- [x] 호환 Controller를 `api.workspace.controller`로 이동·개명
- [x] 기존 `/api/tasks` URL과 요청·응답 계약 유지 확인
- [x] 빈 `api.kanban` package 재생성 방지 규칙 추가
- [x] 관련 테스트와 전체 테스트, Spotless, 구조 수치 재검증

## 완료된 proof API의 learning 하위 기능 정렬

- [x] `learning → proof` 4건과 proof 기능의 실제 소유권 확인
- [x] proof Controller·Service·Component·DTO를 `api.learning.proof`로 이동
- [x] production과 test의 package·import 갱신
- [x] 기존 Proof Card·Certificate URL과 요청·응답 계약 유지 확인
- [x] 이전 `api.proof` package 재생성 방지 규칙 추가
- [x] 관련 테스트와 전체 테스트, Spotless, 구조 수치 재검증

## 완료된 instructor와 evaluation 연동 경계 고정

- [x] `instructor → evaluation` 3건의 호출 흐름과 소유권 확인
- [x] 3건이 `InstructorQuizEditor` 한 파일에 격리됐는지 확인
- [x] 패키지 이동보다 단방향 연동 유지가 적절한지 판단
- [x] 다른 instructor 클래스의 evaluation API 직접 의존 금지 규칙 추가
- [x] 강사용 퀴즈 편집과 AI 초안 관련 테스트 실행
- [x] 전체 테스트와 Spotless, 구조 수치 재검증

## 완료된 진단 추천 시연 폴백 책임 분리

- [x] `DiagnosisRecommendationService`의 일반 추천과 시연 전용 책임 분류
- [x] 공개 추천·테스트 실행 메서드와 호출자 확인
- [x] 프론트 시연 계정 판별·고정 추천 생성을 전용 컴포넌트로 분리
- [x] 일반 사용자의 AI 추천·분기 변경 동작 유지 확인
- [x] 시연 계정의 고정 점수·제목·추천 재사용 동작 유지 확인
- [x] 관련 테스트와 전체 테스트, Spotless, 600줄 이상 Service 수 재검증

## 진행 중인 구조 개선 최종 정리와 협업 설정

- [x] 변경 항목을 기능·이동·동작 변경으로 분류하고 누락·충돌·비밀 파일 포함 여부 감사
- [x] Git 이력으로 팀원별 담당 기능과 대표 변경 근거 정리
- [x] README에 모노레포 구조·백엔드 패키지 원칙·검증 방법·팀원 기여 내역 반영
- [x] 이슈 템플릿·PR 템플릿·CODEOWNERS 또는 협업 안내 보완
- [x] `VoiceChannelService`의 채널·채팅·회의록 책임 감사와 필요한 분리 구현
- [x] 관련 테스트와 전체 테스트·Spotless·구조 규칙 재검증
- [x] 변경사항을 논리적 커밋 단위로 분리하고 커밋별 검증 근거 확인
- [x] 원격 저장소의 기본 브랜치와 브랜치 보호 적용 가능 여부 확인
