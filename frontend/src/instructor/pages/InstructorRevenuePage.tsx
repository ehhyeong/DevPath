import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { ErrorCard, LoadingCard, formatCurrency, formatDateTime, formatNumber } from '../../account/ui'
import { instructorRevenueApi } from '../../lib/api'
import type {
  InstructorRevenueCourseBreakdownItem,
  InstructorRevenueMonthlyItem,
  InstructorRevenueSummary,
  InstructorRevenueTransaction,
} from '../../types/instructor'

const COURSE_BREAKDOWN_COLORS = ['#00C471', '#3B82F6', '#9CA3AF']

function getTransactionStatusLabel(status: string) {
  switch (status) {
    case 'COMPLETED':
      return '정산 완료'
    case 'HELD':
      return '정산 보류'
    case 'PENDING':
    default:
      return '정산 대기'
  }
}

function getTransactionStatusTone(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-700'
    case 'HELD':
      return 'bg-gray-200 text-gray-700'
    case 'PENDING':
    default:
      return 'bg-yellow-100 text-yellow-700'
  }
}

function getFilterBaseDate(transaction: InstructorRevenueTransaction) {
  return transaction.purchasedAt ?? transaction.settledAt
}

function formatMonthKeyLabel(value: string) {
  const [yearText, monthText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return value
  }

  return `${month}월`
}

function formatManUnit(value: number) {
  if (value === 0) {
    return '0'
  }

  return `${Math.round(value / 10000)}만`
}

function calculateMonthlyChange(trend: InstructorRevenueMonthlyItem[]) {
  if (trend.length < 2) {
    return null
  }

  const current = trend[trend.length - 1]?.amount ?? 0
  const previous = trend[trend.length - 2]?.amount ?? 0

  if (previous <= 0) {
    return null
  }

  return ((current - previous) / previous) * 100
}

function buildBreakdownItems(summary: InstructorRevenueSummary) {
  if (summary.courseBreakdown.length > 0) {
    return summary.courseBreakdown.map((item, index) => ({
      ...item,
      color: COURSE_BREAKDOWN_COLORS[index] ?? COURSE_BREAKDOWN_COLORS[COURSE_BREAKDOWN_COLORS.length - 1],
    }))
  }

  return [] as Array<InstructorRevenueCourseBreakdownItem & { color: string }>
}

