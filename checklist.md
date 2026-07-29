# 학습자 UI lock Tailwind 이전 체크리스트

- [x] 학습자 페이지 라우트와 `index.css` UI lock 스코프를 정적 확인한다.
- [x] 1차 작업 단위인 `/`, `/home`의 원본 CSS와 실제 TSX 사용처를 대응시킨다.
- [x] 동일 viewport에서 변경 전 기준 스크린샷과 계산 스타일을 기록한다.
- [x] 홈 전용 UI lock을 홈 페이지 TSX의 Tailwind arbitrary utility로 이전한다.
- [x] 이전한 홈 전용 CSS 규칙만 `index.css`에서 제거한다.
- [x] 기능과 마크업 구조가 바뀌지 않았는지 diff로 확인한다.
- [x] `npm.cmd run build`와 `npm.cmd run lint`를 실행한다. 빌드는 통과했고 전체 린트는 기존 오류로 실패했다.
- [x] 동일 1440×733 캡처에서 크기·간격·색상·radius를 비교한다.
- [x] 원본 5px 스크롤바와 0.9 zoom 값을 사용해 수평 gutter 차이를 보정한다.

## `/roadmap-hub`

- [x] `RoadmapHubPage.tsx`와 전용 UI lock CSS의 대응을 확인한다.
- [x] 변경 전 1440×733 스크린샷과 계산 스타일을 저장한다.
- [x] 페이지·zoom·히어로·탭·카드·카테고리·스킬 칩의 고정값을 Tailwind arbitrary utility로 옮긴다.
- [x] 대응되는 `.roadmap-hub-page` 고정 CSS와 반응형 규칙만 제거한다.
- [x] 변경 후 계산 스타일과 1440×733 스크린샷을 비교한다.
- [x] 빌드·변경 페이지 린트·diff 검증 결과를 기록한다.

## `/lecture-list`

- [x] `LectureListApp.tsx`와 강의 목록 전용 CSS의 대응을 확인한다.
- [x] 변경 전 1440×900 스크린샷과 계산 스타일을 저장한다.
- [x] 카테고리·mega menu·필터·검색·정렬·zoom 고정값을 Tailwind utility로 이전한다.
- [x] 대응되는 강의 목록 전용 CSS와 반응형 규칙을 제거한다.
- [x] 기본 화면과 mega menu의 변경 전후 계산 스타일을 비교한다.
- [x] 빌드·변경 페이지 린트·diff 검증 결과를 기록한다.

## `/course-detail`

- [x] `CourseDetailApp.tsx`와 강의 상세 전용 CSS의 대응을 확인한다.
- [x] 변경 전 1440×900 기본 화면과 Q&A 탭 스크린샷 및 계산 스타일을 저장한다.
- [x] hero badge·tab·카드·accordion·Q&A·zoom 고정값을 Tailwind utility로 이전한다.
- [x] 대응되는 강의 상세 전용 CSS와 반응형 규칙을 제거한다.
- [x] 기본 화면과 Q&A 탭의 변경 전후 계산 스타일을 비교한다.
- [x] 빌드·변경 페이지 린트·diff 검증 결과를 기록한다.

## `/community-lounge`

- [x] `CommunityLoungeApp.tsx`와 커뮤니티 라운지 전용 UI lock CSS의 대응을 확인한다.
- [x] 변경 전 동일 viewport의 기본 화면과 생성 모달 스크린샷 및 계산 스타일을 저장한다.
- [x] 문서 높이·스크롤·타이포그래피·검색 입력·생성 폼 고정값을 Tailwind utility로 이전한다.
- [x] 대응하는 `.community-lounge-page` 및 body 고정 CSS를 `index.css`에서 제거한다.
- [x] 변경 후 계산 스타일과 스크린샷을 비교하고 차이를 보정한다.
- [x] 빌드·대상 페이지 린트·diff 검증 결과를 기록한다.

