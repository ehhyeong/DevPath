import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { ErrorCard, LoadingCard, formatNumber } from '../../account/ui'
import {
  instructorAnalyticsApi,
  instructorCourseApi,
  instructorMentoringApi,
  instructorQnaApi,
  instructorReviewApi,
} from '../../lib/api'
import type { AuthSession } from '../../types/auth'
import type {
  InstructorAnalyticsDashboard,
  InstructorAnalyticsDropOffItem,
  InstructorAnalyticsStudentItem,
  InstructorCourseListItem,
  InstructorMentoringBoard,
  InstructorQnaInboxItem,
  InstructorReviewListItem,
  InstructorReviewSummary,
} from '../../types/instructor'

type DashboardTabKey = 'learning' | 'mentoring'

ChartJS.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip)

const EMPTY_REVIEW_SUMMARY: InstructorReviewSummary = {
  totalReviews: 0,
  averageRating: 0,
  unansweredCount: 0,
  ratingDistribution: {},
}

const EMPTY_MENTORING_BOARD: InstructorMentoringBoard = {
  projects: [],
  requests: [],
  ongoingProjects: [],
}

const EMPTY_ANALYTICS_DASHBOARD: InstructorAnalyticsDashboard = {
  overview: {
    courseCount: 0,
    publishedCourseCount: 0,
    totalStudentCount: 0,
    activeStudentCount: 0,
    totalLessonCount: 0,
    completedLessonCount: 0,
    averageProgressPercent: 0,
  },
  courseOptions: [],
  students: [],
  courseProgress: [],
  completionRates: [],
  averageWatchTimes: [],
  dropOffs: [],
  difficultyItems: [],
  quizStats: {
    summary: {
      totalAttempts: 0,
      passedAttempts: 0,
      averageScoreRate: 0,
      averageTimeSpentSeconds: 0,
    },
    items: [],
  },
  assignmentStats: {
    summary: {
      totalSubmissions: 0,
      gradedSubmissions: 0,
      averageScore: 0,
      passRate: 0,
    },
    items: [],
  },
  funnel: {
    steps: [],
  },
  weakPoints: [],
  aiInsights: [],
}

const SOFT_CARD =
  'rounded-[16px] border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-[box-shadow,border-color] duration-200 hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
const SOFT_PANEL =
  'rounded-[16px] border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
const SOFT_LIST_ITEM =
  'rounded-xl border border-gray-100 bg-gray-50 p-3 transition duration-200 hover:bg-gray-100'

function DashboardTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[32px] items-center rounded-[8px] px-[14px] text-[12px] font-semibold leading-none transition duration-200 ${
        active
          ? 'bg-white text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
          : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

function DashboardMetricCard({
  title,
  value,
  helper,
  helperTone,
  icon,
  iconTone,
  valueTone = 'text-gray-900',
  accent,
}: {
  title: string
  value: string
  helper: string
  helperTone: string
  icon: string
  iconTone: string
  valueTone?: string
  accent?: string
}) {
  return (
    <article className={`${SOFT_CARD} p-5 ${accent ?? ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-gray-500">{title}</p>
          <h3 className={`mt-1 text-2xl font-semibold leading-tight ${valueTone}`}>{value}</h3>
          <p className={`mt-1 text-xs font-medium ${helperTone}`}>{helper}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] ${iconTone}`}>
          <i className={icon} />
        </div>
      </div>
    </article>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex h-full min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
      <i className={`${icon} mb-2 text-lg text-gray-300`} />
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
    </div>
  )
}

function toTimestamp(value: string | null) {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function isOlderThanHours(value: string | null, hours: number) {
  const timestamp = toTimestamp(value)

  if (timestamp === null) {
    return false
  }

  return Date.now() - timestamp >= hours * 60 * 60 * 1000
}

function isStudentStalled(student: InstructorAnalyticsStudentItem) {
  if (student.completed) {
    return false
  }

  const reference = student.lastAccessedAt ?? student.enrolledAt
  const timestamp = toTimestamp(reference)

  if (timestamp === null) {
    return false
  }

  return Date.now() - timestamp >= 7 * 24 * 60 * 60 * 1000
}

function formatElapsed(value: string | null) {
  const timestamp = toTimestamp(value)

  if (timestamp === null) {
    return '시간 정보 없음'
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))

  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`
  return `${Math.floor(diffMinutes / 1440)}일 전`
}

function compareCreatedDesc(
  left: { createdAt: string | null },
  right: { createdAt: string | null },
) {
  return (toTimestamp(right.createdAt) ?? 0) - (toTimestamp(left.createdAt) ?? 0)
}

function compareCreatedAsc(
  left: { createdAt: string | null },
  right: { createdAt: string | null },
) {
  return (toTimestamp(left.createdAt) ?? Number.MAX_SAFE_INTEGER) - (toTimestamp(right.createdAt) ?? Number.MAX_SAFE_INTEGER)
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, value))
}

function formatPercent(value: number) {
  return `${Math.round(clampPercent(value))}%`
}

function getModeLabel(mode: string) {
  if (mode === 'study') return '스터디'
  if (mode === 'team') return '팀'
  return mode
}

function buildInsightText({
  topDropOff,
  unansweredCount,
  stalledLearnerCount,
}: {
  topDropOff: InstructorAnalyticsDropOffItem | null
  unansweredCount: number
  stalledLearnerCount: number
}) {
  if (topDropOff) {
    return `${topDropOff.lessonTitle} 구간에서 이탈률 ${formatPercent(topDropOff.dropOffRate)}가 확인됐습니다. 해당 강의의 설명, 예제, 과제 안내를 먼저 점검해보세요.`
  }

  if (unansweredCount > 0) {
    return `미답변 질문 ${unansweredCount}건이 남아 있습니다. 오래된 질문부터 처리하면 학습자 대기 시간을 줄일 수 있습니다.`
  }

  if (stalledLearnerCount > 0) {
    return `7일 이상 학습 활동이 멈춘 학습자가 ${stalledLearnerCount}명 있습니다. 공지나 보충 자료로 복귀를 유도해보세요.`
  }

  return '현재 즉시 조치가 필요한 운영 지표는 없습니다. 새 질문, 리뷰, 학습 이탈 데이터가 생기면 이 영역에 우선순위가 표시됩니다.'
}

function DropOffTrendChart({ items }: { items: InstructorAnalyticsDropOffItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartItems = useMemo(() => items.slice(0, 6), [items])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || chartItems.length === 0) {
      return
    }

    const labels = chartItems.map((_, index) => `섹션 ${index + 1}`)
    const chart = new ChartJS(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '누적 이탈률 (%)',
            data: chartItems.map((item) => clampPercent(item.dropOffRate)),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#3B82F6',
            pointBorderWidth: 2,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                const index = tooltipItems[0]?.dataIndex ?? 0
                return chartItems[index]?.lessonTitle ?? labels[index] ?? ''
              },
              label: (context) => `누적 이탈률 ${Math.round(Number(context.parsed.y) || 0)}%`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: {
              color: '#6B7280',
              font: { family: 'Pretendard', size: 10 },
              callback: (value) => `${value}%`,
            },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#6B7280',
              font: { family: 'Pretendard', weight: 500, size: 11 },
            },
          },
        },
      },
    })

    return () => chart.destroy()
  }, [chartItems])

  if (chartItems.length === 0) {
    return (
      <EmptyState
        icon="fas fa-chart-line"
        title="이탈 데이터 없음"
        description="학습 기록이 쌓이면 강의 구간별 이탈률이 표시됩니다."
      />
    )
  }

  return (
    <div className="relative h-[160px] min-h-[140px] w-full flex-1">
      <canvas ref={canvasRef} className="!h-full !w-full" aria-label="강의 이탈률 추이" />
    </div>
  )
}

function ReviewStars({ rating }: { rating: number }) {
  const filledCount = Math.round(clampPercent((rating / 5) * 100) / 20)

  return (
    <div className="flex items-center gap-0.5 text-[11px] text-yellow-400">
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className={index < filledCount ? 'fas fa-star' : 'far fa-star'} />
      ))}
    </div>
  )
}

function QuickReplyModal({
  question,
  draft,
  error,
  submitting,
  onDraftChange,
  onCancel,
  onSubmit,
}: {
  question: InstructorQnaInboxItem | null
  draft: string
  error: string | null
  submitting: boolean
  onDraftChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  if (!question) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-900/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h3 className="text-[15px] font-semibold text-gray-900">
            <i className="fas fa-reply mr-1.5 text-brand" />
            빠른 답변 작성
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="닫기"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="bg-white p-6">
          <div className="mb-5 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] font-semibold text-gray-900">{question.title}</span>
              <span className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500">
                {question.learnerName ?? '학습자'}
              </span>
            </div>
            <p className="line-clamp-3 text-xs leading-5 text-gray-600">{question.content}</p>
          </div>

          <label htmlFor="quick-reply-content" className="mb-2 block text-xs font-semibold text-gray-700">
            답변 내용
          </label>
          <textarea
            id="quick-reply-content"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            className="h-36 w-full resize-none rounded-lg border border-gray-200 bg-white p-3.5 text-[13px] text-gray-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-green-100"
            placeholder="학습자에게 전달할 답변을 작성해주세요."
          />
          {error ? <p className="mt-2 text-xs font-medium text-red-500">{error}</p> : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 transition hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-lg bg-gray-900 px-5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '등록 중' : '답변 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LearningMetricsGrid({
  unansweredCount,
  overdueQuestionCount,
  pendingReviewCount,
  stalledLearnerCount,
  issueReviewCount,
}: {
  unansweredCount: number
  overdueQuestionCount: number
  pendingReviewCount: number
  stalledLearnerCount: number
  issueReviewCount: number
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      <DashboardMetricCard
        title="미답변 질문"
        value={`${formatNumber(unansweredCount)}건`}
        helper={`${formatNumber(overdueQuestionCount)}건 24시간 초과`}
        helperTone={overdueQuestionCount > 0 ? 'text-red-500' : 'text-gray-500'}
        icon="fas fa-comment-dots"
        iconTone="bg-red-50 text-red-500"
        valueTone="text-red-600"
        accent={unansweredCount > 0 ? 'border-l-2 border-l-red-400' : undefined}
      />
      <DashboardMetricCard
        title="새 리뷰"
        value={`${formatNumber(pendingReviewCount)}건`}
        helper="답글 작성 대기"
        helperTone="text-gray-500"
        icon="fas fa-star"
        iconTone="bg-yellow-50 text-yellow-600"
      />
      <DashboardMetricCard
        title="학습 정체 학습자"
        value={`${formatNumber(stalledLearnerCount)}명`}
        helper="7일 이상 활동 없음"
        helperTone={stalledLearnerCount > 0 ? 'text-orange-500' : 'text-gray-500'}
        icon="fas fa-user-clock"
        iconTone="bg-orange-50 text-orange-500"
        valueTone={stalledLearnerCount > 0 ? 'text-orange-600' : 'text-gray-900'}
        accent={stalledLearnerCount > 0 ? 'border-l-2 border-l-orange-400' : undefined}
      />
      <DashboardMetricCard
        title="콘텐츠 이슈"
        value={`${formatNumber(issueReviewCount)}건`}
        helper="리뷰 이슈 태그 기준"
        helperTone="text-gray-500"
        icon="fas fa-bug"
        iconTone="bg-gray-100 text-gray-500"
      />
    </div>
  )
}

function IssueReviewList({ issueReviews }: { issueReviews: InstructorReviewListItem[] }) {
  if (issueReviews.length === 0) {
    return (
      <EmptyState
        icon="fas fa-check-circle"
        title="접수된 이슈 없음"
        description="숨김 처리되었거나 이슈 태그가 달린 리뷰가 없습니다."
      />
    )
  }

  return (
    <div className="space-y-3">
      {issueReviews.slice(0, 3).map((review) => (
        <a
          key={review.reviewId}
          href="/instructor-reviews"
          className={`${SOFT_LIST_ITEM} block`}
        >
          <div className="mb-1.5 flex items-start justify-between gap-3">
            <span className="rounded-md border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
              {review.issueTags[0] ?? (review.hidden ? '숨김 처리' : '이슈')}
            </span>
            <span className="shrink-0 text-[11px] font-medium text-gray-400">{formatElapsed(review.createdAt)}</span>
          </div>
          <p className="mb-0.5 truncate text-[13px] font-medium text-gray-900">{review.courseTitle}</p>
          <p className="truncate text-xs text-gray-500">{review.content}</p>
        </a>
      ))}
    </div>
  )
}

function QnaListPanel({
  questions,
  onReply,
}: {
  questions: InstructorQnaInboxItem[]
  onReply: (question: InstructorQnaInboxItem) => void
}) {
  return (
    <article className={`${SOFT_PANEL} flex min-h-[300px] flex-col overflow-hidden`}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-[#F9FAFB] p-4">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
          <i className="fas fa-bolt text-yellow-500" />
          답변이 필요한 Q&amp;A
        </h3>
        <a href="/instructor-qna" className="text-xs font-medium text-gray-500 transition hover:text-brand">
          게시판 가기
          <i className="fas fa-chevron-right ml-1 text-[10px]" />
        </a>
      </div>

      <div className="hidden shrink-0 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5 text-[11px] font-medium text-gray-400 md:flex">
        <div className="w-36 shrink-0">강의 / 학습자</div>
        <div className="flex-1 px-4">질문 내용</div>
        <div className="w-32 shrink-0 text-right">대기 시간 / 조치</div>
      </div>

      {questions.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {questions.slice(0, 5).map((question) => {
            const overdue = isOlderThanHours(question.createdAt, 24)

            return (
              <div
                key={question.questionId}
                className={`grid gap-3 px-4 py-4 transition duration-200 hover:bg-gray-50/80 md:grid-cols-[9rem_minmax(0,1fr)_8rem] md:items-center ${
                  overdue ? 'bg-red-50/30' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-600">{question.courseTitle ?? '강의 정보 없음'}</p>
                  <p className="mt-0.5 truncate text-[11px] text-gray-400">{question.learnerName ?? '학습자'}</p>
                </div>
                <div className="min-w-0 border-gray-100 md:border-l md:px-4">
                  <p className="mb-0.5 truncate text-[13px] font-semibold text-gray-900">{question.title}</p>
                  <p className="truncate text-xs text-gray-500">{question.content}</p>
                </div>
                <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:border-l md:border-gray-100 md:pl-4">
                  <span className={`text-[11px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                    <i className={`${overdue ? 'fas fa-exclamation-circle' : 'far fa-clock'} mr-1 text-[10px]`} />
                    {formatElapsed(question.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onReply(question)}
                    className={`w-28 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition ${
                      overdue
                        ? 'bg-gray-900 text-white hover:bg-black'
                        : 'border border-gray-200 bg-white text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-gray-50'
                    }`}
                  >
                    답변하기
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-1 p-5">
          <EmptyState
            icon="fas fa-comment-dots"
            title="미답변 질문 없음"
            description="새 질문이 등록되면 실제 Q&A 데이터 기준으로 이 목록에 표시됩니다."
          />
        </div>
      )}
    </article>
  )
}

function AssignmentStatsCard({ summary }: { summary: InstructorAnalyticsDashboard['assignmentStats']['summary'] }) {
  const passRate = clampPercent(summary.passRate)
  const failRate = summary.totalSubmissions > 0 ? clampPercent(100 - passRate) : 0

  return (
    <article className="rounded-lg border border-gray-800/90 bg-[#111827] p-5 text-white shadow-[0_14px_28px_rgba(17,24,39,0.18)]">
      <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-gray-100">
        <i className="fas fa-magic text-brand" />
        자동 채점 현황
      </h3>
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-xs font-normal text-gray-300">
            <span>전체 제출 과제</span>
            <span className="font-medium text-white">{formatNumber(summary.totalSubmissions)}건</span>
          </div>
          <div className="mb-1 flex justify-between text-xs font-normal text-gray-300">
            <span>채점 완료</span>
            <span className="font-medium text-white">{formatNumber(summary.gradedSubmissions)}건</span>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs font-normal text-gray-300">
            <span>1차 통과</span>
            <span className="font-medium text-brand">{formatPercent(passRate)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand" style={{ width: `${passRate}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs font-normal text-gray-300">
            <span>재검토 필요</span>
            <span className="font-medium text-yellow-400">{formatPercent(failRate)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-yellow-400" style={{ width: `${failRate}%` }} />
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-[11px] leading-5 text-gray-400">
            제출, 채점 완료, 통과율은 평가 API의 실제 과제 제출 통계로 계산됩니다.
          </p>
        </div>
      </div>
    </article>
  )
}

function LatestReviewsCard({
  latestReviews,
  pendingCount,
}: {
  latestReviews: InstructorReviewListItem[]
  pendingCount: number
}) {
  return (
    <article className={`${SOFT_PANEL} flex min-h-[300px] flex-col p-5`}>
      <h3 className="mb-4 flex shrink-0 items-center justify-between gap-3 text-[14px] font-semibold text-gray-900">
        <span className="flex items-center gap-2">
          <i className="fas fa-star text-yellow-500" />
          신규 리뷰
        </span>
        <span className="rounded-full border border-yellow-100 bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-600">
          {formatNumber(pendingCount)}건 대기
        </span>
      </h3>

      {latestReviews.length > 0 ? (
        <div className="flex-1 space-y-3 overflow-y-auto">
          {latestReviews.slice(0, 4).map((review) => (
            <a
              key={review.reviewId}
              href="/instructor-reviews"
              className={`${SOFT_LIST_ITEM} block`}
            >
              <ReviewStars rating={review.rating} />
              <p className="mt-1.5 truncate text-[13px] font-medium text-gray-800">{review.courseTitle}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{review.content}</p>
              <p className="mt-2 text-[10px] font-normal text-gray-400">
                {formatElapsed(review.createdAt)} · {review.learnerName}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="fas fa-star"
          title="등록된 리뷰 없음"
          description="학습자가 리뷰를 작성하면 최신순으로 표시됩니다."
        />
      )}

      <a
        href="/instructor-reviews"
        className="mt-4 block shrink-0 rounded-lg border border-gray-200 bg-white py-2 text-center text-[13px] font-medium text-gray-700 transition hover:bg-gray-50"
      >
        리뷰 전체 보기
      </a>
    </article>
  )
}

function LearningSummaryCard({
  publishedCourseCount,
  totalStudents,
  averageProgress,
  averageRating,
}: {
  publishedCourseCount: number
  totalStudents: number
  averageProgress: number
  averageRating: number
}) {
  return (
    <article className={`${SOFT_PANEL} p-5`}>
      <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-gray-900">
        <i className="fas fa-users text-brand" />
        강의 운영 요약
      </h3>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <p className="text-xs font-medium text-gray-500">공개 강의</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(publishedCourseCount)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <p className="text-xs font-medium text-gray-500">수강생</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(totalStudents)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <p className="text-xs font-medium text-gray-500">평균 진도</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatPercent(averageProgress)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <p className="text-xs font-medium text-gray-500">평균 평점</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{averageRating.toFixed(1)}</p>
        </div>
      </div>
    </article>
  )
}

function LearningDashboardContent({
  unansweredQuestions,
  sortedUnansweredQuestions,
  overdueQuestionCount,
  issueReviews,
  reviewSummary,
  latestReviews,
  pendingReviews,
  stalledLearners,
  sortedDropOffs,
  selectedDropOffCourseId,
  dropOffLoading,
  analytics,
  insightText,
  publishedCourseCount,
  totalStudents,
  averageProgress,
  onReply,
  onDropOffCourseChange,
}: {
  unansweredQuestions: InstructorQnaInboxItem[]
  sortedUnansweredQuestions: InstructorQnaInboxItem[]
  overdueQuestionCount: number
  issueReviews: InstructorReviewListItem[]
  reviewSummary: InstructorReviewSummary
  latestReviews: InstructorReviewListItem[]
  pendingReviews: InstructorReviewListItem[]
  stalledLearners: InstructorAnalyticsStudentItem[]
  sortedDropOffs: InstructorAnalyticsDropOffItem[]
  selectedDropOffCourseId: number | null
  dropOffLoading: boolean
  analytics: InstructorAnalyticsDashboard
  insightText: string
  publishedCourseCount: number
  totalStudents: number
  averageProgress: number
  onReply: (question: InstructorQnaInboxItem) => void
  onDropOffCourseChange: (courseId: number | null) => void
}) {
  return (
    <div>
      <LearningMetricsGrid
        unansweredCount={unansweredQuestions.length}
        overdueQuestionCount={overdueQuestionCount}
        pendingReviewCount={reviewSummary.unansweredCount}
        stalledLearnerCount={stalledLearners.length}
        issueReviewCount={issueReviews.length}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <article className="rounded-lg border border-green-200/80 bg-[linear-gradient(135deg,#F0FDF4_0%,#FFFFFF_100%)] p-5 shadow-[0_8px_18px_rgba(16,185,129,0.08)]">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-[0_8px_16px_rgba(0,196,113,0.22)]">
                <i className="fas fa-robot text-base" />
              </div>
              <div>
                <h3 className="mb-1 text-[14px] font-semibold text-gray-900">운영 인사이트</h3>
                <p className="text-[13px] leading-6 text-gray-600">{insightText}</p>
              </div>
            </div>
          </article>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <article className={`${SOFT_PANEL} flex flex-col p-5`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
                  <i className="fas fa-chart-area text-blue-500" />
                  이탈 위험 분석
                </h3>
                <select
                  className="cursor-pointer rounded border border-gray-200 bg-white p-1.5 text-[12px] font-medium text-gray-600 shadow-sm outline-none transition focus:border-brand disabled:cursor-wait disabled:opacity-60"
                  value={selectedDropOffCourseId === null ? 'all' : String(selectedDropOffCourseId)}
                  disabled={dropOffLoading}
                  aria-label="이탈 위험 분석 강의 선택"
                  onChange={(event) => {
                    const nextValue = event.target.value
                    onDropOffCourseChange(nextValue === 'all' ? null : Number(nextValue))
                  }}
                >
                  <option value="all">전체 강의</option>
                  {analytics.courseOptions.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <DropOffTrendChart items={sortedDropOffs} />
            </article>

            <article className={`${SOFT_PANEL} flex min-h-[240px] flex-col p-5`}>
              <h3 className="mb-4 flex items-center justify-between gap-3 text-[14px] font-semibold text-gray-900">
                <span className="flex items-center gap-2">
                  <i className="fas fa-bug text-gray-400" />
                  콘텐츠 오류/이슈
                </span>
              </h3>
              <IssueReviewList issueReviews={issueReviews} />
            </article>
          </div>

          <QnaListPanel questions={sortedUnansweredQuestions} onReply={onReply} />
        </div>

        <div className="flex flex-col gap-6">
          <AssignmentStatsCard summary={analytics.assignmentStats.summary} />
          <LatestReviewsCard latestReviews={latestReviews} pendingCount={pendingReviews.length} />
          <LearningSummaryCard
            publishedCourseCount={publishedCourseCount}
            totalStudents={totalStudents}
            averageProgress={averageProgress}
            averageRating={reviewSummary.averageRating}
          />
        </div>
      </div>
    </div>
  )
}

function MentoringDashboardContent({ mentoringBoard }: { mentoringBoard: InstructorMentoringBoard }) {
  const pendingMentoringRequests = mentoringBoard.requests.length
  const recruitingProjects = mentoringBoard.projects.length
  const ongoingProjects = mentoringBoard.ongoingProjects.length
  const mentoringFillRate =
    mentoringBoard.projects.length > 0
      ? Math.round(
          (mentoringBoard.projects.reduce((sum, item) => sum + item.current, 0) /
            Math.max(1, mentoringBoard.projects.reduce((sum, item) => sum + item.total, 0))) *
            100,
        )
      : 0

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="모집 중"
          value={`${formatNumber(recruitingProjects)}개`}
          helper={`대기 신청 ${formatNumber(pendingMentoringRequests)}건`}
          helperTone="text-blue-600"
          icon="fas fa-layer-group"
          iconTone="bg-blue-50 text-blue-500"
        />
        <DashboardMetricCard
          title="진행 중"
          value={`${formatNumber(ongoingProjects)}개`}
          helper="현재 운영 중"
          helperTone="text-gray-500"
          icon="fas fa-video"
          iconTone="bg-purple-50 text-purple-500"
          accent="border-l-2 border-l-purple-500"
        />
        <DashboardMetricCard
          title="검토 중"
          value={`${formatNumber(pendingMentoringRequests)}건`}
          helper="신청서 검토 대기"
          helperTone="text-gray-500"
          icon="fas fa-project-diagram"
          iconTone="bg-gray-50 text-gray-500"
        />
        <DashboardMetricCard
          title="충원율"
          value={`${formatPercent(mentoringFillRate)}`}
          helper="프로젝트 좌석 충원"
          helperTone="text-green-600"
          icon="fas fa-thumbs-up"
          iconTone="bg-green-50 text-green-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <article className="rounded-lg border border-blue-200/80 bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_100%)] p-5 shadow-[0_8px_18px_rgba(59,130,246,0.08)]">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white shadow-[0_8px_16px_rgba(59,130,246,0.2)]">
                <i className="fas fa-lightbulb" />
              </div>
              <div>
                <h3 className="mb-1 text-[15px] font-semibold text-gray-900">멘토링 브리프</h3>
                <p className="text-sm leading-6 text-gray-600">
                  {pendingMentoringRequests > 0
                    ? `새 신청 ${formatNumber(pendingMentoringRequests)}건이 대기 중입니다. 신청서 검토 후 프로젝트 참여 여부를 확정해주세요.`
                    : '대기 중인 신청은 없습니다. 진행 중인 프로젝트 일정과 다음 액션을 확인해주세요.'}
                </p>
              </div>
            </div>
          </article>

          <article className={`${SOFT_PANEL} p-5`}>
            <h3 className="mb-6 flex items-center gap-2 text-base font-semibold text-gray-900">
              <i className="fas fa-users text-sm text-gray-400" />
              프로젝트 진행 현황
            </h3>

            {mentoringBoard.ongoingProjects.length > 0 ? (
              <div className="space-y-8">
                {mentoringBoard.ongoingProjects.slice(0, 2).map((project) => (
                  <div key={project.id}>
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-gray-900">{project.title}</h4>
                        <p className="mt-1 truncate text-[11px] text-gray-400">{project.subtitle}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600">
                        {project.week}주차 ({project.progress}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${clampPercent(project.progress)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="fas fa-users"
                title="진행 중인 프로젝트 없음"
                description="멘토링 프로젝트가 시작되면 진행률이 표시됩니다."
              />
            )}
          </article>

          <article className={`${SOFT_PANEL} overflow-hidden`}>
            <div className="border-b border-gray-100 bg-white p-5">
              <h3 className="text-base font-semibold text-gray-900">신청 대기열</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-gray-100">
                  {mentoringBoard.requests.length > 0 ? (
                    mentoringBoard.requests.slice(0, 3).map((request) => (
                      <tr key={request.id} className="transition hover:bg-gray-50">
                        <td className="w-20 px-6 py-4">
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase">
                            {getModeLabel(request.mode)}
                          </span>
                        </td>
                        <td className="min-w-48 px-4 font-semibold text-gray-900">{request.projectTitle}</td>
                        <td className="px-4 text-xs text-gray-400">{request.role}</td>
                        <td className="px-6 text-right font-semibold text-blue-500">{request.applicantName}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-6 py-8 text-center text-sm font-medium text-gray-400" colSpan={4}>
                        대기 중인 신청이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="space-y-5">
          <article className={`${SOFT_PANEL} p-5`}>
            <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <i className="fas fa-calendar-alt text-brand" />
              멘토링 타임라인
            </h3>
            {mentoringBoard.ongoingProjects.length > 0 ? (
              <div className="space-y-4">
                {mentoringBoard.ongoingProjects.slice(0, 2).map((project, index) => (
                  <div
                    key={project.id}
                    className={`relative rounded-lg border p-4 ${
                      index === 0 ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-80'
                    }`}
                  >
                    <p className={`mb-1 text-xs font-semibold ${index === 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {project.week}주차
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{project.primaryAction}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="fas fa-calendar-alt"
                title="예정된 액션 없음"
                description="진행 중인 프로젝트의 다음 액션이 표시됩니다."
              />
            )}
          </article>

          <article className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white/70 py-10 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-gray-200 text-lg text-gray-500">
              <i className="fas fa-plus" />
            </div>
            <p className="mb-3 text-sm font-semibold text-gray-400">새 멘토링 프로젝트 시작</p>
            <a
              href="/instructor-mentoring"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-xs font-semibold text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:bg-gray-50 hover:shadow-[0_6px_14px_rgba(15,23,42,0.06)]"
            >
              멘토링 보드 열기
            </a>
          </article>
        </div>
      </div>
    </div>
  )
}

export default function InstructorDashboardPage({ session }: { session: AuthSession }) {
  const dropOffRequestIdRef = useRef(0)
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('learning')
  const [courses, setCourses] = useState<InstructorCourseListItem[]>([])
  const [reviewSummary, setReviewSummary] = useState<InstructorReviewSummary>(EMPTY_REVIEW_SUMMARY)
  const [reviews, setReviews] = useState<InstructorReviewListItem[]>([])
  const [unansweredQuestions, setUnansweredQuestions] = useState<InstructorQnaInboxItem[]>([])
  const [analytics, setAnalytics] = useState<InstructorAnalyticsDashboard>(EMPTY_ANALYTICS_DASHBOARD)
  const [selectedDropOffCourseId, setSelectedDropOffCourseId] = useState<number | null>(null)
  const [dropOffItems, setDropOffItems] = useState<InstructorAnalyticsDropOffItem[]>([])
  const [dropOffLoading, setDropOffLoading] = useState(false)
  const [mentoringBoard, setMentoringBoard] = useState<InstructorMentoringBoard>(EMPTY_MENTORING_BOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadWarning, setLoadWarning] = useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<InstructorQnaInboxItem | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const [replySubmitting, setReplySubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const requests = [
      instructorCourseApi.getCourses(controller.signal),
      instructorReviewApi.getSummary(controller.signal),
      instructorReviewApi.getReviews(controller.signal),
      instructorQnaApi.getInbox('UNANSWERED', controller.signal),
      instructorMentoringApi.getBoard(controller.signal),
      instructorAnalyticsApi.getDashboard(undefined, controller.signal),
    ] as const

    setLoading(true)
    setError(null)
    setLoadWarning(null)

    Promise.allSettled(requests)
      .then((results) => {
        if (controller.signal.aborted) {
          return
        }

        const failures = results.filter((result) => result.status === 'rejected')

        if (failures.length === results.length) {
          const firstError = failures[0]
          setError(firstError.reason instanceof Error ? firstError.reason.message : '강사 대시보드 데이터를 불러오지 못했습니다.')
          return
        }

        const [
          coursesResult,
          reviewSummaryResult,
          reviewsResult,
          qnaResult,
          mentoringBoardResult,
          analyticsResult,
        ] = results

        setCourses(coursesResult.status === 'fulfilled' ? coursesResult.value : [])
        setReviewSummary(reviewSummaryResult.status === 'fulfilled' ? reviewSummaryResult.value : EMPTY_REVIEW_SUMMARY)
        setReviews(reviewsResult.status === 'fulfilled' ? reviewsResult.value : [])
        setUnansweredQuestions(qnaResult.status === 'fulfilled' ? qnaResult.value : [])
        setMentoringBoard(mentoringBoardResult.status === 'fulfilled' ? mentoringBoardResult.value : EMPTY_MENTORING_BOARD)

        const nextAnalytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : EMPTY_ANALYTICS_DASHBOARD
        setAnalytics(nextAnalytics)
        setDropOffItems(nextAnalytics.dropOffs)

        if (failures.length > 0) {
          setLoadWarning('일부 강사 데이터만 불러왔습니다. 새로고침하면 누락된 항목을 다시 요청합니다.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedQuestion) {
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeQuickReply()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedQuestion])

  const sortedUnansweredQuestions = useMemo(
    () => [...unansweredQuestions].sort(compareCreatedAsc),
    [unansweredQuestions],
  )
  const latestReviews = useMemo(() => [...reviews].sort(compareCreatedDesc), [reviews])
  const issueReviews = useMemo(
    () =>
      reviews
        .filter((review) => review.hidden || review.issueTags.length > 0)
        .sort(compareCreatedDesc),
    [reviews],
  )
  const pendingReviews = useMemo(
    () => latestReviews.filter((review) => !review.reply),
    [latestReviews],
  )
  const stalledLearners = useMemo(
    () => analytics.students.filter(isStudentStalled),
    [analytics.students],
  )
  const sortedDropOffs = useMemo(
    () => [...dropOffItems].sort((left, right) => right.dropOffRate - left.dropOffRate),
    [dropOffItems],
  )

  async function handleDropOffCourseChange(courseId: number | null) {
    setSelectedDropOffCourseId(courseId)

    const requestId = dropOffRequestIdRef.current + 1
    dropOffRequestIdRef.current = requestId
    setDropOffLoading(true)

    try {
      const nextAnalytics = await instructorAnalyticsApi.getDashboard(courseId ?? undefined)

      if (dropOffRequestIdRef.current !== requestId) {
        return
      }

      setDropOffItems(nextAnalytics.dropOffs)
    } catch (dropOffError) {
      if (dropOffRequestIdRef.current === requestId) {
        setLoadWarning(
          dropOffError instanceof Error
            ? dropOffError.message
            : '선택한 강의의 이탈 위험 데이터를 불러오지 못했습니다.',
        )
      }
    } finally {
      if (dropOffRequestIdRef.current === requestId) {
        setDropOffLoading(false)
      }
    }
  }

  function openQuickReply(question: InstructorQnaInboxItem) {
    setSelectedQuestion(question)
    setReplyDraft('')
    setReplyError(null)
  }

  function closeQuickReply() {
    if (replySubmitting) {
      return
    }

    setSelectedQuestion(null)
    setReplyDraft('')
    setReplyError(null)
  }

  async function submitQuickReply() {
    if (!selectedQuestion) {
      return
    }

    const content = replyDraft.trim()

    if (!content) {
      setReplyError('답변 내용을 입력해주세요.')
      return
    }

    setReplySubmitting(true)
    setReplyError(null)

    try {
      await instructorQnaApi.createAnswer(selectedQuestion.questionId, content)
      setUnansweredQuestions((current) => current.filter((item) => item.questionId !== selectedQuestion.questionId))
      window.dispatchEvent(new CustomEvent('devpath:instructor-qna-updated'))
      setSelectedQuestion(null)
      setReplyDraft('')
    } catch (submitError) {
      setReplyError(submitError instanceof Error ? submitError.message : '답변을 등록하지 못했습니다.')
    } finally {
      setReplySubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingCard label="강사 대시보드를 불러오는 중입니다." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorCard message={error} />
      </div>
    )
  }

  const totalStudents =
    analytics.overview.totalStudentCount > 0
      ? analytics.overview.totalStudentCount
      : courses.reduce((sum, item) => sum + item.studentCount, 0)
  const publishedCourseCount =
    analytics.overview.publishedCourseCount > 0
      ? analytics.overview.publishedCourseCount
      : courses.length
  const averageProgress =
    analytics.overview.averageProgressPercent > 0
      ? analytics.overview.averageProgressPercent
      : courses.length > 0
        ? courses.reduce((sum, item) => sum + item.averageProgressPercent, 0) / courses.length
        : 0
  const overdueQuestionCount = unansweredQuestions.filter((question) => isOlderThanHours(question.createdAt, 24)).length
  const insightText = buildInsightText({
    topDropOff: sortedDropOffs[0] ?? null,
    unansweredCount: unansweredQuestions.length,
    stalledLearnerCount: stalledLearners.length,
  })

  return (
    <div className="min-h-[calc(100dvh-var(--app-header-height))] bg-[#F8F9FA]">
      <section className="border-b border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">수강 관리 센터</h1>
            <p className="mt-1 text-sm text-gray-500">
              {session.name} 강사님의 강의 운영 이슈와 조치 항목을 실제 데이터 기준으로 확인합니다.
            </p>
          </div>

          <div className="inline-flex w-fit rounded-[12px] bg-[#F3F4F6] p-1">
            <DashboardTabButton active={activeTab === 'learning'} onClick={() => setActiveTab('learning')}>
              강의 운영
            </DashboardTabButton>
            <DashboardTabButton active={activeTab === 'mentoring'} onClick={() => setActiveTab('mentoring')}>
              멘토링 프로젝트
            </DashboardTabButton>
          </div>
        </div>
      </section>

      <div className="p-5 sm:p-6 lg:p-8">
        {loadWarning ? (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {loadWarning}
          </div>
        ) : null}

        {activeTab === 'learning' ? (
          <LearningDashboardContent
            unansweredQuestions={unansweredQuestions}
            sortedUnansweredQuestions={sortedUnansweredQuestions}
            overdueQuestionCount={overdueQuestionCount}
            issueReviews={issueReviews}
            reviewSummary={reviewSummary}
            latestReviews={latestReviews}
            pendingReviews={pendingReviews}
            stalledLearners={stalledLearners}
            sortedDropOffs={sortedDropOffs}
            selectedDropOffCourseId={selectedDropOffCourseId}
            dropOffLoading={dropOffLoading}
            analytics={analytics}
            insightText={insightText}
            publishedCourseCount={publishedCourseCount}
            totalStudents={totalStudents}
            averageProgress={averageProgress}
            onReply={openQuickReply}
            onDropOffCourseChange={handleDropOffCourseChange}
          />
        ) : (
          <MentoringDashboardContent mentoringBoard={mentoringBoard} />
        )}
      </div>

      <QuickReplyModal
        question={selectedQuestion}
        draft={replyDraft}
        error={replyError}
        submitting={replySubmitting}
        onDraftChange={setReplyDraft}
        onCancel={closeQuickReply}
        onSubmit={submitQuickReply}
      />
    </div>
  )
}
