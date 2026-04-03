# DevPath Frontend

React, TypeScript, Tailwind CSS, Nginx 기준으로 바로 시작할 수 있게 만든 프런트엔드 시작 프로젝트입니다.

## Stack

- React 19
- TypeScript 5
- Vite 8
- Tailwind CSS 4
- Nginx

## Local Run

```bash
cd frontend
npm install
npm run dev
```

기본 개발 서버는 `http://localhost:5173` 에서 열립니다.

`/api` 요청은 `http://localhost:8083` 으로 프록시되도록 설정해뒀습니다.

## Build

```bash
cd frontend
npm run build
```

빌드 결과물은 `frontend/dist` 에 생성됩니다.

## Nginx Deploy

```bash
cd frontend
docker build -t devpath-frontend .
docker run --rm -p 8080:80 devpath-frontend
```

Nginx 설정은 `frontend/nginx/default.conf` 에 있습니다. SPA 라우팅을 위해 `try_files $uri $uri/ /index.html;` 를 사용합니다.

## First Files To Edit

- `src/App.tsx`
- `src/index.css`
- `vite.config.ts`
- `nginx/default.conf`