## `/workspace-hub`

- [x] `WorkspaceHubApp.tsx`, `ProjectCreateApp.tsx`와 워크스페이스 허브 전용 UI lock CSS의 대응을 확인한다.
- [x] 변경 전 동일 viewport의 기본 화면과 설정·멤버·프로젝트 생성 모달 스크린샷 및 계산 스타일을 저장한다.
- [x] 필터·생성 버튼·설정·멤버 모달 고정값을 `WorkspaceHubApp.tsx`의 Tailwind utility로 이전한다.
- [x] 재사용 프로젝트 생성 패널 고정값을 `ProjectCreateApp.tsx`의 Tailwind utility로 이전한다.
- [x] 대응하는 워크스페이스 허브와 프로젝트 생성 패널 CSS를 `index.css`에서 제거한다.
- [x] 변경 후 계산 스타일과 스크린샷을 비교하고 차이를 보정한다.
- [x] 빌드·두 대상 파일 린트·diff 검증 결과를 기록한다.

## `/mentoring-hub`

- [x] `MentoringHubApp.tsx`와 멘토링 허브 전용 CSS의 대응을 확인한다.
- [x] 변경 전 동일 viewport 기본 화면과 상세 모달의 스크린샷 및 계산 스타일을 저장한다.
- [x] 문서 높이·zoom·chip·검색·필터·카드·모달 고정값을 Tailwind utility로 이전한다.
- [x] 대응되는 멘토링 허브 전용 CSS를 제거한다.
- [x] 기본 화면과 상세 모달의 변경 전후 계산 스타일을 비교한다.
- [x] 빌드·변경 페이지 린트·diff 검증 결과를 기록한다.

## `/learning`

- [x] `LearningPlayerApp.tsx`와 `.learning-player-surface` 전용 UI lock CSS의 대응을 확인한다.
- [x] 변경 전 동일한 1440×900 viewport에서 기본·Q&A·질문 모달·노트 상태의 스크린샷과 계산 스타일을 저장한다.
- [x] 플레이어·탭·노트·Q&A·과제 결과 고정값을 `LearningPlayerApp.tsx`의 Tailwind utility로 이전한다.
- [x] 대응하는 `.learning-player-surface` 전용 UI lock CSS를 `index.css`에서 제거한다.
- [x] 변경 전후 계산 스타일과 스크린샷을 비교하고 차이를 보정한다.
- [x] 빌드·대상 파일 린트·diff 검증 결과를 기록한다.

## `/job-matching`

- [x] `JobMatchingApp.tsx`와 `.job-matching-page` 및 로더 전용 CSS의 대응을 확인한다.
- [x] 변경 전 동일한 1440×900 viewport의 스크린샷과 계산 스타일을 저장한다.
- [x] 기본 타이포그래피·폼·매칭 행·로더 고정값을 `JobMatchingApp.tsx`의 Tailwind utility로 이전한다.
- [x] 대응하는 직무 매칭 전용 CSS를 `index.css`에서 제거한다.
- [x] 변경 전후 계산 스타일과 스크린샷을 비교하고 차이를 보정한다.
- [x] 빌드·대상 파일 린트·diff 검증 결과를 기록한다.

## `/roadmap`

- [x] `RoadmapDetailPage.tsx`와 변경 노드·추천 분기 전용 강제 CSS의 대응을 확인한다.
- [x] 변경 전 동일한 viewport의 스크린샷과 계산 스타일을 저장한다.
- [x] 추가·수정·삭제·순서변경 및 추천 분기 노드 고정값을 Tailwind utility로 이전한다.
- [x] 대응하는 변경 노드 전용 CSS를 `index.css`에서 제거한다.
- [x] 변경 전후 계산 스타일과 스크린샷을 비교하고 차이를 보정한다.
- [x] 빌드·대상 파일 린트·diff 검증 결과를 기록한다.

## `/instructor-channel`, `/instructor-profile`

