import { useEffect, useState } from 'react'
import { EmptyCard, ErrorCard, LoadingCard, formatCurrency, formatDate, formatDateTime, formatNumber } from '../../account/ui'
import { instructorAnalyticsApi, instructorCourseApi, instructorReviewApi } from '../../lib/api'
import type {
  InstructorAnalyticsDashboard,
  InstructorAnalyticsStudentItem,
  InstructorCourseListItem,
} from '../../types/instructor'
import type { LearningCourseDetail } from '../../types/learning'

type DetailTab = 'dashboard' | 'students' | 'settings'
type CourseVisibility = 'public' | 'private'
type DailySalesItem = {
  amount: number
  label: string
}

function getCourseIdFromUrl() {
  const rawValue = new URLSearchParams(window.location.search).get('courseId')

  if (!rawValue) {
    return null
  }

  const nextValue = Number(rawValue)
  return Number.isFinite(nextValue) ? nextValue : null
}

function formatPriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

function parsePriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

function getStatusMeta(status: string | null) {
  switch (status) {
    case 'PUBLISHED':
      return {
        label: '공개 중',
        tone: 'bg-green-100 text-green-700',
      }
    case 'IN_REVIEW':
      return {
        label: '심사 중',
        tone: 'bg-blue-100 text-blue-700',
      }
    case 'ARCHIVED':
      return {
        label: '비공개',
        tone: 'bg-slate-100 text-slate-700',
      }
    case 'DRAFT':
    default:
      return {
        label: '초안',
        tone: 'bg-gray-100 text-gray-600',
      }
  }
}

function countRevenueByMonth(students: InstructorAnalyticsStudentItem[], price: number, referenceDate: Date) {
  const targetYear = referenceDate.getFullYear()
  const targetMonth = referenceDate.getMonth()

  return students.reduce((sum, student) => {
    if (!student.enrolledAt) {
      return sum
    }

    const enrolledAt = new Date(student.enrolledAt)

    if (enrolledAt.getFullYear() !== targetYear || enrolledAt.getMonth() !== targetMonth) {
      return sum
    }

    return sum + price
  }, 0)
}

function buildDailySales(students: InstructorAnalyticsStudentItem[], price: number) {
  const today = new Date()
  const formatter = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' })
  const days: DailySalesItem[] = []

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() - index)

    const amount = students.reduce((sum, student) => {
      if (!student.enrolledAt) {
        return sum
      }

      const enrolledAt = new Date(student.enrolledAt)
      enrolledAt.setHours(0, 0, 0, 0)

      if (enrolledAt.getTime() !== date.getTime()) {
        return sum
      }

      return sum + price
    }, 0)

    days.push({
      label: formatter.format(date),
      amount,
    })
  }

  return days
}

function getStudentCount(courseSummary: InstructorCourseListItem | null, analytics: InstructorAnalyticsDashboard | null, students: InstructorAnalyticsStudentItem[]) {
  return courseSummary?.studentCount ?? analytics?.overview.totalStudentCount ?? students.length
}

