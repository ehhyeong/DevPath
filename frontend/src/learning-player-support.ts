import type { LearningCourseDetail, LearningLesson, LearningLessonProgress } from './types/learning'

export type FlattenedLesson = LearningLesson & {
  sectionId: number
  sectionTitle: string
}

export const PLAYER_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const

export function createDefaultProgress(lessonId: number): LearningLessonProgress {
  return {
    lessonId,
    progressPercent: 0,
    progressSeconds: 0,
    defaultPlaybackRate: 1,
    pipEnabled: false,
    isCompleted: false,
    lastWatchedAt: null,
  }
}

export function readNumberSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function getFlattenedLessons(course: LearningCourseDetail) {
  return course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      ...lesson,
      sectionId: section.sectionId,
      sectionTitle: section.title,
    })),
  )
}

export function formatTime(value: number) {
  const safe = Math.max(0, Math.floor(value))
  const hour = Math.floor(safe / 3600)
  const minute = Math.floor((safe % 3600) / 60)
  const second = safe % 60

  return hour > 0
    ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
    : `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

export function formatDateLabel(value: string | null) {
  if (!value) return '\uBC29\uAE08'

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function normalizeCourseDetail(course: LearningCourseDetail): LearningCourseDetail {
  return {
    ...course,
    prerequisites: course.prerequisites ?? [],
    jobRelevance: course.jobRelevance ?? [],
    objectives: course.objectives ?? [],
    targetAudiences: course.targetAudiences ?? [],
    tags: course.tags ?? [],
    sections: (course.sections ?? []).map((section) => ({
      ...section,
      lessons: (section.lessons ?? []).map((lesson) => ({
        ...lesson,
        materials: lesson.materials ?? [],
        assignment: lesson.assignment
          ? {
              ...lesson.assignment,
              allowedFileFormats: lesson.assignment.allowedFileFormats ?? [],
              rubrics: lesson.assignment.rubrics ?? [],
            }
          : null,
        quiz: lesson.quiz
          ? {
              ...lesson.quiz,
              questions: (lesson.quiz.questions ?? []).map((question) => ({
                ...question,
                options: question.options ?? [],
              })),
            }
          : null,
      })),
    })),
    news: course.news ?? [],
  }
}

export const getProgressStorageKey = (lessonId: number) => `devpath.learning.progress.${lessonId}`
export const getNotesStorageKey = (lessonId: number) => `devpath.learning.notes.${lessonId}`

export function readJsonStorage<T>(key: string, fallback: T) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJsonStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const resolveMaterialDownloadHref = (lessonId: number, materialId: number) =>
  `/api/learning/lessons/${lessonId}/materials/${materialId}/download`

export function syncLearningUrl(courseId: number, lessonId: number | null) {
  const params = new URLSearchParams(window.location.search)
  params.set('courseId', String(courseId))
  if (lessonId) params.set('lessonId', String(lessonId))
  const nextUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', nextUrl)
}
