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
            '실제 운영 환경과 유사한 주문, 재고, 쿠폰 시나리오를 구현하며 백엔드 구조를 점검합니다.',
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
            '기획부터 배포까지 하나의 블로그 플랫폼을 완성하며 App Router와 SEO를 실습합니다.',
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
            '사용자 로그를 수집하고 추천 API까지 연결하는 과정을 데이터 관점에서 멘토링합니다.',
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
            '앱스토어 등록을 목표로 화면, 인증, 푸시, QA 체크리스트까지 같이 완성합니다.',
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
            'EKS, GitHub Actions, 모니터링 대시보드를 팀 단위로 구성합니다.',
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
            '문제 정의, 사용자 인터뷰, 지표 설계 문서를 한 번에 포트폴리오로 정리합니다.',
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
            '기존 컴포넌트를 접근성 기준으로 점검하고 재사용 가능한 UI 문서로 정리합니다.',
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
