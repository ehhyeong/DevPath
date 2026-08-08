export type ProjectAsideKey = 'dashboard' | 'lounge' | 'mentoring' | 'workspace' | 'showcase'

export const projectAsideItems: Array<{
  key: ProjectAsideKey
  href: string
  label: string
  icon: string
}> = [
  { key: 'dashboard', href: '/lounge-dashboard', label: '라운지 대시보드', icon: 'fa-home' },
  { key: 'lounge', href: '/community-lounge', label: '팀 찾기 라운지', icon: 'fa-rocket' },
  { key: 'mentoring', href: '/mentoring-hub', label: '멘토링 찾기', icon: 'fa-chalkboard-teacher' },
  { key: 'workspace', href: '/workspace-hub', label: '워크스페이스', icon: 'fa-laptop-code' },
  { key: 'showcase', href: '/dev-showcase', label: '런칭 쇼케이스', icon: 'fa-trophy' },
]
