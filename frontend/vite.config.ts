import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget =
  process.env.VITE_BACKEND_TARGET?.trim() || 'http://localhost:8083'

const proxyToBackend = {
  target: backendTarget,
  changeOrigin: true,
} as const

// 모든 화면은 index.html 단일 엔트리에서 경로별 React 앱으로 로드한다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Mermaid ships one optional parser module that Rolldown cannot split further.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 8084,
    proxy: {
      '/api': proxyToBackend,
      '/login/oauth2': proxyToBackend,
      '/swagger-ui': proxyToBackend,
      '/v3/api-docs': proxyToBackend,
      '/swagger-resources': proxyToBackend,
      '/webjars': proxyToBackend,
      '/uploads': proxyToBackend,
      '/ws': {
        ...proxyToBackend,
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    port: 8084,
  },
})
