import type { AuthLoginRequest, AuthSignUpRequest, AuthTokenResponse } from '../types/auth'
import type {
  CourseEnrollResponse,
  CourseListItem,
  CourseReview,
  CourseWishlistMutationResponse,
} from '../types/course'
import type { CourseCatalogMenu } from '../types/course-catalog'
import type { RoadmapHubCatalog } from '../types/roadmap-hub'
import type {
  InstructorAnalyticsDashboard,
  InstructorAnnouncementDetail,
  InstructorAnnouncementSummary,
  InstructorChannel,
  InstructorConversionSummary,
  InstructorCouponItem,
  InstructorCourseListItem,
  InstructorMentoringBoard,
  InstructorNotificationItem,
  InstructorQnaAnswer,
  InstructorQnaDraft,
  InstructorQnaInboxItem,
  InstructorQnaTemplate,
  InstructorQnaTimeline,
  InstructorRevenueSummary,
  InstructorRevenueTransaction,
  InstructorReviewHelpful,
  InstructorReviewListItem,
  InstructorReviewReply,
  InstructorReviewSummary,
  InstructorReviewTemplate,
  InstructorSettlementItem,
  InstructorSubscriptionResponse,
  InstructorPromotionItem,
} from '../types/instructor'
import type {
  ApiResponse,
  HomeOverview,
} from '../types/home'
import type {
  AssignmentPrecheckRequest,
  AssignmentPrecheckResponse,
  AssignmentSubmissionResponse,
  CreateSubmissionRequest,
  LearningCourseDetail,
  LearningLessonProgress,
  LearningPlayerConfig,
  QuizAttemptResultResponse,
  SubmissionHistoryResponse,
  SubmitQuizAttemptRequest,
  TimestampNote,
  TimestampNotePayload,
} from '../types/learning'
import type {
  CertificateDetail,
  CertificateDownloadHistoryDetail,
  CertificatePdfDetail,
  CommunityComment,
  DashboardMentoring,
  DashboardStudyGroup,
  DashboardSummary,
  Enrollment,
  GrowthRecommendation,
  GrowthRecommendationAddResult,
  HeatmapEntry,
  LearningHistoryDetail,
  LearningHistorySummary,
  NotificationItem,
  PostPage,
  ProofCardDetail,
  ProofCardGalleryItem,
  ProofCardSummary,
  RefundItem,
  TechTag,
  UserPasswordChangeRequest,
  UserProfile,
  UserProfileUpdateRequest,
  WorkspaceHubProject,
  WishlistCourse,
} from '../types/learner'
import { expireStoredAuthSession, refreshStoredAuthSession } from './auth-session'
import type {
  OfficialRoadmapDetail,
  RoadmapDetail,
  MyRoadmapSummary,
  RecommendationChange,
  RecommendationChangeHistory,
} from '../types/roadmap'
import type {
  GenerateInstructorQuizRequest,
  InstructorAssignmentEditor,
  InstructorQuizEditor,
  SaveInstructorAssignmentEditorRequest,
  SaveInstructorQuizEditorRequest,
} from '../types/instructor-evaluation'
import type {
  CreateQnaAnswerRequest,
  CreateQnaQuestionRequest,
  QnaAnswer,
  QnaQuestionDetail,
  QnaQuestionSummary,
  QnaQuestionTemplate,
} from '../types/qna'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

type RequestOptions = {
  auth?: boolean
}

export interface InstructorUploadedAsset {
  url: string
  assetKey: string
  originalFileName: string
  storedFileName: string
  contentType: string | null
  fileSize: number
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null
}

function formatRevenueMonthLabel(value: string) {
  const [, month] = value.split('-')
  const parsedMonth = Number(month)

  if (!Number.isFinite(parsedMonth)) {
    return value
  }

  return `${parsedMonth}월`
}

