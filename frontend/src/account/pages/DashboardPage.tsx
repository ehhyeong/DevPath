import { useEffect, useState } from 'react'
import { communityApi, dashboardApi, enrollmentApi, learningHistoryApi, notificationApi, proofCardApi, roadmapApi, workspaceHubApi } from '../../lib/api'
import { LearnerContentRow, LearnerPageShell, MyMenuSidebar } from '../template'
import type { AuthSession } from '../../types/auth'
import type {
  DashboardMentoring,
  DashboardStudyGroup,
  DashboardSummary,
  CommunityPost,
  Enrollment,
  GrowthRecommendation,
  GrowthRecommendationItem,
  HeatmapEntry,
  LearningHistorySummary,
  NotificationItem,
  ProofCardGalleryItem,
  WorkspaceHubProject,
} from '../../types/learner'
import type { MyRoadmapSummary, RoadmapDetail } from '../../types/roadmap'

type DashboardState = {
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

const emptyState: DashboardState = {
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

function getRoadmapActivityTimestamp(roadmapSummary: MyRoadmapSummary) {
  const activityAt = roadmapSummary.lastStudiedAt ?? roadmapSummary.updatedAt ?? roadmapSummary.createdAt
  return activityAt ? new Date(activityAt).getTime() : 0
}

function clampProgress(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Math.round(value ?? 0)))
}

function formatStudyTime(totalStudyHours: number | null | undefined) {
  const normalizedHours = Math.max(0, Number(totalStudyHours ?? 0))
  const hours = Math.floor(normalizedHours)
  const minutes = Math.round((normalizedHours - hours) * 60)
  return { hours, minutes }
}

