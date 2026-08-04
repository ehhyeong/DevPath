import type { CourseCatalogCategory, CourseCatalogMenu } from '../../types/course-catalog'
import type { CourseDifficulty, CourseListItem } from '../../types/course'

export type LectureCategoryKey = string
export type LectureSortKey = 'recommended' | 'latest' | 'priceAsc' | 'priceDesc' | 'title'
export type LectureDifficultyFilter = 'ALL' | Exclude<CourseDifficulty, null>
export type LecturePriceFilter = 'ALL' | 'FREE' | 'UNDER_50000' | 'UNDER_100000' | 'OVER_100000'

export type LectureCategoryTag = {
  name: string
  linkedCategoryKey: string | null
  sortOrder: number
}

export type LectureCategoryGroup = {
  name: string
  sortOrder: number
  tags: LectureCategoryTag[]
}

export type LectureCategoryMegaMenuItem = {
  label: string
  sortOrder: number
}

export type LectureCategoryConfig = {
  key: LectureCategoryKey
  label: string
  icon: string
  title: string
  sortOrder: number
  active: boolean
  megaMenuItems: LectureCategoryMegaMenuItem[]
  groups: LectureCategoryGroup[]
}

export type LectureCourse = CourseListItem & {
  categoryKey: LectureCategoryKey
  categoryLabel: string
  displayCategory: string
  rating: number
  reviewCount: number
  badge: string | null
  roadmapLinked: boolean
  searchIndex: string
}

// 메뉴 응답을 화면 렌더링에 바로 쓸 수 있는 형태로 정렬해 둔다.
export function normalizeLectureCategoryConfigs(menu: CourseCatalogMenu | null | undefined) {
  const categories = menu?.categories ?? []

  return [...categories]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.categoryKey.localeCompare(right.categoryKey))
    .map((category) => mapLectureCategoryConfig(category))
}

// 전체 보기 역할을 하는 카테고리 키를 구한다.
export function getOverviewCategoryKey(categoryConfigs: LectureCategoryConfig[]) {
  return categoryConfigs.find((category) => category.key === 'all')?.key ?? categoryConfigs[0]?.key ?? 'all'
}

export const fallbackLectureCourses: CourseListItem[] = [
  {
    courseId: 301,
    title: '실무 Spring Boot 백엔드 입문',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&q=80',
    instructorName: '홍태민',
    instructorChannelName: 'Hong Backend Lab',
    price: 129000,
    discountPrice: 89000,
    difficulty: 'BEGINNER',
    tags: ['Java', 'Spring Boot', 'JPA'],
    isBookmarked: false,
    isEnrolled: true,
    status: 'PUBLISHED',
  },
  {
    courseId: 302,
    title: 'React 19 프론트엔드 실전 가이드',
    thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80',
    instructorName: '김지연',
    instructorChannelName: 'Frontend Craft',
    price: 119000,
    discountPrice: 79000,
    difficulty: 'INTERMEDIATE',
    tags: ['React', 'TypeScript', 'Tailwind'],
    isBookmarked: true,
    isEnrolled: false,
    status: 'PUBLISHED',
  },
  {
    courseId: 303,
    title: 'ChatGPT API와 RAG 서비스 만들기',
    thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
    instructorName: '이민호',
    instructorChannelName: 'AI Studio',
    price: 149000,
    discountPrice: 99000,
    difficulty: 'INTERMEDIATE',
    tags: ['AI', 'LLM', 'RAG', 'LangChain'],
    isBookmarked: false,
    isEnrolled: false,
    status: 'PUBLISHED',
  },
  {
    courseId: 304,
    title: 'SQL로 끝내는 데이터 분석 기본기',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
    instructorName: '박윤서',
    instructorChannelName: 'Data Ground',
    price: 89000,
    discountPrice: 49000,
    difficulty: 'BEGINNER',
    tags: ['SQL', 'Pandas', '데이터 분석'],
    isBookmarked: false,
    isEnrolled: false,
    status: 'PUBLISHED',
  },
  {
    courseId: 305,
    title: 'Docker & Kubernetes 운영 실전',
    thumbnailUrl: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80',
    instructorName: '정우진',
    instructorChannelName: 'Cloud Ops',
    price: 159000,
    discountPrice: 109000,
    difficulty: 'ADVANCED',
    tags: ['Docker', 'Kubernetes', 'DevOps'],
    isBookmarked: false,
    isEnrolled: false,
    status: 'PUBLISHED',
  },
  {
    courseId: 306,
    title: 'Flutter로 MVP 앱 출시하기',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
    instructorName: '한가람',
    instructorChannelName: 'Mobile Ship',
    price: 99000,
    discountPrice: 69000,
    difficulty: 'BEGINNER',
    tags: ['Flutter', '모바일', '앱 출시'],
    isBookmarked: true,
    isEnrolled: false,
    status: 'PUBLISHED',
  },
  {
    courseId: 307,
    title: '개발자 이력서와 기술 면접 패키지',
    thumbnailUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
    instructorName: '최하린',
    instructorChannelName: 'Career Boost',
    price: 59000,
    discountPrice: 0,
    difficulty: 'BEGINNER',
    tags: ['이력서', '기술 면접', '포트폴리오'],
    isBookmarked: false,
    isEnrolled: false,
    status: 'PUBLISHED',
  },
  {
    courseId: 308,
    title: 'Next.js 14 제품 개발 실전',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
    instructorName: '문지후',
    instructorChannelName: 'Product Front',
    price: 139000,
    discountPrice: 99000,
    difficulty: 'INTERMEDIATE',
    tags: ['Next.js', 'React', '테스트'],
    isBookmarked: false,
    isEnrolled: true,
    status: 'PUBLISHED',
  },
]

