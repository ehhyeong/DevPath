import type { AuthSession } from './types/auth'
import type { InstructorChannel, InstructorFeaturedCourse } from './types/instructor'

const CUSTOMIZATION_STORAGE_PREFIX = 'devpath.instructor-channel.customization'
const LEGACY_INSTRUCTOR_PROFILE_IMAGE_URLS = new Set([
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Instructor',
])

export interface InstructorChannelListItem {
  id: string
  title: string
  description: string
}

export interface InstructorChannelNoticeItem {
  id: string
  title: string
  dateLabel: string
  isNew?: boolean
}

export interface InstructorChannelCustomization {
  displayName: string
  headline: string
  profileImageUrl: string
  bannerImageUrl: string
  githubUrl: string
  youtubeUrl: string
  websiteUrl: string
  intro: string
  specialties: string[]
  careers: InstructorChannelListItem[]
  achievements: InstructorChannelListItem[]
  notices: InstructorChannelNoticeItem[]
  featuredCourses: InstructorFeaturedCourse[]
}

export const defaultInstructorBannerImageUrl =
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=2000&q=80'

export const fallbackInstructorCareers: InstructorChannelListItem[] = [
  {
    id: 'career-1',
    title: '현직 스타트업 CTO',
    description: '기술 전략 수립과 서비스 아키텍처 설계를 총괄하고 있습니다.',
  },
  {
    id: 'career-2',
    title: '대규모 백엔드 서비스 개발',
    description: '고트래픽 서비스 성능 최적화와 운영 경험을 쌓아 왔습니다.',
  },
  {
    id: 'career-3',
    title: '기업 실무 교육 다수 진행',
    description: '현업 팀을 대상으로 백엔드 실무 교육을 꾸준히 진행했습니다.',
  },
]

export const fallbackInstructorAchievements: InstructorChannelListItem[] = [
  {
    id: 'achievement-1',
    title: '누적 수강생 15,000명 이상',
    description: '실무 중심 커리큘럼으로 높은 만족도를 꾸준히 유지하고 있습니다.',
  },
  {
    id: 'achievement-2',
    title: '평균 강의 평점 4.9 / 5.0',
    description: '수강생 피드백을 반영해 강의를 지속적으로 개선하고 있습니다.',
  },
  {
    id: 'achievement-3',
    title: '실무 프로젝트 기반 강의 운영',
    description: '예제보다 실제 문제 해결 과정에 가까운 콘텐츠를 제공합니다.',
  },
]

export const fallbackInstructorNotices: InstructorChannelNoticeItem[] = [
  {
    id: 'notice-1',
    title: '신규 로드맵 커리큘럼 업데이트가 예정되어 있습니다.',
    dateLabel: '2026.04.10',
    isNew: true,
  },
  {
    id: 'notice-2',
    title: '실전 프로젝트 세션이 곧 공개됩니다.',
    dateLabel: '2026.04.01',
  },
]

export function sanitizeInstructorProfileImageUrl(imageUrl: string | null | undefined) {
  const normalized = imageUrl?.trim() ?? ''

  if (!normalized || LEGACY_INSTRUCTOR_PROFILE_IMAGE_URLS.has(normalized)) {
    return null
  }

  return normalized
}

function buildStorageKey(instructorId: number) {
  return `${CUSTOMIZATION_STORAGE_PREFIX}.${instructorId}`
}

function sanitizeList(items: InstructorChannelListItem[] | undefined) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      title: item.title ?? '',
      description: item.description ?? '',
    }))
    .filter((item) => item.title.trim() || item.description.trim())
}

function sanitizeNotices(items: InstructorChannelNoticeItem[] | undefined) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item.id || `notice-${index + 1}`,
      title: item.title ?? '',
      dateLabel: item.dateLabel ?? '',
      isNew: Boolean(item.isNew),
    }))
    .filter((item) => item.title.trim())
}

function sanitizeFeaturedCourses(items: InstructorFeaturedCourse[] | undefined) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      courseId: Number(item.courseId) || 0,
      title: item.title ?? '',
      subtitle: item.subtitle ?? '',
      thumbnailUrl: item.thumbnailUrl ?? null,
    }))
    .filter((item) => item.courseId > 0 && item.title.trim())
}

function normalizeCustomization(
  input: Partial<InstructorChannelCustomization> | null | undefined,
): InstructorChannelCustomization {
  return {
    displayName: input?.displayName?.trim() ?? '',
    headline: input?.headline?.trim() ?? '',
    profileImageUrl: sanitizeInstructorProfileImageUrl(input?.profileImageUrl) ?? '',
    bannerImageUrl: input?.bannerImageUrl?.trim() ?? '',
    githubUrl: input?.githubUrl?.trim() ?? '',
    youtubeUrl: input?.youtubeUrl?.trim() ?? '',
    websiteUrl: input?.websiteUrl?.trim() ?? '',
    intro: input?.intro?.trim() ?? '',
    specialties: Array.isArray(input?.specialties)
      ? input.specialties.map((item) => item.trim()).filter(Boolean)
      : [],
    careers: sanitizeList(input?.careers),
    achievements: sanitizeList(input?.achievements),
    notices: sanitizeNotices(input?.notices),
    featuredCourses: sanitizeFeaturedCourses(input?.featuredCourses),
  }
}

export function readInstructorChannelCustomization(instructorId: number | null | undefined) {
  if (!instructorId) {
    return null
  }

  const raw = window.localStorage.getItem(buildStorageKey(instructorId))

  if (!raw) {
    return null
  }

  try {
    return normalizeCustomization(JSON.parse(raw) as Partial<InstructorChannelCustomization>)
  } catch {
    window.localStorage.removeItem(buildStorageKey(instructorId))
    return null
  }
}

export function writeInstructorChannelCustomization(
  instructorId: number | null | undefined,
  customization: Partial<InstructorChannelCustomization>,
) {
  if (!instructorId) {
    return null
  }

  const normalized = normalizeCustomization(customization)
  window.localStorage.setItem(buildStorageKey(instructorId), JSON.stringify(normalized))
  return normalized
}

export function applyInstructorChannelCustomization(
  channel: InstructorChannel,
  customization: InstructorChannelCustomization | null | undefined,
): InstructorChannel {
  if (!customization) {
    return channel
  }

  return {
    ...channel,
    profile: {
      ...channel.profile,
      nickname: customization.displayName || channel.profile.nickname,
      profileImageUrl:
        sanitizeInstructorProfileImageUrl(customization.profileImageUrl) ??
        sanitizeInstructorProfileImageUrl(channel.profile.profileImageUrl),
      headline: customization.headline || channel.profile.headline,
    },
    intro: customization.intro || channel.intro,
    specialties: customization.specialties.length ? customization.specialties : channel.specialties,
    externalLinks: {
      githubUrl: customization.githubUrl || channel.externalLinks?.githubUrl || null,
      blogUrl: customization.websiteUrl || channel.externalLinks?.blogUrl || null,
    },
    featuredCourses: customization.featuredCourses.length
      ? customization.featuredCourses
      : channel.featuredCourses,
  }
}

export function buildMyInstructorProfileHref(session: AuthSession | null | undefined) {
  if (!session?.userId) {
    return '/instructor-profile'
  }

  return `/instructor-profile?instructorId=${session.userId}`
}

export function buildMyInstructorEditProfileHref(session: AuthSession | null | undefined) {
  if (!session?.userId) {
    return '/instructor-edit-profile'
  }

  return `/instructor-edit-profile?instructorId=${session.userId}`
}
