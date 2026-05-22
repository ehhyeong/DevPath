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
        login: resolve(__dirname, 'login.html'),
        singup: resolve(__dirname, 'singup.html'),
        signup: resolve(__dirname, 'signup.html'),
        oauthRedirect: resolve(__dirname, 'oauth2/redirect.html'),
        adminDashboard: resolve(__dirname, 'admin-dashboard.html'),
        roadmap: resolve(__dirname, 'roadmap.html'),
        survey: resolve(__dirname, 'survey.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        instructorDashboard: resolve(__dirname, 'instructor-dashboard.html'),
        instructorQna: resolve(__dirname, 'instructor-qna.html'),
        instructorRevenue: resolve(__dirname, 'instructor-revenue.html'),
        studentAnalytics: resolve(__dirname, 'student-analytics.html'),
        courseManagement: resolve(__dirname, 'course-management.html'),
        instructorCourseDetail: resolve(__dirname, 'instructor-course-detail.html'),
        courseEditor: resolve(__dirname, 'course-editor.html'),
        quizCreator: resolve(__dirname, 'quiz-creator.html'),
        contentAssignmentEditor: resolve(__dirname, 'content-assignment-editor.html'),
        instructorMentoring: resolve(__dirname, 'instructor-mentoring.html'),
        instructorMarketing: resolve(__dirname, 'instructor-marketing.html'),
        instructorReviews: resolve(__dirname, 'instructor-reviews.html'),
        instructorProfile: resolve(__dirname, 'instructor-profile.html'),
        instructorEditProfile: resolve(__dirname, 'instructor-edit-profile.html'),
        myLearning: resolve(__dirname, 'my-learning.html'),
        purchase: resolve(__dirname, 'purchase.html'),
        myPosts: resolve(__dirname, 'my-posts.html'),
        profile: resolve(__dirname, 'profile.html'),
        settings: resolve(__dirname, 'settings.html'),
        learningLogGallery: resolve(__dirname, 'learning-log-gallery.html'),
        myRoadmap: resolve(__dirname, 'my-roadmap.html'),
        loungeDashboard: resolve(__dirname, 'lounge-dashboard.html'),
        communityLounge: resolve(__dirname, 'community-lounge.html'),
        mentoringHub: resolve(__dirname, 'mentoring-hub.html'),
        workspaceHub: resolve(__dirname, 'workspace-hub.html'),
        devShowcase: resolve(__dirname, 'dev-showcase.html'),
        projectCreate: resolve(__dirname, 'project-create.html'),
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
