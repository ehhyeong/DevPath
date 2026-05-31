import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import { clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import {
  createInstructorTeamCalendarEvent,
  createInstructorTeamFileLink,
  createInstructorTeamMeetingNote,
  createInstructorTeamMilestone,
  createInstructorTeamQuestionAnswer,
  createInstructorTeamTask,
  deleteInstructorTeamCalendarEvent,
  deleteInstructorTeamMeetingNote,
  deleteInstructorTeamTask,
  deleteInstructorTeamWorkspaceFile,
  fetchInstructorTeamQuestionDetail,
  loadInstructorTeamWorkspaceData,
  saveInstructorTeamWorkspaceDoc,
  updateInstructorTeamMilestone,
  updateInstructorTeamQuestionAnswer,
  updateInstructorTeamTask,
  updateInstructorTeamTaskAssignee,
  updateInstructorTeamTaskStatus,
  updateInstructorTeamWorkspaceFile,
  uploadInstructorTeamWorkspaceFile,
} from './instructor-team-workspace-api'

import type {
  ActivityLogItem,
  CalendarEvent,
  InstructorTeamWsPage,
  MeetingNote,
  MilestoneItem,
  PageConfig,
  QuestionDetail,
  QuestionSummary,
  TaskPriority,
  TaskStatus,
  TeamData,
  TeamNotification,
  TeamNotificationDraft,
  WorkspaceFile,
  WorkspaceMember,
  WorkspaceTask,
} from './instructor-team-workspace-types'

const EMPTY_DATA: TeamData = {
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

const PAGE_CONFIG: Record<InstructorTeamWsPage, PageConfig> = {
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

const NAV_SECTIONS: Array<{ title: string; pages: InstructorTeamWsPage[] }> = [
  { title: 'Workspace (Admin)', pages: ['dashboard', 'milestone'] },
  { title: 'Team Management', pages: ['kanban', 'architecture', 'qna'] },
  { title: 'Resources & Live', pages: ['schedule', 'files', 'meeting'] },
]

const TEAM_NOTIFICATION_EVENT = 'devpath-team-notification'
const MAX_TEAM_NOTIFICATIONS = 40
const TEAM_WORKSPACE_REFRESH_INTERVAL_MS = 5000

function getWorkspaceIdFromUrl(): number | null {
  const parsed = Number(new URLSearchParams(window.location.search).get('workspaceId'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function buildHref(page: InstructorTeamWsPage, workspaceId: number | null) {
  return `${PAGE_CONFIG[page].path}${workspaceId ? `?workspaceId=${workspaceId}` : ''}`
}

function avatarUrl(seed?: string | null) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'mentor')}`
}

function shortRoleLabel(position?: string | null) {
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

function relativeTime(value?: string | null) {
  if (!value) return '방금 전'
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

function formatDate(value?: string | null) {
  if (!value) return '일정 없음'
  return new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
}

function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isAnswered(question: QuestionSummary) {
  return question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED' || question.answerCount > 0
}

function teamNotificationStorageKey(workspaceId: number | null) {
  return `devpath:team-ws:${workspaceId ?? 'none'}:notifications`
}

function teamNotificationReadStorageKey(workspaceId: number | null) {
  return `devpath:team-ws:${workspaceId ?? 'none'}:notifications:read`
}

function readStoredArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

function readStoredTeamNotifications(workspaceId: number | null) {
  return readStoredArray<TeamNotification>(teamNotificationStorageKey(workspaceId))
}

function writeStoredTeamNotifications(workspaceId: number | null, notifications: TeamNotification[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(teamNotificationStorageKey(workspaceId), JSON.stringify(notifications.slice(0, MAX_TEAM_NOTIFICATIONS)))
}

function readTeamNotificationIds(workspaceId: number | null) {
  return readStoredArray<string>(teamNotificationReadStorageKey(workspaceId))
}

function writeTeamNotificationIds(workspaceId: number | null, ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(teamNotificationReadStorageKey(workspaceId), JSON.stringify(ids.slice(-200)))
}

function pushTeamNotification(workspaceId: number | null, draft: TeamNotificationDraft) {
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

function notificationTime(value?: string | null) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : new Date().toISOString()
}

function buildTeamNotifications(data: TeamData, workspaceId: number | null, localNotifications: TeamNotification[]) {
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

function membersOnly(data: TeamData) {
  return (data.dashboard?.members ?? []).filter((member) => member.learnerId !== data.dashboard?.ownerId)
}

function taskStatusMeta(status: TaskStatus) {
  if (status === 'DONE') return { label: '완료', badge: 'bg-green-100 text-green-600', column: 'Done' }
  if (status === 'IN_REVIEW') return { label: '리뷰 대기', badge: 'bg-yellow-100 text-yellow-700', column: 'Review' }
  if (status === 'IN_PROGRESS') return { label: '진행 중', badge: 'bg-blue-100 text-blue-600', column: 'In Progress' }
  return { label: '대기', badge: 'bg-gray-100 text-gray-500', column: 'Todo' }
}

function EmptyPanel({ icon, title, description, action }: { icon: string; title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50 px-6 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl text-gray-300">
        <i className={icon} />
      </div>
      <h3 className="text-sm font-extrabold text-gray-700">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-6 text-gray-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function Modal({ title, icon, onClose, children, maxWidth = 'max-w-lg' }: { title: string; icon: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className={`${icon} text-[#7C3AED]`} />{title}</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar max-h-[calc(90vh-88px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function TeamShell({ page, workspaceId, data, children }: { page: InstructorTeamWsPage; workspaceId: number | null; data: TeamData; children: ReactNode }) {
  const [notiOpen, setNotiOpen] = useState(false)
  const [localNotifications, setLocalNotifications] = useState<TeamNotification[]>(() => readStoredTeamNotifications(workspaceId))
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => readTeamNotificationIds(workspaceId))
  const dashboard = data.dashboard
  const workspaceName = dashboard?.name ?? '팀 프로젝트 워크스페이스'
  const learners = membersOnly(data)
  const pendingMilestones = data.milestones.filter((item) => item.status !== 'COMPLETED').length
  const unanswered = data.questions.filter((question) => !isAnswered(question)).length
  const notifications = useMemo(() => buildTeamNotifications(data, workspaceId, localNotifications), [data, workspaceId, localNotifications])
  const unreadNotificationIds = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).map((notification) => notification.id)

  useEffect(() => {
    setLocalNotifications(readStoredTeamNotifications(workspaceId))
    setReadNotificationIds(readTeamNotificationIds(workspaceId))
  }, [workspaceId])

  useEffect(() => {
    function handleNotification(event: Event) {
      const detail = (event as CustomEvent<{ workspaceId: number; notification: TeamNotification }>).detail
      if (!detail || detail.workspaceId !== workspaceId) return
      setLocalNotifications((current) => [detail.notification, ...current.filter((item) => item.id !== detail.notification.id)].slice(0, MAX_TEAM_NOTIFICATIONS))
    }
    window.addEventListener(TEAM_NOTIFICATION_EVENT, handleNotification)
    return () => window.removeEventListener(TEAM_NOTIFICATION_EVENT, handleNotification)
  }, [workspaceId])

  function markNotificationsRead(ids: string[]) {
    if (!workspaceId || ids.length === 0) return
    setReadNotificationIds((current) => {
      const next = [...new Set([...current, ...ids])]
      writeTeamNotificationIds(workspaceId, next)
      return next
    })
  }

  function toggleNotifications() {
    setNotiOpen((current) => {
      const next = !current
      if (next) markNotificationsRead(notifications.map((notification) => notification.id))
      return next
    })
  }

  return (
    <div className="instructor-team-ws-page flex h-screen overflow-hidden bg-[#F3F4F6] font-['Pretendard'] text-gray-800" onClick={() => setNotiOpen(false)}>
      <aside className="group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64">
        <a href="/instructor-mentoring" className="flex h-20 shrink-0 items-center border-b border-gray-100 px-5 transition hover:bg-gray-50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white shadow-md"><i className="fas fa-arrow-left" /></div>
          <div className="sidebar-text flex flex-col">
            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">강사 센터로 복귀</p>
            <p className="w-36 truncate font-bold text-gray-900">{workspaceName}</p>
          </div>
        </a>

        <nav className="custom-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="sidebar-section-title px-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">{section.title}</p>
              {section.pages.map((item) => {
                const config = PAGE_CONFIG[item]
                const active = item === page
                const count = item === 'milestone' ? pendingMilestones : item === 'qna' ? unanswered : 0
                return (
                  <a key={item} href={buildHref(item, workspaceId)} className={`nav-item ${active ? 'active' : ''}`}>
                    <div className="relative w-6 text-center text-lg">
                      <i className={config.icon} />
                      {count > 0 ? <span className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full border border-white bg-red-500" /> : null}
                    </div>
                    <span className="sidebar-text flex-1">
                      {config.label}
                      {count > 0 ? <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600">{count}</span> : null}
                    </span>
                  </a>
                )
              })}
              {section.title !== 'Resources & Live' ? <div className="mx-2 my-4 h-px bg-gray-100" /> : null}
            </div>
          ))}
        </nav>

        <div className="flex items-center border-t border-gray-100 p-4">
          <img src={dashboard?.ownerProfileImage ?? avatarUrl(dashboard?.ownerName)} className="h-10 w-10 shrink-0 rounded-full border-2 border-[#7C3AED] bg-white shadow-sm" alt="" />
          <div className="sidebar-text">
            <p className="text-sm font-bold text-gray-900">{dashboard?.ownerName ?? '강사'}</p>
            <p className="mt-0.5 inline-block rounded bg-[#7C3AED] px-1.5 py-0.5 text-[10px] font-bold text-white">Instructor (PM)</p>
          </div>
        </div>
      </aside>

      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        <header className="relative z-30 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white px-8 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3 font-bold text-gray-800">
            <span className="rounded-md bg-gray-900 px-2 py-1 text-[10px] tracking-wider text-white">ADMIN</span>
            <span className="truncate">{workspaceName}</span>
            <span className="shrink-0 rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]"><i className="fas fa-puzzle-piece mr-1" />팀 프로젝트형</span>
          </div>
          <div className="relative flex items-center gap-4">
            <div className="mr-2 flex items-center gap-2 border-r border-gray-200 pr-4">
              <span className="text-[10px] font-bold text-gray-500">담당 팀원 ({learners.length}명)</span>
              <div className="flex -space-x-2">
                {learners.slice(0, 5).map((member) => <img key={member.memberId} src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-8 w-8 rounded-full border-2 border-white bg-blue-50" title={member.learnerName ?? '팀원'} alt="" />)}
                {learners.length === 0 ? <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400"><i className="fas fa-plus text-xs" /></div> : null}
              </div>
            </div>
            <button type="button" className="relative p-2 text-gray-400 transition hover:text-[#7C3AED]" onClick={(event) => { event.stopPropagation(); toggleNotifications() }}>
              <i className="far fa-bell text-lg" />
              {unreadNotificationIds.length > 0 ? <span className="absolute top-1 right-1 h-2 w-2 rounded-full border border-white bg-red-500" /> : null}
            </button>
            {notiOpen ? (
              <div className="absolute top-12 right-0 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-gray-50 p-4">
                  <h3 className="text-sm font-bold">알림</h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">최근 {notifications.length}개</span>
                </div>
                <div className="custom-scrollbar max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="flex flex-col items-center p-8 text-center text-xs text-gray-400"><i className="far fa-bell-slash mb-2 text-2xl text-gray-300" />새로운 알림이 없습니다.</p>
                  ) : notifications.map((notification) => (
                    <a key={notification.id} href={notification.href} onClick={() => markNotificationsRead([notification.id])} className="flex gap-3 border-b border-gray-50 p-3 transition hover:bg-gray-50">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs text-[#7C3AED]"><i className={notification.icon} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <strong className="truncate text-xs text-gray-900">{notification.title}</strong>
                          {!readNotificationIds.includes(notification.id) ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" /> : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-gray-500">{notification.description}</span>
                        <span className="mt-1 inline-block text-[10px] font-bold text-[#7C3AED]">{relativeTime(notification.createdAt)}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </header>
        <div className={`custom-scrollbar flex-1 ${page === 'schedule' ? 'overflow-hidden p-5' : page === 'kanban' || page === 'architecture' ? 'overflow-hidden' : 'overflow-y-auto p-8'}`}>
          <div className={`mx-auto ${page === 'schedule' ? 'flex h-full max-w-6xl flex-col' : page === 'kanban' || page === 'architecture' ? 'h-full max-w-none' : page === 'qna' ? 'flex h-full max-w-5xl flex-col' : page === 'files' ? 'flex h-full max-w-6xl flex-col' : page === 'meeting' ? 'max-w-6xl space-y-8' : 'max-w-7xl space-y-6'}`}>{children}</div>
        </div>
      </main>
    </div>
  )
}

function PageHeading({ page, description, action }: { page: InstructorTeamWsPage; description: ReactNode; action?: ReactNode }) {
  const config = PAGE_CONFIG[page]
  return (
    <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className={`${config.icon} text-[#7C3AED]`} />{config.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

function StatCard({ icon, label, value, suffix, tone = 'text-[#7C3AED]', onClick }: { icon: string; label: string; value: string | number; suffix?: string; tone?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition ${onClick ? 'hover:-translate-y-0.5 hover:border-purple-200' : ''}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-50 text-xl ${tone}`}><i className={icon} /></div>
      <div><p className="mb-0.5 text-[10px] font-extrabold text-gray-400">{label}</p><p className="text-2xl font-black text-gray-900">{value}<span className="ml-1 text-sm font-medium text-gray-500">{suffix}</span></p></div>
    </button>
  )
}

function DashboardPage({ data, workspaceId }: { data: TeamData; workspaceId: number | null }) {
  const learners = membersOnly(data)
  const activeMilestone = data.milestones.find((item) => item.status === 'ACTIVE' || item.status === 'OPEN') ?? null
  const doneMembers = new Set(data.tasks.filter((task) => task.status === 'DONE' && task.assigneeId).map((task) => task.assigneeId))
  const milestoneProgress = learners.length ? Math.round((doneMembers.size / learners.length) * 100) : 0
  const overdue = data.tasks.filter((task) => task.status !== 'DONE' && task.dueDate && new Date(task.dueDate) < new Date()).length
  const health = learners.length === 0 ? { label: '분석 대기', color: 'text-gray-400', desc: '아직 수집된 프로젝트 활동 데이터가 없습니다.' } : overdue > 0 ? { label: '주의', color: 'text-red-500', desc: '일부 팀원의 작업이 지연되고 있습니다. 마일스톤 피드백이 필요합니다.' } : { label: '양호', color: 'text-green-500', desc: '팀 작업 흐름이 안정적으로 유지되고 있습니다.' }
  const unanswered = data.questions.filter((question) => !isAnswered(question)).length
  const latestTaskByMember = new Map<number, WorkspaceTask>()
  data.tasks.forEach((task) => { if (task.assigneeId && !latestTaskByMember.has(task.assigneeId)) latestTaskByMember.set(task.assigneeId, task) })
  const actions = [
    ...data.tasks.filter((task) => task.status === 'IN_REVIEW').slice(0, 3).map((task) => ({ title: '마일스톤 제출 리뷰하기', detail: task.title, href: buildHref('milestone', workspaceId) })),
    ...data.questions.filter((question) => !isAnswered(question)).slice(0, 2).map((question) => ({ title: `${question.authorName ?? '팀원'} Q&A 답변하기`, detail: question.title, href: buildHref('qna', workspaceId) })),
  ].slice(0, 4)

  return (
    <>
      <PageHeading page="dashboard" description="팀 프로젝트 진행 현황, 직군별 작업, 강사 액션을 한 화면에서 모니터링하세요." />
      <section className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:flex-row">
        <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#7C3AED] opacity-5 blur-3xl" />
        <div className="relative z-10 flex flex-1 items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-purple-100 bg-purple-50 text-[#7C3AED]"><i className="fas fa-heartbeat text-3xl" /></div>
          <div>
            <h2 className="mb-1 text-xl font-extrabold text-gray-900">현재 팀 프로젝트 건강도: <span className={health.color}>{health.label}</span></h2>
            <p className="text-xs text-gray-400">{health.desc}</p>
          </div>
        </div>
        <div className="relative z-10 w-full rounded-2xl border border-gray-100 bg-gray-50 p-5 md:w-80">
          <div className="mb-2 flex items-end justify-between">
            <div><p className="text-[10px] font-bold text-gray-400">이번 주 목표 달성률</p><p className="text-sm font-extrabold text-gray-900">{activeMilestone?.title ?? '설정된 마일스톤 없음'}</p></div>
            <span className="text-sm font-extrabold text-[#7C3AED]">{milestoneProgress}% ({doneMembers.size}/{learners.length}명)</span>
          </div>
          <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-2 bg-[#7C3AED] transition-all" style={{ width: `${milestoneProgress}%` }} /></div>
          <a href={buildHref('milestone', workspaceId)} className="block w-full rounded-lg border border-gray-200 bg-white py-2 text-center text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">팀원별 제출 현황 및 피드백 작성</a>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon="fas fa-users" label="담당 팀원" value={learners.length} suffix="명" tone="text-blue-500" />
        <StatCard icon="fas fa-flag-checkered" label="진행 마일스톤" value={data.milestones.filter((item) => item.status !== 'COMPLETED').length} suffix="개" tone="text-[#7C3AED]" />
        <StatCard icon="fas fa-code-branch" label="리뷰 대기 작업" value={data.tasks.filter((task) => task.status === 'IN_REVIEW').length} suffix="건" tone="text-yellow-500" />
        <StatCard icon="fas fa-question-circle" label="미답변 Q&A" value={unanswered} suffix="건" tone="text-red-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 border-b border-gray-50 pb-3 font-extrabold text-gray-900"><i className="fas fa-search-location text-gray-400" />직군별 작업 모니터링</h3>
            {learners.length === 0 || data.tasks.length === 0 ? (
              <EmptyPanel icon="fas fa-tasks" title="모니터링할 작업 내역이 없습니다." description="팀원들이 칸반 보드에 카드를 등록하거나 개발 작업을 시작하면 직군 현황이 여기에 요약됩니다." action={<a href={buildHref('kanban', workspaceId)} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white">팀 칸반 보드 확인하기</a>} />
            ) : (
              <div className="space-y-4">
                {learners.map((member) => {
                  const task = latestTaskByMember.get(member.learnerId)
                  const meta = task ? taskStatusMeta(task.status) : null
                  const roleLabel = member.roleLabel ?? shortRoleLabel(member.position)
                  return (
                    <div key={member.memberId} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-4">
                        <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-10 w-10 rounded-full border border-gray-200 bg-white" alt="" />
                        <div>
                          <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <span>{member.learnerName ?? '팀원'}</span>
                            {roleLabel ? <span title={member.position ?? roleLabel} className="rounded-md bg-gray-900 px-1.5 py-0.5 text-[10px] font-extrabold text-white">{roleLabel}</span> : null}
                          </p>
                          <p className="text-[10px] text-gray-500">{task?.title ?? '진행 중인 작업 없음'}</p>
                        </div>
                      </div>
                      {meta ? <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${meta.badge}`}>{meta.label}</span> : <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-400">대기</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <ActivityLogPanel logs={data.activityLogs} />
        </section>
        <aside className="space-y-6">
          <div className={`rounded-2xl border p-6 shadow-sm ${actions.length ? 'border-purple-100 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
            <h3 className={`mb-4 flex items-center gap-2 text-sm font-extrabold ${actions.length ? 'text-[#7C3AED]' : 'text-gray-500'}`}><i className={actions.length ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} />강사 Action Required</h3>
            {actions.length ? <div className="space-y-3">{actions.map((item, index) => <a key={index} href={item.href} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm transition hover:border-[#7C3AED]"><span><b className="block text-gray-900">{item.title}</b><span className="text-[10px] text-gray-500">{item.detail}</span></span><i className="fas fa-chevron-right text-gray-300" /></a>)}</div> : <EmptyPanel icon="fas fa-smile-beam" title="대기 중인 요청 없음" description="현재 즉시 검토하거나 답변해야 할 항목이 없습니다." />}
          </div>
          <ScheduleSummary events={data.events} workspaceId={workspaceId} />
        </aside>
      </div>
    </>
  )
}

function ActivityLogPanel({ logs }: { logs: ActivityLogItem[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-history text-gray-400" />팀 주요 활동 로그</h3>
      {logs.length === 0 ? <EmptyPanel icon="fas fa-stream" title="최근 활동 로그가 없습니다." description="워크스페이스에서 발생한 팀 활동이 이곳에 표시됩니다." /> : (
        <div className="space-y-4">{logs.slice(0, 6).map((log) => <div key={log.logId} className="flex items-start gap-4"><div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-500"><i className="fas fa-file-alt" /></div><div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="mb-1 flex justify-between"><p className="text-xs font-bold text-gray-900"><span className="text-purple-600">{log.actorName ?? '시스템'}</span> {log.targetTitle ?? log.actionType ?? log.activityType}</p><span className="text-[10px] text-gray-400">{relativeTime(log.createdAt)}</span></div>{log.description ? <p className="text-[11px] text-gray-500">{log.description}</p> : null}</div></div>)}</div>
      )}
    </div>
  )
}

function ScheduleSummary({ events, workspaceId }: { events: CalendarEvent[]; workspaceId: number | null }) {
  const upcoming = [...events].filter((event) => new Date(event.startAt).getTime() >= Date.now() - 86400000).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).slice(0, 3)
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="far fa-calendar-check text-gray-400" />팀 공식 & 스크럼 일정</h3><a href={buildHref('schedule', workspaceId)} className="text-[10px] text-gray-400 hover:text-[#7C3AED]"><i className="fas fa-external-link-alt" /></a></div>
      {upcoming.length === 0 ? <EmptyPanel icon="far fa-calendar-plus" title="다가오는 일정이 없습니다." description="라이브 멘토링이나 코드 리뷰 일정을 추가해보세요." /> : <div className="mb-4 space-y-3">{upcoming.map((event) => <article key={event.eventId} className="rounded-xl border border-purple-100 bg-purple-50 p-3"><p className="text-xs font-bold text-gray-900">{event.title}</p><p className="mt-1 text-[10px] text-gray-500">{formatDate(event.startAt)} {formatTime(event.startAt)}</p></article>)}</div>}
      <a href={buildHref('meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-video" />호스트로 밋업 시작하기</a>
    </div>
  )
}

const MILESTONE_GUIDE_MARKER = '\n\n---DEVPATH_TEAM_GUIDELINES---\n'

type MilestoneGuide = {
  frontend: string
  backend: string
  design: string
}

type MilestoneWeek = {
  week: number
  milestone: MilestoneItem | null
  title: string
  description: string
  guide: MilestoneGuide
  isCurrent: boolean
}

type MilestoneStudent = {
  member: WorkspaceMember
  task: WorkspaceTask | null
  status: 'pass' | 'wait' | 'fail' | 'none'
}

function MilestonePage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const learners = membersOnly(data)
  const weeks = useMemo(() => buildMilestoneWeeks(data.milestones), [data.milestones])
  const firstActiveWeek = weeks.find((week) => week.isCurrent)?.week ?? 1
  const [currentWeek, setCurrentWeek] = useState(firstActiveWeek)
  const [selectedLearnerId, setSelectedLearnerId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const selectedWeek = weeks.find((week) => week.week === currentWeek) ?? weeks[0]
  const students = useMemo(() => buildMilestoneStudents(learners, data.tasks), [learners, data.tasks])
  const selectedStudent = students.find((student) => student.member.learnerId === selectedLearnerId) ?? null

  function switchWeek(week: number) {
    setCurrentWeek(week)
    setSelectedLearnerId(null)
    setFeedbackText('')
  }

  async function saveMilestone(form: { title: string; description: string; guide: MilestoneGuide }) {
    if (!workspaceId || !form.title.trim()) return
    const description = buildMilestoneDescription(form.description, form.guide)
    const startDate = selectedWeek.milestone?.startDate ?? defaultMilestoneDate(currentWeek, 0)
    const dueDate = selectedWeek.milestone?.dueDate ?? defaultMilestoneDate(currentWeek, 6)
    if (selectedWeek.milestone) {
      await updateInstructorTeamMilestone(selectedWeek.milestone.milestoneId, {
        title: form.title,
        description,
        startDate,
        dueDate,
        status: normalizeMilestoneStatus(selectedWeek.milestone.status),
      })
    } else {
      await createInstructorTeamMilestone(workspaceId, { title: form.title, description, startDate, dueDate })
    }
    pushTeamNotification(workspaceId, {
      title: selectedWeek.milestone ? '마일스톤 가이드 수정' : '마일스톤 가이드 등록',
      description: `${currentWeek}주차 "${form.title}" 기준이 저장되었습니다.`,
      href: buildHref('milestone', workspaceId),
      icon: 'fas fa-flag-checkered',
    })
    setModalOpen(false)
    setSuccessOpen(true)
    await reload()
  }

  async function setEvaluation(status: 'wait' | 'pass' | 'fail') {
    if (!workspaceId || !selectedStudent?.task) return
    const nextStatus = status === 'pass' ? 'DONE' : status === 'wait' ? 'IN_REVIEW' : 'TODO'
    await updateInstructorTeamTaskStatus(workspaceId, selectedStudent.task.taskId, nextStatus)
    pushTeamNotification(workspaceId, {
      title: '과제 평가 변경',
      description: `${selectedStudent.member.learnerName ?? '팀원'}님의 "${selectedStudent.task.title}" 과제를 ${taskStatusMeta(nextStatus).label} 처리했습니다.`,
      href: buildHref('milestone', workspaceId),
      icon: 'fas fa-clipboard-check',
    })
    await reload()
  }

  function sendFeedback() {
    if (!selectedStudent || !feedbackText.trim()) return
    setFeedbackText('')
  }

  return (
    <div className="instructor-team-milestone flex h-full w-full flex-col font-['Pretendard'] text-[14px] leading-normal">
      <div className="mb-6 flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-flag-checkered text-[#7C3AED]" /> 마일스톤 및 피드백 관리</h1>
          <p className="mt-2 text-sm text-gray-500">팀의 주차별 목표와 직군 가이드라인을 설정하고, 팀원들의 산출물을 평가하세요.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="itw-top-action flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"><i className="fas fa-edit" />이번 주 가이드라인 편집</button>
      </div>

      <div className="custom-scrollbar mb-6 flex shrink-0 items-center gap-3 overflow-x-auto pb-2">
        {weeks.map((week) => (
          <button key={week.week} type="button" onClick={() => switchWeek(week.week)} className={`itw-week-tab relative flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm transition ${week.week === currentWeek ? 'border-gray-900 bg-gray-900 font-bold text-white' : week.isCurrent ? 'border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-100' : 'border-gray-200 bg-gray-50 font-bold text-gray-400 hover:bg-gray-100'}`}>
            Week {week.week}{week.isCurrent ? <span className="ml-2 h-2 w-2 rounded-full bg-red-500" /> : null}
          </button>
        ))}
      </div>

      <section className="group relative mb-6 min-h-[160px] shrink-0 overflow-hidden rounded-2xl bg-gray-900 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#7C3AED] opacity-20 blur-3xl" />
        <button type="button" onClick={() => setModalOpen(true)} title="수정하기" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 opacity-0 transition hover:bg-white/20 group-hover:opacity-100"><i className="fas fa-pen text-xs" /></button>
        {selectedWeek.title ? (
          <div className="relative z-10">
            <span className="mb-3 inline-block rounded bg-[#7C3AED] px-2 py-1 text-[10px] font-extrabold text-white shadow-sm">TEAM MILESTONE (WEEK {selectedWeek.week})</span>
            <h2 className="mb-2 text-xl font-black">{selectedWeek.title}</h2>
            <p className="mb-5 max-w-3xl text-sm leading-relaxed text-gray-300">{selectedWeek.description || '이번 주차에 팀원들이 달성해야 할 목표를 설정하세요.'}</p>
            <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-800 p-4">
              <h4 className="mb-2 border-b border-gray-700 pb-2 text-xs font-bold text-gray-400">내가 작성한 직군별 미션 가이드</h4>
              <MilestoneGuideRow color="blue" label="Frontend" text={selectedWeek.guide.frontend} />
              <MilestoneGuideRow color="purple" label="Backend" text={selectedWeek.guide.backend} />
              <MilestoneGuideRow color="pink" label="Designer" text={selectedWeek.guide.design} />
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 shadow-inner"><i className="fas fa-flag text-xl text-gray-500" /></div>
            <h2 className="mb-2 text-lg font-bold text-white">아직 마일스톤이 설정되지 않았습니다.</h2>
            <p className="mb-5 text-sm text-gray-400">이번 주차의 목표와 직군별 가이드라인을 팀원들에게 제시해주세요.</p>
            <button type="button" onClick={() => setModalOpen(true)} className="itw-top-action flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-600"><i className="fas fa-plus" />마일스톤 작성하기</button>
          </div>
        )}
      </section>

      <div className="grid min-h-[500px] flex-1 grid-cols-1 gap-6 pb-10 lg:grid-cols-12">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-users text-gray-400" /> 제출 목록</h3>
            <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">총 {students.length}명</span>
          </div>
          <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto">
            {students.length === 0 ? <EmptyPanel icon="fas fa-users" title="팀원이 없습니다." description="승인된 학습자가 생기면 제출 목록에 표시됩니다." /> : students.map((student) => {
              const role = student.member.roleLabel ?? shortRoleLabel(student.member.position)
              const active = student.member.learnerId === selectedLearnerId
              const status = milestoneStudentStatusMeta(student.status)
              return (
                <button key={student.member.memberId} type="button" onClick={() => setSelectedLearnerId(student.member.learnerId)} className={`flex flex-col gap-2 border-b border-gray-50 border-l-4 p-4 text-left transition hover:bg-gray-50 ${active ? 'border-l-[#7C3AED] bg-[#EDE9FE]' : status.border}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img src={student.member.profileImage ?? avatarUrl(student.member.learnerName)} className="h-8 w-8 rounded-full border border-gray-200 bg-white" alt="" />
                      <p className="flex items-center gap-1 text-xs font-bold text-gray-900">{student.member.learnerName ?? '팀원'}{role ? <span className={`rounded border px-1 text-[8px] ${roleBadgeTone(role)}`}>{role}</span> : null}</p>
                    </div>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${status.badge}`}>{status.label}</span>
                  </div>
                  <p className={`w-full truncate rounded border border-gray-100 p-1 text-[10px] ${student.task ? 'bg-white text-gray-500' : 'bg-gray-50 italic text-gray-400'}`}>{student.task?.title ?? '제출된 산출물이 없습니다.'}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-9">
          {!selectedStudent ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <i className="fas fa-mouse-pointer mb-4 text-4xl text-gray-300" />
              <p className="text-sm font-bold">좌측에서 피드백을 남길 팀원을 선택해주세요.</p>
            </div>
          ) : null}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white p-5">
            <div className="flex items-center gap-4">
              <img src={selectedStudent?.member.profileImage ?? avatarUrl(selectedStudent?.member.learnerName)} className="h-12 w-12 rounded-full border-2 border-gray-100 bg-gray-50 shadow-sm" alt="" />
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-gray-900">{selectedStudent?.member.learnerName ?? '-'}</h3>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-extrabold ${roleBadgeTone(selectedStudent?.member.roleLabel ?? selectedStudent?.member.position)}`}>{selectedStudent ? selectedStudent.member.roleLabel ?? shortRoleLabel(selectedStudent.member.position) ?? '-' : '-'}</span>
                </div>
                <div className="flex items-center gap-2">{selectedStudent?.task ? <><span className="max-w-[400px] truncate rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-bold text-gray-600">{selectedStudent.task.title}</span><span className="text-[11px] font-bold text-blue-600"><i className="fas fa-external-link-alt mr-1" />링크 열기</span></> : <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">아직 과제를 제출하지 않았습니다.</span>}</div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <span className="text-right text-[10px] font-bold text-gray-400">해당 주차 과제 평가</span>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                <button type="button" onClick={() => void setEvaluation('wait')} disabled={!selectedStudent?.task} className={`itw-eval-button rounded-md px-4 py-2 text-xs font-bold transition focus:outline-none ${selectedStudent?.status === 'wait' || selectedStudent?.status === 'none' ? 'border border-gray-200 bg-white text-gray-700' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}>검토중</button>
                <button type="button" onClick={() => void setEvaluation('pass')} disabled={!selectedStudent?.task} className={`itw-eval-button rounded-md px-4 py-2 text-xs font-bold transition focus:outline-none ${selectedStudent?.status === 'pass' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 hover:text-green-600'}`}><i className="fas fa-check mr-0.5" />Pass</button>
                <button type="button" onClick={() => void setEvaluation('fail')} disabled={!selectedStudent?.task} className={`itw-eval-button rounded-md px-4 py-2 text-xs font-bold transition focus:outline-none ${selectedStudent?.status === 'fail' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 hover:text-red-500'}`}>재제출</button>
              </div>
            </div>
          </div>
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-gray-50/30 p-6">
            <div className="flex h-full flex-col items-center justify-center text-gray-400">
              <i className="far fa-comments mb-3 text-3xl text-gray-300" />
              <p className="text-sm font-bold">주고받은 피드백 내역이 없습니다.</p>
              <p className="mt-1 text-xs">하단 입력창을 통해 첫 피드백을 남겨보세요.</p>
            </div>
          </div>
          <div className="shrink-0 border-t border-gray-100 bg-white p-4">
            <div className="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 shadow-sm transition focus-within:border-[#7C3AED] focus-within:bg-white">
              <textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} disabled={!selectedStudent} className="custom-scrollbar h-20 flex-1 resize-none border-none bg-transparent p-3 text-sm leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-50" placeholder="마크다운을 지원합니다. 코드 리뷰 내용이나 수정 요청 사항을 상세히 적어주세요." />
              <div className="flex flex-col justify-end">
                <button type="button" onClick={sendFeedback} disabled={!selectedStudent || !feedbackText.trim()} className="itw-send-button flex w-20 items-center justify-center gap-1 rounded-lg bg-gray-900 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"><i className="fas fa-paper-plane" />전송</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {modalOpen ? <MilestoneEditModal week={selectedWeek} onClose={() => setModalOpen(false)} onSubmit={saveMilestone} /> : null}
      {successOpen ? <MilestoneSuccessModal onClose={() => setSuccessOpen(false)} /> : null}
    </div>
  )
}

function MilestoneGuideRow({ color, label, text }: { color: 'blue' | 'purple' | 'pink'; label: string; text: string }) {
  const colorClass = color === 'blue' ? 'border-blue-500/50 bg-blue-500/20 text-blue-300' : color === 'purple' ? 'border-purple-500/50 bg-purple-500/20 text-purple-300' : 'border-pink-500/50 bg-pink-500/20 text-pink-300'
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 w-16 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] font-extrabold ${colorClass}`}>{label}</span>
      <p className="text-sm font-medium text-gray-200">{text || '아직 가이드라인이 입력되지 않았습니다.'}</p>
    </div>
  )
}

function MilestoneEditModal({ week, onClose, onSubmit }: { week: MilestoneWeek; onClose: () => void; onSubmit: (form: { title: string; description: string; guide: MilestoneGuide }) => Promise<void> }) {
  const [form, setForm] = useState({ title: week.title, description: week.description, guide: week.guide })
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-edit text-[#7C3AED]" />Week {week.week} 마일스톤 설정</h3>
          <button type="button" onClick={onClose} className="itw-icon-button flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">마일스톤 목표 (제목) <span className="text-red-500">*</span></span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="예: 핵심 기능 MVP 개발" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" /></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">목표 상세 설명</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="이번 주차에 팀원들이 달성해야 할 목표를 자세히 적어주세요." className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED]" /></label>
          <div className="border-t border-gray-200 pt-5">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-tasks text-[#7C3AED]" />직군별 상세 가이드라인 할당</h4>
            <div className="space-y-4">
              <MilestoneGuideInput color="blue" label="Frontend" value={form.guide.frontend} placeholder="프론트엔드 직무가 수행해야 할 상세 가이드를 적어주세요." onChange={(value) => setForm({ ...form, guide: { ...form.guide, frontend: value } })} />
              <MilestoneGuideInput color="purple" label="Backend" value={form.guide.backend} placeholder="백엔드 직무가 수행해야 할 상세 가이드를 적어주세요." onChange={(value) => setForm({ ...form, guide: { ...form.guide, backend: value } })} />
              <MilestoneGuideInput color="pink" label="Designer" value={form.guide.design} placeholder="디자인 또는 기획 직무가 수행해야 할 상세 가이드를 적어주세요." onChange={(value) => setForm({ ...form, guide: { ...form.guide, design: value } })} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="itw-modal-button rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
          <button type="submit" disabled={saving} className="itw-modal-button flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-50"><i className="fas fa-save" />{saving ? '저장 중' : '팀원들에게 배포'}</button>
        </div>
      </form>
    </div>
  )
}

function MilestoneGuideInput({ color, label, value, placeholder, onChange }: { color: 'blue' | 'purple' | 'pink'; label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  const tone = color === 'blue' ? { box: 'border-blue-100 bg-blue-50/50', badge: 'bg-blue-500', input: 'border-blue-200 focus:border-blue-500' } : color === 'purple' ? { box: 'border-purple-100 bg-purple-50/50', badge: 'bg-purple-500', input: 'border-purple-200 focus:border-purple-500' } : { box: 'border-pink-100 bg-pink-50/50', badge: 'bg-pink-500', input: 'border-pink-200 focus:border-pink-500' }
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${tone.box}`}>
      <span className={`mt-1 w-16 shrink-0 rounded px-2 py-1 text-center text-[10px] font-extrabold text-white shadow-sm ${tone.badge}`}>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`h-20 flex-1 resize-none rounded-lg border bg-white p-3 text-sm outline-none ${tone.input}`} />
    </div>
  )
}

function MilestoneSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 shadow-sm"><i className="fas fa-check text-3xl text-[#7C3AED]" /></div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">저장 완료!</h3>
        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">가이드라인이 성공적으로 저장되어 팀원들에게 배포되었습니다.</p>
        <button type="button" onClick={onClose} className="itw-confirm-button w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}

function buildMilestoneWeeks(milestones: MilestoneItem[]): MilestoneWeek[] {
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

function parseMilestoneDescription(value?: string | null): { description: string; guide: MilestoneGuide } {
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

function buildMilestoneDescription(description: string, guide: MilestoneGuide) {
  return `${description.trim()}${MILESTONE_GUIDE_MARKER}Frontend: ${guide.frontend.trim()}\nBackend: ${guide.backend.trim()}\nDesigner: ${guide.design.trim()}`
}

function defaultMilestoneDate(week: number, offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + (week - 1) * 7 + offset)
  return date.toISOString().slice(0, 10)
}

function normalizeMilestoneStatus(status: string) {
  if (status === 'COMPLETED') return 'DONE'
  if (status === 'ACTIVE' || status === 'OVERDUE') return 'IN_PROGRESS'
  return ['OPEN', 'IN_PROGRESS', 'DONE', 'CLOSED'].includes(status) ? status : 'OPEN'
}

function buildMilestoneStudents(members: WorkspaceMember[], tasks: WorkspaceTask[]): MilestoneStudent[] {
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

function taskToMilestoneStudentStatus(status: TaskStatus): MilestoneStudent['status'] {
  if (status === 'DONE') return 'pass'
  if (status === 'IN_REVIEW') return 'wait'
  if (status === 'TODO') return 'fail'
  return 'none'
}

function milestoneStudentStatusMeta(status: MilestoneStudent['status']) {
  if (status === 'pass') return { label: 'Pass', badge: 'bg-green-50 text-green-600', border: 'border-l-green-400' }
  if (status === 'wait') return { label: '리뷰 대기', badge: 'border border-yellow-200 bg-yellow-50 text-yellow-600', border: 'border-l-yellow-400' }
  if (status === 'fail') return { label: '재제출 요망', badge: 'bg-red-50 text-red-600', border: 'border-l-red-400' }
  return { label: '미제출', badge: 'bg-gray-100 text-gray-400', border: 'border-l-transparent' }
}

function roleBadgeTone(role?: string | null) {
  const normalized = role?.toLowerCase() ?? ''
  if (normalized.includes('fe') || normalized.includes('front')) return 'border-blue-100 bg-blue-50 text-blue-600'
  if (normalized.includes('be') || normalized.includes('back')) return 'border-purple-100 bg-purple-50 text-purple-600'
  if (normalized.includes('design') || normalized.includes('des') || normalized.includes('디자')) return 'border-pink-100 bg-pink-50 text-pink-600'
  return 'border-gray-200 bg-gray-50 text-gray-500'
}

type KanbanFilter = 'all' | 'fe' | 'be' | 'design'

const KANBAN_ROLE_MARKER = '\n\n---DEVPATH_KANBAN_ROLE---\n'

const KANBAN_COLUMNS: Array<{
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

function kanbanRoleKey(value?: string | null): KanbanFilter | 'common' {
  const normalized = (value ?? '').toLowerCase()
  if (normalized.includes('front') || normalized.includes('fe') || normalized.includes('프론트')) return 'fe'
  if (normalized.includes('back') || normalized.includes('be') || normalized.includes('백엔드')) return 'be'
  if (normalized.includes('design') || normalized.includes('des') || normalized.includes('디자') || normalized.includes('ux')) return 'design'
  return 'common'
}

function parseKanbanDescription(value?: string | null) {
  const [description, meta] = (value ?? '').split(KANBAN_ROLE_MARKER)
  const role = meta?.match(/role:\s*(fe|be|design|common)/i)?.[1] as KanbanFilter | 'common' | undefined
  return { description: description.trim(), role }
}

function buildKanbanDescription(description: string, role: KanbanFilter | 'common') {
  return `${description.trim()}${KANBAN_ROLE_MARKER}role: ${role}`
}

function kanbanTaskRole(task: WorkspaceTask, members: WorkspaceMember[]): KanbanFilter | 'common' {
  const parsed = parseKanbanDescription(task.description)
  if (parsed.role) return parsed.role
  const assignee = members.find((member) => member.learnerId === task.assigneeId)
  const memberRole = kanbanRoleKey(`${assignee?.roleLabel ?? ''} ${assignee?.position ?? ''}`)
  if (memberRole !== 'common') return memberRole
  return kanbanRoleKey(`${task.title} ${task.description ?? ''}`)
}

function kanbanRoleMeta(role: KanbanFilter | 'common') {
  if (role === 'fe') return { label: 'Frontend', badge: 'border-blue-200 bg-blue-50 text-blue-600', prefix: 'FE' }
  if (role === 'be') return { label: 'Backend', badge: 'border-purple-200 bg-purple-50 text-purple-600', prefix: 'BE' }
  if (role === 'design') return { label: 'Designer', badge: 'border-pink-200 bg-pink-50 text-pink-600', prefix: 'UX' }
  return { label: 'Common', badge: 'border-gray-200 bg-gray-50 text-gray-500', prefix: 'TK' }
}

function kanbanPriorityMeta(priority?: TaskPriority | null) {
  if (priority === 'HIGH') return { label: '긴급', className: 'bg-red-50 text-red-500', icon: 'fas fa-fire mr-0.5' }
  if (priority === 'LOW') return { label: '낮음', className: 'bg-gray-100 text-gray-400', icon: '' }
  return { label: '보통', className: 'bg-orange-50 text-orange-500', icon: '' }
}

function KanbanPage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const members = membersOnly(data)
  const [modalTask, setModalTask] = useState<WorkspaceTask | null | 'new'>(null)
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<KanbanFilter>('all')

  const visibleTasks = data.tasks.filter((task) => {
    const role = kanbanTaskRole(task, members)
    const assignee = members.find((member) => member.learnerId === task.assigneeId)
    const haystack = `${task.title} ${parseKanbanDescription(task.description).description} ${assignee?.learnerName ?? ''}`.toLowerCase()
    const keywordMatched = !keyword.trim() || haystack.includes(keyword.trim().toLowerCase())
    const roleMatched = filter === 'all' || role === filter
    return keywordMatched && roleMatched
  })

  async function saveTask(form: { title: string; description: string; priority: TaskPriority; assigneeId: string; dueDate: string; role: KanbanFilter | 'common' }) {
    if (!workspaceId || !form.title.trim()) return
    const payload = { title: form.title, description: buildKanbanDescription(form.description, form.role), priority: form.priority, dueDate: form.dueDate || null, assigneeId: form.assigneeId ? Number(form.assigneeId) : null }
    const editing = Boolean(modalTask && modalTask !== 'new')
    if (modalTask && modalTask !== 'new') {
      await updateInstructorTeamTask(workspaceId, modalTask.taskId, payload)
      await updateInstructorTeamTaskAssignee(workspaceId, modalTask.taskId, payload.assigneeId)
    } else {
      await createInstructorTeamTask(workspaceId, payload)
    }
    pushTeamNotification(workspaceId, {
      title: editing ? '칸반 티켓 수정' : '칸반 티켓 추가',
      description: `"${form.title}" 티켓이 ${editing ? '수정' : '추가'}되었습니다.`,
      href: buildHref('kanban', workspaceId),
      icon: 'fas fa-columns',
    })
    setModalTask(null)
    await reload()
  }

  async function deleteTask(task: WorkspaceTask) {
    if (!workspaceId || !window.confirm('이 티켓을 강제로 삭제하시겠습니까? (팀원 칸반 보드에서도 사라집니다)')) return
    await deleteInstructorTeamTask(workspaceId, task.taskId)
    pushTeamNotification(workspaceId, {
      title: '칸반 티켓 삭제',
      description: `"${task.title}" 티켓이 삭제되었습니다.`,
      href: buildHref('kanban', workspaceId),
      icon: 'fas fa-trash-alt',
    })
    setModalTask(null)
    await reload()
  }

  async function moveTask(taskId: number, status: TaskStatus) {
    if (!workspaceId) return
    const task = data.tasks.find((item) => item.taskId === taskId)
    if (!task || task.status === status) return
    await updateInstructorTeamTaskStatus(workspaceId, taskId, status)
    pushTeamNotification(workspaceId, {
      title: '칸반 상태 변경',
      description: `"${task.title}" 티켓이 ${taskStatusMeta(status).column} 단계로 이동했습니다.`,
      href: buildHref('kanban', workspaceId),
      icon: 'fas fa-arrows-alt',
    })
    await reload()
  }

  function startDrag(event: DragEvent<HTMLElement>, taskId: number) {
    event.dataTransfer.setData('text/plain', String(taskId))
    event.dataTransfer.effectAllowed = 'move'
  }

  function dropTask(event: DragEvent<HTMLDivElement>, status: TaskStatus) {
    event.preventDefault()
    const taskId = Number(event.dataTransfer.getData('text/plain'))
    if (Number.isFinite(taskId)) void moveTask(taskId, status)
  }

  return (
    <div className="instructor-team-kanban flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative z-10 flex shrink-0 flex-col justify-between gap-4 border-b border-gray-200 bg-white px-8 py-6 shadow-sm md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-columns text-[#7C3AED]" />팀 칸반 보드 모니터링</h1>
          <p className="mt-2 text-sm text-gray-500">팀원들이 생성한 티켓(작업) 진행 상황을 파악하고, 병목 현상(Bottleneck)이 없는지 확인하세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="w-48 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-8 text-xs font-medium placeholder-gray-400 outline-none transition focus:border-[#7C3AED] focus:bg-white focus:ring-1 focus:ring-[#7C3AED]" placeholder="티켓 검색..." />
          </div>
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {[
              ['all', '전체 보기'],
              ['fe', 'Frontend'],
              ['be', 'Backend'],
              ['design', 'Designer'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value as KanbanFilter)} className={`itw-kanban-filter-tab rounded-lg px-4 py-1.5 text-xs font-bold ${filter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={() => setModalTask('new')} className="itw-kanban-top-button flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-plus" />강사 지시 티켓 추가</button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-x-auto overflow-y-hidden bg-[#F8F9FA] p-6">
        <div className="flex h-full min-w-max gap-6 pb-4">
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = visibleTasks.filter((task) => task.status === column.status)
            const totalCount = data.tasks.filter((task) => task.status === column.status).length
            return (
              <section key={column.status} className={`flex h-full w-80 shrink-0 flex-col rounded-2xl border ${column.wrapperClass}`}>
                {column.highlight ? <div className="pointer-events-none absolute inset-0 bg-yellow-400/5 blur-xl" /> : null}
                <div className={`relative flex shrink-0 items-center justify-between border-b p-4 ${column.headerClass}`}>
                  <h3 className="flex items-center gap-2 font-extrabold"><span className={`h-2 w-2 rounded-full ${column.dotClass}`} />{column.label}</h3>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${column.countClass}`}>{keyword || filter !== 'all' ? columnTasks.length : totalCount}</span>
                </div>
                <div className="custom-scrollbar relative z-10 flex-1 space-y-3 overflow-y-auto p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropTask(event, column.status)}>
                  {columnTasks.map((task) => <KanbanTaskCard key={task.taskId} task={task} members={members} onOpen={() => setModalTask(task)} onDragStart={startDrag} />)}
                  {columnTasks.length === 0 ? (
                    <div className="pointer-events-none m-0 flex h-full min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-4 text-gray-400 opacity-60">
                      <i className="fas fa-inbox mb-2 text-2xl text-gray-300" />
                      <p className="text-xs font-bold text-gray-400">티켓이 없습니다</p>
                    </div>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {modalTask ? <TaskModal task={modalTask === 'new' ? null : modalTask} members={members} onClose={() => setModalTask(null)} onSubmit={saveTask} onDelete={deleteTask} /> : null}
    </div>
  )
}

function KanbanTaskCard({ task, members, onOpen, onDragStart }: { task: WorkspaceTask; members: WorkspaceMember[]; onOpen: () => void; onDragStart: (event: DragEvent<HTMLElement>, taskId: number) => void }) {
  const assignee = members.find((member) => member.learnerId === task.assigneeId)
  const role = kanbanRoleMeta(kanbanTaskRole(task, members))
  const priority = kanbanPriorityMeta(task.priority)
  const done = task.status === 'DONE'
  const review = task.status === 'IN_REVIEW'
  return (
    <article draggable onDragStart={(event) => onDragStart(event, task.taskId)} onClick={onOpen} className={`kanban-card group relative cursor-grab rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#7C3AED] hover:shadow-lg ${done ? 'opacity-70' : ''} ${review ? 'shadow-md' : ''}`}>
      {review ? <div className="absolute -top-2 -right-2 animate-bounce rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">리뷰 필요</div> : null}
      <div className="mb-2 flex items-start justify-between">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${role.badge}`}>{role.label}</span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400">#{role.prefix}-{String(task.taskId).padStart(2, '0').slice(-2)}</span>
      </div>
      <h4 className={`mb-2 text-sm font-bold leading-tight text-gray-900 transition group-hover:text-[#7C3AED] ${done ? 'line-through' : ''}`}>{task.title}</h4>
      <div className="mt-4 flex items-end justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <img src={assignee?.profileImage ?? avatarUrl(assignee?.learnerName ?? task.assigneeName)} className="h-6 w-6 rounded-full border border-gray-200 bg-gray-50" title={assignee?.learnerName ?? task.assigneeName ?? '미배정'} alt="" />
          <span className="truncate text-[10px] font-medium text-gray-500">{assignee?.learnerName ?? task.assigneeName ?? '미배정'}</span>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${priority.className}`}>{priority.icon ? <i className={priority.icon} /> : null}{priority.label}</span>
      </div>
    </article>
  )
}

function TaskModal({ task, members, onClose, onSubmit, onDelete }: { task: WorkspaceTask | null; members: WorkspaceMember[]; onClose: () => void; onSubmit: (form: { title: string; description: string; priority: TaskPriority; assigneeId: string; dueDate: string; role: KanbanFilter | 'common' }) => Promise<void>; onDelete: (task: WorkspaceTask) => Promise<void> }) {
  const parsedDescription = parseKanbanDescription(task?.description)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: parsedDescription.description,
    priority: task?.priority ?? 'MEDIUM' as TaskPriority,
    assigneeId: task?.assigneeId ? String(task.assigneeId) : '',
    dueDate: task?.dueDate ?? '',
    role: task ? parsedDescription.role ?? kanbanTaskRole(task, members) : 'fe' as KanbanFilter | 'common',
  })
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className={`fas ${task ? 'fa-search' : 'fa-ticket-alt'} text-[#7C3AED]`} />{task ? '티켓 확인 및 피드백 수정' : '강사 지시 티켓 추가'}</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          <div className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs font-medium text-[#7C3AED]"><i className="fas fa-info-circle" />멘토(강사)가 팀원에게 지시하는 강제 할당 티켓을 생성할 수 있습니다.</div>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">작업 제목 <span className="text-red-500">*</span></span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="어떤 작업을 팀원이 수행해야 하나요?" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">담당 직군 (Role)</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as KanbanFilter | 'common' })} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]"><option value="fe">Frontend (파란색)</option><option value="be">Backend (보라색)</option><option value="design">Designer (핑크색)</option><option value="common">공통 (회색)</option></select></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">담당자 배정</span><select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]"><option value="">담당자 없음</option>{members.map((member) => <option key={member.memberId} value={member.learnerId}>{member.learnerName}</option>)}</select></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">우선순위</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]"><option value="HIGH">긴급 (High)</option><option value="MEDIUM">보통 (Medium)</option><option value="LOW">낮음 (Low)</option></select></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">마감일 (기한)</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" /></label>
          </div>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">상세 설명 및 피드백 <span className="font-normal text-gray-400">(수정 시 코멘트 활용)</span></span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="지시할 내용이나, 팀원이 올린 작업물에 대한 리뷰(피드백)를 작성하세요." /></label>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 p-5">
          {task ? <button type="button" onClick={() => void onDelete(task)} className="flex items-center gap-1 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-500 shadow-sm transition hover:bg-red-50"><i className="fas fa-trash-alt" />티켓 삭제</button> : <span />}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-50"><i className="fas fa-save" />{saving ? '저장 중' : '저장 / 배정'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

type ArchitectureTab = 'api' | 'erd' | 'infra'

type ApiEndpointSpec = {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  description: string
  request: string
  response: string
  status: 'DONE' | 'SYNCING' | 'DESIGNING' | 'NEEDS_FIX'
  ownerId?: number | null
}

type ArchitectureFeedback = {
  id: string
  author: string
  role: string
  content: string
  createdAt: string
  mine?: boolean
}

type ArchitectureLog = {
  id: string
  actor: string
  role: string
  message: string
  createdAt: string
}

type ArchitectureDocData = {
  externalLink: string
  notes: string
  endpoints: ApiEndpointSpec[]
  feedback: ArchitectureFeedback[]
  logs: ArchitectureLog[]
}

const EMPTY_ARCHITECTURE_DOC: ArchitectureDocData = { externalLink: '', notes: '', endpoints: [], feedback: [], logs: [] }

function parseArchitectureDoc(content?: string | null): ArchitectureDocData {
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

function serializeArchitectureDoc(doc: ArchitectureDocData) {
  return JSON.stringify(doc, null, 2)
}

function architectureDocFor(data: TeamData, mode: ArchitectureTab) {
  return parseArchitectureDoc((mode === 'api' ? data.apiSpec : mode === 'erd' ? data.erdDoc : data.infraDoc)?.content)
}

function architectureEndpointFor(mode: ArchitectureTab, workspaceId: number) {
  return mode === 'api' ? `/api/workspaces/${workspaceId}/api-spec` : `/api/workspaces/${workspaceId}/docs/${mode}`
}

function architectureLabel(mode: ArchitectureTab) {
  return mode === 'api' ? 'API 명세서' : mode === 'erd' ? 'ERD' : '인프라 구조도'
}

function apiMethodTone(method: ApiEndpointSpec['method']) {
  if (method === 'GET') return 'border-blue-200 bg-blue-50 text-blue-600'
  if (method === 'POST') return 'border-green-200 bg-green-50 text-green-600'
  if (method === 'DELETE') return 'border-red-200 bg-red-50 text-red-600'
  if (method === 'PATCH') return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  return 'border-gray-200 bg-gray-100 text-gray-600'
}

function apiStatusMeta(status: ApiEndpointSpec['status']) {
  if (status === 'DONE') return { label: '개발 완료', className: 'bg-green-50 text-green-600', icon: 'fas fa-check mr-0.5' }
  if (status === 'SYNCING') return { label: '프론트 연동 중', className: 'bg-yellow-50 text-yellow-600', icon: 'fas fa-spinner mr-0.5' }
  if (status === 'NEEDS_FIX') return { label: '수정 필요', className: 'bg-red-50 text-red-600', icon: 'fas fa-exclamation-triangle mr-0.5' }
  return { label: '설계 중', className: 'bg-gray-100 text-gray-500', icon: '' }
}

function ArchitecturePage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [mode, setMode] = useState<ArchitectureTab>('api')
  const [selectedApi, setSelectedApi] = useState<ApiEndpointSpec | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [apiModalOpen, setApiModalOpen] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const members = membersOnly(data)
  const doc = architectureDocFor(data, mode)
  const currentDoc = architectureDocFor(data, mode)

  async function saveDoc(nextDoc: ArchitectureDocData, targetMode: ArchitectureTab = mode) {
    if (!workspaceId) return
    await saveInstructorTeamWorkspaceDoc(architectureEndpointFor(targetMode, workspaceId), serializeArchitectureDoc(nextDoc))
    pushTeamNotification(workspaceId, {
      title: '아키텍처 문서 저장',
      description: `${architectureLabel(targetMode)} 문서가 업데이트되었습니다.`,
      href: buildHref('architecture', workspaceId),
      icon: 'fas fa-project-diagram',
    })
    await reload()
  }

  async function sendFeedback(target?: ApiEndpointSpec | null, explicitText?: string) {
    const content = (explicitText ?? feedbackText).trim()
    if (!content) return
    const next: ArchitectureFeedback = {
      id: String(Date.now()),
      author: data.dashboard?.ownerName ?? '나',
      role: 'PM',
      content: target ? `[${target.method} ${target.url}] ${content}` : content,
      createdAt: new Date().toISOString(),
      mine: true,
    }
    const nextDoc = {
      ...currentDoc,
      feedback: [...currentDoc.feedback, next],
      logs: [{ id: `log-${Date.now()}`, actor: '나', role: 'PM', message: target ? `${target.url} API에 코멘트를 남겼습니다.` : '설계 리뷰 코멘트를 남겼습니다.', createdAt: new Date().toISOString() }, ...currentDoc.logs],
    }
    setFeedbackText('')
    setSelectedApi(null)
    await saveDoc(nextDoc)
  }

  async function saveApiEndpoint(form: Omit<ApiEndpointSpec, 'id'>) {
    const nextEndpoint = { ...form, id: String(Date.now()) }
    await saveDoc({
      ...currentDoc,
      endpoints: [...currentDoc.endpoints, nextEndpoint],
      logs: [{ id: `log-${Date.now()}`, actor: '나', role: 'PM', message: `${form.url} API 명세를 등록했습니다.`, createdAt: new Date().toISOString() }, ...currentDoc.logs],
    }, 'api')
    setApiModalOpen(false)
  }

  async function saveExternalLink(form: { externalLink: string; notes: string }) {
    await saveDoc({
      ...currentDoc,
      externalLink: form.externalLink,
      notes: form.notes,
      logs: [{ id: `log-${Date.now()}`, actor: '나', role: 'PM', message: `${mode === 'erd' ? 'ERD' : mode === 'infra' ? '인프라 구조도' : 'API 명세서'} 원본 링크를 업데이트했습니다.`, createdAt: new Date().toISOString() }, ...currentDoc.logs],
    })
    setLinkModalOpen(false)
  }

  function openExternalLink() {
    if (doc.externalLink) window.open(doc.externalLink, '_blank', 'noopener,noreferrer')
    else setLinkModalOpen(true)
  }

  return (
    <div className="instructor-team-architecture flex h-full min-h-0 overflow-hidden">
      <div className="z-10 flex h-full flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex shrink-0 flex-col justify-between gap-4 px-8 pt-6 md:flex-row md:items-end">
          <div>
            <h1 className="mb-2 flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-project-diagram text-[#7C3AED]" />아키텍처 & API 설계 리뷰</h1>
            <p className="mb-4 text-sm text-gray-500">팀원들이 작성한 데이터베이스 구조와 API 스펙을 점검하고 코멘트를 남기세요.</p>
          </div>
          <div className="mb-4 flex shrink-0 gap-2">
            {mode === 'api' ? <button type="button" onClick={() => setApiModalOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"><i className="fas fa-plus text-gray-400" />API 항목 추가</button> : null}
            <button type="button" onClick={openExternalLink} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"><i className="fas fa-external-link-alt text-gray-400" />{doc.externalLink ? '원본 링크 확인' : '외부 툴 열기'}</button>
            {mode !== 'api' ? <button type="button" onClick={() => setLinkModalOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-[#7C3AED] shadow-sm transition hover:bg-purple-100"><i className="fas fa-pen" />링크/노트 수정</button> : null}
          </div>
        </div>

        <div className="flex shrink-0 gap-6 border-b border-gray-200 px-8">
          {(['api', 'erd', 'infra'] as const).map((tab) => <button key={tab} type="button" onClick={() => setMode(tab)} className={`arch-tab pb-3 text-sm font-bold ${mode === tab ? 'active text-[#7C3AED]' : 'text-gray-500'}`}>{tab === 'api' ? 'API 명세서' : tab === 'erd' ? 'ERD (DB 설계)' : '인프라 구조도'}</button>)}
        </div>

        <div className="custom-scrollbar relative flex-1 overflow-y-auto bg-gray-50 p-6">
          {mode === 'api' ? <ApiSpecView doc={doc} members={members} onOpen={setSelectedApi} /> : <DiagramView mode={mode} doc={doc} onEdit={() => setLinkModalOpen(true)} />}
        </div>
      </div>

      <ArchitectureFeedbackPanel doc={doc} value={feedbackText} onChange={setFeedbackText} onSend={() => void sendFeedback()} />
      <ArchitectureActivityPanel doc={doc} fallbackLogs={data.activityLogs} />

      {selectedApi ? <ApiDetailModal endpoint={selectedApi} onClose={() => setSelectedApi(null)} onSend={(text) => sendFeedback(selectedApi, text)} /> : null}
      {apiModalOpen ? <ApiEndpointModal members={members} onClose={() => setApiModalOpen(false)} onSubmit={saveApiEndpoint} /> : null}
      {linkModalOpen ? <ArchitectureLinkModal mode={mode} doc={doc} onClose={() => setLinkModalOpen(false)} onSubmit={saveExternalLink} /> : null}
    </div>
  )
}

function ApiSpecView({ doc, members, onOpen }: { doc: ArchitectureDocData; members: WorkspaceMember[]; onOpen: (endpoint: ApiEndpointSpec) => void }) {
  if (doc.endpoints.length === 0) {
    return <ArchitectureEmpty icon="fas fa-network-wired" title="등록된 API 명세서가 없습니다" description="팀원들이 API 명세서를 작성하면 이곳에 목록이 표시됩니다." />
  }
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-extrabold text-gray-800">REST API Endpoints</h3>
        <span className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm">총 {doc.endpoints.length}개 항목</span>
      </div>
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-gray-100 bg-white text-[10px] font-bold text-gray-400 uppercase">
            <tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Endpoint</th><th className="px-4 py-3">설명</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">담당 (BE)</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {doc.endpoints.map((endpoint) => {
              const owner = members.find((member) => member.learnerId === endpoint.ownerId)
              const status = apiStatusMeta(endpoint.status)
              return (
                <tr key={endpoint.id} className="api-row cursor-pointer transition hover:bg-gray-50" onClick={() => onOpen(endpoint)}>
                  <td className="px-4 py-3"><span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${apiMethodTone(endpoint.method)}`}>{endpoint.method}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{endpoint.url}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-600">{endpoint.description}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>{status.icon ? <i className={status.icon} /> : null}{status.label}</span></td>
                  <td className="flex items-center gap-1.5 px-4 py-3"><img src={owner?.profileImage ?? avatarUrl(owner?.learnerName)} className="h-5 w-5 rounded-full border border-gray-200 bg-gray-50" alt="" /><span className="text-xs text-gray-700">{owner?.learnerName ?? '미지정'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DiagramView({ mode, doc, onEdit }: { mode: Exclude<ArchitectureTab, 'api'>; doc: ArchitectureDocData; onEdit: () => void }) {
  const title = mode === 'erd' ? '데이터베이스 ERD' : '클라우드 인프라 아키텍처'
  const emptyTitle = mode === 'erd' ? '등록된 ERD가 없습니다' : '등록된 인프라 구조도가 없습니다'
  const emptyDescription = mode === 'erd' ? '팀원들이 데이터베이스 스키마를 설계하면 이곳에서 다이어그램을 확인할 수 있습니다.' : '시스템 아키텍처 및 클라우드 인프라 설계가 등록되면 이곳에 표시됩니다.'
  const icon = mode === 'erd' ? 'fas fa-database' : 'fas fa-cloud'
  if (!doc.externalLink && !doc.notes) return <ArchitectureEmpty icon={icon} title={emptyTitle} description={emptyDescription} action={<button type="button" onClick={onEdit} className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md">링크 등록</button>} />
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center gap-3"><h3 className="text-sm font-extrabold text-gray-800">{title}</h3><span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] text-purple-600">문서 연결됨</span></div>
        <button type="button" onClick={onEdit} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:text-[#7C3AED]"><i className="fas fa-pen" />수정</button>
      </div>
      <div className={`custom-scrollbar flex flex-1 items-center justify-center overflow-auto p-6 ${mode === 'erd' ? 'bg-[#2C2C2C]' : 'bg-white'}`}>
        {doc.externalLink ? (
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <p className="mb-3 text-[10px] font-bold text-gray-400 uppercase">Connected Source</p>
            <a href={doc.externalLink} target="_blank" rel="noreferrer" className="break-all font-mono text-sm font-bold text-[#7C3AED] hover:underline">{doc.externalLink}</a>
            <pre className="mt-5 whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-6 text-gray-700">{doc.notes || '원본 링크가 연결되어 있습니다. 외부 툴에서 다이어그램을 확인하세요.'}</pre>
          </div>
        ) : <pre className="w-full max-w-3xl whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-6 text-sm leading-6 text-gray-700 shadow-lg">{doc.notes}</pre>}
      </div>
    </div>
  )
}

function ArchitectureEmpty({ icon, title, description, action }: { icon: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-purple-100 bg-purple-50 shadow-sm"><i className={`${icon} text-3xl text-[#7C3AED] opacity-60`} /></div>
      <h3 className="mb-2 text-lg font-extrabold text-gray-900">{title}</h3>
      <p className="mb-6 max-w-sm whitespace-pre-line text-sm leading-relaxed text-gray-500">{description}</p>
      {action}
    </div>
  )
}

function ArchitectureFeedbackPanel({ doc, value, onChange, onSend }: { doc: ArchitectureDocData; value: string; onChange: (value: string) => void; onSend: () => void }) {
  return (
    <aside className="relative z-20 flex w-80 shrink-0 flex-col bg-white shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.03)]">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 bg-purple-50 px-5"><i className="fas fa-comments text-[#7C3AED]" /><h3 className="text-sm font-extrabold text-gray-900">강사 피드백 및 논의</h3></div>
      <div className="custom-scrollbar flex flex-1 flex-col space-y-5 overflow-y-auto p-5 pb-24">
        {doc.feedback.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center text-center opacity-70"><i className="far fa-comment-dots mb-3 text-4xl text-gray-300" /><p className="text-xs font-bold text-gray-500">아직 등록된 코멘트가 없습니다.</p><p className="mt-1 text-[10px] text-gray-400">설계에 대한 첫 피드백을 남겨주세요.</p></div> : doc.feedback.map((item) => (
          <div key={item.id} className={`flex gap-3 ${item.mine ? 'flex-row-reverse' : ''}`}>
            <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${item.mine ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50'}`}>{item.mine ? <i className="fas fa-user-tie text-xs" /> : <img src={avatarUrl(item.author)} className="h-8 w-8 rounded-full" alt="" />}</div>
            <div className={item.mine ? 'flex flex-col items-end' : ''}>
              <div className={`mb-1 flex items-center gap-1.5 ${item.mine ? 'flex-row-reverse' : ''}`}><span className="text-xs font-bold text-gray-900">{item.mine ? '나' : item.author}</span><span className={`rounded px-1 py-0.5 text-[9px] ${item.mine ? 'bg-[#7C3AED] text-white' : 'border border-purple-100 bg-purple-50 text-purple-600'}`}>{item.role}</span><span className="text-[9px] text-gray-400">{relativeTime(item.createdAt)}</span></div>
              <p className={`break-words rounded-xl border p-3 text-xs font-medium leading-relaxed ${item.mine ? 'rounded-tr-none border-purple-200 bg-purple-50 text-right text-gray-900 shadow-sm' : 'rounded-tl-none border-gray-100 bg-gray-50 text-gray-700'}`}>{item.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 w-full shrink-0 border-t border-gray-100 bg-white p-4">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 shadow-sm transition focus-within:border-[#7C3AED]">
          <textarea value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend() } }} className="custom-scrollbar h-10 flex-1 resize-none border-none bg-transparent p-2 text-xs leading-relaxed outline-none" placeholder="팀 설계에 대한 강사 피드백 코멘트 남기기 (Enter)" />
          <button type="button" onClick={onSend} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white shadow-md transition hover:bg-black"><i className="fas fa-paper-plane text-xs" /></button>
        </div>
      </div>
    </aside>
  )
}

function ArchitectureActivityPanel({ doc, fallbackLogs }: { doc: ArchitectureDocData; fallbackLogs: ActivityLogItem[] }) {
  const logs = doc.logs.length > 0 ? doc.logs : fallbackLogs.slice(0, 5).map((log) => ({ id: String(log.logId), actor: log.actorName ?? '시스템', role: 'SYS', message: log.description ?? log.targetTitle ?? '워크스페이스 활동이 기록되었습니다.', createdAt: log.createdAt ?? new Date().toISOString() }))
  return (
    <aside className="relative z-30 flex w-72 shrink-0 flex-col border-l border-gray-100 bg-white shadow-[-5px_0_15px_-3px_rgba(0,0,0,0.02)]">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50 px-5"><i className="fas fa-history text-gray-500" /><h3 className="text-sm font-extrabold text-gray-900">활동 로그</h3></div>
      {logs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-white p-5 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50"><i className="fas fa-inbox text-2xl text-gray-300" /></div><p className="mb-1 text-xs font-bold text-gray-500">기록된 활동이 없습니다</p><p className="text-[10px] leading-relaxed text-gray-400">설계안 추가, 상태 변경 등의<br />활동 내역이 여기에 기록됩니다.</p></div>
      ) : (
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5">{logs.map((log, index) => <div key={log.id} className={`relative border-l-2 pb-2 pl-5 ${index === logs.length - 1 ? 'border-transparent' : 'border-gray-100'}`}><div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-[#7C3AED] ring-4 ring-white" /><p className="mb-1 text-[10px] font-bold text-gray-400">{relativeTime(log.createdAt)}</p><p className="flex items-center gap-1 text-xs font-bold text-gray-900">{log.actor}<span className="rounded bg-purple-50 px-1 py-0.5 text-[8px] text-purple-600">{log.role}</span></p><p className="mt-1.5 rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs leading-relaxed text-gray-600">{log.message}</p></div>)}</div>
      )}
    </aside>
  )
}

function ApiDetailModal({ endpoint, onClose, onSend }: { endpoint: ApiEndpointSpec; onClose: () => void; onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6"><div className="flex items-center gap-3"><span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${apiMethodTone(endpoint.method)}`}>{endpoint.method}</span><h3 className="font-mono text-lg font-bold text-gray-900">{endpoint.url}</h3></div><button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button></div>
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6"><div><h4 className="mb-2 text-xs font-bold text-gray-500 uppercase">Description</h4><p className="text-sm font-medium text-gray-800">{endpoint.description}</p></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="rounded-xl border border-gray-100 bg-gray-50 p-4"><h4 className="mb-2 text-[10px] font-bold text-gray-400 uppercase">Request (Body/Query)</h4><pre className="overflow-x-auto whitespace-pre-wrap break-all rounded border border-gray-200 bg-white p-3 font-mono text-xs text-gray-800">{endpoint.request || 'No Request Body'}</pre></div><div className="rounded-xl border border-gray-100 bg-gray-50 p-4"><h4 className="mb-2 text-[10px] font-bold text-gray-400 uppercase">Response</h4><pre className="overflow-x-auto whitespace-pre-wrap break-all rounded border border-gray-200 bg-white p-3 font-mono text-xs text-[#00C471]">{endpoint.response || 'No Response Data'}</pre></div></div><div className="mt-2 border-t border-gray-200 pt-4"><h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-[#7C3AED]"><i className="fas fa-comment-dots" />이 API에 대한 피드백 남기기</h4><textarea value={text} onChange={(event) => setText(event.target.value)} className="h-20 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="해당 API 명세의 수정이 필요하거나 보완점이 있다면 코멘트를 남겨주세요." /></div></div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">닫기</button><button type="button" onClick={() => void onSend(text)} className="flex items-center gap-1 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-paper-plane" />피드백 전송</button></div>
      </div>
    </div>
  )
}

function ApiEndpointModal({ members, onClose, onSubmit }: { members: WorkspaceMember[]; onClose: () => void; onSubmit: (form: Omit<ApiEndpointSpec, 'id'>) => Promise<void> }) {
  const [form, setForm] = useState<Omit<ApiEndpointSpec, 'id'>>({ method: 'GET', url: '', description: '', request: '', response: '', status: 'DESIGNING', ownerId: members[0]?.learnerId ?? null })
  return <Modal title="API 명세 등록" icon="fas fa-network-wired" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); void onSubmit(form) }} className="space-y-5 p-6"><div className="grid grid-cols-[120px_1fr] gap-3"><select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as ApiEndpointSpec['method'] })} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select><input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required placeholder="/api/v1/example" className="rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm outline-none focus:border-[#7C3AED]" /></div><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required placeholder="API 설명" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" /><div className="grid grid-cols-2 gap-3"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ApiEndpointSpec['status'] })} className="rounded-xl border border-gray-200 px-4 py-3 text-sm"><option value="DESIGNING">설계 중</option><option value="SYNCING">프론트 연동 중</option><option value="DONE">개발 완료</option><option value="NEEDS_FIX">수정 필요</option></select><select value={form.ownerId ?? ''} onChange={(event) => setForm({ ...form, ownerId: event.target.value ? Number(event.target.value) : null })} className="rounded-xl border border-gray-200 px-4 py-3 text-sm"><option value="">담당자 없음</option>{members.map((member) => <option key={member.memberId} value={member.learnerId}>{member.learnerName}</option>)}</select></div><textarea value={form.request} onChange={(event) => setForm({ ...form, request: event.target.value })} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 font-mono text-xs" placeholder="Request JSON 또는 Query 예시" /><textarea value={form.response} onChange={(event) => setForm({ ...form, response: event.target.value })} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 font-mono text-xs" placeholder="Response JSON 예시" /><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold">취소</button><button className="rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white">등록</button></div></form></Modal>
}

function ArchitectureLinkModal({ mode, doc, onClose, onSubmit }: { mode: ArchitectureTab; doc: ArchitectureDocData; onClose: () => void; onSubmit: (form: { externalLink: string; notes: string }) => Promise<void> }) {
  const [form, setForm] = useState({ externalLink: doc.externalLink, notes: doc.notes })
  return <Modal title={mode === 'erd' ? 'ERD 원본 연결' : mode === 'infra' ? '인프라 구조도 연결' : 'API 원본 연결'} icon="fas fa-external-link-alt" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); void onSubmit(form) }} className="space-y-5 p-6"><input value={form.externalLink} onChange={(event) => setForm({ ...form, externalLink: event.target.value })} placeholder="https://..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" /><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="h-40 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-6 outline-none focus:border-[#7C3AED]" placeholder="설계 요약, 리뷰 포인트, 확인할 내용" /><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold">취소</button><button className="rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white">저장</button></div></form></Modal>
}

function questionMember(question: QuestionSummary, members: WorkspaceMember[]) {
  return members.find((member) => member.learnerId === question.authorId) ?? null
}

function qnaRoleMeta(member: WorkspaceMember | null) {
  const raw = member?.roleLabel ?? member?.position ?? member?.role ?? ''
  const normalized = raw.toLowerCase()
  if (normalized.includes('front') || normalized.includes('fe')) return { label: 'Frontend', badge: 'bg-blue-50 text-blue-600 border-blue-100' }
  if (normalized.includes('back') || normalized.includes('be')) return { label: 'Backend', badge: 'bg-purple-50 text-purple-600 border-purple-100' }
  if (normalized.includes('design') || normalized.includes('des') || normalized.includes('ux') || normalized.includes('디자')) return { label: 'UX/UI', badge: 'bg-pink-50 text-pink-600 border-pink-100' }
  if (normalized.includes('pm') || normalized.includes('기획')) return { label: 'PM', badge: 'bg-amber-50 text-amber-600 border-amber-100' }
  return { label: raw || 'Team', badge: 'bg-gray-50 text-gray-600 border-gray-100' }
}

function QnaPage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<'all' | 'wait' | 'done'>('all')
  const [keyword, setKeyword] = useState('')
  const [target, setTarget] = useState<QuestionSummary | null>(null)
  const [detail, setDetail] = useState<QuestionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [answerContent, setAnswerContent] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const members = membersOnly(data)
  const unansweredCount = data.questions.filter((question) => !isAnswered(question)).length
  const normalizedKeyword = keyword.trim().toLowerCase()
  const filteredQuestions = data.questions.filter((question) => {
    if (filter === 'wait' && isAnswered(question)) return false
    if (filter === 'done' && !isAnswered(question)) return false
    if (!normalizedKeyword) return true
    const member = questionMember(question, members)
    return [question.title, question.content, question.authorName, member?.learnerName, member?.roleLabel, member?.position].some((value) => value?.toLowerCase().includes(normalizedKeyword))
  })

  async function openAnswerModal(question: QuestionSummary) {
    setTarget(question)
    setDetail(null)
    setAnswerContent('')
    setDetailLoading(true)
    try {
      const response = await fetchInstructorTeamQuestionDetail(question.id)
      setDetail(response)
      setAnswerContent(response.answers[0]?.content ?? '')
    } catch {
      setDetail({ ...question, answers: [] })
    } finally {
      setDetailLoading(false)
    }
  }

  async function answer(question: QuestionSummary, content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    const existingAnswer = detail?.answers[0]
    if (existingAnswer) {
      await updateInstructorTeamQuestionAnswer(question.id, existingAnswer.id, trimmed)
    } else {
      await createInstructorTeamQuestionAnswer(question.id, trimmed)
    }
    pushTeamNotification(workspaceId, {
      title: existingAnswer ? 'Q&A 답변 수정' : 'Q&A 답변 등록',
      description: `"${question.title}" 질문에 답변이 ${existingAnswer ? '수정' : '등록'}되었습니다.`,
      href: buildHref('qna', workspaceId),
      icon: 'fas fa-comments',
    })
    setTarget(null)
    setDetail(null)
    setAnswerContent('')
    setSuccessOpen(true)
    await reload()
  }

  function emptyMessage() {
    if (filter === 'wait') return { title: '대기 중인 질문이 없습니다.', description: '모든 질문에 답변을 완료하셨습니다.' }
    if (filter === 'done') return { title: '답변 완료된 질문이 없습니다.', description: '답변을 등록하시면 완료 목록에서 확인하실 수 있습니다.' }
    return { title: '등록된 질문 내역이 없습니다.', description: '팀원들이 프로젝트를 진행하면서 질문을 남기면 이곳에 표시됩니다.' }
  }

  return (
    <div className="instructor-team-qna flex h-full flex-col">
      <div className="mb-8 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-comments text-[#7C3AED]" />멘토 Q&A 관리</h1>
          <p className="mt-2 text-sm text-gray-500">팀원들의 질문에 답변하고, 병목을 해소할 수 있도록 기술적인 방향을 제시해주세요.</p>
        </div>
      </div>

      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto pb-2">
          <button type="button" onClick={() => setFilter('all')} className={`filter-tab rounded-xl border px-5 py-2.5 text-sm font-bold ${filter === 'all' ? 'active border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>전체 보기</button>
          <button type="button" onClick={() => setFilter('wait')} className={`filter-tab flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold ${filter === 'wait' ? 'active border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>미답변 (대기중){unansweredCount > 0 ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unansweredCount}</span> : null}</button>
          <button type="button" onClick={() => setFilter('done')} className={`filter-tab rounded-xl border px-5 py-2.5 text-sm font-bold ${filter === 'done' ? 'active border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>답변 완료</button>
        </div>

        <div className="relative hidden w-64 md:block">
          <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-400" />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} type="text" placeholder="질문, 내용, 수강생 이름 검색" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium shadow-sm outline-none transition focus:border-[#7C3AED]" />
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.length === 0 ? <QnaEmptyState {...emptyMessage()} /> : filteredQuestions.map((question) => <QnaQuestionCard key={question.id} question={question} member={questionMember(question, members)} onOpen={openAnswerModal} />)}
      </div>

      {target ? <AnswerModal question={target} detail={detail} member={questionMember(target, members)} loading={detailLoading} value={answerContent} onChange={setAnswerContent} onClose={() => { setTarget(null); setDetail(null); setAnswerContent('') }} onSubmit={answer} /> : null}
      {successOpen ? <QnaSuccessModal onClose={() => setSuccessOpen(false)} /> : null}
    </div>
  )
}

function QnaQuestionCard({ question, member, onOpen }: { question: QuestionSummary; member: WorkspaceMember | null; onOpen: (question: QuestionSummary) => void }) {
  const wait = !isAnswered(question)
  const role = qnaRoleMeta(member)
  return (
    <article className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 transition hover:shadow-md md:flex-row md:items-start ${wait ? 'border-red-200 shadow-md' : 'border-gray-200 shadow-sm'}`}>
      <div className="w-full flex-1">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={member?.profileImage ?? avatarUrl(question.authorName)} className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50" alt="" />
            <div>
              <p className="flex items-center gap-1 text-xs font-bold text-gray-900">
                {question.authorName ?? member?.learnerName ?? '팀원'}
                <span className={`ml-1 rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${role.badge}`}>{role.label}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">{relativeTime(question.createdAt)}</p>
            </div>
          </div>
          {wait ? <span className="flex items-center gap-1 rounded border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-500"><i className="fas fa-exclamation-circle" />답변 대기중</span> : <span className="flex items-center gap-1 rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-600"><i className="fas fa-check" />답변 완료</span>}
        </div>
        <button type="button" onClick={() => onOpen(question)} className="mb-1.5 block text-left text-base font-extrabold text-gray-900 transition hover:text-[#7C3AED]">{question.title}</button>
        <button type="button" onClick={() => onOpen(question)} className="line-clamp-2 text-left text-sm leading-relaxed text-gray-500">{question.content}</button>
        {wait ? <p className="mt-3 border-t border-gray-100 pt-3 text-xs font-medium text-red-400"><i className="fas fa-info-circle mr-1" />팀원이 멘토님의 빠른 답변을 기다리고 있습니다.</p> : <div className="mt-3 flex items-start gap-2 border-t border-gray-100 pt-3 opacity-80"><i className="fas fa-reply mt-0.5 text-[10px] text-gray-400" /><p className="line-clamp-1 flex-1 text-xs font-medium text-gray-600">나의 답변: 답변이 등록되어 있습니다. 상세에서 확인하세요.</p></div>}
      </div>
      <div className="flex shrink-0 items-center md:pt-1">
        <button type="button" onClick={() => onOpen(question)} className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-bold transition ${wait ? 'bg-gray-900 text-white shadow-md hover:bg-black' : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50'}`}>{wait ? '답변하기' : '답변 보기/수정'}</button>
      </div>
    </article>
  )
}

function QnaEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-16 text-center text-gray-500 shadow-sm">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-inner">
        <i className="fas fa-folder-open text-2xl" />
      </div>
      <p className="mb-1 text-base font-extrabold text-gray-900">{title}</p>
      <p className="text-sm font-medium text-gray-400">{description}</p>
    </div>
  )
}

function AnswerModal({ question, detail, member, loading, value, onChange, onClose, onSubmit }: { question: QuestionSummary; detail: QuestionDetail | null; member: WorkspaceMember | null; loading: boolean; value: string; onChange: (value: string) => void; onClose: () => void; onSubmit: (question: QuestionSummary, content: string) => Promise<void> }) {
  const answered = Boolean(detail?.answers[0] ?? isAnswered(question))
  const role = qnaRoleMeta(member)
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className={`fas ${answered ? 'fa-edit' : 'fa-pen'} text-[#7C3AED]`} />{answered ? '답변 확인 및 수정' : '답변 작성하기'}</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          <div>
            <span className="mb-2 block text-[10px] font-bold text-gray-400">학생의 질문</span>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4">
                <img src={member?.profileImage ?? avatarUrl(question.authorName)} className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50" alt="" />
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-gray-900">{question.authorName ?? member?.learnerName ?? '팀원'}<span className={`ml-1 rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${role.badge}`}>{role.label}</span></p>
                  <p className="mt-0.5 text-xs text-gray-500">{relativeTime(question.createdAt)}</p>
                </div>
              </div>
              <h4 className="mb-3 text-base font-extrabold text-gray-900">{question.title}</h4>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{detail?.content ?? question.content}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <img src={avatarUrl('mentor')} className="h-6 w-6 rounded-full border border-[#7C3AED] bg-white" alt="" />
              <span className="text-[11px] font-extrabold tracking-wider text-[#7C3AED]">나의 답변 작성</span>
              <span className="ml-auto text-[10px] text-gray-400">마크다운(Markdown) 및 코드 블록 지원</span>
            </div>
            <textarea value={loading ? '답변 정보를 불러오는 중입니다...' : value} onChange={(event) => onChange(event.target.value)} disabled={loading} className="min-h-[200px] w-full resize-y rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] disabled:bg-gray-50 disabled:text-gray-400" placeholder="팀원의 직군과 상황에 맞는 명확한 솔루션이나 가이드를 작성해주세요." />
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
          <button type="button" onClick={() => void onSubmit(question, value)} disabled={loading || !value.trim()} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"><i className="fas fa-paper-plane" />{answered ? '답변 수정하기' : '답변 등록하기'}</button>
        </div>
      </div>
    </div>
  )
}

function QnaSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 shadow-sm">
          <i className="fas fa-check text-3xl text-[#7C3AED]" />
        </div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">답변 등록 완료!</h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-gray-500">팀원에게 성공적으로 답변이 등록되었으며<br />알림이 발송되었습니다.</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}

type ScheduleEventType = 'meetup' | 'deadline' | 'team'

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function localDateTimeInput(value: Date) {
  return `${localDateKey(value)}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}:00`
}

function parseScheduleDescription(description?: string | null): { type: ScheduleEventType; description: string } {
  const match = description?.match(/^\[TEAM_EVENT:(meetup|deadline|team|live|review)\]\n?/)
  const rawType = match?.[1]
  const type: ScheduleEventType = rawType === 'deadline' ? 'deadline' : rawType === 'team' ? 'team' : 'meetup'
  return { type, description: match ? (description ?? '').replace(match[0], '') : (description ?? '') }
}

function buildScheduleDescription(type: ScheduleEventType, description: string) {
  return `[TEAM_EVENT:${type}]\n${description.trim()}`
}

function scheduleEventMeta(type: ScheduleEventType) {
  if (type === 'deadline') return { label: '공식 마감일', icon: 'fas fa-flag-checkered', dot: 'bg-red-500', badge: 'bg-red-500 text-white', card: 'border-red-100 bg-red-50/50' }
  if (type === 'team') return { label: '팀 내부 일정', icon: 'fas fa-users', dot: 'bg-blue-500', badge: 'bg-blue-500 text-white', card: 'border-blue-100 bg-blue-50/50' }
  return { label: '라이브 밋업', icon: 'fas fa-video', dot: 'bg-[#7C3AED]', badge: 'bg-[#7C3AED] text-white', card: 'border-purple-100 bg-purple-50/50' }
}

function SchedulePage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [success, setSuccess] = useState<{ title: string; message: ReactNode } | null>(null)
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = localDateKey(new Date())
  const eventsByDate = data.events.reduce((map, event) => {
    const key = localDateKey(new Date(event.startAt))
    const current = map.get(key) ?? []
    current.push(event)
    map.set(key, current)
    return map
  }, new Map<string, CalendarEvent[]>())
  const upcoming = data.events
    .filter((event) => new Date(event.startAt).getTime() >= new Date(todayKey).getTime())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  async function createEvent(form: { title: string; description: string; date: string; time: string; type: ScheduleEventType }) {
    if (!workspaceId) return
    const startAt = `${form.date}T${form.time || '00:00'}:00`
    const endAt = new Date(startAt)
    endAt.setHours(endAt.getHours() + 1)
    await createInstructorTeamCalendarEvent(workspaceId, {
      title: form.title,
      description: buildScheduleDescription(form.type, form.description),
      startAt,
      endAt: localDateTimeInput(endAt),
    })
    pushTeamNotification(workspaceId, {
      title: '공식 일정 등록',
      description: `${form.date} ${form.time || '00:00'} · "${form.title}" 일정이 등록되었습니다.`,
      href: buildHref('schedule', workspaceId),
      icon: 'fas fa-calendar-alt',
    })
    setModalDate(null)
    setSuccess({ title: '일정 등록 완료!', message: <>공식 일정이 성공적으로 등록되어<br />팀 캘린더와 동기화되었습니다.</> })
    await reload()
  }

  async function deleteEvent(event: CalendarEvent) {
    await deleteInstructorTeamCalendarEvent(event.eventId)
    pushTeamNotification(workspaceId, {
      title: '공식 일정 삭제',
      description: `"${event.title}" 일정이 삭제되었습니다.`,
      href: buildHref('schedule', workspaceId),
      icon: 'fas fa-calendar-times',
    })
    setSelectedEvent(null)
    setSuccess({ title: '일정 삭제 완료!', message: <>선택한 일정이 캘린더에서<br />삭제되었습니다.</> })
    await reload()
  }

  function changeMonth(delta: number) {
    setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  return (
    <div className="instructor-team-schedule flex h-full flex-col">
      <div className="mb-4 flex shrink-0 flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-calendar-check text-[#7C3AED]" />공식 일정 및 캘린더 관리</h1>
          <p className="mt-2 text-sm text-gray-500">프로젝트의 공식 일정을 생성하여 팀원들에게 공지하고, 팀 자체 일정을 모니터링하세요.</p>
        </div>
        <button type="button" onClick={() => setModalDate(localDateKey(new Date(year, month, new Date().getDate())))} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-plus" />새 공식 일정 등록</button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-gray-900">{year}년 {month + 1}월</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => changeMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"><i className="fas fa-chevron-left" /></button>
              <button type="button" onClick={() => changeMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"><i className="fas fa-chevron-right" /></button>
            </div>
          </div>

          <div className="mb-3 flex justify-end gap-4 text-[10px] font-bold text-gray-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#7C3AED]" />멘토 공식 일정</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />팀 내부 일정</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />마일스톤 마감일</span>
          </div>

          <div className="calendar-grid flex-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((label, index) => <div key={label} className={`calendar-header ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : ''}`}>{label}</div>)}
            {Array.from({ length: firstDay }).map((_, index) => <div key={`blank-${index}`} className="calendar-day other-month" />)}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const dateKey = localDateKey(new Date(year, month, day))
              const dayEvents = eventsByDate.get(dateKey) ?? []
              return (
                <button key={dateKey} type="button" onClick={() => setModalDate(dateKey)} className={`calendar-day flex flex-col text-left ${dateKey === todayKey ? 'today font-bold' : ''}`}>
                  <span className={`text-xs ${dateKey === todayKey ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
                  <div className="mt-1 flex-1 space-y-1 overflow-hidden">
                    {dayEvents.map((event) => {
                      const parsed = parseScheduleDescription(event.description)
                      const meta = scheduleEventMeta(parsed.type)
                      return <span key={event.eventId} role="button" tabIndex={0} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(event) }} onKeyDown={(keyEvent) => { if (keyEvent.key === 'Enter') { keyEvent.stopPropagation(); setSelectedEvent(event) } }} className={`block truncate rounded px-1 py-0.5 text-[9px] leading-tight text-white shadow-sm ${meta.dot}`}>{formatTime(event.startAt)} {event.title}</span>
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-extrabold text-gray-900"><i className="fas fa-list-ul text-[#7C3AED]" />다가오는 주요 일정</h3>
          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
            {upcoming.length === 0 ? <ScheduleEmptyUpcoming /> : upcoming.map((event) => {
              const parsed = parseScheduleDescription(event.description)
              const meta = scheduleEventMeta(parsed.type)
              return (
                <button key={event.eventId} type="button" onClick={() => setSelectedEvent(event)} className={`w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${meta.card}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold shadow-sm ${meta.badge}`}><i className={meta.icon} />{meta.label}</span>
                  </div>
                  <h4 className="mb-1 line-clamp-1 text-sm font-bold text-gray-900">{event.title}</h4>
                  <p className="text-[10px] font-bold text-gray-500"><i className="far fa-clock mr-0.5" />{localDateKey(new Date(event.startAt))} {formatTime(event.startAt)}</p>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {modalDate ? <EventModal initialDate={modalDate} onClose={() => setModalDate(null)} onSubmit={createEvent} /> : null}
      {selectedEvent ? <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={deleteEvent} /> : null}
      {success ? <ScheduleSuccessModal title={success.title} message={success.message} onClose={() => setSuccess(null)} /> : null}
    </div>
  )
}

function ScheduleEmptyUpcoming() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50">
        <i className="far fa-calendar-times text-2xl text-gray-300" />
      </div>
      <p className="mb-1 text-sm font-bold text-gray-500">등록된 공식 일정이 없습니다.</p>
      <p className="mt-1 text-[10px] text-gray-400">상단의 새 공식 일정 등록 버튼을 눌러<br />팀원들에게 알릴 일정을 추가해보세요.</p>
    </div>
  )
}

function EventModal({ initialDate, onClose, onSubmit }: { initialDate: string; onClose: () => void; onSubmit: (form: { title: string; description: string; date: string; time: string; type: ScheduleEventType }) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', description: '', date: initialDate, time: '', type: 'meetup' as ScheduleEventType })
  return (
    <Modal title="새 공식 일정 등록" icon="fas fa-plus-circle" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={(event) => { event.preventDefault(); void onSubmit(form) }}>
        <div className="space-y-4 p-6">
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">일정 유형 <span className="text-red-500">*</span></span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ScheduleEventType })} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]"><option value="meetup">🎥 라이브 밋업 (코드 리뷰 등)</option><option value="deadline">🚩 주차별 마일스톤 마감일</option><option value="team">👥 학생 팀 스크럼 (학생이 추가)</option></select></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">일정 제목 <span className="text-red-500">*</span></span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="예) 3주차 라이브 코드 리뷰" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">날짜 <span className="text-red-500">*</span></span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" /></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">시간</span><input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" /></label>
          </div>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">상세 설명</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-24 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="팀원들에게 안내할 상세 내용을 입력하세요." /></label>
          <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3"><i className="fas fa-info-circle mt-0.5 text-sm text-[#7C3AED]" /><p className="text-[11px] leading-relaxed font-medium text-gray-700">등록된 일정은 팀 워크스페이스 캘린더에 즉시 동기화되며, 모든 팀원에게 푸시 알림이 발송됩니다.</p></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button><button className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-save" />등록 및 배포</button></div>
      </form>
    </Modal>
  )
}

function EventDetailModal({ event, onClose, onDelete }: { event: CalendarEvent; onClose: () => void; onDelete: (event: CalendarEvent) => Promise<void> }) {
  const parsed = parseScheduleDescription(event.description)
  const meta = scheduleEventMeta(parsed.type)
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div><span className={`mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold shadow-sm ${meta.badge}`}><i className={`${meta.icon} mr-1`} />{meta.label}</span><h3 className="text-lg leading-tight font-extrabold text-gray-900">{event.title}</h3><p className="mt-1 text-xs font-bold text-gray-500"><i className="far fa-clock" /> {localDateKey(new Date(event.startAt))} {formatTime(event.startAt)}</p></div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="p-6"><p className="mb-1 text-[10px] font-bold text-gray-400">상세 안내</p><div className="min-h-[80px] rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed font-medium whitespace-pre-line text-gray-700">{parsed.description || '상세 설명이 없습니다.'}</div></div>
        <div className="flex items-center justify-between border-t border-gray-100 bg-white p-5"><button type="button" onClick={() => { if (window.confirm('이 일정을 삭제하시겠습니까?\n팀원들의 캘린더에서도 함께 삭제됩니다.')) void onDelete(event) }} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100"><i className="fas fa-trash-alt mr-1" />{parsed.type === 'team' ? '강제 삭제' : '일정 삭제'}</button><button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button></div>
      </div>
    </div>
  )
}

function ScheduleSuccessModal({ title, message, onClose }: { title: string; message: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#7C3AED] bg-purple-50 shadow-sm"><i className="fas fa-check text-3xl text-[#7C3AED]" /></div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-gray-500">{message}</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}

type FileFilter = 'all' | 'official' | 'shared' | 'link'
type FileViewMode = 'grid' | 'list'
type FileUploadMode = 'file' | 'link'

function FilesPage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<FileFilter>('all')
  const [viewMode, setViewMode] = useState<FileViewMode>('grid')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  const files = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.files
      .filter((file) => file.itemType !== 'FOLDER')
      .sort((a, b) => {
        const officialDiff = Number(isOfficialWorkspaceFile(b, data)) - Number(isOfficialWorkspaceFile(a, data))
        if (officialDiff !== 0) return officialDiff
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      })
      .filter((file) => {
        const official = isOfficialWorkspaceFile(file, data)
        if (filter === 'official' && !official) return false
        if (filter === 'shared' && official) return false
        if (filter === 'link' && file.itemType !== 'LINK') return false
        if (!query) return true
        const target = `${workspaceFileTitle(file)} ${file.uploadedByName ?? ''} ${file.objectKey ?? ''}`.toLowerCase()
        return target.includes(query)
      })
  }, [data, filter, search])

  async function saveResource(form: { mode: FileUploadMode; title: string; url: string; file: File | null }) {
    if (!workspaceId) return
    const title = form.title.trim()
    if (form.mode === 'link') {
      await createInstructorTeamFileLink(workspaceId, { title, url: form.url.trim() })
    } else if (form.file) {
      const body = new FormData()
      body.append('file', form.file)
      const uploaded = await uploadInstructorTeamWorkspaceFile(workspaceId, body)
      if (title && title !== workspaceFileTitle(uploaded)) {
        await updateInstructorTeamWorkspaceFile(uploaded.fileId, { name: title })
      }
    }
    pushTeamNotification(workspaceId, {
      title: form.mode === 'link' ? '외부 링크 공유' : '자료 등록',
      description: `"${title || form.file?.name || '새 자료'}" 자료가 등록되었습니다.`,
      href: buildHref('files', workspaceId),
      icon: form.mode === 'link' ? 'fas fa-link' : 'fas fa-folder-open',
    })
    setUploadOpen(false)
    setSuccessOpen(true)
    await reload()
  }

  async function deleteFile(file: WorkspaceFile) {
    if (!window.confirm('이 자료를 삭제하시겠습니까?')) return
    await deleteInstructorTeamWorkspaceFile(file.fileId)
    pushTeamNotification(workspaceId, {
      title: '자료 삭제',
      description: `"${workspaceFileTitle(file)}" 자료가 삭제되었습니다.`,
      href: buildHref('files', workspaceId),
      icon: 'fas fa-trash-alt',
    })
    setSelectedFile(null)
    await reload()
  }

  async function openFile(file: WorkspaceFile) {
    if (file.itemType === 'LINK') {
      const url = file.objectKey ?? ''
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    await downloadWorkspaceFile(file)
  }

  const counts = {
    all: data.files.filter((file) => file.itemType !== 'FOLDER').length,
    official: data.files.filter((file) => file.itemType !== 'FOLDER' && isOfficialWorkspaceFile(file, data)).length,
    shared: data.files.filter((file) => file.itemType !== 'FOLDER' && !isOfficialWorkspaceFile(file, data)).length,
    link: data.files.filter((file) => file.itemType === 'LINK').length,
  }

  return (
    <div className="instructor-team-files flex h-full flex-col">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold text-gray-900"><i className="fas fa-folder-open text-[#7C3AED]" />팀 통합 자료실 관리</h1>
          <p className="mt-2 text-sm text-gray-500">팀원들에게 공식 가이드라인을 배포하고, 학생들이 공유한 자료들을 관리(조회/삭제)하세요.</p>
        </div>
        <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black hover:shadow-xl">
          <i className="fas fa-cloud-upload-alt mr-2" />공식 자료 배포
        </button>
      </div>

      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-6">
          <FilesFilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="전체 자료" count={counts.all} />
          <FilesFilterButton active={filter === 'official'} onClick={() => setFilter('official')} label="내가 올린 공식 자료" count={counts.official} dotClass="bg-[#7C3AED]" />
          <FilesFilterButton active={filter === 'shared'} onClick={() => setFilter('shared')} label="팀원 공유 자료" count={counts.shared} dotClass="bg-indigo-500" />
          <FilesFilterButton active={filter === 'link'} onClick={() => setFilter('link')} label="외부 링크" count={counts.link} icon="fas fa-link" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button type="button" aria-label="그리드 보기" onClick={() => setViewMode('grid')} className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition ${viewMode === 'grid' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}><i className="fas fa-th-large" /></button>
            <button type="button" aria-label="리스트 보기" onClick={() => setViewMode('list')} className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition ${viewMode === 'list' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}><i className="fas fa-list" /></button>
          </div>
          <div className="relative">
            <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-64 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-9 text-sm font-medium outline-none transition focus:border-[#7C3AED] focus:bg-white" placeholder="파일명 또는 작성자 검색..." />
          </div>
        </div>
      </section>

      {files.length === 0 ? (
        <section className="flex min-h-[420px] flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-purple-50 text-3xl text-[#7C3AED]"><i className="far fa-folder-open" /></div>
          <h3 className="text-lg font-extrabold text-gray-900">공유된 자료가 없습니다.</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">공식 자료를 배포하거나 팀원이 공유한 링크와 파일이 등록되면 이곳에서 관리할 수 있습니다.</p>
          <button type="button" onClick={() => setUploadOpen(true)} className="mt-6 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-black">
            <i className="fas fa-cloud-upload-alt mr-2" />첫 자료 배포하기
          </button>
        </section>
      ) : (
        <section className={viewMode === 'grid' ? 'grid flex-1 content-start grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4' : 'flex flex-1 flex-col gap-3'}>
          {files.map((file) => (
            <WorkspaceFileCard key={file.fileId} file={file} data={data} viewMode={viewMode} onOpen={() => setSelectedFile(file)} onDelete={() => void deleteFile(file)} />
          ))}
        </section>
      )}

      {uploadOpen ? <FileUploadModal onClose={() => setUploadOpen(false)} onSubmit={saveResource} /> : null}
      {selectedFile ? <FileDetailModal file={selectedFile} data={data} onClose={() => setSelectedFile(null)} onDelete={() => void deleteFile(selectedFile)} onOpen={() => void openFile(selectedFile)} /> : null}
      {successOpen ? <FileSuccessModal onClose={() => setSuccessOpen(false)} /> : null}
    </div>
  )
}

function FilesFilterButton({ active, onClick, label, count, dotClass, icon }: { active: boolean; onClick: () => void; label: string; count: number; dotClass?: string; icon?: string }) {
  return (
    <button type="button" onClick={onClick} className={`team-files-filter-tab ${active ? 'active' : ''}`}>
      {dotClass ? <span className={`h-2 w-2 rounded-full ${dotClass}`} /> : null}
      {icon ? <i className={`${icon} text-[11px] ${active ? 'text-[#7C3AED]' : 'text-gray-400'}`} /> : null}
      <span>{label}</span>
      <span className="text-[10px] font-black text-gray-400">{count}</span>
    </button>
  )
}

function WorkspaceFileCard({ file, data, viewMode, onOpen, onDelete }: { file: WorkspaceFile; data: TeamData; viewMode: FileViewMode; onOpen: () => void; onDelete: () => void }) {
  const official = isOfficialWorkspaceFile(file, data)
  const title = workspaceFileTitle(file)
  const ext = workspaceFileExtension(file)
  const uploaderName = file.uploadedByName ?? (official ? data.dashboard?.ownerName : null) ?? '팀원'
  const meta = file.itemType === 'LINK' ? '새창 열기' : formatFileSize(file.fileSize)

  if (viewMode === 'list') {
    return (
      <article className="file-card group flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition" onClick={onOpen}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-xl"><i className={workspaceFileIconClass(file)} /></div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={official ? 'file-badge official' : 'file-badge shared'}>{official ? '멘토 공식' : '팀원 공유'}</span>
            <span className="file-ext-badge">{ext}</span>
          </div>
          <h3 className="truncate text-sm font-extrabold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs font-medium text-gray-400">{uploaderName} · {formatDate(file.createdAt)} · {meta}</p>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); onDelete() }} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
          <i className="far fa-trash-alt" />
        </button>
      </article>
    )
  }

  return (
    <article className="file-card group relative flex min-h-[230px] cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition" onClick={onOpen}>
      <button type="button" onClick={(event) => { event.stopPropagation(); onDelete() }} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-300 opacity-0 shadow-sm transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
        <i className="far fa-trash-alt text-xs" />
      </button>
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-2xl"><i className={workspaceFileIconClass(file)} /></div>
        <span className="file-ext-badge">{ext}</span>
      </div>
      <div className="min-h-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={official ? 'file-badge official' : 'file-badge shared'}>{official ? '멘토 공식' : '팀원 공유'}</span>
        </div>
        <h3 className="line-clamp-2 text-[15px] leading-snug font-extrabold text-gray-900">{title}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{file.itemType === 'LINK' ? file.objectKey : file.contentType || '팀 프로젝트 공유 자료'}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <img src={file.uploaderProfileImage ?? avatarUrl(uploaderName)} className="h-7 w-7 shrink-0 rounded-full bg-gray-100" alt="" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-gray-700">{uploaderName}</p>
            <p className="text-[10px] font-medium text-gray-400">{official ? 'Mentor' : 'Member'}</p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-gray-400">{meta}</span>
      </div>
    </article>
  )
}

function FileUploadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: { mode: FileUploadMode; title: string; url: string; file: File | null }) => Promise<void> }) {
  const [mode, setMode] = useState<FileUploadMode>('file')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [notify, setNotify] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'file' && !file) return
    setSaving(true)
    try {
      await onSubmit({ mode, title, url, file })
    } finally {
      setSaving(false)
    }
  }

  function pickFile(nextFile: File | undefined) {
    if (!nextFile) return
    setFile(nextFile)
    if (!title.trim()) setTitle(nextFile.name)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    pickFile(event.dataTransfer.files[0])
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <i className="fas fa-cloud-upload-alt text-[#7C3AED]" />공식 자료 배포
          </h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs font-medium text-[#7C3AED]">
            <i className="fas fa-info-circle" />강사님이 업로드하는 자료는 '멘토 공식' 뱃지와 함께 최상단에 고정됩니다.
          </div>

          <div className="flex border-b border-gray-200">
            <button type="button" onClick={() => setMode('file')} className={`flex-1 border-b-2 pb-2 text-sm font-bold transition ${mode === 'file' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>파일 업로드</button>
            <button type="button" onClick={() => setMode('link')} className={`flex-1 border-b-2 pb-2 text-sm font-bold transition ${mode === 'link' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>외부 링크 공유</button>
          </div>

          {mode === 'file' ? (
            <label onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} className={`upload-zone flex cursor-pointer flex-col items-center justify-center rounded-2xl p-8 text-center transition ${dragging ? 'dragging' : ''}`}>
              <input type="file" className="hidden" onChange={(event) => pickFile(event.target.files?.[0])} />
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-[#7C3AED] shadow-sm">
                <i className="fas fa-file-upload text-xl" />
              </div>
              <p className="mb-1 text-sm font-bold text-gray-700">{file ? file.name : '클릭하거나 파일을 이곳에 드롭하세요'}</p>
              <p className="text-[10px] text-gray-400">PDF, ZIP, 이미지 파일 등 (최대 100MB)</p>
            </label>
          ) : (
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-600">URL 링크 <span className="text-red-500">*</span></label>
              <input value={url} onChange={(event) => setUrl(event.target.value)} required={mode === 'link'} placeholder="https://" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-600">자료 제목 <span className="text-red-500">*</span></label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="어떤 자료인지 짧고 명확하게 적어주세요." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-600">설명 (선택)</label>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="자료에 대한 부연 설명을 적어주세요." className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#7C3AED]" />
              <span className="select-none text-xs font-bold text-gray-700">배포 완료 시 모든 팀원에게 푸시 알림 발송</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">취소</button>
          <button type="submit" disabled={saving || (mode === 'file' && !file)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
            <i className="fas fa-check" />{saving ? '배포 중' : '배포하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FileDetailModal({ file, data, onClose, onDelete, onOpen }: { file: WorkspaceFile; data: TeamData; onClose: () => void; onDelete: () => void; onOpen: () => void }) {
  const official = isOfficialWorkspaceFile(file, data)
  const title = workspaceFileTitle(file)
  const uploaderName = file.uploadedByName ?? (official ? data.dashboard?.ownerName : null) ?? '팀원'

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div className="pr-6">
            <span className={official ? 'file-detail-badge official' : 'file-detail-badge shared'}>{official ? '멘토 공식 자료' : '팀원 공유 자료'}</span>
            <h3 className="text-lg leading-tight font-extrabold text-gray-900">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">{file.itemType === 'LINK' ? file.objectKey : file.contentType || '설명이 작성되지 않은 자료입니다.'}</p>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <p className="mb-1 text-[10px] font-bold text-gray-400">업로더</p>
              <div className="flex items-center gap-2">
                <i className="fas fa-user-circle text-gray-400" />
                <span className="text-xs font-bold text-gray-800">{uploaderName}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[10px] font-bold text-gray-400">파일 정보</p>
              <span className="text-xs font-bold text-gray-800">{file.itemType === 'LINK' ? '링크' : formatFileSize(file.fileSize)} · {formatDate(file.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-white p-5">
          <button type="button" onClick={onDelete} className="flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-100"><i className="fas fa-trash-alt" />삭제</button>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200">닫기</button>
            <button type="button" onClick={onOpen} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
              <i className={file.itemType === 'LINK' ? 'fas fa-external-link-alt' : 'fas fa-download'} />{file.itemType === 'LINK' ? '원문 열기' : '다운로드'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FileSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#7C3AED] bg-purple-50 shadow-sm"><i className="fas fa-check text-3xl text-[#7C3AED]" /></div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">배포 완료!</h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-gray-500">자료가 성공적으로 팀 공간에 공유되었습니다.</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}

function workspaceFileTitle(file: WorkspaceFile) {
  return file.displayName || file.originalFileName || (file.itemType === 'LINK' ? '외부 링크' : '자료')
}

function isOfficialWorkspaceFile(file: WorkspaceFile, data: TeamData) {
  const ownerId = data.dashboard?.ownerId
  if (ownerId && file.uploadedById === ownerId) return true
  return Boolean(data.dashboard?.ownerName && file.uploadedByName === data.dashboard.ownerName)
}

function workspaceFileExtension(file: WorkspaceFile) {
  if (file.itemType === 'LINK') return 'LINK'
  const title = workspaceFileTitle(file)
  const ext = title.includes('.') ? title.split('.').pop()?.toUpperCase() : ''
  if (ext && ext.length <= 5) return ext
  if (file.contentType?.includes('pdf')) return 'PDF'
  if (file.contentType?.includes('zip')) return 'ZIP'
  if (file.contentType?.startsWith('image/')) return 'IMG'
  return 'FILE'
}

function workspaceFileIconClass(file: WorkspaceFile) {
  const title = workspaceFileTitle(file).toLowerCase()
  const ext = workspaceFileExtension(file).toLowerCase()
  if (file.itemType === 'LINK') return title.includes('figma') || file.objectKey?.includes('figma') ? 'fab fa-figma text-[#7C3AED]' : 'fas fa-link text-[#7C3AED]'
  if (ext === 'pdf') return 'far fa-file-pdf text-red-500'
  if (ext === 'zip') return 'far fa-file-archive text-yellow-600'
  if (['png', 'jpg', 'jpeg', 'gif', 'img'].includes(ext)) return 'far fa-file-image text-blue-500'
  if (['doc', 'docx'].includes(ext)) return 'far fa-file-word text-blue-600'
  return 'far fa-file-alt text-[#7C3AED]'
}

async function downloadWorkspaceFile(file: WorkspaceFile) {
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

type MeetingNoteFilter = 'all' | 'mentor' | 'team'

function MeetingPage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [meetupModalOpen, setMeetupModalOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null)
  const [filter, setFilter] = useState<MeetingNoteFilter>('all')
  const [success, setSuccess] = useState<{ title: string; description: ReactNode } | null>(null)
  const ownerId = data.dashboard?.ownerId
  const learners = membersOnly(data)
  const futureMeetups = data.events
    .filter((event) => parseScheduleDescription(event.description).type === 'meetup' && new Date(event.startAt).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const nextMeetup = futureMeetups[0] ?? null
  const activeVoiceCount = data.voiceChannels.reduce((sum, channel) => sum + channel.activeParticipantCount, 0)
  const onlineMembers = learners.filter((member) => member.online).slice(0, 4)
  const mentorNotes = data.notes.filter((note) => note.createdById === ownerId || !note.createdById)
  const teamNotes = data.notes.filter((note) => note.createdById && note.createdById !== ownerId)
  const visibleNotes = data.notes
    .filter((note) => filter === 'all' || (filter === 'mentor' ? mentorNotes.includes(note) : teamNotes.includes(note)))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())

  async function saveMeetup(form: { title: string; date: string; time: string; description: string }) {
    if (!workspaceId) return
    const startAt = `${form.date}T${form.time}:00`
    const endDate = new Date(startAt)
    endDate.setMinutes(endDate.getMinutes() + 90)
    await createInstructorTeamCalendarEvent(workspaceId, {
      title: form.title,
      description: buildScheduleDescription('meetup', form.description),
      startAt,
      endAt: localDateTimeInput(endDate),
    })
    pushTeamNotification(workspaceId, {
      title: '라이브 밋업 예약',
      description: `${form.date} ${form.time} · "${form.title}" 밋업이 예약되었습니다.`,
      href: buildHref('meeting', workspaceId),
      icon: 'fas fa-video',
    })
    setMeetupModalOpen(false)
    setSuccess({ title: '예약 완료!', description: <>라이브 밋업 일정이 예약되었으며,<br />팀원들에게 캘린더 연동 알림이 발송되었습니다.</> })
    await reload()
  }

  async function saveNote(form: { title: string; content: string }) {
    if (!workspaceId) return
    await createInstructorTeamMeetingNote(workspaceId, form)
    pushTeamNotification(workspaceId, {
      title: '공식 회의록 발행',
      description: `"${form.title}" 회의록이 발행되었습니다.`,
      href: buildHref('meeting', workspaceId),
      icon: 'fas fa-file-alt',
    })
    setNoteModalOpen(false)
    setSuccess({ title: '발행 완료!', description: <>멘토 공식 회의록이 아카이브에<br />성공적으로 발행되었습니다.</> })
    await reload()
  }

  async function deleteNote(note: MeetingNote) {
    if (!window.confirm('관리자(강사) 권한으로 해당 회의록을 삭제하시겠습니까?')) return
    await deleteInstructorTeamMeetingNote(note.noteId)
    pushTeamNotification(workspaceId, {
      title: '회의록 삭제',
      description: `"${note.title}" 회의록이 삭제되었습니다.`,
      href: buildHref('meeting', workspaceId),
      icon: 'fas fa-trash-alt',
    })
    setSelectedNote(null)
    await reload()
  }

  async function copyMeetingLink() {
    const url = `${window.location.origin}${buildHref('live-meeting', workspaceId)}`
    await navigator.clipboard?.writeText(url).catch(() => null)
    setSuccess({ title: '링크 복사 완료!', description: <>화상 회의 외부 접속 링크가<br />클립보드에 복사되었습니다.</> })
  }

  return (
    <div className="instructor-team-meeting space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-video text-[#7C3AED]" />화상 멘토링 & 회의록 관리</h1>
          <p className="mt-2 text-sm text-gray-500">라이브 밋업 방을 개설하여 멘토링을 진행하고, 팀원들을 위한 공식 회의록을 작성하세요.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setMeetupModalOpen(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"><i className="fas fa-calendar-plus" />새 밋업 예약</button>
          <button type="button" onClick={() => setNoteModalOpen(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"><i className="fas fa-pen-nib" />공식 회의록 발행</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="flex h-full flex-col space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-broadcast-tower text-[#7C3AED]" />다음 예정된 라이브 밋업 (Host)</h3>
          {nextMeetup ? (
            <div className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#7C3AED] opacity-10 blur-3xl transition duration-700 group-hover:scale-150" />
              <div className="relative flex h-32 shrink-0 flex-col justify-end bg-purple-900 p-6">
                <span className="relative z-10 mb-2 w-fit animate-pulse rounded border border-purple-500 bg-purple-700 px-2 py-1 text-xs font-extrabold text-white shadow-sm">ON AIR 준비중</span>
                <h4 className="relative z-10 text-lg leading-tight font-black text-white">{nextMeetup.title}</h4>
              </div>
              <div className="relative z-10 flex flex-1 flex-col p-6">
                <div className="mb-6 space-y-3">
                  <MeetingInfoRow icon="far fa-calendar-alt" text={formatMeetingDate(nextMeetup.startAt)} />
                  <MeetingInfoRow icon="far fa-clock" text={`${formatTime(nextMeetup.startAt)} ~ ${formatTime(nextMeetup.endAt) || '미정'}`} />
                </div>
                <p className="mb-6 flex-1 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">{parseScheduleDescription(nextMeetup.description).description || '등록된 아젠다가 없습니다.'}</p>
                <a href={buildHref('live-meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3.5 text-sm font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700"><i className="fas fa-video" />호스트로 밋업 시작하기 (ON AIR)</a>
                <button type="button" onClick={() => void copyMeetingLink()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50"><i className="fas fa-link" />외부 링크 공유</button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-[#7C3AED] shadow-sm"><i className="fas fa-calendar-times text-2xl" /></div>
              <h4 className="mb-2 text-lg font-bold text-gray-900">예정된 라이브 밋업이 없습니다</h4>
              <p className="mb-6 max-w-[250px] text-sm text-gray-500">팀원들과 실시간으로 소통할 수 있는 화상 멘토링 일정을 예약해 보세요.</p>
              <button type="button" onClick={() => setMeetupModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-700"><i className="fas fa-plus" />새 밋업 예약하기</button>
            </div>
          )}
        </section>

        <section className="flex h-full flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-headset text-[#4F46E5]" />학생 상시 회의장 (음성 채널)</h3>
            <span className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-500 shadow-sm">모니터링 전용</span>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className={`${activeVoiceCount > 0 ? 'bg-indigo-50' : 'bg-gray-50'} shrink-0 border-b border-gray-100 p-6`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`flex items-center gap-1.5 text-sm font-extrabold ${activeVoiceCount > 0 ? 'text-[#4F46E5]' : 'text-gray-500'}`}><i className={`fas fa-circle text-[8px] ${activeVoiceCount > 0 ? 'animate-pulse text-green-500' : 'text-gray-300'}`} />팀 보이스 챗</span>
                <span className={`rounded-full border bg-white px-2 py-0.5 text-xs font-bold ${activeVoiceCount > 0 ? 'border-indigo-200 text-[#4F46E5]' : 'border-gray-200 text-gray-500'}`}>{activeVoiceCount}명 접속 중</span>
              </div>
              <p className={`text-xs font-medium ${activeVoiceCount > 0 ? 'text-indigo-800' : 'text-gray-500'}`}>학생들이 자유롭게 사용하는 채널입니다. 필요시 입장하여 가이드할 수 있습니다.</p>
            </div>
            {activeVoiceCount > 0 ? (
              <div className="flex flex-1 flex-col bg-white p-6">
                <div className="mb-6 flex flex-1 flex-col justify-center rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-3 text-center text-xs font-bold text-gray-400">현재 접속 중인 멤버</p>
                  <div className="flex justify-center gap-6">
                    {(onlineMembers.length > 0 ? onlineMembers : learners.slice(0, Math.min(activeVoiceCount, 4))).map((member) => (
                      <div key={member.memberId} className="flex flex-col items-center gap-1">
                        <div className="relative">
                          <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-12 w-12 rounded-full border-2 border-green-400 bg-white shadow-sm" alt="" />
                          <span className="absolute right-0 bottom-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-green-500 text-[10px] text-white shadow-sm"><i className="fas fa-microphone" /></span>
                        </div>
                        <span className="mt-1 text-xs font-bold text-gray-700">{member.learnerName ?? '팀원'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-xs font-medium text-[#4F46E5]">팀원들이 음성 채널에서 협업 중입니다.</p>
                </div>
                <a href={buildHref('voice-channel', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#4F46E5] bg-white py-3.5 text-sm font-bold text-[#4F46E5] shadow-sm transition hover:bg-indigo-50"><i className="fas fa-phone-alt" />학생 채널 방문하기 (음성 연결)</a>
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center bg-white p-6">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300 shadow-sm"><i className="fas fa-microphone-slash text-2xl" /></div>
                <p className="mb-1 text-sm font-bold text-gray-400">현재 접속 중인 멤버가 없습니다</p>
                <p className="text-center text-xs leading-relaxed text-gray-400">학생들이 음성 채널에 접속하면<br />이곳에서 활동을 모니터링할 수 있습니다.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col justify-between gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-archive text-gray-400" />회의록 아카이브 모니터링</h3>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200/60 bg-gray-100 p-1 shadow-inner">
            <MeetingFilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="전체" count={data.notes.length} />
            <MeetingFilterButton active={filter === 'mentor'} onClick={() => setFilter('mentor')} label="내가 작성한 공식 회의록" count={mentorNotes.length} tone="mentor" />
            <MeetingFilterButton active={filter === 'team'} onClick={() => setFilter('team')} label="학생 작성 회의록" count={teamNotes.length} tone="team" />
          </div>
        </div>
        {visibleNotes.length === 0 ? (
          <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-16 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-[#7C3AED] shadow-sm"><i className="fas fa-archive text-2xl" /></div>
            <h3 className="mb-1 text-lg font-bold text-gray-900">등록된 회의록이 없습니다</h3>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400">멘토링 요약이나 팀원들의 스크럼 회의록이 이곳에 아카이빙됩니다.</p>
            <button type="button" onClick={() => setNoteModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-pen-nib" />첫 공식 회의록 발행하기</button>
          </div>
        ) : (
          <div className="grid auto-rows-stretch grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleNotes.map((note) => <MeetingNoteCard key={note.noteId} note={note} ownerId={ownerId} onClick={() => setSelectedNote(note)} />)}
          </div>
        )}
      </section>

      {meetupModalOpen ? <MeetupSetupModal onClose={() => setMeetupModalOpen(false)} onSubmit={saveMeetup} /> : null}
      {noteModalOpen ? <TeamNoteModal onClose={() => setNoteModalOpen(false)} onSubmit={saveNote} /> : null}
      {selectedNote ? <MeetingNoteDetailModal note={selectedNote} ownerId={ownerId} onClose={() => setSelectedNote(null)} onDelete={() => void deleteNote(selectedNote)} /> : null}
      {success ? <MeetingSuccessModal title={success.title} description={success.description} onClose={() => setSuccess(null)} /> : null}
    </div>
  )
}

function MeetingInfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className={icon} /></div>
      <span>{text}</span>
    </div>
  )
}

function MeetingFilterButton({ active, onClick, label, count, tone = 'default' }: { active: boolean; onClick: () => void; label: string; count: number; tone?: 'default' | 'mentor' | 'team' }) {
  const countClass = tone === 'mentor' ? 'bg-purple-50 text-[#7C3AED]' : tone === 'team' ? 'bg-indigo-50 text-[#4F46E5]' : 'bg-gray-200/80 text-gray-600'
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs transition-all duration-200 ${active ? 'bg-white font-bold text-gray-900 shadow-sm' : 'font-medium text-gray-500 hover:text-gray-900'}`}>
      <span>{label}</span>
      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${countClass} ${active ? '' : 'opacity-50'}`}>{count}</span>
    </button>
  )
}

function MeetingNoteCard({ note, ownerId, onClick }: { note: MeetingNote; ownerId?: number | null; onClick: () => void }) {
  const mentor = note.createdById === ownerId || !note.createdById
  return (
    <button type="button" onClick={onClick} className="hover-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-lg">
      <div className="mb-3 flex shrink-0 items-start justify-between">
        <span className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-extrabold ${mentor ? 'border-purple-200 bg-purple-50 text-[#7C3AED]' : 'border-indigo-200 bg-indigo-50 text-[#4F46E5]'}`}><i className={mentor ? 'fas fa-check-circle' : 'fas fa-users'} />{mentor ? '멘토 공식' : '학생 회의록'}</span>
        <span className="text-xs font-bold text-gray-400">{formatMeetingDate(note.createdAt)}</span>
      </div>
      <div className="flex-1">
        <h4 className="mb-2 line-clamp-2 text-sm leading-tight font-extrabold text-gray-900">{note.title}</h4>
        <p className="line-clamp-2 text-xs text-gray-500">{note.content || '회의록 내용이 없습니다.'}</p>
      </div>
    </button>
  )
}

function MeetupSetupModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: { title: string; date: string; time: string; description: string }) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', date: localDateKey(new Date()), time: '20:00', description: '' })
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-calendar-plus text-[#7C3AED]" />새 라이브 밋업 예약</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-800">밋업 주제 (제목) <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="예: 4주차 배포 관련 라이브 Q&A" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-800">날짜 <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-800">시간 <span className="text-red-500">*</span></label>
              <input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-800">아젠다 및 사전 준비사항</label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="팀원들이 밋업 전에 미리 준비해야 할 사항이나 논의할 안건을 적어주세요." className="h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
          <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60"><i className="fas fa-paper-plane" />{saving ? '예약 중' : '예약 및 알림 발송'}</button>
        </div>
      </form>
    </div>
  )
}

function TeamNoteModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: { title: string; content: string }) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', content: '' })
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-pen-nib text-[#7C3AED]" />멘토 공식 회의록 작성</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3">
            <i className="fas fa-info-circle mt-0.5 text-sm text-[#7C3AED]" />
            <p className="text-[11px] leading-relaxed font-medium text-gray-700">강사님이 작성하신 회의록은 팀 아카이브 최상단에 <span className="font-bold text-[#7C3AED]">멘토 공식</span> 뱃지와 함께 박제됩니다.</p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-800">회의/밋업 제목 <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="예: 3주차 라이브 코드 리뷰 내용 요약" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" />
          </div>
          <div>
            <div className="mb-2 flex items-end justify-between">
              <label className="block text-xs font-bold text-gray-800">회의 내용 및 피드백 요약 <span className="text-red-500">*</span></label>
              <span className="text-[10px] text-gray-400">마크다운(Markdown) 지원</span>
            </div>
            <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required placeholder="밋업에서 진행한 리뷰 내용이나 팀 전체에 공지할 다음 액션 아이템을 기록해주세요." className="h-64 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
          <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-700 disabled:opacity-60"><i className="fas fa-check" />{saving ? '발행 중' : '공식 문서로 발행'}</button>
        </div>
      </form>
    </div>
  )
}

function MeetingNoteDetailModal({ note, ownerId, onClose, onDelete }: { note: MeetingNote; ownerId?: number | null; onClose: () => void; onDelete: () => void }) {
  const mentor = note.createdById === ownerId || !note.createdById
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div className="pr-8">
            <span className={`mb-2 inline-block rounded border px-2 py-0.5 text-xs font-extrabold ${mentor ? 'border-purple-200 bg-purple-50 text-[#7C3AED]' : 'border-indigo-200 bg-indigo-50 text-[#4F46E5]'}`}>{mentor ? '멘토 공식' : '팀 스크럼'}</span>
            <h3 className="mb-1 text-lg leading-tight font-extrabold text-gray-900">{note.title}</h3>
            <p className="text-xs font-bold text-gray-400">{formatMeetingDate(note.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div className="whitespace-pre-line text-sm leading-relaxed font-medium text-gray-700">{note.content || '회의록 상세 내용이 없습니다.'}</div>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-white p-5">
          <button type="button" onClick={onDelete} className="flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100"><i className="fas fa-trash-alt" />삭제</button>
          <button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">닫기</button>
        </div>
      </div>
    </div>
  )
}

function MeetingSuccessModal({ title, description, onClose }: { title: string; description: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-[#7C3AED] shadow-sm"><i className="fas fa-check text-3xl" /></div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-gray-500">{description}</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}

function formatMeetingDate(value?: string | null) {
  if (!value) return '일정 없음'
  const date = new Date(value)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).replace(/\. /g, '.').replace('.', '.')
}

function StreamVideo({ stream, className, muted = false }: { stream: MediaStream | null; className: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  return <video ref={videoRef} className={className} autoPlay playsInline muted={muted} />
}

function LiveMeetingPage({ data, workspaceId }: { data: TeamData; workspaceId: number | null }) {
  const session = useMemo(() => readStoredAuthSession(), [])
  const [sideTab, setSideTab] = useState<'chat' | 'users'>('users')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [recording, setRecording] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [mutedAll, setMutedAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; content: string; own?: boolean; time: string }>>([])
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const liveParticipants: WorkspaceMember[] = []
  const hostName = data.dashboard?.ownerName ?? session?.name ?? '강사'
  const participantCount = liveParticipants.length + 1

  function stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop())
  }

  async function ensureLocalStream() {
    if (localStreamRef.current) return localStreamRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('현재 브라우저에서 카메라와 마이크를 사용할 수 없습니다.')
      return null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      setLocalStream(stream)
      setMicOn(true)
      setCamOn(true)
      setError(null)
      return stream
    } catch {
      setError('카메라 또는 마이크 권한을 허용해야 라이브 미팅을 시작할 수 있습니다.')
      return null
    }
  }

  useEffect(() => {
    void ensureLocalStream()
    return () => {
      mediaRecorderRef.current?.stop()
      stopStream(localStreamRef.current)
      stopStream(screenStreamRef.current)
    }
  }, [])

  function leaveMeeting() {
    mediaRecorderRef.current?.stop()
    stopStream(localStreamRef.current)
    stopStream(screenStreamRef.current)
    window.location.href = buildHref('meeting', workspaceId)
  }

  async function toggleMic() {
    const stream = await ensureLocalStream()
    if (!stream) return
    const enabled = !micOn
    stream.getAudioTracks().forEach((track) => { track.enabled = enabled })
    setMicOn(enabled)
  }

  async function toggleCam() {
    const stream = await ensureLocalStream()
    if (!stream) return
    const enabled = !camOn
    stream.getVideoTracks().forEach((track) => { track.enabled = enabled })
    setCamOn(enabled)
  }

  async function toggleScreenShare() {
    if (screenStreamRef.current) {
      stopStream(screenStreamRef.current)
      screenStreamRef.current = null
      setScreenStream(null)
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('현재 브라우저에서 화면 공유를 사용할 수 없습니다.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      screenStreamRef.current = stream
      setScreenStream(stream)
      setError(null)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        screenStreamRef.current = null
        setScreenStream(null)
      })
    } catch {
      setError('화면 공유가 취소되었거나 권한이 허용되지 않았습니다.')
    }
  }

  async function toggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      return
    }
    const sourceStream = screenStreamRef.current ?? localStreamRef.current ?? await ensureLocalStream()
    if (!sourceStream) return
    if (typeof MediaRecorder === 'undefined') {
      setError('현재 브라우저에서 녹화를 사용할 수 없습니다.')
      return
    }
    const recorder = new MediaRecorder(sourceStream)
    recordedChunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      setRecording(false)
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' })
      if (!blob.size) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `devpath-team-live-meeting-${Date.now()}.webm`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setRecording(true)
    setError(null)
  }

  function sendChat() {
    const content = message.trim()
    if (!content) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMessages((current) => [...current, { id: Date.now(), sender: '나 (Host)', content, own: true, time }])
    setMessage('')
  }

  function muteAll() {
    if (liveParticipants.length === 0) {
      setMessages((current) => [...current, { id: Date.now(), sender: '시스템', content: '현재 음소거 요청을 보낼 참가자가 없습니다.', time: formatTime(new Date().toISOString()) }])
      return
    }
    setMutedAll(true)
    setMessages((current) => [...current, { id: Date.now(), sender: '시스템', content: '나를 제외한 참가자에게 음소거 요청을 보냈습니다.', time: formatTime(new Date().toISOString()) }])
  }

  return (
    <div className="instructor-team-live-meeting flex h-screen flex-col overflow-hidden bg-gray-950 text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={leaveMeeting} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white"><i className="fas fa-arrow-left" /></button>
          <div>
            <div className="mb-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-red-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />ON AIR</span>
              <span className="rounded border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-400">강사 (Host)</span>
              {recording ? <span className="flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[9px] font-extrabold text-gray-300"><i className="fas fa-circle text-[8px] text-red-500 recording-pulse" />REC</span> : null}
            </div>
            <h1 className="text-sm leading-none font-bold text-white">3주차 라이브 코드 리뷰</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 font-mono text-xs text-gray-300"><i className="far fa-clock" />{formatTime(new Date().toISOString())}</div>
          <button type="button" onClick={() => setSidebarOpen((current) => !current)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white">
            <i className="fas fa-users" />
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-gray-900 bg-[#7C3AED] text-[9px] font-bold text-white">{participantCount}</span>
          </button>
        </div>
      </header>

      {error ? <div className="shrink-0 bg-red-600 px-6 py-2 text-xs font-bold text-white">{error}</div> : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="relative flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div className={`group relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border shadow-inner transition ${screenStream ? 'border-[#7C3AED]/50 bg-black shadow-[0_0_20px_rgba(124,58,237,0.15)]' : 'border-gray-800 bg-gray-950'}`}>
            {screenStream ? (
              <>
                <StreamVideo stream={screenStream} muted className="absolute inset-0 h-full w-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="flex items-center gap-2 rounded-lg border border-purple-400/30 bg-black/60 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-md"><i className="fas fa-desktop text-[#A78BFA]" />내가 화면을 공유 중입니다</span>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black p-6">
                  {localStream && camOn ? (
                    <StreamVideo stream={localStream} muted className="mb-4 h-40 w-40 rounded-full border-4 border-[#7C3AED] bg-gray-800 object-cover shadow-2xl" />
                  ) : (
                    <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full border-4 border-gray-700 bg-gray-800 text-gray-600"><i className="fas fa-video-slash text-4xl" /></div>
                  )}
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white"><span>{hostName} (강사)</span><i className={`fas ${micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-500'} text-sm`} /></h3>
                  <p className={`mt-1 text-xs font-medium ${camOn ? 'text-purple-400' : 'text-gray-500'}`}>{camOn ? '카메라 송출 중' : '카메라 꺼짐'}</p>
                </div>
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="flex items-center gap-2 rounded-lg border border-gray-700 bg-black/60 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-md"><i className="fas fa-video text-[#A78BFA]" />메인 카메라 뷰</span>
                </div>
              </>
            )}
          </div>

          <div className="grid h-36 shrink-0 grid-cols-2 gap-3 md:grid-cols-4">
            {liveParticipants.length === 0 ? Array.from({ length: 4 }).map((_, index) => <WaitingTile key={index} />) : liveParticipants.map((member, index) => (
              <ParticipantTile key={member.memberId} member={member} handRaised={index === 0 && handRaised} mutedAll={mutedAll} onLowerHand={() => setHandRaised(false)} />
            ))}
          </div>
        </main>

        <aside className={`flex h-full shrink-0 flex-col border-l border-gray-800 bg-gray-900 transition-all duration-300 ${sidebarOpen ? 'w-80 opacity-100' : 'w-0 overflow-hidden border-none opacity-0'}`}>
          <div className="flex shrink-0 border-b border-gray-800">
            <button type="button" onClick={() => setSideTab('chat')} className={`flex-1 border-b-2 py-4 text-sm font-bold transition ${sideTab === 'chat' ? 'border-[#7C3AED] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>실시간 채팅</button>
            <button type="button" onClick={() => setSideTab('users')} className={`flex-1 border-b-2 py-4 text-sm font-bold transition ${sideTab === 'users' ? 'border-[#7C3AED] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>참가자 관리 ({participantCount})</button>
          </div>
          {sideTab === 'chat' ? (
            <>
              <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto p-4">
                <div className="my-2 shrink-0 text-center"><span className="rounded-full bg-gray-800 px-3 py-1 text-[10px] font-medium text-gray-400">멘토링 라이브 룸이 열렸습니다.</span></div>
                {messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center pb-10 text-gray-500 opacity-60">
                    <i className="far fa-comments mb-3 text-4xl text-gray-600" />
                    <p className="mb-1 text-sm font-bold text-gray-400">아직 채팅이 없습니다</p>
                    <p className="text-center text-xs leading-relaxed text-gray-500">팀원들이 화상 멘토링 방에 입장하면<br />이곳에서 실시간 대화가 정렬됩니다.</p>
                  </div>
                ) : messages.map((item) => (
                  <div key={item.id} className={`mb-4 flex items-start gap-3 ${item.own ? 'flex-row-reverse' : ''}`}>
                    <img src={avatarUrl(item.sender)} className="h-8 w-8 shrink-0 rounded-full border border-gray-700 bg-gray-800" alt="" />
                    <div className={item.own ? 'flex flex-col items-end' : ''}>
                      <div className={`mb-1 flex items-center gap-2 ${item.own ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-xs font-bold ${item.own ? 'text-[#A78BFA]' : 'text-gray-300'}`}>{item.sender}</span>
                        <span className="text-[9px] text-gray-500">{item.time}</span>
                      </div>
                      <p className={`max-w-[220px] break-all p-3 text-sm font-medium shadow-md ${item.own ? 'rounded-b-xl rounded-tl-xl bg-[#7C3AED] text-white' : 'rounded-b-xl rounded-tr-xl bg-gray-800 text-gray-200'}`}>{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-gray-800 bg-gray-900 p-4">
                <div className="flex gap-2 rounded-xl border border-gray-700 bg-gray-800 p-2 transition focus-within:border-[#7C3AED]">
                  <input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendChat() }} className="flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-gray-500" placeholder="메시지 보내기..." />
                  <button type="button" onClick={sendChat} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED] text-white transition hover:bg-purple-600"><i className="fas fa-paper-plane text-xs" /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-800 p-4">
                <span className="text-xs font-bold text-gray-400">전체 인원 제어</span>
                <button type="button" onClick={muteAll} className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-[10px] font-bold text-gray-300 transition hover:bg-gray-700">모두 음소거</button>
              </div>
              <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
                <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/40 p-2.5">
                  <div className="flex items-center gap-3">
                    <img src={avatarUrl(hostName)} className="h-8 w-8 rounded-full border border-[#7C3AED]" alt="" />
                    <div><span className="block text-sm leading-tight font-bold text-[#A78BFA]">나 ({hostName})</span><span className="mt-0.5 inline-block rounded bg-[#7C3AED] px-1.5 py-0.5 text-[10px] font-bold text-white">Host</span></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <i className={`fas fa-desktop ${screenStream ? 'animate-pulse text-[#A78BFA]' : 'text-gray-600'}`} />
                    <i className={`fas ${micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-500'}`} />
                    <i className={`fas ${camOn ? 'fa-video text-gray-300' : 'fa-video-slash text-red-500'}`} />
                  </div>
                </div>
                {liveParticipants.map((member, index) => (
                  <div key={member.memberId} className={`flex items-center justify-between rounded p-2 transition ${index === 0 && handRaised ? 'border border-gray-700 bg-gray-800/50' : 'hover:bg-gray-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-8 w-8 rounded-full border border-gray-600" alt="" />
                        {index === 0 && handRaised ? <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-yellow-500 text-[8px] text-white">✋</div> : null}
                      </div>
                      <div><span className="block text-sm font-bold text-gray-200">{member.learnerName ?? '팀원'}</span><span className="inline-block rounded border border-blue-500/30 bg-blue-500/20 px-1 text-[8px] text-blue-400">{member.roleLabel ?? shortRoleLabel(member.position) ?? 'Member'}</span></div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {index === 0 && handRaised ? <button type="button" onClick={() => setHandRaised(false)} className="rounded bg-gray-700 px-1.5 py-0.5 text-[9px] text-white transition hover:bg-gray-600">손 내리기</button> : null}
                      <i className={`fas fa-microphone-slash ${mutedAll ? 'text-red-500' : 'text-gray-500'}`} />
                      <i className="fas fa-video" />
                    </div>
                  </div>
                ))}
                {liveParticipants.length === 0 ? <div className="mt-4 flex flex-col items-center justify-center p-8 text-center text-gray-600"><i className="fas fa-users-slash mb-2 text-2xl opacity-30" /><p className="text-xs leading-relaxed font-medium">입장 대기 중인 팀원이 없습니다.<br />접속 요청 시 알림이 전송됩니다.</p></div> : null}
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="relative z-30 flex h-20 shrink-0 items-center justify-center border-t border-gray-800 bg-gray-950 px-6">
        <div className="flex items-center gap-3 md:gap-4">
          <button type="button" onClick={() => void toggleMic()} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${micOn ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-red-500/30 bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}><i className={micOn ? 'fas fa-microphone' : 'fas fa-microphone-slash'} /></button>
          <button type="button" onClick={() => void toggleCam()} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${camOn ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-red-500/30 bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}><i className={camOn ? 'fas fa-video' : 'fas fa-video-slash'} /></button>
          <button type="button" onClick={() => void toggleScreenShare()} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg transition ${screenStream ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-900/50 hover:bg-purple-600' : 'border border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}><i className="fas fa-desktop" /></button>
          <div className="mx-2 h-8 w-px bg-gray-800" />
          <button type="button" onClick={() => void toggleRecord()} className={`group relative flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${recording ? 'border-red-500/50 bg-red-500/20 text-red-500' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'}`}><i className="fas fa-circle text-sm" /><div className="pointer-events-none absolute -top-8 rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100 whitespace-nowrap">밋업 녹화하기</div></button>
          <div className="mx-2 h-8 w-px bg-gray-800" />
          <button type="button" onClick={() => setEndModalOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-6 font-bold text-white shadow-lg shadow-red-900/50 transition hover:bg-red-700"><i className="fas fa-phone-slash" /><span className="hidden md:inline">회의 종료</span></button>
        </div>
      </footer>

      {endModalOpen ? (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-extrabold text-white">방을 나가시겠습니까?</h3>
            <p className="mb-6 text-sm text-gray-400">호스트 권한입니다. 나 혼자 나갈지, 전체 회의를 종료시킬지 선택하세요.</p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={leaveMeeting} className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700">모두를 위해 회의 종료</button>
              <button type="button" onClick={leaveMeeting} className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 text-sm font-bold text-white transition hover:bg-gray-700">나만 방 나가기 (호스트 위임)</button>
              <button type="button" onClick={() => setEndModalOpen(false)} className="mt-2 w-full rounded-xl bg-transparent py-2 text-sm font-bold text-gray-500 transition hover:text-gray-300">취소</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function WaitingTile() {
  return (
    <div className="flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-800/60 bg-gray-800/20 text-gray-500/80 transition hover:bg-gray-800/30">
      <i className="fas fa-user-clock mb-1.5 text-xl opacity-40" />
      <span className="text-xs font-semibold tracking-wide">팀원 대기 중...</span>
    </div>
  )
}

function ParticipantTile({ member, handRaised, mutedAll, onLowerHand }: { member: WorkspaceMember; handRaised: boolean; mutedAll: boolean; onLowerHand: () => void }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-gray-800 ${handRaised ? 'border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border border-gray-700'}`}>
      <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="absolute inset-0 h-full w-full bg-gray-700 object-cover" alt="" />
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
        <i className={`fas fa-microphone-slash ${mutedAll ? 'text-red-500' : 'text-gray-400'}`} />{member.learnerName ?? '팀원'} ({member.roleLabel ?? shortRoleLabel(member.position) ?? 'Member'})
      </div>
      {handRaised ? <button type="button" onClick={onLowerHand} className="absolute top-2 right-2 flex animate-bounce items-center gap-1 rounded-full bg-yellow-500 px-2 py-1 text-[10px] font-bold text-white shadow-lg"><i className="fas fa-hand-paper" />질문 있음</button> : null}
    </div>
  )
}

function VoiceChannelPage({ data, workspaceId }: { data: TeamData; workspaceId: number | null }) {
  const [muted, setMuted] = useState(false)
  const learners = membersOnly(data)
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-900 px-6"><div className="flex items-center gap-4"><a href={buildHref('meeting', workspaceId)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400"><i className="fas fa-arrow-left" /></a><h1 className="text-sm font-bold"><i className="fas fa-headset mr-2 text-[#7C3AED]" />팀 음성 채널</h1></div><span className="text-xs text-gray-400">{learners.length + 1}명 접속 가능</span></header>
      <main className="flex flex-1 flex-col items-center justify-center p-8"><div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">{[data.dashboard?.ownerName ?? '멘토', ...learners.map((m) => m.learnerName ?? '팀원')].map((name, index) => <div key={`${name}-${index}`} className="text-center"><div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border border-purple-500/40 bg-gray-900"><img src={avatarUrl(name)} className="h-20 w-20 rounded-full" alt="" /></div><p className="text-sm font-bold">{name}</p><p className="mt-1 text-[10px] text-gray-500">{index === 0 ? 'Host' : '대기 중'}</p></div>)}</div><button onClick={() => setMuted(!muted)} className={`h-16 w-16 rounded-full text-xl ${muted ? 'bg-red-600' : 'bg-[#7C3AED]'}`}><i className={muted ? 'fas fa-microphone-slash' : 'fas fa-microphone'} /></button></main>
    </div>
  )
}

export default function InstructorTeamWsDashboardApp({ page = 'dashboard' }: { page?: InstructorTeamWsPage }) {
  const session = useMemo(() => readStoredAuthSession(), [])
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [data, setData] = useState<TeamData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const realtimeRefreshRef = useRef(false)

  async function reload() {
    if (!workspaceId) return
    setData(await loadInstructorTeamWorkspaceData(workspaceId))
  }

  async function refreshRealtimeData() {
    if (!workspaceId || document.hidden || realtimeRefreshRef.current) return
    realtimeRefreshRef.current = true
    try {
      setData(await loadInstructorTeamWorkspaceData(workspaceId))
    } catch {
      // 실시간 보조 갱신 실패는 화면을 에러 상태로 밀지 않는다.
    } finally {
      realtimeRefreshRef.current = false
    }
  }

  useEffect(() => {
    document.title = `DevPath - ${PAGE_CONFIG[page].title}`
  }, [page])

  useEffect(() => {
    if (!session) {
      showAuthToast('로그인이 필요합니다.')
      setAuthView('login')
      setLoading(false)
      return
    }
    if (!workspaceId) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    loadInstructorTeamWorkspaceData(workspaceId, controller.signal)
      .then(setData)
      .catch((nextError) => {
        if (!controller.signal.aborted) setError(nextError instanceof Error ? nextError.message : '데이터 로딩 실패')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [session, workspaceId])

  useEffect(() => {
    if (!session || !workspaceId || loading) return undefined
    const timer = window.setInterval(() => {
      void refreshRealtimeData()
    }, TEAM_WORKSPACE_REFRESH_INTERVAL_MS)
    const refreshOnFocus = () => {
      void refreshRealtimeData()
    }
    const refreshOnVisible = () => {
      if (!document.hidden) void refreshRealtimeData()
    }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [session, workspaceId, loading])

  if (authView) {
    return <AuthModal view={authView} onViewChange={setAuthView} onAuthenticated={() => { setAuthView(null); window.location.reload() }} onClose={() => { clearStoredAuthSession(); window.location.href = '/' }} />
  }
  if (!workspaceId) return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm font-bold text-gray-500">워크스페이스를 선택해주세요.</div>
  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8F9FA] text-sm font-bold text-gray-500"><i className="fas fa-spinner fa-spin mr-2 text-[#7C3AED]" />팀 프로젝트 워크스페이스를 불러오는 중입니다.</div>
  if (error) return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm font-bold text-red-500"><i className="fas fa-exclamation-triangle mr-2" />{error}</div>
  if (page === 'live-meeting') return <LiveMeetingPage data={data} workspaceId={workspaceId} />
  if (page === 'voice-channel') return <VoiceChannelPage data={data} workspaceId={workspaceId} />

  const content =
    page === 'milestone' ? <MilestonePage data={data} workspaceId={workspaceId} reload={reload} />
      : page === 'kanban' ? <KanbanPage data={data} workspaceId={workspaceId} reload={reload} />
        : page === 'architecture' ? <ArchitecturePage data={data} workspaceId={workspaceId} reload={reload} />
          : page === 'qna' ? <QnaPage data={data} workspaceId={workspaceId} reload={reload} />
            : page === 'schedule' ? <SchedulePage data={data} workspaceId={workspaceId} reload={reload} />
              : page === 'files' ? <FilesPage data={data} workspaceId={workspaceId} reload={reload} />
                : page === 'meeting' ? <MeetingPage data={data} workspaceId={workspaceId} reload={reload} />
                  : <DashboardPage data={data} workspaceId={workspaceId} />

  return <TeamShell page={page} workspaceId={workspaceId} data={data}>{content}</TeamShell>
}
