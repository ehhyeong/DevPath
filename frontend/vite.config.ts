import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget = 'http://localhost:8083'

const proxyToBackend = {
  target: backendTarget,
  changeOrigin: true,
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        home: resolve(__dirname, 'home.html'),
        login: resolve(__dirname, 'login.html'),
        singup: resolve(__dirname, 'singup.html'),
        signup: resolve(__dirname, 'signup.html'),
        oauthRedirect: resolve(__dirname, 'oauth2/redirect.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': proxyToBackend,
      '/oauth2': proxyToBackend,
      '/login/oauth2': proxyToBackend,
      '/swagger-ui': proxyToBackend,
      '/v3/api-docs': proxyToBackend,
      '/swagger-resources': proxyToBackend,
      '/webjars': proxyToBackend,
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
})
