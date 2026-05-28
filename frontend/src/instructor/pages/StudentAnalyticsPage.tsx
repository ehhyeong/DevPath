import { useEffect, useState } from 'react'
import { ErrorCard, LoadingCard, formatNumber } from '../../account/ui'
import { buildInstructorCourseOptions } from '../../instructor/course-display'
import { instructorAnalyticsApi } from '../../lib/api'
import type { InstructorAnalyticsDashboard } from '../../types/instructor'

type Tone = 'safe' | 'warn' | 'danger'

function getDropoutTone(tone: Tone) {
  if (tone === 'danger') {
    return {
      container: 'border-red-100 bg-red-50/50',
      text: 'text-red-600',
      bar: 'from-red-500 to-red-600',
      progress: 55,
      message: 'text-red-700',
    }
  }

  if (tone === 'warn') {
    return {
      container: 'border-orange-100 bg-orange-50/50',
      text: 'text-orange-600',
      bar: 'from-orange-400 to-orange-500',
      progress: 72,
      message: 'text-orange-700',
    }
  }

  return {
    container: 'border-gray-100 bg-white',
    text: 'text-green-600',
    bar: 'from-green-300 to-green-500',
    progress: 92,
    message: 'text-gray-600',
  }
}

function getToneClasses(tone: 'red' | 'orange' | 'yellow' | 'green' | 'blue') {
  switch (tone) {
    case 'red':
      return 'bg-red-50 text-red-700 border-red-100'
    case 'orange':
      return 'bg-orange-50 text-orange-700 border-orange-100'
    case 'yellow':
      return 'bg-yellow-50 text-yellow-700 border-yellow-100'
    case 'green':
      return 'bg-green-50 text-green-700 border-green-100'
    case 'blue':
      return 'bg-blue-50 text-blue-700 border-blue-100'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-100'
  }
}

function getDifficultyTone(score: number): 'red' | 'orange' | 'yellow' {
  if (score >= 65) {
    return 'red'
  }

  if (score >= 40) {
    return 'orange'
  }

  return 'yellow'
}

function getAiInsightTone(level: string): 'red' | 'orange' | 'yellow' {
  if (level === 'HIGH') {
    return 'red'
  }

  if (level === 'MEDIUM') {
    return 'orange'
  }

  return 'yellow'
}

function buildQuizDistribution(data: InstructorAnalyticsDashboard) {
  const buckets = [
    { label: '90점 이상', helper: 'Excellent', count: 0, tone: 'from-green-500 to-green-600' },
    { label: '80-89점', helper: 'Strong', count: 0, tone: 'from-blue-500 to-blue-600' },
    { label: '70-79점', helper: 'Stable', count: 0, tone: 'from-yellow-500 to-yellow-600' },
    { label: '60-69점', helper: 'Watch', count: 0, tone: 'from-orange-500 to-orange-600' },
    { label: '60점 미만', helper: 'Risk', count: 0, tone: 'from-red-500 to-red-600' },
  ]

  data.quizStats.items.forEach((item) => {
    if (item.averageScoreRate >= 90) buckets[0].count += 1
    else if (item.averageScoreRate >= 80) buckets[1].count += 1
    else if (item.averageScoreRate >= 70) buckets[2].count += 1
    else if (item.averageScoreRate >= 60) buckets[3].count += 1
    else buckets[4].count += 1
  })

  const total = data.quizStats.items.length || 1
  return buckets.map((bucket) => ({
    ...bucket,
    percent: Math.round((bucket.count / total) * 100),
  }))
}

function buildPerformanceSummary(data: InstructorAnalyticsDashboard) {
  const total = data.students.length || 1
  const strong = data.students.filter((item) => (item.progressPercent ?? 0) >= 80)
  const middle = data.students.filter((item) => (item.progressPercent ?? 0) >= 40 && (item.progressPercent ?? 0) < 80)
  const risk = data.students.filter((item) => (item.progressPercent ?? 0) < 40)

  return [
    {
      label: `상위 ${Math.round((strong.length / total) * 100)}%`,
      status: 'Strong',
      tone: 'green' as const,
      body: `평균 진도 ${strong.length > 0 ? Math.round(strong.reduce((sum, item) => sum + (item.progressPercent ?? 0), 0) / strong.length) : 0}%`,
      helper: '완주 가능성이 높은 그룹입니다.',
    },
    {
      label: `중간 ${Math.round((middle.length / total) * 100)}%`,
      status: 'Stable',
      tone: 'blue' as const,
      body: `평균 진도 ${middle.length > 0 ? Math.round(middle.reduce((sum, item) => sum + (item.progressPercent ?? 0), 0) / middle.length) : 0}%`,
      helper: '중간 구간에서 유지 관리가 필요합니다.',
    },
    {
      label: `위험 ${Math.round((risk.length / total) * 100)}%`,
      status: 'Risk',
      tone: 'orange' as const,
      body: `평균 진도 ${risk.length > 0 ? Math.round(risk.reduce((sum, item) => sum + (item.progressPercent ?? 0), 0) / risk.length) : 0}%`,
      helper: '이탈 방지 액션이 필요한 그룹입니다.',
    },
  ]
}

