import { readStoredAuthSession } from '../../../lib/auth-session'
import type { InstructorTeamWsPage,MilestoneItem,PageConfig,QuestionSummary,TaskPriority,TaskStatus,TeamData,TeamNotification,TeamNotificationDraft,WorkspaceFile,WorkspaceMember,WorkspaceTask } from './instructor-types'


export const EMPTY_DATA: TeamData = {
  dashboard: null,
  tasks: [],
  events: [],
  questions: [],
  milestones: [],
  files: [],
  apiSpec: null,
  erdDoc: null,
  infraDoc: null,
  notes: [],
  activityLogs: [],
  voiceChannels: [],
}

export const PAGE_CONFIG: Record<InstructorTeamWsPage, PageConfig> = {
  dashboard: { path: '/instructor-team-ws-dashboard', label: '대시보드 모니터링', title: '팀 프로젝트 대시보드', icon: 'fas fa-chart-line', section: 'admin' },
  milestone: { path: '/instructor-team-ws-milestone', label: '마일스톤 & 피드백', title: '마일스톤 & 피드백', icon: 'fas fa-flag-checkered', section: 'admin' },
  kanban: { path: '/instructor-team-ws-kanban', label: '팀 칸반 모니터링', title: '팀 칸반 모니터링', icon: 'fas fa-columns', section: 'team' },
  architecture: { path: '/instructor-team-ws-architecture', label: '아키텍처 설계 리뷰', title: '아키텍처 설계 리뷰', icon: 'fas fa-project-diagram', section: 'team' },
  qna: { path: '/instructor-team-ws-qna', label: '멘토 Q&A 관리', title: '멘토 Q&A 관리', icon: 'fas fa-comments', section: 'team' },
  schedule: { path: '/instructor-team-ws-schedule', label: '공식 일정 관리', title: '공식 일정 관리', icon: 'fas fa-calendar-alt', section: 'resources' },
  files: { path: '/instructor-team-ws-files', label: '통합 자료실 관리', title: '통합 자료실 관리', icon: 'fas fa-folder-open', section: 'resources' },
  meeting: { path: '/instructor-team-ws-meeting', label: '화상 멘토링 관리', title: '화상 멘토링 관리', icon: 'fas fa-video', section: 'resources' },
  'live-meeting': { path: '/instructor-team-live-meeting', label: '라이브 룸', title: '라이브 코드 리뷰', icon: 'fas fa-broadcast-tower', section: 'resources' },
  'voice-channel': { path: '/instructor-team-voice-channel', label: '음성 채널', title: '팀 음성 채널', icon: 'fas fa-headset', section: 'resources' },
}

export const NAV_SECTIONS: Array<{ title: string; pages: InstructorTeamWsPage[] }> = [
  { title: 'Workspace (Admin)', pages: ['dashboard', 'milestone'] },
  { title: 'Team Management', pages: ['kanban', 'architecture', 'qna'] },
  { title: 'Resources & Live', pages: ['schedule', 'files', 'meeting'] },
]

export const TEAM_NOTIFICATION_EVENT = 'devpath-team-notification'
export const MAX_TEAM_NOTIFICATIONS = 40
export const TEAM_WORKSPACE_REFRESH_INTERVAL_MS = 5000