export default function InstructorCourseDetailPage() {
  const courseId = getCourseIdFromUrl()
  const [activeTab, setActiveTab] = useState<DetailTab>('dashboard')
  const [detail, setDetail] = useState<LearningCourseDetail | null>(null)
  const [courseSummary, setCourseSummary] = useState<InstructorCourseListItem | null>(null)
  const [analytics, setAnalytics] = useState<InstructorAnalyticsDashboard | null>(null)
  const [reviewCount, setReviewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [settingsPriceInput, setSettingsPriceInput] = useState('')
  const [settingsVisibility, setSettingsVisibility] = useState<CourseVisibility>('public')

  useEffect(() => {
    if (!courseId) {
      setError('강의 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    setLoading(true)
    setError(null)

    Promise.all([
      instructorCourseApi.getCourseDetail(courseId, controller.signal),
      instructorCourseApi.getCourses(controller.signal),
      instructorAnalyticsApi.getDashboard(courseId, controller.signal),
      instructorReviewApi.getReviews(controller.signal),
    ])
      .then(([courseDetail, courses, analyticsDashboard, reviews]) => {
        if (controller.signal.aborted) {
          return
        }

        setDetail(courseDetail)
        setCourseSummary(courses.find((item) => item.courseId === courseId) ?? null)
        setAnalytics(analyticsDashboard)
        setReviewCount(reviews.filter((item) => item.courseId === courseId).length)
        setSettingsPriceInput(courseDetail.price != null ? courseDetail.price.toLocaleString('ko-KR') : '')
        setSettingsVisibility(courseDetail.status === 'PUBLISHED' ? 'public' : 'private')
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
  }, [courseId, reloadToken])

  async function handleSaveSettings() {
    if (!courseId || !detail) {
      return
    }

    setSaving(true)
    setActionError(null)

    try {
      await instructorCourseApi.updateCourse(courseId, {
        title: detail.title,
        subtitle: detail.subtitle,
        description: detail.description,
        price: parsePriceInput(settingsPriceInput),
        originalPrice: detail.originalPrice,
        currency: detail.currency ?? 'KRW',
        difficultyLevel: detail.difficultyLevel,
        language: detail.language ?? 'ko',
        hasCertificate: Boolean(detail.hasCertificate),
      })

      await instructorCourseApi.updateCourseStatus(courseId, settingsVisibility === 'public' ? 'PUBLISHED' : 'DRAFT')
      setReloadToken((current) => current + 1)
      window.alert('설정이 저장되었습니다.')
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : '설정을 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <LoadingCard label="강의 상세 정보를 불러오는 중입니다." />
      </div>
    )
  }

  if (error || !detail || !courseId) {
    return (
      <div className="p-8">
        <ErrorCard message={error ?? '강의 정보를 찾을 수 없습니다.'} />
      </div>
    )
  }

  const statusMeta = getStatusMeta(detail.status)
  const students = analytics?.students.filter((item) => item.courseId === courseId) ?? []
  const studentCount = getStudentCount(courseSummary, analytics, students)
  const currentPrice = detail.price ?? 0
  const currentMonthRevenue = countRevenueByMonth(students, currentPrice, new Date())
  const previousMonthDate = new Date()
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1)
  const previousMonthRevenue = countRevenueByMonth(students, currentPrice, previousMonthDate)
  const revenueChangePercent =
    previousMonthRevenue > 0 ? (((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1) : null
  const dailySales = buildDailySales(students, currentPrice)
  const maxDailySales = Math.max(...dailySales.map((item) => item.amount), 1)
  const averageRating = courseSummary?.averageRating ?? 0
  const averageProgress = courseSummary?.averageProgressPercent ?? analytics?.overview.averageProgressPercent ?? 0
  const pendingQuestionCount = courseSummary?.pendingQuestionCount ?? 0

  return (
    <div className="p-8">
      <div className="mx-auto max-w-[1240px]">
        {actionError ? (
          <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {actionError}
          </div>
        ) : null}

        <section className="mb-8 flex flex-col items-start justify-between gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm xl:flex-row">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg bg-gray-200 text-gray-400">
              {detail.thumbnailUrl ? (
                <img src={detail.thumbnailUrl} alt={detail.title} className="h-full w-full object-cover" />
              ) : (
                <i className="fas fa-image text-3xl" />
              )}
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.tone}`}>{statusMeta.label}</span>
                <span className="text-xs text-gray-400">최종 수정: {formatDate(courseSummary?.publishedAt)}</span>
              </div>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">{detail.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span>
                  <i className="fas fa-user-friends mr-1" /> {formatNumber(studentCount)}명 수강 중
                </span>
                <span>
                  <i className="fas fa-star mr-1 text-yellow-400" /> {averageRating.toFixed(1)} ({formatNumber(reviewCount)}개 리뷰)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = `/course-editor?courseId=${courseId}`
              }}
              className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600"
            >
              <i className="fas fa-edit" /> 커리큘럼/영상 편집
            </button>
          </div>
        </section>

        <div className="mb-6 flex border-b border-gray-200">
          {[
            ['dashboard', '대시보드'],
            ['students', '수강생 관리'],
            ['settings', '설정 (가격/공개)'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as DetailTab)}
              className={`px-6 py-3 text-sm font-bold transition ${
                activeTab === key ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">이번 달 수익</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{formatCurrency(currentMonthRevenue, detail.currency ?? 'KRW')}</h3>
                <p className="mt-2 text-xs text-green-600">
                  <i className="fas fa-arrow-up" /> {revenueChangePercent ? `지난달 대비 ${revenueChangePercent}%` : '비교 데이터 없음'}
                </p>
              </article>

              <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">평균 진도율</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{averageProgress.toFixed(1)}%</h3>
                <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.min(100, averageProgress)}%` }} />
                </div>
              </article>

              <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">미답변 질문</p>
                <h3 className="text-2xl font-extrabold text-red-500">{formatNumber(pendingQuestionCount)}건</h3>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/instructor-qna'
                  }}
                  className="mt-2 text-xs text-gray-500 underline"
                >
                  답변하러 가기
                </button>
              </article>
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-gray-900">최근 7일 판매 추이</h3>
              <div className="flex h-40 items-end justify-between gap-2">
                {dailySales.map((item) => (
                  <div key={item.label} className="group relative h-full w-full rounded-t-md bg-gray-100">
                    <div
                      className="absolute bottom-0 w-full rounded-t-md bg-brand/70 transition group-hover:bg-brand"
                      style={{ height: `${Math.max(12, (item.amount / maxDailySales) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-400">
                {dailySales.map((item) => (
                  <span key={item.label}>{item.label}</span>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'students' ? (
          <div className="space-y-6">
            {students.length === 0 ? (
              <EmptyCard title="수강생 데이터가 없습니다." description="아직 이 강의를 수강 중인 학생이 없습니다." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-3">수강생</th>
                      <th className="px-6 py-3">진도율</th>
                      <th className="px-6 py-3">최근 학습일</th>
                      <th className="px-6 py-3">쪽지</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-gray-900">{student.studentName}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-gray-100">
                              <div
                                className={`h-1.5 rounded-full ${
                                  (student.progressPercent ?? 0) >= 60 ? 'bg-green-500' : 'bg-yellow-400'
                                }`}
                                style={{ width: `${Math.min(100, student.progressPercent ?? 0)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{(student.progressPercent ?? 0).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{formatDateTime(student.lastAccessedAt)}</td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = '/instructor-qna'
                            }}
                            className="text-gray-400 transition hover:text-brand"
                            aria-label={`${student.studentName} 수강생 문의 보기`}
                          >
                            <i className="far fa-envelope" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'settings' ? (
          <section className="max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 border-b border-gray-100 pb-6">
              <h3 className="mb-4 font-bold text-gray-900">가격 설정</h3>
              <div className="flex items-center gap-4">
                <label htmlFor="course-price" className="w-24 text-sm text-gray-600">
                  가격 (원)
                </label>
                <input
                  id="course-price"
                  value={settingsPriceInput}
                  onChange={(event) => setSettingsPriceInput(formatPriceInput(event.target.value))}
                  type="text"
                  inputMode="numeric"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="mb-6 border-b border-gray-100 pb-6">
              <h3 className="mb-4 font-bold text-gray-900">공개 상태</h3>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="course-visibility"
                  checked={settingsVisibility === 'public'}
                  onChange={() => setSettingsVisibility('public')}
                  className="accent-brand"
                />
                <span className="text-sm text-gray-700">공개 (수강 신청 가능)</span>
              </label>
              <label className="mt-2 flex items-center gap-3">
                <input
                  type="radio"
                  name="course-visibility"
                  checked={settingsVisibility === 'private'}
                  onChange={() => setSettingsVisibility('private')}
                  className="accent-brand"
                />
                <span className="text-sm text-gray-700">비공개 (기존 수강생만 접근 가능)</span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