- [x] 두 라우트가 공유하는 `InstructorChannelApp.tsx`와 zoom CSS의 대응을 확인한다.
- [x] 변경 전 동일한 viewport의 스크린샷과 계산 스타일을 두 라우트에서 저장한다.
- [x] 데스크톱 0.9 zoom과 모바일 원복값을 Tailwind utility로 이전한다.
- [x] 대응하는 `instructor-channel-body-zoom` CSS를 `index.css`에서 제거한다.
- [x] 변경 전후 계산 스타일과 스크린샷을 두 라우트에서 비교한다.
- [x] 빌드·대상 파일 린트·diff 검증 결과를 기록한다.

## 전역 스크롤바

- [x] 모든 라우트의 공통 진입점과 최종 `*::-webkit-scrollbar` 고정 블록을 확인한다.
- [x] 대표 학습자 페이지의 변경 전 1440×900 스크린샷과 scrollbar 계산 스타일을 저장한다.
- [x] 5px 크기·버튼 제거·트랙·썸·hover·corner 값을 공통 Tailwind utility로 이전한다.
- [x] 대응하는 최종 전역 scrollbar override를 `index.css`에서 제거한다.
- [x] 대표 페이지의 변경 전후 계산 스타일과 스크린샷을 비교한다.
- [x] 빌드·대상 파일 린트·diff 검증 결과를 기록한다.

## 스쿼드 공통, `/squad-dashboard`

- [x] `.squad-dashboard-page` 공통 규칙과 공유 컴포넌트·대시보드 전용 사용처를 구분한다.
- [x] 실제 workspace로 변경 전 1440×900 화면과 계산 스타일을 저장한다.
- [x] 문서 잠금과 공통 사이드바 값을 각 Squad 페이지·공유 컴포넌트에 이전한다.
- [x] 대시보드 카드·버튼·일정·공지·애니메이션 값을 `SquadDashboardApp.tsx`에 이전한다.
- [x] 대응하는 `squad-dashboard` 공통 CSS를 `index.css`에서 제거한다.
- [x] 대표 스쿼드 페이지 전후 화면·빌드·대상 린트·diff를 검증한다.

## `/squad-workspace`

- [x] `.squad-workspace-page` 전용 규칙과 `SquadWorkspaceApp.tsx` 사용처를 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 화면과 작업 모달을 저장한다.
- [x] 칸반 카드·필터·빈 열·추가 버튼·작업 모달 값을 Tailwind utility로 이전한다.
- [x] 대응하는 `.squad-workspace-page` CSS를 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·빌드·대상 린트·diff를 검증한다.

## `/squad-review`

- [x] `.squad-review-page` 전용 규칙과 `SquadReviewApp.tsx` 사용처를 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 리뷰 상세 화면과 생성 모달을 저장한다.
- [x] 리뷰 카드·상단 버튼·탭·diff·AI 제목·생성 모달 값을 Tailwind utility로 이전한다.
- [x] 대응하는 `.squad-review-page` CSS를 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·빌드·대상 린트·diff를 검증한다.

## `/squad-erd`

- [x] `.squad-erd-page` 전용 규칙을 툴바·캔버스·테이블·컬럼·모달 영역으로 분류한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 화면과 주요 편집 상태를 저장한다.
- [x] ERD 화면의 고정값을 `SquadErdApp.tsx`의 Tailwind utility로 이전한다.
- [x] 대응하는 `.squad-erd-page` CSS를 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·빌드·대상 린트·diff를 검증한다.

## `/squad-schedule`

- [x] `.squad-schedule-page` 전용 규칙을 툴바·캘린더·일정 pill·마감 카드·모달 영역으로 분류한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 화면과 일정 생성 모달을 저장한다.
- [x] 일정 화면의 고정값을 `SquadScheduleApp.tsx`의 Tailwind utility로 이전한다.
- [x] 대응하는 `.squad-schedule-page` CSS를 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·빌드·대상 린트·diff를 검증한다.

