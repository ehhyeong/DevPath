# 백엔드 구조 리뷰 기록

## 현재 작업 범위. 아키텍처 규칙 자동화

- 기존 로드맵 Java 파일 3개의 Spotless 위반을 정리해 전체 포맷 검사를 복구한다.
- Maven Central 메타데이터에서 2026-08-04 갱신된 ArchUnit 최신 릴리스 `1.5.0`을 확인했다.
- `domain`과 `common`이 `api`에 의존하지 못하도록 운영 클래스 대상 ArchUnit 테스트를 추가한다.
- 테스트 코드는 운영 패키지 의존성 검사에서 제외한다.
- 기존 로드맵 Java 파일 3개에 Spotless 포맷을 적용해 전체 포맷 검사를 복구했다.
- `build.gradle`에 `com.tngtech.archunit:archunit-junit5:1.5.0`을 추가했고 Gradle 해석 버전도 1.5.0임을 확인했다.
- `PackageDependencyTest`에 `domain → api`, `common → api` 금지 규칙 2개를 추가했다.
- `\.\gradlew.bat test --tests "com.devpath.architecture.PackageDependencyTest" --no-daemon`이 성공했다.
- `\.\gradlew.bat test --no-daemon`은 260개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`이 성공했다.
- `domain → api`, `common → api`, 경로-package 불일치는 모두 0건이고 `git diff --check`가 통과했다.

## 완료된 common 기능 코드 정리

- `common → api` import 7건은 블로그 발행 Provider 3개와 WebSocket Config 2개에서 발생한다.
- 블로그 발행 코드는 `learning` 기능 전용이므로 결과 모델까지 포함한 4개 파일을 `api.learning.provider`로 이동한다.
- Q&A와 Voice WebSocket Config는 각각의 Handler와 강하게 결합되어 있으므로 `api.qna.realtime`과 `api.voice.signaling`으로 이동한다.
- Provider 구현, WebSocket URL, Bean과 Profile 설정 등 런타임 동작은 변경하지 않는다.
- 블로그 발행 Provider 3개와 결과 모델을 `api.learning.provider`로 이동했다.
- Q&A와 Voice WebSocket Config를 각각 `api.qna.realtime`, `api.voice.signaling`으로 이동했다.
- `common → api`, `domain → api`, 이전 공통 패키지 참조는 모두 0건이다.
- `\.\gradlew.bat compileJava compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- `\.\gradlew.bat test --no-daemon`은 258개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- 운영·테스트 Java 파일의 경로와 package 선언 불일치는 0건이고 `git diff --check`가 통과했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`은 기존 로드맵 파일 3개의 포맷 위반으로 실패했으며 이번 변경 파일에는 Spotless 포맷을 적용했다.

## 완료된 역방향 의존성 제거

- `domain → api` 역방향 import 12건은 애플리케이션 Service 4개가 API DTO와 API 연동 컴포넌트를 사용하는 데서 발생한다.
- 네 Service는 도메인 객체만 다루는 Domain Service가 아니라 API 요청·응답 변환과 유스케이스 조정을 담당하므로 대응하는 `api` 기능 패키지로 이동한다.
- Entity와 Repository 및 비즈니스 로직은 변경하지 않고 파일 경로, package 선언과 import만 변경한다.
- `AdminAnalyticsService`를 직접 생성하거나 같은 package로 참조하는 테스트 2개도 `api.analytics.service` 테스트 패키지로 이동한다.
- 네 Service와 테스트를 이동한 뒤 `domain → api` import와 이전 Service 패키지 참조는 모두 0건이다.
- `\.\gradlew.bat compileJava compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- 이동한 Analytics Service 테스트 2개를 지정한 `\.\gradlew.bat test --tests ... --no-daemon`이 성공했다.
- `\.\gradlew.bat test --no-daemon`은 258개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- 운영·테스트 Java 파일의 경로와 package 선언 불일치는 0건이고 `git diff --check`가 통과했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`은 이번 범위와 무관한 기존 로드맵 파일 3개의 포맷 위반으로 실패했다. 이번 변경 파일에는 Spotless 포맷을 적용했다.

## 완료된 패키지 구조 정리

- 사용자는 내부 비즈니스 로직보다 Spring 패키지 구조를 먼저 정리하기로 결정했다.
- `com.devpath.api` 아래의 Entity와 Repository 69개를 같은 기능의 `com.devpath.domain` 아래로 이동한다.
- 이번 작업은 파일 이동, `package` 선언, `import` 수정으로 제한한다.
- Service와 Controller의 내부 책임, API 동작, 트랜잭션과 도메인 모델 설계는 변경하지 않는다.
- `domain`에서 `api`를 참조하는 기존 역방향 의존성은 별도 후속 작업으로 남긴다.
- 이동 순서는 참조 범위가 작은 `notice`, `refund`, `settlement`, `review`, `admin`을 먼저 처리하고 `instructor`를 마지막에 처리한다.
- 기존 `domain/review/entity`와 `domain/review/repository`에는 이름 충돌이 없음을 확인했다.
- 변경 전 `\.\gradlew.bat compileJava test --no-daemon` 실행은 성공했다. Gradle 캐시 기준으로 모든 작업이 최신 상태였다.
- `notice`, `refund`, `settlement`, `review`의 Entity와 Repository 이동 후 각 단계에서 `\.\gradlew.bat compileJava --no-daemon`이 성공했다.
- `admin`과 `instructor` 이동 후에도 각 단계의 `\.\gradlew.bat compileJava --no-daemon`이 성공했다.
- 검색 결과 `api` 아래 Entity·Repository 파일, 기존 package 선언, 기존 완전한 패키지 참조는 모두 0건이다.
- 기존 `domain → api` 역방향 import는 4개 파일, 12건으로 이동 전과 동일하다.
- 경로와 package 선언이 달랐던 `api/auto/dto/AuthDto.java`를 선언과 일치하는 `api/auth/dto/AuthDto.java`로 이동했다.
- 최종 검색 결과 운영·테스트 Java 파일의 경로와 package 선언 불일치는 0건이다.
- 기존 파일의 diff에서 import 이외의 코드 변경은 0건이며 `git diff --check`도 통과했다.
- `\.\gradlew.bat test --no-daemon`은 258개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat compileJava --rerun-tasks --no-daemon`과 `\.\gradlew.bat compileTestJava --no-daemon`이 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`은 이번 범위와 무관한 기존 로드맵 파일 3개의 포맷 위반으로 실패했다. 이번 변경 파일에는 Spotless 포맷을 적용하고 관련 없는 3개 파일은 원상복구했다.

## 후속 구조 개선

- `domain`에서 `api`를 참조하는 역방향 의존성은 제거를 완료했다.
- `common`에서 `api`를 참조하던 기능 전용 코드의 이동을 완료했다.
- `domain → api`, `common → api` 금지 규칙의 ArchUnit 자동 검증을 추가했다.
- Controller의 Repository 직접 의존 금지와 `api` 하위 Entity·Repository 금지 규칙도 ArchUnit으로 확장할 수 있다.
- 대형 Service와 Controller의 책임 분리는 구조 이동과 섞지 않고 테스트를 확보한 뒤 별도 작업으로 진행한다.

## 완료된 구조 리뷰

## 범위

- 현재 로컬 저장소가 원격 저장소와 실질적으로 같다는 사용자 설명을 전제로 한다.
- 코드 수정이나 리팩터링은 하지 않고 구조와 설계를 진단한다.
- 백엔드 `src`와 루트 빌드·배포·Git 관리 파일을 우선 검토한다.

## 판단 원칙

- 폴더 이름만으로 결론 내리지 않고 실제 import와 호출 방향을 확인한다.
- 문제는 재현 가능한 검색 결과나 구체적인 파일 위치를 근거로 제시한다.
- 취향 차이와 유지보수·보안·실행 위험을 구분한다.

## 확인 결과

- 단일 Gradle 모듈에 운영 Java 파일 1,348개, Controller 153개, Service 182개, JPA Entity 240개, Repository 189개, HTTP 매핑 메서드 723개가 있다.
- README가 선언한 `api`와 `domain` 경계와 달리 `api` 아래에 Entity 38개와 Repository 31개가 있다.
- Controller에서 Repository를 직접 import하거나 Controller에 `@Transactional`을 둔 사례는 찾지 못했다.
- `domain`의 4개 파일과 `common`의 8개 import가 `api`를 역방향으로 참조한다.
- `api` 기능 간 교차 import는 157건이고 직접 양방향 의존 기능 쌍은 4개이다.
- `src/main/java/com/devpath/api/auto/dto/AuthDto.java`의 실제 package는 `com.devpath.api.auth.dto`로 경로와 선언이 다르다.
- 운영은 Oracle, 로컬은 PostgreSQL, 테스트는 PostgreSQL 모드 H2를 사용한다. 운영 스키마 마이그레이션 도구는 저장소에서 확인하지 못했다.
- 배포 워크플로는 운영 서버에서 직접 소스를 빌드하고 테스트와 Spotless를 제외하며, 임의의 HTTP 응답을 기동 성공으로 취급한다.
- 추적 파일 약 77.6MB 중 바이너리가 약 65.4MB이며, 실제 업로드 영상 3개 약 23.5MB도 Git에 포함되어 있다. Git LFS 설정은 없다.
- `./gradlew.bat test spotlessCheck --no-daemon` 실행에서 테스트 258개는 실패 없이 통과했고 1개가 건너뛰어졌다. Spotless 위반 파일 3개 때문에 전체 명령은 실패했다.

## 결론

- 동작 불가능한 코드는 아니며 Controller와 Repository의 기본 계층 분리는 지켜진다.
- 핵심 문제는 규모에 비해 모듈 경계가 강제되지 않고 패키지 규칙, 데이터베이스 검증, 배포 게이트, 저장소 자산 관리가 서로 어긋난다는 점이다.
## 완료된 잔여 폴더 일관성 정리

- 이번 작업은 파일 경로, package 선언, import만 변경하며 내부 비즈니스 로직은 변경하지 않는다.
- Controller 21개는 현재 기능 경계를 유지한 채 바로 아래 `controller` 패키지로 이동한다.
- JPA Entity 5개와 Entity가 사용하는 enum 2개는 `entity` 패키지로, Repository 5개는 `repository` 패키지로 이동한다.
- `RecommendationAlgorithmPolicy`는 설정을 조회하는 Spring Service이므로 Entity로 분류하지 않고 기존 도메인 기능 패키지에 유지한다.
- API Service 2개는 각각 현재 기능의 `service` 패키지로 이동한다.
- API 기능 간 교차 의존성, 양방향 기능 의존성, 대형 Service 분리, `config`와 `common.config` 역할 재설계는 별도 작업으로 남긴다.
- 대상 35개 파일을 이동하고 package 선언과 명시적·암시적 타입 참조를 갱신했다.
- `WorkspaceCodeReviewStore`는 package-private JDBC 저장 helper라 Service 구현과 강하게 결합되어 있고, `QnaRealtimePublisher`는 실시간 발행 어댑터이므로 현재 기능 패키지를 유지한다.
- 이름과 역할 기준 재검사 결과 Controller, Entity, Repository, API Service의 표준 폴더 외부 잔여 파일은 모두 0건이다.
- 경로-package 불일치, 이전 package import, `domain → api`, `common → api` 의존은 모두 0건이다.
- `\.\gradlew.bat compileJava --rerun-tasks --no-daemon`이 성공했다.
- `\.\gradlew.bat compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- `\.\gradlew.bat test --no-daemon`은 260개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
## 완료된 admin-roadmap 양방향 의존 제거

