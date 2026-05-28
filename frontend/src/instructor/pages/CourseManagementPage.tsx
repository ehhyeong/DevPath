import { useEffect, useState, type SyntheticEvent } from 'react'
import { EmptyCard, ErrorCard, LoadingCard } from '../../account/ui'
import {
  DEFAULT_INSTRUCTOR_COURSE_THUMBNAIL,
  getInstructorCategoryChipLabel,
  normalizeInstructorCategoryLabel,
  normalizeInstructorCourseStatus,
  normalizeInstructorCourseTitle,
  normalizeInstructorLevelLabel,
  resolveInstructorCourseThumbnailUrl,
} from '../../instructor/course-display'
import { instructorAnnouncementApi, instructorCourseApi, instructorQnaApi } from '../../lib/api'
import type {
  InstructorAnnouncementDetail,
  InstructorCourseListItem,
  InstructorQnaInboxItem,
} from '../../types/instructor'

type CourseStatus = 'published' | 'review' | 'draft'
type CourseFilter = 'all' | 'published' | 'draft'
type MetricTone = 'purple' | 'blue' | 'green' | 'yellow'
type QuickViewFilter =
  | 'default'
  | 'latest'
  | 'oldest'
  | 'published-only'
  | 'review-only'
  | 'draft-only'
  | 'rating-desc'
  | 'students-desc'

type CourseCardModel = InstructorCourseListItem & {
  displayStatus: CourseStatus
  displayTitle: string
  displayCategory: string
  displayCategoryChip: string
  displayLevel: string
  displayThumbnailUrl: string
  displayDate: string
  displayDuration: string
  displayRatingValue: string
  displayReviewCountLabel: string
  displayStudentCountLabel: string
  displayProgressLabel: string
  displayTags: string[]
  displayPendingQuestionCount: number
  displayPendingQuestionLabel: string
  displayDraftProgress: number
  displayDraftMessage: string
}

const ANNOUNCEMENT_TITLE_LABELS: Record<string, string> = {
  'Offline security special event': '오프라인 스프링 시큐리티 특강 안내',
  'Course material update': '강의 자료 업데이트 안내',
}

const ANNOUNCEMENT_CONTENT_LABELS: Record<string, string> = {
  'Join the offline Spring Security special lecture and Q&A session.':
    '오프라인 스프링 시큐리티 특강과 Q&A 세션 일정을 안내드립니다.',
  'The latest Spring Boot Intro materials and examples have been updated.':
    '스프링 부트 입문 강의의 최신 자료와 예제 파일이 업데이트되었습니다.',
}

function normalizeAnnouncementTitle(title: string) {
  return ANNOUNCEMENT_TITLE_LABELS[title] ?? title
}

function normalizeAnnouncementContent(content: string) {
  return ANNOUNCEMENT_CONTENT_LABELS[content] ?? content
}

function formatCompactDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

function formatDuration(durationSeconds: number | null) {
  if (!durationSeconds || durationSeconds <= 0) {
    return '분량 미정'
  }

  const totalMinutes = Math.floor(durationSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) {
    return `${minutes}분`
  }

  if (minutes <= 0) {
    return `${hours}시간`
  }

  return `${hours}시간 ${minutes}분`
}

function buildDraftProgress(course: InstructorCourseListItem) {
  let progress = 10

  if (course.title.trim()) {
    progress += 10
  }

  if (course.lessonCount > 0) {
    progress += Math.min(course.lessonCount * 10, 30)
  }

  if (course.durationSeconds && course.durationSeconds > 0) {
    progress += 20
  }

  if (course.levelLabel && course.levelLabel !== '-') {
    progress += 10
  }

  return Math.min(progress, 95)
}

function formatCount(value: number) {
  return value.toLocaleString('ko-KR')
}

function getCourseSortTimestamp(course: CourseCardModel) {
  const publishedAt = course.publishedAt ? new Date(course.publishedAt).getTime() : Number.NaN
  if (Number.isFinite(publishedAt)) {
    return publishedAt
  }

  return course.courseId
}

function getUniqueValues(courses: CourseCardModel[], key: 'displayCategory' | 'displayLevel') {
  return [...new Set(courses.map((course) => course[key]).filter(Boolean))].sort()
}

function handleThumbnailError(event: SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.dataset.fallbackApplied === 'true') {
    return
  }

  target.dataset.fallbackApplied = 'true'
  target.src = DEFAULT_INSTRUCTOR_COURSE_THUMBNAIL
}

function buildCourseTags(course: InstructorCourseListItem) {
  return [...new Set((course.tags ?? []).map((tag) => tag.trim()).filter(Boolean))].slice(0, 3)
}