## `/squad-files`

- [x] `.squad-files-page` 전용 규칙과 `SquadFilesApp.tsx` 사용처를 툴바·목록·미리보기·업로드·새 폴더 영역으로 분류한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 화면과 미리보기·업로드·새 폴더 모달을 저장한다.
- [x] 자료실 화면의 고정값을 `SquadFilesApp.tsx`의 Tailwind utility로 이전한다.
- [x] 대응하는 `.squad-files-page` CSS를 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·diff를 검증한다.

## `/squad-meeting`

- [x] `.squad-meeting-page` 전용 규칙을 대기실·참가자 stage·하단 제어바·우측 패널·화면 공유·오디오 설정 영역으로 분류한다.
- [x] 실제 workspace의 변경 전 1440×900 대기실·오디오 설정·회의실 화면을 저장한다.
- [x] 회의 화면의 고정값과 상태 스타일을 `SquadMeetingApp.tsx`의 Tailwind utility로 이전한다.
- [x] 대응하는 `.squad-meeting-page` CSS를 `index.css`에서 제거하고 필요한 keyframes만 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·diff를 검증한다.

## `/squad-settings`

- [x] `.squad-settings-page` 전용 규칙을 메뉴·카드·폼·통합·위험 영역으로 분류한다.
- [x] 실제 workspace의 변경 전 1440×900 기본·통합·위험 탭을 저장한다.
- [x] 설정 화면의 고정값과 상태 스타일을 `SquadSettingsApp.tsx`의 Tailwind utility로 이전한다.
- [x] 대응하는 `.squad-settings-page` CSS를 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·diff를 검증한다.

## 팀 워크스페이스 공통, `/team-ws-dashboard`

- [x] `.team-ws-dashboard-page` 공통 규칙과 대시보드 전용 버튼·카드 사용처를 분리한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 화면과 사이드바 hover 상태를 저장한다.
- [x] 문서 잠금·색상 토큰·사이드바·헤더·스크롤바·공통 패널 값을 공유 Tailwind utility로 이전한다.
- [x] 대시보드 전용 카드와 버튼 값을 `TeamWorkspaceDashboardApp.tsx`에 이전한다.
- [x] 대응하는 `.team-ws-dashboard-page` 공통 CSS를 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·diff를 검증한다.

## `/team-ws-milestone`

- [x] `.team-ws-milestone-page` 전용 week tab 기본·active·hover 규칙과 사용처를 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 화면과 비활성 week tab hover 상태를 저장한다.
- [x] week tab의 원본 cursor·transition·색상·글자 굵기·border 값을 Tailwind utility로 이전한다.
- [x] 대응하는 `.team-ws-milestone-page` CSS를 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·diff를 검증한다.

## Team Workspace Suite 공통, `/team-ws-kanban`

- [x] Suite 공통 모달 기본 규칙과 칸반 카드·필터·검색·작업 모달 규칙을 실제 마크업에 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 기본·카드 hover·작업 모달 상태를 저장한다.
- [x] 공통 모달과 칸반 화면의 원본 고정값을 Tailwind arbitrary utility로 이전한다.
- [x] 대응하는 공통 모달·칸반 CSS만 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·diff를 검증한다.

## `/team-ws-qna`

- [x] Q&A heading·필터·검색·상태 탭·태그·카드·빈 상태와 질문 작성 모달 규칙을 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 화면과 카드 hover 또는 빈 상태, 질문 작성 모달을 저장한다.
- [x] Q&A 페이지와 672px 질문 작성 모달의 원본 고정값을 Tailwind arbitrary utility로 이전한다.
- [x] 대응하는 Q&A 전용 CSS만 `index.css`에서 제거한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·diff를 검증한다.

## `/team-ws-architecture`

