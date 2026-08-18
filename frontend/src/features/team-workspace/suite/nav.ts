export type TeamWorkspaceNavKey =
  | 'kanban'
  | 'files'
  | 'qna'
  | 'schedule'
  | 'architecture'
  | 'meeting'
  | 'live-meeting'
  | 'voice-channel'

export type TeamWorkspaceNavItem = {
  key: TeamWorkspaceNavKey
  path: string
  title: string
  icon: string
}

export const TEAM_WORKSPACE_PAGE_META: Record<TeamWorkspaceNavKey, Omit<TeamWorkspaceNavItem, 'key'>> = {
  kanban: { path: '/team-ws-kanban', title: '팀 칸반 (Jira형)', icon: 'fa-columns' },
  architecture: { path: '/team-ws-architecture', title: '아키텍처 & API 설계', icon: 'fa-project-diagram' },
  qna: { path: '/team-ws-qna', title: '멘토 Q&A', icon: 'fa-comments' },
  schedule: { path: '/team-ws-schedule', title: '팀 캘린더 & 스크럼', icon: 'fa-calendar-alt' },
  files: { path: '/team-ws-files', title: '통합 자료실', icon: 'fa-folder-open' },
  meeting: { path: '/team-ws-meeting', title: '라이브 밋업 & 회의장', icon: 'fa-video' },
  'live-meeting': { path: '/team-ws-live-meeting', title: '라이브 밋업', icon: 'fa-tower-broadcast' },
  'voice-channel': { path: '/team-voice-channel', title: '음성 채널', icon: 'fa-headset' },
}

export const TEAM_WORKSPACE_COLLABORATION_NAV: TeamWorkspaceNavItem[] = [
  { key: 'kanban', ...TEAM_WORKSPACE_PAGE_META.kanban },
  { key: 'architecture', ...TEAM_WORKSPACE_PAGE_META.architecture },
  { key: 'qna', ...TEAM_WORKSPACE_PAGE_META.qna },
]

export const TEAM_WORKSPACE_RESOURCE_NAV: TeamWorkspaceNavItem[] = [
  { key: 'schedule', ...TEAM_WORKSPACE_PAGE_META.schedule },
  { key: 'files', ...TEAM_WORKSPACE_PAGE_META.files },
  { key: 'meeting', ...TEAM_WORKSPACE_PAGE_META.meeting },
]