export function normalizeLectureCourses(items: CourseListItem[], categoryConfigs: LectureCategoryConfig[]) {
  return items.map((item) => normalizeLectureCourse(item, categoryConfigs))
}

export function normalizeLectureCourse(item: CourseListItem, categoryConfigs: LectureCategoryConfig[]): LectureCourse {
  const overviewCategoryKey = getOverviewCategoryKey(categoryConfigs)
  const categoryKey = inferLectureCategory(item, categoryConfigs)
  const categoryLabel = resolveCategoryLabel(categoryKey, categoryConfigs, overviewCategoryKey)
  const primaryTag = item.tags[0] ?? '입문'
  const ratingSeed = item.courseId % 7
  const rating = Math.min(5, 4.4 + ratingSeed * 0.08)
  const reviewCount = 120 + (item.courseId % 15) * 19

  return {
    ...item,
    categoryKey,
    categoryLabel,
    displayCategory: categoryKey === overviewCategoryKey ? primaryTag : `${categoryLabel} · ${primaryTag}`,
    rating: Number(rating.toFixed(1)),
    reviewCount,
    badge: resolveLectureBadge(item),
    roadmapLinked: item.tags.length > 0,
    searchIndex: buildSearchIndex(item, categoryLabel),
  }
}

// 메뉴 설정에 들어 있는 카테고리 키워드를 기준으로 강의 소속 카테고리를 추론한다.
export function inferLectureCategory(item: CourseListItem, categoryConfigs: LectureCategoryConfig[]) {
  const overviewCategoryKey = getOverviewCategoryKey(categoryConfigs)
  const candidateCategories = categoryConfigs.filter((category) => category.key !== overviewCategoryKey)
  if (candidateCategories.length === 0) {
    return overviewCategoryKey
  }

  const haystack = normalizeText(`${item.title} ${item.tags.join(' ')} ${item.instructorChannelName ?? ''}`)
  let bestCategoryKey = overviewCategoryKey
  let bestScore = 0

  for (const category of candidateCategories) {
    const score = calculateCategoryScore(haystack, category)
    if (score > bestScore) {
      bestScore = score
      bestCategoryKey = category.key
    }
  }

  return bestCategoryKey
}

export function getCourseDisplayPrice(item: Pick<CourseListItem, 'price' | 'discountPrice'>) {
  if (item.discountPrice !== null && item.discountPrice !== undefined) {
    return item.discountPrice
  }
  return item.price
}

export function isFreeCourse(item: Pick<CourseListItem, 'price' | 'discountPrice'>) {
  return (getCourseDisplayPrice(item) ?? 0) <= 0
}

