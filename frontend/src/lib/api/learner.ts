import type { CourseEnrollResponse, CourseListItem, CourseReview, CourseWishlistMutationResponse } from '../../types/course'
import type { CourseCatalogMenu } from '../../types/course-catalog'
import type { AssignmentPrecheckRequest, AssignmentPrecheckResponse, AssignmentSubmissionResponse, CreateSubmissionRequest, LearningCourseDetail, LearningLessonProgress, LearningPlayerConfig, QuizAttemptResultResponse, SubmissionHistoryResponse, SubmitQuizAttemptRequest, TimestampNote, TimestampNotePayload } from '../../types/learning'
import type { CertificateDetail, CertificateDownloadHistoryDetail, CertificatePdfDetail, CommunityComment, DashboardMentoring, DashboardStudyGroup, DashboardSummary, Enrollment, GrowthRecommendation, GrowthRecommendationAddResult, HeatmapEntry, LearningHistoryDetail, LearningHistorySummary, NotificationItem, PostPage, ProofCardDetail, ProofCardGalleryItem, ProofCardSummary, RefundItem, WorkspaceHubProject, WishlistCourse } from '../../types/learner'
import type { CreateQnaAnswerRequest, CreateQnaQuestionRequest, QnaAnswer, QnaQuestionDetail, QnaQuestionSummary, QnaQuestionTemplate } from '../../types/qna'
import { invalidateRequestCache,request,buildQueryString } from './client'

const accountCache = (key: string, ttlMs = 30_000) => ({
  auth: true,
  cache: { key: `account:${key}`, ttlMs },
}) as const

export const dashboardApi = {
  getSummary(signal?: AbortSignal) {
    return request<DashboardSummary>('/api/me/dashboard/summary', { method: 'GET', signal }, accountCache('dashboard-summary'))
  },
  getHeatmap(signal?: AbortSignal) {
    return request<HeatmapEntry[]>('/api/me/dashboard/heatmap', { method: 'GET', signal }, accountCache('dashboard-heatmap'))
  },
  getStudyGroup(signal?: AbortSignal) {
    return request<DashboardStudyGroup>(
      '/api/me/dashboard/study-group',
      { method: 'GET', signal },
      accountCache('dashboard-study-group'),
    )
  },
  getMentoring(signal?: AbortSignal) {
    return request<DashboardMentoring>(
      '/api/me/dashboard/mentoring',
      { method: 'GET', signal },
      accountCache('dashboard-mentoring'),
    )
  },
  getGrowthRecommendation(signal?: AbortSignal) {
    return request<GrowthRecommendation>(
      '/api/me/dashboard/growth-recommendation',
      { method: 'GET', signal },
      accountCache('dashboard-growth'),
    )
  },
  async addGrowthRecommendationNode(nodeId: number) {
    const result = await request<GrowthRecommendationAddResult>(
      `/api/me/dashboard/growth-recommendation/nodes/${nodeId}/add-to-roadmap`,
      { method: 'POST' },
      { auth: true },
    )
    invalidateRequestCache('account:dashboard-growth')
    return result
  },
}

export const workspaceHubApi = {
  getProjects(signal?: AbortSignal) {
    return request<WorkspaceHubProject[]>(
      '/api/workspaces/hub/projects',
      { method: 'GET', signal },
      accountCache('workspace-projects'),
    )
  },
}

export const enrollmentApi = {
  async enroll(courseId: number) {
    const result = await request<CourseEnrollResponse>(
      '/api/me/enrollments',
      {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      },
      { auth: true },
    )
    invalidateRequestCache('account:enrollments', 'account:dashboard-summary')
    return result
  },
  getMyEnrollments(signal?: AbortSignal) {
    return request<Enrollment[]>('/api/me/enrollments', { method: 'GET', signal }, accountCache('enrollments'))
  },
}

export const courseApi = {
  getCourses(signal?: AbortSignal) {
    return request<CourseListItem[]>('/api/courses', { method: 'GET', signal }, { auth: true })
  },
  getCatalogMenu(signal?: AbortSignal) {
    return request<CourseCatalogMenu>('/api/courses/catalog-menu', { method: 'GET', signal })
  },
  getCourseDetail(courseId: number, signal?: AbortSignal) {
    return request<LearningCourseDetail>(`/api/courses/${courseId}`, { method: 'GET', signal }, { auth: true })
  },
}

