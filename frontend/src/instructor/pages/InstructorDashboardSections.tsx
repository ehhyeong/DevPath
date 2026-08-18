import { formatNumber } from '../../account/ui-utils'
import type {
  InstructorAnalyticsDashboard,
  InstructorAnalyticsDropOffItem,
  InstructorAnalyticsStudentItem,
  InstructorMentoringBoard,
  InstructorQnaInboxItem,
  InstructorReviewListItem,
  InstructorReviewSummary,
} from '../../types/instructor'
import { DashboardMetricCard,DropOffTrendChart,EmptyState,ReviewStars,SOFT_LIST_ITEM,SOFT_PANEL,clampPercent,formatElapsed,formatPercent,getModeLabel,isOlderThanHours } from './InstructorDashboardPrimitives'

export function LearningMetricsGrid({
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

export function IssueReviewList({ issueReviews }: { issueReviews: InstructorReviewListItem[] }) {
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
            <span className="inline-flex max-w-[140px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
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

export function QnaListPanel({
  questions,
  onReply,
}: {
  questions: InstructorQnaInboxItem[]
  onReply: (question: InstructorQnaInboxItem) => void
}) {
  return (
    <article className={`${SOFT_PANEL} flex min-h-[300px] flex-col overflow-hidden`}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-[#F9FAFB] p-4">
        <h3 className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[14px] font-semibold text-gray-900">
          <i className="fas fa-bolt text-yellow-500" />
          답변이 필요한 Q&amp;A
        </h3>
        <a href="/instructor-qna" className="shrink-0 whitespace-nowrap text-xs font-medium text-gray-500 transition hover:text-brand">
          게시판 가기
          <i className="fas fa-chevron-right ml-1 text-[10px]" />
        </a>
      </div>

      <div className="hidden shrink-0 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5 text-[11px] font-medium text-gray-400 md:flex">
        <div className="w-36 shrink-0">강의 / 학습자</div>
        <div className="flex-1 px-4">질문 내용</div>
        <div className="w-32 shrink-0 whitespace-nowrap text-right">대기 시간 / 조치</div>
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
                  <span className={`shrink-0 whitespace-nowrap text-[11px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                    <i className={`${overdue ? 'fas fa-exclamation-circle' : 'far fa-clock'} mr-1 text-[10px]`} />
                    {formatElapsed(question.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onReply(question)}
                    className={`w-28 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition ${
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

export function AssignmentStatsCard({ summary }: { summary: InstructorAnalyticsDashboard['assignmentStats']['summary'] }) {
  const passRate = clampPercent(summary.passRate)
  const failRate = summary.totalSubmissions > 0 ? clampPercent(100 - passRate) : 0

  return (
    <article className="rounded-lg border border-gray-800/90 bg-[#111827] p-5 text-white shadow-[0_14px_28px_rgba(17,24,39,0.18)]">
      <h3 className="mb-4 flex items-center gap-2 whitespace-nowrap text-[14px] font-semibold text-gray-100">
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

export function LatestReviewsCard({
  latestReviews,
  pendingCount,
}: {
  latestReviews: InstructorReviewListItem[]
  pendingCount: number
}) {
  return (
    <article className={`${SOFT_PANEL} flex min-h-[300px] flex-col p-5`}>
      <h3 className="mb-4 flex shrink-0 items-center justify-between gap-3 text-[14px] font-semibold text-gray-900">
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <i className="fas fa-star text-yellow-500" />
          신규 리뷰
        </span>
        <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-yellow-100 bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-600">
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
        className="mt-4 block shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-white py-2 text-center text-[13px] font-medium text-gray-700 transition hover:bg-gray-50"
      >
        리뷰 전체 보기
      </a>
    </article>
  )
}

export function LearningSummaryCard({
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
      <h3 className="mb-4 flex items-center gap-2 whitespace-nowrap text-[14px] font-semibold text-gray-900">
        <i className="fas fa-users text-brand" />
        강의 운영 요약
      </h3>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <p className="whitespace-nowrap text-xs font-medium text-gray-500">공개 강의</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(publishedCourseCount)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <p className="whitespace-nowrap text-xs font-medium text-gray-500">수강생</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(totalStudents)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <p className="whitespace-nowrap text-xs font-medium text-gray-500">평균 진도</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatPercent(averageProgress)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <p className="whitespace-nowrap text-xs font-medium text-gray-500">평균 평점</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{averageRating.toFixed(1)}</p>
        </div>
      </div>
    </article>
  )
}

export function LearningDashboardContent({
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
                <h3 className="mb-1 whitespace-nowrap text-[14px] font-semibold text-gray-900">운영 인사이트</h3>
                <p className="text-[13px] leading-6 text-gray-600">{insightText}</p>
              </div>
            </div>
          </article>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <article className={`${SOFT_PANEL} flex flex-col p-5`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[14px] font-semibold text-gray-900">
                  <i className="fas fa-chart-area text-blue-500" />
                  이탈 위험 분석
                </h3>
                <select
                  className="min-w-0 max-w-[180px] cursor-pointer rounded border border-gray-200 bg-white p-1.5 text-[12px] font-medium text-gray-600 shadow-sm outline-none transition focus:border-brand disabled:cursor-wait disabled:opacity-60 sm:max-w-[220px]"
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
                <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
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

export function MentoringDashboardContent({ mentoringBoard }: { mentoringBoard: InstructorMentoringBoard }) {
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
                <h3 className="mb-1 whitespace-nowrap text-[15px] font-semibold text-gray-900">멘토링 브리프</h3>
                <p className="text-sm leading-6 text-gray-600">
                  {pendingMentoringRequests > 0
                    ? `새 신청 ${formatNumber(pendingMentoringRequests)}건이 대기 중입니다. 신청서 검토 후 프로젝트 참여 여부를 확정해주세요.`
                    : '대기 중인 신청은 없습니다. 진행 중인 프로젝트 일정과 다음 액션을 확인해주세요.'}
                </p>
              </div>
            </div>
          </article>

          <article className={`${SOFT_PANEL} p-5`}>
            <h3 className="mb-6 flex items-center gap-2 whitespace-nowrap text-base font-semibold text-gray-900">
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
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600">
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
              <h3 className="whitespace-nowrap text-base font-semibold text-gray-900">신청 대기열</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-sm">
                <tbody className="divide-y divide-gray-100">
                  {mentoringBoard.requests.length > 0 ? (
                    mentoringBoard.requests.slice(0, 3).map((request) => (
                      <tr key={request.id} className="transition hover:bg-gray-50">
                        <td className="w-24 whitespace-nowrap px-6 py-4">
                          <span className="inline-flex whitespace-nowrap rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase">
                            {getModeLabel(request.mode)}
                          </span>
                        </td>
                        <td className="min-w-48 px-4 font-semibold text-gray-900">
                          <span className="block truncate">{request.projectTitle}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 text-xs text-gray-400">{request.role}</td>
                        <td className="whitespace-nowrap px-6 text-right font-semibold text-blue-500">{request.applicantName}</td>
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
            <h3 className="mb-5 flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-gray-900">
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
                    <p className="truncate text-sm font-semibold text-gray-900">{project.primaryAction}</p>
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
            <p className="mb-3 whitespace-nowrap text-sm font-semibold text-gray-400">새 멘토링 프로젝트 시작</p>
            <a
              href="/instructor-mentoring"
              className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-6 py-2 text-xs font-semibold text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:bg-gray-50 hover:shadow-[0_6px_14px_rgba(15,23,42,0.06)]"
            >
              멘토링 보드 열기
            </a>
          </article>
        </div>
      </div>
    </div>
  )
}