function normalizeRevenueTransaction(raw: unknown): InstructorRevenueTransaction {
  const record = (raw ?? {}) as Record<string, unknown>
  const settlementId = toNumber(record.settlementId ?? record.id)
  const courseId = record.courseId === null || record.courseId === undefined
    ? null
    : toNumber(record.courseId)
  const legacyAmount = toNumber(record.amount)
  const grossAmount = toNumber(record.grossAmount, legacyAmount)
  const feeAmount = toNumber(record.feeAmount, Math.max(grossAmount - legacyAmount, 0))
  const netAmount = toNumber(record.netAmount, legacyAmount)
  const courseTitle = typeof record.courseTitle === 'string' && record.courseTitle.trim().length > 0
    ? record.courseTitle
    : courseId !== null
      ? `강의 #${courseId}`
      : `정산 #${settlementId}`

  return {
    settlementId,
    courseId,
    courseTitle,
    grossAmount,
    feeAmount,
    netAmount,
    purchasedAt: toStringOrNull(record.purchasedAt),
    settledAt: toStringOrNull(record.settledAt),
    status: typeof record.status === 'string' ? record.status : 'PENDING',
  }
}

function normalizeRevenueSummary(raw: unknown): InstructorRevenueSummary {
  const record = (raw ?? {}) as Record<string, unknown>
  const monthlyTrend = Array.isArray(record.monthlyTrend)
    ? record.monthlyTrend.map((item) => {
      const monthlyRecord = (item ?? {}) as Record<string, unknown>
      const key = typeof monthlyRecord.key === 'string' ? monthlyRecord.key : ''

      return {
        key,
        label: typeof monthlyRecord.label === 'string' ? monthlyRecord.label : formatRevenueMonthLabel(key),
        amount: toNumber(monthlyRecord.amount),
        current: Boolean(monthlyRecord.current),
      }
    })
    : []
  const courseBreakdown = Array.isArray(record.courseBreakdown)
    ? record.courseBreakdown.map((item) => {
      const breakdownRecord = (item ?? {}) as Record<string, unknown>
      const courseId = breakdownRecord.courseId === null || breakdownRecord.courseId === undefined
        ? null
        : toNumber(breakdownRecord.courseId)

      return {
        courseId,
        courseTitle: typeof breakdownRecord.courseTitle === 'string' && breakdownRecord.courseTitle.trim().length > 0
          ? breakdownRecord.courseTitle
          : courseId !== null
            ? `강의 #${courseId}`
            : '미분류 강의',
        amount: toNumber(breakdownRecord.amount),
        percentage: toNumber(breakdownRecord.percentage),
      }
    })
    : []
  const recentTransactions = Array.isArray(record.recentTransactions)
    ? record.recentTransactions.map(normalizeRevenueTransaction)
    : []

  return {
    totalRevenue: toNumber(record.totalRevenue),
    monthlyRevenue: toNumber(record.monthlyRevenue),
    platformFeeRate: toNumber(record.platformFeeRate, 0.2),
    netRevenue: toNumber(record.netRevenue),
    pendingSettlementCount: toNumber(record.pendingSettlementCount),
    heldSettlementCount: toNumber(record.heldSettlementCount),
    completedSettlementCount: toNumber(record.completedSettlementCount),
    pendingSettlementAmount: toNumber(record.pendingSettlementAmount),
    heldSettlementAmount: toNumber(record.heldSettlementAmount),
    monthlyTrend,
    courseBreakdown,
    recentTransactions,
  }
}

function buildQueryString(params: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()

  return query ? `?${query}` : ''
}

