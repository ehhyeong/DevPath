import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { enrollmentApi, wishlistApi } from '../../lib/api'
import { LearnerContentRow, LearnerPageShell, MyMenuSidebar } from '../template'
import type { Enrollment, WishlistCourse } from '../../types/learner'

type LearningTab = 'active' | 'completed' | 'wishlist'

const tabLabels: Record<LearningTab, string> = {
  active: '학습 중',
  completed: '완강',
  wishlist: '찜한 강의',
}

function isCompletedEnrollment(enrollment: Enrollment) {
  return (
    enrollment.status === 'COMPLETED' ||
    Boolean(enrollment.completedAt) ||
    (enrollment.progressPercentage ?? 0) >= 100
  )
}

function getProgressPercent(progress: number | null | undefined) {
  const normalized = Number(progress ?? 0)

  if (!Number.isFinite(normalized)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(normalized)))
}

function getCategoryLabel(course: Pick<Enrollment, 'courseTitle' | 'tags'> | Pick<WishlistCourse, 'courseTitle'>) {
  const tags = 'tags' in course ? course.tags ?? [] : []
  const preferredTag = tags.find((tag) => ['Backend', 'Frontend', 'DevOps', 'Database', 'Architecture'].includes(tag))

  if (preferredTag) {
    return preferredTag
  }

  const title = course.courseTitle.toLowerCase()

  if (title.includes('docker') || title.includes('kubernetes') || title.includes('k8s')) {
    return 'DevOps'
  }

  if (title.includes('react') || title.includes('frontend') || title.includes('typescript')) {
    return 'Frontend'
  }

  if (title.includes('sql') || title.includes('database') || title.includes('db')) {
    return 'Database'
  }

  return 'Backend'
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '날짜 없음'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '날짜 없음'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatLastLearningLabel(course: Enrollment) {
  const lastAccessedAt = formatDateTime(course.lastAccessedAt)

  if (lastAccessedAt) {
    return `마지막 학습: ${lastAccessedAt}`
  }

  const enrolledAt = formatDateTime(course.enrolledAt)

  if (enrolledAt) {
    return `수강 시작: ${enrolledAt}`
  }

  return '마지막 학습: 기록 없음'
}

function formatPrice(price: number | null | undefined, currency: string | null | undefined) {
  if (price == null) {
    return '가격 정보 없음'
  }

  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency ?? 'KRW',
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `${price.toLocaleString('ko-KR')}원`
  }
}

function openCourseDetail(courseId: number) {
  window.location.href = `/course-detail?courseId=${courseId}`
}

function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, courseId: number) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  openCourseDetail(courseId)
}

function stopCardClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation()
}

function CourseImage({
  title,
  thumbnailUrl,
  progressPercent,
  completed = false,
  wishlist = false,
}: {
  title: string
  thumbnailUrl: string | null
  progressPercent?: number
  completed?: boolean
  wishlist?: boolean
}) {
  return (
    <div className="relative aspect-video bg-gray-100">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          className={`h-full w-full object-cover ${completed ? 'opacity-90 grayscale' : ''}`}
          alt={title}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">
          <i className="fas fa-play-circle text-3xl" />
        </div>
      )}

      {completed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition group-hover:opacity-100">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white">다시 보기</span>
        </div>
      ) : null}

      {wishlist ? (
        <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm">
          <i className="fas fa-heart" />
        </div>
      ) : null}

      <div className={`absolute bottom-0 left-0 h-1.5 w-full ${completed ? 'bg-brand' : 'bg-gray-200'}`}>
        {!completed && !wishlist ? (
          <div className="h-full bg-brand" style={{ width: `${progressPercent ?? 0}%` }} />
        ) : null}
      </div>
    </div>
  )
}

function EmptyState({ tab }: { tab: LearningTab }) {
  const emptyTitle = tab === 'wishlist' ? '찜한 강의가 없습니다' : '해당하는 강의가 없습니다'

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <i className="fas fa-box-open text-3xl text-gray-300" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-gray-900">{emptyTitle}</h3>
      <p className="mb-6 text-sm text-gray-500">새로운 로드맵과 강의를 둘러보고 학습을 시작해보세요.</p>
      <a href="/lecture-list" className="rounded-xl bg-gray-900 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-black">
        전체 강의 보러가기
      </a>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <i className="fas fa-spinner fa-spin text-3xl text-gray-300" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-gray-900">강의 정보를 불러오는 중입니다</h3>
      <p className="text-sm text-gray-500">현재 계정의 학습 데이터를 확인하고 있습니다.</p>
    </div>
  )
}