function buildAnalysisResult(data: InstructorAnalyticsDashboard) {
  const highScoreShare = Math.round(
    data.quizStats.items.length === 0
      ? 0
      : (data.quizStats.items.filter((item) => item.averageScoreRate >= 80).length / data.quizStats.items.length) * 100,
  )
  const lowScoreShare = Math.round(
    data.quizStats.items.length === 0
      ? 0
      : (data.quizStats.items.filter((item) => item.averageScoreRate < 60).length / data.quizStats.items.length) * 100,
  )
  const hardest = data.difficultyItems[0]

  if (!hardest) {
    return '분석할 퀴즈 데이터가 아직 부족합니다. 학습 이력이 쌓이면 점수 분포와 취약 구간을 함께 보여줍니다.'
  }

  return `80점 이상 구간은 ${highScoreShare}%이고 60점 미만 구간은 ${lowScoreShare}%입니다. 현재 가장 어려운 구간은 ${hardest.nodeTitle}입니다.`
}

function buildImprovementDirection(data: InstructorAnalyticsDashboard) {
  const weakest = data.weakPoints[0]

  if (!weakest) {
    return '오답 데이터가 아직 부족합니다. 퀴즈 응시가 누적되면 주요 오답 패턴과 개선 방향을 자동으로 정리합니다.'
  }

  return `${weakest.nodeTitle}에서 오답 신호가 가장 높습니다. 개념 설명을 짧게 분리하고 실습 예제를 3개 이상 추가하는 방향이 적절합니다.`
}

function buildImprovementProposal(data: InstructorAnalyticsDashboard) {
  const riskGroup = data.students.filter((item) => (item.progressPercent ?? 0) < 40)
  const dropOff = data.dropOffs[0]

  if (!dropOff) {
    return '학습 이탈 데이터가 아직 부족합니다. 수강 이력이 쌓이면 하위 그룹 보충 강의와 Q&A 개입 시점을 제안합니다.'
  }

  return `진도 40% 미만 학습자 ${riskGroup.length}명을 대상으로 ${dropOff.lessonTitle} 보충 강의와 체크 질문을 제공하면 이탈률을 낮출 수 있습니다.`
}