- 양방향 의존은 `AdminRoadmapHubController → RoadmapHubQueryService`와 `RoadmapHubQueryService → AdminRoadmapHubCatalogResponse`에서 발생한다.
- 공개·관리용 로드맵 섹션 조회는 roadmap 기능이 소유하고, admin 응답과 공식 로드맵 옵션 조립은 기존 `AdminRoadmapHubService`가 소유한다.
- 새 Service를 만들지 않고 기존 admin Service와 roadmap Query Service의 책임을 조정한다.
- API 응답 필드와 저장 로직은 변경하지 않는다.
- `instructor ↔ qna` 양방향 의존은 이번 작업에 포함하지 않는다.
- `RoadmapHubQueryService.getManagementCatalog()`은 roadmap 소유 DTO로 비활성 항목을 포함한 관리용 섹션을 반환한다.
- `AdminRoadmapHubService.getCatalog()`이 관리용 섹션과 공식 로드맵 옵션을 admin 응답으로 조립한다.
- `roadmap → admin` import는 0건이며 `admin → roadmap` 세 건만 남아 단방향 의존이 되었다.
- `PackageDependencyTest`에 `roadmap → admin` 금지 규칙을 추가해 역방향 의존의 재발을 막는다.
- 관리자 로드맵 통합 테스트와 아키텍처 테스트를 지정한 Gradle 테스트가 성공했다.
- `\.\gradlew.bat test --no-daemon`은 261개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 전체 API 교차 import는 119건이고 양방향 기능 의존은 `instructor ↔ qna` 한 쌍만 남았다.
## 완료된 instructor-qna 양방향 의존 제거

