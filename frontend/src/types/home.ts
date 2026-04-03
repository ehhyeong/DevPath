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