- [x] 아키텍처 탭·변경 이력 timeline과 문서 추가·수정 모달 규칙을 실제 사용처와 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 API 기본 화면·탭 상태·문서 작성 모달을 저장한다.
- [x] 아키텍처 페이지와 672px 문서 모달의 원본 고정값을 Tailwind arbitrary utility로 이전한다.
- [x] architecture 전용 CSS만 `index.css`에서 제거하고 인접한 파일·일정 규칙은 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/team-ws-files`

- [x] 파일 필터 탭·카드 hover·빈 상태·업로드 버튼과 업로드 모달 규칙을 실제 사용처와 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 목록·카드 hover·업로드 모달을 저장한다.
- [x] 파일 페이지와 512px 업로드 모달의 원본 고정값을 Tailwind arbitrary utility로 이전한다.
- [x] 파일 전용 CSS만 `index.css`에서 제거하고 사이에 있는 일정 규칙은 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/team-ws-schedule`

- [x] 캘린더 grid·고정 높이 layout·다가오는 일정 카드와 상세·삭제·완료 모달 규칙을 실제 사용처와 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 기본 캘린더·일정 상세·삭제 확인 모달을 저장한다.
- [x] 데스크톱과 기존 responsive media 값을 포함해 schedule 고정값을 Tailwind arbitrary utility로 이전한다.
- [x] schedule 전용 CSS와 media block만 `index.css`에서 제거하고 다음 meeting 규칙은 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/team-ws-meeting`

- [x] 회의록 작성 버튼·필터·빈 상태·카드와 작성·상세 모달 규칙을 실제 사용처와 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 목록·카드 hover·작성 모달·상세 모달을 저장한다.
- [x] 페이지 내부와 포털 모달의 meeting 고정값을 정확한 Tailwind arbitrary utility로 이전한다.
- [x] meeting 전용 CSS만 `index.css`에서 제거하고 다음 realtime 규칙은 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/team-ws-live-meeting`·`/team-voice-channel`

- [x] 두 realtime 화면의 video·avatar·chat sidebar·control·screen share 규칙을 실제 사용처와 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 live meeting과 voice channel 기본·채팅 닫힘 상태를 저장한다.
- [x] realtime selector의 고정값을 정확한 Tailwind arbitrary utility로 이전한다.
- [x] realtime 전용 selector만 `index.css`에서 제거하고 원본 animation keyframes와 다음 mentoring 경계는 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/mentoring-dashboard`

- [x] mentoring 공용 루트·폰트·색상·sidebar pinned·scroll/container 규칙과 dashboard 전용 hero·카드·버튼·배지 규칙을 실제 사용처와 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 dashboard 기본·알림·DM 모달 상태를 저장하고 sidebar pinned 고정값은 생성 CSS 기준으로 저장한다.
- [x] 공용 shell과 dashboard 고정값을 원래 px·rem·색상·radius 그대로 Tailwind arbitrary utility로 이전한다.
- [x] 공용 shell과 dashboard selector만 `index.css`에서 제거하고 instructor 및 다음 mentoring 페이지 경계는 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/mentoring-workspace`

- [x] workspace root·검색 placeholder·320px kanban column·카드·전용 container 규칙을 실제 사용처와 매핑한다.
- [x] 실제 workspace의 변경 전 1440×900 기본·긴급 필터·새 할 일 모달 상태를 저장한다.
- [x] workspace 고정값을 원래 px·rgba·radius 그대로 Tailwind arbitrary utility로 이전한다.
- [x] workspace selector만 `index.css`에서 제거하고 Q&A·파일 placeholder와 다른 mentoring container 규칙은 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/mentoring-curriculum`

- [x] curriculum 전용 1152px container와 timeline pulse 규칙을 실제 사용처에 매핑한다.
- [x] 실제 workspace의 1440×900 기본 curriculum 화면을 저장하고 컨테이너·timeline 계산 스타일을 기록한다.
- [x] 원래 1152px와 1.8s infinite animation 값을 Tailwind arbitrary utility로 이전한다.
- [x] curriculum selector만 `index.css`에서 제거하고 다음 Q&A·schedule·files·meeting 규칙과 pulse keyframes는 유지한다.
- [x] 변경 전후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/mentoring-qna`