- `QnaService → InstructorNotificationService`와 `InstructorQnaInboxService → QnaRealtimePublisher`가 직접 양방향 의존을 만든다.
- `InstructorNotificationService`는 admin, learner, mentoring, qna, review가 공통으로 호출하고 Entity와 Repository도 `domain.notification`에 있으므로 `api.notification.service`가 자연스러운 위치이다.
- 기존 `api.notification.dto.NotificationResponse`와 이름이 겹치므로 강사 전용 응답은 `InstructorNotificationResponse`로 이름을 명확히 한다.
- 강사 알림 Controller도 notification DTO와 Service만 사용하므로 URL은 유지한 채 `api.notification.controller`로 이동한다.
- Service와 DTO의 package 및 클래스 이름만 정리하고 알림 저장, 조회, 트랜잭션, API JSON 필드는 변경하지 않는다.
- 정리 후 `instructor → qna`만 남기고 `qna → instructor`는 아키텍처 테스트로 금지한다.
- `InstructorNotificationService`, `InstructorNotificationResponse`, `InstructorNotificationController`를 각각 notification 기능의 service, dto, controller 패키지로 이동했다.
- 기존 강사 알림 URL과 JSON 필드, 저장·조회 로직, 트랜잭션 선언은 변경하지 않았다.
- `QnaService`를 포함한 admin, learner, mentoring, review 호출자는 중립적인 notification Service를 사용한다.
- `qna → instructor` import는 0건이고 `instructor → qna` 한 건만 남았다.
- `PackageDependencyTest`에 `qna → instructor` 금지 규칙을 추가했다.
- Q&A 통합 테스트와 아키텍처 테스트를 지정한 Gradle 테스트가 성공했다.
- `\.\gradlew.bat spotlessApply test --no-daemon`은 262개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 전체 API 교차 import는 120건, 방향성 있는 기능 쌍은 43개이며 양방향 기능 의존은 0개이다.
- 교차 import 원시 건수는 119건에서 120건이 되었지만 instructor 내부에 숨었던 알림 의존이 notification 기능 경계로 드러난 결과이며, 방향성 있는 기능 쌍은 45개에서 43개로 줄고 순환은 제거되었다.
## 완료된 config와 bootstrap 역할 분리

