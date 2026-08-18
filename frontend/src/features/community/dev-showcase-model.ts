import { type ProjectAsideSquad } from '../../components/ProjectAside'


export type ShowcaseCategory = 'FRONTEND' | 'BACKEND' | 'FULLSTACK' | 'MOBILE' | 'AI' | 'DATA' | 'DEVOPS' | 'ETC'
export type CategoryFilter = 'all' | 'web' | 'app' | 'ai' | 'game'
export type SortFilter = 'popular' | 'recent' | 'views' | 'comments'

export type ShowcaseSummary = {
  showcaseId: number
  userId: number
  authorProfileImage?: string | null
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  category: ShowcaseCategory
  isPublic?: boolean
  viewCount: number
  likeCount: number
  createdAt?: string | null
}

export type ShowcaseLink = {
  linkType: string
  url: string
}

export type ShowcaseDetail = ShowcaseSummary & {
  links?: ShowcaseLink[]
  updatedAt?: string | null
}

export type ShowcaseComment = {
  commentId: number
  userId: number
  authorProfileImage?: string | null
  content: string
  createdAt?: string | null
}

export type LoungeShellResponse = {
  user?: {
    profileImage?: string | null
  } | null
  mySquads?: ProjectAsideSquad[]
}

export type WorkspaceHubProject = {
  projectId: number
  type: 'solo' | 'squad' | 'mentoring'
  status: 'progress' | 'completed'
  title: string
  description: string
  categoryLabel?: string | null
  roleLabel?: string | null
  footerText?: string | null
}

export type CompletedWorkspaceProject = {
  id: string
  team: string
  title: string
  short: string
  description: string
  tech: string
  category: ShowcaseCategory
}

export const categoryLabels: Record<ShowcaseCategory, string> = {
  FRONTEND: 'Web',
  BACKEND: 'Backend',
  FULLSTACK: 'Web',
  MOBILE: 'App',
  AI: 'AI',
  DATA: 'Data',
  DEVOPS: 'DevOps',
  ETC: 'Game',
}

export const categoryQueries: Record<Exclude<CategoryFilter, 'all'>, ShowcaseCategory> = {
  web: 'FULLSTACK',
  app: 'MOBILE',
  ai: 'AI',
  game: 'ETC',
}

export function getWorkspaceProjectCategory(project: WorkspaceHubProject): ShowcaseCategory {
  if (project.categoryLabel?.toLowerCase().includes('ai')) {
    return 'AI'
  }
  if (project.categoryLabel?.toLowerCase().includes('app')) {
    return 'MOBILE'
  }
  if (project.type === 'solo') {
    return 'FULLSTACK'
  }
  if (project.type === 'mentoring') {
    return 'FULLSTACK'
  }
  return 'FULLSTACK'
}

export function getWorkspaceProjectTypeLabel(type: WorkspaceHubProject['type']) {
  if (type === 'solo') {
    return 'Solo'
  }
  if (type === 'squad') {
    return 'Squad'
  }
  return 'Mentoring'
}

export function mapCompletedWorkspaceProject(project: WorkspaceHubProject): CompletedWorkspaceProject {
  const description = project.description?.trim() || project.title
  const categoryLabel = project.categoryLabel?.trim()

  return {
    id: String(project.projectId),
    team: project.footerText?.trim() || project.roleLabel?.trim() || categoryLabel || 'DevPath',
    title: project.title,
    short: description,
    description,
    tech: categoryLabel || getWorkspaceProjectTypeLabel(project.type),
    category: getWorkspaceProjectCategory(project),
  }
}

export function getShowcaseTeam(showcase: ShowcaseSummary) {
  return {
    name: `작성자 ${showcase.userId}`,
    image: showcase.authorProfileImage ?? null,
  }
}

export function getShowcaseStatus(showcase: ShowcaseSummary) {
  return showcase.isPublic === false ? 'Private' : 'Public'
}

export function getShowcaseShort(showcase: ShowcaseSummary) {
  return showcase.description || '완성된 프로젝트를 공유하고 피드백을 받는 쇼케이스입니다.'
}

export function getShowcaseTechStack(showcase: ShowcaseSummary) {
  return [categoryLabels[showcase.category] ?? 'Project']
}

export function getCommentAuthorName(userId: number) {
  return `작성자 ${userId}`
}

export function formatViews(value: number) {
  if (value >= 1000) {
    return `${Math.round((value / 1000) * 10) / 10}k`
  }

  return String(value)
}

export function getSortQuery(sort: SortFilter) {
  return sort === 'recent' ? 'LATEST' : 'POPULAR'
}

export function formatDate(value?: string | null) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function sortShowcases(showcases: ShowcaseSummary[], sort: SortFilter) {
  return [...showcases].sort((a, b) => {
    if (sort === 'views') {
      return b.viewCount - a.viewCount
    }
    if (sort === 'comments') {
      return b.likeCount + b.viewCount / 10 - (a.likeCount + a.viewCount / 10)
    }
    if (sort === 'recent') {
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    }
    return b.likeCount - a.likeCount
  })
}