function mapReviewReply(raw: {
  replyId?: number
  id?: number
  authorName?: string
  authorProfileImage?: string | null
  content: string
  createdAt: string | null
  updatedAt: string | null
}): InstructorReviewReply {
  return {
    replyId: raw.replyId ?? raw.id ?? 0,
    authorName: raw.authorName ?? '강사',
    authorProfileImage: raw.authorProfileImage ?? null,
    content: raw.content,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

function mapQnaTimeline(raw: {
  question: InstructorQnaInboxItem
  publishedAnswer: InstructorQnaAnswer | null
  draft: InstructorQnaDraft | null
  lectureTitle: string | null
  lectureTimestamp: string | null
}): InstructorQnaTimeline {
  return {
    question: raw.question,
    publishedAnswer: raw.publishedAnswer,
    draft: raw.draft,
    lectureTitle: raw.lectureTitle,
    lectureTimestamp: raw.lectureTimestamp,
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.auth) {
    const session = await refreshStoredAuthSession()

    if (session?.accessToken) {
      headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
    }
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (options.auth && response.status === 401) {
    const refreshedSession = await refreshStoredAuthSession({ force: true }).catch(() => null)

    if (refreshedSession?.accessToken) {
      headers.set('Authorization', `${refreshedSession.tokenType} ${refreshedSession.accessToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
      })

      try {
        payload = (await response.json()) as ApiResponse<T>
      } catch {
        payload = null
      }
    }

    if (response.status === 401) {
      expireStoredAuthSession({ reload: true, force: true })
      throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.')
    }
  }

  if (!response.ok || !payload?.success) {
    const err = new Error(payload?.message ?? `Request failed with status ${response.status}`) as Error & { status: number }
    err.status = response.status
    throw err
  }

  return payload.data
}

export const homeApi = {
  getOverview(signal?: AbortSignal) {
    return request<HomeOverview>('/api/home/overview', { method: 'GET', signal })
  },
}

export const roadmapApi = {
  // 로드맵 허브 공개 화면에서 관리자 저장 결과를 그대로 불러온다.
  getHubCatalog(signal?: AbortSignal) {
    return request<RoadmapHubCatalog>('/api/roadmaps/hub-catalog', { method: 'GET', signal })
  },
  getOfficialRoadmapDetail(roadmapId: number, signal?: AbortSignal) {
    return request<OfficialRoadmapDetail>(`/api/roadmaps/${roadmapId}`, { method: 'GET', signal })
  },
  getMyRoadmaps(signal?: AbortSignal) {
    return request<{ roadmaps: MyRoadmapSummary[] }>('/api/my-roadmaps', { method: 'GET', signal }, { auth: true })
  },
  getMyRoadmapDetail(customRoadmapId: number, signal?: AbortSignal) {
    return request<RoadmapDetail>(`/api/my-roadmaps/${customRoadmapId}`, { method: 'GET', signal }, { auth: true })
  },
  copyRoadmap(originalRoadmapId: number) {
    return request<{ customRoadmapId: number }>(`/api/my-roadmaps/${originalRoadmapId}`, { method: 'POST' }, { auth: true })
  },
  getPendingChanges(roadmapId?: number | null, signal?: AbortSignal) {
    return request<RecommendationChange[]>(
      `/api/me/recommendation-changes${buildQueryString({ roadmapId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getChangeHistories(roadmapId?: number | null, signal?: AbortSignal) {
    return request<RecommendationChangeHistory[]>(
      `/api/me/recommendation-changes/histories${buildQueryString({ roadmapId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  applyChange(changeId: number) {
    return request<RecommendationChange>(`/api/me/recommendation-changes/${changeId}/apply`, { method: 'POST' }, { auth: true })
  },
  ignoreChange(changeId: number) {
    return request<RecommendationChange>(`/api/me/recommendation-changes/${changeId}/ignore`, { method: 'POST' }, { auth: true })
  },
  getProofCards(signal?: AbortSignal) {
    return request<ProofCardSummary[]>('/api/me/proof-cards', { method: 'GET', signal }, { auth: true })
  },
  clearNode(customRoadmapId: number, customNodeId: number) {
    return request<{ customNodeId: number; title: string }>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/clear`,
      { method: 'POST' },
      { auth: true },
    )
  },
  deferNode(customRoadmapId: number, customNodeId: number) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/defer`,
      { method: 'POST' },
      { auth: true },
    )
  },
  undeferNode(customRoadmapId: number, customNodeId: number) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/defer`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
  deleteNode(customRoadmapId: number, customNodeId: number) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },

  // [TEMP] 추천 무료 강좌 courseId 조회 — 임시 하드코딩, 추후 삭제 예정
  getRecommendedFreeCourse(customRoadmapId: number, customNodeId: number) {
    return request<number | null>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/recommended-course`,
      { method: 'GET' },
      { auth: true },
    )
  },
  // [/TEMP]

  renameMyRoadmap(customRoadmapId: number, title: string) {
    return request<MyRoadmapSummary>(
      `/api/my-roadmaps/${customRoadmapId}`,
      { method: 'PATCH', body: JSON.stringify({ title }) },
      { auth: true },
    )
  },
  deleteMyRoadmap(customRoadmapId: number) {
    return request<void>(`/api/my-roadmaps/${customRoadmapId}`, { method: 'DELETE' }, { auth: true })
  },

  // [TEST] 노드 완료 즉시 분기 추천 테스트용 — 실 서비스 전 삭제 대상
  testRunDiagnosis(originalRoadmapId: number, originalNodeId: number) {
    return request<{ score: number; maxScore: number; branchType: string; recommendedNodes: string }>(
      `/api/me/roadmaps/${originalRoadmapId}/diagnosis/test-run?originalNodeId=${originalNodeId}`,
      { method: 'POST' },
      { auth: true },
    )
  },
}

export const authApi = {
  signUp(payload: AuthSignUpRequest) {
    return request<void>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  login(payload: AuthLoginRequest) {
    return request<AuthTokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  logout(refreshToken: string) {
    return request<void>(
      '/api/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      { auth: true },
    )
  },
}

export const dashboardApi = {
  getSummary(signal?: AbortSignal) {
    return request<DashboardSummary>('/api/me/dashboard/summary', { method: 'GET', signal }, { auth: true })
  },
  getHeatmap(signal?: AbortSignal) {
    return request<HeatmapEntry[]>('/api/me/dashboard/heatmap', { method: 'GET', signal }, { auth: true })
  },
  getStudyGroup(signal?: AbortSignal) {
    return request<DashboardStudyGroup>(
      '/api/me/dashboard/study-group',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getMentoring(signal?: AbortSignal) {
    return request<DashboardMentoring>(
      '/api/me/dashboard/mentoring',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getGrowthRecommendation(signal?: AbortSignal) {
    return request<GrowthRecommendation>(
      '/api/me/dashboard/growth-recommendation',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  addGrowthRecommendationNode(nodeId: number) {
    return request<GrowthRecommendationAddResult>(
      `/api/me/dashboard/growth-recommendation/nodes/${nodeId}/add-to-roadmap`,
      { method: 'POST' },
      { auth: true },
    )
  },
}

export const workspaceHubApi = {
  getProjects(signal?: AbortSignal) {
    return request<WorkspaceHubProject[]>(
      '/api/workspaces/hub/projects',
      { method: 'GET', signal },
      { auth: true },
    )
  },
}

export const enrollmentApi = {
  enroll(courseId: number) {
    return request<CourseEnrollResponse>(
      '/api/me/enrollments',
      {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      },
      { auth: true },
    )
  },
  getMyEnrollments(signal?: AbortSignal) {
    return request<Enrollment[]>('/api/me/enrollments', { method: 'GET', signal }, { auth: true })
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
      { auth: true },
    )
  },
  getSummary(signal?: AbortSignal) {
    return request<LearningHistorySummary>(
      '/api/me/learning-histories/summary',
      { method: 'GET', signal },
      { auth: true },
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
    return request<ProofCardSummary[]>('/api/me/proof-cards', { method: 'GET', signal }, { auth: true })
  },
  getCard(proofCardId: number, signal?: AbortSignal) {
    return request<ProofCardDetail>(
      `/api/me/proof-cards/${proofCardId}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getGallery(signal?: AbortSignal) {
    return request<ProofCardGalleryItem[]>(
      '/api/me/proof-cards/gallery',
      { method: 'GET', signal },
      { auth: true },
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
  addCourse(courseId: number) {
    return request<CourseWishlistMutationResponse>(
      `/api/me/wishlist/courses/${courseId}`,
      { method: 'POST' },
      { auth: true },
    )
  },
  removeCourse(courseId: number) {
    return request<CourseWishlistMutationResponse>(
      `/api/me/wishlist/courses/${courseId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
  getCourses(signal?: AbortSignal) {
    return request<WishlistCourse[]>(
      '/api/me/wishlist/courses',
      { method: 'GET', signal },
      { auth: true },
    )
  },
}

export const notificationApi = {
  getMine(signal?: AbortSignal) {
    return request<NotificationItem[]>('/api/notifications', { method: 'GET', signal }, { auth: true })
  },
  markAsRead(notificationId: number) {
    return request<void>(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }, { auth: true })
  },
}

export const refundApi = {
  getMine(signal?: AbortSignal) {
    return request<RefundItem[]>('/api/refunds/me', { method: 'GET', signal }, { auth: true })
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

export const publicInstructorApi = {
  getChannel(instructorId: number, signal?: AbortSignal) {
    return request<InstructorChannel>(
      `/api/instructors/${instructorId}/channel`,
      { method: 'GET', signal },
      { auth: false },
    )
  },
}

export const instructorSubscriptionApi = {
  subscribe(channelId: number) {
    return request<InstructorSubscriptionResponse>(
      '/api/instructor/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify({ channelId }),
      },
      { auth: true },
    )
  },
  unsubscribe(channelId: number) {
    return request<void>(
      `/api/instructor/subscriptions/${channelId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
}

export const instructorNotificationApi = {
  getAll(signal?: AbortSignal) {
    return request<InstructorNotificationItem[]>(
      '/api/instructor/notifications',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  markAsRead(notificationId: number) {
    return request<void>(
      `/api/instructor/notifications/${notificationId}/read`,
      { method: 'PATCH' },
      { auth: true },
    )
  },
}

export const instructorCourseApi = {
  getCourses(signal?: AbortSignal) {
    return request<InstructorCourseListItem[]>(
      '/api/instructor/courses',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getCourseDetail(courseId: number, signal?: AbortSignal) {
    return request<LearningCourseDetail>(
      `/api/instructor/courses/${courseId}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  uploadCourseAsset(file: File, assetType: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('assetType', assetType)

    return request<InstructorUploadedAsset>(
      '/api/instructor/uploads/course-assets',
      {
        method: 'POST',
        body: formData,
      },
      { auth: true },
    )
  },
  createCourse(payload: {
    title: string
    subtitle?: string | null
    description?: string | null
    price: number
    originalPrice?: number | null
    currency: string
    difficultyLevel?: string | null
    language?: string | null
    hasCertificate: boolean
    tagIds: number[]
  }) {
    return request<number>(
      '/api/instructor/courses',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updateCourse(
    courseId: number,
    payload: {
      title: string
      subtitle?: string | null
      description?: string | null
      price: number
      originalPrice?: number | null
      currency: string
      difficultyLevel?: string | null
      language?: string | null
      hasCertificate: boolean
    },
  ) {
    return request<void>(
      `/api/instructor/courses/${courseId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updateCourseStatus(courseId: number, status: string) {
    return request<void>(
      `/api/instructor/courses/${courseId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      { auth: true },
    )
  },
  updateMetadata(
    courseId: number,
    payload: {
      prerequisites?: string[]
      jobRelevance?: string[]
      tagIds: number[]
    },
  ) {
    return request<void>(
      `/api/instructor/courses/${courseId}/metadata`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  replaceObjectives(courseId: number, objectives: string[]) {
    return request<void>(
      `/api/instructor/courses/${courseId}/objectives`,
      {
        method: 'POST',
        body: JSON.stringify({ objectives }),
      },
      { auth: true },
    )
  },
  replaceTargetAudiences(courseId: number, targetAudiences: string[]) {
    return request<void>(
      `/api/instructor/courses/${courseId}/target-audiences`,
      {
        method: 'POST',
        body: JSON.stringify({ targetAudiences }),
      },
      { auth: true },
    )
  },
  replaceInfoSections(
    courseId: number,
    sections: Array<{ sectionKey: string; title: string; items: string[] }>,
  ) {
    return request<void>(
      `/api/instructor/courses/${courseId}/info-sections`,
      {
        method: 'POST',
        body: JSON.stringify({ sections }),
      },
      { auth: true },
    )
  },
  uploadThumbnail(
    courseId: number,
    payload: {
      thumbnailUrl: string
      originalFileName?: string | null
    },
  ) {
    return request<void>(
      `/api/instructor/courses/${courseId}/thumbnail`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  uploadTrailer(
    courseId: number,
    payload: {
      trailerUrl: string
      videoAssetKey?: string | null
      durationSeconds?: number | null
      originalFileName?: string | null
    },
  ) {
    return request<void>(
      `/api/instructor/courses/${courseId}/trailer`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  createSection(
    courseId: number,
    payload: {
      title: string
      description?: string | null
      orderIndex: number
      isPublished: boolean
    },
  ) {
    return request<number>(
      `/api/instructor/courses/${courseId}/sections`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updateSection(
    sectionId: number,
    payload: {
      title: string
      description?: string | null
      orderIndex: number
      isPublished: boolean
    },
  ) {
    return request<void>(
      `/api/instructor/sections/${sectionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  deleteSection(sectionId: number) {
    return request<void>(
      `/api/instructor/sections/${sectionId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
  createLesson(
    sectionId: number,
    payload: {
      title: string
      description?: string | null
      lessonType: string
      videoId?: string | null
      videoUrl?: string | null
      videoProvider?: string | null
      thumbnailUrl?: string | null
      durationSeconds?: number | null
      orderIndex: number
      isPreview: boolean
      isPublished: boolean
    },
  ) {
    return request<number>(
      `/api/instructor/sections/${sectionId}/lessons`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updateLesson(
    lessonId: number,
    payload: {
      title: string
      description?: string | null
      lessonType: string
      videoId?: string | null
      videoUrl?: string | null
      videoProvider?: string | null
      thumbnailUrl?: string | null
      durationSeconds?: number | null
      isPreview: boolean
      isPublished: boolean
    },
  ) {
    return request<void>(
      `/api/instructor/lessons/${lessonId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updateLessonPrerequisites(lessonId: number, prerequisiteLessonIds: number[]) {
    return request<void>(
      `/api/instructor/lessons/${lessonId}/prerequisites`,
      {
        method: 'PUT',
        body: JSON.stringify({ prerequisiteLessonIds }),
      },
      { auth: true },
    )
  },
  deleteLesson(lessonId: number) {
    return request<void>(
      `/api/instructor/lessons/${lessonId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
  updateLessonOrder(payload: {
    sectionId: number
    lessonOrders: Array<{
      lessonId: number
      orderIndex: number
    }>
  }) {
    return request<void>(
      '/api/instructor/lessons/order',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  createMaterial(
    lessonId: number,
    payload: {
      materialType: string
      materialUrl?: string | null
      assetKey?: string | null
      originalFileName: string
      displayOrder?: number | null
    },
  ) {
    return request<number>(
      `/api/instructor/lessons/${lessonId}/materials`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
}

export const instructorLessonEvaluationApi = {
  getQuizEditor(lessonId: number, signal?: AbortSignal) {
    return request<InstructorQuizEditor>(
      `/api/instructor/lessons/${lessonId}/quiz-editor`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  saveQuizEditor(lessonId: number, payload: SaveInstructorQuizEditorRequest) {
    return request<InstructorQuizEditor>(
      `/api/instructor/lessons/${lessonId}/quiz-editor`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  generateQuizDraft(lessonId: number, payload: GenerateInstructorQuizRequest) {
    return request<InstructorQuizEditor>(
      `/api/instructor/lessons/${lessonId}/quiz-editor/generate`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  getAssignmentEditor(lessonId: number, signal?: AbortSignal) {
    return request<InstructorAssignmentEditor>(
      `/api/instructor/lessons/${lessonId}/assignment-editor`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  saveAssignmentEditor(lessonId: number, payload: SaveInstructorAssignmentEditorRequest) {
    return request<InstructorAssignmentEditor>(
      `/api/instructor/lessons/${lessonId}/assignment-editor`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
}

export const instructorAnnouncementApi = {
  getByCourse(courseId: number, signal?: AbortSignal) {
    return request<InstructorAnnouncementSummary[]>(
      `/api/instructor/courses/${courseId}/announcements`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getDetail(announcementId: number, signal?: AbortSignal) {
    return request<InstructorAnnouncementDetail>(
      `/api/instructor/announcements/${announcementId}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  create(
    courseId: number,
    payload: {
      type: string
      title: string
      content: string
      pinned: boolean
      displayOrder: number
      publishedAt?: string | null
      exposureStartAt?: string | null
      exposureEndAt?: string | null
      eventBannerText?: string | null
      eventLink?: string | null
    },
  ) {
    return request<number>(
      `/api/instructor/courses/${courseId}/announcements`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
}

export const instructorQnaApi = {
  getInbox(status?: string, signal?: AbortSignal) {
    return request<InstructorQnaInboxItem[]>(
      `/api/instructor/qna-inbox${buildQueryString({ status })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getTimeline(questionId: number, signal?: AbortSignal) {
    return request<{
      question: InstructorQnaInboxItem
      publishedAnswer: InstructorQnaAnswer | null
      draft: InstructorQnaDraft | null
      lectureTitle: string | null
      lectureTimestamp: string | null
    }>(
      `/api/instructor/qna-inbox/${questionId}/timeline`,
      { method: 'GET', signal },
      { auth: true },
    ).then(mapQnaTimeline)
  },
  updateStatus(questionId: number, status: string) {
    return request<void>(
      `/api/instructor/qna-inbox/${questionId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      { auth: true },
    )
  },
  saveDraft(questionId: number, draftContent: string) {
    return request<InstructorQnaDraft>(
      `/api/instructor/qna-inbox/${questionId}/drafts`,
      {
        method: 'POST',
        body: JSON.stringify({ draftContent }),
      },
      { auth: true },
    )
  },
  createAnswer(questionId: number, content: string) {
    return request<InstructorQnaAnswer>(
      `/api/instructor/qna-inbox/${questionId}/answers`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      },
      { auth: true },
    )
  },
  updateAnswer(questionId: number, answerId: number, content: string) {
    return request<InstructorQnaAnswer>(
      `/api/instructor/qna-inbox/${questionId}/answers/${answerId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      },
      { auth: true },
    )
  },
  getTemplates(signal?: AbortSignal) {
    return request<InstructorQnaTemplate[]>(
      '/api/instructor/qna-inbox/templates',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  createTemplate(payload: { title: string; content: string }) {
    return request<InstructorQnaTemplate>(
      '/api/instructor/qna-inbox/templates',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updateTemplate(templateId: number, payload: { title: string; content: string }) {
    return request<InstructorQnaTemplate>(
      `/api/instructor/qna-inbox/templates/${templateId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  deleteTemplate(templateId: number) {
    return request<void>(
      `/api/instructor/qna-inbox/templates/${templateId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
}

export const instructorReviewApi = {
  getReviews(signal?: AbortSignal) {
    return request<InstructorReviewListItem[]>(
      '/api/instructor/reviews',
      { method: 'GET', signal },
      { auth: true },
    ).then((items) =>
      items.map((item) => ({
        ...item,
        reply: item.reply ? mapReviewReply(item.reply) : null,
      })),
    )
  },
  getSummary(signal?: AbortSignal) {
    return request<InstructorReviewSummary>(
      '/api/instructor/reviews/summary',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getHelpful(signal?: AbortSignal) {
    return request<InstructorReviewHelpful>(
      '/api/instructor/reviews/helpful',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  createReply(reviewId: number, content: string) {
    return request<{
      id: number
      reviewId: number
      instructorId: number
      content: string
      createdAt: string | null
      updatedAt: string | null
    }>(
      `/api/instructor/reviews/${reviewId}/replies`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      },
      { auth: true },
    ).then(mapReviewReply)
  },
  updateReply(reviewId: number, replyId: number, content: string) {
    return request<{
      id: number
      reviewId: number
      instructorId: number
      content: string
      createdAt: string | null
      updatedAt: string | null
    }>(
      `/api/instructor/reviews/${reviewId}/replies/${replyId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      },
      { auth: true },
    ).then(mapReviewReply)
  },
  getTemplates(signal?: AbortSignal) {
    return request<InstructorReviewTemplate[]>(
      '/api/instructor/reviews/templates',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  createTemplate(payload: { title: string; content: string }) {
    return request<InstructorReviewTemplate>(
      '/api/instructor/reviews/templates',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updateTemplate(templateId: number, payload: { title: string; content: string }) {
    return request<InstructorReviewTemplate>(
      `/api/instructor/reviews/templates/${templateId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  deleteTemplate(templateId: number) {
    return request<void>(
      `/api/instructor/reviews/templates/${templateId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
  addIssueTags(reviewId: number, issueTags: string[]) {
    return request<void>(
      `/api/instructor/reviews/${reviewId}/issue-tags`,
      {
        method: 'POST',
        body: JSON.stringify({ issueTags }),
      },
      { auth: true },
    )
  },
}

export const instructorRevenueApi = {
  getSummary(signal?: AbortSignal) {
    return request<unknown>(
      '/api/instructor/revenues',
      { method: 'GET', signal },
      { auth: true },
    ).then(normalizeRevenueSummary)
  },
  getSettlements(signal?: AbortSignal) {
    return request<InstructorSettlementItem[]>(
      '/api/instructor/revenues/settlements',
      { method: 'GET', signal },
      { auth: true },
    )
  },
}

export const instructorMarketingApi = {
  getCoupons(signal?: AbortSignal) {
    return request<InstructorCouponItem[]>(
      '/api/instructor/marketing/coupons',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getPromotions(signal?: AbortSignal) {
    return request<InstructorPromotionItem[]>(
      '/api/instructor/marketing/promotions',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getConversions(signal?: AbortSignal) {
    return request<InstructorConversionSummary>(
      '/api/instructor/marketing/conversions',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  createCoupon(payload: {
    couponTitle: string
    targetCourseId?: number | null
    discountType: string
    discountValue: number
    maxUsageCount?: number | null
    expiresAt?: string | null
  }) {
    return request<InstructorCouponItem>(
      '/api/instructor/marketing/coupons',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  createPromotion(payload: {
    courseId: number
    promotionType: string
    discountRate: number
    startAt: string
    endAt: string
  }) {
    return request<void>(
      '/api/instructor/marketing/promotions',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  updatePromotionStatus(courseId: number, status: string) {
    return request<void>(
      `/api/instructor/marketing/courses/${courseId}/promotion-status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      { auth: true },
    )
  },
}

export const instructorMentoringApi = {
  getBoard(signal?: AbortSignal) {
    return request<InstructorMentoringBoard>(
      '/api/instructor/mentoring/board',
      { method: 'GET', signal },
      { auth: true },
    )
  },
  saveBoard(payload: InstructorMentoringBoard) {
    return request<InstructorMentoringBoard>(
      '/api/instructor/mentoring/board',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
}

export const instructorAnalyticsApi = {
  getDashboard(courseId?: number, signal?: AbortSignal) {
    return request<InstructorAnalyticsDashboard>(
      `/api/instructor/analytics/dashboard${buildQueryString({ courseId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
}

export const userApi = {
  getMyProfile(signal?: AbortSignal) {
    return request<UserProfile>('/api/users/me/profile', { method: 'GET', signal }, { auth: true })
  },
  updateMyProfile(payload: UserProfileUpdateRequest) {
    return request<UserProfile>(
      '/api/users/me/profile',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  changePassword(payload: UserPasswordChangeRequest) {
    return request<void>(
      '/api/users/me/password',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  getOfficialTags(signal?: AbortSignal) {
    return request<TechTag[]>('/api/users/tags/official', { method: 'GET', signal }, { auth: true })
  },
}