- 루트 `com.devpath.config`의 12개 클래스는 모두 local·dev 프로필에서 실행되는 seed, SQL 실행, 기존 로컬 데이터 보정 컴포넌트이다.
- `com.devpath.common.config`의 8개 클래스는 Security, Jackson, Swagger, HTTP Client, 정적 업로드 리소스, 외부 API 프로퍼티 설정이다.
- 실제 설정과 시작 데이터를 구분하기 위해 루트 config 코드는 `com.devpath.bootstrap.seed`로 이동한다.
- 관련 테스트 2개도 동일한 `com.devpath.bootstrap.seed` 테스트 패키지로 이동한다.
- Bean 이름, 실행 순서, 프로필, SQL 리소스, 초기화 로직은 변경하지 않는다.
- 운영 seed 컴포넌트 12개와 테스트 2개를 `com.devpath.bootstrap.seed`로 이동했다.
- `common.config`와 `bootstrap.seed`에 `package-info.java`를 추가해 각각 전역 프레임워크 설정과 local·dev 시작 데이터 작업임을 명시했다.
- `src/AGENTS.md`에 설정, 외부 연동 프로퍼티, profile 기반 seed의 향후 배치 규칙을 추가했다.
- 루트 `com.devpath.config`의 Java 파일, 이전 package 참조, `common.config`의 seed Runner는 모두 0건이다.
- bootstrap seed 컴포넌트 12개 모두 local·dev Profile로 제한되어 있음을 확인했다.
- 경로-package 불일치는 0건이다.
- `\.\gradlew.bat compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- seed 테스트 2개와 전체 아키텍처 테스트를 지정한 Gradle 테스트가 성공했다.
- `\.\gradlew.bat test --no-daemon`은 262개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
## 완료된 Q&A 범위 기능의 교차 import 정리

- API 교차 import 120건은 Service 대상 60건, DTO 대상 57건, 기타 3건이다.
- 가장 큰 방향은 `workspace → qna` 12건과 `mentoring → qna` 12건이다.
- 두 묶음은 qna DTO뿐 아니라 qna Entity와 Repository를 직접 사용하며 각각 workspace와 mentoring 범위의 Q&A 유스케이스를 구현한다.
- `WorkspaceQuestionController/Service`는 `api.qna.workspace`로, `MentoringQuestionController/Service`는 `api.qna.mentoring`으로 이동한다.
- HTTP URL, Swagger 설명, 요청·응답 DTO, 권한 검사, 트랜잭션, 알림 동작은 변경하지 않는다.
- 이동 후 workspace와 mentoring API가 qna API를 다시 직접 참조하지 않도록 아키텍처 규칙을 추가한다.
- Q&A Controller 2개와 Service 2개를 각각 `api.qna.workspace`, `api.qna.mentoring` 하위의 controller·service 패키지로 이동했다.
- 이전 클래스 package 참조와 `workspace → qna`, `mentoring → qna` API import는 모두 0건이다.
- `PackageDependencyTest`에 workspace와 mentoring API의 qna API 역참조 금지 규칙을 추가했다.
- 교차 import는 120건에서 96건으로 24건 줄었고 방향성 있는 기능 쌍은 43개에서 41개로 줄었다.
- 양방향 기능 의존, Controller·API Service의 표준 폴더 외부 파일, 경로-package 불일치는 모두 0건이다.
- `\.\gradlew.bat compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- `PackageDependencyTest`를 지정한 Gradle 테스트가 성공했다.
- `\.\gradlew.bat test --no-daemon`은 264개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 다음 우선 후보는 각각 6건인 `learner → common`, `workspace → ai`, `job → roadmap` 의존이다.
## 현재 작업 범위. 모호한 api.common 제거

- `learner → common` 6건은 `CourseDetailResponse`, `CourseListItemResponse`, `CourseDetailMetadataMapper` 사용에서 발생한다.
- instructor도 같은 강의 상세 DTO와 Mapper를 사용하며 `api.common`의 강의 코드는 실제로 course 기능의 공유 계약이다.
- `CourseDetailResponse`와 `CourseListItemResponse`는 `api.course.dto`, `CourseDetailMetadataMapper`는 `api.course.mapper`로 이동한다.
- 사용처가 없는 `RoadmapEntryResponse`는 삭제하지 않고 실제 소유 기능인 `api.roadmap.dto`로 이동한다.
- 클래스 이름, 응답 필드, Mapper 로직, Bean 동작은 변경하지 않는다.
- 기능 이름이 아닌 모호한 `api.common` 패키지에 클래스가 다시 생기지 않도록 아키텍처 규칙을 추가한다.
- `api.common`의 Java 파일과 이전 package import는 모두 0건이다.
- API 교차 import 원시 건수는 96건으로 유지됐다. 기존 `common` import가 명시적인 `course` import로 바뀐 결과이며, 방향성 있는 기능 쌍은 41개에서 39개로 줄었다.
- 양방향 기능 의존, `domain`·`common`에서 API로 향하는 import, 경로-package 불일치는 모두 0건이다.
- `\.\gradlew.bat compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- learner·instructor 강의 통합 테스트와 `PackageDependencyTest`를 지정한 테스트는 23개 중 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat test --no-daemon`은 265개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 다음 교차 의존 정리 후보는 `workspace → ai` 6건과 `job → roadmap` 6건이다.

## 현재 작업 범위. workspace와 AI 코드 리뷰 경계 정리