function toCourseCardModel(course: InstructorCourseListItem): CourseCardModel {
  const reviewCount = Number(course.reviewCount ?? 0)

  return {
    ...course,
    displayStatus: normalizeInstructorCourseStatus(course.status) as CourseStatus,
    displayTitle: normalizeInstructorCourseTitle(course.title) ?? '제목 없는 강의 (초안)',
    displayCategory: normalizeInstructorCategoryLabel(course.categoryLabel, course.title),
    displayCategoryChip: getInstructorCategoryChipLabel(course.categoryLabel, course.title),
    displayLevel: normalizeInstructorLevelLabel(course.levelLabel),
    displayThumbnailUrl: resolveInstructorCourseThumbnailUrl(course.thumbnailUrl, course.title),
    displayDate: formatCompactDate(course.publishedAt ?? course.createdAt),
    displayDuration: formatDuration(course.durationSeconds),
    displayRatingValue: course.averageRating.toFixed(1),
    displayReviewCountLabel: formatCount(reviewCount),
    displayStudentCountLabel: `${formatCount(course.studentCount)}명`,
    displayProgressLabel: `${course.averageProgressPercent.toFixed(0)}%`,
    displayTags: buildCourseTags(course),
    displayPendingQuestionCount: Number(course.pendingQuestionCount ?? 0),
    displayPendingQuestionLabel: `${formatCount(course.pendingQuestionCount)}건`,
    displayDraftProgress: buildDraftProgress(course),
    displayDraftMessage: '커리큘럼 작성 중',
  }
}

function CourseHashTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return null
  }

  return (
    <div className="mb-2.5 flex flex-wrap gap-1.5">
      {tags.map((tag, index) => (
        <span key={`${tag}-${index}`} className={index === 0 ? 'hash-tag hash-tag-brand' : 'hash-tag'}>
          {tag}
        </span>
      ))}
    </div>
  )
}

function MetricCard(_: {
  label: string
  value: string
  sub: string
  icon: string
  tone: MetricTone
}) {
  const { label, value, sub, icon, tone } = _
  const toneClass =
    tone === 'purple'
      ? 'bg-purple-50 text-purple-600'
      : tone === 'blue'
        ? 'bg-blue-50 text-blue-600'
        : tone === 'green'
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-yellow-50 text-yellow-500'

  return (
    <article className="rounded-[16px] border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-gray-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${toneClass}`}>
          <i className={icon} />
        </div>
      </div>
      <div className="text-[22px] font-bold leading-none text-gray-900">{value}</div>
      <p className="mt-1.5 text-[11px] font-medium text-gray-400">{sub}</p>
    </article>
  )
}

