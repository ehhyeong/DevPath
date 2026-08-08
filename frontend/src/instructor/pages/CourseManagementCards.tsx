/* eslint-disable react-refresh/only-export-components */
import { type SyntheticEvent } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import {
  DEFAULT_INSTRUCTOR_COURSE_THUMBNAIL,
  getInstructorCategoryChipLabel,
  normalizeInstructorCategoryLabel,
  normalizeInstructorCourseStatus,
  normalizeInstructorCourseTitle,
  normalizeInstructorLevelLabel,
  resolveInstructorCourseThumbnailUrl,
} from '../course-display'
import type { InstructorCourseListItem } from '../../types/instructor'

export type CourseStatus = 'published' | 'review' | 'draft'
export type CourseFilter = 'all' | 'published' | 'draft'
export type MetricTone = 'purple' | 'blue' | 'green' | 'yellow'
export type QuickViewFilter =
  | 'default'
  | 'latest'
  | 'oldest'
  | 'published-only'
  | 'review-only'
  | 'draft-only'
  | 'rating-desc'
  | 'students-desc'

export type CourseCardModel = InstructorCourseListItem & {
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

export const ANNOUNCEMENT_TITLE_LABELS: Record<string, string> = {
  'Offline security special event': '오프라인 스프링 시큐리티 특강 안내',
  'Course material update': '강의 자료 업데이트 안내',
}

export const ANNOUNCEMENT_CONTENT_LABELS: Record<string, string> = {
  'Join the offline Spring Security special lecture and Q&A session.':
    '오프라인 스프링 시큐리티 특강과 Q&A 세션 일정을 안내드립니다.',
  'The latest Spring Boot Intro materials and examples have been updated.':
    '스프링 부트 입문 강의의 최신 자료와 예제 파일이 업데이트되었습니다.',
}

export function normalizeAnnouncementTitle(title: string) {
  return ANNOUNCEMENT_TITLE_LABELS[title] ?? title
}

export function normalizeAnnouncementContent(content: string) {
  return ANNOUNCEMENT_CONTENT_LABELS[content] ?? content
}

export function formatCompactDate(value: string | null | undefined) {
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

export function formatDuration(durationSeconds: number | null) {
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

export function buildDraftProgress(course: InstructorCourseListItem) {
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

export function formatCount(value: number) {
  return value.toLocaleString('ko-KR')
}

export function getCourseSortTimestamp(course: CourseCardModel) {
  const publishedAt = course.publishedAt ? new Date(course.publishedAt).getTime() : Number.NaN
  if (Number.isFinite(publishedAt)) {
    return publishedAt
  }

  return course.courseId
}

export function getUniqueValues(courses: CourseCardModel[], key: 'displayCategory' | 'displayLevel') {
  return [...new Set(courses.map((course) => course[key]).filter(Boolean))].sort()
}

export function handleThumbnailError(event: SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.dataset.fallbackApplied === 'true') {
    return
  }

  target.dataset.fallbackApplied = 'true'
  target.src = DEFAULT_INSTRUCTOR_COURSE_THUMBNAIL
}

export function buildCourseTags(course: InstructorCourseListItem) {
  return [...new Set((course.tags ?? []).map((tag) => tag.trim()).filter(Boolean))].slice(0, 3)
}

export function toCourseCardModel(course: InstructorCourseListItem): CourseCardModel {
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

export function CourseHashTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return null
  }

  return (
    <div className="mb-2.5 flex flex-wrap gap-1.5">
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className={`hash-tag inline-flex cursor-pointer items-center rounded-[6px] border-[1px] border-solid border-[#e5e7eb] bg-[#f3f4f6] px-[8px] py-[4px] text-[11px] font-[600] tracking-[-0.01em] text-[#4b5563] [transition:all_0.2s] hover:bg-[#e5e7eb] hover:text-[#111827] ${index === 0 ? 'hash-tag-brand border-[#d1fae5]! bg-[#f0fdf4]! text-[#059669] hover:bg-[#dcfce7]!' : ''}`}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

export function MetricCard(_: {
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

export function PublishedCourseCard(_: {
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
                  navigateTo(`/student-analytics?courseId=${course.courseId}`)
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
                navigateTo(`/instructor-course-detail?courseId=${course.courseId}`)
              }}
              className="inline-flex h-[34px]! min-h-[34px]! items-center justify-center rounded-[12px]! bg-[#111827]! px-[16px]! py-[8px]! text-[12px]! leading-[16px]! font-[900]! tracking-[0]! text-[#ffffff]! [box-shadow:0_6px_14px_rgba(17,24,39,0.12)]! transition hover:bg-black! [&:hover]:[box-shadow:0_8px_18px_rgba(17,24,39,0.16)]!"
            >
              관리하기
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ReviewCourseCard(_: { course: CourseCardModel }) {
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

export function DraftCourseCard(_: { course: CourseCardModel }) {
  const { course } = _

  return (
    <article className="course-item rounded-[16px] border border-gray-200 bg-white p-4 font-['Pretendard',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]! shadow-[0_1px_3px_rgba(0,0,0,0.02)] [&_.hash-tag]:text-[11px]! [&_.hash-tag]:leading-[1.2]! [&_button]:text-[12px]! [&_button]:leading-[1.2]!">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex h-[100px] w-full shrink-0 items-center justify-center rounded-[10px] border border-gray-200 bg-gray-50 md:w-[160px]">
          <i className="fas fa-pen text-2xl text-gray-300" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px]! leading-[1.2]! font-semibold text-gray-600">
                  <i className="fas fa-edit text-[11px]! leading-[1]!" />
                  작성 중
                </span>
                <span className="text-[12px]! leading-[1.2]! font-medium text-gray-400">
                  생성일 {course.displayDate}
                </span>
              </div>
              <h3 className="truncate text-[16px]! leading-[1.25]! font-bold text-gray-500">{course.displayTitle}</h3>
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
              <div className="mb-1 flex items-center justify-between text-[12px]! leading-[1.2]! font-medium text-gray-500">
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
                navigateTo(`/course-editor?courseId=${course.courseId}`)
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