- `workspace → ai` 6건은 AI 리뷰 생성·조회 호출과 `AiCodeReviewResponse.Detail`의 직접 노출에서 발생한다.
- 워크스페이스가 AI 코드 리뷰 기능을 사용하는 것은 실제 유스케이스이므로 기능 간 의존 자체를 억지로 제거하지 않는다.
- `WorkspaceCodeReviewAiReviewer`를 두 기능 사이의 연동 지점으로 사용하고, 다른 workspace 클래스에서는 AI API package를 직접 참조하지 않도록 제한한다.
- 워크스페이스 응답에는 전용 AI 리뷰 record를 두고 기존 JSON 필드 이름과 값은 유지한다.
- AI 리뷰 생성, 조회, 알림, 저장 로직과 기존 HTTP URL은 변경하지 않는다.
- `WorkspaceCodeReviewResponse`에 기존 AI 응답과 같은 JSON 필드를 갖는 `AiReview`, `AiComment` record를 추가했다.
- `WorkspaceCodeReviewService`의 AI Service·DTO 직접 참조를 제거하고 조회와 변환도 `WorkspaceCodeReviewAiReviewer`를 통하도록 변경했다.
- 아키텍처 테스트는 `WorkspaceCodeReviewAiReviewer` 이외의 workspace production 클래스가 `api.ai`를 참조하지 못하게 한다.
- `workspace → ai` production import는 6건에서 3건으로 줄었고, 남은 3건은 전용 연동 컴포넌트 한 파일에만 존재한다.
- 전체 API 교차 import는 96건에서 93건으로 줄었고 방향성 있는 기능 쌍은 39개, 양방향 기능 의존은 0개이다.
- `domain`·`common`에서 API로 향하는 import와 경로-package 불일치는 모두 0건이다.
- workspace 코드 리뷰 단위 테스트와 `PackageDependencyTest`를 지정한 테스트는 11개 중 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat test --no-daemon`은 267개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 다음 교차 의존 정리 후보는 `job → roadmap` 6건이다.

## 현재 작업 범위. job과 roadmap 경계 정리

- `job → roadmap` 6건 중 5건은 `NodeRequiredTagRegistrar`, `RoadmapProgressService`, `SystemDynamicRoadmapProvider` 참조이다.
- 세 컴포넌트는 API DTO나 Controller에 의존하지 않고 로드맵 Entity·Repository와 도메인 규칙만 사용하며 job 외에도 learner, dashboard, recommendation에서 공유한다.
- 세 컴포넌트를 기존 `com.devpath.domain.roadmap.service`로 이동하고 호출 로직과 Spring Bean 동작은 유지한다.
- 실제 roadmap API 유스케이스 호출인 `CustomRoadmapCopyService` 의존 1건은 `JobSkillRoadmapWriter`에만 남긴다.
- 기존 HTTP URL, 응답 DTO, 트랜잭션과 로드맵 생성·진행률·태그 등록 동작은 변경하지 않는다.
- `NodeRequiredTagRegistrar`, `RoadmapProgressService`, `SystemDynamicRoadmapProvider`를 `com.devpath.domain.roadmap.service`로 이동했다.
- 이전 API package 참조와 이전 경로의 Java 파일은 모두 0건이다.
- job의 roadmap API import는 6건에서 1건으로 줄었고 남은 `CustomRoadmapCopyService` 호출은 `JobSkillRoadmapWriter` 한 파일에만 존재한다.
- 아키텍처 테스트는 `JobSkillRoadmapWriter` 이외의 job production 클래스가 roadmap API를 참조하지 못하게 한다.
- 전체 API 교차 import는 93건에서 84건으로 줄었고 방향성 있는 기능 쌍은 39개에서 38개로 줄었다.
- 양방향 기능 의존, `domain`·`common`에서 API로 향하는 import, 경로-package 불일치는 모두 0건이다.
- 관련 단위·통합·아키텍처 테스트는 24개 중 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat test --no-daemon`은 268개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 다음 교차 의존 정리 후보는 `kanban → workspace` 5건이다.

## 현재 작업 범위. kanban 호환 Controller 소유권 정리

