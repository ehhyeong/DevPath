<div align="center">
  <img src="frontend/src/assets/hero.png" width="220" alt="DevPath hero asset" />

  <h1>DevPath</h1>
  <p><strong>개발자의 학습, 프로젝트, 커리어 성장을 하나로 잇는 성장 플랫폼</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Java-21-007396?style=flat-square&logo=openjdk&logoColor=white" alt="Java 21" />
    <img src="https://img.shields.io/badge/Spring%20Boot-4.0.3-6DB33F?style=flat-square&logo=springboot&logoColor=white" alt="Spring Boot 4.0.3" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111111" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
    <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 15" />
    <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis 7" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose" />
  </p>
</div>

---

## About

DevPath는 개발자를 위한 커리어 성장 플랫폼입니다.
사용자는 로드맵으로 학습 방향을 잡고, 강의와 실습을 진행하며, 팀 워크스페이스와 멘토링을 통해 프로젝트 경험을 쌓을 수 있습니다.
관리자는 콘텐츠, 강의, 로드맵, 커뮤니티, 정산, 신고 처리를 한 곳에서 운영할 수 있습니다.

이 레포지토리는 Spring Boot 백엔드, Vite React 프론트엔드, Python OCR 서버, Docker Compose 인프라 구성을 함께 포함합니다.

## Deployment

