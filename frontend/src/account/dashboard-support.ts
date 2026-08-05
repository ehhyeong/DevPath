import type { DashboardMentoring, DashboardStudyGroup, DashboardSummary, CommunityPost, Enrollment, GrowthRecommendation, HeatmapEntry, LearningHistorySummary, NotificationItem, ProofCardGalleryItem, WorkspaceHubProject } from '../types/learner'
import type { MyRoadmapSummary, RoadmapDetail } from '../types/roadmap'

export type DashboardState = {
  summary: DashboardSummary
  heatmap: HeatmapEntry[]
  mentoring: DashboardMentoring
  studyGroup: DashboardStudyGroup
  notifications: NotificationItem[]
  historySummary: LearningHistorySummary
  enrollments: Enrollment[]
  roadmapSummary: MyRoadmapSummary | null
  roadmap: RoadmapDetail | null
  proofCards: ProofCardGalleryItem[]
  growthRecommendation: GrowthRecommendation | null
  communityPosts: CommunityPost[]
  workspaceProjects: WorkspaceHubProject[]
}

export const emptyState: DashboardState = {
  summary: {
    currentStreak: 0,
    totalStudyHours: 0,
    completedNodes: 0,
  },
  heatmap: [],
  mentoring: {
    joinedProjectCount: 0,
    applicationCount: 0,
    pendingApplicationCount: 0,
    latestProject: null,
    latestApplication: null,
  },
  studyGroup: {
    joinedGroupCount: 0,
    recruitingGroupCount: 0,
    inProgressGroupCount: 0,
    groups: [],
  },
  notifications: [],
  historySummary: {
    completedNodeCount: 0,
    proofCardCount: 0,
    tilCount: 0,
    publishedTilCount: 0,
    assignmentSubmissionCount: 0,
    passedAssignmentCount: 0,
    supplementRecommendationCount: 0,
  },
  enrollments: [],
  roadmapSummary: null,
  roadmap: null,
  proofCards: [],
  growthRecommendation: null,
  communityPosts: [],
  workspaceProjects: [],
}

export function getRoadmapActivityTimestamp(roadmapSummary: MyRoadmapSummary) {
  const activityAt = roadmapSummary.lastStudiedAt ?? roadmapSummary.updatedAt ?? roadmapSummary.createdAt
  return activityAt ? new Date(activityAt).getTime() : 0
}

export function clampProgress(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Math.round(value ?? 0)))
}

export function formatStudyTime(totalStudyHours: number | null | undefined) {
  const normalizedHours = Math.max(0, Number(totalStudyHours ?? 0))
  const hours = Math.floor(normalizedHours)
  const minutes = Math.round((normalizedHours - hours) * 60)
  return { hours, minutes }
}

export function formatStudyDeltaText(deltaMinutes: number | null | undefined) {
  if (deltaMinutes == null) {
    return '실제 학습 기록 기준입니다.'
  }

  const absMinutes = Math.abs(deltaMinutes)
  const hours = Math.floor(absMinutes / 60)
  const minutes = absMinutes % 60
  const timeLabel = hours > 0 ? `${hours}시간${minutes > 0 ? ` ${minutes}분` : ''}` : `${minutes}분`

  if (deltaMinutes > 0) {
    return `어제보다 ${timeLabel} 더 학습했어요.`
  }

  if (deltaMinutes < 0) {
    return `어제보다 ${timeLabel} 줄었어요.`
  }

  return '어제와 같은 학습 흐름이에요.'
}

export function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function buildWeeklyBars(heatmap: HeatmapEntry[]) {
  const labels = ['월', '화', '수', '목', '금', '토', '일']
  const entryByDate = new Map(heatmap.map((entry) => [entry.date.slice(0, 10), entry]))
  const today = new Date()
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const weekStart = new Date(today)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(today.getDate() + mondayOffset)

  const rawBars = labels.map((label, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    const entry = entryByDate.get(formatDateKey(date))
    const level = Math.max(0, entry?.activityLevel ?? 0)
    const studyHours = entry?.studyHours ?? null
    return {
      label,
      level,
      studyHours,
      value: studyHours ?? level,
    }
  })

  const maxValue = Math.max(...rawBars.map((bar) => bar.value), 1)

  return rawBars.map((bar) => {
    const active = bar.value > 0
    const height = active ? Math.max(12, Math.round((bar.value / maxValue) * 100)) : 0
    const tone = !active ? 'bg-gray-200' : bar.level >= 3 ? 'bg-brand' : 'bg-green-300'
    return { ...bar, active, height, tone }
  })
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return '날짜 없음'
  }

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return '날짜 없음'
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (diffMinutes < 1) {
    return '방금 전'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays}일 전`
  }

  const date = new Date(timestamp)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return '날짜 없음'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '날짜 없음'
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export function formatScheduleDateTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function calcDDay(value: string | null | undefined) {
  if (!value) {
    return '일정 미정'
  }

  const target = new Date(value)
  if (Number.isNaN(target.getTime())) {
    return '일정 미정'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000)

  if (diffDays > 0) {
    return `D-${diffDays}`
  }

  if (diffDays === 0) {
    return 'D-Day'
  }

  return '종료'
}

export function statusLabel(status: string | null | undefined) {
  switch ((status ?? '').toUpperCase()) {
    case 'IN_PROGRESS':
    case 'ONGOING':
    case 'ACTIVE':
      return '진행 중'
    case 'RECRUITING':
      return '모집 중'
    case 'PENDING':
    case 'UNDER_REVIEW':
      return '검토 중'
    case 'APPROVED':
      return '승인됨'
    case 'REJECTED':
      return '거절됨'
    case 'COMPLETED':
    case 'ENDED':
    case 'CLOSED':
      return '완료됨'
    default:
      return status ?? '상태 없음'
  }
}

export function growthIconClass(iconClass: string | null | undefined) {
  const normalized = (iconClass ?? 'fa-book-open').trim()
  if (normalized.includes('fas ') || normalized.includes('far ') || normalized.includes('fab ')) {
    return normalized
  }

  return normalized.includes('fa-') ? `fas ${normalized}` : 'fas fa-book-open'
}

export function hasDashboardContent(state: DashboardState) {
  return Boolean(
    (state.summary.currentStreak ?? 0) > 0 ||
      (state.summary.totalStudyHours ?? 0) > 0 ||
      (state.summary.completedNodes ?? 0) > 0 ||
      state.heatmap.some((item) => (item.activityLevel ?? 0) > 0) ||
      state.enrollments.length > 0 ||
      state.proofCards.length > 0 ||
      state.communityPosts.length > 0 ||
      state.workspaceProjects.length > 0 ||
      state.notifications.length > 0 ||
      state.roadmapSummary ||
      state.roadmap ||
      state.growthRecommendation?.recommendations.length ||
      state.mentoring.latestProject ||
      state.mentoring.latestApplication ||
      state.studyGroup.groups.length > 0,
  )
}

export function navigateTo(path: string) {
  window.location.assign(path)
}
