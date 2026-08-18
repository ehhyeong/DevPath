import { useEffect, useState } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import { EmptyCard, ErrorCard, LoadingCard } from '../../account/ui'
import { instructorAnnouncementApi, instructorCourseApi, instructorQnaApi } from '../../lib/api/instructor'
import type {
  InstructorAnnouncementDetail,
  InstructorCourseListItem,
  InstructorQnaInboxItem,
} from '../../types/instructor'

import { normalizeAnnouncementTitle, normalizeAnnouncementContent, formatCompactDate, formatCount, getCourseSortTimestamp, getUniqueValues, toCourseCardModel, MetricCard, PublishedCourseCard, ReviewCourseCard, DraftCourseCard } from './CourseManagementCards'
import type { CourseFilter,QuickViewFilter } from './CourseManagementCards'

export default function CourseManagementPage() {
  const [courses, setCourses] = useState<InstructorCourseListItem[]>([])
  const [unansweredQuestions, setUnansweredQuestions] = useState<InstructorQnaInboxItem[] | null>(null)
  const [filterStatus, setFilterStatus] = useState<CourseFilter>('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')
  const [quickViewFilter, setQuickViewFilter] = useState<QuickViewFilter>('latest')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noticeModalCourseId, setNoticeModalCourseId] = useState<number | null>(null)
  const [notices, setNotices] = useState<InstructorAnnouncementDetail[]>([])
  const [noticesLoading, setNoticesLoading] = useState(false)
  const [createNoticeOpen, setCreateNoticeOpen] = useState(false)
  const [expandedNoticeIds, setExpandedNoticeIds] = useState<number[]>([])
  const [newNoticeTitle, setNewNoticeTitle] = useState('')
  const [newNoticeContent, setNewNoticeContent] = useState('')
  const [showTitleError, setShowTitleError] = useState(false)
  const [showContentError, setShowContentError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      instructorCourseApi.getCourses(controller.signal),
      instructorQnaApi.getInbox('UNANSWERED', controller.signal).catch(() => null),
    ])
      .then(([nextCourses, nextUnansweredQuestions]) => {
        setCourses(nextCourses)
        setUnansweredQuestions(nextUnansweredQuestions)
        setError(null)
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

  const unansweredQuestionCountsByCourse = unansweredQuestions?.reduce<Map<number, number>>((counts, question) => {
    if (question.courseId === null || question.courseId === undefined) {
      return counts
    }

    counts.set(question.courseId, (counts.get(question.courseId) ?? 0) + 1)
    return counts
  }, new Map())

  const courseCards = courses
    .map(toCourseCardModel)
    .map((course) => {
      if (!unansweredQuestionCountsByCourse) {
        return course
      }

      const pendingCount = unansweredQuestionCountsByCourse.get(course.courseId) ?? 0
      return {
        ...course,
        displayPendingQuestionCount: pendingCount,
        displayPendingQuestionLabel: `${formatCount(pendingCount)}건`,
      }
    })

  const categoryOptions = getUniqueValues(courseCards, 'displayCategory')
  const levelOptions = getUniqueValues(courseCards, 'displayLevel')
  const selectedCourse = courseCards.find((course) => course.courseId === noticeModalCourseId) ?? null

  const totalStudents = courseCards.reduce((sum, course) => sum + course.studentCount, 0)
  const totalPendingQuestions = courseCards.reduce(
    (sum, course) => sum + course.displayPendingQuestionCount,
    0,
  )
  const totalPublished = courseCards.filter((course) => course.displayStatus === 'published').length
  const totalReview = courseCards.filter((course) => course.displayStatus === 'review').length
  const totalDraft = courseCards.filter((course) => course.displayStatus === 'draft').length
  const totalReviewCount = courseCards.reduce(
    (sum, course) => sum + Number(course.reviewCount ?? 0),
    0,
  )
  const weightedRatingSum = courseCards.reduce(
    (sum, course) => sum + course.averageRating * Number(course.reviewCount ?? 0),
    0,
  )
  const averageRating = totalReviewCount > 0 ? weightedRatingSum / totalReviewCount : 0

  const visibleCourses = courseCards
    .filter((course) => {
      if (filterStatus === 'published' && course.displayStatus !== 'published') {
        return false
      }

      if (filterStatus === 'draft' && course.displayStatus === 'published') {
        return false
      }

      if (filterCategory !== 'all' && course.displayCategory !== filterCategory) {
        return false
      }

      if (filterLevel !== 'all' && course.displayLevel !== filterLevel) {
        return false
      }

      if (pendingOnly && course.displayPendingQuestionCount === 0) {
        return false
      }

      if (quickViewFilter === 'published-only' && course.displayStatus !== 'published') {
        return false
      }

      if (quickViewFilter === 'review-only' && course.displayStatus !== 'review') {
        return false
      }

      if (quickViewFilter === 'draft-only' && course.displayStatus !== 'draft') {
        return false
      }

      if (!search.trim()) {
        return true
      }

      const keyword = search.trim().toLowerCase()
      return `${course.displayTitle} ${course.displayCategory} ${course.displayLevel}`
        .toLowerCase()
        .includes(keyword)
    })
    .sort((left, right) => {
      if (quickViewFilter === 'latest') {
        return getCourseSortTimestamp(right) - getCourseSortTimestamp(left)
      }

      if (quickViewFilter === 'oldest') {
        return getCourseSortTimestamp(left) - getCourseSortTimestamp(right)
      }

      if (quickViewFilter === 'rating-desc') {
        return (
          right.averageRating - left.averageRating ||
          Number(right.reviewCount ?? 0) - Number(left.reviewCount ?? 0) ||
          right.courseId - left.courseId
        )
      }

      if (quickViewFilter === 'students-desc') {
        return right.studentCount - left.studentCount || right.courseId - left.courseId
      }

      return right.courseId - left.courseId
    })

  async function openNoticeModal(courseId: number) {
    setNoticeModalCourseId(courseId)
    setExpandedNoticeIds([])
    setNoticesLoading(true)

    try {
      const summaries = await instructorAnnouncementApi.getByCourse(courseId)
      const details = await Promise.all(
        summaries.map((item) => instructorAnnouncementApi.getDetail(item.announcementId)),
      )
      setNotices(details)
    } catch (nextError) {
      window.alert(nextError instanceof Error ? nextError.message : '공지 목록을 불러오지 못했습니다.')
      setNotices([])
    } finally {
      setNoticesLoading(false)
    }
  }

  function closeNoticeModal() {
    setNoticeModalCourseId(null)
    setCreateNoticeOpen(false)
    setExpandedNoticeIds([])
    setNotices([])
  }

  function toggleNoticeExpansion(announcementId: number) {
    setExpandedNoticeIds((current) =>
      current.includes(announcementId)
        ? current.filter((item) => item !== announcementId)
        : [...current, announcementId],
    )
  }

  async function createNotice() {
    const trimmedTitle = newNoticeTitle.trim()
    const trimmedContent = newNoticeContent.trim()

    setShowTitleError(!trimmedTitle)
    setShowContentError(!trimmedContent)

    if (!trimmedTitle || !trimmedContent || !noticeModalCourseId) {
      return
    }

    try {
      await instructorAnnouncementApi.create(noticeModalCourseId, {
        type: 'normal',
        title: trimmedTitle,
        content: trimmedContent,
        pinned: false,
        displayOrder: notices.length,
      })
      await openNoticeModal(noticeModalCourseId)
      setCreateNoticeOpen(false)
    } catch (nextError) {
      window.alert(nextError instanceof Error ? nextError.message : '공지 등록에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="course-management-page p-6">
        <LoadingCard label="강의 목록을 불러오는 중입니다." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="course-management-page p-6">
        <ErrorCard message={error} />
      </div>
    )
  }

  return (
    <div className="course-management-page min-h-full bg-[#F8F9FA] p-6">
      <div className="mx-auto max-w-[1200px] pb-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">강의 관리</h1>
            <p className="mt-1 text-xs font-medium text-gray-500">
              작성 중이거나 운영 중인 모든 강의를 한 화면에서 관리하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigateTo('/course-editor')
            }}
            className="inline-flex h-[40px]! min-h-[40px]! items-center gap-2 rounded-[14px]! bg-[#00c471]! px-[15px]! py-[10px]! text-[13px]! leading-[18px]! font-[900]! tracking-[0]! text-[#ffffff]! [box-shadow:0_10px_20px_rgba(0,196,113,0.18)]! transition hover:bg-[#00b565]! hover:[transform:translateY(-1px)]! active:[transform:translateY(0)_scale(0.99)]!"
          >
            <i className="fas fa-plus" />
            새 강의 만들기
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="총 강의 수"
            value={`${formatCount(courseCards.length)}개`}
            sub={`공개 ${formatCount(totalPublished)} · 심사 ${formatCount(totalReview)} · 작성 ${formatCount(totalDraft)}`}
            icon="fas fa-video"
            tone="purple"
          />
          <MetricCard
            label="총 수강생"
            value={`${formatCount(totalStudents)}명`}
            sub="운영 중인 강의의 누적 수강생 기준"
            icon="fas fa-users"
            tone="blue"
          />
          <MetricCard
            label="미답변 질문"
            value={`${formatCount(totalPendingQuestions)}건`}
            sub="빠른 답변이 필요한 질문 수"
            icon="fas fa-question-circle"
            tone="green"
          />
          <MetricCard
            label="평균 평점"
            value={`${averageRating.toFixed(1)} / 5.0`}
            sub={
              totalReviewCount > 0
                ? `총 ${formatCount(totalReviewCount)}개 리뷰`
                : '아직 등록된 리뷰가 없습니다.'
            }
            icon="fas fa-star"
            tone="yellow"
          />
        </div>

        <div className="mb-5 flex flex-col gap-[14px]! font-['Pretendard',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]! tracking-[0]! [&_i]:leading-[1]! lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-[10px]!">
            <div className="inline-flex h-[38px]! items-center! rounded-[12px]! bg-[#f3f4f6]! p-[4px]!">
              {[
                { key: 'all' as const, label: '전체보기' },
                { key: 'published' as const, label: '공개 중' },
                { key: 'draft' as const, label: '작성/심사' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilterStatus(item.key)}
                  className={`inline-flex h-[30px]! min-h-[30px]! items-center rounded-[8px]! px-[13px]! py-0! text-[12px]! leading-[16px]! font-[800]! tracking-[0]! transition ${
                    filterStatus === item.key
                      ? 'bg-white text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <select
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
                className="h-[36px]! min-h-[36px]! appearance-none rounded-[10px]! border border-[#e5e7eb]! bg-[#ffffff]! py-0! pr-9 pl-[14px]! text-[12px]! leading-[16px]! font-[700]! tracking-[0]! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.03)]! outline-none transition hover:border-gray-300 hover:bg-gray-50"
              >
                <option value="all">전체 카테고리</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400" />
            </div>

            <div className="relative">
              <select
                value={filterLevel}
                onChange={(event) => setFilterLevel(event.target.value)}
                className="h-[36px]! min-h-[36px]! appearance-none rounded-[10px]! border border-[#e5e7eb]! bg-[#ffffff]! py-0! pr-9 pl-[14px]! text-[12px]! leading-[16px]! font-[700]! tracking-[0]! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.03)]! outline-none transition hover:border-gray-300 hover:bg-gray-50"
              >
                <option value="all">전체 난이도</option>
                {levelOptions.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400" />
            </div>

            <label className="inline-flex h-[36px]! min-h-[36px]! items-center gap-[8px]! whitespace-nowrap! rounded-[10px]! border border-[#e5e7eb]! bg-[#ffffff]! px-[14px]! text-[12px]! leading-[16px]! font-[700]! tracking-[0]! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.03)]! transition hover:border-gray-300 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(event) => setPendingOnly(event.target.checked)}
                className="h-[14px]! min-h-[14px]! w-[14px]! border border-gray-300 [border-radius:4px]! [box-shadow:none]! accent-emerald-500"
              />
              미답변 질문 있는 강의만
            </label>

          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative sm:w-[180px]">
              <select
                value={quickViewFilter}
                onChange={(event) => setQuickViewFilter(event.target.value as QuickViewFilter)}
                className="h-[36px]! min-h-[36px]! w-full appearance-none rounded-[10px]! border border-[#e5e7eb]! bg-[#ffffff]! py-0! pr-9 pl-[14px]! text-[12px]! leading-[16px]! font-[700]! tracking-[0]! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.03)]! outline-none transition hover:border-gray-300 hover:bg-gray-50"
              >
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="published-only">공개된 것만</option>
                <option value="review-only">심사 중만</option>
                <option value="draft-only">작성 중만</option>
                <option value="rating-desc">평점 높은순</option>
                <option value="students-desc">수강생 많은순</option>
              </select>
              <i className="fas fa-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400" />
            </div>

            <div className="relative w-full lg:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="text"
                placeholder="강의명 검색..."
                className="h-[36px]! min-h-[36px]! w-full rounded-[10px]! border border-[#e5e7eb]! bg-[#ffffff]! py-0! pr-[14px]! pl-[32px]! text-[12px]! leading-[16px]! font-[600]! tracking-[0]! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.03)]! outline-none transition placeholder:font-[600]! placeholder:text-[#9ca3af]! placeholder:opacity-100! focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {visibleCourses.length === 0 ? (
            <EmptyCard
              title="조건에 맞는 강의가 없습니다."
              description="필터를 조정하거나 검색어를 바꿔서 다시 확인해보세요."
            />
          ) : null}

          {visibleCourses.map((course) =>
            course.displayStatus === 'published' ? (
              <PublishedCourseCard key={course.courseId} course={course} onOpenNotice={openNoticeModal} />
            ) : course.displayStatus === 'review' ? (
              <ReviewCourseCard key={course.courseId} course={course} />
            ) : (
              <DraftCourseCard key={course.courseId} course={course} />
            ),
          )}
        </div>
      </div>

      {selectedCourse ? (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[16px] border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <i className="fas fa-bullhorn text-emerald-500" />
                <span>{selectedCourse.displayTitle} 공지 관리</span>
              </div>
              <button
                type="button"
                onClick={closeNoticeModal}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-5">
              {noticesLoading ? (
                <LoadingCard label="공지 목록을 불러오는 중입니다." />
              ) : notices.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">등록된 공지사항이 없습니다.</div>
              ) : (
                <div className="space-y-2.5">
                  {notices.map((notice) => {
                    const expanded = expandedNoticeIds.includes(notice.announcementId)

                    return (
                      <button
                        key={notice.announcementId}
                        type="button"
                        onClick={() => toggleNoticeExpansion(notice.announcementId)}
                        className="w-full rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {normalizeAnnouncementTitle(notice.title)}
                          </div>
                          <div className="text-[11px] font-medium text-gray-400">
                            {formatCompactDate(notice.publishedAt)}
                          </div>
                        </div>
                        {expanded ? (
                          <div className="mt-3 border-t border-dashed border-gray-200 pt-3 text-xs leading-6 text-gray-600">
                            {normalizeAnnouncementContent(notice.content)}
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setExpandedNoticeIds([])}
                className="inline-flex h-[34px] items-center rounded-[10px] border border-gray-200 bg-white px-[14px] text-[12px] font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                모두 닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateNoticeOpen(true)
                  setNewNoticeTitle('')
                  setNewNoticeContent('')
                  setShowTitleError(false)
                  setShowContentError(false)
                }}
                className="inline-flex h-[34px] items-center gap-2 rounded-[10px] bg-emerald-500 px-[14px] text-[12px] font-semibold text-white transition hover:bg-emerald-600"
              >
                <i className="fas fa-plus" />
                새 공지 작성
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedCourse && createNoticeOpen ? (
        <div className="fixed inset-0 z-[2300] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[500px] overflow-hidden rounded-[16px] border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <i className="fas fa-pen text-emerald-500" />
                <span>새 공지 작성</span>
              </div>
              <button
                type="button"
                onClick={() => setCreateNoticeOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <div className="mb-2 text-[11px] font-bold text-gray-600">
                  제목 <span className="text-rose-500">*</span>
                </div>
                <input
                  value={newNoticeTitle}
                  onChange={(event) => setNewNoticeTitle(event.target.value)}
                  maxLength={60}
                  placeholder="제목을 입력하세요"
                  className="h-[38px] w-full rounded-[10px] border border-gray-200 px-4 text-[12px] text-gray-700 outline-none transition focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                />
                {showTitleError ? (
                  <div className="mt-1 text-[11px] font-semibold text-rose-500">제목을 입력해주세요.</div>
                ) : null}
              </label>

              <label className="block">
                <div className="mb-2 text-[11px] font-bold text-gray-600">
                  내용 <span className="text-rose-500">*</span>
                </div>
                <textarea
                  value={newNoticeContent}
                  onChange={(event) => setNewNoticeContent(event.target.value)}
                  maxLength={800}
                  placeholder="공지 내용을 작성하세요"
                  className="min-h-[128px] w-full rounded-[10px] border border-gray-200 px-4 py-3 text-[12px] text-gray-700 outline-none transition focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                />
                {showContentError ? (
                  <div className="mt-1 text-[11px] font-semibold text-rose-500">내용을 입력해주세요.</div>
                ) : null}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setCreateNoticeOpen(false)}
                className="inline-flex h-[34px] items-center rounded-[10px] border border-gray-200 bg-white px-[14px] text-[12px] font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={createNotice}
                className="inline-flex h-[34px] items-center rounded-[10px] bg-emerald-500 px-[14px] text-[12px] font-semibold text-white transition hover:bg-emerald-600"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