function formatStudyDeltaText(deltaMinutes: number | null | undefined) {
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

function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function buildWeeklyBars(heatmap: HeatmapEntry[]) {
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

function formatRelativeTime(value: string | null | undefined) {
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

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return '날짜 없음'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '날짜 없음'
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatScheduleDateTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function calcDDay(value: string | null | undefined) {
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

function statusLabel(status: string | null | undefined) {
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

function growthIconClass(iconClass: string | null | undefined) {
  const normalized = (iconClass ?? 'fa-book-open').trim()
  if (normalized.includes('fas ') || normalized.includes('far ') || normalized.includes('fab ')) {
    return normalized
  }

  return normalized.includes('fa-') ? `fas ${normalized}` : 'fas fa-book-open'
}

function hasDashboardContent(state: DashboardState) {
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

function navigateTo(path: string) {
  window.location.assign(path)
}

function DashboardEmptyReference({ displayName }: { displayName: string }) {
  return (
    <>
      <MyMenuSidebar currentPageKey="dashboard" wrapperClassName="w-60 shrink-0 hidden lg:block" />

      <section className="dashboard-empty-reference-main flex-1 min-w-0 space-y-6">
        <header className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">환영합니다, {displayName}님! 🎉</h1>
            <p className="mt-1 text-sm text-gray-500">DevPath와 함께 커리어 여정을 시작해볼까요?</p>
          </div>
        </header>

        <div className="dashboard-empty-stats grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="dashboard-empty-stat-card relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="mt-1 text-xs font-bold text-gray-500">연속 학습</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <i className="fas fa-fire" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-gray-900">0일</span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">오늘 첫 학습을 시작하세요!</p>
          </div>

          <div className="dashboard-empty-stat-card relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="mt-1 text-xs font-bold text-gray-500">완료 강의</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <i className="fas fa-check-circle" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-gray-900">0</span>
              <span className="text-sm font-medium text-gray-400">개</span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">수강을 완료한 강의가 없습니다.</p>
          </div>

          <div className="dashboard-empty-stat-card relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="mt-1 text-xs font-bold text-gray-500">획득 뱃지</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <i className="fas fa-medal" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-gray-900">0개</span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">첫 뱃지에 도전해보세요!</p>
          </div>

          <div className="dashboard-empty-stat-card relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="mt-1 text-xs font-bold text-gray-500">총 학습</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <i className="fas fa-clock" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-gray-900">
                0h <span className="text-lg text-gray-400">0m</span>
              </span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">학습 기록이 없습니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="dashboard-empty-recent-card relative flex h-48 flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-300">
              <i className="fas fa-book-open text-xl" />
            </div>
            <p className="mb-1 text-sm font-bold text-gray-700">최근 학습한 강의가 없습니다.</p>
            <p className="mb-4 text-xs text-gray-400">나에게 맞는 첫 강의를 찾아 학습을 시작해보세요!</p>
            <button
              type="button"
              className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#00b365]"
              onClick={() => navigateTo('/lecture-list')}
            >
              강의 둘러보기
            </button>
          </div>

          <div className="dashboard-empty-chart-card flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <i className="fas fa-chart-bar text-gray-400" /> 주간 학습 시간
              </h3>
              <span className="text-[10px] text-gray-400">이번 주</span>
            </div>
            <div className="relative flex h-24 flex-1 items-end justify-between gap-2">
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <span className="rounded bg-white/80 px-2 py-1 text-xs text-gray-400">데이터가 없습니다</span>
              </div>
              {['월', '화', '수', '목', '금', '토', '일'].map((label) => (
                <div key={label} className="flex h-full w-full flex-col items-center justify-end gap-1 opacity-20">
                  <div className="chart-bar h-[0%]" />
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="dashboard-empty-small-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <i className="fas fa-rocket text-gray-400" /> 진행 중인 프로젝트
              </h3>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <i className="fas fa-folder-open" />
              </div>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                현재 참여 중인
                <br />
                프로젝트가 없습니다.
              </p>
              <button type="button" className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-bold text-gray-600 transition hover:bg-gray-100">
                팀 찾기
              </button>
            </div>
          </div>

          <div className="dashboard-empty-small-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <i className="fas fa-chalkboard-teacher text-gray-400" /> 멘토링
              </h3>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <i className="fas fa-search" />
              </div>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                현재 진행 중인
                <br />
                멘토링이 없습니다.
              </p>
              <button type="button" className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-bold text-gray-600 transition hover:bg-gray-100">
                멘토 찾기
              </button>
            </div>
          </div>

          <div className="dashboard-empty-small-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <i className="fas fa-comment-dots text-gray-400" /> 라운지 / 커뮤니티
              </h3>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <i className="far fa-comments" />
              </div>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                아직 커뮤니티 활동이
                <br />
                없습니다.
              </p>
              <button type="button" className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-bold text-gray-600 transition hover:bg-gray-100">
                글 작성하기
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="dashboard-empty-proof-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">보유 스킬 (Proof)</h3>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-300 shadow-sm">
                <i className="fas fa-certificate" />
              </div>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                획득한 스킬이 없습니다.
                <br />
                학습을 완료하고 증명하세요.
              </p>
            </div>
          </div>

          <div className="dashboard-empty-ai-card flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <i className="fas fa-magic text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900">AI 맞춤 성장 제안</h3>
            </div>

            <div className="flex h-full flex-col gap-4 md:flex-row">
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                <i className="fas fa-robot mb-1 text-2xl text-gray-300" />
                <p className="text-sm font-bold text-gray-500">학습 데이터가 부족합니다</p>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  강의를 수강하고 과제를 진행해보세요.
                  <br />
                  데이터가 충분히 모이면 AI가 맞춤형 성장 방향을 제안합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="dashboard-empty-reference-roadmap hidden w-80 shrink-0 xl:block">
        <div className="dashboard-empty-roadmap-card sticky-roadmap mt-[80px] flex h-[600px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="dashboard-empty-roadmap-title flex items-center gap-2 font-bold text-gray-900">
              <i className="fas fa-map text-gray-400" /> 나의 학습 로드맵
            </h3>
          </div>

          <div className="dashboard-empty-roadmap-body flex flex-1 flex-col items-center justify-center text-center">
            <div className="dashboard-empty-roadmap-icon mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-300">
              <i className="fas fa-route text-3xl" />
            </div>
            <h4 className="dashboard-empty-roadmap-heading mb-2 text-sm font-bold text-gray-700">선택된 로드맵이 없습니다</h4>
            <p className="dashboard-empty-roadmap-copy mb-8 text-xs leading-relaxed text-gray-400">
              나의 커리어 목표에 맞는
              <br />
              최적의 학습 경로를 찾아보세요!
              <br />
              DevPath가 안내해 드립니다.
            </p>
            <button
              type="button"
              className="dashboard-empty-roadmap-button flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#00b365]"
              onClick={() => navigateTo('/roadmap-hub')}
            >
              <i className="fas fa-search text-xs" /> 맞춤 로드맵 탐색하기
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default function DashboardPage({ session }: { session: AuthSession }) {
  const [state, setState] = useState<DashboardState>(emptyState)
  const [addingGrowthNodeId, setAddingGrowthNodeId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let active = true

    function updateDashboardState(updater: (current: DashboardState) => DashboardState) {
      if (active) {
        setState(updater)
      }
    }

    function loadDashboard() {
      void dashboardApi
        .getSummary(signal)
        .then((summary) => updateDashboardState((current) => ({ ...current, summary })))
        .catch(() => {})

      void dashboardApi
        .getHeatmap(signal)
        .then((heatmap) => updateDashboardState((current) => ({ ...current, heatmap })))
        .catch(() => {})

      void dashboardApi
        .getMentoring(signal)
        .then((mentoring) => updateDashboardState((current) => ({ ...current, mentoring })))
        .catch(() => {})

      void dashboardApi
        .getStudyGroup(signal)
        .then((studyGroup) => updateDashboardState((current) => ({ ...current, studyGroup })))
        .catch(() => {})

      void notificationApi
        .getMine(signal)
        .then((notifications) => updateDashboardState((current) => ({ ...current, notifications })))
        .catch(() => {})

      void learningHistoryApi
        .getSummary(signal)
        .then((historySummary) => updateDashboardState((current) => ({ ...current, historySummary })))
        .catch(() => {})

      void enrollmentApi
        .getMyEnrollments(signal)
        .then((enrollments) => updateDashboardState((current) => ({ ...current, enrollments })))
        .catch(() => {})

      void proofCardApi
        .getGallery(signal)
        .then((proofCards) => updateDashboardState((current) => ({ ...current, proofCards })))
        .catch(() => {})

      void dashboardApi
        .getGrowthRecommendation(signal)
        .then((growthRecommendation) => updateDashboardState((current) => ({ ...current, growthRecommendation })))
        .catch(() => {})

      void workspaceHubApi
        .getProjects(signal)
        .then((workspaceProjects) => updateDashboardState((current) => ({ ...current, workspaceProjects })))
        .catch(() => {})

      if (session.userId) {
        void communityApi
          .searchPosts({ authorId: session.userId, page: 0, size: 2, sort: 'latest' }, signal)
          .then((page) => updateDashboardState((current) => ({ ...current, communityPosts: page.content })))
          .catch(() => {})
      }
    }

    async function loadRoadmap() {
      try {
        const listResult = await roadmapApi.getMyRoadmaps(signal)
        const selectedRoadmap = [...listResult.roadmaps].sort(
          (left, right) => getRoadmapActivityTimestamp(right) - getRoadmapActivityTimestamp(left),
        )[0]
        if (!selectedRoadmap) {
          updateDashboardState((current) => ({ ...current, roadmapSummary: null, roadmap: null }))
          return
        }

        const detail = await roadmapApi.getMyRoadmapDetail(selectedRoadmap.customRoadmapId, signal)
        updateDashboardState((current) => ({ ...current, roadmapSummary: selectedRoadmap, roadmap: detail }))
      } catch {
        updateDashboardState((current) => ({ ...current, roadmapSummary: null, roadmap: null }))
      }
    }

    loadDashboard()
    void loadRoadmap()

    return () => {
      active = false
      controller.abort()
    }
  }, [session.userId])

  async function handleAddGrowthNode(item: GrowthRecommendationItem) {
    if (addingGrowthNodeId !== null) {
      return
    }

    setAddingGrowthNodeId(item.nodeId)
    try {
      const result = await dashboardApi.addGrowthRecommendationNode(item.nodeId)
      navigateTo(`/roadmap?id=${result.customRoadmapId}&nodeId=${result.customNodeId}`)
    } catch {
      window.alert('로드맵에 추천 노드를 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setAddingGrowthNodeId(null)
    }
  }

  const showEmptyDashboard = !hasDashboardContent(state)

  if (showEmptyDashboard) {
    return (
      <LearnerPageShell>
        <LearnerContentRow>
          <DashboardEmptyReference displayName={session.name || '사용자'} />
        </LearnerContentRow>
      </LearnerPageShell>
    )
  }

  const displayName = session.name || '사용자'
  const completedCourseCount = state.enrollments.filter(
    (enrollment) => enrollment.status === 'COMPLETED' || Boolean(enrollment.completedAt),
  ).length
  const proofCardCount = state.proofCards.length
  const studyTime = formatStudyTime(state.summary.totalStudyHours)
  const recentEnrollment = [...state.enrollments].sort((left, right) => {
    const leftTime = new Date(left.lastAccessedAt ?? left.completedAt ?? left.enrolledAt ?? 0).getTime()
    const rightTime = new Date(right.lastAccessedAt ?? right.completedAt ?? right.enrolledAt ?? 0).getTime()
    return rightTime - leftTime
  })[0]
  const recentCourse = recentEnrollment
    ? {
        title: recentEnrollment.courseTitle,
        courseId: recentEnrollment.courseId,
        thumbnailUrl: recentEnrollment.thumbnailUrl,
        progress: clampProgress(recentEnrollment.progressPercentage),
        lesson: state.summary.lastLessonInfo ?? `${recentEnrollment.instructorName} 강의`,
      }
    : null
  const weeklyBars = buildWeeklyBars(state.heatmap)
  const hasWeeklyData = weeklyBars.some((bar) => bar.active)
  const activeProject =
    state.workspaceProjects.find((project) => project.type === 'squad' && project.status === 'progress') ??
    state.workspaceProjects.find((project) => project.type === 'squad') ??
    null
  const projectMemberSeeds = activeProject?.memberAvatarSeeds ?? []
  const projectScheduleDate = formatScheduleDateTime(activeProject?.nextScheduleStartAt)
  const projectScheduleMeta = activeProject?.nextScheduleStartAt
    ? `Next: ${activeProject.nextScheduleTitle ?? '일정'}${projectScheduleDate ? ` · ${projectScheduleDate}` : ''}`
    : '일정 관리에 등록된 예정 일정 없음'
  const mentoringProject =
    state.workspaceProjects.find((project) => project.type === 'mentoring' && project.status === 'progress') ??
    state.workspaceProjects.find((project) => project.type === 'mentoring') ??
    null
  const communityDisplayItems = state.communityPosts.slice(0, 2).map((post) => ({
    id: post.id,
    title: post.title,
    meta: `${post.category} · ${formatRelativeTime(post.createdAt)}`,
  }))
  const proofIcons = ['fas fa-certificate', 'fas fa-medal', 'fas fa-award']
  const proofColors = ['text-blue-500', 'text-purple-500', 'text-emerald-500']
  const proofItems = state.proofCards.slice(0, 2).map((card, index) => ({
    id: card.proofCardId,
    name: card.title,
    detail: [card.nodeTitle, card.tags.map((tag) => tag.tagName).join(', ')].filter(Boolean).join(' · '),
    issuedAt: formatShortDate(card.issuedAt),
    icon: proofIcons[index % proofIcons.length],
    color: proofColors[index % proofColors.length],
  }))
  const growthItems = state.growthRecommendation?.recommendations ?? []
  const mainGrowthItem = growthItems[0] ?? null
  const growthAnalysisText =
    mainGrowthItem?.reason ??
    state.growthRecommendation?.analysisText ??
    '학습 데이터가 충분히 모이면 AI가 맞춤형 성장 방향을 제안합니다.'
  const roadmapTitle = state.roadmap?.title ?? state.roadmapSummary?.title ?? null
  const roadmapNodes = state.roadmap?.nodes ?? []
  const roadmapNodeCount = roadmapNodes.length
  const completedRoadmapNodeCount = roadmapNodes.filter((node) => node.status === 'COMPLETED').length
  const roadmapProgress = clampProgress(state.roadmap?.progressRate ?? state.roadmapSummary?.progressRate)
  const nextRoadmapNode =
    roadmapNodes.find((node) => node.status === 'IN_PROGRESS') ??
    roadmapNodes.find((node) => node.status !== 'COMPLETED') ??
    null
  const roadmapId = state.roadmap?.customRoadmapId ?? state.roadmapSummary?.customRoadmapId ?? null
  const roadmapHref = roadmapId
    ? `/roadmap?id=${roadmapId}${nextRoadmapNode ? `&nodeId=${nextRoadmapNode.customNodeId}` : ''}`
    : '/roadmap-hub'

  return (
    <LearnerPageShell>
      <LearnerContentRow>
        <MyMenuSidebar
          currentPageKey="dashboard"
          wrapperClassName="w-60 shrink-0 hidden lg:block"
        />

        <section className="dashboard-populated-reference-main min-w-0 flex-1 space-y-6">
          <header className="mb-2 flex items-center justify-between">
            <div>
              {showEmptyDashboard ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">환영합니다, {displayName}님! 🎉</h1>
                  <p className="mt-1 text-sm text-gray-500">DevPath와 함께 커리어 여정을 시작해볼까요?</p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">반가워요, {displayName}님! 👋</h1>
                  <p className="mt-1 text-sm text-gray-500">오늘도 목표를 향해 달려볼까요?</p>
                </>
              )}
            </div>
          </header>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className={`relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm ${showEmptyDashboard ? '' : 'transition hover:border-brand'}`}>
              <div className="flex items-start justify-between">
                <p className="mt-1 text-xs font-bold text-gray-500">연속 학습</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${showEmptyDashboard ? 'bg-gray-50 text-gray-400' : 'bg-orange-50 text-orange-500'}`}>
                  <i className="fas fa-fire" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-gray-900">{state.summary.currentStreak ?? 0}일</span>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">이대로 쭉 가보자고요!</p>
            </div>

            <div className="relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="mt-1 text-xs font-bold text-gray-500">완료 강의</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${showEmptyDashboard ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-500'}`}>
                  <i className="fas fa-check-circle" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-gray-900">{completedCourseCount}</span>
                <span className="text-sm font-medium text-gray-400">/ {state.enrollments.length}</span>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">실제 수강 목록 기준입니다.</p>
            </div>

            <div className="relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="mt-1 text-xs font-bold text-gray-500">획득 뱃지</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${showEmptyDashboard ? 'bg-gray-50 text-gray-400' : 'bg-yellow-50 text-yellow-500'}`}>
                  <i className="fas fa-medal" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-gray-900">{proofCardCount}개</span>
              </div>
              {showEmptyDashboard ? (
                <p className="mt-1 text-[10px] text-gray-400">첫 뱃지에 도전해보세요!</p>
              ) : (
                <a href="/learning-log-gallery" className="mt-1 inline-block text-[10px] font-bold text-brand hover:underline">
                  Proof Card 확인 →
                </a>
              )}
            </div>

            <div className="relative rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="mt-1 text-xs font-bold text-gray-500">총 학습</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${showEmptyDashboard ? 'bg-gray-50 text-gray-400' : 'bg-purple-50 text-purple-500'}`}>
                  <i className="fas fa-clock" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-gray-900">
                  {studyTime.hours}h <span className="text-lg text-gray-400">{studyTime.minutes}m</span>
                </span>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">{formatStudyDeltaText(state.summary.studyHoursDeltaMinutes)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {recentCourse ? (
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold text-gray-800">
                    <i className="fas fa-play-circle text-brand" /> 최근 학습 강의
                  </h3>
                  <a href="/my-learning" className="text-xs text-gray-400 hover:text-brand">
                    전체보기
                  </a>
                </div>
                <div className="flex items-center gap-5">
                  <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {recentCourse.thumbnailUrl ? (
                      <img src={recentCourse.thumbnailUrl} className="h-full w-full object-cover" alt="thumb" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <i className="fas fa-book-open text-xl" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <h4 className="line-clamp-1 text-sm font-bold text-gray-900" title={recentCourse.title}>
                        {recentCourse.title}
                      </h4>
                      <span className="text-lg font-extrabold text-brand">
                        {recentCourse.progress}%
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-gray-500">{recentCourse.lesson}</p>
                    <div className="mb-1 h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-brand transition-all duration-1000"
                        style={{ width: `${recentCourse.progress}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition hover:bg-brand"
                    onClick={() => navigateTo(`/course-detail?courseId=${recentCourse.courseId}`)}
                  >
                    <i className="fas fa-play ml-1" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative flex h-48 flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm lg:col-span-2">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                  <i className="fas fa-book-open text-xl" />
                </div>
                <p className="mb-1 text-sm font-bold text-gray-700">최근 학습한 강의가 없습니다.</p>
                <p className="mb-4 text-xs text-gray-400">실제 수강 기록이 생기면 이 영역에 표시됩니다.</p>
                <button
                  type="button"
                  className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#00b365]"
                  onClick={() => navigateTo('/lecture-list')}
                >
                  강의 둘러보기
                </button>
              </div>
            )}

            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <i className="fas fa-chart-bar text-gray-400" /> 주간 학습 시간
                </h3>
                <span className="text-[10px] text-gray-400">이번 주</span>
              </div>
              <div className="relative flex h-24 flex-1 items-end justify-between gap-2">
                {!hasWeeklyData ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <span className="rounded bg-white/80 px-2 py-1 text-xs text-gray-400">데이터가 없습니다</span>
                  </div>
                ) : null}
                {weeklyBars.map((bar) => (
                  <div key={bar.label} className="flex h-full w-full flex-col items-center justify-end gap-1">
                    <div className="chart-bar" style={{ height: `${bar.height}%` }}>
                      <div className={`chart-bar-fill h-full ${bar.tone}`} />
                    </div>
                    <span className={`text-[10px] ${bar.active ? 'font-bold text-gray-900' : 'text-gray-400'}`}>
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <i className={`fas fa-rocket ${showEmptyDashboard ? 'text-gray-400' : 'text-blue-500'}`} /> 진행 중인 프로젝트
                </h3>
                {showEmptyDashboard ? null : (
                  <a href="/workspace-hub" className="text-xs text-gray-400 hover:text-brand">
                    더보기
                  </a>
                )}
              </div>

              {activeProject ? (
                <div
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 transition hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo(activeProject.dashboardUrl || '/workspace-hub')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      navigateTo(activeProject.dashboardUrl || '/workspace-hub')
                    }
                  }}
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="shrink-0 rounded bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">Team</span>
                      <span className="truncate text-sm font-bold text-gray-900" title={activeProject.title}>
                        {activeProject.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-500">
                        {calcDDay(activeProject.nextScheduleStartAt)}
                      </span>
                      <p className="truncate text-[11px] text-gray-500" title={projectScheduleMeta}>
                        {projectScheduleMeta}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 -space-x-2">
                    {projectMemberSeeds.map((seed, index) => (
                      <img
                        key={seed}
                        className="h-8 w-8 rounded-full border-2 border-white bg-gray-200"
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`}
                        alt={`member-${index + 1}`}
                      />
                    ))}
                    {(activeProject.extraMemberCount ?? 0) > 0 ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-bold text-gray-500">
                        +{activeProject.extraMemberCount}
                      </div>
                    ) : null}
                    {projectMemberSeeds.length === 0 ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-bold text-gray-500">
                        0
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-4">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                    <i className="fas fa-folder-open" />
                  </div>
                  <p className="text-center text-xs leading-relaxed text-gray-400">
                    현재 참여 중인
                    <br />
                    프로젝트가 없습니다.
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-bold text-gray-600 transition hover:bg-gray-100"
                    onClick={() => navigateTo('/project-list')}
                  >
                    팀 찾기
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <i className={`fas fa-chalkboard-teacher ${showEmptyDashboard ? 'text-gray-400' : 'text-purple-500'}`} /> 멘토링
                </h3>
                {showEmptyDashboard ? null : (
                  <a href="/workspace-hub" className="text-xs text-gray-400 hover:text-brand">
                    더보기
                  </a>
                )}
              </div>
              {mentoringProject ? (
                <div
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-purple-100 bg-purple-50 p-4 transition hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo(mentoringProject.dashboardUrl || '/workspace-hub')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      navigateTo(mentoringProject.dashboardUrl || '/workspace-hub')
                    }
                  }}
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="shrink-0 rounded bg-purple-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        Mentoring
                      </span>
                      <span className="truncate text-sm font-bold text-gray-900" title={mentoringProject.title}>
                        {mentoringProject.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded border border-purple-200 bg-white px-2 py-0.5 text-xs font-bold text-purple-600">
                        {statusLabel(mentoringProject.status)}
                      </span>
                      <p className="truncate text-[11px] text-gray-500" title={mentoringProject.footerText ?? mentoringProject.mentoringModeLabel ?? ''}>
                        {mentoringProject.footerText ?? mentoringProject.mentoringModeLabel ?? '멘토링 워크스페이스'}
                      </p>
                    </div>
                  </div>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gray-100 text-[10px] font-bold text-purple-500">
                    {mentoringProject.footerAvatarUrl ? (
                      <img src={mentoringProject.footerAvatarUrl} className="h-full w-full object-cover" alt="mentor" />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mentoringProject.footerAvatarSeed ?? `mentor-${mentoringProject.projectId}`)}`}
                        className="h-full w-full object-cover"
                        alt="mentor"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-2">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                    <i className="fas fa-search" />
                  </div>
                  <p className="text-center text-xs leading-relaxed text-gray-400">
                    현재 진행 중인
                    <br />
                    멘토링이 없습니다.
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded bg-purple-50 px-3 py-1.5 text-[10px] font-bold text-purple-600 transition hover:bg-purple-100"
                    onClick={() => navigateTo('/mentoring-hub')}
                  >
                    멘토 찾기
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <i className={`fas fa-comment-dots ${showEmptyDashboard ? 'text-gray-400' : 'text-orange-500'}`} /> 라운지 / 커뮤니티
                </h3>
                {showEmptyDashboard ? null : (
                  <a href="/community-list" className="text-xs text-gray-400 hover:text-brand">
                    더보기
                  </a>
                )}
              </div>

              {communityDisplayItems.length === 0 ? (
                <div className="flex min-h-[148px] flex-col items-center justify-center text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                    <i className="far fa-comments" />
                  </div>
                  <p className="text-xs leading-relaxed text-gray-400">
                    아직 커뮤니티 활동이
                    <br />
                    없습니다.
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-bold text-gray-600 transition hover:bg-gray-100"
                    onClick={() => navigateTo('/community-list')}
                  >
                    글 작성하기
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {communityDisplayItems.map((item, index) => (
                    <li key={item.id} className="group flex cursor-pointer items-start gap-3">
                      <div className={`mt-1.5 h-1.5 w-1.5 rounded-full ${index === 0 ? 'bg-orange-400' : 'bg-gray-300'}`} />
                      <div>
                        <p className="line-clamp-1 text-sm text-gray-700 transition group-hover:text-brand">{item.title}</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">{item.meta}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className={`h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${showEmptyDashboard ? 'flex flex-col' : ''}`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">보유 스킬 (Proof)</h3>
                {showEmptyDashboard ? null : <a href="/learning-log-gallery" className="text-xs text-gray-400 hover:text-brand">전체</a>}
              </div>
              {proofItems.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-4 text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-300 shadow-sm">
                    <i className="fas fa-certificate" />
                  </div>
                  <p className="text-xs leading-relaxed text-gray-400">
                    획득한 스킬이 없습니다.
                    <br />
                    학습을 완료하고 증명하세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proofItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm ${item.color}`}>
                          <i className={item.icon} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-gray-900" title={item.name}>
                            {item.name}
                          </p>
                          <p className="line-clamp-1 text-[10px] text-gray-400" title={item.detail}>
                            {item.detail}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold text-gray-900">Proof</p>
                        <p className="text-[10px] text-gray-400">{item.issuedAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <i className={`fas fa-magic ${showEmptyDashboard ? 'text-gray-400' : 'text-purple-500'}`} />
                <h3 className="text-sm font-bold text-gray-900">AI 맞춤 성장 제안</h3>
              </div>

              <div className="flex h-full min-w-0 flex-col gap-4 md:flex-row">
                {mainGrowthItem ? (
                  <>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 overflow-hidden rounded-xl bg-purple-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl text-purple-600 shadow-sm">
                          <i className={growthIconClass(mainGrowthItem.iconClass)} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900" title={mainGrowthItem.nodeTitle}>
                            {mainGrowthItem.nodeTitle}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            매칭률 <span className="font-bold text-purple-600">+{mainGrowthItem.matchRateIncrease}%</span> 상승
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="dashboard-ai-add-button mt-2 w-full rounded-lg border border-purple-200 bg-white py-2 text-[11px] font-bold text-purple-600 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={addingGrowthNodeId === mainGrowthItem.nodeId}
                        onClick={() => void handleAddGrowthNode(mainGrowthItem)}
                      >
                        로드맵에 추가하기
                      </button>
                    </div>

                    <div className="dashboard-ai-analysis-panel flex min-w-0 flex-1 flex-col justify-center rounded-xl bg-slate-900 p-4 text-white">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-lg text-yellow-400">
                          <i className="fas fa-robot" />
                        </span>
                        <span className="text-xs font-bold text-gray-300">Analysis</span>
                      </div>
                      <p className="break-words text-xs leading-relaxed text-gray-300">{growthAnalysisText}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                    <i className="fas fa-robot mb-1 text-2xl text-gray-300" />
                    <p className="text-sm font-bold text-gray-500">학습 데이터가 부족합니다</p>
                    <p className="text-[11px] leading-relaxed text-gray-400">
                      강의를 수강하고 과제를 진행해보세요.
                      <br />
                      데이터가 충분히 모이면 AI가 맞춤형 성장 방향을 제안합니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky-roadmap dashboard-populated-roadmap-card mt-[80px] space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {roadmapTitle ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold text-gray-900">
                    <i className="fas fa-map text-brand" /> 나의 학습 로드맵
                  </h3>
                  <span
                    className="max-w-[120px] truncate rounded border border-green-100 bg-green-50 px-2 py-1 text-[10px] font-bold text-brand"
                    title={roadmapTitle}
                  >
                    {roadmapTitle}
                  </span>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">학습 진행 현황</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {completedRoadmapNodeCount} / {roadmapNodeCount} 노드 완료
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${roadmapProgress}%` }} />
                  </div>
                  <p className="mt-2 text-right text-[11px] text-gray-400">
                    전체 로드맵 노드의 {roadmapProgress}%를 수강했어요!
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-bold tracking-wider text-gray-400 uppercase">Next Study Node</span>
                  {nextRoadmapNode ? (
                    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-brand">
                        <i className="fas fa-arrow-alt-circle-right" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-gray-900" title={nextRoadmapNode.title}>
                          {nextRoadmapNode.title}
                        </h4>
                        <p className="mt-0.5 text-[11px] text-gray-500">{statusLabel(nextRoadmapNode.status)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center text-xs text-gray-400 shadow-sm">
                      다음 학습 노드가 없습니다.
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-600"
                    onClick={() => navigateTo(roadmapHref)}
                  >
                    <i className="fas fa-play" /> 이어서 학습하기
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                    onClick={() => navigateTo('/my-roadmap-list')}
                  >
                    로드맵 전체 보기
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold text-gray-900">
                    <i className="fas fa-map text-gray-400" /> 나의 학습 로드맵
                  </h3>
                </div>
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                    <i className="fas fa-route text-3xl" />
                  </div>
                  <h4 className="mb-2 text-sm font-bold text-gray-700">선택된 로드맵이 없습니다</h4>
                  <p className="mb-8 text-xs leading-relaxed text-gray-400">
                    최근 학습한 로드맵이 생기면
                    <br />
                    이 영역에 진행 현황이 표시됩니다.
                  </p>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#00b365]"
                    onClick={() => navigateTo('/roadmap-hub')}
                  >
                    <i className="fas fa-search text-xs" /> 맞춤 로드맵 탐색하기
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </LearnerContentRow>
    </LearnerPageShell>
  )
}
