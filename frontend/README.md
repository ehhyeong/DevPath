# DevPath Frontend

DevPath의 Vite 기반 React 프론트엔드입니다.
학습자, 강사, 관리자, 팀 워크스페이스, 멘토링, 커뮤니티, 채용 분석 화면을 제공합니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| UI | React 19 |
| Language | TypeScript 5.9 |
| Build | Vite 8 |
| Style | Tailwind CSS 4 |
| HTTP | Axios |
| Chart | Chart.js |
| OCR | Tesseract.js |
| Static Deploy | Nginx |

## 로컬 실행

프론트엔드만 로컬에서 실행할 때 사용합니다.

```bash
cd frontend
npm install
npm run dev
```

개발 서버 주소는 `http://localhost:8084`입니다.
Vite 개발 서버는 `/api`, `/ws`, `/login/oauth2`, `/swagger-ui`, `/v3/api-docs`, `/uploads` 요청을 백엔드로 프록시합니다.
기본 백엔드 대상은 `http://localhost:8083`입니다.

백엔드 주소를 바꿔야 할 때는 `VITE_BACKEND_TARGET`을 설정합니다.

```bash
VITE_BACKEND_TARGET=http://localhost:8083 npm run dev
```

PowerShell에서는 아래처럼 설정합니다.

```powershell
$env:VITE_BACKEND_TARGET="http://localhost:8083"
npm run dev
```

## Docker 개발 모드

프로젝트 루트에서 실행합니다.

```bash
docker compose up -d
```

`frontend-dev` 서비스가 Vite 개발 서버를 실행합니다.

| 항목 | 내용 |
| --- | --- |
| 접속 주소 | `http://localhost:8084` |
| 변경 반영 | Vite 개발 서버를 통해 즉시 반영 |
| 백엔드 프록시 | `http://host.docker.internal:8083` |

정적 Nginx 이미지를 확인할 때만 `frontend-static` 프로필의 `frontend` 서비스를 사용합니다.

## 정적 빌드

```bash
cd frontend
npm run build
```

빌드 결과물은 `frontend/dist`에 생성됩니다.

## Nginx 정적 배포 확인

```bash
cd frontend
docker build -t devpath-frontend .
docker run --rm -p 8084:80 devpath-frontend
```

Nginx 설정 파일은 `frontend/nginx/default.conf`입니다.

## Docker Watch

정적 프론트엔드 이미지를 자동으로 다시 빌드하며 확인할 때 사용합니다.
프로젝트 루트에서 실행합니다.

```bash
docker compose up --build --watch frontend
```

## 주요 파일

| 파일 | 역할 |
| --- | --- |
| `src/main.tsx` | 경로별 React 앱 진입점 |
| `src/App.tsx` | 홈 화면 |
| `src/index.css` | 전역 스타일과 Tailwind 스타일 |
| `vite.config.ts` | Vite 빌드와 개발 서버 프록시 설정 |
| `nginx/default.conf` | 정적 배포용 Nginx 설정 |

## 자주 쓰는 명령

| 작업 | 명령 |
| --- | --- |
| 개발 서버 실행 | `npm run dev` |
| 프로덕션 빌드 | `npm run build` |
| 린트 | `npm run lint` |
| 빌드 결과 미리보기 | `npm run preview` |

## 참고

- 전체 프로젝트 소개와 백엔드 실행 방법은 루트 [README.md](../README.md)에 정리되어 있습니다.
- 실제 API 요청은 백엔드 실행 상태와 `.env` 설정에 따라 달라질 수 있습니다.
