export type EvaluationEditorKind = 'quiz' | 'assignment'

type LessonEditorUrlOptions = {
  lessonId?: number | null
  lessonTitle?: string | null
  courseId?: number | null
}

type LessonEditorContext = {
  lessonId: number | null
  lessonTitle: string
  courseId: number | null
}

function parsePositiveNumber(value: string | null) {
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function buildCourseEditorHref(courseId?: number | null) {
  if (!courseId || !Number.isFinite(courseId)) {
    return '/course-editor'
  }

  return `/course-editor?courseId=${courseId}`
}

export function buildLessonEditorHref(kind: EvaluationEditorKind, options: LessonEditorUrlOptions) {
  const pathname = kind === 'quiz' ? '/quiz-creator' : '/content-assignment-editor'
  const searchParams = new URLSearchParams()

  if (options.lessonId && Number.isFinite(options.lessonId)) {
    searchParams.set('lessonId', String(options.lessonId))
  }

  if (options.lessonTitle?.trim()) {
    searchParams.set('lessonTitle', options.lessonTitle.trim())
  }

  if (options.courseId && Number.isFinite(options.courseId)) {
    searchParams.set('courseId', String(options.courseId))
  }

  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function readLessonEditorContextFromUrl(): LessonEditorContext {
  const searchParams = new URLSearchParams(window.location.search)

  return {
    lessonId: parsePositiveNumber(searchParams.get('lessonId')),
    lessonTitle: searchParams.get('lessonTitle')?.trim() ?? '',
    courseId: parsePositiveNumber(searchParams.get('courseId')),
  }
}
