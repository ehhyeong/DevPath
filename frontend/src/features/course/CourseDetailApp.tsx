import { useAuthSession } from '../../lib/useAuthSession'
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import CourseDetailHero from './CourseDetailHero'
import CourseDetailOverlays from './CourseDetailOverlays'
import CourseDetailTabNav from './CourseDetailTabNav'
import AuthModal, { type AuthView } from '../../components/AuthModal'
import SiteHeader from '../../components/SiteHeader'
import { CourseDescription,LoadingOverlay,StarRating } from './CourseDetailViewComponents'
import { readNumberSearchParam,readAuthViewFromLocation,readStudentPreviewFromLocation,readStudentPreviewReturnHref,readSafeReturnToFromLocation,syncAuthViewInLocation,buildQuestionFilterClass,buildQuestionBadgeClass,buildQuestionCardClass,buildReviewFilterClass,toQuestionSummary,mapQnaQuestionToCourseQuestion,createQnaQuestionSearchText } from './course-detail-view-support'
import {
  buildCourseJobCards,
  buildCourseNewsCards,
  buildQuestionCommentCount,
  buildQuestionStatusLabel,
  buildReviewAuthorName,
  buildReviewAvatarSeed,
  buildReviewStats,
  formatCourseDate,
  formatRelativeTime,
  formatSectionMeta,
  getCourseDetailLessonIconClassName,
  getCourseDetailLessonMetaLabel,
  getLearningHref,
  getPreviewLesson,
  isCourseDetailVideoLesson,
  mergeCourseDetailWithFallback,
  type CourseNewsCard,
  type CourseQuestionStatus,
} from './course-detail-support'
import { buildInstructorChannelHref } from '../../instructor/channel/support'
import { authApi, userApi } from '../../lib/api/auth'
import { courseApi, enrollmentApi, qnaApi, reviewApi } from '../../lib/api/learner'
import { instructorCourseApi } from '../../lib/api/instructor'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from '../../lib/auth-session'
import { useInternalPageScroll } from '../../lib/useInternalPageScroll'
import type { CourseReview } from '../../types/course'
import type { LearningCourseDetail } from '../../types/learning'
import type { CreateQnaQuestionRequest, QnaQuestionDetail, QnaQuestionSummary } from '../../types/qna'

type TabKey = 'info' | 'news' | 'reviews' | 'qna'
type ReviewFilterKey = 'all' | 'five' | 'fourPlus'
type ReviewSortKey = 'latest' | 'ratingDesc' | 'ratingAsc'

const APP_HEADER_HEIGHT_PX = 64
const STUDENT_PREVIEW_BANNER_HEIGHT_PX = 44
const qnaInputBaseClassName = 'qna-input w-full rounded-[12px] border-[1px] border-solid border-[#e5e7eb] bg-white px-[12px] py-[10px] [outline:none] [transition:all_0.2s] focus:border-[#00c471] focus:[box-shadow:0_0_0_3px_rgba(0,196,113,0.12)]'
const qnaInputClassName = `${qnaInputBaseClassName} text-[14px]!`
const qnaMetaIconClassName = 'inline-flex items-center gap-[6px] text-[12px] font-[800] text-[#6b7280] [&_i]:text-[#9ca3af]'