export function formatCoursePrice(value: number | null) {
  if (value === null || value === undefined || value <= 0) {
    return '무료'
  }
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`
}

export function formatDifficultyLabel(value: CourseDifficulty) {
  if (value === 'BEGINNER') return '입문'
  if (value === 'INTERMEDIATE') return '중급'
  if (value === 'ADVANCED') return '고급'
  return '전체'
}

export function matchesLectureTag(
  course: LectureCourse,
  selectedCategoryKey: LectureCategoryKey,
  selectedTag: string | null,
  categoryConfigs: LectureCategoryConfig[],
) {
  if (!selectedTag) return true

  const overviewCategoryKey = getOverviewCategoryKey(categoryConfigs)
  const normalizedTag = normalizeText(selectedTag)

  if (selectedCategoryKey === overviewCategoryKey) {
    const overviewCategory = categoryConfigs.find((category) => category.key === overviewCategoryKey)
    const linkedItem = overviewCategory?.groups
      .flatMap((group) => group.tags)
      .find((tag) => normalizeText(tag.name) === normalizedTag && tag.linkedCategoryKey)

    if (linkedItem?.linkedCategoryKey) {
      return course.categoryKey === linkedItem.linkedCategoryKey
    }
  }

  return course.searchIndex.includes(normalizedTag)
}

export function sortLectureCourses(courses: LectureCourse[], sortKey: LectureSortKey) {
  const sorted = [...courses]

  sorted.sort((left, right) => {
    if (sortKey === 'priceAsc') {
      return (getCourseDisplayPrice(left) ?? 0) - (getCourseDisplayPrice(right) ?? 0)
    }
    if (sortKey === 'priceDesc') {
      return (getCourseDisplayPrice(right) ?? 0) - (getCourseDisplayPrice(left) ?? 0)
    }
    if (sortKey === 'title') {
      return left.title.localeCompare(right.title, 'ko')
    }
    if (sortKey === 'latest') {
      return right.courseId - left.courseId
    }

    const leftScore = Number(left.isBookmarked) * 2 + left.rating
    const rightScore = Number(right.isBookmarked) * 2 + right.rating
    return rightScore - leftScore || right.courseId - left.courseId
  })

  return sorted
}

function mapLectureCategoryConfig(category: CourseCatalogCategory): LectureCategoryConfig {
  return {
    key: category.categoryKey,
    label: category.label,
    icon: category.iconClass,
    title: category.title,
    sortOrder: category.sortOrder,
    active: category.active,
    megaMenuItems: [...(category.megaMenuItems ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
    groups: [...(category.groups ?? [])]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((group) => ({
        name: group.name,
        sortOrder: group.sortOrder,
        tags: [...(group.items ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
      })),
  }
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function buildSearchIndex(item: CourseListItem, categoryLabel: string) {
  return normalizeText(
    `${item.title} ${item.instructorName} ${item.instructorChannelName ?? ''} ${categoryLabel} ${item.tags.join(' ')}`,
  )
}

function resolveCategoryLabel(
  categoryKey: string,
  categoryConfigs: LectureCategoryConfig[],
  overviewCategoryKey: string,
) {
  const matchedCategory = categoryConfigs.find((category) => category.key === categoryKey)
  if (matchedCategory) {
    return matchedCategory.label
  }

  if (categoryKey === overviewCategoryKey) {
    return '전체'
  }

  return categoryKey
}

function calculateCategoryScore(haystack: string, category: LectureCategoryConfig) {
  return buildCategoryKeywords(category).reduce((score, keyword) => {
    if (!keyword || !haystack.includes(keyword)) {
      return score
    }

    return score + (keyword.includes(' ') ? 3 : 2)
  }, 0)
}

function buildCategoryKeywords(category: LectureCategoryConfig) {
  const rawKeywords = [
    category.label,
    category.title,
    ...category.megaMenuItems.map((item) => item.label),
    ...category.groups.flatMap((group) => [group.name, ...group.tags.map((tag) => tag.name)]),
  ]

  return Array.from(new Set(rawKeywords.map((keyword) => normalizeText(keyword)).filter(Boolean)))
}

function resolveLectureBadge(item: CourseListItem) {
  if (isFreeCourse(item)) return 'Free'
  if (item.tags.some((tag) => ['Java', 'Spring Boot'].includes(tag))) return 'Best Seller'
  if (item.tags.some((tag) => ['React', 'AI', 'Docker'].includes(tag))) return 'Hot'
  return 'New'
}