- `api.kanban`에는 `KanbanTaskController` 한 개만 있고 별도 Service, DTO, Domain, Repository가 없다.
- Controller의 5개 기능 import는 모두 workspace의 태스크 DTO와 `WorkspaceTaskService`이며 실제 데이터 소유권도 workspace에 있다.
- `/api/tasks`는 Swagger 시나리오 호환용 단축 URL이므로 삭제하거나 workspaceId 기반 기존 URL과 합치지 않는다.
- Controller를 `api.workspace.controller`로 이동하고 `WorkspaceTaskCompatibilityController`로 개명해 호환 목적을 명시한다.
- HTTP URL, 메서드, 요청·응답 DTO, 인증과 Service 호출 동작은 변경하지 않는다.
- `KanbanTaskController`를 `api.workspace.controller.WorkspaceTaskCompatibilityController`로 이동·개명했다.
- `/api/tasks` 루트와 수정·담당자·상태·삭제 하위 URL을 reflection 기반 테스트로 고정했다.
- `api.kanban`의 Java 파일과 `kanban → workspace` import는 모두 0건이다.
- 아키텍처 테스트는 `api.kanban`에 클래스가 다시 생성되지 못하게 한다.
- 전체 API 교차 import는 84건에서 79건으로 줄었고 방향성 있는 기능 쌍은 38개에서 37개로 줄었다.
- 양방향 기능 의존, `domain`·`common`에서 API로 향하는 import, Controller 표준 폴더 외부 파일, 경로-package 불일치는 모두 0건이다.
- URL 호환성 테스트와 `PackageDependencyTest`는 11개 중 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat test --no-daemon`은 270개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 다음 감사 후보는 `learning → proof` 4건이다. `learner → course` 7건과 `instructor → course` 4건은 실제 강의 조회 유스케이스일 수 있어 무조건 제거하지 않고 별도로 판단한다.

## 현재 작업 범위. proof API를 learning 하위 기능으로 정렬

- `learning → proof` 4건은 학습 이력의 Proof Card 조회·응답과 노드 클리어 후 Proof Card 발급에서 발생한다.
- Proof Card와 Certificate의 Entity·Repository는 이미 `domain.learning.entity.proof`, `domain.learning.repository.proof`에 속한다.
- `api.proof`를 참조하는 다른 production 기능은 없으므로 API 계층도 `api.learning.proof` 하위로 정렬한다.
- proof의 Controller·Service·Component·DTO와 관련 테스트를 함께 이동하며 클래스 이름과 Bean 이름은 유지한다.
- 기존 Proof Card·공유·Certificate HTTP URL, 요청·응답 DTO 필드, 트랜잭션과 발급 로직은 변경하지 않는다.
- proof API의 Controller 3개, Service 3개, Component 2개, DTO 5개를 `api.learning.proof`로 이동했다.
- 관련 `ProofCardServiceAutomationRuleTest`도 동일한 test package로 이동했다.
- Proof Card, 공유, Certificate의 기존 루트 URL을 reflection 기반 테스트로 고정했다.
- 이전 `api.proof`의 Java 파일과 import는 모두 0건이며 아키텍처 테스트가 이전 package 재생성을 금지한다.
- 전체 API 교차 import는 79건에서 75건으로 줄었고 방향성 있는 기능 쌍은 37개에서 36개로 줄었다.
- 양방향 기능 의존, `domain`·`common`에서 API로 향하는 import, Controller 표준 폴더 외부 파일, 경로-package 불일치는 모두 0건이다.
- proof 발급 정책·URL 계약·아키텍처 테스트는 14개 중 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat test --no-daemon`은 272개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 남은 상위 의존인 `learner → course` 7건과 `instructor → course` 4건은 실제 강의 유스케이스일 가능성이 높으므로 다음 단계에서 제거 대상인지 먼저 감사한다.

## 현재 작업 범위. instructor와 evaluation 연동 경계 고정