export function getWorkspaceIdFromUrl(): number | null {
  const parsed = Number(new URLSearchParams(window.location.search).get('workspaceId'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function buildHref(page: InstructorTeamWsPage, workspaceId: number | null) {
  return `${PAGE_CONFIG[page].path}${workspaceId ? `?workspaceId=${workspaceId}` : ''}`
}

export function avatarUrl(seed?: string | null) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'mentor')}`
}

export function shortRoleLabel(position?: string | null) {
  if (!position) return null
  const normalized = position.toLowerCase()
  if (normalized.includes('front')) return 'FE'
  if (normalized.includes('back')) return 'BE'
  if (normalized.includes('full')) return 'FS'
  if (normalized.includes('design') || normalized.includes('디자')) return 'DES'
  if (normalized.includes('기획') || normalized.includes('pm')) return 'PM'
  if (normalized.includes('devops') || normalized.includes('infra') || normalized.includes('인프라')) return 'OPS'
  return position
}

export function relativeTime(value?: string | null) {
  if (!value) return '방금 전'
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

export function formatDate(value?: string | null) {
  if (!value) return '일정 없음'
  return new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
}

export function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function isAnswered(question: QuestionSummary) {
  return question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED' || question.answerCount > 0
}

export function teamNotificationStorageKey(workspaceId: number | null) {
  return `devpath:team-ws:${workspaceId ?? 'none'}:notifications`
}

export function teamNotificationReadStorageKey(workspaceId: number | null) {
  return `devpath:team-ws:${workspaceId ?? 'none'}:notifications:read`
}

export function readStoredArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

export function readStoredTeamNotifications(workspaceId: number | null) {
  return readStoredArray<TeamNotification>(teamNotificationStorageKey(workspaceId))
}

export function writeStoredTeamNotifications(workspaceId: number | null, notifications: TeamNotification[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(teamNotificationStorageKey(workspaceId), JSON.stringify(notifications.slice(0, MAX_TEAM_NOTIFICATIONS)))
}

export function readTeamNotificationIds(workspaceId: number | null) {
  return readStoredArray<string>(teamNotificationReadStorageKey(workspaceId))
}

export function writeTeamNotificationIds(workspaceId: number | null, ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(teamNotificationReadStorageKey(workspaceId), JSON.stringify(ids.slice(-200)))
}

export function pushTeamNotification(workspaceId: number | null, draft: TeamNotificationDraft) {
  if (!workspaceId || typeof window === 'undefined') return
  const notification: TeamNotification = {
    ...draft,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: draft.createdAt ?? new Date().toISOString(),
    source: 'local',
  }
  const next = [notification, ...readStoredTeamNotifications(workspaceId).filter((item) => item.id !== notification.id)].slice(0, MAX_TEAM_NOTIFICATIONS)
  writeStoredTeamNotifications(workspaceId, next)
  window.dispatchEvent(new CustomEvent(TEAM_NOTIFICATION_EVENT, { detail: { workspaceId, notification } }))
}

export function notificationTime(value?: string | null) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : new Date().toISOString()
}

export function buildTeamNotifications(data: TeamData, workspaceId: number | null, localNotifications: TeamNotification[]) {
  const href = (page: InstructorTeamWsPage) => buildHref(page, workspaceId)
  const notifications: TeamNotification[] = [
    ...localNotifications,
    ...data.activityLogs.map((log) => ({
      id: `activity-${log.logId}`,
      title: log.targetTitle ?? '팀 활동 업데이트',
      description: `${log.actorName ?? '시스템'} ${log.description ?? log.actionType ?? log.activityType ?? '워크스페이스 활동을 기록했습니다.'}`,
      createdAt: notificationTime(log.createdAt),
      href: href('dashboard'),
      icon: 'fas fa-history',
      source: 'activity' as const,
    })),
    ...data.questions.filter((question) => !isAnswered(question)).map((question) => ({
      id: `question-${question.id}-${question.answerCount}-${question.createdAt ?? ''}`,
      title: '답변 대기 질문',
      description: `${question.authorName ?? '팀원'}님이 "${question.title}" 질문을 남겼습니다.`,
      createdAt: notificationTime(question.createdAt),
      href: href('qna'),
      icon: 'fas fa-comments',
      source: 'derived' as const,
    })),
    ...data.tasks.filter((task) => task.status === 'IN_REVIEW').map((task) => ({
      id: `review-${task.taskId}-${task.updatedAt ?? task.createdAt ?? task.status}`,
      title: '과제 리뷰 대기',
      description: `${task.assigneeName ?? '팀원'}님의 "${task.title}" 과제가 리뷰를 기다립니다.`,
      createdAt: notificationTime(task.updatedAt ?? task.createdAt),
      href: href('milestone'),
      icon: 'fas fa-clipboard-check',
      source: 'derived' as const,
    })),
    ...data.events
      .filter((event) => new Date(event.startAt).getTime() >= Date.now() - 60 * 60 * 1000)
      .slice(0, 5)
      .map((event) => ({
        id: `event-${event.eventId}-${event.updatedAt ?? event.createdAt ?? event.startAt}`,
        title: '다가오는 일정',
        description: `${formatDate(event.startAt)} ${formatTime(event.startAt)} · ${event.title}`,
        createdAt: notificationTime(event.updatedAt ?? event.createdAt ?? event.startAt),
        href: href('schedule'),
        icon: 'fas fa-calendar-alt',
        source: 'derived' as const,
      })),
    ...data.files.slice(0, 5).map((file) => ({
      id: `file-${file.fileId}-${file.createdAt ?? ''}`,
      title: file.itemType === 'LINK' ? '외부 링크 공유' : '자료 등록',
      description: `${file.uploadedByName ?? '팀원'}님이 "${workspaceFileTitle(file)}" 자료를 등록했습니다.`,
      createdAt: notificationTime(file.createdAt),
      href: href('files'),
      icon: file.itemType === 'LINK' ? 'fas fa-link' : 'fas fa-folder-open',
      source: 'derived' as const,
    })),
    ...data.notes.slice(0, 5).map((note) => ({
      id: `note-${note.noteId}-${note.updatedAt ?? note.createdAt ?? ''}`,
      title: '회의록 업데이트',
      description: `"${note.title}" 회의록이 등록되었거나 수정되었습니다.`,
      createdAt: notificationTime(note.updatedAt ?? note.createdAt),
      href: href('meeting'),
      icon: 'fas fa-file-alt',
      source: 'derived' as const,
    })),
    ...data.milestones.filter((item) => item.status !== 'COMPLETED').slice(0, 4).map((milestone) => ({
      id: `milestone-${milestone.milestoneId}-${milestone.createdAt ?? milestone.status}`,
      title: '마일스톤 진행 중',
      description: `"${milestone.title}" 마일스톤을 확인해 주세요.`,
      createdAt: notificationTime(milestone.createdAt),
      href: href('milestone'),
      icon: 'fas fa-flag-checkered',
      source: 'derived' as const,
    })),
  ]

  const unique = new Map<string, TeamNotification>()
  notifications.forEach((notification) => {
    if (!unique.has(notification.id)) unique.set(notification.id, notification)
  })
  return [...unique.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_TEAM_NOTIFICATIONS)
}

export function membersOnly(data: TeamData) {
  return (data.dashboard?.members ?? []).filter((member) => member.learnerId !== data.dashboard?.ownerId)
}

export function taskStatusMeta(status: TaskStatus) {
  if (status === 'DONE') return { label: '완료', badge: 'bg-green-100 text-green-600', column: 'Done' }
  if (status === 'IN_REVIEW') return { label: '리뷰 대기', badge: 'bg-yellow-100 text-yellow-700', column: 'Review' }
  if (status === 'IN_PROGRESS') return { label: '진행 중', badge: 'bg-blue-100 text-blue-600', column: 'In Progress' }
  return { label: '대기', badge: 'bg-gray-100 text-gray-500', column: 'Todo' }
}

export const MILESTONE_GUIDE_MARKER = '\n\n---DEVPATH_TEAM_GUIDELINES---\n'

export type MilestoneGuide = {
  frontend: string
  backend: string
  design: string
}

export type MilestoneWeek = {
  week: number
  milestone: MilestoneItem | null
  title: string
  description: string
  guide: MilestoneGuide
  isCurrent: boolean
}

export type MilestoneStudent = {
  member: WorkspaceMember
  task: WorkspaceTask | null
  status: 'pass' | 'wait' | 'fail' | 'none'
}

export type MilestoneFeedbackEntry = {
  id: string
  speaker: 'mentor' | 'learner'
  author: string
  time: string
  text: string
}

export const INSTRUCTOR_TEAM_MILESTONE_UI_LOCK_CLASSES = [
  "box-border! tracking-[0]! font-['Pretendard',sans-serif]! text-[14px]! leading-[20px]! [&_*]:box-border! [&_*]:tracking-[0]!",
  "[&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]! [&_textarea]:font-['Pretendard',sans-serif]! [&_button]:leading-[inherit]! [&_input]:leading-[inherit]! [&_textarea]:leading-[inherit]!",
  '[&_h1]:text-[24px]! [&_h1]:leading-[32px]! [&_h1]:font-[800]!',
  '[&_.itw-top-action]:min-h-[42px]! [&_.itw-top-action]:px-[20px]! [&_.itw-top-action]:py-[10px]! [&_.itw-top-action]:text-[14px]! [&_.itw-top-action]:leading-[20px]! [&_.itw-top-action]:font-[700]!',
  '[&_.itw-week-tab]:min-h-[42px]! [&_.itw-week-tab]:px-[20px]! [&_.itw-week-tab]:py-[10px]! [&_.itw-week-tab]:text-[14px]! [&_.itw-week-tab]:leading-[20px]! [&_.itw-week-tab]:font-[700]!',
  '[&_.itw-modal-button]:min-h-[42px]! [&_.itw-modal-button]:px-[20px]! [&_.itw-modal-button]:py-[10px]! [&_.itw-modal-button]:text-[14px]! [&_.itw-modal-button]:leading-[20px]! [&_.itw-modal-button]:font-[700]!',
  '[&_.itw-eval-button]:min-h-[34px]! [&_.itw-eval-button]:px-[16px]! [&_.itw-eval-button]:py-[8px]! [&_.itw-eval-button]:text-[12px]! [&_.itw-eval-button]:leading-[16px]! [&_.itw-eval-button]:font-[700]!',
  '[&_.itw-send-button]:min-h-[36px]! [&_.itw-send-button]:px-0! [&_.itw-send-button]:py-[10px]! [&_.itw-send-button]:text-[12px]! [&_.itw-send-button]:leading-[16px]! [&_.itw-send-button]:font-[700]!',
  '[&_.itw-icon-button]:h-[32px]! [&_.itw-icon-button]:min-h-[32px]! [&_.itw-icon-button]:w-[32px]! [&_.itw-icon-button]:min-w-[32px]! [&_.itw-icon-button]:p-0!',
  '[&_.itw-confirm-button]:min-h-[48px]! [&_.itw-confirm-button]:px-0! [&_.itw-confirm-button]:py-[14px]! [&_.itw-confirm-button]:text-[14px]! [&_.itw-confirm-button]:leading-[20px]! [&_.itw-confirm-button]:font-[700]!',
].join(' ')

export function buildMilestoneWeeks(milestones: MilestoneItem[]): MilestoneWeek[] {
  const sorted = [...milestones].sort((a, b) => {
    const left = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    const right = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    return left - right
  })
  const activeIndex = sorted.findIndex((item) => !['DONE', 'CLOSED', 'COMPLETED'].includes(String(item.status)))
  return Array.from({ length: 4 }, (_, index) => {
    const milestone = sorted[index] ?? null
    const parsed = parseMilestoneDescription(milestone?.description)
    return {
      week: index + 1,
      milestone,
      title: milestone?.title ?? '',
      description: parsed.description,
      guide: parsed.guide,
      isCurrent: activeIndex >= 0 ? activeIndex === index : index === 0,
    }
  })
}

export function parseMilestoneDescription(value?: string | null): { description: string; guide: MilestoneGuide } {
  const emptyGuide = { frontend: '', backend: '', design: '' }
  if (!value) return { description: '', guide: emptyGuide }
  const [description, meta] = value.split(MILESTONE_GUIDE_MARKER)
  if (!meta) return { description: value, guide: emptyGuide }
  const guide = { ...emptyGuide }
  meta.split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':')
    const text = rest.join(':').trim()
    if (key === 'Frontend') guide.frontend = text
    if (key === 'Backend') guide.backend = text
    if (key === 'Designer') guide.design = text
  })
  return { description: description.trim(), guide }
}

export function buildMilestoneDescription(description: string, guide: MilestoneGuide) {
  return `${description.trim()}${MILESTONE_GUIDE_MARKER}Frontend: ${guide.frontend.trim()}\nBackend: ${guide.backend.trim()}\nDesigner: ${guide.design.trim()}`
}

export function defaultMilestoneDate(week: number, offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + (week - 1) * 7 + offset)
  return date.toISOString().slice(0, 10)
}

export function normalizeMilestoneStatus(status: string) {
  if (status === 'COMPLETED') return 'DONE'
  if (status === 'ACTIVE' || status === 'OVERDUE') return 'IN_PROGRESS'
  return ['OPEN', 'IN_PROGRESS', 'DONE', 'CLOSED'].includes(status) ? status : 'OPEN'
}

export const MILESTONE_FEEDBACK_MARKER = '\n\n---DEVPATH_MILESTONE_FEEDBACK---\n'

export function parseMilestoneFeedbackEntries(value?: string | null, learnerName?: string | null): MilestoneFeedbackEntry[] {
  const [, meta] = (value ?? '').split(MILESTONE_FEEDBACK_MARKER)
  if (!meta) return []

  return meta
    .split('\n')
    .map((line, index) => {
      const [speakerRaw, authorRaw, timeRaw, ...textParts] = line.split('|')
      const text = textParts.join('|').trim()
      if (!text) return null

      const speaker = speakerRaw?.trim() === 'mentor' ? 'mentor' : 'learner'
      return {
        id: `milestone-feedback-${index}-${speaker}`,
        speaker,
        author: authorRaw?.trim() || (speaker === 'mentor' ? '멘토' : learnerName || '팀원'),
        time: timeRaw?.trim() || '방금 전',
        text,
      } satisfies MilestoneFeedbackEntry
    })
    .filter((entry): entry is MilestoneFeedbackEntry => Boolean(entry))
}

export function buildMilestoneStudents(members: WorkspaceMember[], tasks: WorkspaceTask[]): MilestoneStudent[] {
  const taskByLearner = new Map<number, WorkspaceTask>()
  ;[...tasks]
    .filter((task) => task.assigneeId)
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
    .forEach((task) => {
      if (task.assigneeId && !taskByLearner.has(task.assigneeId)) {
        taskByLearner.set(task.assigneeId, task)
      }
    })

  return members.map((member) => {
    const task = taskByLearner.get(member.learnerId) ?? null
    return { member, task, status: task ? taskToMilestoneStudentStatus(task.status) : 'none' }
  })
}

export function taskToMilestoneStudentStatus(status: TaskStatus): MilestoneStudent['status'] {
  if (status === 'DONE') return 'pass'
  if (status === 'IN_REVIEW') return 'wait'
  if (status === 'TODO') return 'fail'
  return 'none'
}

export function milestoneStudentStatusMeta(status: MilestoneStudent['status']) {
  if (status === 'pass') return { label: 'Pass', badge: 'bg-green-50 text-green-600', border: 'border-l-green-400' }
  if (status === 'wait') return { label: '리뷰 대기', badge: 'border border-yellow-200 bg-yellow-50 text-yellow-600', border: 'border-l-yellow-400' }
  if (status === 'fail') return { label: '재제출 요망', badge: 'bg-red-50 text-red-600', border: 'border-l-red-400' }
  return { label: '미제출', badge: 'bg-gray-100 text-gray-400', border: 'border-l-transparent' }
}

export function roleBadgeTone(role?: string | null) {
  const normalized = role?.toLowerCase() ?? ''
  if (normalized.includes('fe') || normalized.includes('front')) return 'border-blue-100 bg-blue-50 text-blue-600'
  if (normalized.includes('be') || normalized.includes('back')) return 'border-purple-100 bg-purple-50 text-purple-600'
  if (normalized.includes('design') || normalized.includes('des') || normalized.includes('디자')) return 'border-pink-100 bg-pink-50 text-pink-600'
  return 'border-gray-200 bg-gray-50 text-gray-500'
}

export type KanbanFilter = 'all' | 'fe' | 'be' | 'design'

export const KANBAN_ROLE_MARKER = '\n\n---DEVPATH_KANBAN_ROLE---\n'

export const KANBAN_COLUMNS: Array<{
  status: TaskStatus
  label: string
  wrapperClass: string
  headerClass: string
  dotClass: string
  countClass: string
  highlight?: boolean
}> = [
  { status: 'TODO', label: '할 일 (To Do)', wrapperClass: 'border-gray-200 bg-gray-100/50', headerClass: 'border-gray-200 text-gray-800', dotClass: 'bg-gray-400', countClass: 'border-gray-200 bg-white text-gray-500' },
  { status: 'IN_PROGRESS', label: '진행 중 (In Progress)', wrapperClass: 'border-blue-100 bg-blue-50/30', headerClass: 'border-blue-100 text-blue-800', dotClass: 'bg-blue-500', countClass: 'border-blue-200 bg-white text-blue-600 shadow-sm' },
  { status: 'IN_REVIEW', label: '리뷰 대기 (In Review)', wrapperClass: 'border-2 border-yellow-200 bg-yellow-50/50 relative overflow-hidden', headerClass: 'border-yellow-200 text-yellow-800 relative z-10', dotClass: 'animate-pulse bg-yellow-500', countClass: 'bg-yellow-500 text-white shadow-sm', highlight: true },
  { status: 'DONE', label: '완료 (Done)', wrapperClass: 'border-green-100 bg-green-50/30', headerClass: 'border-green-100 text-green-800', dotClass: 'bg-green-500', countClass: 'border-green-200 bg-white text-green-600 shadow-sm' },
]

export function kanbanRoleKey(value?: string | null): KanbanFilter | 'common' {
  const normalized = (value ?? '').toLowerCase()
  if (normalized.includes('front') || normalized.includes('fe') || normalized.includes('프론트')) return 'fe'
  if (normalized.includes('back') || normalized.includes('be') || normalized.includes('백엔드')) return 'be'
  if (normalized.includes('design') || normalized.includes('des') || normalized.includes('디자') || normalized.includes('ux')) return 'design'
  return 'common'
}

export function parseKanbanDescription(value?: string | null) {
  const [description, meta] = (value ?? '').split(KANBAN_ROLE_MARKER)
  const role = meta?.match(/role:\s*(fe|be|design|common)/i)?.[1] as KanbanFilter | 'common' | undefined
  return { description: description.trim(), role }
}

export function buildKanbanDescription(description: string, role: KanbanFilter | 'common') {
  return `${description.trim()}${KANBAN_ROLE_MARKER}role: ${role}`
}

export function kanbanTaskRole(task: WorkspaceTask, members: WorkspaceMember[]): KanbanFilter | 'common' {
  const parsed = parseKanbanDescription(task.description)
  if (parsed.role) return parsed.role
  const assignee = members.find((member) => member.learnerId === task.assigneeId)
  const memberRole = kanbanRoleKey(`${assignee?.roleLabel ?? ''} ${assignee?.position ?? ''}`)
  if (memberRole !== 'common') return memberRole
  return kanbanRoleKey(`${task.title} ${task.description ?? ''}`)
}

export function kanbanRoleMeta(role: KanbanFilter | 'common') {
  if (role === 'fe') return { label: 'Frontend', badge: 'border-blue-200 bg-blue-50 text-blue-600', prefix: 'FE' }
  if (role === 'be') return { label: 'Backend', badge: 'border-purple-200 bg-purple-50 text-purple-600', prefix: 'BE' }
  if (role === 'design') return { label: 'Designer', badge: 'border-pink-200 bg-pink-50 text-pink-600', prefix: 'UX' }
  return { label: 'Common', badge: 'border-gray-200 bg-gray-50 text-gray-500', prefix: 'TK' }
}

export function kanbanPriorityMeta(priority?: TaskPriority | null) {
  if (priority === 'HIGH') return { label: '긴급', className: 'bg-red-50 text-red-500', icon: 'fas fa-fire mr-0.5' }
  if (priority === 'LOW') return { label: '낮음', className: 'bg-gray-100 text-gray-400', icon: '' }
  return { label: '보통', className: 'bg-orange-50 text-orange-500', icon: '' }
}

export const INSTRUCTOR_TEAM_KANBAN_UI_LOCK_CLASSES = [
  "box-border! tracking-[0]! font-['Pretendard',sans-serif]! text-[14px]! leading-[20px]! [&_*]:box-border! [&_*]:tracking-[0]!",
  "[&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]! [&_select]:font-['Pretendard',sans-serif]! [&_textarea]:font-['Pretendard',sans-serif]!",
  '[&_h1]:text-[24px]! [&_h1]:leading-[32px]! [&_h1]:font-[800]!',
  '[&_.itw-kanban-filter-tab]:min-h-[30px]! [&_.itw-kanban-filter-tab]:px-[16px]! [&_.itw-kanban-filter-tab]:py-[6px]! [&_.itw-kanban-filter-tab]:text-[12px]! [&_.itw-kanban-filter-tab]:leading-[16px]! [&_.itw-kanban-filter-tab]:font-[700]!',
  '[&_.itw-kanban-top-button]:min-h-[42px]! [&_.itw-kanban-top-button]:px-[20px]! [&_.itw-kanban-top-button]:py-[10px]! [&_.itw-kanban-top-button]:text-[14px]! [&_.itw-kanban-top-button]:leading-[20px]! [&_.itw-kanban-top-button]:font-[700]!',
  '[&_.kanban-card]:[transition:box-shadow_0.2s,border-color_0.2s,transform_0.2s]!',
  '[&_.kanban-card:active]:cursor-grabbing! [&_.kanban-card:active]:[transform:scale(0.98)]!',
].join(' ')

export type ArchitectureTab = 'api' | 'erd' | 'infra'

export type ApiEndpointSpec = {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  description: string
  request: string
  response: string
  status: 'DONE' | 'SYNCING' | 'DESIGNING' | 'NEEDS_FIX'
  ownerId?: number | null
}

export type ArchitectureFeedback = {
  id: string
  author: string
  role: string
  content: string
  createdAt: string
  mine?: boolean
}

export type ArchitectureLog = {
  id: string
  actor: string
  role: string
  message: string
  createdAt: string
}

export type ArchitectureDocData = {
  externalLink: string
  notes: string
  endpoints: ApiEndpointSpec[]
  feedback: ArchitectureFeedback[]
  logs: ArchitectureLog[]
}

export const EMPTY_ARCHITECTURE_DOC: ArchitectureDocData = { externalLink: '', notes: '', endpoints: [], feedback: [], logs: [] }

export function parseArchitectureDoc(content?: string | null): ArchitectureDocData {
  if (!content) return { ...EMPTY_ARCHITECTURE_DOC }
  try {
    const parsed = JSON.parse(content) as Partial<ArchitectureDocData>
    if (parsed && typeof parsed === 'object' && ('externalLink' in parsed || 'notes' in parsed || 'endpoints' in parsed || 'feedback' in parsed || 'logs' in parsed)) {
      return {
        externalLink: parsed.externalLink ?? '',
        notes: parsed.notes ?? '',
        endpoints: Array.isArray(parsed.endpoints) ? parsed.endpoints : [],
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      }
    }
  } catch {
    // Plain documents from older saves are displayed as notes.
  }
  const maybeUrl = content.match(/https?:\/\/\S+/)?.[0] ?? ''
  return { ...EMPTY_ARCHITECTURE_DOC, externalLink: maybeUrl, notes: content }
}

export function serializeArchitectureDoc(doc: ArchitectureDocData) {
  return JSON.stringify(doc, null, 2)
}

export function architectureDocFor(data: TeamData, mode: ArchitectureTab) {
  return parseArchitectureDoc((mode === 'api' ? data.apiSpec : mode === 'erd' ? data.erdDoc : data.infraDoc)?.content)
}

export function architectureEndpointFor(mode: ArchitectureTab, workspaceId: number) {
  return mode === 'api' ? `/api/workspaces/${workspaceId}/api-spec` : `/api/workspaces/${workspaceId}/docs/${mode}`
}

export function architectureLabel(mode: ArchitectureTab) {
  return mode === 'api' ? 'API 명세서' : mode === 'erd' ? 'ERD' : '인프라 구조도'
}

export function apiMethodTone(method: ApiEndpointSpec['method']) {
  if (method === 'GET') return 'border-blue-200 bg-blue-50 text-blue-600'
  if (method === 'POST') return 'border-green-200 bg-green-50 text-green-600'
  if (method === 'DELETE') return 'border-red-200 bg-red-50 text-red-600'
  if (method === 'PATCH') return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  return 'border-gray-200 bg-gray-100 text-gray-600'
}

export function apiStatusMeta(status: ApiEndpointSpec['status']) {
  if (status === 'DONE') return { label: '개발 완료', className: 'bg-green-50 text-green-600', icon: 'fas fa-check mr-0.5' }
  if (status === 'SYNCING') return { label: '프론트 연동 중', className: 'bg-yellow-50 text-yellow-600', icon: 'fas fa-spinner mr-0.5' }
  if (status === 'NEEDS_FIX') return { label: '수정 필요', className: 'bg-red-50 text-red-600', icon: 'fas fa-exclamation-triangle mr-0.5' }
  return { label: '설계 중', className: 'bg-gray-100 text-gray-500', icon: '' }
}

export const INSTRUCTOR_TEAM_ARCHITECTURE_UI_LOCK_CLASSES = [
  "box-border! tracking-[0]! font-['Pretendard',sans-serif]! text-[14px]! leading-[20px]! [&_*]:box-border! [&_*]:tracking-[0]!",
  "[&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]! [&_select]:font-['Pretendard',sans-serif]! [&_textarea]:font-['Pretendard',sans-serif]!",
  '[&_h1]:text-[24px]! [&_h1]:leading-[32px]! [&_h1]:font-[800]!',
  '[&_.arch-tab]:[border-bottom:2px_solid_transparent]! [&_.arch-tab]:cursor-pointer! [&_.arch-tab]:[transition:border-color_0.2s,color_0.2s]!',
  '[&_.arch-tab.active]:border-[#7c3aed]! [&_.arch-tab.active]:text-[#7c3aed]! [&_.arch-tab.active]:font-[800]!',
  '[&_.api-row]:[transition:background-color_0.2s,box-shadow_0.2s]! [&_.api-row:hover]:bg-[#f9fafb]!',
].join(' ')

export function questionMember(question: QuestionSummary, members: WorkspaceMember[]) {
  return members.find((member) => member.learnerId === question.authorId) ?? null
}

export function qnaRoleMeta(member: WorkspaceMember | null) {
  const raw = member?.roleLabel ?? member?.position ?? member?.role ?? ''
  const normalized = raw.toLowerCase()
  if (normalized.includes('front') || normalized.includes('fe')) return { label: 'Frontend', badge: 'bg-blue-50 text-blue-600 border-blue-100' }
  if (normalized.includes('back') || normalized.includes('be')) return { label: 'Backend', badge: 'bg-purple-50 text-purple-600 border-purple-100' }
  if (normalized.includes('design') || normalized.includes('des') || normalized.includes('ux') || normalized.includes('디자')) return { label: 'UX/UI', badge: 'bg-pink-50 text-pink-600 border-pink-100' }
  if (normalized.includes('pm') || normalized.includes('기획')) return { label: 'PM', badge: 'bg-amber-50 text-amber-600 border-amber-100' }
  return { label: raw || 'Team', badge: 'bg-gray-50 text-gray-600 border-gray-100' }
}

export const INSTRUCTOR_TEAM_QNA_UI_LOCK_CLASSES = [
  "box-border! tracking-[0]! font-['Pretendard',sans-serif]! text-[14px]! leading-[20px]! [&_*]:box-border! [&_*]:tracking-[0]!",
  "[&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]! [&_textarea]:font-['Pretendard',sans-serif]!",
  '[&_h1]:text-[24px]! [&_h1]:leading-[32px]! [&_h1]:font-[800]!',
  '[&_.filter-tab]:min-h-[42px]! [&_.filter-tab]:px-[20px]! [&_.filter-tab]:py-[10px]! [&_.filter-tab]:rounded-[12px]! [&_.filter-tab]:text-[14px]! [&_.filter-tab]:leading-[20px]! [&_.filter-tab]:font-[700]! [&_.filter-tab]:cursor-pointer! [&_.filter-tab]:[transition:background-color_0.2s,color_0.2s,border-color_0.2s]!',
  '[&_.filter-tab.active]:border-[#111827]! [&_.filter-tab.active]:bg-[#111827]! [&_.filter-tab.active]:text-white! [&_.filter-tab.active]:font-[700]!',
].join(' ')

export type ScheduleEventType = 'meetup' | 'deadline' | 'team'

export function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function localDateTimeInput(value: Date) {
  return `${localDateKey(value)}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}:00`
}

export function parseScheduleDescription(description?: string | null): { type: ScheduleEventType; description: string } {
  const match = description?.match(/^\[TEAM_EVENT:(meetup|deadline|team|live|review)\]\n?/)
  const rawType = match?.[1]
  const type: ScheduleEventType = rawType === 'deadline' ? 'deadline' : rawType === 'team' ? 'team' : 'meetup'
  return { type, description: match ? (description ?? '').replace(match[0], '') : (description ?? '') }
}

export function buildScheduleDescription(type: ScheduleEventType, description: string) {
  return `[TEAM_EVENT:${type}]\n${description.trim()}`
}

export function scheduleEventMeta(type: ScheduleEventType) {
  if (type === 'deadline') return { label: '공식 마감일', icon: 'fas fa-flag-checkered', dot: 'bg-red-500', badge: 'bg-red-500 text-white', card: 'border-red-100 bg-red-50/50' }
  if (type === 'team') return { label: '팀 내부 일정', icon: 'fas fa-users', dot: 'bg-blue-500', badge: 'bg-blue-500 text-white', card: 'border-blue-100 bg-blue-50/50' }
  return { label: '라이브 밋업', icon: 'fas fa-video', dot: 'bg-[#7C3AED]', badge: 'bg-[#7C3AED] text-white', card: 'border-purple-100 bg-purple-50/50' }
}

export const INSTRUCTOR_TEAM_SCHEDULE_UI_LOCK_CLASSES = [
  "box-border! tracking-[0]! font-['Pretendard',sans-serif]! text-[14px]! leading-[20px]! [&_*]:box-border! [&_*]:tracking-[0]!",
  "[&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]! [&_select]:font-['Pretendard',sans-serif]! [&_textarea]:font-['Pretendard',sans-serif]!",
  '[&_h1]:text-[24px]! [&_h1]:leading-[32px]! [&_h1]:font-[800]!',
  '[&_.calendar-grid]:grid! [&_.calendar-grid]:[grid-template-columns:repeat(7,minmax(0,1fr))]! [&_.calendar-grid]:gap-[1px]! [&_.calendar-grid]:overflow-hidden! [&_.calendar-grid]:border-[1px]! [&_.calendar-grid]:border-solid! [&_.calendar-grid]:border-[#e5e7eb]! [&_.calendar-grid]:rounded-[12px]! [&_.calendar-grid]:bg-[#e5e7eb]!',
  '[&_.calendar-header]:px-[8px]! [&_.calendar-header]:py-[6px]! [&_.calendar-header]:bg-[#f9fafb]! [&_.calendar-header]:text-center! [&_.calendar-header]:text-[12px]! [&_.calendar-header]:leading-[16px]! [&_.calendar-header]:font-[800]! [&_.calendar-header]:text-[#6b7280]!',
  '[&_.calendar-day]:min-h-[76px]! [&_.calendar-day]:px-[8px]! [&_.calendar-day]:py-[6px]! [&_.calendar-day]:border-0! [&_.calendar-day]:bg-white! [&_.calendar-day]:[transition:background-color_0.2s]! [&_.calendar-day]:cursor-pointer!',
  '[&_.calendar-day:hover]:bg-[#f9fafb]! [&_.calendar-day.today]:bg-[#eef2ff]! [&_.calendar-day.today:hover]:bg-[#eef2ff]! [&_.calendar-day.other-month]:bg-[#f9fafb]! [&_.calendar-day.other-month]:text-[#d1d5db]! [&_.calendar-day.other-month]:cursor-default!',
].join(' ')

export type FileFilter = 'all' | 'official' | 'shared' | 'link'
export type FileViewMode = 'grid' | 'list'
export type FileUploadMode = 'file' | 'link'

export const INSTRUCTOR_TEAM_FILES_UI_LOCK_CLASSES = [
  "box-border! tracking-[0]! font-['Pretendard',sans-serif]! text-[14px]! leading-[20px]! [&_*]:box-border! [&_*]:tracking-[0]!",
  "[&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]! [&_textarea]:font-['Pretendard',sans-serif]!",
  '[&_h1]:text-[24px]! [&_h1]:leading-[32px]! [&_h1]:font-[800]!',
  '[&_.team-files-filter-tab]:inline-flex! [&_.team-files-filter-tab]:items-center! [&_.team-files-filter-tab]:gap-[8px]! [&_.team-files-filter-tab]:pb-[8px]! [&_.team-files-filter-tab]:[border-bottom:2px_solid_transparent]! [&_.team-files-filter-tab]:text-[#9ca3af]! [&_.team-files-filter-tab]:text-[14px]! [&_.team-files-filter-tab]:leading-[20px]! [&_.team-files-filter-tab]:font-[700]! [&_.team-files-filter-tab]:[transition:color_0.2s,border-color_0.2s]!',
  '[&_.team-files-filter-tab.active]:[border-bottom-color:#111827]! [&_.team-files-filter-tab.active]:text-[#111827]!',
  '[&_.file-card:hover]:[transform:translateY(-4px)]! [&_.file-card:hover]:[border-color:#c4b5fd]! [&_.file-card:hover]:[box-shadow:0_20px_25px_-5px_rgb(0_0_0_/_0.08),0_8px_10px_-6px_rgb(0_0_0_/_0.06)]!',
  '[&_.file-badge]:inline-flex! [&_.file-badge]:items-center! [&_.file-badge]:rounded-[9999px]! [&_.file-badge]:px-[8px]! [&_.file-badge]:py-[4px]! [&_.file-badge]:text-[10px]! [&_.file-badge]:leading-[12px]! [&_.file-badge]:font-[800]!',
  '[&_.file-badge.official]:bg-[#f3e8ff]! [&_.file-badge.official]:text-[#7c3aed]! [&_.file-badge.shared]:bg-[#e0e7ff]! [&_.file-badge.shared]:text-[#4f46e5]!',
  '[&_.file-detail-badge]:inline-block! [&_.file-detail-badge]:mb-[8px]! [&_.file-detail-badge]:border-[1px]! [&_.file-detail-badge]:border-solid! [&_.file-detail-badge]:rounded-[4px]! [&_.file-detail-badge]:px-[6px]! [&_.file-detail-badge]:py-[2px]! [&_.file-detail-badge]:text-[9px]! [&_.file-detail-badge]:leading-[12px]! [&_.file-detail-badge]:font-[800]!',
  '[&_.file-detail-badge.official]:border-[#ddd6fe]! [&_.file-detail-badge.official]:bg-[#f3e8ff]! [&_.file-detail-badge.official]:text-[#7c3aed]! [&_.file-detail-badge.shared]:border-[#c7d2fe]! [&_.file-detail-badge.shared]:bg-[#e0e7ff]! [&_.file-detail-badge.shared]:text-[#4f46e5]!',
  '[&_.file-ext-badge]:inline-flex! [&_.file-ext-badge]:min-w-[34px]! [&_.file-ext-badge]:items-center! [&_.file-ext-badge]:justify-center! [&_.file-ext-badge]:rounded-[8px]! [&_.file-ext-badge]:bg-[#f3f4f6]! [&_.file-ext-badge]:px-[7px]! [&_.file-ext-badge]:py-[4px]! [&_.file-ext-badge]:text-[#6b7280]! [&_.file-ext-badge]:text-[10px]! [&_.file-ext-badge]:leading-[12px]! [&_.file-ext-badge]:font-[900]!',
  '[&_.upload-zone]:bg-[#f9fafb]! [&_.upload-zone:hover]:[border-color:#7c3aed]! [&_.upload-zone:hover]:bg-[#f5f3ff]! [&_.upload-zone.dragging]:[border-color:#7c3aed]! [&_.upload-zone.dragging]:bg-[#f5f3ff]!',
].join(' ')

export function workspaceFileTitle(file: WorkspaceFile) {
  return file.displayName || file.originalFileName || (file.itemType === 'LINK' ? '외부 링크' : '자료')
}

export function isOfficialWorkspaceFile(file: WorkspaceFile, data: TeamData) {
  const ownerId = data.dashboard?.ownerId
  if (ownerId && file.uploadedById === ownerId) return true
  return Boolean(data.dashboard?.ownerName && file.uploadedByName === data.dashboard.ownerName)
}

export function workspaceFileExtension(file: WorkspaceFile) {
  if (file.itemType === 'LINK') return 'LINK'
  const title = workspaceFileTitle(file)
  const ext = title.includes('.') ? title.split('.').pop()?.toUpperCase() : ''
  if (ext && ext.length <= 5) return ext
  if (file.contentType?.includes('pdf')) return 'PDF'
  if (file.contentType?.includes('zip')) return 'ZIP'
  if (file.contentType?.startsWith('image/')) return 'IMG'
  return 'FILE'
}

export function workspaceFileIconClass(file: WorkspaceFile) {
  const title = workspaceFileTitle(file).toLowerCase()
  const ext = workspaceFileExtension(file).toLowerCase()
  if (file.itemType === 'LINK') return title.includes('figma') || file.objectKey?.includes('figma') ? 'fab fa-figma text-[#7C3AED]' : 'fas fa-link text-[#7C3AED]'
  if (ext === 'pdf') return 'far fa-file-pdf text-red-500'
  if (ext === 'zip') return 'far fa-file-archive text-yellow-600'
  if (['png', 'jpg', 'jpeg', 'gif', 'img'].includes(ext)) return 'far fa-file-image text-blue-500'
  if (['doc', 'docx'].includes(ext)) return 'far fa-file-word text-blue-600'
  return 'far fa-file-alt text-[#7C3AED]'
}

export async function downloadWorkspaceFile(file: WorkspaceFile) {
  const session = readStoredAuthSession()
  const headers = new Headers()
  if (session?.accessToken) headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  const response = await fetch(`${apiBaseUrl}/api/workspace-files/${file.fileId}/download`, { headers })
  if (!response.ok) throw new Error('자료 다운로드에 실패했습니다.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.originalFileName || workspaceFileTitle(file)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type MeetingNoteFilter = 'all' | 'mentor' | 'team'

export const INSTRUCTOR_TEAM_MEETING_UI_LOCK_CLASSES = [
  "box-border! tracking-[0]! font-['Pretendard',sans-serif]! text-[14px]! leading-[20px]! [&_*]:box-border! [&_*]:tracking-[0]!",
  "[&_a]:font-['Pretendard',sans-serif]! [&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]! [&_textarea]:font-['Pretendard',sans-serif]!",
  '[&_h1]:text-[24px]! [&_h1]:leading-[32px]! [&_h1]:font-[800]!',
  '[&_h3]:text-[14px]! [&_h3]:leading-[20px]! [&_h3]:font-[800]!',
  '[&_h4]:text-[17px]! [&_h4]:leading-[24px]!',
  '[&_p]:leading-[1.45]! [&_span]:leading-[1.45]! [&_label]:leading-[1.45]! [&_input]:leading-[1.45]! [&_textarea]:leading-[1.45]!',
  '[&>div:first-child_button]:min-h-[42px]! [&>div:first-child_button]:px-[18px]! [&>div:first-child_button]:py-[10px]! [&>div:first-child_button]:text-[13px]! [&>div:first-child_button]:leading-[18px]! [&>div:first-child_button]:font-[700]!',
  '[&_section_a]:text-[13px]! [&_section_a]:leading-[18px]! [&_section_a]:font-[700]! [&_section_button]:text-[13px]! [&_section_button]:leading-[18px]! [&_section_button]:font-[700]!',
  "[&_section_a[class*='py-3.5']]:min-h-[42px]! [&_section_a[class*='py-3.5']]:py-[10px]! [&_section_button[class*='py-3.5']]:min-h-[42px]! [&_section_button[class*='py-3.5']]:py-[10px]!",
  "[&_section_a[class*='py-2.5']]:min-h-[34px]! [&_section_a[class*='py-2.5']]:py-[8px]! [&_section_a[class*='py-2.5']]:text-[12px]! [&_section_a[class*='py-2.5']]:leading-[16px]! [&_section_button[class*='py-2.5']]:min-h-[34px]! [&_section_button[class*='py-2.5']]:py-[8px]! [&_section_button[class*='py-2.5']]:text-[12px]! [&_section_button[class*='py-2.5']]:leading-[16px]!",
  '[&_.rounded-lg.px-4.py-2]:min-h-[30px]! [&_.rounded-lg.px-4.py-2]:px-[14px]! [&_.rounded-lg.px-4.py-2]:py-[6px]! [&_.rounded-lg.px-4.py-2]:text-[12px]! [&_.rounded-lg.px-4.py-2]:leading-[16px]!',
  '[&_.text-sm]:text-[13px]! [&_.text-sm]:leading-[19px]! [&_.text-xs]:text-[12px]! [&_.text-xs]:leading-[16px]! [&_.text-lg]:text-[17px]! [&_.text-lg]:leading-[24px]!',
].join(' ')

export function formatMeetingDate(value?: string | null) {
  if (!value) return '일정 없음'
  const date = new Date(value)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).replace(/\. /g, '.').replace('.', '.')
}

export const INSTRUCTOR_TEAM_LIVE_MEETING_UI_LOCK_CLASSES = [
  "box-border! tracking-[0]! font-['Pretendard',sans-serif]! text-[14px]! leading-[20px]! [&_*]:box-border! [&_*]:tracking-[0]!",
  "[&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]!",
  '[&_h1]:text-[14px]! [&_h1]:leading-[20px]! [&_.text-sm]:text-[14px]! [&_.text-sm]:leading-[20px]!',
  '[&_h3]:text-[18px]! [&_h3]:leading-[28px]! [&_.text-lg]:text-[18px]! [&_.text-lg]:leading-[28px]!',
  '[&_.text-xs]:text-[12px]! [&_.text-xs]:leading-[16px]!',
  '[&_header_button.h-10.w-10]:h-[40px]! [&_header_button.h-10.w-10]:w-[40px]! [&_header_button.h-10.w-10]:min-w-[40px]! [&_header_button.h-10.w-10]:p-0!',
  '[&_footer_button.h-12.w-12]:h-[48px]! [&_footer_button.h-12.w-12]:w-[48px]! [&_footer_button.h-12.w-12]:min-w-[48px]! [&_footer_button.h-12.w-12]:p-0! [&_footer_button.h-12.w-12]:text-[18px]! [&_footer_button.h-12.w-12]:leading-[28px]!',
  '[&_footer_button.h-12:not(.w-12)]:h-[48px]! [&_footer_button.h-12:not(.w-12)]:min-h-[48px]! [&_footer_button.h-12:not(.w-12)]:px-[24px]! [&_footer_button.h-12:not(.w-12)]:py-0! [&_footer_button.h-12:not(.w-12)]:text-[14px]! [&_footer_button.h-12:not(.w-12)]:leading-[20px]!',
  '[&_.recording-pulse]:animate-[instructor-team-live-recording-pulse_2s_infinite]!',
].join(' ')
