SELECT
    mentor_email,
    mentor_name,
    mentor_bio,
    mentor_profile_image,
    title,
    content,
    category,
    mentoring_type,
    required_stacks,
    curriculum,
    CURRENT_DATE + deadline_offset_days AS deadline_at,
    duration_weeks,
    current_participants,
    max_participants,
    closed
FROM (
    VALUES
        (
            1, 'mentor.backend@devpath.com', '김도윤',
            '대용량 트래픽과 결제 도메인을 다뤄 온 백엔드 리드입니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-backend',
            '대용량 이커머스 주문 서버 멘토링',
            '실제 운영 환경과 유사한 주문, 재고, 쿠폰 시나리오를 구현하며 백엔드 구조를 점검합니다.

## 참여 대상
기본 CRUD API를 만들어 봤으며 주문 처리의 동시성과 트랜잭션 설계를 경험하고 싶은 백엔드 학습자를 모집합니다.

## 준비 지식
Java와 Spring Boot, JPA의 기본 사용법 및 SQL 조회가 가능해야 합니다. Git으로 실습 코드를 관리하고 PR을 작성할 수 있으면 좋습니다.

## 진행 및 피드백 방식
4주 동안 각자 주문 서버를 구현하고 주차별 PR을 제출합니다. 멘토와 함께 테스트 결과를 검토하며 재고 차감, 중복 결제 방지, 메시지 처리 구조를 개선합니다.

## 최종 결과물
주문·재고·쿠폰 API와 ERD, API 명세서를 완성합니다. 동시성 테스트와 부하 테스트 결과를 정리해 개선 전후를 비교한 보고서를 남깁니다.',
            'Backend', 'study', 'Spring Boot, Redis, Kafka, PostgreSQL',
            '요구사항 분석과 ERD 설계' || CHR(10) || '주문, 결제, 재고 핵심 API 구현' || CHR(10) ||
                'Redis와 Kafka를 활용한 트래픽 분산' || CHR(10) || '부하 테스트와 병목 지점 리팩터링',
            14, 4, 5, 10, FALSE
        ),
        (
            2, 'mentor.frontend@devpath.com', '이서연',
            '프로덕트 UI와 Next.js 성능 최적화를 함께 보는 프론트엔드 멘토입니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-frontend',
            'Next.js 블로그 플랫폼 팀 프로젝트',
            '기획부터 배포까지 하나의 블로그 플랫폼을 완성하며 App Router와 SEO를 실습합니다.

## 참여 대상
React로 화면을 구현해 봤으며 팀 협업을 통해 배포 가능한 Next.js 프로젝트를 완성하고 싶은 프론트엔드 학습자를 모집합니다.

## 준비 지식
React 컴포넌트와 상태 관리, TypeScript 기초를 이해해야 합니다. Git 브랜치와 PR을 사용한 협업 경험이 있으면 좋습니다.

## 진행 및 피드백 방식
4주 동안 에디터, 게시글 화면, 공통 UI를 나눠 구현합니다. 매주 기능을 통합해 시연하고 멘토의 PR 리뷰를 바탕으로 라우팅, 검색 노출, 화면 성능을 개선합니다.

## 최종 결과물
마크다운 작성과 게시글 조회, 다크 모드를 지원하는 반응형 블로그를 배포합니다. SEO 메타데이터와 공통 컴포넌트 문서, 배포 주소 및 성능 측정 결과를 정리합니다.',
            'Frontend', 'team', 'React, Next.js, TypeScript, Tailwind',
            'App Router 구조와 라우팅 설계' || CHR(10) || '마크다운 에디터와 게시글 상세 구현' || CHR(10) ||
                '디자인 시스템과 다크 모드 적용' || CHR(10) || 'Vercel 배포와 성능 측정',
            3, 4, 3, 4, FALSE
        ),
        (
            3, 'mentor.data@devpath.com', '박지민',
            '추천 시스템과 데이터 파이프라인을 실무 기준으로 리뷰합니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-data',
            '추천 시스템 데이터 파이프라인',
            '사용자 로그를 수집하고 추천 API까지 연결하는 과정을 데이터 관점에서 멘토링합니다.

## 참여 대상
Python 데이터 분석 경험을 추천 모델과 서비스 API 구현으로 확장하고 싶은 학습자를 모집합니다.

## 준비 지식
Python으로 표 형태의 데이터를 다루고 기본적인 전처리를 할 수 있어야 합니다. HTTP 요청과 응답, 머신러닝 학습·평가의 기본 흐름을 알고 있으면 좋습니다.

## 진행 및 피드백 방식
5주 동안 실습용 사용자 로그로 수집 스키마부터 추천 API까지 단계별로 구현합니다. 각자 실험 노트와 코드를 제출하고 멘토와 모델 평가 지표, 데이터 누수 여부, API 응답을 검토합니다.

## 최종 결과물
로그 스키마와 전처리 코드, 추천 모델 비교 실험 기록을 완성합니다. FastAPI 추천 엔드포인트와 Docker 실행 환경, 간단한 모니터링 구성을 함께 정리합니다.',
            'AI', 'study', 'Python, FastAPI, Scikit-learn, Docker',
            '로그 수집 스키마와 저장 전략' || CHR(10) || '추천 후보군 생성과 모델 실험' || CHR(10) ||
                'FastAPI 기반 추천 API 구현' || CHR(10) || 'Docker 배포와 간단한 모니터링',
            20, 5, 2, 6, FALSE
        ),
        (
            4, 'mentor.mobile@devpath.com', '한유라',
            'React Native와 출시 품질 관리 경험이 많은 모바일 멘토입니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-mobile',
            'React Native 출시형 사이드 프로젝트',
            '앱스토어 등록을 목표로 화면, 인증, 푸시, QA 체크리스트까지 같이 완성합니다.

## 참여 대상
React 경험을 모바일 앱 개발로 확장하고 실제 기기에서 동작하는 앱을 팀으로 완성하고 싶은 학습자를 모집합니다.

## 준비 지식
JavaScript 비동기 처리와 React 컴포넌트 기초를 이해해야 합니다. Expo 개발 환경과 테스트용 모바일 기기를 준비하고 Firebase 프로젝트를 설정할 수 있으면 좋습니다.

## 진행 및 피드백 방식
5주 동안 화면, 인증, 푸시 알림, QA 역할을 나눠 구현합니다. 매주 실제 기기로 핵심 기능을 시연하고 PR 리뷰와 오류 재현 기록을 바탕으로 출시 준비 상태를 점검합니다.

## 최종 결과물
로그인과 푸시 알림을 갖춘 Expo 앱과 기기 테스트 결과를 완성합니다. QA 체크리스트, 앱 소개와 스크린샷 등 스토어 제출 자료를 준비하며 심사 승인 여부는 보장하지 않습니다.',
            'App', 'team', 'React Native, Expo, Firebase',
            '아이디어 스코프와 와이어프레임 정리' || CHR(10) || 'Expo 기반 핵심 화면 구현' || CHR(10) ||
                'Firebase Auth와 Push 연동' || CHR(10) || 'QA와 스토어 제출 준비',
            9, 5, 4, 5, FALSE
        ),
        (
            5, 'mentor.devops@devpath.com', '강현우',
            'AWS, Kubernetes, 관측성 설계를 팀 단위로 코칭합니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-devops',
            'AWS와 Kubernetes 무중단 배포 실습',
            'EKS, GitHub Actions, 모니터링 대시보드를 팀 단위로 구성합니다.

## 참여 대상
Docker로 애플리케이션을 실행해 봤으며 팀 단위로 배포 자동화와 운영 환경을 구축하고 싶은 학습자를 모집합니다.

## 준비 지식
Linux 기본 명령과 Docker 이미지, YAML 설정 파일을 이해해야 합니다. AWS 실습 계정과 권한을 준비하고 실습 자원의 비용 및 종료 방법을 확인해야 합니다.

## 진행 및 피드백 방식
6주 동안 인프라, CI/CD, 모니터링 역할을 나눠 구성합니다. 설정 변경은 PR로 검토하고 멘토와 배포·롤백 시연, 장애 상황의 지표 확인 과정을 반복 점검합니다.

## 최종 결과물
Kubernetes 배포 설정과 GitHub Actions 워크플로, Grafana 대시보드를 완성합니다. 배포·롤백 절차와 실습 자원 정리 방법을 담은 운영 문서를 남깁니다.',
            'DevOps', 'team', 'AWS, Kubernetes, GitHub Actions, Grafana',
            'EKS 클러스터와 네트워크 기본 구성' || CHR(10) || 'Deployment, Service, Ingress 설정' || CHR(10) ||
                'CI/CD 파이프라인 자동화' || CHR(10) || 'Prometheus와 Grafana 대시보드 구성',
            7, 6, 3, 6, FALSE
        ),
        (
            6, 'mentor.product@devpath.com', '최민서',
            '기획, 지표, 협업 문서를 결과물 중심으로 다듬는 PM 멘토입니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-product',
            'PM 포트폴리오용 문제 정의 스터디',
            '문제 정의, 사용자 인터뷰, 지표 설계 문서를 한 번에 포트폴리오로 정리합니다.

## 참여 대상
아이디어를 사용자 문제와 검증 계획으로 구체화해 PM 포트폴리오를 만들고 싶은 학습자를 모집합니다.

## 준비 지식
관찰한 사용자 문제나 개선하고 싶은 서비스 사례를 하나 준비해 주세요. 문서와 표로 조사 내용을 정리할 수 있으면 참여할 수 있으며 개발 경험은 필수가 아닙니다.

## 진행 및 피드백 방식
3주 동안 각자의 주제로 문제 정의, 인터뷰 질문, 핵심 지표를 작성합니다. 매주 문서를 공유하고 멘토와 가설의 근거, 질문의 편향, 지표 측정 가능성을 검토합니다.

## 최종 결과물
문제 정의서와 사용자 인터뷰 정리, 핵심 지표 및 실험 계획을 완성합니다. 의사결정의 근거와 피드백 반영 과정을 연결한 포트폴리오 문서를 남깁니다.',
            'PM', 'study', 'Product, UX Research, Metrics',
            '문제 정의와 가설 정리' || CHR(10) || '사용자 인터뷰 질문지 리뷰' || CHR(10) ||
                '핵심 지표와 실험 설계' || CHR(10) || '포트폴리오 문서 피드백',
            12, 3, 6, 8, FALSE
        ),
        (
            7, 'mentor.frontend@devpath.com', '이서연',
            '프로덕트 UI와 Next.js 성능 최적화를 함께 보는 프론트엔드 멘토입니다.',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-frontend',
            '디자인 시스템 접근성 리디자인',
            '기존 컴포넌트를 접근성 기준으로 점검하고 재사용 가능한 UI 문서로 정리합니다.

## 참여 대상
기존 UI의 사용성을 개선하고 접근성 점검과 디자인 시스템 문서화를 경험하고 싶은 프론트엔드·UI 학습자를 모집합니다.

## 준비 지식
HTML 의미 구조와 CSS, React 컴포넌트 기초를 이해해야 합니다. Storybook으로 컴포넌트 사례를 작성해 본 경험이 있으면 좋습니다.

## 진행 및 피드백 방식
4주 동안 컴포넌트 조사, 키보드 탐색·명도 대비 점검, 문서화 역할을 나눠 진행합니다. 매주 개선 전후를 시연하고 멘토의 리뷰를 바탕으로 동작과 사용 지침을 보완합니다.

## 최종 결과물
접근성을 개선한 UI 컴포넌트와 Storybook 사례, 점검 체크리스트를 완성합니다. 발견한 문제와 수정 근거, 개선 전후 비교를 담은 접근성 보고서를 정리합니다.',
            'Design', 'team', 'Design System, Accessibility, Storybook',
            '컴포넌트 인벤토리 작성' || CHR(10) || '키보드 탐색과 명도 대비 점검' || CHR(10) ||
                'Storybook 문서화' || CHR(10) || '접근성 리포트 작성',
            -1, 4, 5, 5, TRUE
        )
) AS seed(
    sort_order, mentor_email, mentor_name, mentor_bio, mentor_profile_image,
    title, content, category, mentoring_type, required_stacks, curriculum,
    deadline_offset_days, duration_weeks, current_participants, max_participants, closed
)
ORDER BY sort_order;
