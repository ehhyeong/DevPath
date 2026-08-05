import type { InstructorAnalyticsDashboard, InstructorAnnouncementDetail, InstructorAnnouncementSummary, InstructorChannel, InstructorConversionSummary, InstructorCouponItem, InstructorCourseListItem, InstructorMentoringBoard, InstructorNotificationItem, InstructorQnaAnswer, InstructorQnaDraft, InstructorQnaInboxItem, InstructorQnaTemplate, InstructorQnaTimeline, InstructorRevenueSummary, InstructorRevenueTransaction, InstructorReviewHelpful, InstructorReviewListItem, InstructorReviewReply, InstructorReviewSummary, InstructorReviewTemplate, InstructorSettlementItem, InstructorSubscriptionResponse, InstructorPromotionItem } from '../../types/instructor'
import type { LearningCourseDetail } from '../../types/learning'
import type { GenerateInstructorQuizRequest, InstructorAssignmentEditor, InstructorQuizEditor, SaveInstructorAssignmentEditorRequest, SaveInstructorQuizEditorRequest } from '../../types/instructor-evaluation'
import { request, buildQueryString } from './client'

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