export default function StudentAnalyticsPage() {
  const [courseId, setCourseId] = useState<number | null>(null)
  const [analytics, setAnalytics] = useState<InstructorAnalyticsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    instructorAnalyticsApi
      .getDashboard(courseId ?? undefined, controller.signal)
      .then((response) => {
        setAnalytics(response)
      })
      .catch((nextError: Error) => {
        if (controller.signal.aborted) {
          return
        }

        setError(nextError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [courseId])

  const availableCourseOptions = analytics ? buildInstructorCourseOptions(analytics.courseOptions) : []

  useEffect(() => {
    if (courseId !== null && !availableCourseOptions.some(([value]) => Number(value) === courseId)) {
      setCourseId(null)
    }
  }, [courseId, availableCourseOptions])

  if (loading) {
    return (
      <div className="student-analytics-page p-6">
        <LoadingCard label="학생 분석 데이터를 불러오는 중입니다." />
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="student-analytics-page p-6">
        <ErrorCard message={error ?? '학생 분석 데이터를 불러오지 못했습니다.'} />
      </div>
    )
  }

  const averageWatchSeconds =
    analytics.averageWatchTimes.length > 0
      ? analytics.averageWatchTimes.reduce((sum, item) => sum + item.averageWatchSeconds, 0) / analytics.averageWatchTimes.length
      : 0
  const fallbackAiInsights = analytics.difficultyItems.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    title: `${item.nodeTitle} 보강`,
    body: `퀴즈 통과율 ${item.quizPassRate.toFixed(1)}%, 과제 점수 ${item.assignmentScoreRate.toFixed(1)}% 기준으로 예제와 중간 점검 문항을 추가하세요.`,
    level: item.difficultyLabel,
    tone: getDifficultyTone(item.difficultyScore),
  }))
  const aiInsights = (analytics.aiInsights.length > 0 ? analytics.aiInsights : fallbackAiInsights).slice(0, 3).map((item, index) => ({
    rank: index + 1,
    title: item.title,
    body: item.body,
    level: item.level,
    tone: getAiInsightTone(item.level),
  }))
  const dropoutSections = analytics.dropOffs.map((item) => ({
    title: item.lessonTitle,
    rate: Math.round(item.dropOffRate),
    tone: item.dropOffRate >= 40 ? 'danger' : item.dropOffRate >= 20 ? 'warn' : 'safe',
    message:
      item.dropOffRate >= 40
        ? '즉시 개선이 필요한 구간입니다.'
        : item.dropOffRate >= 20
          ? '주의가 필요한 구간입니다.'
          : '안정적으로 유지되고 있습니다.',
  }))
  const quizDistribution = buildQuizDistribution(analytics)
  const weakPatterns = analytics.weakPoints.map((item) => ({
    title: item.nodeTitle,
    errorRate: `오답률 ${item.weaknessScore.toFixed(1)}%`,
    body: item.summary,
    retry: item.weaknessScore >= 65 ? '높음' : item.weaknessScore >= 40 ? '보통' : '낮음',
    tone: getDifficultyTone(item.weaknessScore),
  }))
  const performanceSummary = buildPerformanceSummary(analytics)
  const courseOptions = availableCourseOptions
  const analysisResult = buildAnalysisResult(analytics)
  const improvementDirection = buildImprovementDirection(analytics)
  const improvementProposal = buildImprovementProposal(analytics)

  const metrics = [
    {
      label: '전체 수강생',
      value: `${formatNumber(analytics.overview.totalStudentCount)}명`,
      delta: `${formatNumber(analytics.overview.activeStudentCount)}명`,
      deltaTone: 'text-green-600',
      deltaLabel: '최근 활동',
      icon: 'fas fa-users',
      iconTone: 'from-blue-50 to-blue-100 text-blue-600',
    },
    {
      label: '평균 진도율',
      value: `${analytics.overview.averageProgressPercent.toFixed(1)}%`,
      delta: `${formatNumber(analytics.overview.completedLessonCount)}`,
      deltaTone: 'text-green-600',
      deltaLabel: '완료 lesson',
      icon: 'fas fa-flag-checkered',
      iconTone: 'from-green-50 to-green-100 text-green-600',
    },
    {
      label: '평균 학습 시간',
      value: `${Math.round(averageWatchSeconds / 60)}분`,
      delta: `${analytics.averageWatchTimes.length}`,
      deltaTone: 'text-blue-600',
      deltaLabel: 'tracked courses',
      icon: 'fas fa-clock',
      iconTone: 'from-purple-50 to-purple-100 text-purple-600',
    },
    {
      label: '평균 퀴즈 점수',
      value: `${analytics.quizStats.summary.averageScoreRate.toFixed(1)}점`,
      delta: `${analytics.quizStats.summary.totalAttempts}`,
      deltaTone: 'text-orange-600',
      deltaLabel: 'attempts',
      icon: 'fas fa-chart-line',
      iconTone: 'from-orange-50 to-orange-100 text-orange-600',
    },
  ]

  return (
    <div className="student-analytics-page bg-gray-50 p-6">
      <div className="student-analytics-content mx-auto max-w-[1400px]">
        <div className="student-analytics-header mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">학생 분석 리포트</h1>
            <p className="mt-1 text-sm text-gray-600">AI 기반 이탈 구간 분석 및 개선 포인트 제공</p>
          </div>

          <div className="student-analytics-controls flex items-center gap-3">
            <select
              value={courseId ?? 'all'}
              onChange={(event) => setCourseId(event.target.value === 'all' ? null : Number(event.target.value))}
              className="student-analytics-select cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
            >
              <option value="all">전체 강의</option>
              {courseOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select className="student-analytics-select cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300">
              <option>최근 30일</option>
            </select>
          </div>
        </div>

        <div className="student-analytics-metric-grid mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="student-analytics-metric-card rounded-2xl border border-gray-100 bg-white p-5 transition hover:shadow-md">
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${metric.iconTone}`}>
                  <i className={`${metric.icon} text-lg`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`flex items-center gap-1 font-semibold ${metric.deltaTone}`}>{metric.delta}</span>
                <span className="text-gray-500">{metric.deltaLabel}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="student-analytics-main-grid mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="student-analytics-panel student-analytics-panel-wide rounded-[32px] border border-gray-100 bg-white p-6 transition hover:shadow-lg xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <i className="fas fa-chart-area text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">이탈 구간 분석</h3>
                  <p className="mt-0.5 text-xs text-gray-600">lesson별 실제 drop-off 집계입니다.</p>
                </div>
              </div>
              <span className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                <i className="fas fa-exclamation-triangle" /> 상위 위험 구간
              </span>
            </div>

            <div className="space-y-3">
              {dropoutSections.map((section) => {
                const tone = getDropoutTone(section.tone as Tone)

                return (
                  <div key={section.title} className={`student-analytics-list-card rounded-xl border p-4 transition hover:shadow-sm ${tone.container}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">{section.title}</span>
                      <span className={`text-sm font-semibold ${tone.text}`}>{section.rate}% 이탈</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${Math.max(section.rate, 8)}%` }} />
                    </div>
                    <p className={`mt-2 text-xs font-medium ${tone.message}`}>{section.message}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="student-analytics-panel student-analytics-ai-panel rounded-[32px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 p-6 transition hover:shadow-lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <i className="fas fa-robot text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">AI 개선 포인트</h3>
                <p className="mt-0.5 text-xs text-gray-600">Gemini와 학습 지표 기반 우선순위 액션입니다.</p>
              </div>
            </div>

            <div className="space-y-3">
              {aiInsights.map((item) => (
                <div key={item.rank} className="student-analytics-list-card rounded-xl border border-blue-100 bg-white p-4 transition hover:shadow-sm">
                  <div className="mb-3 flex items-start gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                        item.tone === 'red' ? 'bg-red-500' : item.tone === 'orange' ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}
                    >
                      {item.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{item.body}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-600">우선순위</span>
                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${getToneClasses(item.tone)}`}>{item.level}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => window.alert('상세 리포트 다운로드는 다음 단계에서 연결합니다.')}
              className="student-analytics-primary-button mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
            >
              상세 리포트 다운로드
            </button>
          </div>
        </div>

        <div className="student-analytics-bottom-grid grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="student-analytics-panel rounded-[32px] border border-gray-100 bg-white p-6 transition hover:shadow-lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                <i className="fas fa-chart-bar text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">퀴즈 점수 분포</h3>
                <p className="mt-0.5 text-xs text-gray-600">quiz 평균 점수 기준 분포입니다.</p>
              </div>
            </div>

            <div className="space-y-3">
              {quizDistribution.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.percent}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full bg-gradient-to-r ${item.tone}`} style={{ width: `${item.percent}%` }} />
                  </div>
                  <span className="mt-1 block text-xs text-gray-600">{item.helper}</span>
                </div>
              ))}
            </div>

            <div className="student-analytics-summary-box mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs leading-relaxed text-blue-700">
                <span className="font-semibold">분석 결과</span>
                <br />
                {analysisResult}
              </p>
            </div>
          </div>

          <div className="student-analytics-panel rounded-[32px] border border-gray-100 bg-white p-6 transition hover:shadow-lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <i className="fas fa-magnifying-glass-chart text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">오답 패턴 분석</h3>
                <p className="mt-0.5 text-xs text-gray-600">주요 취약 부분 파악</p>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              {weakPatterns.map((item) => (
                <div key={item.title} className={`student-analytics-compact-card rounded-xl border p-3 ${getToneClasses(item.tone)}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                    <span className="rounded-lg border px-2.5 py-1 text-xs font-semibold">{item.errorRate}</span>
                  </div>
                  <p className="mb-2 text-xs text-gray-700">{item.body}</p>
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">재도전율:</span> {item.retry}
                  </div>
                </div>
              ))}
            </div>

            <div className="student-analytics-summary-box rounded-xl border border-purple-100 bg-purple-50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <i className="fas fa-lightbulb text-purple-600" />
                <p className="text-xs font-semibold text-purple-900">개선 방향</p>
              </div>
              <p className="text-xs leading-relaxed text-purple-700">{improvementDirection}</p>
            </div>
          </div>

          <div className="student-analytics-panel rounded-[32px] border border-gray-100 bg-white p-6 transition hover:shadow-lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50">
                <i className="fas fa-trophy text-yellow-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">수강생 성과 요약</h3>
                <p className="mt-0.5 text-xs text-gray-600">진도 기준 그룹 분포입니다.</p>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              {performanceSummary.map((item) => (
                <div
                  key={item.label}
                  className={`student-analytics-compact-card rounded-xl border p-3 transition hover:shadow-sm ${item.tone === 'orange' ? 'border-orange-100 bg-orange-50/50' : 'border-gray-100 bg-white'}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{item.label}</span>
                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${getToneClasses(item.tone)}`}>{item.status}</span>
                  </div>
                  <p className="mb-2 text-xs text-gray-600">{item.body}</p>
                  <p className={`text-xs font-medium ${item.tone === 'orange' ? 'text-orange-700' : item.tone === 'green' ? 'text-green-600' : 'text-blue-600'}`}>
                    {item.helper}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <i className="fas fa-lightbulb text-purple-600" />
                <p className="text-xs font-semibold text-purple-900">개선 제안</p>
              </div>
              <p className="text-xs leading-relaxed text-purple-700">{improvementProposal}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