export default function CourseDetailApp() {
  useInternalPageScroll()

  const courseId = useMemo(() => readNumberSearchParam('courseId'), [])
  const originalRoadmapId = useMemo(() => readNumberSearchParam('originalRoadmapId'), [])
  const originalNodeId = useMemo(() => readNumberSearchParam('originalNodeId'), [])
  const isStudentPreview = useMemo(() => readStudentPreviewFromLocation(), [])
  const studentPreviewReturnHref = useMemo(() => readStudentPreviewReturnHref(courseId), [courseId])
  const returnToHref = useMemo(() => readSafeReturnToFromLocation(), [])
  const [session,setSession] = useAuthSession()
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [course, setCourse] = useState<LearningCourseDetail | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [courseNotice, setCourseNotice] = useState<string | null>(null)
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [qnaQuestions, setQnaQuestions] = useState<QnaQuestionSummary[]>([])
  const [qnaDetails, setQnaDetails] = useState<Record<number, QnaQuestionDetail>>({})
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [loadingQuestionId, setLoadingQuestionId] = useState<number | null>(null)
  const [qnaError, setQnaError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('info')
  const [openSectionIds, setOpenSectionIds] = useState<number[]>([])
  const [videoDurationOverrides, setVideoDurationOverrides] = useState<Record<number, number>>({})
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterKey>('all')
  const [reviewSort, setReviewSort] = useState<ReviewSortKey>('latest')
  const [qnaFilter, setQnaFilter] = useState<'all' | CourseQuestionStatus>('all')
  const [qnaSearch, setQnaSearch] = useState('')
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null)
  const [questionDraft, setQuestionDraft] = useState({ title: '', tag: '', body: '' })
  const [questionErrors, setQuestionErrors] = useState<string | null>(null)
  const [questionBusy, setQuestionBusy] = useState(false)
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [answerBusyId, setAnswerBusyId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [askModalOpen, setAskModalOpen] = useState(false)
  const [selectedNews, setSelectedNews] = useState<CourseNewsCard | null>(null)
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrollmentBusy, setEnrollmentBusy] = useState(false)
  const deferredQnaSearch = useDeferredValue(qnaSearch.trim().toLowerCase())

  const displayCourse = useMemo(() => mergeCourseDetailWithFallback(course), [course])
  const courseInfoSections = useMemo(() => {
    if (displayCourse.infoSections?.length) {
      return displayCourse.infoSections.filter((section) => section.items.length > 0)
    }

    return [
      {
        sectionKey: 'PREREQUISITES',
        title: '수강 전 알아두면 좋아요',
        displayOrder: 0,
        items: displayCourse.prerequisites,
      },
      {
        sectionKey: 'OBJECTIVES',
        title: '이 강의를 듣고 나면',
        displayOrder: 1,
        items: displayCourse.objectives.map((item) => item.objectiveText),
      },
      {
        sectionKey: 'TARGET_AUDIENCE',
        title: '이런 분들에게 추천합니다',
        displayOrder: 2,
        items: displayCourse.targetAudiences.map((item) => item.audienceDescription),
      },
    ].filter((section) => section.items.length > 0)
  }, [displayCourse])
  const instructor = displayCourse.instructor
  const previewLesson = useMemo(() => getPreviewLesson(displayCourse), [displayCourse])
  const learningHref = useMemo(
    () => getLearningHref(displayCourse.courseId, previewLesson, returnToHref, originalRoadmapId, originalNodeId),
    [displayCourse.courseId, previewLesson, returnToHref, originalRoadmapId, originalNodeId],
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
    qnaQuestions.map((question) => mapQnaQuestionToCourseQuestion(question, qnaDetails[question.id])).filter((item) => {
      const source = qnaQuestions.find((question) => question.id === item.id)
      const statusMatched = qnaFilter === 'all' || item.status === qnaFilter
      const searchText = source
        ? createQnaQuestionSearchText(source, qnaDetails[source.id])
        : `${item.authorName} ${item.tag} ${item.title} ${item.body}`.toLowerCase()
      const searchMatched = !deferredQnaSearch || searchText.includes(deferredQnaSearch)
      return statusMatched && searchMatched
    })
  ), [deferredQnaSearch, qnaDetails, qnaFilter, qnaQuestions])

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
  }, [setSession])

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
        const response = isStudentPreview && session
          ? await instructorCourseApi.getCourseDetail(courseId, controller.signal)
          : await courseApi.getCourseDetail(courseId, controller.signal)
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
  }, [courseId, isStudentPreview, session])

  useEffect(() => {
    setOpenSectionIds(displayCourse.sections[0] ? [displayCourse.sections[0].sectionId] : [])
  }, [displayCourse.courseId, displayCourse.sections])

  useEffect(() => {
    let cancelled = false
    const videoElements: HTMLVideoElement[] = []
    const videoLessons = displayCourse.sections
      .flatMap((section) => section.lessons)
      .filter((item) => isCourseDetailVideoLesson(item) && Boolean(item.videoUrl))

    setVideoDurationOverrides({})

    videoLessons.forEach((item) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = item.videoUrl!
      video.onloadedmetadata = () => {
        if (cancelled || !Number.isFinite(video.duration) || video.duration <= 0) return
        setVideoDurationOverrides((current) => ({
          ...current,
          [item.lessonId]: Math.round(video.duration),
        }))
      }
      video.onerror = () => {}
      videoElements.push(video)
    })

    return () => {
      cancelled = true
      videoElements.forEach((video) => {
        video.onloadedmetadata = null
        video.onerror = null
        video.removeAttribute('src')
        video.load()
      })
    }
  }, [displayCourse.courseId, displayCourse.sections])

  useEffect(() => {
    if (!courseId || loadingCourse) {
      setLoadingReviews(false)
      setReviews([])
      return
    }

    if (!course) {
      setLoadingReviews(false)
      setReviews([])
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
        setReviews(response)
      } catch {
        if (cancelled) return
        setReviews([])
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
    if (!session?.accessToken || !course?.courseId) {
      setQnaQuestions([])
      setQnaDetails({})
      setLoadingQuestions(false)
      setQnaError(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const currentCourseId = course.courseId

    async function loadQuestions() {
      setLoadingQuestions(true)
      setQnaError(null)
      try {
        const response = await qnaApi.getQuestions(currentCourseId, controller.signal)
        if (cancelled) return
        setQnaQuestions(response)
        setQnaDetails({})
        setQnaError(null)
      } catch (error) {
        if (cancelled) return
        setQnaQuestions([])
        setQnaDetails({})
        setQnaError(error instanceof Error ? error.message : '질문 목록을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoadingQuestions(false)
      }
    }

    void loadQuestions()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [course?.courseId, session?.accessToken])

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
    if (!askModalOpen && !enrollModalOpen && !selectedNews) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setAskModalOpen(false)
      setEnrollModalOpen(false)
      setSelectedNews(null)
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [askModalOpen, enrollModalOpen, selectedNews])

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

    navigateTo(learningHref)
  }

  async function handleEnroll() {
    if (!session) {
      openAuthModal('login')
      return
    }

    if (isEnrolled) {
      navigateTo(learningHref)
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

  async function handleSubmitQuestion() {
    if (!session) {
      openAuthModal('login')
      return
    }

    if (!course?.courseId) {
      setQuestionErrors('강의 정보를 불러온 뒤 다시 시도해주세요.')
      return
    }

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

    const payload: CreateQnaQuestionRequest = {
      templateType: 'STUDY',
      difficulty: 'MEDIUM',
      title,
      content: body,
      courseId: course.courseId,
      lessonId: null,
      lectureTimestamp: tag || null,
    }

    setQuestionBusy(true)
    try {
      const created = await qnaApi.createQuestion(payload, session.userId)
      setQnaDetails((current) => ({ ...current, [created.id]: created }))
      setQnaQuestions((current) => [toQuestionSummary(created), ...current.filter((item) => item.id !== created.id)])
      setQuestionDraft({ title: '', tag: '', body: '' })
      setQuestionErrors(null)
      setAskModalOpen(false)
      setOpenQuestionId(created.id)
      startTransition(() => setActiveTab('qna'))
      setToastMessage('질문이 등록되었습니다.')
    } catch (error) {
      setQuestionErrors(error instanceof Error ? error.message : '질문 등록에 실패했습니다.')
    } finally {
      setQuestionBusy(false)
    }
  }

  async function handleToggleQuestion(questionId: number) {
    const willOpen = openQuestionId !== questionId
    setOpenQuestionId(willOpen ? questionId : null)

    if (!willOpen || qnaDetails[questionId] || loadingQuestionId === questionId) return

    setLoadingQuestionId(questionId)
    setQnaError(null)
    try {
      const detail = await qnaApi.getQuestionDetail(questionId)
      setQnaDetails((current) => ({ ...current, [questionId]: detail }))
      setQnaQuestions((current) => current.map((item) => (item.id === questionId ? toQuestionSummary(detail) : item)))
    } catch (error) {
      setQnaError(error instanceof Error ? error.message : '질문 상세를 불러오지 못했습니다.')
    } finally {
      setLoadingQuestionId((current) => (current === questionId ? null : current))
    }
  }

  async function handleSubmitComment(questionId: number) {
    if (!session) {
      openAuthModal('login')
      return
    }

    const content = commentDrafts[questionId]?.trim()
    if (!content || answerBusyId === questionId) return

    setAnswerBusyId(questionId)
    setQnaError(null)
    try {
      await qnaApi.createAnswer(questionId, { content })
      const detail = await qnaApi.getQuestionDetail(questionId)
      setQnaDetails((current) => ({ ...current, [questionId]: detail }))
      setQnaQuestions((current) => current.map((item) => (item.id === questionId ? toQuestionSummary(detail) : item)))
      setCommentDrafts((current) => ({ ...current, [questionId]: '' }))
      setToastMessage('답변이 등록되었습니다.')
    } catch (error) {
      setQnaError(error instanceof Error ? error.message : '답변 등록에 실패했습니다.')
    } finally {
      setAnswerBusyId((current) => (current === questionId ? null : current))
    }
  }

  function handleExitStudentPreview() {
    navigateTo(studentPreviewReturnHref)
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

      <div className="course-detail-page app-main bg-white!" style={appMainStyle}>
        <div className="course-detail-body-zoom ml-[calc((100%-(100%/var(--course-detail-body-zoom)))/2)] min-h-full w-[calc(100%/var(--course-detail-body-zoom))] origin-top-left bg-white [--course-detail-body-zoom:0.9] [zoom:var(--course-detail-body-zoom)] max-[1023px]:ml-0 max-[1023px]:w-full max-[1023px]:transform-none max-[1023px]:[zoom:1]">
        {courseNotice ? (
          <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 text-center text-sm font-semibold text-amber-700">
            {courseNotice}
          </div>
        ) : null}

        <CourseDetailHero displayCourse={displayCourse} heroTags={heroTags} reviewStats={reviewStats} instructorChannelHref={instructorChannelHref} instructor={instructor} handlePreviewClick={handlePreviewClick} handleEnroll={handleEnroll} enrollmentBusy={enrollmentBusy} isEnrolled={isEnrolled} />

        <section className="container mx-auto flex flex-col gap-12 px-6 py-12 lg:px-20 md:flex-row">
          <div className="flex-1">
            <CourseDetailTabNav activeTab={activeTab} reviewCount={reviewStats.count} onChange={(tab) => startTransition(() => setActiveTab(tab))} />

            {activeTab === 'info' ? (
              <div className="course-detail-tab-panel">
                {jobCards.length ? (
                  <div className="mb-12">
                    <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
                      <i className="fas fa-briefcase text-primary" /> 이 강의, 어떤 직무에 도움이 되나요?
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {jobCards.map((item) => (
                        <div key={item.key} className="job-card rounded-[12px] border-[1px] border-solid border-[#e5e7eb] bg-[#fafafa] p-[20px] [transition:all_0.2s] hover:border-[#00c471] hover:bg-[#f0fdf4] hover:[transform:translateY(-2px)]">
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
                ) : null}

                <div className="prose mb-12 max-w-none border-t border-gray-100 pt-10 text-gray-700 leading-relaxed">
                  <h3 className="mb-4 text-xl font-bold text-gray-900">강의 요약</h3>
                  <CourseDescription description={displayCourse.description ?? ''} />
                  {courseInfoSections.map((section) => (
                    <div key={`${section.sectionKey}-${section.title}`}>
                      <h3 className="mt-8 mb-4 text-xl font-bold text-gray-900">{section.title}</h3>
                      <ul className="mb-4 list-disc space-y-2 pl-5">
                        {section.items.map((item) => (
                          <li key={item}>
                            <span className={section.sectionKey === 'TARGET_AUDIENCE' ? 'font-bold text-primary' : undefined}>
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mb-12 border-t border-gray-100 pt-10">
                  <h3 className="mb-6 text-xl font-bold text-gray-900">커리큘럼</h3>
                  <div className="space-y-4">
                    {displayCourse.sections.map((section) => {
                      const opened = openSectionIds.includes(section.sectionId)
                      return (
                        <div key={section.sectionId} className="course-detail-section-card overflow-hidden rounded-xl border border-gray-200 bg-[#fafafa]">
                          <button
                            type="button"
                            onClick={() => toggleSection(section.sectionId)}
                            className="accordion-header flex w-full cursor-pointer items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 transition hover:bg-[#f9fafb]"
                          >
                            <span className="font-bold text-gray-800">{section.title}</span>
                            <span className="text-xs text-gray-500">
                              {formatSectionMeta(section, videoDurationOverrides)} <i className={`fas ml-2 ${opened ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                            </span>
                          </button>

                          {opened ? (
                            <div className="bg-white">
                              {section.lessons.map((lesson) => {
                                const metaLabel = getCourseDetailLessonMetaLabel(lesson, videoDurationOverrides[lesson.lessonId])

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

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="block w-full text-left"
                        onClick={() => setSelectedNews(item)}
                      >
                        {card}
                      </button>
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
                        if (!session) {
                          openAuthModal('login')
                          return
                        }
                        setQuestionErrors(null)
                        setAskModalOpen(true)
                      }}
                      className="course-detail-qna-new-button inline-flex! h-[40px]! shrink-0 items-center! gap-[6px]! whitespace-nowrap rounded-[14px]! bg-brand px-[18px]! py-0! text-[14px]! leading-[18px]! font-extrabold! text-white transition hover:bg-green-600"
                    >
                      <i className="fas fa-plus mr-0! text-[14px]!" /> 새 질문
                    </button>
                  </div>
                </div>

                <div className="course-detail-qna-toolbar qna-card mb-6 p-[16px]!">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div className="course-detail-qna-filter-group flex items-center gap-[8px]!">
                      <button type="button" onClick={() => setQnaFilter('all')} className={buildQuestionFilterClass(qnaFilter === 'all')}>전체</button>
                      <button type="button" onClick={() => setQnaFilter('pending')} className={buildQuestionFilterClass(qnaFilter === 'pending')}>답변 대기</button>
                      <button type="button" onClick={() => setQnaFilter('answered')} className={buildQuestionFilterClass(qnaFilter === 'answered')}>답변 완료</button>
                    </div>

                    <div className="flex flex-1 items-center gap-2">
                      <div className="relative w-full">
                        <i className="course-detail-qna-search-icon fas fa-magnifying-glass pointer-events-none absolute top-1/2 left-[14px]! z-[1] w-[14px] -translate-y-1/2 text-center text-[13px]! text-gray-400" />
                        <input
                          id="qnaSearch"
                          value={qnaSearch}
                          onChange={(event) => setQnaSearch(event.target.value)}
                          className={`${qnaInputBaseClassName} course-detail-qna-search-input h-[36px]! py-0! pr-[44px]! pl-[38px]! text-[13px]! leading-[18px]! font-bold! text-gray-700 placeholder:text-[13px]! placeholder:font-bold placeholder:text-[#9ca3af]`}
                          placeholder="제목/내용/작성자 키워드 검색"
                        />
                      </div>
                      <div className="whitespace-nowrap text-xs font-bold text-gray-400" id="qnaResultCount">
                        {visibleQuestions.length}개
                      </div>
                    </div>
                  </div>
                </div>

                {qnaError ? (
                  <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                    {qnaError}
                  </div>
                ) : null}

                <div id="qnaList" className="space-y-4">
                  {loadingQuestions ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm font-bold text-gray-500">
                      질문을 불러오는 중입니다.
                    </div>
                  ) : null}

                  {visibleQuestions.map((question) => {
                    const opened = openQuestionId === question.id
                    return (
                      <div
                        key={question.id}
                        className={buildQuestionCardClass(opened)}
                        onClick={() => handleToggleQuestion(question.id)}
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2">
                              <span className={buildQuestionBadgeClass(question.status)}>
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
                            <span className={qnaMetaIconClassName}><i className="fas fa-eye" /><span className="qna-views">{question.views}</span></span>
                            <span className={qnaMetaIconClassName}><i className="fas fa-comment-dots" /><span className="qna-comments">{buildQuestionCommentCount(question)}</span></span>
                          </div>
                          <span className="text-xs font-extrabold text-gray-400">
                            <i className={`fas qna-chevron ${opened ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                          </span>
                        </div>

                        <div className={`mt-4 overflow-hidden [transition:max-height_0.28s_ease] ${opened ? 'max-h-[520px]' : 'max-h-0'}`}>
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
                                className={qnaInputClassName}
                                placeholder="댓글을 입력하세요"
                              />
                              <button
                                type="button"
                                onClick={() => handleSubmitComment(question.id)}
                                disabled={answerBusyId === question.id}
                                className="shrink-0 whitespace-nowrap rounded-xl bg-brand px-4 py-2 font-bold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                              >
                                {answerBusyId === question.id ? '등록 중' : '등록'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {!loadingQuestions && visibleQuestions.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
                      {session ? '조건에 맞는 질문이 없습니다.' : '로그인 후 질문게시판을 확인할 수 있습니다.'}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        </div>
      </div>

      <CourseDetailOverlays
        enrollModalOpen={enrollModalOpen}
        setEnrollModalOpen={setEnrollModalOpen}
        learningHref={learningHref}
        selectedNews={selectedNews}
        setSelectedNews={setSelectedNews}
        askModalOpen={askModalOpen}
        setAskModalOpen={setAskModalOpen}
        questionDraft={questionDraft}
        setQuestionDraft={setQuestionDraft}
        questionErrors={questionErrors}
        questionBusy={questionBusy}
        handleSubmitQuestion={handleSubmitQuestion}
        toastMessage={toastMessage}
      />

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
