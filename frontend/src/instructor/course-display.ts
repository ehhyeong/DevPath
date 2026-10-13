import type { InstructorCourseListItem } from '../types/instructor'

type InstructorCourseOptionSource = {
  courseId: number | null | undefined
  title?: string | null
  courseTitle?: string | null
}

export const DEFAULT_INSTRUCTOR_COURSE_THUMBNAIL =
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80'

const COURSE_TITLE_LABELS: Record<string, string> = {
  'Spring Boot Intro': '자바(Java) 마스터 클래스: 입문부터 실무까지',
  'JPA Practical Design': 'JPA 실전 설계',
  'React Dashboard Sprint': '리액트 대시보드 스프린트',
}

const COURSE_THUMBNAIL_FALLBACKS: Record<string, string> = {
  'Spring Boot Intro':
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
  'JPA Practical Design':
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
  'React Dashboard Sprint':
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  '스프링 부트 3.0 완전 정복':
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  '[A-CASE-A] Node Clearance Course':
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
  '[A-CASE-B] Tag Missing Course':
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80',
  '[A-CASE-C] Quiz Fail Course':
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
}

const CATEGORY_LABELS: Record<string, string> = {
  BACKEND: '백엔드',
  FRONTEND: '프론트엔드',
  AI: '인공지능',
  DATABASE: '데이터베이스',
  DEVOPS: '데브옵스',
  FULLSTACK: '풀스택',
  GENERAL: '일반',
  ETC: '기타',
}

function normalizeInstructorCategoryKey(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.trim().toUpperCase().replace(/[\s/_-]+/g, '')

  switch (normalized) {
    case 'BACKEND':
    case 'SERVER':
    case '백엔드':
      return 'BACKEND'
    case 'FRONTEND':
    case 'CLIENT':
    case '프론트엔드':
      return 'FRONTEND'
    case 'AI':
    case 'AIDATA':
    case 'ARTIFICIALINTELLIGENCE':
    case 'MACHINELEARNING':
    case '인공지능':
      return 'AI'
    case 'DATABASE':
    case 'DB':
    case '데이터베이스':
      return 'DATABASE'
    case 'DEVOPS':
    case '데브옵스':
      return 'DEVOPS'
    case 'FULLSTACK':
    case '풀스택':
      return 'FULLSTACK'
    case 'GENERAL':
    case '일반':
      return 'GENERAL'
    case 'ETC':
    case '기타':
      return 'ETC'
    default:
      return null
  }
}

function inferInstructorCategoryKeyFromTitle(courseTitle?: string | null) {
  const normalizedTitle = normalizeInstructorCourseTitle(courseTitle)

  if (normalizedTitle.includes('리액트')) {
    return 'FRONTEND'
  }

  if (normalizedTitle.includes('자바') || normalizedTitle.includes('JPA') || normalizedTitle.includes('스프링')) {
    return 'BACKEND'
  }

  return null
}

export function normalizeInstructorCourseTitle(title: string | null | undefined) {
  if (!title) {
    return ''
  }

  return COURSE_TITLE_LABELS[title] ?? title
}

export function normalizeInstructorCourseStatus(status: string | null | undefined) {
  switch (status) {
    case 'PUBLISHED':
      return 'published'
    case 'IN_REVIEW':
      return 'review'
    case 'DRAFT':
    default:
      return 'draft'
  }
}

export function normalizeInstructorLevelLabel(value: string | null | undefined) {
  switch (value) {
    case 'BEGINNER':
      return '입문'
    case 'INTERMEDIATE':
      return '중급'
    case 'ADVANCED':
      return '고급'
    case '-':
    case null:
    case undefined:
      return '미정'
    default:
      return value
  }
}

export function normalizeInstructorCategoryLabel(
  value: string | null | undefined,
  courseTitle?: string | null,
) {
  const categoryKey = normalizeInstructorCategoryKey(value) ?? inferInstructorCategoryKeyFromTitle(courseTitle)

  if (categoryKey) {
    return CATEGORY_LABELS[categoryKey]
  }

  if (!value || value === 'General') {
    return CATEGORY_LABELS.GENERAL
  }

  return CATEGORY_LABELS.ETC
}

export function getInstructorCategoryChipLabel(
  value: string | null | undefined,
  courseTitle?: string | null,
) {
  const categoryKey = normalizeInstructorCategoryKey(value) ?? inferInstructorCategoryKeyFromTitle(courseTitle)

  if (categoryKey === 'FULLSTACK') {
    return 'FULL STACK'
  }

  if (categoryKey) {
    return categoryKey
  }

  if (!value || value === 'General') {
    return 'GENERAL'
  }

  return 'ETC'
}

export function resolveInstructorCourseThumbnailUrl(
  rawUrl: string | null | undefined,
  courseTitle: string | null | undefined,
) {
  const trimmed = rawUrl?.trim()

  if (trimmed && (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/'))) {
    return trimmed
  }

  if (courseTitle && COURSE_THUMBNAIL_FALLBACKS[courseTitle]) {
    return COURSE_THUMBNAIL_FALLBACKS[courseTitle]
  }

  return DEFAULT_INSTRUCTOR_COURSE_THUMBNAIL
}

export function buildInstructorCourseOptions(
  courses: InstructorCourseListItem[],
  allowedStatuses: string[] = ['PUBLISHED'],
) {
  const statusSet = new Set(allowedStatuses)
  const options = new Map<string, string>()

  courses.forEach((course) => {
    if (
      course.courseId === null ||
      course.courseId === undefined ||
      (statusSet.size > 0 && !statusSet.has(course.status ?? ''))
    ) {
      return
    }

    options.set(String(course.courseId), normalizeInstructorCourseTitle(course.title))
  })

  return Array.from(options.entries())
}

export function buildInstructorCourseOptionsFromSources(
  sources: InstructorCourseOptionSource[],
) {
  const options = new Map<string, string>()

  sources.forEach((source) => {
    if (source.courseId === null || source.courseId === undefined) {
      return
    }

    const label = normalizeInstructorCourseTitle(source.courseTitle ?? source.title)
    if (!label) {
      return
    }

    options.set(String(source.courseId), label)
  })

  return Array.from(options.entries())
}
