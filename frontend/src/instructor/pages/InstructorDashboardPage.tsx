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
import { ErrorCard, LoadingCard } from '../../account/ui'
import { instructorAnalyticsApi, instructorCourseApi, instructorMentoringApi, instructorQnaApi, instructorReviewApi } from '../../lib/api/instructor'
import type { AuthSession } from '../../types/auth'
import type {
  InstructorAnalyticsDashboard,
  InstructorAnalyticsDropOffItem,
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

import { DashboardTabButton, isOlderThanHours, isStudentStalled, compareCreatedDesc, compareCreatedAsc, buildInsightText, QuickReplyModal } from './InstructorDashboardPrimitives'
import { LearningDashboardContent, MentoringDashboardContent } from './InstructorDashboardSections'

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
      if (event.key === 'Escape' && !replySubmitting) {
        setSelectedQuestion(null)
        setReplyDraft('')
        setReplyError(null)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedQuestion, replySubmitting])

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
            <h1 className="whitespace-nowrap text-xl font-semibold text-gray-900">수강 관리 센터</h1>
            <p className="mt-1 text-sm text-gray-500">
              {session.name} 강사님의 강의 운영 이슈와 조치 항목을 실제 데이터 기준으로 확인합니다.
            </p>
          </div>

          <div className="inline-flex w-fit max-w-full overflow-x-auto rounded-[12px] bg-[#F3F4F6] p-1">
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
          <div className="origin-top-left [zoom:0.9]">
            <MentoringDashboardContent mentoringBoard={mentoringBoard} />
          </div>
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
