export interface ApiResponse<T> {
  success: boolean
  code: string | null
  message: string
  data: T
}

export interface HomeAction {
  label: string
  href: string
  tone: 'primary' | 'secondary' | string
}

export interface HomeMetric {
  label: string
  value: string
  description: string
}

export interface HomeContentPreview {
  id: number | null
  badge: string
  title: string
  description: string
  href: string
}

export interface HomeJourneyStep {
  step: string
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  href: string
}

export interface HomeOverview {
  badge: string
  title: string
  description: string
  actions: HomeAction[]
  metrics: HomeMetric[]
  trendingSkills: string[]
  featuredRoadmaps: HomeContentPreview[]
  featuredCourses: HomeContentPreview[]
  featuredProjects: HomeContentPreview[]
  featuredStudyGroups: HomeContentPreview[]
  journeySteps: HomeJourneyStep[]
}

export interface HomeLearningStatus {
  courseId: number
  lessonId: number
  courseTitle: string
  lessonTitle: string
  progressPercentage: number
  href: string
  lastWatchedAt: string | null
}

export interface HomeProjectSummary {
  projectId: number
  typeLabel: string
  title: string
  description: string
  progressPercentage: number
  href: string
}

export interface HomeRecentCourse {
  courseId: number
  title: string
  thumbnailUrl: string | null
  progressPercentage: number
  href: string
  lastWatchedAt: string | null
}

export interface HomeTopCourse {
  courseId: number
  title: string
  thumbnailUrl: string | null
  categoryLabel: string
  averageRating: number | null
  enrollmentCount: number
  price: number | null
  currency: string | null
  href: string
}

export interface HomeCourseCategory {
  key: string
  label: string
  courses: HomeTopCourse[]
}

export interface AuthenticatedHomeDashboard {
  currentLearning: HomeLearningStatus | null
  participatingProjects: HomeProjectSummary[]
  recentCourses: HomeRecentCourse[]
  topCourseCategories: HomeCourseCategory[]
}