- [x] Q&A 검색 placeholder·1152px container·16px card 규칙을 실제 사용처에 매핑한다.
- [x] 실제 workspace의 1440×900 기본·답변 대기 필터·질문 작성 모달 화면과 계산 스타일을 저장한다.
- [x] 원래 `#9CA3AF`·opacity 1·1152px·16px 값을 Tailwind arbitrary utility로 이전한다.
- [x] Q&A selector만 `index.css`에서 제거하고 파일 placeholder와 schedule·files·meeting container 규칙은 유지한다.
- [x] 변경 전후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/mentoring-schedule`

- [x] schedule 1152px container와 calendar day 우측·하단 경계 규칙을 실제 사용처에 매핑한다.
- [x] 실제 workspace의 1440×900 기본 캘린더와 개인 일정 추가 모달 화면·계산 스타일을 저장한다.
- [x] 원래 1152px와 nth-child border 0 값을 Tailwind arbitrary utility로 이전한다.
- [x] schedule selector와 calendar day selector만 `index.css`에서 제거하고 files·meeting container 및 files 규칙은 유지한다.
- [x] 변경 전후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/mentoring-files`

- [x] files placeholder·1152px container·260px/16px card·20px title 규칙을 실제 사용처에 매핑한다.
- [x] 실제 workspace의 1440×900 기본·외부 링크 필터·파일 모달·링크 모달 화면과 계산 스타일을 저장한다.
- [x] 원래 `#9CA3AF`·opacity 1·1152px·260px·16px·20px 값을 Tailwind arbitrary utility로 이전한다.
- [x] files selector만 `index.css`에서 제거하고 meeting container와 ERD·다음 페이지 규칙은 유지한다.
- [x] 변경 전후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·잔여 selector·diff를 검증한다.

## `/mentoring-meeting`

- [x] meeting 전용 CSS와 실제 회의 목록·회의록 상세 모달 사용처를 확인한다.
- [x] 실제 workspaceId로 1440×900 기본 화면과 회의록 상세 모달의 변경 전 스크린샷·계산 스타일을 저장한다.
- [x] 원래 1152px 컨테이너 값을 이미 보존하는 공통 Tailwind arbitrary utility로 이관 상태를 확정한다.
- [x] meeting 전용 selector만 `index.css`에서 제거하고 ERD 경계는 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·selector·diff를 검증한다.

## `/mentoring-live-meeting`

- [x] 실제 컴포넌트와 `index.css`를 대조해 전용 UI lock selector가 없음을 확인한다.
- [x] 공통 mentoring 잠금은 앞선 dashboard 단위의 Tailwind utility가 적용되고, 라이브 룸 자체 치수는 TSX Tailwind utility로 선언되어 있음을 확인한다.
- [x] 제거하거나 이전할 전용 CSS가 없으므로 기능·마크업·스타일을 변경하지 않고 다음 실제 잠금 단위로 넘긴다.

## `/mentoring-erd`

- [x] ERD scroll/container·컬럼 편집기·관계선·anchor·cardinality·선택 상태 규칙을 실제 사용처에 매핑한다.
- [x] 실제 workspaceId의 1440×900 빈 화면과 로컬 테이블·관계선 상태의 변경 전 스크린샷·계산 스타일을 저장한다.
- [x] 원래 px·rgba·색상·shadow·radius·transition 값을 Tailwind arbitrary utility로 정확히 이전한다.
- [x] ERD 전용 selector만 `index.css`에서 제거하고 timeline keyframes와 이후 media 경계는 유지한다.
- [x] 변경 후 화면·계산 스타일·스크린샷·빌드·대상 파일 lint·selector·diff를 검증한다.