| 구분 | 주소 |
| --- | --- |
| 서비스 URL | [https://devpath.kr](https://devpath.kr) |

## Highlights

| 영역 | 제공 기능 |
| --- | --- |
| 학습자 | 맞춤 로드맵, 강의 탐색, 학습 플레이어, 퀴즈와 과제, 학습 로그 |
| 강사 | 강의 관리, 과제와 퀴즈 편집, 수강생 분석, Q&A, 멘토링, 수익 관리 |
| 프로젝트 | 팀 워크스페이스, 칸반, 일정, 파일, 회의, ERD, 코드 리뷰, 음성 채널 |
| 커리어 | 채용 분석, 이력서, 포트폴리오, Proof Card, 쇼케이스 |
| 커뮤니티 | 라운지, 게시글, 댓글, 좋아요, 멘토링 허브 |
| 운영 | 관리자 대시보드, 계정 관리, 로드맵 거버넌스, 신고 처리, 공지, 정산 |
| AI/OCR | AI 코드 리뷰, AI 디자인 리뷰, 영상 학습 OCR, EasyOCR 서버 연동 |

## Architecture

```mermaid
flowchart LR
    U[User Browser] --> F[Vite React Frontend]
    F -->|/api, /ws proxy| B[Spring Boot API]
    B --> P[(PostgreSQL)]
    B --> R[(Redis)]
    B --> O[Python OCR Server]
    B --> X[External APIs]
    O --> E[EasyOCR]
```

## Tech Stack

| 구분 | 기술 |
| --- | --- |
| Backend | Java 21, Spring Boot 4, Spring Web MVC, Spring Security, OAuth2 Client, JWT, JPA |
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, Axios, Chart.js |
| Database | PostgreSQL 15, Redis 7 |
| AI/OCR | Gemini API 연동, Flask, EasyOCR, OpenCV, Tesseract.js |
| Docs | Springdoc OpenAPI, Swagger UI |
| Infra | Docker, Docker Compose, Nginx |
| Quality | JUnit Platform, H2 테스트 런타임, Spotless, ESLint |

## Quick Start

### 1. 사전 준비

- JDK 21
- Node.js 20 이상
- Docker Desktop 또는 Docker Compose
- PostgreSQL과 Redis를 직접 띄우거나 Docker Compose 사용

### 2. 환경 변수 준비

실제 `.env` 값은 공개 저장소에 올리면 안 됩니다.
README에는 필요한 키를 알려주는 예시만 둡니다.
팀에서 공유하는 실제 값은 비공개 채널, 시크릿 관리 도구, 배포 환경 변수로 관리합니다.

```properties
SERVER_PORT=8083

DB_HOST=localhost
DB_PORT=5432
DB_NAME=<database-name>
DB_USER=<database-user>
DB_PASSWORD=<database-password>

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

JWT_SECRET=<base64-hmac-secret>

GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>

DEVPATH_OAUTH2_REDIRECT_URL=http://localhost:8084/oauth2/redirect
DEVPATH_OAUTH2_ALLOWED_ORIGINS=http://localhost:8084
DEVPATH_CORS_ALLOWED_ORIGINS=http://localhost:8084
DEVPATH_REQUIRE_HTTPS=false

OCR_SERVER_URL=http://localhost:5000
GEMINI_API_KEY=<gemini-api-key>
```

### 3. 인프라 실행

```bash
docker compose up -d postgres redis ocr-server
```

### 4. 백엔드 실행

```bash
./gradlew bootRun
```

Windows PowerShell에서는 아래 명령을 사용할 수 있습니다.

```powershell
.\gradlew.bat bootRun
```

### 5. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

## Local URLs

| 서비스 | 주소 |
| --- | --- |
| Frontend | http://localhost:8084 |
| Backend API | http://localhost:8083 |
| Swagger UI | http://localhost:8083/swagger-ui/index.html |
| OCR Server | http://localhost:5000/health |

## Docker Compose

개발용 프론트엔드까지 한 번에 띄우려면 루트에서 실행합니다.

```bash
docker compose up -d --build
```

정적 Nginx 프론트엔드 이미지를 확인하려면 `frontend-static` 프로필을 사용합니다.

```bash
docker compose --profile frontend-static up -d --build frontend
```

## Project Structure

```text
DevPath
├─ src/main/java/com/devpath
│  ├─ api              # 도메인별 REST API, 서비스, DTO, 엔티티
│  └─ DevPathApplication.java
├─ src/main/resources
│  ├─ application.yaml # 공통 설정과 환경 변수 매핑
│  └─ db               # 로컬과 레거시 SQL 리소스
├─ frontend
│  ├─ src              # React 페이지, 컴포넌트, API 클라이언트
│  ├─ public           # 정적 리소스
│  └─ nginx            # 정적 배포용 Nginx 설정
├─ ocr-server          # Flask + EasyOCR 기반 OCR 서버
├─ docs                # 협업 문서
└─ docker-compose.yml  # 로컬 개발 인프라
```

## Main Pages

| 경로 | 화면 |
| --- | --- |
| `/` 또는 `/home` | 서비스 홈 |
| `/roadmap-hub` | 로드맵 허브 |
| `/lecture-list` | 강의 목록 |
| `/learning` | 학습 플레이어 |
| `/workspace-hub` | 워크스페이스 허브 |
| `/team-ws-dashboard` | 팀 워크스페이스 |
| `/mentoring-hub` | 멘토링 허브 |
| `/job-matching` | 채용 분석 |
| `/community-list` | 커뮤니티 |
| `/admin-dashboard` | 관리자 대시보드 |

## API Docs

백엔드 실행 후 Swagger UI에서 API를 확인할 수 있습니다.

```text
http://localhost:8083/swagger-ui/index.html
```

Vite 개발 서버에서는 프록시가 설정되어 있어 `/api`, `/ws`, `/swagger-ui`, `/v3/api-docs`, `/uploads` 요청이 백엔드로 전달됩니다.

## Team

| 이름 | GitHub |
| --- | --- |
| 김용하 | [@yongha03](https://github.com/yongha03) |
| 김태형 | [@ehhyeong](https://github.com/ehhyeong) |
| 박주승 | [@ParkJus](https://github.com/ParkJus) |

## Development Commands

| 작업 | 명령 |
| --- | --- |
| 백엔드 테스트 | `.\gradlew.bat test` |
| 백엔드 포맷 | `.\gradlew.bat spotlessApply` |
| 프론트엔드 개발 서버 | `cd frontend && npm run dev` |
| 프론트엔드 빌드 | `cd frontend && npm run build` |
| 프론트엔드 린트 | `cd frontend && npm run lint` |

## Notes

- 루트 README는 전체 프로젝트 소개를 담당합니다.
- 프론트엔드 전용 실행 설명은 [frontend/README.md](frontend/README.md)에 정리되어 있습니다.
- 민감한 키, OAuth Secret, DB 비밀번호, Redis 비밀번호, AI API 키는 README나 커밋 기록에 남기지 않습니다.