function PublishedCourseCard(_: {
  course: CourseCardModel
  onOpenNotice: (courseId: number) => void
}) {
  const { course, onOpenNotice } = _

  return (
    <article className="course-item rounded-[16px] border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition hover:-translate-y-[1px] hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(17,24,39,0.04)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="relative h-[100px] w-full shrink-0 overflow-hidden rounded-[10px] bg-gray-100 md:w-[160px]">
          <img
            src={course.displayThumbnailUrl}
            alt={course.displayTitle}
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
            onError={handleThumbnailError}
          />
          <div className="absolute left-2 top-2 rounded bg-gray-900/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
            {course.displayCategoryChip}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
                  <i className="fas fa-circle text-[6px]" />
                  공개 중
                </span>
                <span className="text-[11px] font-medium text-gray-400">
                  업데이트: {course.displayDate}
                </span>
              </div>
              <h3 className="truncate text-base font-bold text-gray-900 transition hover:text-emerald-500">
                {course.displayTitle}
              </h3>
              <CourseHashTags tags={course.displayTags} />
            </div>

            <div className="flex gap-1">
              <button
                type="button"
                title="통계"
                onClick={() => {
                  window.location.href = `/student-analytics?courseId=${course.courseId}`
                }}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <i className="fas fa-chart-line" />
              </button>
              <button
                type="button"
                title="공지사항"
                onClick={() => onOpenNotice(course.courseId)}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <i className="fas fa-bullhorn" />
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
              {course.displayLevel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
              <i className="fas fa-clock text-gray-400" />
              {course.displayDuration}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-yellow-100 bg-yellow-50 px-2 py-1 text-[11px] font-semibold text-yellow-700">
              <i className="fas fa-star text-[10px] text-yellow-500" />
              {course.displayRatingValue} ({course.displayReviewCountLabel})
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4 px-2 text-xs">
              <div className="flex flex-col">
                <span className="mb-0.5 font-semibold text-gray-500">누적 수강생</span>
                <span className="font-bold text-gray-900">{course.displayStudentCountLabel}</span>
              </div>
              <div className="hidden h-8 w-px bg-gray-200 sm:block" />
              <div className="flex flex-col">
                <span className="mb-0.5 font-semibold text-gray-500">수강률</span>
                <span className="font-bold text-emerald-500">{course.displayProgressLabel}</span>
              </div>
              <div className="hidden h-8 w-px bg-gray-200 sm:block" />
              <div className="flex flex-col">
                <span className="mb-0.5 font-semibold text-red-400">미답변 Q&amp;A</span>
                <span className="font-bold text-red-600">{course.displayPendingQuestionLabel}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = `/instructor-course-detail?courseId=${course.courseId}`
              }}
              className="inline-flex h-[34px] items-center justify-center rounded-[10px] bg-gray-900 px-[14px] text-[12px] font-semibold text-white transition hover:bg-gray-700"
            >
              관리하기
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function ReviewCourseCard(_: { course: CourseCardModel }) {
  const { course } = _

  return (
    <article className="course-item rounded-[16px] border border-gray-200 bg-gray-50/30 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex h-[100px] w-full shrink-0 items-center justify-center rounded-[10px] border border-gray-200 bg-gray-100 md:w-[160px]">
          <i className="fas fa-search text-2xl text-gray-300" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                  <i className="fas fa-hourglass-half text-[8px]" />
                  심사 대기
                </span>
                <span className="text-[11px] font-medium text-gray-400">
                  제출일 {course.displayDate}
                </span>
              </div>
              <h3 className="truncate text-base font-bold text-gray-900">{course.displayTitle}</h3>
              <CourseHashTags tags={course.displayTags} />
            </div>
          </div>

          <div className="mb-3 flex gap-2">
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
              {course.displayLevel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
              <i className="fas fa-clock text-gray-400" />
              {course.displayDuration}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-4">
            <p className="inline-flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              <i className="fas fa-info-circle" />
              운영팀 검토 중 (약 1~2일 소요)
            </p>
            <button
              type="button"
              disabled
              className="inline-flex h-[34px] cursor-not-allowed items-center rounded-[10px] border border-gray-200 bg-white px-[14px] text-[12px] font-semibold text-gray-400"
            >
              수정 불가
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function DraftCourseCard(_: { course: CourseCardModel }) {
  const { course } = _

  return (
    <article className="course-item rounded-[16px] border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex h-[100px] w-full shrink-0 items-center justify-center rounded-[10px] border border-gray-200 bg-gray-50 md:w-[160px]">
          <i className="fas fa-pen text-2xl text-gray-300" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                  <i className="fas fa-edit text-[8px]" />
                  작성 중
                </span>
                <span className="text-[11px] font-medium text-gray-400">
                  생성일 {course.displayDate}
                </span>
              </div>
              <h3 className="truncate text-base font-bold text-gray-500">{course.displayTitle}</h3>
              <CourseHashTags tags={course.displayTags} />
            </div>

            <button
              type="button"
              onClick={() => window.alert('초안 삭제는 아직 연결되지 않았습니다.')}
              className="px-2 text-[11px] font-semibold text-gray-400 transition hover:text-red-500"
            >
              삭제
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between gap-6">
            <div className="w-full max-w-sm">
              <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-gray-500">
                <span>진행률 {course.displayDraftProgress}%</span>
                <span>{course.displayDraftMessage}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${course.displayDraftProgress}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = `/course-editor?courseId=${course.courseId}`
              }}
              className="inline-flex h-[34px] items-center rounded-[10px] border border-emerald-500 px-[14px] text-[12px] font-semibold text-emerald-600 transition hover:bg-emerald-50"
            >
              이어서 작성
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

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
              window.location.href = '/course-editor'
            }}
            className="inline-flex h-[34px] items-center gap-2 rounded-[10px] bg-emerald-500 px-[14px] text-[12px] font-semibold text-white transition hover:bg-emerald-600"
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

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-[12px] bg-[#F3F4F6] p-1">
              {[
                { key: 'all' as const, label: '전체보기' },
                { key: 'published' as const, label: '공개 중' },
                { key: 'draft' as const, label: '작성/심사' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilterStatus(item.key)}
                  className={`inline-flex h-[32px] items-center rounded-[8px] px-[14px] text-[12px] font-semibold leading-none transition ${
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
                className="h-[34px] appearance-none rounded-full border border-gray-200 bg-white pl-[14px] pr-9 text-[12px] font-semibold leading-none text-gray-700 outline-none transition hover:border-gray-300 hover:bg-gray-50"
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
                className="h-[34px] appearance-none rounded-full border border-gray-200 bg-white pl-[14px] pr-9 text-[12px] font-semibold leading-none text-gray-700 outline-none transition hover:border-gray-300 hover:bg-gray-50"
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

            <label className="inline-flex h-[34px] items-center gap-2 rounded-full border border-gray-200 bg-white px-[14px] text-[12px] font-semibold leading-none text-gray-600 transition hover:border-gray-300 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(event) => setPendingOnly(event.target.checked)}
                className="h-[14px] w-[14px] rounded border border-gray-300 accent-emerald-500"
              />
              미답변 질문 있는 강의만
            </label>

          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative sm:w-[180px]">
              <select
                value={quickViewFilter}
                onChange={(event) => setQuickViewFilter(event.target.value as QuickViewFilter)}
                className="h-[34px] w-full appearance-none rounded-[10px] border border-gray-200 bg-white pl-[14px] pr-9 text-[12px] font-semibold leading-none text-gray-700 outline-none transition hover:border-gray-300 hover:bg-gray-50"
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
                className="h-[34px] w-full rounded-[10px] border border-gray-200 bg-white py-0 pl-8 pr-4 text-[12px] font-medium leading-none text-gray-700 outline-none transition focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
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