export default function MyLearningPage() {
  const [tab, setTab] = useState<LearningTab>('active')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [wishlist, setWishlist] = useState<WishlistCourse[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      const [enrollmentResult, wishlistResult] = await Promise.allSettled([
        enrollmentApi.getMyEnrollments(controller.signal),
        wishlistApi.getCourses(controller.signal),
      ])

      if (controller.signal.aborted) {
        return
      }

      if (enrollmentResult.status === 'fulfilled') {
        setEnrollments(enrollmentResult.value)
      }

      if (wishlistResult.status === 'fulfilled') {
        setWishlist(wishlistResult.value)
      }

      if (enrollmentResult.status === 'rejected' || wishlistResult.status === 'rejected') {
        setError('일부 학습 데이터를 불러오지 못했습니다.')
      }

      setIsLoaded(true)
    }

    void load()

    return () => controller.abort()
  }, [])

  const activeEnrollments = useMemo(
    () => enrollments.filter((enrollment) => !isCompletedEnrollment(enrollment)),
    [enrollments],
  )
  const completedEnrollments = useMemo(
    () => enrollments.filter((enrollment) => isCompletedEnrollment(enrollment)),
    [enrollments],
  )

  const tabCounts: Record<LearningTab, number> = {
    active: activeEnrollments.length,
    completed: completedEnrollments.length,
    wishlist: wishlist.length,
  }

  const visibleEnrollments = tab === 'completed' ? completedEnrollments : activeEnrollments
  const hasVisibleData = tab === 'wishlist' ? wishlist.length > 0 : visibleEnrollments.length > 0

  return (
    <LearnerPageShell>
      <LearnerContentRow>
        <MyMenuSidebar
          currentPageKey="my-learning"
          wrapperClassName="w-60 shrink-0 hidden lg:block -ml-0"
          wrapperStyle={{ transform: 'translateX(-7.5px)' }}
        />

        <section className="min-w-0 flex-1">
          <h2 className="mb-6 pt-[5px] text-2xl font-bold leading-none text-gray-900">내 학습</h2>

          <div className="mt-1 mb-6 flex border-b border-gray-200">
            {(Object.keys(tabLabels) as LearningTab[]).map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                className={`tab-btn ${tab === tabKey ? 'active' : ''}`}
                onClick={() => setTab(tabKey)}
              >
                {tabLabels[tabKey]} ({tabCounts[tabKey]})
              </button>
            ))}
          </div>

          {error ? <p className="mb-4 text-sm font-bold text-red-500">{error}</p> : null}

          {!isLoaded ? (
            <LoadingState />
          ) : hasVisibleData ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tab === 'wishlist'
                ? wishlist.map((course) => (
                    <article
                      key={course.wishlistId}
                      className="group min-w-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-lg"
                      onClick={() => openCourseDetail(course.courseId)}
                      onKeyDown={(event) => handleCardKeyDown(event, course.courseId)}
                      role="button"
                      tabIndex={0}
                    >
                      <CourseImage title={course.courseTitle} thumbnailUrl={course.thumbnailUrl} wishlist />
                      <div className="p-5">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <span className="max-w-[70%] truncate rounded bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                            {getCategoryLabel(course)}
                          </span>
                          <span className="shrink-0 text-xs font-bold text-gray-400">학습 전</span>
                        </div>
                        <h3 className="mb-4 line-clamp-2 h-12 font-bold text-gray-900">{course.courseTitle}</h3>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-50 pt-4">
                          <span className="min-w-0 truncate text-xs text-gray-400">{formatPrice(course.price, 'KRW')}</span>
                          <a
                            href={`/course-detail?courseId=${course.courseId}`}
                            className="shrink-0 rounded-lg border border-brand bg-white px-4 py-2 text-xs font-bold text-brand shadow-sm transition hover:bg-green-50"
                            onClick={stopCardClick}
                          >
                            수강신청
                          </a>
                        </div>
                      </div>
                    </article>
                  ))
                : visibleEnrollments.map((course) => {
                    const completed = tab === 'completed'
                    const progressPercent = completed ? 100 : getProgressPercent(course.progressPercentage)
                    const actionHref = completed && course.hasCertificate ? '/learning-log-gallery' : `/learning?courseId=${course.courseId}`
                    const actionLabel = completed ? (course.hasCertificate ? '수료증 보기' : '다시 보기') : '이어하기'
                    const actionClassName = completed
                      ? 'rounded-lg bg-gray-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-black'
                      : 'rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-600'

                    return (
                      <article
                        key={course.enrollmentId}
                        className="group min-w-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-lg"
                        onClick={() => openCourseDetail(course.courseId)}
                        onKeyDown={(event) => handleCardKeyDown(event, course.courseId)}
                        role="button"
                        tabIndex={0}
                      >
                        <CourseImage
                          title={course.courseTitle}
                          thumbnailUrl={course.thumbnailUrl}
                          progressPercent={progressPercent}
                          completed={completed}
                        />
                        <div className="p-5">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <span className="max-w-[70%] truncate rounded bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                              {getCategoryLabel(course)}
                            </span>
                            <span className="shrink-0 text-xs font-bold text-brand">
                              {completed ? '100% 완강' : `${progressPercent}%`}
                            </span>
                          </div>
                          <h3 className="mb-4 line-clamp-2 h-12 font-bold text-gray-900">{course.courseTitle}</h3>
                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-50 pt-4">
                            <span className="min-w-0 truncate text-xs text-gray-400" title={completed ? undefined : formatLastLearningLabel(course)}>
                              {completed
                                ? `완료일: ${formatDate(course.completedAt ?? course.lastAccessedAt)}`
                                : formatLastLearningLabel(course)}
                            </span>
                            <a href={actionHref} className={`${actionClassName} shrink-0`} onClick={stopCardClick}>
                              {actionLabel}
                            </a>
                          </div>
                        </div>
                      </article>
                    )
                  })}
            </div>
          ) : (
            <EmptyState tab={tab} />
          )}
        </section>
      </LearnerContentRow>
    </LearnerPageShell>
  )
}
