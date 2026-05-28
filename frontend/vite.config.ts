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

// 관리자 대시보드를 별도 엔트리 HTML로 같이 빌드한다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 8084,
    proxy: {
      '/api': proxyToBackend,
      '/oauth2': proxyToBackend,
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
