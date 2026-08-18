SELECT
    title,
    lounge_type,
    deadline_after_days,
    max_members,
    tags,
    roles,
    description,
    leader_email,
    member_emails,
    views,
    closed
FROM (
    VALUES
        (
            1, 'AI 코드 리뷰 대시보드 같이 만들 팀원 모집', 'PROJECT', 10, 5,
            'React,Spring Boot,PostgreSQL,OpenAI', 'Frontend,Backend,UI/UX,QA',
            '[프로젝트 핵심 목표 (한줄 소개)]
- GPT 기반 코드 리뷰 결과를 팀 대시보드에서 모아보고, 리뷰 히스토리를 포트폴리오로 연결하는 MVP를 만듭니다.

[상세 기획 및 주요 기능]
- GitHub PR URL 등록 및 리뷰 상태 보드
- 리뷰 코멘트 요약, 위험도 태그, 재검토 체크리스트
- 팀원별 담당 영역과 진행률을 한 화면에서 확인

[모집 역할 및 진행 방식]
- Frontend 1명, Backend 1명, UI/UX 1명
- 주 2회 온라인 스탠드업, GitHub Projects로 태스크 관리',
            'lounge.ai@devpath.com', 'lounge.frontend@devpath.com,lounge.backend@devpath.com', 236::bigint, FALSE
        ),
        (
            2, '취준생 포트폴리오 PDF 자동 생성 MVP', 'PROJECT', 16, 4,
            'Java,PDF,React,Portfolio', 'Backend,Frontend,Product',
            '[프로젝트 핵심 목표 (한줄 소개)]
- 학습 기록과 프로젝트 경험을 입력하면 깔끔한 PDF 포트폴리오로 변환하는 서비스를 만듭니다.

[상세 기획 및 주요 기능]
- 경력/프로젝트/기술스택 입력 폼
- PDF 미리보기와 버전 저장
- 공개 링크와 다운로드 이력 관리

[모집 역할 및 진행 방식]
- Backend 1명, Frontend 1명, Product 1명
- 2주 단위 스프린트로 MVP 범위를 작게 고정합니다.',
            'lounge.pm@devpath.com', 'lounge.backend@devpath.com,lounge.designer@devpath.com', 184::bigint, FALSE
        ),
        (
            3, '스터디 인증 기반 루틴 앱 사이드 프로젝트', 'PROJECT', 21, 6,
            'Kotlin,Spring,Routine,Mobile', 'Mobile,Backend,Designer,Planner',
            '[프로젝트 핵심 목표 (한줄 소개)]
- 매일 공부 인증을 올리고 팀원이 서로 리마인드하는 작은 루틴 앱을 만듭니다.

[상세 기획 및 주요 기능]
- 오늘의 인증 카드와 연속 달성 streak
- 팀별 피드, 알림, 주간 회고
- 실패 후 회복 플랜 자동 생성

[모집 역할 및 진행 방식]
- Mobile 1명, Backend 1명, Designer 1명
- 평일 밤 30분 싱크, 주말 2시간 구현 세션으로 진행합니다.',
            'lounge.mobile@devpath.com', 'lounge.devops@devpath.com,lounge.designer@devpath.com', 142::bigint, FALSE
        ),
        (
            4, '오픈소스 이슈 트래커 리디자인 팀', 'PROJECT', 4, 3,
            'Open Source,Design System,Accessibility', 'Frontend,Designer',
            '[프로젝트 핵심 목표 (한줄 소개)]
- 작은 오픈소스 프로젝트의 이슈 목록과 라벨링 화면을 접근성 기준으로 다시 설계합니다.

[상세 기획 및 주요 기능]
- 이슈 리스트 밀도 조정
- 라벨/필터/상태 전환 UX 정리
- Lighthouse 접근성 점수 개선

[모집 역할 및 진행 방식]
- 디자인 시스템 경험자와 프론트엔드 1명씩 모집합니다.
- 첫 버전은 닫힌 모집으로 남겨 카드 상태를 확인할 수 있게 둡니다.',
            'lounge.designer@devpath.com', 'lounge.frontend@devpath.com', 98::bigint, TRUE
        ),
        (
            5, 'React/Next 프론트엔드 포지션 찾습니다', 'JOIN_WISH', 12, 1,
            'React,Next.js,TypeScript,Tailwind', NULL,
            '[자기소개]
- 보유 기술: React, Next.js, TypeScript, Tailwind
- 가능 시간: 평일 20:00 이후, 주말 오후

[희망 프로젝트]
- 사용자 화면이 명확하고 4주 안에 데모를 낼 수 있는 프로젝트에 합류하고 싶습니다.',
            'lounge.frontend@devpath.com', NULL, 121::bigint, FALSE
        ),
        (
            6, 'Spring Boot 백엔드로 합류하고 싶습니다', 'JOIN_WISH', 18, 1,
            'Spring Boot,JPA,Redis,PostgreSQL', NULL,
            '[자기소개]
- 보유 기술: Spring Boot, JPA, Redis, PostgreSQL
- 가능 시간: 월/수/금 21:00 이후, 토요일 오전

[희망 프로젝트]
- API 설계와 DB 모델링이 필요한 팀에 들어가서 인증, 알림, 검색 파트를 맡고 싶습니다.',
            'lounge.backend@devpath.com', NULL, 164::bigint, FALSE
        ),
        (
            7, '데이터 분석/시각화 파트 참여 희망', 'JOIN_WISH', 24, 1,
            'Python,SQL,Dashboard,Chart', NULL,
            '[자기소개]
- 보유 기술: Python, SQL, Pandas, Chart.js
- 가능 시간: 평일 점심/저녁, 일요일 오후

[희망 프로젝트]
- 사용자 행동 로그나 학습 지표를 시각화하는 프로젝트에 데이터 파트로 합류하고 싶습니다.',
            'lounge.data@devpath.com', NULL, 89::bigint, FALSE
        ),
        (
            8, 'CS 면접 운영체제 스터디 4주 집중반', 'STUDY', 7, 6,
            'CS,OS,Interview', NULL,
            '[스터디 목표]
- 운영체제 핵심 주제를 면접 답변 단위로 정리합니다.
- 진행 시간: 화/목 21:00, 4주

[모집 대상]
- CS 기본기는 있으나 답변 구조화가 필요한 주니어/취준생',
            'lounge.mentor@devpath.com',
            'lounge.backend@devpath.com,lounge.frontend@devpath.com,lounge.data@devpath.com', 207::bigint, FALSE
        ),
        (
            9, 'JPA 성능 튜닝 실전 스터디', 'STUDY', 13, 5,
            'JPA,SQL,Performance,Hibernate', NULL,
            '[스터디 목표]
- N+1, 페치 조인, 인덱스, 트랜잭션 격리를 실제 예제로 정리합니다.
- 진행 시간: 수요일 22:00, 일요일 10:00

[모집 대상]
- JPA를 써봤지만 쿼리 튜닝 경험을 더 만들고 싶은 백엔드 개발자',
            'lounge.devops@devpath.com', 'lounge.backend@devpath.com,lounge.ai@devpath.com', 173::bigint, FALSE
        ),
        (
            10, '알고리즘 문제풀이 평일 밤 스터디', 'STUDY', 5, 8,
            'Algorithm,Java,Python,Coding Test', NULL,
            '[스터디 목표]
- 구현, 그래프, DP를 주제별로 풀고 풀이 설명까지 연습합니다.
- 진행 시간: 월/수/금 22:30, 3주

[모집 대상]
- 코딩 테스트 루틴이 필요하고 매일 1문제씩 풀 수 있는 사람',
            'lounge.frontend@devpath.com', 'lounge.mobile@devpath.com,lounge.pm@devpath.com', 154::bigint, FALSE
        ),
        (
            11, '주니어 백엔드 코드리뷰 번개', 'NETWORKING', 9, 10,
            'Code Review,Backend,PR', NULL,
            '[모임 주제]
- 주니어 백엔드 코드 리뷰 문화와 PR 피드백 루틴을 나눕니다.
- 일시 및 장소: 5월 24일 일요일 14:00, 강남역 근처',
            'lounge.mentor@devpath.com', 'lounge.backend@devpath.com,lounge.devops@devpath.com', 118::bigint, FALSE
        ),
        (
            12, '사이드 프로젝트 회고 네트워킹', 'NETWORKING', 15, 12,
            'Retrospective,Product,Team', NULL,
            '[모임 주제]
- 사이드 프로젝트를 끝까지 가져가기 위해 팀 운영, 범위 조절, 회고 방식을 공유합니다.
- 일시 및 장소: 5월 30일 토요일 19:00, 온라인 디스코드',
            'lounge.pm@devpath.com',
            'lounge.designer@devpath.com,lounge.ai@devpath.com,lounge.mobile@devpath.com', 132::bigint, FALSE
        ),
        (
            13, 'AI 제품 빌더 커피챗', 'NETWORKING', 26, 8,
            'AI Product,Prompt,MVP', NULL,
            '[모임 주제]
- 작은 AI 기능을 제품으로 묶을 때 필요한 문제 정의, 프롬프트 실험, 비용 감각을 이야기합니다.
- 일시 및 장소: 6월 7일 일요일 15:00, 판교역 카페',
            'lounge.ai@devpath.com', 'lounge.pm@devpath.com,lounge.data@devpath.com', 99::bigint, FALSE
        )
) AS seed(
    sort_order, title, lounge_type, deadline_after_days, max_members,
    tags, roles, description, leader_email, member_emails, views, closed
)
ORDER BY sort_order;