export const lessonSessionApi = {
  startSession(lessonId: number, signal?: AbortSignal) {
    return request<LearningLessonProgress>(
      `/api/learning/sessions/${lessonId}/start`,
      { method: 'POST', signal },
      { auth: true },
    )
  },
  getProgress(lessonId: number, signal?: AbortSignal) {
    return request<LearningLessonProgress>(
      `/api/learning/sessions/${lessonId}/progress`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  saveProgress(lessonId: number, payload: { progressPercent: number; progressSeconds: number }) {
    return request<LearningLessonProgress>(
      `/api/learning/sessions/${lessonId}/progress`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
}

export const learningPlayerApi = {
  getPlayerConfig(lessonId: number, signal?: AbortSignal) {
    return request<LearningPlayerConfig>(
      `/api/learning/player/${lessonId}/config`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  updatePlaybackRate(lessonId: number, defaultPlaybackRate: number) {
    return request<LearningPlayerConfig>(
      `/api/learning/player/${lessonId}/config`,
      {
        method: 'PUT',
        body: JSON.stringify({ defaultPlaybackRate }),
      },
      { auth: true },
    )
  },
  updatePipMode(lessonId: number, pipEnabled: boolean) {
    return request<LearningPlayerConfig>(
      `/api/learning/player/${lessonId}/config/pip`,
      {
        method: 'PATCH',
        body: JSON.stringify({ pipEnabled }),
      },
      { auth: true },
    )
  },
}

export const lessonNoteApi = {
  getNotes(lessonId: number, signal?: AbortSignal) {
    return request<TimestampNote[]>(
      `/api/learning/lessons/${lessonId}/notes`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  createNote(lessonId: number, payload: TimestampNotePayload) {
    return request<TimestampNote>(
      `/api/learning/lessons/${lessonId}/notes`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updateNote(lessonId: number, noteId: number, payload: TimestampNotePayload) {
    return request<TimestampNote>(
      `/api/learning/lessons/${lessonId}/notes/${noteId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  deleteNote(lessonId: number, noteId: number) {
    return request<void>(
      `/api/learning/lessons/${lessonId}/notes/${noteId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
}

export const learnerAssignmentApi = {
  precheck(assignmentId: number, userId: number, payload: AssignmentPrecheckRequest) {
    return request<AssignmentPrecheckResponse>(
      `/api/evaluation/learner/assignments/${assignmentId}/precheck${buildQueryString({ userId })}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  submit(assignmentId: number, userId: number, payload: CreateSubmissionRequest) {
    return request<AssignmentSubmissionResponse>(
      `/api/evaluation/learner/assignments/${assignmentId}/submissions${buildQueryString({ userId })}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  getSubmissionHistory(userId: number, signal?: AbortSignal) {
    return request<SubmissionHistoryResponse>(
      `/api/evaluation/learner/assignments/submissions/history${buildQueryString({ userId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
}

export const learnerQuizApi = {
  submitAttempt(quizId: number, userId: number, payload: SubmitQuizAttemptRequest) {
    return request<QuizAttemptResultResponse>(
      `/api/evaluation/learner/quizzes/${quizId}/attempts${buildQueryString({ userId })}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  getAttemptResult(attemptId: number, userId: number, signal?: AbortSignal) {
    return request<QuizAttemptResultResponse>(
      `/api/evaluation/learner/quizzes/attempts/${attemptId}/result${buildQueryString({ userId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
}

export const learningHistoryApi = {
  getDetail(signal?: AbortSignal) {
    return request<LearningHistoryDetail>(
      '/api/me/learning-histories',
      { method: 'GET', signal },
      accountCache('learning-history-detail'),
    )
  },
  getSummary(signal?: AbortSignal) {
    return request<LearningHistorySummary>(
      '/api/me/learning-histories/summary',
      { method: 'GET', signal },
      accountCache('learning-history-summary'),
    )
  },
}

export const nodeClearanceApi = {
  recalculate(roadmapId: number, nodeIds?: number[]) {
    return request<void>(
      '/api/me/node-clearances/recalculate',
      { method: 'POST', body: JSON.stringify({ roadmapId, nodeIds }) },
      { auth: true },
    )
  },
  recalculateByCourse(courseId: number) {
    return request<void>(
      '/api/me/node-clearances/recalculate-by-course',
      { method: 'POST', body: JSON.stringify({ courseId }) },
      { auth: true },
    )
  },
}

export const proofCardApi = {
  getCards(signal?: AbortSignal) {
    return request<ProofCardSummary[]>('/api/me/proof-cards', { method: 'GET', signal }, accountCache('proof-cards'))
  },
  getCard(proofCardId: number, signal?: AbortSignal) {
    return request<ProofCardDetail>(
      `/api/me/proof-cards/${proofCardId}`,
      { method: 'GET', signal },
      accountCache(`proof-card-${proofCardId}`),
    )
  },
  getGallery(signal?: AbortSignal) {
    return request<ProofCardGalleryItem[]>(
      '/api/me/proof-cards/gallery',
      { method: 'GET', signal },
      accountCache('proof-card-gallery'),
    )
  },
}

export const certificateApi = {
  issue(proofCardId: number) {
    return request<CertificateDetail>(
      `/api/certificates/proof-cards/${proofCardId}`,
      { method: 'POST' },
      { auth: true },
    )
  },
  generatePdf(proofCardId: number) {
    return request<CertificatePdfDetail>(
      `/api/certificates/proof-cards/${proofCardId}/pdf`,
      { method: 'POST' },
      { auth: true },
    )
  },
  recordDownload(certificateId: number, reason: string) {
    return request<CertificateDownloadHistoryDetail>(
      `/api/certificates/${certificateId}/downloads`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      { auth: true },
    )
  },
}

export const wishlistApi = {
  async addCourse(courseId: number) {
    const result = await request<CourseWishlistMutationResponse>(
      `/api/me/wishlist/courses/${courseId}`,
      { method: 'POST' },
      { auth: true },
    )
    invalidateRequestCache('account:wishlist')
    return result
  },
  async removeCourse(courseId: number) {
    const result = await request<CourseWishlistMutationResponse>(
      `/api/me/wishlist/courses/${courseId}`,
      { method: 'DELETE' },
      { auth: true },
    )
    invalidateRequestCache('account:wishlist')
    return result
  },
  getCourses(signal?: AbortSignal) {
    return request<WishlistCourse[]>(
      '/api/me/wishlist/courses',
      { method: 'GET', signal },
      accountCache('wishlist'),
    )
  },
}

export const notificationApi = {
  getMine(signal?: AbortSignal) {
    return request<NotificationItem[]>('/api/notifications', { method: 'GET', signal }, accountCache('notifications'))
  },
  async markAsRead(notificationId: number) {
    const result = await request<void>(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }, { auth: true })
    invalidateRequestCache('account:notifications')
    return result
  },
}

export const refundApi = {
  getMine(signal?: AbortSignal) {
    return request<RefundItem[]>('/api/refunds/me', { method: 'GET', signal }, accountCache('refunds'))
  },
}

export const communityApi = {
  searchPosts(
    params: {
      category?: string
      authorId?: number
      keyword?: string
      sort?: string
      page?: number
      size?: number
    },
    signal?: AbortSignal,
  ) {
    return request<PostPage>(
      `/api/posts${buildQueryString(params)}`,
      { method: 'GET', signal },
      { auth: false },
    )
  },
  getComments(postId: number, signal?: AbortSignal) {
    return request<CommunityComment[]>(
      `/api/posts/${postId}/comments`,
      { method: 'GET', signal },
      { auth: false },
    )
  },
}

export const reviewApi = {
  getByCourse(courseId: number, signal?: AbortSignal) {
    return request<CourseReview[]>(
      `/api/reviews${buildQueryString({ courseId })}`,
      { method: 'GET', signal },
      { auth: false },
    )
  },
}

export const qnaApi = {
  getQuestions(courseId?: number, signal?: AbortSignal) {
    return request<QnaQuestionSummary[]>(
      `/api/qna/questions${buildQueryString({ courseId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getMyQuestions(courseId?: number, signal?: AbortSignal) {
    return request<QnaQuestionSummary[]>(
      `/api/qna/questions${buildQueryString({ courseId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getQuestionDetail(questionId: number, signal?: AbortSignal) {
    return request<QnaQuestionDetail>(
      `/api/qna/questions/${questionId}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getTemplates(signal?: AbortSignal) {
    return request<QnaQuestionTemplate[]>(
      '/api/qna/templates',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  createQuestion(payload: CreateQnaQuestionRequest, userId?: number | null) {
    return request<QnaQuestionDetail>(
      `/api/qna/questions${buildQueryString({ userId })}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  createAnswer(questionId: number, payload: CreateQnaAnswerRequest) {
    return request<QnaAnswer>(
      `/api/qna/questions/${questionId}/answers`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
}