export default function InstructorRevenuePage() {
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstanceRef = useRef<Chart<'bar'> | null>(null)
  const [summary, setSummary] = useState<InstructorRevenueSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeDays, setRangeDays] = useState('30')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('ALL')
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    instructorRevenueApi
      .getSummary(controller.signal)
      .then((nextSummary) => {
        setSummary(nextSummary)
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setError(nextError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  const yearlyTrend = summary?.monthlyTrend ?? []
  const availableYears = [...new Set(yearlyTrend.map((item) => item.key.split('-')[0]).filter(Boolean))]
  const visibleTrend = selectedYear === 'ALL'
    ? yearlyTrend
    : yearlyTrend.filter((item) => item.key.startsWith(`${selectedYear}-`))

  useEffect(() => {
    if (!chartCanvasRef.current || visibleTrend.length === 0) {
      return
    }

    chartInstanceRef.current?.destroy()

    const amounts = visibleTrend.map((item) => item.amount)
    const backgroundColor = visibleTrend.map((item, index) => {
      if (item.current) {
        return 'rgba(0, 196, 113, 1)'
      }

      const opacity = Math.min(0.18 + index * 0.12, 0.8)
      return `rgba(0, 196, 113, ${opacity})`
    })

    const borderColor = visibleTrend.map((item) => (
      item.current ? 'rgba(0, 196, 113, 1)' : 'rgba(0, 196, 113, 0.4)'
    ))

    chartInstanceRef.current = new Chart(chartCanvasRef.current, {
      type: 'bar',
      data: {
        labels: visibleTrend.map((item) => formatMonthKeyLabel(item.key)),
        datasets: [
          {
            data: amounts,
            backgroundColor,
            borderColor,
            borderWidth: 1,
            borderRadius: 8,
            barPercentage: 0.48,
            categoryPercentage: 0.72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.92)',
            displayColors: false,
            padding: 12,
            callbacks: {
              label(context) {
                return formatCurrency(Number(context.raw ?? 0))
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#F3F4F6',
            },
            ticks: {
              color: '#9CA3AF',
              font: {
                family: 'Pretendard',
                size: 11,
                weight: 600,
              },
              callback(value) {
                return formatManUnit(Number(value))
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#6B7280',
              font: {
                family: 'Pretendard',
                size: 12,
                weight: 600,
              },
            },
          },
        },
      },
    })

    return () => {
      chartInstanceRef.current?.destroy()
      chartInstanceRef.current = null
    }
  }, [visibleTrend])

  if (loading) {
    return (
      <div className="instructor-revenue-page p-6">
        <div className="instructor-revenue-content">
          <LoadingCard label="정산 리포트를 불러오는 중입니다." />
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="instructor-revenue-page p-6">
        <div className="instructor-revenue-content">
          <ErrorCard message={error ?? '정산 데이터를 불러오지 못했습니다.'} />
        </div>
      </div>
    )
  }

  const breakdownItems = buildBreakdownItems(summary)
  const monthlyChange = calculateMonthlyChange(visibleTrend)
  const settlementNetTotal = summary.netRevenue + summary.pendingSettlementAmount + summary.heldSettlementAmount
  const heldRatio = settlementNetTotal > 0 ? Math.round((summary.heldSettlementAmount / settlementNetTotal) * 100) : 0
  const now = new Date()
  const rangeCutoff = new Date(now)
  rangeCutoff.setDate(now.getDate() - Number(rangeDays))

  const filteredTransactions = summary.recentTransactions.filter((transaction) => {
    const baseDate = getFilterBaseDate(transaction)
    const matchesDate = !baseDate || new Date(baseDate) >= rangeCutoff
    const matchesStatus = statusFilter === 'ALL' || transaction.status === statusFilter
    const searchText = `${transaction.courseTitle} ${transaction.settlementId}`.toLowerCase()
    const matchesQuery = !query.trim() || searchText.includes(query.trim().toLowerCase())

    return matchesDate && matchesStatus && matchesQuery
  })

  const visibleTransactions = showAllTransactions ? filteredTransactions : filteredTransactions.slice(0, 6)

  return (
    <div className="instructor-revenue-page p-6">
      <div className="instructor-revenue-content mx-auto max-w-[1280px]">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">수익 리포트</h1>
            <p className="mt-1 text-sm text-gray-500">최근 정산 흐름과 수익 현황을 한 번에 확인해보세요.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm">
              <i className="fas fa-calendar-day text-blue-500" />
              <select
                value={rangeDays}
                onChange={(event) => setRangeDays(event.target.value)}
                className="h-full appearance-none bg-transparent pr-1 leading-none outline-none"
              >
                <option value="7">최근 7일</option>
                <option value="30">최근 30일</option>
                <option value="90">최근 90일</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => window.alert('리포트 다운로드 기능은 다음 단계에서 연결합니다.')}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-indigo-50"
            >
              <i className="fas fa-file-arrow-down text-indigo-500" />
              리포트 다운로드
            </button>

            <button
              type="button"
              onClick={() => window.alert('계좌 관리 기능은 다음 단계에서 연결합니다.')}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-rose-50"
            >
              <i className="fas fa-piggy-bank text-rose-500" />
              계좌 관리
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
            <p className="mb-2 text-xs font-bold uppercase text-gray-300">출금 가능 금액</p>
            <h3 className="mb-4 text-3xl font-bold">{formatCurrency(summary.netRevenue)}</h3>
            <button
              type="button"
              onClick={() => window.alert('정산 요청 기능은 다음 단계에서 연결합니다.')}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-green-600"
            >
              정산 요청하기
            </button>
            <p className="mt-3 text-[11px] text-gray-300">정산은 영업일 기준 3일 내 처리됩니다.</p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">이번 달 순수익</p>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-600">
                  {monthlyChange === null
                    ? '비교 데이터 없음'
                    : `${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(summary.monthlyRevenue)}</h3>
            </div>
            <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-xs font-medium text-gray-500">
              <span>총 매출: {formatCurrency(summary.totalRevenue)}</span>
              <span>플랫폼 수수료 -{Math.round(summary.platformFeeRate * 100)}%</span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-gray-500">정산 대기/보류</p>
              <h3 className="text-3xl font-bold text-gray-400">
                {formatCurrency(summary.pendingSettlementAmount + summary.heldSettlementAmount)}
              </h3>
            </div>
            <div className="mt-4">
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-yellow-400" style={{ width: `${heldRatio}%` }} />
              </div>
              <p className="text-xs font-medium text-gray-400">
                보류 {formatNumber(summary.heldSettlementCount)}건 / 대기 {formatNumber(summary.pendingSettlementCount)}건
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900">월별 수익 추이</h3>
              <label className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700">
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="h-full appearance-none bg-transparent leading-none outline-none"
                >
                  <option value="ALL">전체 연도</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="relative min-h-[260px] flex-1">
              {visibleTrend.length > 0 ? (
                <canvas ref={chartCanvasRef} />
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl bg-gray-50 text-sm font-medium text-gray-400">
                  월별 수익 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 font-semibold text-gray-900">강의별 수익 비중</h3>
            <div className="space-y-6">
              {breakdownItems.length > 0 ? (
                breakdownItems.map((item) => (
                  <div key={`${item.courseId ?? 'unknown'}-${item.courseTitle}`}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{item.courseTitle}</span>
                      <span className="font-semibold text-gray-900">{item.percentage}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-medium text-gray-400">{formatCurrency(item.amount)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-gray-50 px-4 py-10 text-center text-sm font-medium text-gray-400">
                  강의별 수익 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <h3 className="font-semibold text-gray-900">최근 거래 내역</h3>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm">
                <i className="fas fa-layer-group text-violet-500" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-full appearance-none bg-transparent leading-none outline-none"
                >
                  <option value="ALL">전체 상태</option>
                  <option value="PENDING">정산 대기</option>
                  <option value="HELD">정산 보류</option>
                  <option value="COMPLETED">정산 완료</option>
                </select>
              </label>

              <label className="inline-flex h-11 items-center rounded-xl border border-gray-300 bg-white px-3 shadow-sm">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="강의명 또는 정산 번호 검색"
                  className="h-full w-56 bg-transparent text-sm font-medium leading-none text-gray-700 outline-none placeholder:text-gray-400"
                />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-white text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3">주문 일시</th>
                  <th className="px-6 py-3">강의명</th>
                  <th className="px-6 py-3">결제 금액</th>
                  <th className="px-6 py-3">수수료 금액</th>
                  <th className="px-6 py-3">정산 예정액</th>
                  <th className="px-6 py-3">상태</th>
                </tr>
              </thead>

              <tbody className="font-medium text-gray-600">
                {visibleTransactions.length > 0 ? (
                  visibleTransactions.map((transaction) => (
                    <tr
                      key={transaction.settlementId}
                      className="border-b border-gray-50 bg-white transition hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">{formatDateTime(getFilterBaseDate(transaction))}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{transaction.courseTitle}</td>
                      <td className="px-6 py-4">{formatCurrency(transaction.grossAmount)}</td>
                      <td className="px-6 py-4 text-red-400">- {formatCurrency(transaction.feeAmount)}</td>
                      <td className="px-6 py-4 font-semibold text-primary">{formatCurrency(transaction.netAmount)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTransactionStatusTone(transaction.status)}`}
                        >
                          {getTransactionStatusLabel(transaction.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-gray-400">
                      조건에 맞는 거래 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length > 6 ? (
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center">
              <button
                type="button"
                onClick={() => setShowAllTransactions((current) => !current)}
                className="text-sm font-semibold text-gray-500 transition hover:text-gray-900"
              >
                {showAllTransactions ? '접기' : '더 보기'} <i className={`fas ml-1 ${showAllTransactions ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