- `instructor → evaluation` 3건은 `InstructorQuizEditor`가 AI 퀴즈 초안을 생성하고 강사용 편집 응답으로 변환하는 과정에서 발생한다.
- evaluation은 학습자 퀴즈·과제와 강사 평가 API를 함께 소유하는 독립 기능이므로 instructor 아래로 옮기지 않는다.
- production의 evaluation API import 3건은 이미 `InstructorQuizEditor` 한 파일에만 존재하고 역방향 `evaluation → instructor` 의존은 0건이다.
- 새 Adapter나 중간 DTO를 추가하면 현재보다 구조가 복잡해지므로 추가 추상화는 만들지 않는다.
- 다른 instructor 클래스가 evaluation API에 직접 의존하지 못하도록 현재 연동 지점을 아키텍처 테스트로 고정한다.
- `PackageDependencyTest`에 `InstructorQuizEditor` 외 instructor production 코드의 evaluation API 의존 금지 규칙을 추가했다.
- `instructor → evaluation` import는 3건으로 유지되며 한 파일에만 존재하고 허용 지점 밖 참조는 0건이다.
- 전체 API 교차 import는 75건, 방향성 있는 기능 쌍은 36개, 양방향 기능 의존은 0개로 유지됐다.
- `domain`·`common`에서 API로 향하는 import와 경로-package 불일치는 모두 0건이다.
- 강사용 평가 편집·AI 퀴즈 초안·아키텍처 테스트는 18개 중 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat test --no-daemon`은 273개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 600줄 이상 API Service는 `InstructorLearningAnalyticsService` 770줄, `InstructorAnalyticsService` 743줄, `DiagnosisRecommendationService` 705줄의 3개이다.
- 다음 단계는 가장 큰 `InstructorLearningAnalyticsService`의 책임과 호출자를 먼저 감사해 실제 분리 단위를 정하는 것이다.

## 현재 작업 범위. 강사 학습 분석 Service 책임 분리

- `InstructorLearningAnalyticsService` 770줄에는 수강·진도·이탈·퍼널 조회와 과제·퀴즈·난이도 조회라는 서로 다른 두 책임이 섞여 있다.
- 전자는 Course·CourseEnrollment·LessonProgress 중심으로 변하고, 후자는 Submission·Quiz·QuizAttempt·CourseNodeMapping 중심으로 변한다.
- `InstructorLearningProgressAnalyticsService`와 `InstructorAssessmentAnalyticsService`로 분리하고 Controller가 두 Service를 직접 호출한다.
- 기존 클래스 이름만 유지하는 전달 전용 Service는 구조만 늘리므로 만들지 않는다.
- 기존 HTTP URL, 요청 파라미터, 응답 DTO와 계산식은 변경하지 않는다.
- 반복되는 강사 검증 몇 줄은 두 Service에 남긴다. 이 중복만 제거하려고 별도 계층을 추가하면 현재 기준으로는 추상화 비용이 더 크다.
- 기존 770줄 Service를 제거하고 진도 분석 395줄, 평가 분석 442줄 Service로 분리했다.
- Controller의 13개 GET URL과 응답 DTO는 유지하며 각 책임의 Service를 직접 호출하도록 변경했다.
- 이전 `InstructorLearningAnalyticsService` 클래스와 변수 참조는 0건이다.
- 분리된 두 Service에 완료율 계산과 강의가 없는 과제 통계 계약을 검증하는 회귀 테스트를 추가했다.
- `\.\gradlew.bat compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- 신규 회귀 테스트 2개는 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat test --no-daemon`은 275개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 600줄 이상 API Service는 3개에서 `InstructorAnalyticsService` 743줄과 `DiagnosisRecommendationService` 705줄의 2개로 줄었다.
- API Controller의 Repository 직접 import는 0건이며 분석 Controller는 응답 DTO만 반환한다.

## 현재 작업 범위. 강사 대시보드 분석 조립 책임 분리

- `InstructorAnalyticsService` 743줄의 공개 메서드는 `getDashboard` 하나이므로 여러 Service로 나눌 유스케이스 경계는 없다.
- 현재 클래스에는 강의 범위 선택과 Repository 조회 외에도 학습 현황 계산과 평가 현황 계산이 함께 들어 있다.
- Service에는 강사 소유 강의 범위 결정, Repository 조회, 트랜잭션 경계와 최종 응답 조정을 남긴다.
- 학습 현황의 Overview·학생·진도·완료율·시청 시간·이탈·퍼널 조립은 `InstructorLearningDashboardAssembler`가 맡는다.
- 퀴즈·과제·난이도·취약 지점·규칙 기반 인사이트 조립은 `InstructorAssessmentDashboardAssembler`가 맡는다.
- Assembler는 Repository를 호출하지 않고 전달받은 Entity 목록을 순수 계산해 응답 구역을 만든다.
- 기존 대시보드 URL, 선택 강의 필터, 응답 DTO와 계산식은 변경하지 않는다.
- `InstructorAnalyticsService`는 743줄에서 133줄로 줄었고 Repository 조회와 최종 응답 조정만 담당한다.
- `InstructorLearningDashboardAssembler` 361줄과 `InstructorAssessmentDashboardAssembler` 348줄로 계산 책임을 분리했다.
- 두 Assembler에는 Repository 의존과 호출이 없으며 `InstructorAnalyticsMetrics`만 공유한다.
- 학습 완료·이탈·퍼널과 퀴즈·난이도·취약 지점·인사이트 계산을 고정하는 단위 테스트 2개를 추가했다.
- 기존 대시보드 HTTP 통합 테스트를 포함한 관련 테스트 3개는 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- `\.\gradlew.bat test --no-daemon`은 277개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 600줄 이상 API Service는 `DiagnosisRecommendationService` 705줄 하나만 남았다.
- API Controller의 Repository 직접 import는 계속 0건이다.

## 현재 작업 범위. 구조 개선 최종 정리와 협업 설정

- 사용자는 변경사항 최종 감사, 논리적 커밋 분리, README 정리, GitHub 협업 설정, `VoiceChannelService` 감사를 함께 요청했다.
- 현재 브랜치는 `kimtaehyeong`이며 `origin`은 `ehhyeong/DevPath`, `upstream`은 `yongha03/DevPath`이다.
- 작업 트리에는 약 330개 변경 항목이 있으므로 커밋 전 이동 파일과 실제 동작 변경을 구분해 검토한다.
- `.env`는 `.gitignore`에 의해 제외되고 Git이 추적하지 않으므로 내용을 읽거나 커밋하지 않는다.
- 로컬 GitHub CLI는 설치되어 있지 않다. 원격 브랜치 보호는 로그인 가능한 브라우저 또는 사용 가능한 연결을 확인한 뒤 적용한다.
- README의 팀원 기여 내역은 추측하지 않고 Git 작성자·커밋·변경 경로를 근거로 작성한다.
- `VoiceChannelService`는 줄 수만으로 분리하지 않고 채널 참여, 채팅, 회의록과 작업 생성의 변경 이유가 실제로 다른지 확인한다.

## 구조 개선 최종 감사와 협업 문서 결과

- 삭제 160개와 신규 Java 176개를 파일명 기준으로 대조했다. 같은 이름이 없는 항목은 분석 Service 분리, 알림 DTO·호환 Controller 개명, 신규 package-info와 회귀·아키텍처 테스트로 모두 설명된다.
- `.env`는 계속 Git 비추적·ignore 상태이며 내용은 읽지 않았다.
- README에 모노레포 선택 이유, `api`·`domain`·`common`·`bootstrap.seed` 역할, 의존 방향, Git 이력 기반 팀원 담당과 대표 PR·커밋을 반영했다.
- `.github/ISSUE_TEMPLATE`에 버그·기능 제안 양식과 빈 이슈 제한 설정을 추가하고, PR 템플릿에 변경 이유·실제 검증·위험·관련 이슈·리뷰 체크리스트를 추가했다.
- `VoiceChannelService`는 채널·참여·채팅·세션 종료를 유지하고 339줄로 줄였다. 회의록 갱신·AI 요약·칸반 작업 생성은 232줄의 `VoiceMeetingMinutesService`로 분리했다.
- 두 Voice Service가 같은 채널·사용자 조회와 워크스페이스 권한 규칙을 사용하도록 package-private `VoiceChannelAccess` 컴포넌트로 중복을 제거했다.
- `\.\gradlew.bat test --no-daemon`은 279개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- Controller 152개, Entity 193개, Repository 189개, API Service 174개는 모두 표준 하위 폴더 밖 0개이다.
- Controller의 Repository 직접 import, `domain`·`common`의 API import, API 기능 간 양방향 의존, 600줄 이상 API Service는 모두 0개이다.
- API 기능 간 교차 import는 76건, 단방향 기능 쌍은 36개로 남아 있으며 이번 범위에서는 양방향 순환 제거와 소유권 정렬까지만 완료한다.
- 변경은 패키지 소유권, 분석·진단 추천 책임, Voice 책임, README, GitHub 협업 템플릿의 논리적 커밋으로 분리했다.
- 첫 패키지 소유권 커밋은 별도 worktree에서 `\.\gradlew.bat compileTestJava --no-daemon`을 실행해 독립 컴파일 성공을 확인했다.
- GitHub의 기본 반영 브랜치는 배포 workflow와 병합 이력 기준 `master`이다.
- 로그인된 `ehhyeong` 계정은 `yongha03/DevPath` 저장소 옵션 권한이 없고 브랜치 설정 URL이 404로 차단되어 원격 브랜치 보호를 직접 적용할 수 없다.
- 저장소 소유자는 `master`에 PR 필수, 승인 1명 이상, 대화 해결 필수, 직접 push 제한을 적용하는 것이 적절하다. 현재 안정적인 PR CI workflow가 없으므로 필수 상태 검사는 CI 추가 후 설정한다.

## 현재 작업 범위. 원격 PR 생성과 merge commit 병합

- 사용자는 로컬 커밋을 push하고 `master`에 병합하는 작업까지 명시적으로 요청했다.
- 병합 방식은 Squash merge나 Rebase merge가 아니라 GitHub의 `Create a merge commit`을 사용한다.
- push 전에 Markdown·YAML·Java 파일을 UTF-8 엄격 디코딩으로 검사하고 Unicode 대체 문자 `U+FFFD`가 포함되지 않았는지 확인한다.
- PR 본문은 변경 요약, 변경 이유, 주요 변경 사항, 실제 검증 내역, 영향 범위와 위험, 관련 이슈 순서로 작성한다.
- 저장소의 Markdown·YAML·Java 파일 1,476개를 UTF-8 엄격 디코딩하고 `U+FFFD` 포함 여부를 검사해 모두 통과했다.

## 현재 작업 범위. 진단 추천 시연 폴백 책임 분리

- `DiagnosisRecommendationService` 705줄에는 일반 사용자의 AI 추천 흐름과 특정 프론트 시연 계정용 고정 추천 폴백이 함께 들어 있다.
- 일반 추천과 테스트 실행은 동일한 추천 엔진을 사용하므로 공개 Service를 엔드포인트별로 나누지 않는다.
- 시연 계정 판별, 고정 점수·제목·내용, 지연과 기존 추천 재사용은 독립적으로 변경되는 임시 시연 정책이다.
- 해당 정책을 `FrontendRoadmapDemoRecommender`로 분리하고 Service는 지원 여부를 확인해 위임한다.
- 커스텀 로드맵 소유권 조회와 앵커 선택은 일반 추천에도 필요하므로 기존 Service에 유지하고 결과만 시연 컴포넌트에 전달한다.
- 기존 `recommendForQuiz`, `testRunRecommend` 시그니처와 트랜잭션 경계, 일반 AI 추천 계산식은 변경하지 않는다.
- `DiagnosisRecommendationService`는 705줄에서 551줄로 줄었고 일반 AI 추천과 변경 제안 적용을 계속 담당한다.
- `FrontendRoadmapDemoRecommender` 173줄이 시연 계정 판별, 고정 85점, 추천 생성·재사용과 지연을 전담한다.
- 커스텀 로드맵과 앵커 조회는 Service에 남겨 시연 컴포넌트가 로드맵 Repository를 중복 의존하지 않게 했다.
- 일반 추천 폴백 생성, 시연 계정 조건, 고정 점수와 기존 영문 추천의 한글 제목 갱신을 테스트로 확인했다.
- `\.\gradlew.bat compileTestJava --rerun-tasks --no-daemon`이 성공했다.
- 일반 추천·진단 퀴즈·시연 폴백 관련 테스트는 실패 0개, 오류 0개로 성공했다.
- `\.\gradlew.bat test --no-daemon`은 279개 테스트 중 실패 0개, 오류 0개, 건너뜀 1개로 성공했다.
- `\.\gradlew.bat spotlessCheck --no-daemon`과 `git diff --check`가 성공했다.
- 600줄 이상 API Service는 0개가 됐다.
- API Controller의 Repository 직접 import는 계속 0건이다.
