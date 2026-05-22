import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SiteHeader from './components/SiteHeader'
import {
  buildCourseJobCards,
  buildCourseNewsCards,
  buildQuestionCommentCount,
  buildQuestionStatusLabel,
  buildReviewAuthorName,
  buildReviewAvatarSeed,
  buildReviewStats,
  createQuestionSearchText,
  createNewQuestionCommentId,
  createNewQuestionId,
  fallbackCourseQuestions,
  fallbackCourseReviews,
  formatCourseDate,
  formatCoursePrice,
  formatRelativeTime,
  formatSectionMeta,
  getCourseDetailLessonIconClassName,
  getCourseDetailLessonMetaLabel,
  getLearningHref,
  getPreviewLesson,
  mergeCourseDetailWithFallback,
  type CourseQuestionItem,
  type CourseQuestionStatus,
} from './course-detail-support'
import { buildInstructorChannelHref } from './instructor-channel-support'
import { authApi, courseApi, enrollmentApi, reviewApi, userApi } from './lib/api'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { useInternalPageScroll } from './lib/useInternalPageScroll'
import type { CourseReview } from './types/course'
import type { LearningCourseDetail } from './types/learning'

type TabKey = 'info' | 'news' | 'reviews' | 'qna'
type ReviewFilterKey = 'all' | 'five' | 'fourPlus'
type ReviewSortKey = 'latest' | 'ratingDesc' | 'ratingAsc'

const APP_HEADER_HEIGHT_PX = 64
const STUDENT_PREVIEW_BANNER_HEIGHT_PX = 44

function readNumberSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')
  return value === 'login' || value === 'signup' ? value : null
}

function readStudentPreviewFromLocation() {
  return new URLSearchParams(window.location.search).get('preview') === 'student'
}

function readStudentPreviewReturnHref(courseId: number | null) {
  const fallbackHref = courseId ? `/course-editor?courseId=${courseId}` : '/course-editor'
  const value = new URLSearchParams(window.location.search).get('returnTo')

  if (!value) {
    return fallbackHref
  }

  try {
    const nextUrl = new URL(value, window.location.origin)

    if (nextUrl.origin !== window.location.origin) {
      return fallbackHref
    }

    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  } catch {
    return fallbackHref
  }
}

function readSafeReturnToFromLocation() {
  const value = new URLSearchParams(window.location.search).get('returnTo')
  if (!value) return null

  try {
    const nextUrl = new URL(value, window.location.origin)
    if (nextUrl.origin !== window.location.origin) return null
    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  } catch {
    return null
  }
}

function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)
  if (view) url.searchParams.set('auth', view)
  else url.searchParams.delete('auth')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function buildQuestionFilterClass(active: boolean) {
  return `qna-filter-btn rounded-xl border px-3 py-2 text-xs font-black transition ${
    active
      ? 'active border-gray-900 bg-gray-900 text-white'
      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
  }`
}

function buildReviewFilterClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-xs transition ${
    active
      ? 'bg-gray-800 font-bold text-white'
      : 'bg-gray-100 font-medium text-gray-600 hover:bg-gray-200'
  }`
}

function StarRating({ rating, className = 'text-xs' }: { rating: number; className?: string }) {
  const whole = Math.floor(rating)
  const hasHalf = rating - whole >= 0.5
  return (
    <div className={`flex text-yellow-400 ${className}`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starIndex = index + 1
        const iconClassName = starIndex <= whole
          ? 'fas fa-star'
          : starIndex === whole + 1 && hasHalf
            ? 'fas fa-star-half-alt'
            : 'far fa-star'
        return <i key={index} className={iconClassName} />
      })}
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#00c471] border-t-transparent" />
    </div>
  )
}

export default function CourseDetailApp() {
  useInternalPageScroll()

  const courseId = useMemo(() => readNumberSearchParam('courseId'), [])
  const isStudentPreview = useMemo(() => readStudentPreviewFromLocation(), [])
  const studentPreviewReturnHref = useMemo(() => readStudentPreviewReturnHref(courseId), [courseId])
  const returnToHref = useMemo(() => readSafeReturnToFromLocation(), [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [course, setCourse] = useState<LearningCourseDetail | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [courseNotice, setCourseNotice] = useState<string | null>(null)
  const [reviews, setReviews] = useState<CourseReview[]>(fallbackCourseReviews)
  const [questions, setQuestions] = useState<CourseQuestionItem[]>(fallbackCourseQuestions)
  const [activeTab, setActiveTab] = useState<TabKey>('info')
  const [openSectionIds, setOpenSectionIds] = useState<number[]>([])
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterKey>('all')
  const [reviewSort, setReviewSort] = useState<ReviewSortKey>('latest')
  const [qnaFilter, setQnaFilter] = useState<'all' | CourseQuestionStatus>('all')
  const [qnaSearch, setQnaSearch] = useState('')
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null)
  const [questionDraft, setQuestionDraft] = useState({ title: '', tag: '', body: '' })
  const [questionErrors, setQuestionErrors] = useState<string | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [askModalOpen, setAskModalOpen] = useState(false)
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrollmentBusy, setEnrollmentBusy] = useState(false)
  const deferredQnaSearch = useDeferredValue(qnaSearch.trim().toLowerCase())

  const displayCourse = useMemo(() => mergeCourseDetailWithFallback(course), [course])
  const instructor = displayCourse.instructor
  const previewLesson = useMemo(() => getPreviewLesson(displayCourse), [displayCourse])
  const learningHref = useMemo(
    () => getLearningHref(displayCourse.courseId, previewLesson, returnToHref),
    [displayCourse.courseId, previewLesson, returnToHref],
  )
  const instructorChannelHref = useMemo(
    () => buildInstructorChannelHref(instructor?.instructorId ?? null),
    [instructor?.instructorId],
  )
  const heroTags = useMemo(() => displayCourse.tags.slice(0, 3).map((item) => `#${item.tagName}`), [displayCourse.tags])
  const jobCards = useMemo(() => buildCourseJobCards(displayCourse), [displayCourse])
  const newsCards = useMemo(() => buildCourseNewsCards(displayCourse), [displayCourse])
  const reviewStats = useMemo(() => buildReviewStats(reviews), [reviews])
  const headerOffsetTop = isStudentPreview ? STUDENT_PREVIEW_BANNER_HEIGHT_PX : 0
  const appMainStyle = headerOffsetTop
    ? { paddingTop: `${APP_HEADER_HEIGHT_PX + headerOffsetTop}px` }
    : undefined

  const visibleReviews = useMemo(() => {
    const filtered = reviews
      .filter((item) => !item.isHidden)
      .filter((item) => {
        if (reviewFilter === 'five') return item.rating === 5
        if (reviewFilter === 'fourPlus') return item.rating >= 4
        return true
      })

    return [...filtered].sort((left, right) => {
      if (reviewSort === 'ratingDesc') {
        return right.rating - left.rating || String(right.createdAt).localeCompare(String(left.createdAt))
      }

      if (reviewSort === 'ratingAsc') {
        return left.rating - right.rating || String(right.createdAt).localeCompare(String(left.createdAt))
      }

      return String(right.createdAt).localeCompare(String(left.createdAt))
    })
  }, [reviewFilter, reviewSort, reviews])

  const visibleQuestions = useMemo(() => (
    questions.filter((item) => {
      const statusMatched = qnaFilter === 'all' || item.status === qnaFilter
      const searchMatched = !deferredQnaSearch || createQuestionSearchText(item).includes(deferredQnaSearch)
      return statusMatched && searchMatched
    })
  ), [deferredQnaSearch, qnaFilter, questions])

  useEffect(() => {
    document.title = 'DevPath - 강의 상세'
  }, [])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    syncSession()

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    syncAuthViewInLocation(authView)
  }, [authView])

  useEffect(() => {
    if (!session) {
      setProfileImage(null)
      setIsEnrolled(false)
      return
    }

    const controller = new AbortController()
    userApi
      .getMyProfile(controller.signal)
      .then((profile) => setProfileImage(profile.profileImage))
      .catch(() => setProfileImage(null))

    return () => controller.abort()
  }, [session])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadCourse() {
      setLoadingCourse(true)

      if (!courseId) {
        setCourse(null)
        setCourseNotice('courseId가 없어 시안 기본 강의를 표시하고 있습니다.')
        setLoadingCourse(false)
        return
      }

      try {
        const response = await courseApi.getCourseDetail(courseId, controller.signal)
        if (cancelled) return
        setCourse(response)
        setCourseNotice(null)
      } catch {
        if (cancelled) return
        setCourse(null)
        setCourseNotice('실제 강의 데이터를 불러오지 못해 시안 기본 강의로 대체했습니다.')
      } finally {
        if (!cancelled) setLoadingCourse(false)
      }
    }

    void loadCourse()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [courseId, session?.accessToken])

  useEffect(() => {
    setOpenSectionIds(displayCourse.sections[0] ? [displayCourse.sections[0].sectionId] : [])
  }, [displayCourse.courseId, displayCourse.sections])

  useEffect(() => {
    if (!courseId || loadingCourse) {
      setLoadingReviews(false)
      setReviews(fallbackCourseReviews)
      return
    }

    if (!course) {
      setLoadingReviews(false)
      setReviews(fallbackCourseReviews)
      return
    }
    const currentCourseId = course.courseId

    let cancelled = false
    const controller = new AbortController()

    async function loadReviews() {
      setLoadingReviews(true)
      try {
        const response = await reviewApi.getByCourse(currentCourseId, controller.signal)
        if (cancelled) return
        setReviews(response.length ? response : fallbackCourseReviews)
      } catch {
        if (cancelled) return
        setReviews(fallbackCourseReviews)
      } finally {
        if (!cancelled) setLoadingReviews(false)
      }
    }

    void loadReviews()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [course, courseId, loadingCourse])

  useEffect(() => {
    if (!session) {
      setIsEnrolled(false)
      return
    }

    setIsEnrolled(Boolean(course?.isEnrolled))
  }, [course?.courseId, course?.isEnrolled, session])

  useEffect(() => {
    if (!toastMessage) return
    const timeoutId = window.setTimeout(() => setToastMessage(null), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  useEffect(() => {
    if (!askModalOpen && !enrollModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setAskModalOpen(false)
      setEnrollModalOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [askModalOpen, enrollModalOpen])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // Keep local logout even if the API request fails.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
      setIsEnrolled(false)
    }
  }

  function openAuthModal(view: AuthView) {
    setAuthView(view)
  }

  function handleAuthenticated() {
    setSession(readStoredAuthSession())
    setAuthView(null)
  }

  function toggleSection(sectionId: number) {
    setOpenSectionIds((current) => (
      current.includes(sectionId)
        ? current.filter((item) => item !== sectionId)
        : [...current, sectionId]
    ))
  }

  function handlePreviewClick() {
    if (!session) {
      openAuthModal('login')
      return
    }

    window.location.href = learningHref
  }

  async function handleEnroll() {
    if (!session) {
      openAuthModal('login')
      return
    }

    if (isEnrolled) {
      window.location.href = learningHref
      return
    }

    setEnrollmentBusy(true)

    try {
      await enrollmentApi.enroll(displayCourse.courseId)
      setIsEnrolled(true)
      setEnrollModalOpen(true)
    } catch {
      setToastMessage('수강 신청에 실패했습니다.')
    } finally {
      setEnrollmentBusy(false)
    }
  }

  function handleSubmitQuestion() {
    const title = questionDraft.title.trim()
    const tag = questionDraft.tag.trim()
    const body = questionDraft.body.trim()

    if (!title) {
      setQuestionErrors('제목을 입력해주세요.')
      return
    }

    if (!body) {
      setQuestionErrors('내용을 입력해주세요.')
      return
    }

    const nextQuestion: CourseQuestionItem = {
      id: createNewQuestionId(questions),
      status: 'pending',
      authorName: session?.name ?? '사용자',
      tag: tag || '질문',
      title,
      body,
      views: 20,
      createdAt: new Date().toISOString(),
      comments: [],
    }

    setQuestions((current) => [nextQuestion, ...current])
    setQuestionDraft({ title: '', tag: '', body: '' })
    setQuestionErrors(null)
    setAskModalOpen(false)
    setOpenQuestionId(nextQuestion.id)
    startTransition(() => setActiveTab('qna'))
    setToastMessage('질문이 등록되었습니다.')
  }

  function handleToggleQuestion(questionId: number) {
    setOpenQuestionId((current) => (current === questionId ? null : questionId))
  }

  function handleSubmitComment(questionId: number) {
    const content = commentDrafts[questionId]?.trim()
    if (!content) return

    setQuestions((current) => current.map((question) => {
      if (question.id !== questionId) return question
      const nextReply = {
        id: createNewQuestionCommentId(question),
        authorName: session?.name ?? '사용자',
        content,
        createdAt: new Date().toISOString(),
      }

      return {
        ...question,
        status: session?.role === 'ROLE_INSTRUCTOR' ? 'answered' : question.status,
        comments: [...question.comments, nextReply],
      }
    }))

    setCommentDrafts((current) => ({ ...current, [questionId]: '' }))
    setToastMessage('댓글이 등록되었습니다.')
  }

  function handleExitStudentPreview() {
    window.location.assign(studentPreviewReturnHref)
  }

  return (
    <div className="h-screen min-h-0 overflow-hidden bg-white text-gray-800">
      {isStudentPreview ? (
        <div className="fixed top-0 left-0 right-0 z-[1200] flex min-h-[44px] flex-wrap items-center justify-center gap-2 bg-gray-800 px-4 py-2 text-center text-sm font-bold text-white shadow-lg">
          <span className="inline-flex items-center gap-2">
            <i className="fas fa-eye" />
            현재 '학생 시점' 미리보기 중입니다.
          </span>
          <button
            type="button"
            onClick={handleExitStudentPreview}
            className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/20"
          >
            미리보기 종료 (돌아가기)
          </button>
        </div>
      ) : null}

      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal('login')}
        activeNavHref="/lecture-list"
        offsetTopPx={headerOffsetTop}
      />

      <div className="course-detail-page app-main bg-white" style={appMainStyle}>
        <div className="course-detail-body-zoom">
        {courseNotice ? (
          <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 text-center text-sm font-semibold text-amber-700">
            {courseNotice}
          </div>
        ) : null}

        <section className="bg-gray-900 py-12 text-white">
          <div className="container mx-auto flex flex-col items-center gap-10 px-6 lg:px-20 md:flex-row">
            <div className="flex-1 space-y-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="rounded bg-primary px-2 py-1 text-xs font-bold text-white">Best Seller</span>
                {heroTags.map((tag) => (
                  <span key={tag} className="job-tag">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl leading-tight font-bold md:text-4xl">{displayCourse.title}</h1>
              <p className="text-sm text-gray-300 md:text-base">{displayCourse.description}</p>

              <div className="mt-4 flex items-center gap-4 text-sm">
                <StarRating rating={reviewStats.average || 4.8} className="text-sm" />
                <span className="text-gray-300">
                  {(reviewStats.average || 4.8).toFixed(1)} ({reviewStats.count || 320}개 수강평)
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-300">{Math.max(reviewStats.count * 4, 1204).toLocaleString('ko-KR')}명 수강 중</span>
              </div>

              <a href={instructorChannelHref} className="group inline-flex items-center gap-3 pt-4">
                <img
                  src={instructor?.profileImage ?? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100'}
                  className="h-10 w-10 rounded-full border-2 border-gray-700 transition group-hover:border-brand"
                  alt={instructor?.channelName ?? '강사 프로필'}
                />
                <div>
                  <p className="text-sm font-bold transition group-hover:text-white">{instructor?.channelName ?? '박강사'}</p>
                  <p className="text-xs text-gray-400 transition group-hover:text-gray-200">{instructor?.headline ?? '10년차 백엔드 개발자 · 실무 중심 자바 멘토'}</p>
                </div>
              </a>
            </div>

            <div className="w-full rounded-xl bg-white p-6 text-gray-900 shadow-2xl md:w-80">
              <button
                type="button"
                onClick={handlePreviewClick}
                className="group relative mb-4 aspect-video w-full overflow-hidden rounded-lg bg-gray-100 text-left"
              >
                <img
                  src={displayCourse.thumbnailUrl ?? 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  alt={displayCourse.title}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
                  <i className="fas fa-play-circle text-5xl text-white opacity-80 shadow-xl transition group-hover:opacity-100" />
                </div>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">미리보기</span>
              </button>

              <div className="mb-6">
                <span className="text-3xl font-extrabold text-gray-900">{formatCoursePrice(displayCourse.price, displayCourse.currency)}</span>
                {displayCourse.originalPrice && displayCourse.originalPrice > (displayCourse.price ?? 0) ? (
                  <span className="ml-2 text-sm text-gray-400 line-through">{formatCoursePrice(displayCourse.originalPrice, displayCourse.currency)}</span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void handleEnroll()}
                disabled={enrollmentBusy}
                className="mb-3 w-full rounded-lg bg-primary py-3 text-lg font-bold text-white shadow-lg transition active:scale-95 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isEnrolled ? '학습하러 가기' : enrollmentBusy ? '처리 중...' : '수강 신청하기'}
              </button>

              <div className="mt-4 space-y-2 text-xs text-gray-500">
                <p><i className="fas fa-check mr-2 text-primary" />무제한 수강 가능</p>
                <p><i className="fas fa-check mr-2 text-primary" />수료증 발급</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto flex flex-col gap-12 px-6 py-12 lg:px-20 md:flex-row">
          <div className="flex-1">
            <div className="course-detail-tab-bar mb-8 flex border-b border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => startTransition(() => setActiveTab('info'))}
                className={`course-detail-tab-btn px-6 py-4 font-medium transition ${activeTab === 'info' ? 'active text-primary' : 'text-gray-500 hover:text-gray-900'}`}
              >
                강의 정보
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => setActiveTab('news'))}
                className={`course-detail-tab-btn px-6 py-4 font-medium transition ${activeTab === 'news' ? 'active text-primary' : 'text-gray-500 hover:text-gray-900'}`}
              >
                새소식
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => setActiveTab('reviews'))}
                className={`course-detail-tab-btn px-6 py-4 font-medium transition ${activeTab === 'reviews' ? 'active text-primary' : 'text-gray-500 hover:text-gray-900'}`}
              >
                수강평 <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs">{reviewStats.count}</span>
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => setActiveTab('qna'))}
                className={`course-detail-tab-btn px-6 py-4 font-medium transition ${activeTab === 'qna' ? 'active text-primary' : 'text-gray-500 hover:text-gray-900'}`}
              >
                질문 게시판
              </button>
            </div>

            {activeTab === 'info' ? (
              <div className="course-detail-tab-panel">
                <div className="mb-12">
                  <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
                    <i className="fas fa-briefcase text-primary" /> 이 강의, 어떤 직무에 도움이 되나요?
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {jobCards.map((item) => (
                      <div key={item.key} className="job-card">
                        <div className="mb-3 flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${item.iconShellClassName}`}>
                            <i className={item.iconClassName} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{item.title}</h4>
                            <p className="text-xs text-gray-500">{item.subtitle}</p>
                          </div>
                        </div>
                        <p className="mb-3 text-sm text-gray-600">{item.description}</p>
                        <div className="flex gap-2">
                          <span className="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-600">{item.pill}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="prose mb-12 max-w-none border-t border-gray-100 pt-10 text-gray-700 leading-relaxed">
                  <h3 className="mb-4 text-xl font-bold text-gray-900">강의 요약</h3>
                  <p className="mb-4">{displayCourse.description}</p>
                  {displayCourse.objectives.length ? (
                    <>
                      <h3 className="mt-8 mb-4 text-xl font-bold text-gray-900">이 강의를 듣고 나면</h3>
                      <ul className="mb-4 list-disc space-y-2 pl-5">
                        {displayCourse.objectives.map((item) => (
                          <li key={item.objectiveId}>{item.objectiveText}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <h3 className="mt-8 mb-4 text-xl font-bold text-gray-900">이런 분들에게 추천합니다</h3>
                  <ul className="mb-4 list-disc space-y-2 pl-5">
                    {displayCourse.targetAudiences.map((item) => (
                      <li key={item.targetAudienceId}>
                        <span className="font-bold text-primary">{item.audienceDescription}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-12 border-t border-gray-100 pt-10">
                  <h3 className="mb-6 text-xl font-bold text-gray-900">커리큘럼</h3>
                  <div className="space-y-4">
                    {displayCourse.sections.map((section) => {
                      const opened = openSectionIds.includes(section.sectionId)
                      return (
                        <div key={section.sectionId} className="course-detail-section-card overflow-hidden rounded-xl border border-gray-200">
                          <button
                            type="button"
                            onClick={() => toggleSection(section.sectionId)}
                            className="accordion-header flex w-full cursor-pointer items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 transition"
                          >
                            <span className="font-bold text-gray-800">{section.title}</span>
                            <span className="text-xs text-gray-500">
                              {formatSectionMeta(section)} <i className={`fas ml-2 ${opened ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                            </span>
                          </button>

                          {opened ? (
                            <div className="bg-white">
                              {section.lessons.map((lesson) => {
                                const metaLabel = getCourseDetailLessonMetaLabel(lesson)

                                return (
                                  <div key={lesson.lessonId} className="flex items-center justify-between border-b border-gray-50 px-6 py-3 transition last:border-b-0 hover:bg-gray-50">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <i className={getCourseDetailLessonIconClassName(lesson)} />
                                      <span className="truncate text-sm text-gray-700">{lesson.title}</span>
                                    </div>
                                    <span className="shrink-0 text-xs font-semibold text-gray-400">{metaLabel}</span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'reviews' ? (
              <div className="course-detail-tab-panel">
                <h3 className="mb-6 text-xl font-bold text-gray-900">
                  수강평 <span className="text-sm font-normal text-gray-500">({reviewStats.count})</span>
                </h3>

                <div className="mb-8 flex items-center gap-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <div className="text-center">
                    <h4 className="text-4xl font-extrabold text-gray-900">{reviewStats.average.toFixed(1)}</h4>
                    <div className="my-1 flex justify-center">
                      <StarRating rating={reviewStats.average || 0} className="text-sm" />
                    </div>
                    <p className="text-xs text-gray-500">{reviewStats.count}개 평점</p>
                  </div>

                  <div className="flex-1 space-y-1">
                    {reviewStats.distribution.slice(0, 3).map((item) => (
                      <div key={item.rating} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-3">{item.rating}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full bg-yellow-400" style={{ width: `${item.percent}%` }} />
                        </div>
                        <span>{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6 flex flex-col items-center justify-between gap-4 border-b border-gray-100 pb-4 md:flex-row">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setReviewFilter('all')} className={buildReviewFilterClass(reviewFilter === 'all')}>전체</button>
                    <button type="button" onClick={() => setReviewFilter('five')} className={buildReviewFilterClass(reviewFilter === 'five')}>별 5점만</button>
                    <button type="button" onClick={() => setReviewFilter('fourPlus')} className={buildReviewFilterClass(reviewFilter === 'fourPlus')}>별 4점만</button>
                  </div>

                  <select
                    value={reviewSort}
                    onChange={(event) => setReviewSort(event.target.value as ReviewSortKey)}
                    className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-primary"
                  >
                    <option value="latest">최신순</option>
                    <option value="ratingDesc">평점 높은순</option>
                    <option value="ratingAsc">평점 낮은순</option>
                  </select>
                </div>

                {loadingReviews ? (
                  <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">수강평을 불러오는 중입니다.</div>
                ) : null}

                {!loadingReviews && visibleReviews.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">표시할 수강평이 없습니다.</div>
                ) : null}

                {!loadingReviews && visibleReviews.length > 0 ? (
                  <div className="space-y-6">
                    {visibleReviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-6">
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                              {buildReviewAvatarSeed(review)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{buildReviewAuthorName(review)}</p>
                              <p className="text-xs text-gray-400">{formatCourseDate(review.createdAt)}</p>
                            </div>
                          </div>
                          <StarRating rating={review.rating} />
                        </div>
                        <p className="text-sm leading-relaxed text-gray-700">{review.content}</p>

                        {review.officialReply ? (
                          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="mb-1 text-xs font-bold text-emerald-700">강사 답변</div>
                            <p className="text-sm leading-relaxed text-emerald-900">{review.officialReply.content}</p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'news' ? (
              <div className="course-detail-tab-panel">
                <h3 className="mb-6 text-xl font-bold text-gray-900">새소식</h3>
                <div className="space-y-4">
                  {newsCards.map((item) => {
                    const card = (
                      <div className="cursor-pointer rounded-xl border border-gray-200 p-5 transition hover:border-primary">
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${item.badgeClassName}`}>{item.badgeLabel}</span>
                          <span className="text-xs text-gray-400">{item.dateLabel}</span>
                        </div>
                        <h4 className="mb-1 font-bold text-gray-900">{item.title}</h4>
                        <p className="line-clamp-2 text-sm text-gray-600">{item.summary}</p>
                      </div>
                    )

                    return item.href ? (
                      <a key={item.id} href={item.href} target="_blank" rel="noreferrer">
                        {card}
                      </a>
                    ) : (
                      <div key={item.id}>{card}</div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {activeTab === 'qna' ? (
              <div className="course-detail-tab-panel">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">질문 게시판</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="openAskModalBtn"
                      onClick={() => {
                        setQuestionErrors(null)
                        setAskModalOpen(true)
                      }}
                      className="rounded-xl bg-brand px-4 py-2 font-bold text-white transition hover:bg-green-600"
                    >
                      <i className="fas fa-plus mr-1" /> 새 질문
                    </button>
                  </div>
                </div>

                <div className="qna-card mb-6 p-5">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setQnaFilter('all')} className={buildQuestionFilterClass(qnaFilter === 'all')}>전체</button>
                      <button type="button" onClick={() => setQnaFilter('pending')} className={buildQuestionFilterClass(qnaFilter === 'pending')}>답변 대기</button>
                      <button type="button" onClick={() => setQnaFilter('answered')} className={buildQuestionFilterClass(qnaFilter === 'answered')}>답변 완료</button>
                    </div>

                    <div className="flex flex-1 items-center gap-2">
                      <div className="relative w-full">
                        <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                        <input
                          id="qnaSearch"
                          value={qnaSearch}
                          onChange={(event) => setQnaSearch(event.target.value)}
                          className="qna-input qna-focus w-full bg-white py-2 pl-9 pr-3 text-sm font-semibold text-gray-700 placeholder:text-gray-400"
                          placeholder="제목/내용/작성자 키워드 검색"
                        />
                      </div>
                      <div className="whitespace-nowrap text-xs font-bold text-gray-400" id="qnaResultCount">
                        {visibleQuestions.length}개
                      </div>
                    </div>
                  </div>
                </div>

                <div id="qnaList" className="space-y-4">
                  {visibleQuestions.map((question) => {
                    const opened = openQuestionId === question.id
                    return (
                      <div
                        key={question.id}
                        className={`qna-card qna-card-item p-6 ${opened ? 'open' : ''}`}
                        onClick={() => handleToggleQuestion(question.id)}
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2">
                              <span className={`qna-badge ${question.status === 'answered' ? 'answered' : 'pending'}`}>
                                <i className={`fas ${question.status === 'answered' ? 'fa-circle-check' : 'fa-circle-question'}`} />
                                {buildQuestionStatusLabel(question.status)}
                              </span>
                              <span className="text-[11px] font-bold text-gray-400">{question.authorName} · {question.tag}</span>
                            </div>
                            <p className="text-base font-extrabold text-gray-900">{question.title}</p>
                          </div>
                          <span className="whitespace-nowrap text-xs font-bold text-gray-400">{formatRelativeTime(question.createdAt)}</span>
                        </div>

                        <p className="text-sm leading-relaxed text-gray-700">{question.body}</p>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="qna-meta-icon"><i className="fas fa-eye" /><span className="qna-views">{question.views}</span></span>
                            <span className="qna-meta-icon"><i className="fas fa-comment-dots" /><span className="qna-comments">{buildQuestionCommentCount(question)}</span></span>
                          </div>
                          <span className="text-xs font-extrabold text-gray-400">
                            <i className={`fas qna-chevron ${opened ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                          </span>
                        </div>

                        <div className="qna-detail mt-4">
                          <div className="border-t border-gray-100 pt-4">
                            <div className="mb-3 text-xs font-extrabold text-gray-500">
                              <i className="fas fa-comments mr-1 text-gray-400" /> 댓글
                            </div>

                            <div className="space-y-3">
                              {question.comments.length ? question.comments.map((comment) => (
                                <div key={comment.id} className="rounded-xl border border-gray-200 bg-white p-4">
                                  <p className="mb-1 text-xs font-extrabold text-gray-500">{comment.authorName}</p>
                                  <p className="text-sm leading-relaxed text-gray-700">{comment.content}</p>
                                </div>
                              )) : (
                                <div className="rounded-xl border border-gray-200 bg-white p-4">
                                  <p className="mb-1 text-xs font-extrabold text-gray-500">시스템</p>
                                  <p className="text-sm leading-relaxed text-gray-700">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                              <input
                                value={commentDrafts[question.id] ?? ''}
                                onChange={(event) => setCommentDrafts((current) => ({ ...current, [question.id]: event.target.value }))}
                                className="qna-input qna-focus"
                                placeholder="댓글을 입력하세요 (데모)"
                              />
                              <button
                                type="button"
                                onClick={() => handleSubmitComment(question.id)}
                                className="rounded-xl bg-brand px-4 py-2 font-bold text-white transition hover:bg-green-600"
                              >
                                등록
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {visibleQuestions.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
                      조건에 맞는 질문이 없습니다.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        </div>
      </div>

      {enrollModalOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center"
          aria-hidden="false"
          onClick={(event) => {
            if (event.target === event.currentTarget) setEnrollModalOpen(false)
          }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEnrollModalOpen(false)}
          />
          <div className="modal-animate relative mx-4 w-full max-w-[380px] overflow-hidden rounded-2xl bg-white px-8 py-10 shadow-2xl">
            <div className="mb-8 flex justify-center">
              <div className="flex h-[72px] w-[72px] animate-bounce items-center justify-center rounded-full bg-green-50 duration-1000">
                <svg className="h-10 w-10 text-brand" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12.5L9.2 16.5L19 7"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="mb-8 text-center">
              <h3 className="mb-2 text-2xl font-extrabold text-gray-900">수강신청 완료!</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                성공적으로 신청되었습니다.
                <br />
                지금 바로 학습을 시작해보세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                className="rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = learningHref
                }}
                className="rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600 hover:shadow-lg"
              >
                바로 학습하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {askModalOpen ? (
        <div
          className="qna-modal-backdrop show"
          id="askModal"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAskModalOpen(false)
          }}
        >
          <div className="qna-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="qna-modal-header">
              <div className="qna-modal-title"><i className="fas fa-pen-to-square text-primary" /> 새 질문 작성</div>
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                onClick={() => setAskModalOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="qna-modal-body">
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700">제목</label>
                  <input
                    id="qnaTitle"
                    value={questionDraft.title}
                    onChange={(event) => setQuestionDraft((current) => ({ ...current, title: event.target.value }))}
                    className="qna-input qna-focus"
                    placeholder="예: 클래스와 프로세스 차이가 궁금합니다"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700">구간/키워드 (선택)</label>
                  <input
                    id="qnaTag"
                    value={questionDraft.tag}
                    onChange={(event) => setQuestionDraft((current) => ({ ...current, tag: event.target.value }))}
                    className="qna-input qna-focus"
                    placeholder="예: Unit 3 / 12:40 / 상속"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-xs font-bold text-gray-700">내용</label>
                <textarea
                  id="qnaBody"
                  maxLength={1000}
                  value={questionDraft.body}
                  onChange={(event) => setQuestionDraft((current) => ({ ...current, body: event.target.value }))}
                  className="qna-textarea qna-focus"
                  placeholder="질문 내용을 자세하게 적어주세요."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-gray-400" id="qnaCount">
                  {questionDraft.body.length} / 1000
                </div>
                {questionErrors ? <div className="text-[11px] font-bold text-rose-500">{questionErrors}</div> : null}
              </div>
            </div>

            <div className="qna-modal-footer">
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                onClick={() => setAskModalOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                id="qnaSubmitBtn"
                className="rounded-xl bg-brand px-5 py-2 text-xs font-black text-white shadow-md transition hover:bg-green-600"
                onClick={handleSubmitQuestion}
              >
                질문 등록
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-[2200] rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {toastMessage}
        </div>
      ) : null}

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}

      {loadingCourse ? <LoadingOverlay /> : null}
    </div>
  )
}
