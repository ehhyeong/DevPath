/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef } from 'react'
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
import type {
  InstructorAnalyticsDropOffItem,
  InstructorAnalyticsStudentItem,
  InstructorQnaInboxItem,
} from '../../types/instructor'

ChartJS.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip)

export const SOFT_CARD =
  'rounded-[16px] border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-[box-shadow,border-color] duration-200 hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
export const SOFT_PANEL =
  'rounded-[16px] border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
export const SOFT_LIST_ITEM =
  'rounded-xl border border-gray-100 bg-gray-50 p-3 transition duration-200 hover:bg-gray-100'

export function DashboardTabButton({
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
      className={`inline-flex h-[32px] items-center whitespace-nowrap rounded-[8px] px-[14px] text-[12px] font-semibold leading-none transition duration-200 ${
        active
          ? 'bg-white text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
          : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

export function DashboardMetricCard({
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
          <p className="truncate text-[13px] font-medium text-gray-500">{title}</p>
          <h3 className={`mt-1 truncate text-2xl font-semibold leading-tight ${valueTone}`}>{value}</h3>
          <p className={`mt-1 truncate text-xs font-medium ${helperTone}`}>{helper}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] ${iconTone}`}>
          <i className={icon} />
        </div>
      </div>
    </article>
  )
}

export function EmptyState({
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

export function toTimestamp(value: string | null) {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function isOlderThanHours(value: string | null, hours: number) {
  const timestamp = toTimestamp(value)

  if (timestamp === null) {
    return false
  }

  return Date.now() - timestamp >= hours * 60 * 60 * 1000
}

export function isStudentStalled(student: InstructorAnalyticsStudentItem) {
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

export function formatElapsed(value: string | null) {
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

export function compareCreatedDesc(
  left: { createdAt: string | null },
  right: { createdAt: string | null },
) {
  return (toTimestamp(right.createdAt) ?? 0) - (toTimestamp(left.createdAt) ?? 0)
}

export function compareCreatedAsc(
  left: { createdAt: string | null },
  right: { createdAt: string | null },
) {
  return (toTimestamp(left.createdAt) ?? Number.MAX_SAFE_INTEGER) - (toTimestamp(right.createdAt) ?? Number.MAX_SAFE_INTEGER)
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, value))
}

export function formatPercent(value: number) {
  return `${Math.round(clampPercent(value))}%`
}

export function getModeLabel(mode: string) {
  if (mode === 'study') return '스터디'
  if (mode === 'team') return '팀'
  return mode
}

export function buildInsightText({
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

export function DropOffTrendChart({ items }: { items: InstructorAnalyticsDropOffItem[] }) {
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

export function ReviewStars({ rating }: { rating: number }) {
  const filledCount = Math.round(clampPercent((rating / 5) * 100) / 20)

  return (
    <div className="flex items-center gap-0.5 text-[11px] text-yellow-400">
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className={index < filledCount ? 'fas fa-star' : 'far fa-star'} />
      ))}
    </div>
  )
}

export function QuickReplyModal({
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
          <h3 className="flex items-center whitespace-nowrap text-[15px] font-semibold text-gray-900">
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
            className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 transition hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="whitespace-nowrap rounded-lg bg-gray-900 px-5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '등록 중' : '답변 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}
