import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import { clearStoredAuthSession, readStoredAuthSession, refreshStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import {
  createInstructorWorkspaceCalendarEvent,
  createInstructorWorkspaceFileLink,
  createInstructorWorkspaceNotice,
  createInstructorWorkspaceQuestionAnswer,
  createInstructorWorkspaceTask,
  deleteInstructorWorkspaceCalendarEvent,
  deleteInstructorWorkspaceFile,
  deleteInstructorWorkspaceMeetingNote,
  fetchInstructorWorkspaceQuestionDetail,
  saveInstructorWorkspaceMeetingNote,
  saveInstructorWorkspaceMeetingSettings,
  updateInstructorWorkspaceFile,
  updateInstructorWorkspaceTask,
  uploadInstructorWorkspaceFile,
} from './instructor-workspace-api'
import type { ApiEnvelope } from './project-api'

import type {
  ActivityLogItem,
  CalendarEvent,
  InstructorWsPage,
  MeetingNote,
  MeetingSettings,
  QuestionDetail,
  QuestionSummary,
  TaskStatus,
  WorkspaceDashboard,
  WorkspaceData,
  WorkspaceDocResponse,
  WorkspaceFile,
  WorkspaceMember,
  WorkspaceNotice,
  WorkspaceNotification,
  WorkspaceNotificationDraft,
  WorkspaceTask,
} from './instructor-workspace-types'

type WorkspaceAuthSession = NonNullable<ReturnType<typeof readStoredAuthSession>>

const PAGE_CONFIG: Record<InstructorWsPage, { path: string; label: string; title: string; icon: string; section: 'admin' | 'resources' }> = {
  dashboard: { path: '/instructor-ws-dashboard', label: '대시보드 홈', title: '워크스페이스 대시보드', icon: 'fas fa-chart-pie', section: 'admin' },
  assignments: { path: '/instructor-ws-assignments', label: '전체 과제 현황', title: '전체 과제 현황', icon: 'fas fa-tasks', section: 'admin' },
  students: { path: '/instructor-ws-students', label: '수강생 & 학습 상담', title: '수강생 & 학습 상담', icon: 'fas fa-user-graduate', section: 'admin' },
  qna: { path: '/instructor-ws-qna', label: '멘토 Q&A 관리', title: '멘토 Q&A 관리', icon: 'fas fa-comments', section: 'admin' },
  schedule: { path: '/instructor-ws-schedule', label: '공식 일정 관리', title: '공식 일정 관리', icon: 'fas fa-calendar-check', section: 'resources' },
  files: { path: '/instructor-ws-files', label: '공식 자료실 관리', title: '공식 자료실 관리', icon: 'fas fa-folder-open', section: 'resources' },
  meeting: { path: '/instructor-ws-meeting', label: '화상 멘토링', title: '화상 멘토링 관리', icon: 'fas fa-video', section: 'resources' },
  'live-meeting': { path: '/instructor-ws-live-meeting', label: '라이브 룸', title: '라이브 멘토링 룸', icon: 'fas fa-broadcast-tower', section: 'resources' },
}

const EMPTY_DATA: WorkspaceData = {
  dashboard: null,
  tasks: [],
  events: [],
  questions: [],
  notices: [],
  files: [],
  meetingNotes: [],
  meetingSettings: null,
  activityLogs: [],
}

const WORKSPACE_NOTIFICATION_EVENT = 'devpath-instructor-ws-notification'
const MAX_WORKSPACE_NOTIFICATIONS = 40
const WORKSPACE_REFRESH_INTERVAL_MS = 5000

function getWorkspaceIdFromUrl(): number | null {
  const parsed = Number(new URLSearchParams(window.location.search).get('workspaceId'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function buildHref(page: InstructorWsPage, workspaceId: number | null) {
  return `${PAGE_CONFIG[page].path}${workspaceId ? `?workspaceId=${workspaceId}` : ''}`
}

function workspaceNotificationStorageKey(workspaceId: number | null) {
  return `devpath:instructor-ws:${workspaceId ?? 'none'}:notifications`
}

function workspaceNotificationReadStorageKey(workspaceId: number | null) {
  return `devpath:instructor-ws:${workspaceId ?? 'none'}:notifications:read`
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

function readStoredWorkspaceNotifications(workspaceId: number | null) {
  return readStoredArray<WorkspaceNotification>(workspaceNotificationStorageKey(workspaceId))
}

function writeStoredWorkspaceNotifications(workspaceId: number | null, notifications: WorkspaceNotification[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(workspaceNotificationStorageKey(workspaceId), JSON.stringify(notifications.slice(0, MAX_WORKSPACE_NOTIFICATIONS)))
}

function readWorkspaceNotificationIds(workspaceId: number | null) {
  return readStoredArray<string>(workspaceNotificationReadStorageKey(workspaceId))
}

function writeWorkspaceNotificationIds(workspaceId: number | null, ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(workspaceNotificationReadStorageKey(workspaceId), JSON.stringify(ids.slice(-200)))
}

function pushWorkspaceNotification(workspaceId: number | null, draft: WorkspaceNotificationDraft) {
  if (!workspaceId || typeof window === 'undefined') return
  const notification: WorkspaceNotification = {
    ...draft,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: draft.createdAt ?? new Date().toISOString(),
    source: 'local',
  }
  const next = [notification, ...readStoredWorkspaceNotifications(workspaceId).filter((item) => item.id !== notification.id)].slice(0, MAX_WORKSPACE_NOTIFICATIONS)
  writeStoredWorkspaceNotifications(workspaceId, next)
  window.dispatchEvent(new CustomEvent(WORKSPACE_NOTIFICATION_EVENT, { detail: { workspaceId, notification } }))
}

function getVoiceIceServers(): RTCIceServer[] {
  return [{ urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }]
}

function buildVoiceSignalingUrl(channelId: number, accessToken: string) {
  const configuredUrl = (import.meta.env.VITE_VOICE_SIGNALING_URL as string | undefined)?.trim()
  const fallbackUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/voice-signaling`
  const url = new URL(configuredUrl || fallbackUrl, window.location.href)
  url.searchParams.set('channelId', String(channelId))
  url.searchParams.set('token', accessToken)
  return url.toString()
}

function avatarUrl(seed?: string | null) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'mentor')}`
}

function optionalRequest<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback)
}

async function workspaceApiRequest<T>(
  path: string,
  session: WorkspaceAuthSession,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)

  const response = await fetch(path, { ...init, headers })
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`)
  }

  return payload.data
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

type CalendarEventType = 'meetup' | 'deadline' | 'special'

const EVENT_TYPE_META = 'DP_EVENT_TYPE'
const MEETING_NOTE_META = 'DP_MEETING_NOTE'

const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; icon: string; badge: string; dot: string }> = {
  meetup: { label: '라이브 밋업', icon: 'fas fa-video', badge: 'bg-blue-500 text-white', dot: 'bg-blue-500' },
  deadline: { label: '과제 마감', icon: 'fas fa-flag-checkered', badge: 'bg-red-500 text-white', dot: 'bg-red-500' },
  special: { label: '특별 세션', icon: 'fas fa-star', badge: 'bg-[#7C3AED] text-white', dot: 'bg-[#7C3AED]' },
}

const EVENT_LIST_TONE: Record<CalendarEventType, { border: string; bg: string; badge: string }> = {
  meetup: { border: 'border-blue-100', bg: 'bg-blue-50/50', badge: 'bg-blue-500 text-white' },
  deadline: { border: 'border-red-100', bg: 'bg-red-50/50', badge: 'bg-red-500 text-white' },
  special: { border: 'border-purple-100', bg: 'bg-purple-50/50', badge: 'bg-[#7C3AED] text-white' },
}

function encodeEventDescription(type: CalendarEventType, description: string) {
  return `[${EVENT_TYPE_META}:${type}]\n${description.trim()}`
}

function eventTypeOf(event: CalendarEvent): CalendarEventType {
  const matched = event.description?.match(new RegExp(`\\[${EVENT_TYPE_META}:(meetup|deadline|special)\\]`))
  if (matched?.[1]) return matched[1] as CalendarEventType
  const text = `${event.title} ${event.description ?? ''}`
  if (/마감|deadline/i.test(text)) return 'deadline'
  if (/특강|special/i.test(text)) return 'special'
  return 'meetup'
}

function eventDescriptionOf(event: CalendarEvent) {
  return (event.description ?? '').replace(new RegExp(`\\[${EVENT_TYPE_META}:(meetup|deadline|special)\\]\\n?`), '').trim()
}

function encodeMeetingNoteContent(week: string, date: string, content: string) {
  return `[${MEETING_NOTE_META}:${JSON.stringify({ week, date })}]\n${content.trim()}`
}

function meetingNoteMetaOf(note: MeetingNote) {
  const raw = note.content ?? ''
  const matched = raw.match(new RegExp(`\\[${MEETING_NOTE_META}:(.*?)\\]\\n?`))
  if (!matched?.[1]) {
    return { week: '0', date: note.createdAt?.slice(0, 10) ?? '' }
  }
  try {
    const parsed = JSON.parse(matched[1]) as { week?: string; date?: string }
    return { week: parsed.week ?? '0', date: parsed.date ?? note.createdAt?.slice(0, 10) ?? '' }
  } catch {
    return { week: '0', date: note.createdAt?.slice(0, 10) ?? '' }
  }
}

function meetingNoteContentOf(note: MeetingNote) {
  return (note.content ?? '').replace(new RegExp(`\\[${MEETING_NOTE_META}:.*?\\]\\n?`), '').trim()
}

function meetingNoteDateLabel(value?: string | null) {
  if (!value) return '일자 없음'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll('-', '.')
  return formatDate(value)
}

function parseMeetingSettings(doc: WorkspaceDocResponse | null | undefined, fallbackLink: string): MeetingSettings | null {
  if (!doc?.content) return null
  try {
    const parsed = JSON.parse(doc.content) as Partial<MeetingSettings>
    return {
      week: typeof parsed.week === 'string' ? parsed.week : '3주차',
      status: typeof parsed.status === 'string' ? parsed.status : 'UPCOMING',
      title: typeof parsed.title === 'string' ? parsed.title : '',
      date: typeof parsed.date === 'string' ? parsed.date : '',
      time: typeof parsed.time === 'string' ? parsed.time : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      link: typeof parsed.link === 'string' && parsed.link.trim() ? parsed.link : fallbackLink,
    }
  } catch {
    return null
  }
}

function buildDefaultMeetingSettings(nextMeetup: CalendarEvent | null, liveRoomUrl: string): MeetingSettings {
  return {
    week: '3주차',
    status: nextMeetup ? 'UPCOMING' : 'ON AIR',
    title: nextMeetup?.title ?? '',
    date: nextMeetup?.startAt ? formatDate(nextMeetup.startAt) : '',
    time: nextMeetup?.startAt ? `${formatTime(nextMeetup.startAt)}${nextMeetup.endAt ? ` ~ ${formatTime(nextMeetup.endAt)}` : ''}` : '',
    description: nextMeetup ? eventDescriptionOf(nextMeetup) : '',
    link: liveRoomUrl,
  }
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

function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function workspaceFileName(file: WorkspaceFile) {
  return file.displayName ?? file.originalFileName ?? '자료'
}

function workspaceFileTone(file: WorkspaceFile) {
  if (file.itemType === 'LINK') return { icon: 'fas fa-link', color: 'text-blue-500' }
  const name = workspaceFileName(file).toLowerCase()
  if (name.endsWith('.pdf')) return { icon: 'fas fa-file-pdf', color: 'text-red-500' }
  if (name.endsWith('.zip') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz')) return { icon: 'fas fa-file-archive', color: 'text-yellow-600' }
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(name)) return { icon: 'fas fa-image', color: 'text-green-500' }
  return { icon: 'far fa-file-alt', color: 'text-[#7C3AED]' }
}

function workspaceFileKind(file: WorkspaceFile, ownerId?: number | null) {
  if (file.itemType === 'LINK') return 'link'
  if (ownerId && file.uploadedById && file.uploadedById !== ownerId) return 'shared'
  return 'official'
}

function isQuestionAnswered(question: QuestionSummary) {
  return question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED'
}

function isReviewWaiting(task: WorkspaceTask) {
  return task.status === 'IN_REVIEW' || task.status === 'IN_PROGRESS'
}

function notificationTime(value?: string | null) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : new Date().toISOString()
}

function buildWorkspaceNotifications(data: WorkspaceData, workspaceId: number | null, localNotifications: WorkspaceNotification[]) {
  const href = (page: InstructorWsPage) => buildHref(page, workspaceId)
  const upcomingEvents = data.events
    .filter((event) => new Date(event.startAt).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 5)
  const notifications: WorkspaceNotification[] = [
    ...localNotifications,
    ...data.activityLogs.map((log) => ({
      id: `activity-${log.logId}`,
      title: log.targetTitle ?? '워크스페이스 활동',
      description: `${log.actorName ?? '시스템'} ${log.description ?? log.actionType ?? '활동을 기록했습니다.'}`,
      createdAt: notificationTime(log.createdAt),
      href: href('dashboard'),
      icon: 'fas fa-history',
      source: 'activity' as const,
    })),
    ...data.questions.filter((question) => !isQuestionAnswered(question)).map((question) => ({
      id: `question-${question.id}`,
      title: '답변 대기 질문',
      description: `${question.authorName ?? '학습자'}님이 "${question.title}" 질문을 남겼습니다.`,
      createdAt: notificationTime(question.createdAt),
      href: href('qna'),
      icon: 'fas fa-comments',
      source: 'derived' as const,
    })),
    ...data.tasks.filter((task) => task.status === 'IN_REVIEW').map((task) => ({
      id: `task-review-${task.taskId}`,
      title: '과제 리뷰 대기',
      description: `"${task.title}" 과제가 리뷰를 기다립니다.`,
      createdAt: notificationTime(task.createdAt),
      href: href('assignments'),
      icon: 'fas fa-clipboard-check',
      source: 'derived' as const,
    })),
    ...upcomingEvents.map((event) => ({
      id: `event-${event.eventId}`,
      title: '다가오는 일정',
      description: `${formatDate(event.startAt)} ${formatTime(event.startAt)} · ${event.title}`,
      createdAt: notificationTime(event.createdAt ?? event.startAt),
      href: href('schedule'),
      icon: 'fas fa-calendar-alt',
      source: 'derived' as const,
    })),
    ...data.files.slice(0, 5).map((file) => ({
      id: `file-${file.fileId}`,
      title: file.itemType === 'LINK' ? '외부 링크 공유' : '자료 등록',
      description: `${file.uploadedByName ?? '학습자'}님이 "${workspaceFileName(file)}" 자료를 등록했습니다.`,
      createdAt: notificationTime(file.createdAt),
      href: href('files'),
      icon: file.itemType === 'LINK' ? 'fas fa-link' : 'fas fa-folder-open',
      source: 'derived' as const,
    })),
    ...data.meetingNotes.slice(0, 5).map((note) => ({
      id: `meeting-note-${note.noteId}`,
      title: '회의록 업데이트',
      description: `"${note.title}" 회의록이 등록되었거나 수정되었습니다.`,
      createdAt: notificationTime(note.createdAt),
      href: href('meeting'),
      icon: 'fas fa-file-alt',
      source: 'derived' as const,
    })),
  ]
  const unique = new Map<string, WorkspaceNotification>()
  notifications.forEach((notification) => {
    if (!unique.has(notification.id)) unique.set(notification.id, notification)
  })
  return [...unique.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_WORKSPACE_NOTIFICATIONS)
}

function EmptyState({ icon, title, description, action }: { icon: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl text-gray-400">
        <i className={icon} />
      </div>
      <h3 className="text-sm font-extrabold text-gray-800">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-6 text-gray-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function StatCard({ icon, label, value, suffix, tone = 'text-[#7C3AED]', onClick }: { icon: string; label: string; value: string | number; suffix?: string; tone?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition ${onClick ? 'hover:-translate-y-0.5 hover:border-purple-200' : ''}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-50 text-xl ${tone}`}>
        <i className={icon} />
      </div>
      <div>
        <p className="mb-0.5 text-[10px] font-extrabold text-gray-400">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}<span className="ml-1 text-sm font-medium text-gray-500">{suffix}</span></p>
      </div>
    </button>
  )
}

function PageHeading({ page, description, action }: { page: InstructorWsPage; description: ReactNode; action?: ReactNode }) {
  const config = PAGE_CONFIG[page]
  return (
    <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
          <i className={`${config.icon} text-[#7C3AED]`} /> {config.title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

function Modal({
  title,
  icon,
  maxWidth = 'max-w-3xl',
  onClose,
  children,
}: {
  title: string
  icon: string
  maxWidth?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className={`${icon} text-[#7C3AED]`} /> {title}</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar max-h-[calc(90vh-88px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function InstructorWsShell({
  page,
  workspaceId,
  data,
  children,
}: {
  page: InstructorWsPage
  workspaceId: number | null
  data: WorkspaceData
  children: ReactNode
}) {
  const [notiOpen, setNotiOpen] = useState(false)
  const [localNotifications, setLocalNotifications] = useState<WorkspaceNotification[]>(() => readStoredWorkspaceNotifications(workspaceId))
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => readWorkspaceNotificationIds(workspaceId))
  const dashboard = data.dashboard
  const workspaceName = dashboard?.name ?? '멘토링 워크스페이스'
  const waitingCount = data.tasks.filter(isReviewWaiting).length
  const unansweredCount = data.questions.filter((question) => !isQuestionAnswered(question)).length
  const notifications = useMemo(() => buildWorkspaceNotifications(data, workspaceId, localNotifications), [data, workspaceId, localNotifications])
  const unreadNotificationIds = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).map((notification) => notification.id)

  useEffect(() => {
    setLocalNotifications(readStoredWorkspaceNotifications(workspaceId))
    setReadNotificationIds(readWorkspaceNotificationIds(workspaceId))
  }, [workspaceId])

  useEffect(() => {
    function handleNotification(event: Event) {
      const detail = (event as CustomEvent<{ workspaceId: number; notification: WorkspaceNotification }>).detail
      if (!detail || detail.workspaceId !== workspaceId) return
      setLocalNotifications((current) => [detail.notification, ...current.filter((item) => item.id !== detail.notification.id)].slice(0, MAX_WORKSPACE_NOTIFICATIONS))
    }
    window.addEventListener(WORKSPACE_NOTIFICATION_EVENT, handleNotification)
    return () => window.removeEventListener(WORKSPACE_NOTIFICATION_EVENT, handleNotification)
  }, [workspaceId])

  function markNotificationsRead(ids: string[]) {
    if (!workspaceId || ids.length === 0) return
    setReadNotificationIds((current) => {
      const next = [...new Set([...current, ...ids])]
      writeWorkspaceNotificationIds(workspaceId, next)
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
    <div className="instructor-ws-page flex h-screen overflow-hidden bg-[#F3F4F6] font-['Pretendard'] text-gray-800" onClick={() => setNotiOpen(false)}>
      <aside className="instructor-ws-sidebar group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64">
        <a href="/instructor-mentoring" className="flex h-20 shrink-0 items-center border-b border-gray-100 px-5 transition hover:bg-gray-50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white shadow-md">
            <i className="fas fa-arrow-left" />
          </div>
          <div className="sidebar-text flex flex-col">
            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">강사 센터로 복귀</p>
            <p className="w-36 truncate font-bold text-gray-900">{workspaceName}</p>
          </div>
        </a>

        <nav className="custom-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {[
            ['Workspace (Admin)', ['dashboard', 'assignments', 'students', 'qna'] as InstructorWsPage[]],
            ['Resources & Live', ['schedule', 'files', 'meeting'] as InstructorWsPage[]],
          ].map(([title, pages]) => (
            <div key={title as string}>
              <p className="sidebar-section-title px-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">{title}</p>
              {(pages as InstructorWsPage[]).map((item) => {
                const config = PAGE_CONFIG[item]
                const active = item === page
                const count = item === 'assignments' ? waitingCount : item === 'qna' ? unansweredCount : 0
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
              {title === 'Workspace (Admin)' ? <div className="mx-2 my-4 h-px bg-gray-100" /> : null}
            </div>
          ))}
        </nav>

        <div className="flex items-center border-t border-gray-100 p-4">
          <img src={dashboard?.ownerProfileImage ?? avatarUrl(dashboard?.ownerName)} className="h-10 w-10 shrink-0 rounded-full border-2 border-[#7C3AED] bg-white shadow-sm" alt="" />
          <div className="sidebar-text">
            <p className="text-sm font-bold text-gray-900">{dashboard?.ownerName ?? '강사'}</p>
            <p className="mt-0.5 inline-block rounded bg-[#7C3AED] px-1.5 py-0.5 text-[10px] font-bold text-white">Instructor</p>
          </div>
        </div>
      </aside>

      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        <header className="relative z-30 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white px-8 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3 font-bold text-gray-800">
            <span className="rounded-md bg-gray-900 px-2 py-1 text-[10px] tracking-wider text-white">ADMIN</span>
            <span className="truncate">{workspaceName}</span>
            <span className="shrink-0 rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">
              <i className="fas fa-users mr-1" />{dashboard?.type === 'MENTORING' ? '공통 과제형' : dashboard?.type ?? '워크스페이스'}
            </span>
          </div>
          <div className="relative flex items-center gap-4">
            <button type="button" className="relative p-2 text-gray-400 transition hover:text-[#00C471]" onClick={(event) => { event.stopPropagation(); toggleNotifications() }}>
              <i className="far fa-bell text-lg" />
              {unreadNotificationIds.length > 0 ? <span className="absolute top-1 right-1 h-2 w-2 rounded-full border border-white bg-red-500" /> : null}
            </button>
            {notiOpen ? (
              <div className="absolute top-12 right-0 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-gray-50 p-4">
                  <div>
                    <h3 className="text-sm font-bold">알림</h3>
                    <p className="mt-0.5 text-[10px] font-bold text-gray-400">과제, 질문, 일정, 자료 업데이트</p>
                  </div>
                  {unreadNotificationIds.length > 0 ? <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-500">{unreadNotificationIds.length}</span> : null}
                </div>
                <div className="custom-scrollbar max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="flex flex-col items-center p-8 text-center text-xs text-gray-400">
                      <i className="far fa-bell-slash mb-2 text-2xl text-gray-300" />
                      새로운 알림이 없습니다.
                    </p>
                  ) : notifications.slice(0, 8).map((notification) => {
                    const unread = !readNotificationIds.includes(notification.id)
                    return (
                      <a key={notification.id} href={notification.href} className={`flex gap-3 border-b border-gray-50 p-3 transition hover:bg-gray-50 ${unread ? 'bg-green-50/50' : ''}`}>
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-[11px] text-white"><i className={notification.icon} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-xs font-extrabold text-gray-900">
                            <span className="truncate">{notification.title}</span>
                            {unread ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" /> : null}
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{notification.description}</span>
                          <span className="mt-1 inline-block text-[10px] font-bold text-[#00C471]">{relativeTime(notification.createdAt)}</span>
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </header>
        <div className={`custom-scrollbar flex-1 p-8 ${page === 'schedule' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`mx-auto ${page === 'schedule' ? 'flex h-full max-w-6xl flex-col' : 'max-w-7xl space-y-6'}`}>{children}</div>
        </div>
      </main>
    </div>
  )
}

function DashboardPage({ data, workspaceId, onOpenNotice }: { data: WorkspaceData; workspaceId: number | null; onOpenNotice: () => void }) {
  const learners = useMemo(() => (data.dashboard?.members ?? [])
    .filter((member) => member.learnerId !== data.dashboard?.ownerId), [data.dashboard?.members, data.dashboard?.ownerId])
  const currentWeek = useMemo(() => inferCurrentAssignmentWeek(data.tasks), [data.tasks])
  const weekTasks = useMemo(() => data.tasks
    .filter((task, index) => inferAssignmentWeek(task, index + 1) === currentWeek)
    .sort(compareTasksByAssignmentOrder), [currentWeek, data.tasks])
  const currentAssignment = weekTasks.find((task) => !task.assigneeId || task.createdById === data.dashboard?.ownerId) ?? weekTasks[0] ?? null
  const weekRows = useMemo(() => learners.map((member) => {
    const assignedTasks = data.tasks
      .filter((task) => task.assigneeId === member.learnerId)
      .sort(compareTasksByAssignmentOrder)
    const task = assignedTasks.find((item, index) => inferAssignmentWeek(item, index + 1) === currentWeek) ?? null
    return buildAssignmentStudentRow(member, task)
  }), [currentWeek, data.tasks, learners])
  const passCount = weekRows.filter((row) => row.status === 'pass').length
  const waitingCount = weekRows.filter((row) => row.status === 'wait').length
  const rejectCount = weekRows.filter((row) => row.status === 'reject').length
  const missingCount = weekRows.filter((row) => row.status === 'missing').length
  const submittedCount = weekRows.length - missingCount
  const totalLearners = learners.length
  const progress = totalLearners === 0 ? 0 : Math.round(learners.reduce((sum, member) => {
    const assignedTasks = data.tasks.filter((task) => task.assigneeId === member.learnerId).sort(compareTasksByAssignmentOrder)
    const weeks = buildStudentWeekProgress(assignedTasks, currentWeek)
    const progressedCount = weeks.filter((week) => ['DONE', 'IN_REVIEW', 'IN_PROGRESS'].includes(week.status)).length
    return sum + Math.round((progressedCount / 4) * 100)
  }, 0) / totalLearners)
  const reviewWaiting = waitingCount
  const unanswered = data.questions.filter((question) => !isQuestionAnswered(question)).length
  const upcomingEvents = [...data.events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).filter((event) => new Date(event.startAt).getTime() >= Date.now() - 86400000)
  const todayEvent = upcomingEvents.find((event) => isSameDay(event.startAt, new Date())) ?? upcomingEvents[0] ?? null
  const hasData = totalLearners > 0 || data.tasks.length > 0 || data.questions.length > 0 || data.events.length > 0
  const riskRows = learners.map((member) => {
    const assignedTasks = data.tasks.filter((task) => task.assigneeId === member.learnerId).sort(compareTasksByAssignmentOrder)
    const weeks = buildStudentWeekProgress(assignedTasks, currentWeek)
    const progressedCount = weeks.filter((week) => ['DONE', 'IN_REVIEW', 'IN_PROGRESS'].includes(week.status)).length
    const studentProgress = Math.round((progressedCount / 4) * 100)
    const missingWeeks = weeks.filter((week) => week.status === 'MISSING').length
    return { member, progress: studentProgress, missingWeeks }
  }).filter((row) => row.missingWeeks > 0 || row.progress < 50)
  const actionTasks = weekRows.filter((row) => row.status === 'wait').slice(0, 3)
  const actionQuestions = data.questions.filter((question) => !isQuestionAnswered(question)).slice(0, 2)

  return (
    <>
      <PageHeading
        page="dashboard"
        description={hasData ? '현재 진행 중인 멘토링의 주요 현황을 한눈에 파악하고 수강생들을 관리하세요.' : '새로운 멘토링이 개설되었습니다. 일정, 과제, 공지를 등록하면 이곳에 현황이 표시됩니다.'}
        action={<button type="button" onClick={onOpenNotice} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-bullhorn" /> 새 공지사항 작성</button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="fas fa-users" label="참여 수강생" value={totalLearners} suffix="명" tone={totalLearners > 0 ? 'text-blue-500' : 'text-gray-400'} onClick={() => { window.location.href = buildHref('students', workspaceId) }} />
        <StatCard icon="fas fa-code-branch" label="리뷰 대기중 과제" value={reviewWaiting} suffix="건" tone={reviewWaiting > 0 ? 'text-red-500' : 'text-gray-400'} onClick={() => { window.location.href = buildHref('assignments', workspaceId) }} />
        <StatCard icon="fas fa-question-circle" label="미답변 Q&A" value={unanswered} suffix="건" tone={unanswered > 0 ? 'text-yellow-500' : 'text-gray-400'} onClick={() => { window.location.href = buildHref('qna', workspaceId) }} />
        <StatCard icon="fas fa-flag-checkered" label="평균 진도율" value={progress} suffix="%" tone="text-[#00C471]" />
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full flex-col gap-6 lg:w-2/3">
          <section className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${hasData ? 'border-[#7C3AED]' : 'border-gray-200'}`}>
            {hasData ? <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED] opacity-10 blur-2xl" /> : null}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span className={`mb-2 inline-block rounded border px-2 py-1 text-[10px] font-extrabold ${hasData ? 'border-purple-200 bg-[#EDE9FE] text-[#7C3AED]' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>THIS WEEK ({hasData ? `${currentWeek}주차` : '시작 전'})</span>
                <h3 className={`text-lg font-extrabold ${hasData ? 'text-gray-900' : 'text-gray-400'}`}>{currentAssignment?.title ?? (hasData ? '이번 주 과제를 설정해주세요.' : '아직 첫 주차 학습이 시작되지 않았습니다.')}</h3>
              </div>
              {hasData ? <a href={buildHref('assignments', workspaceId)} className="relative z-10 shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-black">제출 현황 상세 보기</a> : null}
            </div>
            <div className="relative z-10 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className={`mb-2 flex justify-between text-xs font-bold ${hasData ? 'text-gray-700' : 'text-gray-400'}`}>
                <span>이번 주 과제 제출률</span>
                <span>{submittedCount} / {totalLearners} 명 제출</span>
              </div>
              <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-gray-200">
                <div className="bg-green-500" style={{ width: `${totalLearners ? (passCount / totalLearners) * 100 : 0}%` }} />
                <div className="bg-yellow-400" style={{ width: `${totalLearners ? (waitingCount / totalLearners) * 100 : 0}%` }} />
                <div className="bg-red-400" style={{ width: `${totalLearners ? (rejectCount / totalLearners) * 100 : 0}%` }} />
                <div className="bg-gray-200" style={{ width: `${totalLearners ? (missingCount / totalLearners) * 100 : 100}%` }} />
              </div>
              <div className={`flex justify-end gap-4 text-[10px] font-bold ${hasData ? 'text-gray-500' : 'text-gray-400'}`}>
                {hasData ? (
                  <>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Pass ({passCount})</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400" /> 대기중 ({waitingCount})</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-200" /> 미제출 ({missingCount})</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300" /> 수강생들의 제출을 기다리고 있습니다</span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className={`fas fa-bolt ${actionTasks.length || actionQuestions.length ? 'text-yellow-500' : 'text-gray-300'}`} /> 강사 액션 필요 (최근 활동)</h3>
            {reviewWaiting === 0 && unanswered === 0 ? (
              <DashboardEmptyBox icon="fas fa-inbox" title="아직 확인해야 할 내역이 없습니다." description={<>수강생들이 과제를 제출하거나 Q&A에 질문을 남기면<br />이곳에 가장 먼저 알림이 표시됩니다.</>} />
            ) : (
              <div className="space-y-3">
                {actionTasks.map((row) => (
                  <a key={`${row.member.memberId}-${row.task?.taskId ?? 'task'}`} href={buildHref('assignments', workspaceId)} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-sm">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-100 text-red-500"><i className="fas fa-code-branch" /></div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-900"><span className="text-[#00C471]">{row.member.learnerName ?? '수강생'}</span> 수강생이 {currentWeek}주차 과제를 제출했습니다.</p>
                        <p className="mt-1 line-clamp-1 text-[10px] text-gray-500">{row.message}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-gray-400">{relativeTime(row.submittedAt)}</span>
                  </a>
                ))}
                {actionQuestions.map((question) => (
                  <a key={question.id} href={buildHref('qna', workspaceId)} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-sm">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-200 bg-yellow-100 text-yellow-600"><i className="fas fa-question" /></div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-900"><span className="text-[#00C471]">{question.authorName ?? '수강생'}</span> 수강생이 질문을 남겼습니다.</p>
                        <p className="mt-1 line-clamp-1 text-[10px] text-gray-500">{question.title}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-gray-400">{relativeTime(question.createdAt)}</span>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className={`relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${riskRows.length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
            {riskRows.length > 0 ? <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-red-100 opacity-20 blur-2xl" /> : null}
            <div className="relative z-10 mb-4 flex shrink-0 items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                <i className={`fas ${riskRows.length > 0 ? 'fa-exclamation-triangle text-red-500' : 'fa-shield-alt text-[#00C471]'}`} /> 집중 케어 필요 수강생
              </h3>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${riskRows.length > 0 ? 'border-red-100 bg-red-50 text-red-500' : 'border-green-100 bg-green-50 text-green-600'}`}>{riskRows.length > 0 ? `위험군 ${riskRows.length}명` : '안정적'}</span>
            </div>
            {riskRows.length === 0 ? (
              <DashboardEmptyBox icon="fas fa-smile" title="위험군 수강생이 없습니다!" description={<>진도율이 저조하거나 미제출이 반복되는 수강생이 발생하면<br />이곳에 자동으로 필터링되어 나타납니다.</>} iconClassName="bg-green-50 text-[#00C471]" />
            ) : (
              <div className="custom-scrollbar relative z-10 flex-1 space-y-3 overflow-y-auto pr-1">
                {riskRows.slice(0, 4).map((row, index) => (
                  <div key={row.member.memberId} className={`flex items-center justify-between rounded-xl border p-4 transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-sm ${index === 0 ? 'border-red-100 bg-red-50/30' : 'border-orange-100 bg-orange-50/30'}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className={`h-10 w-10 shrink-0 rounded-full border bg-white ${index === 0 ? 'border-red-200' : 'border-orange-200'}`} alt="" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-900">{row.member.learnerName ?? '수강생'} <span className={`ml-1 text-[10px] font-bold ${index === 0 ? 'text-red-500' : 'text-orange-500'}`}>진도율 {row.progress}%</span></p>
                        <p className="mt-0.5 text-[10px] text-gray-500">{row.missingWeeks}주차 과제 미제출 · {relativeTime(row.member.lastActiveAt ?? row.member.joinedAt)}</p>
                      </div>
                    </div>
                    <button type="button" className={`ml-2 shrink-0 rounded-lg border bg-white px-3 py-1.5 text-[10px] font-bold shadow-sm transition ${index === 0 ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}`}>
                      <i className="fas fa-paper-plane mr-1" />DM 보내기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex w-full flex-col gap-6 lg:sticky lg:top-0 lg:w-1/3">
          <section className="flex shrink-0 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-bell text-gray-400" /> 배포한 공지사항</h3>
            </div>
            {data.notices.length === 0 ? (
              <DashboardEmptyBox icon="fas fa-bullhorn" title="등록된 공지사항이 없습니다." description={<>학습 시작 전, 전체 수강생을 환영하는<br />첫 인사 공지를 작성해 보세요!</>} action={<button type="button" onClick={onOpenNotice} className="rounded-lg bg-[#EDE9FE] px-4 py-2 text-[10px] font-bold text-[#7C3AED] transition hover:bg-[#7C3AED] hover:text-white">첫 공지 작성하기</button>} small />
            ) : (
              <div className="custom-scrollbar max-h-[220px] space-y-3 overflow-y-auto pr-1">
                {data.notices.slice(0, 5).map((notice) => (
                  <article key={notice.id} className="group relative rounded-xl border border-gray-100 bg-white p-4 transition hover:bg-gray-50">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${noticeImportant(notice) ? 'border-red-100 bg-red-50 text-red-500' : 'border-blue-100 bg-blue-50 text-blue-500'}`}>{noticeImportant(notice) ? '중요 공지' : '일반 공지'}</span>
                      <span className="text-[9px] text-gray-400">{relativeTime(notice.createdAt)}</span>
                    </div>
                    <p className="line-clamp-1 text-xs font-bold text-gray-900">{notice.title}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] text-gray-500">{noticeContent(notice)}</p>
                    <div className="absolute top-3 right-3 flex gap-1 rounded border border-gray-100 bg-white/90 px-1 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
                      <button type="button" className="h-6 w-6 text-gray-500 transition hover:text-[#00C471]"><i className="fas fa-pen text-[10px]" /></button>
                      <button type="button" className="h-6 w-6 text-gray-500 transition hover:text-red-500"><i className="fas fa-trash text-[10px]" /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={`relative flex-initial overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${upcomingEvents.length > 0 ? 'border-[#7C3AED]' : 'border-gray-200'}`}>
            {upcomingEvents.length > 0 ? <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED] opacity-10 blur-2xl" /> : null}
            <div className="relative z-10 mb-4 flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className={`${upcomingEvents.length > 0 ? 'fas fa-calendar-check text-[#7C3AED]' : 'fas fa-calendar text-gray-400'}`} /> 일정 및 라이브</h3>
              {upcomingEvents.length > 0 ? <a href={buildHref('schedule', workspaceId)} className="text-[10px] font-bold text-gray-500 hover:text-[#7C3AED]">전체보기 <i className="fas fa-chevron-right ml-0.5" /></a> : null}
            </div>
            {upcomingEvents.length === 0 ? (
              <DashboardEmptyBox icon="far fa-calendar-plus" title="다가오는 공식 일정이 없습니다." description={<>라이브 밋업(Live), 과제 마감일 등<br />주요 일정을 캘린더에 미리 등록하세요.</>} action={<a href={buildHref('schedule', workspaceId)} className="rounded-lg bg-gray-100 px-4 py-2 text-[10px] font-bold text-gray-600 transition hover:bg-gray-200">새 일정 등록하러 가기</a>} small />
            ) : (
              <div className="relative z-10 space-y-4">
                {todayEvent ? (
                  <article className="relative overflow-hidden rounded-xl bg-gray-900 p-4 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="absolute -top-4 -right-4 h-16 w-16 animate-pulse rounded-full bg-red-500 opacity-20" />
                    <div className="mb-2 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                      <span className="text-[10px] font-bold tracking-wide text-red-400 uppercase">{isSameDay(todayEvent.startAt, new Date()) ? 'Today Live' : 'Next Live'}</span>
                    </div>
                    <h4 className="mb-1 text-sm font-bold">{todayEvent.title}</h4>
                    <p className="mb-3 text-xs text-gray-400"><i className="far fa-clock mr-1" />{formatDate(todayEvent.startAt)} {formatTime(todayEvent.startAt)}{todayEvent.endAt ? ` - ${formatTime(todayEvent.endAt)}` : ''}</p>
                    <a href={buildHref('meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700">
                      <i className="fas fa-video" /> 라이브 룸 열기
                    </a>
                  </article>
                ) : null}
                {upcomingEvents.filter((event) => event.eventId !== todayEvent?.eventId).slice(0, 2).map((event) => {
                  const type = eventTypeOf(event)
                  const isDeadline = type === 'deadline'
                  return (
                    <article key={event.eventId} className={`border-l-2 pl-3 ${isDeadline ? 'border-red-400' : 'border-gray-300'}`}>
                      <p className={`mb-0.5 text-[10px] font-bold ${isDeadline ? 'text-red-500' : 'text-gray-500'}`}>{isDeadline ? '과제 마감' : formatDate(event.startAt)}</p>
                      <p className="text-xs font-bold text-gray-800">{event.title}</p>
                      <p className="mt-0.5 text-[10px] text-gray-500">{formatTime(event.startAt)}{event.endAt ? ` - ${formatTime(event.endAt)}` : ''}</p>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function DashboardEmptyBox({ icon, title, description, action, small = false, iconClassName = 'bg-gray-100 text-gray-400' }: { icon: string; title: string; description: ReactNode; action?: ReactNode; small?: boolean; iconClassName?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 px-4 text-center ${small ? 'py-6' : 'min-h-[220px] py-8'}`}>
      <div className={`mb-4 flex items-center justify-center rounded-full ${small ? 'h-12 w-12 text-lg' : 'h-16 w-16 text-2xl'} ${iconClassName}`}>
        <i className={icon} />
      </div>
      <h4 className={`${small ? 'text-xs' : 'text-sm'} mb-1 font-bold text-gray-700`}>{title}</h4>
      <p className={`${small ? 'text-[10px]' : 'text-xs'} leading-5 text-gray-500`}>{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

function noticeImportant(notice: WorkspaceNotice) {
  return notice.content.startsWith('[IMPORTANT]\n')
}

function noticeContent(notice: WorkspaceNotice) {
  return notice.content.replace(/^\[IMPORTANT\]\n?/, '')
}

function isSameDay(value: string, date: Date) {
  const target = new Date(value)
  return target.getFullYear() === date.getFullYear()
    && target.getMonth() === date.getMonth()
    && target.getDate() === date.getDate()
}

type AssignmentReviewStatus = 'wait' | 'reject' | 'pass' | 'missing'

type AssignmentStudentRow = {
  member: WorkspaceMember
  task: WorkspaceTask | null
  status: AssignmentReviewStatus
  submittedAt: string
  message: string
  mentorComment: string
  prUrl: string
}

type AssignmentSuccessMessage = {
  title: string
  description: ReactNode
}

function AssignmentsPage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const currentWeek = useMemo(() => inferCurrentAssignmentWeek(data.tasks), [data.tasks])
  const [activeWeek, setActiveWeek] = useState(currentWeek)
  const [statusFilter, setStatusFilter] = useState<AssignmentReviewStatus | 'all'>('all')
  const [editing, setEditing] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<AssignmentStudentRow | null>(null)
  const [historyTarget, setHistoryTarget] = useState<AssignmentStudentRow | null>(null)
  const [successMessage, setSuccessMessage] = useState<AssignmentSuccessMessage | null>(null)

  useEffect(() => {
    setActiveWeek(currentWeek)
  }, [currentWeek])

  const learners = useMemo(() => (data.dashboard?.members ?? [])
    .filter((member) => member.learnerId !== data.dashboard?.ownerId), [data.dashboard?.members, data.dashboard?.ownerId])

  const activeWeekTasks = useMemo(() => data.tasks
    .filter((task, index) => inferAssignmentWeek(task, index + 1) === activeWeek)
    .sort(compareTasksByAssignmentOrder), [activeWeek, data.tasks])

  const assignment = activeWeekTasks.find((task) => !task.assigneeId || task.createdById === data.dashboard?.ownerId) ?? activeWeekTasks[0] ?? null

  const rows = useMemo<AssignmentStudentRow[]>(() => learners.map((member) => {
    const assignedTasks = data.tasks
      .filter((task) => task.assigneeId === member.learnerId)
      .sort(compareTasksByAssignmentOrder)
    const task = assignedTasks.find((item, index) => inferAssignmentWeek(item, index + 1) === activeWeek) ?? null
    return buildAssignmentStudentRow(member, task)
  }), [activeWeek, data.tasks, learners])

  const visibleRows = rows.filter((row) => statusFilter === 'all' || row.status === statusFilter)
  const total = Math.max(learners.length, 1)
  const passed = rows.filter((row) => row.status === 'pass').length
  const reviewWaiting = rows.filter((row) => row.status === 'wait').length
  const rejected = rows.filter((row) => row.status === 'reject').length
  const missing = rows.filter((row) => row.status === 'missing').length
  const submitted = rows.length - missing

  async function saveAssignment(title: string, summary: string, guideline: string, dueDateTime: string) {
    if (!workspaceId || !title.trim()) return
    const description = [summary.trim(), guideline.trim()].filter(Boolean).join('\n\n')
    const payload = {
      title: title.trim(),
      description,
      priority: 'HIGH',
      dueDate: dueDateTime ? dueDateTime.slice(0, 10) : null,
    } as const
    if (assignment) {
      await updateInstructorWorkspaceTask(workspaceId, assignment.taskId, payload)
    } else {
      await createInstructorWorkspaceTask(workspaceId, payload)
    }
    setEditing(false)
    pushWorkspaceNotification(workspaceId, {
      title: assignment ? '과제 설정 수정' : '과제 설정 등록',
      description: `Week ${activeWeek} 과제 "${title.trim()}" 설정이 저장되었습니다.`,
      href: buildHref('assignments', workspaceId),
      icon: 'fas fa-tasks',
    })
    setSuccessMessage({ title: '과제 설정 저장 완료!', description: <span>Week {activeWeek} 과제 내용이 수강생 제출 목록에 반영되었습니다.</span> })
    await reload()
  }

  function completeFeedback(row: AssignmentStudentRow, result: 'pass' | 'reject') {
    setFeedbackTarget(null)
    setSuccessMessage({
      title: result === 'pass' ? 'Pass 피드백 전송 완료!' : '수정 요청 피드백 전송 완료!',
      description: <span>{row.member.learnerName ?? '수강생'} 수강생에게 Week {activeWeek} 리뷰 결과를 전달했습니다.</span>,
    })
  }

  return (
    <>
      <PageHeading page="assignments" description="주차별 수강생들의 과제 제출 현황을 확인하고 피드백을 제공하세요." />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((week) => {
          const state = assignmentWeekState(week, currentWeek)
          return (
            <button
              key={week}
              type="button"
              onClick={() => setActiveWeek(week)}
              className={`relative flex min-w-[132px] items-center justify-center rounded-xl px-5 py-3 text-xs font-extrabold transition ${
                activeWeek === week
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                  : state === '예정'
                    ? 'bg-white text-gray-400 hover:bg-gray-50'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {state === '진행 중' ? <span className="mr-2 h-2 w-2 rounded-full bg-red-500" /> : null}
              {week}주차 ({state})
            </button>
          )
        })}
      </div>

      <section className="mb-6 flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="text-base font-extrabold text-gray-900">{assignment?.title ?? `Week ${activeWeek}: 과제를 설정해주세요`}</h3>
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition hover:bg-gray-200">
              <i className="fas fa-edit mr-1.5" />과제 설정 및 가이드라인 편집
            </button>
          </div>
          <p className="mb-4 line-clamp-2 text-xs leading-5 text-gray-500">{assignmentSummary(assignment)}</p>
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>제출 현황</span>
            <span>{submitted} / {learners.length}명 제출</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-green-500" style={{ width: `${(passed / total) * 100}%` }} />
            <div className="bg-yellow-400" style={{ width: `${(reviewWaiting / total) * 100}%` }} />
            <div className="bg-red-400" style={{ width: `${(rejected / total) * 100}%` }} />
            <div className="bg-gray-200" style={{ width: `${(missing / total) * 100}%` }} />
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">마감일 {formatDate(assignment?.dueDate)}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:grid-cols-4">
          <AssignmentMiniStat label="총 인원" value={learners.length} tone="bg-gray-50 text-gray-900" />
          <AssignmentMiniStat label="리뷰 대기" value={reviewWaiting} tone="bg-yellow-50 text-yellow-600" />
          <AssignmentMiniStat label="Pass" value={passed} tone="bg-green-50 text-green-600" />
          <AssignmentMiniStat label="수정 요청" value={rejected} tone="bg-red-50 text-red-600" />
        </div>
      </section>

      <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-extrabold text-gray-900">수강생 제출 목록</h2>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AssignmentReviewStatus | 'all')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 outline-none transition focus:border-[#7C3AED]">
            <option value="all">상태 전체</option>
            <option value="wait">리뷰 대기중</option>
            <option value="reject">수정 요청</option>
            <option value="pass">Pass 완료</option>
            <option value="missing">미제출</option>
          </select>
        </div>
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {visibleRows.length === 0 ? (
            <EmptyState icon="fas fa-inbox" title="표시할 제출 내역이 없습니다." description="선택한 상태에 해당하는 수강생 과제 제출 내역이 없습니다." />
          ) : visibleRows.map((row) => (
            <AssignmentStudentCard
              key={row.member.memberId}
              row={row}
              onFeedback={() => setFeedbackTarget(row)}
              onHistory={() => setHistoryTarget(row)}
              onNudge={() => setSuccessMessage({ title: '독려 DM 발송 완료!', description: <span>{row.member.learnerName ?? '수강생'} 수강생에게 Week {activeWeek} 과제 제출 안내를 보냈습니다.</span> })}
            />
          ))}
        </div>
      </section>

      {editing ? <AssignmentEditModal assignment={assignment} activeWeek={activeWeek} onClose={() => setEditing(false)} onSave={saveAssignment} /> : null}
      {feedbackTarget ? <FeedbackModal row={feedbackTarget} activeWeek={activeWeek} onClose={() => setFeedbackTarget(null)} onSubmit={completeFeedback} /> : null}
      {historyTarget ? <FeedbackHistoryModal row={historyTarget} activeWeek={activeWeek} onClose={() => setHistoryTarget(null)} /> : null}
      {successMessage ? <AssignmentSuccessModal message={successMessage} onClose={() => setSuccessMessage(null)} /> : null}
    </>
  )
}

function AssignmentMiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`min-w-[86px] rounded-xl px-4 py-3 text-center ${tone}`}>
      <p className="text-[10px] font-extrabold opacity-70">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  )
}

function buildAssignmentStudentRow(member: WorkspaceMember, task: WorkspaceTask | null): AssignmentStudentRow {
  const status = assignmentReviewStatus(task)
  return {
    member,
    task,
    status,
    submittedAt: task?.createdAt ?? member.lastActiveAt ?? member.joinedAt ?? '',
    message: assignmentSubmissionMessage(task),
    mentorComment: assignmentMentorComment(task, status),
    prUrl: '#',
  }
}

function assignmentReviewStatus(task: WorkspaceTask | null): AssignmentReviewStatus {
  if (!task) return 'missing'
  if (task.status === 'DONE') return 'pass'
  if (task.status === 'TODO') {
    const text = `${task.title} ${task.description ?? ''}`
    return /수정\s*요청|반려|reject/i.test(text) ? 'reject' : 'missing'
  }
  return 'wait'
}

function assignmentStatusLabel(status: AssignmentReviewStatus) {
  if (status === 'pass') return 'Pass 완료'
  if (status === 'reject') return '수정 요청됨'
  if (status === 'wait') return '리뷰 대기중'
  return '미제출'
}

function assignmentWeekState(week: number, currentWeek: number) {
  if (week < currentWeek) return '완료'
  if (week === currentWeek) return '진행 중'
  return '예정'
}

function assignmentSummary(task: WorkspaceTask | null) {
  if (!task?.description?.trim()) return '멘토가 과제 제목과 가이드라인을 등록하면 수강생 화면에 공식 과제로 표시됩니다.'
  return task.description.split('\n').find((line) => line.trim())?.trim() ?? task.description.trim()
}

function assignmentGuideline(task: WorkspaceTask | null) {
  if (!task?.description?.trim()) return ''
  const lines = task.description.split('\n')
  return lines.slice(1).join('\n').trim() || task.description
}

function assignmentSubmissionMessage(task: WorkspaceTask | null) {
  if (!task) return '아직 제출된 과제가 없습니다.'
  return task.description?.trim() || '제출물이 등록되어 리뷰를 기다리고 있습니다.'
}

function assignmentMentorComment(task: WorkspaceTask | null, status: AssignmentReviewStatus) {
  if (status === 'pass') return '요구사항을 충족하여 Pass 처리된 과제입니다.'
  if (status === 'reject') return '보완이 필요한 항목이 있어 수정 요청 상태입니다.'
  if (task?.description?.trim()) return '제출물을 확인한 뒤 구체적인 개선 포인트를 남겨주세요.'
  return '아직 멘토 피드백이 등록되지 않았습니다.'
}

function AssignmentStudentCard({ row, onFeedback, onHistory, onNudge }: { row: AssignmentStudentRow; onFeedback: () => void; onHistory: () => void; onNudge: () => void }) {
  const tone = {
    wait: 'border-yellow-200 bg-yellow-50/60',
    reject: 'border-red-200 bg-red-50/60',
    pass: 'border-gray-100 bg-white opacity-80',
    missing: 'border-gray-100 bg-gray-50/70 opacity-70',
  }[row.status]
  const badge = {
    wait: 'bg-yellow-100 text-yellow-700',
    reject: 'bg-red-100 text-red-600',
    pass: 'bg-green-100 text-green-600',
    missing: 'bg-gray-200 text-gray-500',
  }[row.status]

  return (
    <article className={`rounded-xl border p-4 transition hover:shadow-sm ${tone}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className="h-12 w-12 rounded-full border border-white bg-gray-100 shadow-sm" alt="" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${badge}`}>{assignmentStatusLabel(row.status)}</span>
              <span className="text-[10px] font-bold text-gray-400">{relativeTime(row.submittedAt)}</span>
            </div>
            {row.status === 'missing' ? (
              <p className="text-xs font-bold text-gray-400">아직 과제를 제출하지 않았습니다.</p>
            ) : (
              <div className="mt-2 rounded-lg bg-white/70 p-3 text-xs leading-5 text-gray-600">
                <i className="fas fa-quote-left mr-2 text-gray-300" />
                {row.message}
              </div>
            )}
            {row.status === 'pass' || row.status === 'reject' ? (
              <p className="mt-2 rounded-lg bg-white/70 p-3 text-xs leading-5 text-gray-600">
                <span className="mb-1 block text-[10px] font-extrabold text-gray-400">멘토 피드백</span>
                {row.mentorComment}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {row.status !== 'missing' ? (
            <a href={row.prUrl} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-600 transition hover:border-[#7C3AED] hover:text-[#7C3AED]">
              <i className="fab fa-github mr-1.5" />PR 코드 보기
            </a>
          ) : null}
          {row.status === 'wait' ? (
            <button type="button" onClick={onFeedback} className="rounded-lg bg-yellow-500 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-yellow-600">
              <i className="fas fa-pen mr-1.5" />피드백 작성하기
            </button>
          ) : null}
          {row.status === 'pass' || row.status === 'reject' ? (
            <button type="button" onClick={onHistory} className="rounded-lg bg-gray-900 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-black">
              <i className="fas fa-history mr-1.5" />피드백 내역 보기
            </button>
          ) : null}
          {row.status === 'missing' ? (
            <button type="button" onClick={onNudge} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold text-gray-500 transition hover:border-gray-400 hover:text-gray-800">
              <i className="fas fa-paper-plane mr-1.5" />DM으로 독려하기
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function AssignmentEditModal({ assignment, activeWeek, onClose, onSave }: { assignment: WorkspaceTask | null; activeWeek: number; onClose: () => void; onSave: (title: string, summary: string, guideline: string, dueDateTime: string) => Promise<void> }) {
  const [title, setTitle] = useState(assignment?.title ?? `Week ${activeWeek}: `)
  const [summary, setSummary] = useState(assignmentSummary(assignment))
  const [guideline, setGuideline] = useState(assignmentGuideline(assignment))
  const [dueDateTime, setDueDateTime] = useState(assignment?.dueDate ? `${assignment.dueDate}T23:59` : '')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSave(title, summary, guideline, dueDateTime)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="custom-scrollbar max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-[#7C3AED]">WEEK {activeWeek} ASSIGNMENT SETTING</p>
            <h3 className="mt-1 text-xl font-extrabold text-gray-900"><i className="fas fa-edit mr-2 text-[#7C3AED]" />과제 및 가이드라인 편집</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-900"><i className="fas fa-times text-xl" /></button>
        </div>
        <form onSubmit={submit} className="p-6">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-gray-700">이번 주 과제 타이틀 (주제) *</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-gray-700">과제 핵심 목표 (한 줄 요약)</span>
              <input value={summary} onChange={(event) => setSummary(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center justify-between text-sm font-extrabold text-gray-700">
                상세 가이드라인 및 필수 조건 *
                <span className="text-[10px] font-bold text-gray-400">Markdown 지원</span>
              </span>
              <textarea value={guideline} onChange={(event) => setGuideline(event.target.value)} required className="h-48 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" placeholder="- 구현해야 할 기능&#10;- 제출 방식&#10;- 평가 기준" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-gray-700">제출 마감 일시 *</span>
              <input type="datetime-local" value={dueDateTime} onChange={(event) => setDueDateTime(event.target.value)} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" />
            </label>
          </div>
          <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50">취소</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60">
              <i className="fas fa-save mr-2" />저장 및 수강생에게 알림
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FeedbackModal({ row, activeWeek, onClose, onSubmit }: { row: AssignmentStudentRow; activeWeek: number; onClose: () => void; onSubmit: (row: AssignmentStudentRow, result: 'pass' | 'reject') => void }) {
  const [result, setResult] = useState<'pass' | 'reject'>('pass')
  const [feedback, setFeedback] = useState('')

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-[#7C3AED]">WEEK {activeWeek} CODE REVIEW</p>
            <h3 className="mt-1 text-xl font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'} 수강생의 과제 리뷰</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-900"><i className="fas fa-times text-xl" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="mb-2 text-xs font-extrabold text-blue-700">수강생 코멘트</p>
            <p className="text-sm leading-6 text-gray-700">{row.message}</p>
            <a href={row.prUrl} className="mt-3 inline-flex items-center text-xs font-bold text-blue-600 hover:underline">
              <i className="fab fa-github mr-1.5" />GitHub PR 링크 바로가기
            </a>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-gray-700"><i className="fas fa-pen mr-2 text-[#7C3AED]" />멘토 피드백</span>
            <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} className="h-48 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" placeholder="잘한 점, 개선할 점, 다음 액션을 Markdown 형식으로 작성하세요." />
          </label>
          <div>
            <p className="mb-3 text-sm font-extrabold text-gray-700">리뷰 결과</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-4 transition ${result === 'pass' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <input type="radio" checked={result === 'pass'} onChange={() => setResult('pass')} className="sr-only" />
                <span className="text-sm font-extrabold text-green-600"><i className="fas fa-check-circle mr-2" />Pass (통과)</span>
                <p className="mt-1 text-xs text-gray-500">요구사항을 충족해 다음 주차로 진행합니다.</p>
              </label>
              <label className={`cursor-pointer rounded-xl border p-4 transition ${result === 'reject' ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
                <input type="radio" checked={result === 'reject'} onChange={() => setResult('reject')} className="sr-only" />
                <span className="text-sm font-extrabold text-red-600"><i className="fas fa-undo mr-2" />수정 요청 (Reject)</span>
                <p className="mt-1 text-xs text-gray-500">보완 후 재제출하도록 요청합니다.</p>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50">취소</button>
          <button type="button" onClick={() => onSubmit(row, result)} className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black">
            <i className="fas fa-paper-plane mr-2" />피드백 전송
          </button>
        </div>
      </div>
    </div>
  )
}

function FeedbackHistoryModal({ row, activeWeek, onClose }: { row: AssignmentStudentRow; activeWeek: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-[#7C3AED]">WEEK {activeWeek} CODE REVIEW</p>
            <h3 className="mt-1 text-xl font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'} 수강생의 과제 내역</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-900"><i className="fas fa-times text-xl" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
            <span className="text-sm font-extrabold text-gray-900">리뷰 상태</span>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${row.status === 'pass' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{assignmentStatusLabel(row.status)}</span>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="mb-2 text-xs font-extrabold text-blue-700">수강생 코멘트</p>
            <p className="text-sm leading-6 text-gray-700">{row.message}</p>
            <a href={row.prUrl} className="mt-3 inline-flex items-center text-xs font-bold text-blue-600 hover:underline">
              <i className="fab fa-github mr-1.5" />GitHub PR 링크 바로가기
            </a>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-2 text-xs font-extrabold text-gray-500">멘토 피드백</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{row.mentorComment}</p>
          </div>
        </div>
        <div className="flex justify-end border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black">닫기</button>
        </div>
      </div>
    </div>
  )
}

function AssignmentSuccessModal({ message, onClose }: { message: AssignmentSuccessMessage; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-500">
          <i className="fas fa-check" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">{message.title}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500">{message.description}</p>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}

type StudentProgressRow = {
  member: WorkspaceMember
  weeks: StudentWeekProgress[]
  progress: number
  qnaCount: number
  currentWeek: number
  stalledWeek: number | null
  lagging: boolean
}

type StudentWeekProgress = {
  week: number
  task: WorkspaceTask | null
  status: TaskStatus | 'MISSING' | 'UPCOMING'
}

function StudentsPage({ data }: { data: WorkspaceData }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ontrack' | 'lagging'>('all')
  const [dmTarget, setDmTarget] = useState<StudentProgressRow | null>(null)
  const [detailTarget, setDetailTarget] = useState<StudentProgressRow | null>(null)
  const currentWeek = useMemo(() => inferCurrentAssignmentWeek(data.tasks), [data.tasks])
  const rows = useMemo<StudentProgressRow[]>(() => (data.dashboard?.members ?? [])
    .filter((member) => member.learnerId !== data.dashboard?.ownerId)
    .map((member) => {
      const assigned = data.tasks
        .filter((task) => task.assigneeId === member.learnerId)
        .sort(compareTasksByAssignmentOrder)
      const weeks = buildStudentWeekProgress(assigned, currentWeek)
      const progressedCount = weeks.filter((week) => ['DONE', 'IN_REVIEW', 'IN_PROGRESS'].includes(week.status)).length
      const progress = Math.round((progressedCount / 4) * 100)
      const stalledWeek = weeks.find((week) => week.status === 'MISSING')?.week ?? null
      return {
        member,
        weeks,
        progress,
        qnaCount: data.questions.filter((question) => question.authorId === member.learnerId).length,
        currentWeek,
        stalledWeek,
        lagging: stalledWeek !== null,
      }
    }), [currentWeek, data.dashboard?.members, data.dashboard?.ownerId, data.questions, data.tasks])
  const filteredRows = rows.filter((row) => {
    const matchesName = (row.member.learnerName ?? '').toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'lagging' ? row.lagging : !row.lagging)
    return matchesName && matchesStatus
  })
  const onTrackCount = rows.filter((row) => !row.lagging).length
  const laggingCount = rows.filter((row) => row.lagging).length

  return (
    <>
      <PageHeading page="students" description="전체 수강생의 진도율을 한눈에 파악하고 1:1 학습 코칭을 진행하세요." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon="fas fa-users" label="총 수강생" value={rows.length} suffix="명" tone="text-blue-500" />
        <StatCard icon="fas fa-running" label="진도 정상 (On Track)" value={onTrackCount} suffix="명" tone="text-[#00C471]" />
        <StatCard icon="fas fa-exclamation-triangle" label="진도 지연 (위험군)" value={laggingCount} suffix="명" tone="text-red-500" />
      </div>
      <section className="mb-6 flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-extrabold text-gray-900">수강생 진도 현황</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-9 text-xs font-bold outline-none transition focus:border-[#7C3AED]" placeholder="수강생 이름 검색" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'ontrack' | 'lagging')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 outline-none transition focus:border-[#7C3AED]">
              <option value="all">진도율 전체</option>
              <option value="ontrack">진도 정상 (On Track)</option>
              <option value="lagging">진도 지연 (Lagging)</option>
            </select>
          </div>
        </div>
        {filteredRows.length === 0 ? (
          <EmptyState icon="fas fa-user-graduate" title="표시할 수강생이 없습니다." description="검색 조건에 맞는 수강생이 없거나 아직 멘토링에 참여한 수강생이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-12 gap-4 border-b border-gray-100 bg-white px-6 py-3 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase">
                <span className="col-span-3">수강생 정보</span>
                <span className="col-span-4">전체 진척도 (총 4주차)</span>
                <span className="col-span-3 text-center">주차별 통과 현황</span>
                <span className="col-span-2 text-right">관리 액션</span>
              </div>
              {filteredRows.map((row) => (
                <StudentProgressItem key={row.member.memberId} row={row} onDetail={() => setDetailTarget(row)} onDm={() => setDmTarget(row)} />
              ))}
            </div>
          </div>
        )}
      </section>
      {dmTarget ? <StudentDmModal row={dmTarget} onClose={() => setDmTarget(null)} /> : null}
      {detailTarget ? <StudentDetailModal row={detailTarget} onClose={() => setDetailTarget(null)} /> : null}
    </>
  )
}

function StudentProgressItem({ row, onDetail, onDm }: { row: StudentProgressRow; onDetail: () => void; onDm: () => void }) {
  return (
    <div className={`grid grid-cols-12 items-center gap-4 border-b border-gray-50 px-6 py-4 transition ${row.lagging ? 'border-l-4 border-l-red-500 bg-red-50/20' : 'hover:bg-gray-50/50'}`}>
      <div className="col-span-3 flex items-center gap-3">
        <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className={`h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm ${row.lagging ? 'grayscale opacity-80' : ''}`} alt="" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{row.member.learnerName ?? '수강생'}</p>
          <a href={`https://github.com/${encodeURIComponent((row.member.learnerName ?? 'learner').replace(/\s+/g, '').toLowerCase())}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-block truncate text-[10px] text-gray-400 hover:text-[#00C471] hover:underline"><i className="fab fa-github" /> GitHub</a>
        </div>
      </div>
      <div className="col-span-4 pr-6">
        <div className="mb-1 flex items-end justify-between">
          <span className={`text-[10px] font-bold ${row.lagging ? 'text-red-500' : 'text-gray-500'}`}>{row.lagging ? `진도 지연 (Week ${row.stalledWeek} 정체)` : `진행 중 (Week ${row.currentWeek})`}</span>
          <span className={`text-xs font-black ${row.lagging ? 'text-red-500' : 'text-[#00C471]'}`}>{row.progress}%</span>
        </div>
        <div className={`h-1.5 overflow-hidden rounded-full ${row.lagging ? 'bg-red-100' : 'bg-gray-100'}`}>
          <div className={`h-1.5 rounded-full ${row.lagging ? 'bg-red-500' : 'bg-[#00C471]'}`} style={{ width: `${row.progress}%` }} />
        </div>
      </div>
      <div className="col-span-3 flex justify-center gap-2 text-lg">
        {row.weeks.map((week) => (
          <i key={`${row.member.memberId}-${week.week}-${week.status}`} className={studentWeekIcon(week.status)} title={studentWeekTitle(week)} />
        ))}
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onDetail} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-green-50 hover:text-[#00C471]" title="상세 기록 보기">
          <i className="fas fa-chart-line" />
        </button>
        <button type="button" onClick={onDm} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold whitespace-nowrap shadow-sm transition ${row.lagging ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-gray-200 bg-white text-gray-700 hover:border-[#7C3AED] hover:text-[#7C3AED]'}`}>
          <i className={row.lagging ? 'fas fa-exclamation-circle' : 'fas fa-comment-dots'} /> {row.lagging ? '독려 DM' : '상담 DM'}
        </button>
      </div>
    </div>
  )
}

function inferAssignmentWeek(task: WorkspaceTask, fallback: number) {
  const matched = task.title.match(/(?:week\s*|)([1-4])\s*(?:주차|week)?/i)
  const parsed = matched ? Number(matched[1]) : NaN
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? parsed : fallback
}

function compareTasksByAssignmentOrder(left: WorkspaceTask, right: WorkspaceTask) {
  const leftDate = left.dueDate ?? left.createdAt ?? ''
  const rightDate = right.dueDate ?? right.createdAt ?? ''
  if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)
  return left.taskId - right.taskId
}

function inferCurrentAssignmentWeek(tasks: WorkspaceTask[]) {
  const weeks = tasks.map((task, index) => inferAssignmentWeek(task, (index % 4) + 1))
  return Math.min(4, Math.max(1, ...weeks))
}

function buildStudentWeekProgress(tasks: WorkspaceTask[], currentWeek: number): StudentWeekProgress[] {
  const taskByWeek = new Map<number, WorkspaceTask>()
  tasks.forEach((task, index) => {
    const week = inferAssignmentWeek(task, index + 1)
    if (week >= 1 && week <= 4 && !taskByWeek.has(week)) {
      taskByWeek.set(week, task)
    }
  })

  return [1, 2, 3, 4].map((week) => {
    const task = taskByWeek.get(week) ?? null
    if (!task) return { week, task, status: week <= currentWeek ? 'MISSING' : 'UPCOMING' }
    if (task.status === 'TODO') return { week, task, status: week <= currentWeek ? 'MISSING' : 'UPCOMING' }
    return { week, task, status: task.status }
  })
}

function studentWeekIcon(status: StudentWeekProgress['status']) {
  if (status === 'DONE') return 'fas fa-check-circle text-green-500'
  if (status === 'IN_REVIEW') return 'fas fa-hourglass-half text-yellow-500'
  if (status === 'IN_PROGRESS') return 'fas fa-hourglass-half text-yellow-500'
  if (status === 'MISSING') return 'fas fa-times-circle text-red-500'
  return 'fas fa-circle text-gray-200'
}

function studentWeekTitle(week: StudentWeekProgress) {
  if (week.status === 'DONE') return `${week.week}주차 Pass`
  if (week.status === 'IN_REVIEW' || week.status === 'IN_PROGRESS') return `${week.week}주차 리뷰 대기중`
  if (week.status === 'MISSING') return `${week.week}주차 미제출 (지연)`
  return `${week.week}주차 미진행`
}

function StudentDmModal({ row, onClose }: { row: StudentProgressRow; onClose: () => void }) {
  const [message, setMessage] = useState('')
  return (
    <Modal title="개별 학습 상담 (DM)" icon="fas fa-envelope" maxWidth="max-w-md" onClose={onClose}>
      <div className="space-y-5 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
          <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className="h-11 w-11 rounded-full border-2 border-white bg-white shadow-sm" alt="" />
          <div>
            <p className="text-[10px] font-extrabold text-[#7C3AED]">받는 사람 (수강생)</p>
            <p className="text-sm font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'}</p>
          </div>
        </div>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="h-40 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-6 outline-none transition focus:border-[#7C3AED]" placeholder="수강생에게 전달할 격려 메시지나 조언을 작성해주세요. 해당 수강생의 개인 알림으로 직접 발송됩니다." />
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
        <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700">취소</button>
        <button type="button" onClick={onClose} disabled={!message.trim()} className="rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white disabled:opacity-40">전송</button>
      </div>
    </Modal>
  )
}

function StudentDetailModal({ row, onClose }: { row: StudentProgressRow; onClose: () => void }) {
  return (
    <Modal title="수강생 상세 기록" icon="fas fa-chart-line" maxWidth="max-w-lg" onClose={onClose}>
      <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
        <div className="flex items-center gap-4">
          <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className="h-14 w-14 rounded-full border-2 border-white bg-gray-100 shadow-md" alt="" />
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'}</h3>
            <a href={`https://github.com/${encodeURIComponent((row.member.learnerName ?? 'learner').replace(/\s+/g, '').toLowerCase())}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-[11px] text-gray-500 hover:text-[#00C471] hover:underline"><i className="fab fa-github" /> GitHub 프로필 연동</a>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-1 text-[10px] font-bold text-gray-500">전체 진척도</p>
            <p className={`text-xl font-black ${row.lagging ? 'text-red-500' : 'text-[#00C471]'}`}>{row.progress}%</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-1 text-[10px] font-bold text-gray-500">Q&A 질문 횟수</p>
            <p className="text-xl font-black text-gray-900">{row.qnaCount}<span className="ml-1 text-xs font-medium text-gray-500">회</span></p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-extrabold text-gray-900"><i className="fas fa-history text-[#7C3AED]" /> 주차별 제출 히스토리</h4>
          <div className="relative space-y-3 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent md:before:mx-auto md:before:translate-x-0">
            {row.weeks.map((week) => {
              const tone = studentHistoryTone(week.status)
              return (
                <div key={week.week} className="group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                  <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${tone.circle}`}>
                    <i className={`${tone.icon} text-sm`} />
                  </div>
                  <div className={`w-[calc(100%-4rem)] rounded-xl border p-3 shadow-sm md:w-[calc(50%-2.5rem)] ${tone.card}`}>
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs font-bold text-gray-900">{week.week}주차</span>
                      <span className={`text-[9px] ${tone.labelClass}`}>{tone.label}</span>
                    </div>
                    <p className="truncate text-[10px] text-gray-500">{week.task?.title ?? tone.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 p-5">
        <button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">닫기</button>
      </div>
    </Modal>
  )
}

function studentHistoryTone(status: StudentWeekProgress['status']) {
  if (status === 'DONE') {
    return {
      circle: 'bg-green-100 text-green-500',
      card: 'border-gray-100 bg-white',
      icon: 'fas fa-check',
      label: 'Pass',
      labelClass: 'text-gray-400',
      description: '제출 완료',
    }
  }
  if (status === 'IN_REVIEW' || status === 'IN_PROGRESS') {
    return {
      circle: 'bg-yellow-100 text-yellow-500',
      card: 'border-yellow-200 bg-yellow-50/30',
      icon: 'fas fa-hourglass-half',
      label: '리뷰 대기중',
      labelClass: 'font-bold text-yellow-600',
      description: '현재 제출하여 멘토 확인 중입니다.',
    }
  }
  if (status === 'MISSING') {
    return {
      circle: 'bg-red-100 text-red-500',
      card: 'border-red-200 bg-red-50/30',
      icon: 'fas fa-times',
      label: '미제출',
      labelClass: 'font-bold text-red-500',
      description: '마감 주차 과제가 아직 제출되지 않았습니다.',
    }
  }
  return {
    circle: 'bg-gray-100 text-gray-300',
    card: 'border-gray-100 bg-white',
    icon: 'fas fa-circle',
    label: '미진행',
    labelClass: 'text-gray-400',
    description: '아직 진행 전인 주차입니다.',
  }
}

function QnaPage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<'waiting' | 'answered' | 'all'>('waiting')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<QuestionDetail | null>(null)
  const [answer, setAnswer] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const waitingCount = data.questions.filter((question) => !isQuestionAnswered(question)).length
  const questions = data.questions.filter((question) => {
    const matchesFilter = filter === 'answered' ? isQuestionAnswered(question) : filter === 'waiting' ? !isQuestionAnswered(question) : true
    const searchText = `${question.title} ${question.authorName ?? ''} ${question.content ?? ''}`.toLowerCase()
    return matchesFilter && searchText.includes(query.toLowerCase())
  })
  const selected = data.questions.find((question) => question.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let active = true
    fetchInstructorWorkspaceQuestionDetail(selectedId)
      .then((nextDetail) => {
        if (!active) return
        setDetail(nextDetail)
        const answers = nextDetail.answers ?? []
        setAnswer(answers.length > 0 ? answers[answers.length - 1].content : '')
      })
      .catch(() => { if (active) setDetail(null) })
    return () => { active = false }
  }, [selectedId])

  async function submitAnswer(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !answer.trim()) return
    await createInstructorWorkspaceQuestionAnswer(selectedId, answer.trim())
    pushWorkspaceNotification(workspaceId, {
      title: 'Q&A 답변 등록',
      description: `"${selected?.title ?? '질문'}"에 답변을 등록했습니다.`,
      href: buildHref('qna', workspaceId),
      icon: 'fas fa-comments',
    })
    setAnswer('')
    await reload()
    setSelectedId(null)
    setDetail(null)
    setSuccessOpen(true)
  }

  return (
    <>
      <div className="mb-8 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <i className="fas fa-comments text-blue-500" /> 멘토 Q&A 관리
          </h1>
          <p className="mt-2 text-sm text-gray-500">수강생들의 질문에 답변하고, 문제 해결을 도와주세요.</p>
        </div>
      </div>
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto pb-2">
          {[
            ['waiting', '미답변 (대기중)'],
            ['answered', '답변 완료'],
            ['all', '전체 보기'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value as 'waiting' | 'answered' | 'all')} className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm transition focus:outline-none ${filter === value ? 'border-gray-900 bg-gray-900 font-bold text-white' : 'border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-100'}`}>
              {label}
              {value === 'waiting' && waitingCount > 0 ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{waitingCount}</span> : null}
            </button>
          ))}
        </div>
        <div className="relative hidden w-64 md:block">
          <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="질문, 내용, 수강생 이름 검색" />
        </div>
      </div>
      <div className="space-y-4">
        {questions.length === 0 ? (
          <QnaEmptyState hasAnyQuestion={data.questions.length > 0} hasSearch={query.trim().length > 0} filter={filter} />
        ) : (
          questions.map((question) => {
            const answered = isQuestionAnswered(question)
            return (
              <article key={question.id} className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md md:flex-row md:items-start ${answered ? 'border-gray-200' : 'border-red-200'}`}>
                <div className="w-full flex-1">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={avatarUrl(question.authorName)} className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50" alt="" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{question.authorName ?? '수강생'}</p>
                        <p className="text-[10px] text-gray-400">{relativeTime(question.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-extrabold ${answered ? 'border-blue-100 bg-blue-50 text-blue-600' : 'border-red-100 bg-red-50 text-red-500'}`}>
                      <i className={answered ? 'fas fa-check' : 'fas fa-exclamation-circle'} />
                      {answered ? '답변 완료' : '답변 대기중'}
                    </span>
                  </div>
                  <h4 role="button" tabIndex={0} onClick={() => { setSelectedId(question.id); setAnswer('') }} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedId(question.id) }} className="mb-1.5 cursor-pointer text-base font-extrabold text-gray-900 transition hover:text-[#00C471]">{question.title}</h4>
                  <p role="button" tabIndex={0} onClick={() => { setSelectedId(question.id); setAnswer('') }} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedId(question.id) }} className="line-clamp-2 cursor-pointer text-sm leading-relaxed text-gray-500">
                    {question.content ?? '질문 상세 내용을 확인하려면 답변 창을 열어주세요.'}
                  </p>
                  {answered ? (
                    <div className="mt-3 flex items-start gap-2 border-t border-gray-100 pt-3 opacity-80">
                      <i className="fas fa-reply mt-0.5 text-[10px] text-gray-400" />
                      <p className="line-clamp-1 flex-1 text-xs font-medium text-gray-600">나의 답변: 등록된 답변 {question.answerCount}개</p>
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-gray-100 pt-3 text-xs font-medium text-red-400">
                      <i className="fas fa-info-circle mr-1" /> 아직 멘토님의 답변이 등록되지 않았습니다. 수강생이 기다리고 있어요!
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center md:pt-1">
                  <button type="button" onClick={() => { setSelectedId(question.id); setAnswer('') }} className={`rounded-xl px-5 py-2.5 text-xs font-bold whitespace-nowrap transition ${answered ? 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50' : 'bg-gray-900 text-white shadow-md hover:bg-black'}`}>
                    {answered ? '답변 보기/수정' : '답변하기'}
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
      {selected ? (
        <Modal title={isQuestionAnswered(selected) ? '답변 확인 및 수정' : '답변 작성하기'} icon={isQuestionAnswered(selected) ? 'fas fa-edit' : 'fas fa-pen'} maxWidth="max-w-3xl" onClose={() => setSelectedId(null)}>
          <form onSubmit={submitAnswer}>
            <div className="space-y-6 p-6">
              <div>
                <span className="mb-2 block text-[10px] font-bold text-gray-400">학생의 질문</span>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4">
                    <img src={avatarUrl(selected.authorName)} className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50" alt="" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selected.authorName ?? '수강생'} <span className="ml-2 text-[10px] font-medium text-gray-400">{relativeTime(selected.createdAt)}</span></p>
                      <p className="text-xs text-gray-500">{data.dashboard?.name ?? '멘토링 워크스페이스'}</p>
                    </div>
                  </div>
                  <h4 className="mb-3 text-base font-extrabold text-gray-900">{selected.title}</h4>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{detail?.content ?? selected.content ?? '질문 내용을 불러오는 중입니다.'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <img src={avatarUrl(data.dashboard?.ownerName)} className="h-6 w-6 rounded-full border border-[#7C3AED] bg-white" alt="" />
                  <span className="text-[11px] font-extrabold tracking-wider text-[#7C3AED]">나의 답변 작성</span>
                  <span className="ml-auto text-[10px] text-gray-400">마크다운(Markdown) 및 코드 블록 지원</span>
                </div>
                <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-[200px] w-full resize-y rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="수강생의 질문에 대한 답변을 명확하고 친절하게 작성해주세요." />
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                <i className="fas fa-paper-plane" /> 답변 등록하기
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {successOpen ? <QnaAnswerSuccessModal onClose={() => setSuccessOpen(false)} /> : null}
    </>
  )
}

function QnaEmptyState({ hasAnyQuestion, hasSearch, filter }: { hasAnyQuestion: boolean; hasSearch: boolean; filter: 'waiting' | 'answered' | 'all' }) {
  if (!hasAnyQuestion) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 shadow-sm">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50">
          <i className="fas fa-comments text-2xl text-gray-300" />
        </div>
        <p className="mb-1 text-sm font-bold text-gray-600">아직 등록된 질문이 없습니다.</p>
        <p className="text-xs text-gray-400">수강생이 질문을 남기면 이곳에 표시됩니다.</p>
      </div>
    )
  }

  if (hasSearch) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
        <i className="fas fa-search mb-4 text-4xl text-gray-300 opacity-50" />
        <p className="text-sm font-bold">검색 결과가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
      <i className="fas fa-check-circle mb-4 text-4xl text-gray-300" />
      <p className="text-sm font-bold">해당하는 질문 내역이 없습니다.</p>
      {filter === 'waiting' ? <p className="mt-2 text-xs">모든 질문에 답변을 완료하셨습니다!</p> : null}
    </div>
  )
}

function QnaAnswerSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-blue-50 shadow-sm">
          <i className="fas fa-check text-3xl text-blue-500" />
        </div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">답변 등록 완료!</h3>
        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">수강생에게 성공적으로 답변이 등록되었으며<br />알림이 발송되었습니다.</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}

function SchedulePage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const initialMonth = data.events[0]?.startAt ? new Date(data.events[0].startAt) : new Date()
  const [currentMonth, setCurrentMonth] = useState(() => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1))
  const [eventType, setEventType] = useState<CalendarEventType>('meetup')
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [description, setDescription] = useState('')
  const monthEvents = useMemo(() => data.events.filter((event) => {
    const date = new Date(event.startAt)
    return date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth()
  }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()), [currentMonth, data.events])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDate = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ key: string; day: number | null; dateKey?: string; events: CalendarEvent[]; otherMonth?: boolean }> = []
    for (let index = 0; index < firstDay.getDay(); index += 1) {
      cells.push({ key: `blank-before-${index}`, day: null, events: [], otherMonth: true })
    }
    for (let day = 1; day <= lastDate; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        key: dateKey,
        day,
        dateKey,
        events: monthEvents.filter((event) => event.startAt.slice(0, 10) === dateKey),
      })
    }
    while (cells.length < 42) {
      cells.push({ key: `blank-after-${cells.length}`, day: null, events: [], otherMonth: true })
    }
    return cells
  }, [currentMonth, monthEvents])

  async function createEvent(event: FormEvent) {
    event.preventDefault()
    if (!workspaceId || !title.trim() || !eventDate) return
    const startAt = `${eventDate}T${eventTime || '00:00'}:00`
    const startDate = new Date(startAt)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    const endAt = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`
    await createInstructorWorkspaceCalendarEvent(workspaceId, {
      title: title.trim(),
      description: encodeEventDescription(eventType, description),
      startAt,
      endAt,
    })
    pushWorkspaceNotification(workspaceId, {
      title: '일정 등록',
      description: `"${title.trim()}" 일정이 등록되었습니다.`,
      href: buildHref('schedule', workspaceId),
      icon: EVENT_TYPE_CONFIG[eventType].icon,
    })
    setTitle('')
    setEventDate('')
    setEventTime('')
    setDescription('')
    setEventType('meetup')
    setOpen(false)
    await reload()
  }

  async function deleteEvent() {
    if (!selectedEvent) return
    const deletedTitle = selectedEvent.title
    await deleteInstructorWorkspaceCalendarEvent(selectedEvent.eventId)
    pushWorkspaceNotification(workspaceId, {
      title: '일정 삭제',
      description: `"${deletedTitle}" 일정이 삭제되었습니다.`,
      href: buildHref('schedule', workspaceId),
      icon: 'fas fa-calendar-times',
    })
    setSelectedEvent(null)
    await reload()
  }

  function openForDate(dateKey?: string) {
    setEventDate(dateKey ?? '')
    setOpen(true)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeading
        page="schedule"
        description={<>이곳에서 등록한 일정은 <span className="font-bold text-gray-700">모든 수강생의 캘린더에 공식 일정으로 자동 동기화</span>됩니다.</>}
        action={<button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-plus" /> 새 공식 일정 등록</button>}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-gray-900">{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"><i className="fas fa-chevron-left" /></button>
              <button type="button" onClick={() => setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"><i className="fas fa-chevron-right" /></button>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div key={day} className={`bg-gray-50 p-2 text-center text-xs font-extrabold ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>
            ))}
            {calendarDays.map((cell) => (
              <button key={cell.key} type="button" onClick={() => openForDate(cell.dateKey)} disabled={!cell.day} className={`flex min-h-0 flex-col bg-white p-2 text-left transition ${cell.day ? 'hover:bg-gray-50' : 'pointer-events-none cursor-default bg-gray-50 text-gray-300'}`}>
                {cell.day ? <span className="text-xs font-extrabold text-gray-700">{cell.day}</span> : null}
                <div className="mt-1 min-h-0 flex-1 space-y-1 overflow-hidden">
                  {cell.events.slice(0, 3).map((item) => {
                    const type = eventTypeOf(item)
                    return (
                      <div key={item.eventId} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(item) }} className={`truncate rounded px-1 py-0.5 text-[9px] font-bold leading-tight text-white shadow-sm ${EVENT_LIST_TONE[type].badge}`}>
                        {formatTime(item.startAt)} {EVENT_TYPE_CONFIG[type].label}
                      </div>
                    )
                  })}
                  {cell.events.length > 3 ? <p className="text-[10px] font-bold text-gray-400">+{cell.events.length - 3}개 더보기</p> : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-extrabold text-gray-900"><i className="fas fa-list-ul text-[#7C3AED]" /> 등록된 공식 일정</h3>
          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
            {monthEvents.length === 0 ? <p className="mt-10 text-center text-sm text-gray-400">등록된 일정이 없습니다.</p> : monthEvents.map((event) => {
              const type = eventTypeOf(event)
              const tone = EVENT_LIST_TONE[type]
              return (
                <button key={event.eventId} type="button" onClick={() => setSelectedEvent(event)} className={`relative w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${tone.border} ${tone.bg}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold shadow-sm ${tone.badge}`}><i className={EVENT_TYPE_CONFIG[type].icon} />{EVENT_TYPE_CONFIG[type].label}</span>
                    <span className="text-[10px] font-bold text-gray-400">{formatTime(event.startAt)}</span>
                  </div>
                  <p className="text-xs font-extrabold text-gray-900">{event.title}</p>
                  <p className="mt-1 text-[10px] font-bold text-gray-400">{formatDate(event.startAt)}</p>
                </button>
              )
            })}
          </div>
        </section>
      </div>
      {open ? (
        <Modal title="새 공식 일정 등록" icon="fas fa-plus-circle" maxWidth="max-w-md" onClose={() => setOpen(false)}>
          <form onSubmit={createEvent}>
            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-gray-600">일정 유형 <span className="text-red-500">*</span></span>
                <select value={eventType} onChange={(event) => setEventType(event.target.value as CalendarEventType)} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition focus:border-[#7C3AED]">
                  <option value="meetup">라이브 밋업 (코드 리뷰 등)</option>
                  <option value="deadline">과제 마감일</option>
                  <option value="special">특강 / 기타 일정</option>
                </select>
              </label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">일정 제목</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="예: 3주차 라이브 코드 리뷰" /></label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">날짜 <span className="text-red-500">*</span></span><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#7C3AED]" /></label>
                <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">시간</span><input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#7C3AED]" /></label>
              </div>
              <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">상세 설명</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="수강생들에게 안내할 상세 내용을 입력하세요." /></label>
              <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3">
                <i className="fas fa-info-circle mt-0.5 text-sm text-[#7C3AED]" />
                <p className="text-[11px] font-medium leading-relaxed text-gray-700">등록된 일정은 워크스페이스 내 모든 수강생의 캘린더에 즉시 동기화됩니다.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700">취소</button><button type="submit" className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white"><i className="fas fa-save" /> 등록 및 배포</button></div>
          </form>
        </Modal>
      ) : null}
      {selectedEvent ? (
        <Modal title="공식 일정 상세" icon={EVENT_TYPE_CONFIG[eventTypeOf(selectedEvent)].icon} maxWidth="max-w-sm" onClose={() => setSelectedEvent(null)}>
          <div className="p-6">
            <span className={`mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold shadow-sm ${EVENT_TYPE_CONFIG[eventTypeOf(selectedEvent)].badge}`}>{EVENT_TYPE_CONFIG[eventTypeOf(selectedEvent)].label}</span>
            <h3 className="text-lg font-extrabold leading-tight text-gray-900">{selectedEvent.title}</h3>
            <p className="mt-1 text-xs font-bold text-gray-500"><i className="far fa-clock mr-1" />{formatDate(selectedEvent.startAt)} {formatTime(selectedEvent.startAt)}</p>
            <p className="mt-5 mb-1 text-[10px] font-bold text-gray-400">상세 안내</p>
            <div className="min-h-[80px] rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-700">{eventDescriptionOf(selectedEvent) || '상세 안내가 없습니다.'}</div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 bg-white p-5">
            <button type="button" onClick={deleteEvent} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100"><i className="fas fa-trash-alt mr-1" /> 일정 삭제</button>
            <button type="button" onClick={() => setSelectedEvent(null)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white">확인</button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

function FilesPage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'official' | 'shared' | 'link'>('all')
  const [query, setQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null)
  const files = data.files.filter((file) => {
    const name = workspaceFileName(file)
    const kind = workspaceFileKind(file, data.dashboard?.ownerId)
    const filterMatched = filter === 'all' || kind === filter
    return filterMatched && name.toLowerCase().includes(query.toLowerCase())
  })

  async function deleteFile(file: WorkspaceFile) {
    if (!window.confirm(`'${workspaceFileName(file)}' 자료를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    setDeletingFileId(file.fileId)
    try {
      const deletedName = workspaceFileName(file)
      await deleteInstructorWorkspaceFile(file.fileId)
      if (selectedFile?.fileId === file.fileId) {
        setSelectedFile(null)
      }
      pushWorkspaceNotification(workspaceId, {
        title: '자료 삭제',
        description: `"${deletedName}" 자료가 삭제되었습니다.`,
        href: buildHref('files', workspaceId),
        icon: 'fas fa-trash-alt',
      })
      await reload()
    } finally {
      setDeletingFileId(null)
    }
  }

  return (
    <>
      <PageHeading
        page="files"
        description="수강생들에게 필요한 공식 가이드라인과 레퍼런스를 업로드하고, 공유된 자료들을 관리하세요."
        action={<button type="button" onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-cloud-upload-alt" /> 공식 자료 등록</button>}
      />
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex gap-6 overflow-x-auto px-2">
            {[
              ['all', '전체 자료'],
              ['official', '내가 올린 공식 자료'],
              ['shared', '수강생 공유 자료'],
              ['link', '외부 링크'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value as 'all' | 'official' | 'shared' | 'link')} className={`flex items-center gap-1.5 border-b-2 pb-2 text-sm font-extrabold whitespace-nowrap transition ${filter === value ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-500'}`}>{value === 'official' ? <span className="h-2 w-2 rounded-full bg-[#7C3AED]" /> : null}{value === 'shared' ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : null}{value === 'link' ? <i className="fas fa-link text-gray-400" /> : null}{label}</button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-10 text-sm font-bold outline-none focus:border-[#7C3AED]" placeholder="파일명 또는 작성자 검색..." />
          </div>
        </div>
      </section>
      {files.length === 0 ? (
        <EmptyState icon="fas fa-folder-open" title="등록된 자료가 없습니다." description="수강생들에게 필요한 첫 번째 공식 가이드라인이나 참고 레퍼런스를 공유해주세요." action={<button type="button" onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-md"><i className="fas fa-cloud-upload-alt" /> 첫 공식 자료 등록하기</button>} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => {
            const kind = workspaceFileKind(file, data.dashboard?.ownerId)
            const tone = workspaceFileTone(file)
            return (
              <article key={file.fileId} role="button" tabIndex={0} onClick={() => setSelectedFile(file)} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedFile(file) }} className="group relative cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-lg">
                <div className={`absolute top-4 right-4 text-2xl opacity-20 ${tone.color}`}><i className={tone.icon} /></div>
                <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100" onClick={(event) => event.stopPropagation()}>
                  <button type="button" disabled={deletingFileId === file.fileId} onClick={() => void deleteFile(file)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:text-red-500 disabled:opacity-50" aria-label="자료 삭제"><i className="fas fa-trash text-[10px]" /></button>
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${kind === 'shared' ? 'border-blue-200 bg-blue-50 text-blue-600' : kind === 'link' ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-purple-200 bg-[#EDE9FE] text-[#7C3AED]'}`}>{kind === 'shared' ? '수강생 공유' : kind === 'link' ? '외부 링크' : '멘토 공식'}</span>
                  <span className="text-[10px] font-medium text-gray-400">{file.itemType === 'LINK' ? <><i className="fas fa-external-link-alt mr-1" />새창 열기</> : formatFileSize(file.fileSize)}</span>
                </div>
                <h3 className="line-clamp-2 text-sm font-extrabold text-gray-900">{workspaceFileName(file)}</h3>
                <p className="mt-2 text-[10px] font-bold text-gray-400">{relativeTime(file.createdAt)}</p>
                <p className="mt-1 text-[10px] text-gray-400">{kind === 'official' ? '나 (멘토)' : file.uploadedByName ?? '수강생'}</p>
              </article>
            )
          })}
        </div>
      )}
      {uploadOpen ? <FileUploadModal workspaceId={workspaceId} uploading={uploading} setUploading={setUploading} onClose={() => setUploadOpen(false)} reload={reload} /> : null}
      {selectedFile ? <FileDetailModal file={selectedFile} ownerId={data.dashboard?.ownerId} deleting={deletingFileId === selectedFile.fileId} onClose={() => setSelectedFile(null)} onDelete={deleteFile} /> : null}
    </>
  )
}

function FileUploadModal({ workspaceId, uploading, setUploading, onClose, reload }: { workspaceId: number | null; uploading: boolean; setUploading: (uploading: boolean) => void; onClose: () => void; reload: () => Promise<void> }) {
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notifyStudents, setNotifyStudents] = useState(true)
  const [dragOver, setDragOver] = useState(false)

  function selectFile(file: File | null) {
    setSelectedFile(file)
    if (file && !title.trim()) {
      setTitle(file.name)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!workspaceId || !title.trim()) return
    if (uploadType === 'file' && !selectedFile) return
    if (uploadType === 'link' && !linkUrl.trim()) return

    setUploading(true)
    try {
      if (uploadType === 'link') {
        await createInstructorWorkspaceFileLink(workspaceId, { title: title.trim(), url: linkUrl.trim() })
      } else if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        const created = await uploadInstructorWorkspaceFile(workspaceId, formData)
        if (title.trim() && title.trim() !== selectedFile.name) {
          await updateInstructorWorkspaceFile(created.fileId, { name: title.trim() })
        }
      }
      void notifyStudents
      void description
      pushWorkspaceNotification(workspaceId, {
        title: uploadType === 'link' ? '링크 자료 등록' : '파일 자료 등록',
        description: `"${title.trim()}" 자료가 등록되었습니다.`,
        href: buildHref('files', workspaceId),
        icon: uploadType === 'link' ? 'fas fa-link' : 'fas fa-file-upload',
      })
      await reload()
      onClose()
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal title="공식 자료 등록" icon="fas fa-cloud-upload-alt" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-5 p-6">
          <div className="flex border-b border-gray-200">
            <button type="button" onClick={() => setUploadType('file')} className={`flex-1 border-b-2 pb-2 text-sm font-bold transition ${uploadType === 'file' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>파일 업로드</button>
            <button type="button" onClick={() => setUploadType('link')} className={`flex-1 border-b-2 pb-2 text-sm font-bold transition ${uploadType === 'link' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>외부 링크 공유</button>
          </div>
          {uploadType === 'file' ? (
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition ${dragOver ? 'border-[#7C3AED] bg-[#EDE9FE]' : 'border-gray-300 bg-gray-50'}`}
              onDragOver={(event) => { event.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOver(false)
                selectFile(event.dataTransfer.files[0] ?? null)
              }}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-[#7C3AED] shadow-sm"><i className="fas fa-file-upload" /></div>
              <p className="mb-1 text-sm font-bold text-gray-700">{selectedFile ? selectedFile.name : '클릭하거나 파일을 이곳에 드롭하세요'}</p>
              <p className="text-[10px] text-gray-400">PDF, ZIP, 이미지 파일</p>
              <input type="file" className="hidden" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-gray-600">URL 링크 <span className="text-red-500">*</span></span>
              <input type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="https://" />
            </label>
          )}
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">자료 제목 <span className="text-red-500">*</span></span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="자료의 핵심 내용을 요약해주세요." />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">설명 (선택)</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="수강생들이 이 자료를 어떻게 활용하면 좋을지 가이드라인을 적어주세요." />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
            <input type="checkbox" checked={notifyStudents} onChange={(event) => setNotifyStudents(event.target.checked)} className="h-4 w-4 accent-[#7C3AED]" />
            <span className="text-xs font-bold text-[#7C3AED]">등록 즉시 전체 수강생에게 알림 발송</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">취소</button>
          <button type="submit" disabled={uploading} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60"><i className="fas fa-check" /> {uploading ? '배포 중' : '공식 자료 배포'}</button>
        </div>
      </form>
    </Modal>
  )
}

function FileDetailModal({ file, ownerId, deleting, onClose, onDelete }: { file: WorkspaceFile; ownerId?: number | null; deleting: boolean; onClose: () => void; onDelete: (file: WorkspaceFile) => Promise<void> }) {
  const kind = workspaceFileKind(file, ownerId)
  const name = workspaceFileName(file)
  const info = file.itemType === 'LINK' ? '외부 링크' : `${formatFileSize(file.fileSize)} · ${relativeTime(file.createdAt)}`

  function openResource() {
    if (file.itemType === 'LINK' && file.objectKey) {
      window.open(file.objectKey, '_blank', 'noopener,noreferrer')
      return
    }
    window.location.href = `/api/workspace-files/${file.fileId}/download`
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div className="pr-6">
            <span className={`mb-2 inline-block rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${kind === 'official' ? 'border-purple-200 bg-[#EDE9FE] text-[#7C3AED]' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>{kind === 'official' ? '멘토 공식 자료' : kind === 'link' ? '외부 링크' : '수강생 공유 자료'}</span>
            <h3 className="text-lg font-extrabold leading-tight text-gray-900">{name}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <img src={file.uploaderProfileImage ?? avatarUrl(file.uploadedByName)} className="h-10 w-10 rounded-full bg-white" alt="" />
              <div>
                <p className="mb-1 text-[10px] font-bold text-gray-400">업로더</p>
                <span className="text-xs font-bold text-gray-800">{kind === 'official' ? '나 (멘토)' : file.uploadedByName ?? '수강생'}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[10px] font-bold text-gray-400">파일 정보</p>
              <span className="text-xs font-bold text-gray-800">{info}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-white p-5">
          <button type="button" disabled={deleting} onClick={() => void onDelete(file)} className="flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-100 disabled:opacity-50"><i className="fas fa-trash-alt" /> {deleting ? '삭제 중' : '삭제'}</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200">닫기</button>
            <button type="button" onClick={openResource} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"><i className={file.itemType === 'LINK' ? 'fas fa-external-link-alt' : 'fas fa-download'} /> {file.itemType === 'LINK' ? '열기' : '다운로드'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MeetingPage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null)
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [savingSetup, setSavingSetup] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const nextMeetup = data.events.find((event) => eventTypeOf(event) === 'meetup') ?? null
  const liveRoomUrl = `${window.location.origin}${buildHref('live-meeting', workspaceId)}`
  const [meetup, setMeetup] = useState<MeetingSettings>(() => buildDefaultMeetingSettings(nextMeetup, liveRoomUrl))

  useEffect(() => {
    if (data.meetingSettings) {
      setMeetup({ ...data.meetingSettings, link: data.meetingSettings.link || liveRoomUrl })
      return
    }
    setMeetup(buildDefaultMeetingSettings(nextMeetup, liveRoomUrl))
  }, [data.meetingSettings, liveRoomUrl, nextMeetup])

  async function saveMeetupSettings(nextMeetupSettings: MeetingSettings) {
    if (!workspaceId) return
    const normalized = { ...nextMeetupSettings, link: nextMeetupSettings.link || liveRoomUrl }
    setSavingSetup(true)
    try {
      const saved = await saveInstructorWorkspaceMeetingSettings(workspaceId, normalized)
      setMeetup(parseMeetingSettings(saved, liveRoomUrl) ?? normalized)
      pushWorkspaceNotification(workspaceId, {
        title: '밋업 설정 변경',
        description: `"${normalized.title || '라이브 밋업'}" 설정이 저장되었습니다.`,
        href: buildHref('meeting', workspaceId),
        icon: 'fas fa-cog',
      })
      await reload()
      setSetupOpen(false)
    } finally {
      setSavingSetup(false)
    }
  }

  async function copyMeetupLink() {
    const link = meetup.link || liveRoomUrl
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = link
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function openCreateNote() {
    setEditingNote(null)
    setNoteOpen(true)
  }

  function openEditNote(note: MeetingNote) {
    setSelectedNote(null)
    setEditingNote(note)
    setNoteOpen(true)
  }

  async function deleteNote(note: MeetingNote) {
    if (!window.confirm('이 회의록을 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) return
    setDeletingNoteId(note.noteId)
    try {
      await deleteInstructorWorkspaceMeetingNote(note.noteId)
      if (selectedNote?.noteId === note.noteId) {
        setSelectedNote(null)
      }
      pushWorkspaceNotification(workspaceId, {
        title: '회의록 삭제',
        description: `"${note.title}" 회의록이 삭제되었습니다.`,
        href: buildHref('meeting', workspaceId),
        icon: 'fas fa-trash-alt',
      })
      await reload()
    } finally {
      setDeletingNoteId(null)
    }
  }

  return (
    <>
      <PageHeading
        page="meeting"
        description="라이브 밋업 일정을 설정하고, 종료 후 수강생들을 위해 회의록을 작성해 배포하세요."
        action={<button type="button" onClick={openCreateNote} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-pen-nib" /> 회의록 작성하기</button>}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-broadcast-tower animate-pulse text-red-500" /> 다가오는 라이브 밋업</h2>
            <button type="button" onClick={() => setSetupOpen(true)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:border-[#7C3AED] hover:text-[#7C3AED]"><i className="fas fa-cog mr-1" /> 밋업 설정</button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#7C3AED] bg-white shadow-lg">
            <div className="relative flex h-32 flex-col justify-end bg-[#7C3AED] p-6 text-white">
              <span className={`relative z-10 mb-2 w-fit rounded px-2 py-1 text-[10px] font-extrabold shadow-sm ${meetup.status === 'ON AIR' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}>{meetup.status}</span>
              <h3 className="relative z-10 text-lg font-black leading-tight">{meetup.title || '등록된 라이브 밋업이 없습니다.'}</h3>
            </div>
            <div className="p-5">
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className="far fa-calendar-alt" /></div>
                  <span>{meetup.date || '일정 미정'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className="far fa-clock" /></div>
                  <span>{meetup.time || '시간 미정'}</span>
                </div>
              </div>
              <p className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">{meetup.description || '밋업 설정에서 설명을 등록하세요.'}</p>
              <a href={buildHref('live-meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C471] py-3.5 text-sm font-bold text-white shadow-md"><i className="fas fa-sign-in-alt" /> 밋업 호스트로 입장하기</a>
              <button type="button" onClick={() => void copyMeetupLink()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50"><i className="fas fa-link" /> {copied ? '복사 완료' : '외부 참여 링크 복사'}</button>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-archive text-gray-400" /> 지난 밋업 회의록 (아카이브)</h2>
          {data.meetingNotes.length === 0 ? (
            <EmptyState icon="fas fa-clipboard-list" title="등록된 회의록이 없습니다." description="멘토링 후 회의록을 저장하면 주차별 진행 기록으로 남습니다." />
          ) : (
            <div className="space-y-4">
              {data.meetingNotes.map((note) => {
                const meta = meetingNoteMetaOf(note)
                const content = meetingNoteContentOf(note)
                const preview = content.replace(/\n/g, ' ')
                return (
                  <article
                    key={note.noteId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedNote(note)}
                    onKeyDown={(event) => { if (event.key === 'Enter') setSelectedNote(note) }}
                    className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">{meta.week !== '0' ? `Week ${meta.week}` : '공통'}</span>
                        <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">회의록</span>
                        <span className="ml-1 text-[10px] font-bold text-gray-400">{meetingNoteDateLabel(meta.date || note.createdAt)}</span>
                      </div>
                      <div className="flex shrink-0 gap-1" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => openEditNote(note)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]" aria-label="회의록 수정"><i className="fas fa-pen text-[10px]" /></button>
                        <button type="button" disabled={deletingNoteId === note.noteId} onClick={() => void deleteNote(note)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-red-200 hover:text-red-500 disabled:opacity-50" aria-label="회의록 삭제"><i className="fas fa-trash text-[10px]" /></button>
                      </div>
                    </div>
                    <h4 className="mb-2 text-base font-extrabold text-gray-900">{note.title}</h4>
                    <p className="line-clamp-2 text-sm text-gray-500">{preview ? `${preview.slice(0, 90)}${preview.length > 90 ? '...' : ''}` : '내용 없음'}</p>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
      {setupOpen ? <MeetupSetupModal meetup={meetup} saving={savingSetup} onClose={() => setSetupOpen(false)} onSave={saveMeetupSettings} /> : null}
      {noteOpen ? <MeetingNoteModal workspaceId={workspaceId} note={editingNote} reload={reload} onClose={() => { setNoteOpen(false); setEditingNote(null) }} /> : null}
      {selectedNote ? <MeetingNoteDetailModal note={selectedNote} deleting={deletingNoteId === selectedNote.noteId} onClose={() => setSelectedNote(null)} onEdit={openEditNote} onDelete={deleteNote} /> : null}
    </>
  )
}

function MeetupSetupModal({ meetup, saving, onClose, onSave }: { meetup: MeetingSettings; saving: boolean; onClose: () => void; onSave: (meetup: MeetingSettings) => Promise<void> }) {
  const [draft, setDraft] = useState(meetup)

  function updateField(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <Modal title="라이브 밋업 설정" icon="fas fa-cog" onClose={onClose}>
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-800">해당 주차</span>
            <select value={draft.week} onChange={(event) => updateField('week', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#7C3AED]">
              <option value="1주차">1주차 (Week 1)</option>
              <option value="2주차">2주차 (Week 2)</option>
              <option value="3주차">3주차 (Week 3)</option>
              <option value="4주차">4주차 (Week 4)</option>
              <option value="기타">선택 안함 (특강 등)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-800">진행 상태</span>
            <select value={draft.status} onChange={(event) => updateField('status', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#7C3AED]">
              <option value="UPCOMING">예정됨 (UPCOMING)</option>
              <option value="ON AIR">진행 중 (ON AIR)</option>
            </select>
          </label>
        </div>
        <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">밋업 제목 <span className="text-red-500">*</span></span><input value={draft.title} onChange={(event) => updateField('title', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#7C3AED]" /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">진행 날짜 <span className="text-red-500">*</span></span><input value={draft.date} onChange={(event) => updateField('date', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="예: 2026.02.20 (금)" /></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">진행 시간 <span className="text-red-500">*</span></span><input value={draft.time} onChange={(event) => updateField('time', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="예: 20:00 ~ 21:30" /></label>
        </div>
        <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">상세 설명</span><textarea value={draft.description} onChange={(event) => updateField('description', event.target.value)} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed outline-none focus:border-[#7C3AED]" /></label>
        <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">화상 회의 링크 (Zoom, Google Meet 등)</span><input type="url" value={draft.link} onChange={(event) => updateField('link', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="https://..." /></label>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
        <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700">취소</button>
        <button type="button" disabled={saving} onClick={() => void onSave(draft)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"><i className="fas fa-check" /> {saving ? '저장 중' : '밋업 설정 저장'}</button>
      </div>
    </Modal>
  )
}

function MeetingNoteModal({ workspaceId, note, reload, onClose }: { workspaceId: number | null; note?: MeetingNote | null; reload: () => Promise<void>; onClose: () => void }) {
  const noteMeta = note ? meetingNoteMetaOf(note) : null
  const [week, setWeek] = useState(noteMeta?.week ?? '3')
  const [title, setTitle] = useState(note?.title ?? '')
  const [date, setDate] = useState(noteMeta?.date ?? '')
  const [content, setContent] = useState(note ? meetingNoteContentOf(note) : '')
  const [notifyStudents, setNotifyStudents] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const editing = Boolean(note)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!workspaceId || !title.trim() || !date || !content.trim()) return
    setSubmitting(true)
    try {
      await saveInstructorWorkspaceMeetingNote(workspaceId, note?.noteId ?? null, { title: title.trim(), content: encodeMeetingNoteContent(week, date, content) })
      void notifyStudents
      pushWorkspaceNotification(workspaceId, {
        title: editing ? '회의록 수정' : '회의록 발행',
        description: `"${title.trim()}" 회의록이 ${editing ? '수정' : '등록'}되었습니다.`,
        href: buildHref('meeting', workspaceId),
        icon: 'fas fa-clipboard-list',
      })
      await reload()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={editing ? '회의록 수정' : '회의록 작성'} icon={editing ? 'fas fa-edit' : 'fas fa-pen-nib'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-gray-800">해당 주차 <span className="text-red-500">*</span></span>
              <select value={week} onChange={(event) => setWeek(event.target.value)} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#7C3AED]">
                <option value="0">선택안함 (공통)</option>
                <option value="1">1주차 (Week 1)</option>
                <option value="2">2주차 (Week 2)</option>
                <option value="3">3주차 (Week 3)</option>
                <option value="4">4주차 (Week 4)</option>
              </select>
            </label>
            <label className="block md:col-span-2"><span className="mb-2 block text-xs font-bold text-gray-800">회의록 제목 <span className="text-red-500">*</span></span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#7C3AED]" placeholder="예: 라이브 코드 리뷰 요약" /></label>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-800">밋업 진행일 <span className="text-red-500">*</span></span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED] md:w-1/2" />
          </label>
          <label className="block">
            <div className="mb-2 flex items-end justify-between">
              <span className="block text-xs font-bold text-gray-800">회의 내용 및 피드백 요약 <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-gray-400">마크다운(Markdown) 지원</span>
            </div>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[300px] w-full resize-y rounded-xl border border-gray-200 p-4 text-sm leading-relaxed outline-none focus:border-[#7C3AED]" placeholder="밋업에서 다루었던 핵심 내용, 자주 나온 질문, 우수 사례 등을 자유롭게 작성해주세요." />
          </label>
          <label className="flex cursor-pointer select-none items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
            <input type="checkbox" checked={notifyStudents} onChange={(event) => setNotifyStudents(event.target.checked)} className="h-4 w-4 accent-[#7C3AED]" />
            <span className="text-xs font-bold text-[#7C3AED]">등록 즉시 전체 수강생에게 알림 발송</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700">취소</button><button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"><i className="fas fa-save" /> {submitting ? '저장 중' : '저장 및 배포'}</button></div>
      </form>
    </Modal>
  )
}

function MeetingNoteDetailModal({ note, deleting, onClose, onEdit, onDelete }: { note: MeetingNote; deleting: boolean; onClose: () => void; onEdit: (note: MeetingNote) => void; onDelete: (note: MeetingNote) => Promise<void> }) {
  const meta = meetingNoteMetaOf(note)
  const content = meetingNoteContentOf(note)

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div className="pr-8">
            <div className="mb-2 flex items-center gap-2">
              {meta.week !== '0' ? <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">Week {meta.week}</span> : null}
              <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">MEETING NOTE</span>
            </div>
            <h3 className="mb-1 text-lg font-extrabold leading-tight text-gray-900">{note.title}</h3>
            <p className="text-[10px] font-bold text-gray-400">{meetingNoteDateLabel(meta.date || note.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div className="whitespace-pre-line text-sm font-medium leading-relaxed text-gray-700">{content || '회의록 상세 내용이 없습니다.'}</div>
        </div>
        <div className="flex shrink-0 justify-between border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" disabled={deleting} onClick={() => void onDelete(note)} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-50"><i className="fas fa-trash-alt mr-1" /> {deleting ? '삭제 중' : '삭제'}</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">닫기</button>
            <button type="button" onClick={() => onEdit(note)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">수정하기</button>
          </div>
        </div>
      </div>
    </div>
  )
}

type LivePeer = {
  userId: number
  userName: string
  stream: MediaStream
  screenSharing?: boolean
}

type LiveSignalMessage = {
  type: 'peer-list' | 'peer-joined' | 'peer-left' | 'offer' | 'answer' | 'ice-candidate' | 'screen-share-start' | 'screen-share-stop' | 'error'
  peers?: Array<{ userId: number; userName: string }>
  fromUserId?: number
  fromUserName?: string
  targetUserId?: number
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>
  detail?: string
}

function StreamVideo({ stream, className, muted = false }: { stream: MediaStream | null; className: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return <video ref={videoRef} className={className} autoPlay playsInline muted={muted} />
}

function LiveMeetingPage({ data, workspaceId }: { data: WorkspaceData; workspaceId: number | null }) {
  const session = useMemo(() => readStoredAuthSession(), [])
  const channelId = workspaceId
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [remotePeers, setRemotePeers] = useState<LivePeer[]>([])
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [connected, setConnected] = useState(false)
  const [recording, setRecording] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; content: string; own?: boolean }>>([])
  const [sideTab, setSideTab] = useState<'chat' | 'users'>('chat')
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map())
  const pendingIceCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const members = data.dashboard?.members ?? []
  const participantCount = remotePeers.length + 1

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  const closePeerConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((connection) => connection.close())
    peerConnectionsRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    setRemotePeers([])
  }, [])

  const sendSignalingMessage = useCallback((type: 'offer' | 'answer' | 'ice-candidate', targetUserId: number, payload: RTCSessionDescriptionInit | RTCIceCandidateInit) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type, targetUserId, payload }))
  }, [])

  const broadcastRoomEvent = useCallback((type: 'screen-share-start' | 'screen-share-stop', payload: Record<string, unknown> = {}) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type, payload }))
  }, [])

  const attachRemoteStream = useCallback((userId: number, userName: string, stream: MediaStream) => {
    setRemotePeers((current) => {
      const existing = current.find((peer) => peer.userId === userId)
      if (existing) {
        return current.map((peer) => peer.userId === userId ? { ...peer, userName, stream } : peer)
      }
      return [...current, { userId, userName, stream }]
    })
  }, [])

  const getOrCreatePeerConnection = useCallback((peer: { userId: number; userName: string }) => {
    const existing = peerConnectionsRef.current.get(peer.userId)
    if (existing) return existing

    const peerConnection = new RTCPeerConnection({ iceServers: getVoiceIceServers() })
    const currentLocalStream = localStreamRef.current

    currentLocalStream?.getTracks().forEach((track) => peerConnection.addTrack(track, currentLocalStream))
    screenStreamRef.current?.getVideoTracks().forEach((track) => peerConnection.addTrack(track, screenStreamRef.current as MediaStream))

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage('ice-candidate', peer.userId, event.candidate.toJSON())
      }
    }
    peerConnection.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track])
      attachRemoteStream(peer.userId, peer.userName, stream)
    }
    peerConnection.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(peerConnection.connectionState)) {
        setRemotePeers((current) => current.filter((item) => item.userId !== peer.userId))
      }
    }

    peerConnectionsRef.current.set(peer.userId, peerConnection)
    return peerConnection
  }, [attachRemoteStream, sendSignalingMessage])

  const startOffer = useCallback(async (peer: { userId: number; userName: string }) => {
    const peerConnection = getOrCreatePeerConnection(peer)
    if (peerConnection.signalingState !== 'stable') return
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    if (peerConnection.localDescription) {
      sendSignalingMessage('offer', peer.userId, peerConnection.localDescription.toJSON())
    }
  }, [getOrCreatePeerConnection, sendSignalingMessage])

  const handlePeerAvailable = useCallback(async (peer: { userId: number; userName: string }) => {
    if (!session?.userId || peer.userId === session.userId) return
    getOrCreatePeerConnection(peer)
    if (session.userId < peer.userId) {
      await startOffer(peer)
    }
  }, [getOrCreatePeerConnection, session?.userId, startOffer])

  const renegotiateAllPeerConnections = useCallback(async () => {
    await Promise.all([...peerConnectionsRef.current.entries()].map(async ([userId, peerConnection]) => {
      if (peerConnection.signalingState !== 'stable') return
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      if (peerConnection.localDescription) {
        sendSignalingMessage('offer', userId, peerConnection.localDescription.toJSON())
      }
    }))
  }, [sendSignalingMessage])

  const handleSignalMessage = useCallback(async (rawMessage: string) => {
    const message = JSON.parse(rawMessage) as LiveSignalMessage

    if (message.type === 'peer-list') {
      await Promise.all((message.peers ?? []).map((peer) => handlePeerAvailable(peer)))
      return
    }
    if (message.type === 'peer-joined' && message.fromUserId && message.fromUserName) {
      await handlePeerAvailable({ userId: message.fromUserId, userName: message.fromUserName })
      return
    }
    if (message.type === 'peer-left' && message.fromUserId) {
      peerConnectionsRef.current.get(message.fromUserId)?.close()
      peerConnectionsRef.current.delete(message.fromUserId)
      setRemotePeers((current) => current.filter((peer) => peer.userId !== message.fromUserId))
      return
    }
    if (message.type === 'offer' && message.fromUserId && message.fromUserName && message.payload) {
      const peer = { userId: message.fromUserId, userName: message.fromUserName }
      const peerConnection = getOrCreatePeerConnection(peer)
      if (peerConnection.signalingState !== 'stable') {
        await peerConnection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit).catch(() => undefined)
      }
      await peerConnection.setRemoteDescription(message.payload as RTCSessionDescriptionInit)
      const candidates = pendingIceCandidatesRef.current.get(peer.userId) ?? []
      pendingIceCandidatesRef.current.delete(peer.userId)
      await Promise.all(candidates.map((candidate) => peerConnection.addIceCandidate(candidate).catch(() => undefined)))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      if (peerConnection.localDescription) {
        sendSignalingMessage('answer', peer.userId, peerConnection.localDescription.toJSON())
      }
      return
    }
    if (message.type === 'answer' && message.fromUserId && message.fromUserName && message.payload) {
      const peerConnection = getOrCreatePeerConnection({ userId: message.fromUserId, userName: message.fromUserName })
      if (peerConnection.signalingState !== 'stable') {
        await peerConnection.setRemoteDescription(message.payload as RTCSessionDescriptionInit)
      }
      const candidates = pendingIceCandidatesRef.current.get(message.fromUserId) ?? []
      pendingIceCandidatesRef.current.delete(message.fromUserId)
      await Promise.all(candidates.map((candidate) => peerConnection.addIceCandidate(candidate).catch(() => undefined)))
      return
    }
    if (message.type === 'ice-candidate' && message.fromUserId && message.fromUserName && message.payload) {
      const peerConnection = getOrCreatePeerConnection({ userId: message.fromUserId, userName: message.fromUserName })
      const candidate = message.payload as RTCIceCandidateInit
      if (!peerConnection.remoteDescription) {
        const candidates = pendingIceCandidatesRef.current.get(message.fromUserId) ?? []
        candidates.push(candidate)
        pendingIceCandidatesRef.current.set(message.fromUserId, candidates)
        return
      }
      await peerConnection.addIceCandidate(candidate).catch(() => undefined)
      return
    }
    if ((message.type === 'screen-share-start' || message.type === 'screen-share-stop') && message.fromUserId) {
      setRemotePeers((current) => current.map((peer) => peer.userId === message.fromUserId ? { ...peer, screenSharing: message.type === 'screen-share-start' } : peer))
      return
    }
    if (message.type === 'error') {
      setError(message.detail ?? '라이브 룸 연결 오류가 발생했습니다.')
    }
  }, [getOrCreatePeerConnection, handlePeerAvailable, sendSignalingMessage])

  const startMeeting = useCallback(async () => {
    if (!channelId || !session?.accessToken) {
      setError('로그인 세션이나 워크스페이스 정보가 없어 라이브 룸을 열 수 없습니다.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('현재 브라우저에서 카메라와 마이크를 사용할 수 없습니다.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      setLocalStream(stream)
      setMicOn(true)
      setCamOn(true)
      setError(null)

      const socket = new WebSocket(buildVoiceSignalingUrl(channelId, session.accessToken))
      socketRef.current = socket
      socket.onopen = () => setConnected(true)
      socket.onmessage = (event) => {
        void handleSignalMessage(event.data).catch(() => setError('시그널링 메시지를 처리하지 못했습니다.'))
      }
      socket.onerror = () => setError('시그널링 서버에 연결하지 못했습니다.')
      socket.onclose = () => {
        setConnected(false)
        socketRef.current = null
        closePeerConnections()
      }
    } catch {
      setError('카메라 또는 마이크 권한을 허용해야 라이브 미팅을 시작할 수 있습니다.')
    }
  }, [channelId, closePeerConnections, handleSignalMessage, session?.accessToken])

  const leaveMeeting = useCallback(() => {
    mediaRecorderRef.current?.stop()
    socketRef.current?.close()
    socketRef.current = null
    closePeerConnections()
    stopStream(localStreamRef.current)
    stopStream(screenStreamRef.current)
    localStreamRef.current = null
    screenStreamRef.current = null
    setLocalStream(null)
    setScreenStream(null)
    setConnected(false)
    window.location.href = buildHref('meeting', workspaceId)
  }, [closePeerConnections, stopStream, workspaceId])

  useEffect(() => {
    void startMeeting()
    return () => {
      socketRef.current?.close()
      closePeerConnections()
      stopStream(localStreamRef.current)
      stopStream(screenStreamRef.current)
    }
  }, [closePeerConnections, startMeeting, stopStream])

  function toggleMic() {
    const enabled = !micOn
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = enabled })
    setMicOn(enabled)
  }

  function toggleCam() {
    const enabled = !camOn
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = enabled })
    setCamOn(enabled)
  }

  async function toggleScreenShare() {
    if (screenStreamRef.current) {
      stopStream(screenStreamRef.current)
      screenStreamRef.current = null
      setScreenStream(null)
      broadcastRoomEvent('screen-share-stop')
      await renegotiateAllPeerConnections()
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
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        screenStreamRef.current = null
        setScreenStream(null)
        broadcastRoomEvent('screen-share-stop')
        void renegotiateAllPeerConnections()
      })
      stream.getTracks().forEach((track) => {
        peerConnectionsRef.current.forEach((connection) => connection.addTrack(track, stream))
      })
      broadcastRoomEvent('screen-share-start')
      await renegotiateAllPeerConnections()
    } catch {
      setError('화면 공유가 취소되었거나 권한이 허용되지 않았습니다.')
    }
  }

  function toggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      return
    }
    const sourceStream = screenStreamRef.current ?? localStreamRef.current
    if (!sourceStream) {
      setError('녹화할 미디어 스트림이 없습니다.')
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
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `devpath-live-meeting-${Date.now()}.webm`
      link.click()
      URL.revokeObjectURL(url)
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setRecording(true)
  }

  function sendChat() {
    const content = messageInput.trim()
    if (!content) return
    setMessages((current) => [...current, { id: Date.now(), sender: session?.name ?? '나', content, own: true }])
    setMessageInput('')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={leaveMeeting} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white"><i className="fas fa-arrow-left" /></button>
          <div>
            <div className="mb-0.5 flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${connected ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'}`}><i className="fas fa-circle mr-1 animate-pulse" />{connected ? 'LIVE' : '연결 중'}</span>
              <span className="rounded border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-400">HOST 권한</span>
            </div>
            <h1 className="text-sm font-bold leading-none text-white">3주차 라이브 코드 리뷰</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-300"><i className="far fa-clock mr-1" />실시간</span>
          <button type="button" onClick={() => setSideTab('users')} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400"><i className="fas fa-users" /><span className="ml-1 text-[10px] text-[#00C471]">{participantCount}</span></button>
        </div>
      </header>
      {error ? <div className="bg-red-500 px-6 py-2 text-xs font-bold text-white">{error}</div> : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <main className="flex min-h-0 flex-col bg-black">
          <div className="custom-scrollbar grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
            <div className="group relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-gray-700 bg-gray-900">
              {localStream && camOn ? <StreamVideo stream={localStream} muted className="h-full w-full object-cover" /> : (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#7C3AED] text-2xl font-black">M</div>
                  <p className="text-lg font-extrabold">{data.dashboard?.ownerName ?? session?.name ?? '멘토'}</p>
                  <p className="mt-1 text-xs font-bold text-gray-400">{localStream ? '카메라 꺼짐' : '카메라 연결 중'}</p>
                </div>
              )}
              <span className="absolute top-4 left-4 rounded bg-red-500 px-2 py-1 text-[10px] font-extrabold">HOST</span>
              {!micOn ? <span className="absolute right-4 bottom-4 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold"><i className="fas fa-microphone-slash mr-1" />음소거</span> : null}
            </div>
            {screenStream ? (
              <div className="relative min-h-[260px] overflow-hidden rounded-2xl border border-[#00C471] bg-gray-900">
                <StreamVideo stream={screenStream} muted className="h-full w-full object-contain" />
                <span className="absolute top-4 left-4 rounded bg-[#00C471] px-2 py-1 text-[10px] font-extrabold text-white">내 화면 공유</span>
              </div>
            ) : null}
            {remotePeers.map((peer) => (
              <div key={peer.userId} className="group relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
                <StreamVideo stream={peer.stream} className="h-full w-full object-cover" />
                <div className="absolute right-3 bottom-3 rounded bg-black/70 px-2 py-1 text-[10px] font-bold">{peer.userName}{peer.screenSharing ? ' · 화면 공유 중' : ''}</div>
              </div>
            ))}
            {remotePeers.length === 0 && members.slice(0, 3).map((member) => (
              <div key={member.memberId} className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900/70">
                <div className="text-center">
                  <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="mx-auto mb-3 h-16 w-16 rounded-full border border-gray-700 bg-gray-800" alt="" />
                  <p className="text-sm font-bold">{member.learnerName ?? '수강생'}</p>
                  <p className="mt-1 text-[10px] text-gray-500">입장 대기</p>
                </div>
              </div>
            ))}
          </div>
          <footer className="flex h-20 shrink-0 items-center justify-center border-t border-gray-900 bg-gray-950">
            <div className="flex items-center gap-4">
              <button type="button" onClick={toggleMic} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${micOn ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-red-500/30 bg-red-500 text-white'}`}><i className={micOn ? 'fas fa-microphone' : 'fas fa-microphone-slash'} /></button>
              <button type="button" onClick={toggleCam} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${camOn ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-red-500/30 bg-red-500 text-white'}`}><i className={camOn ? 'fas fa-video' : 'fas fa-video-slash'} /></button>
              <button type="button" onClick={() => void toggleScreenShare()} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg text-white shadow-lg transition ${screenStream ? 'bg-blue-500 shadow-blue-900/30' : 'bg-[#00C471] shadow-green-900/30'}`}><i className="fas fa-desktop" /></button>
              <button type="button" onClick={toggleRecord} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${recording ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-900/50' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'}`}><i className="fas fa-record-vinyl" /></button>
              <button type="button" onClick={leaveMeeting} className="flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-6 font-bold text-white shadow-lg shadow-red-900/50"><i className="fas fa-phone-slash" /> 밋업 종료</button>
            </div>
          </footer>
        </main>
        <aside className="flex min-h-0 flex-col border-l border-gray-800 bg-gray-900">
          <div className="flex shrink-0 border-b border-gray-800">
            <button type="button" onClick={() => setSideTab('chat')} className={`flex-1 border-b-2 py-4 text-sm font-bold ${sideTab === 'chat' ? 'border-[#00C471] text-white' : 'border-transparent text-gray-500'}`}>실시간 채팅</button>
            <button type="button" onClick={() => setSideTab('users')} className={`flex-1 border-b-2 py-4 text-sm font-bold ${sideTab === 'users' ? 'border-[#00C471] text-white' : 'border-transparent text-gray-500'}`}>참여자 ({participantCount})</button>
          </div>
          {sideTab === 'chat' ? (
            <>
              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                <div className="my-2 text-center"><span className="rounded-full bg-gray-800 px-3 py-1 text-[10px] font-medium text-gray-400">밋업이 시작되었습니다.</span></div>
                {messages.map((message) => (
                  <div key={message.id} className={`flex items-start gap-3 ${message.own ? 'flex-row-reverse' : ''}`}>
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#7C3AED]" />
                    <div>
                      <p className={`mb-1 text-[10px] font-bold text-gray-400 ${message.own ? 'text-right' : ''}`}>{message.sender}</p>
                      <div className={`max-w-[220px] rounded-2xl p-3 text-xs leading-5 ${message.own ? 'rounded-tr-none bg-[#00C471] text-white' : 'rounded-tl-none bg-gray-800 text-gray-200'}`}>{message.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-gray-800 p-4">
                <div className="flex gap-2 rounded-xl border border-gray-700 bg-gray-800 p-2">
                  <input value={messageInput} onChange={(event) => setMessageInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendChat() }} className="flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-gray-500" placeholder="메시지를 입력하세요..." />
                  <button type="button" onClick={sendChat} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C471] text-white"><i className="fas fa-paper-plane text-xs" /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
              <button type="button" onClick={toggleMic} className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-800 py-2 text-xs font-bold text-white transition hover:bg-gray-700"><i className="fas fa-volume-mute mr-1" /> 내 마이크 {micOn ? '끄기' : '켜기'}</button>
              <div className="rounded-xl bg-gray-800 p-3">
                <p className="text-sm font-bold">{session?.name ?? '나'}</p>
                <p className="mt-1 text-[10px] text-[#00C471]">호스트 · 접속 중</p>
              </div>
              {remotePeers.map((peer) => (
                <div key={peer.userId} className="rounded-xl bg-gray-800 p-3">
                  <p className="text-sm font-bold">{peer.userName}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{peer.screenSharing ? '화면 공유 중' : '접속 중'}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function NoticeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (title: string, content: string, important: boolean) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [important, setImportant] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(title.trim(), content.trim(), important)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-bullhorn text-[#7C3AED]" /> 새 공지사항 작성</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400"><i className="fas fa-times" /></button>
        </div>
        <div className="space-y-5 p-6">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">공지 제목 <span className="text-red-500">*</span></span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="수강생들에게 보일 제목을 입력하세요." />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">상세 내용 <span className="text-red-500">*</span></span>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} className="h-32 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="안내할 내용을 상세히 적어주세요. 마크다운(Markdown) 입력이 지원됩니다." />
          </label>
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-red-500" />
              <span className="select-none text-sm font-bold text-red-500">중요 공지로 설정 (수강생 알림 강조)</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700">취소</button>
          <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
            <i className="fas fa-paper-plane" />작성 및 푸시 알림 전송
          </button>
        </div>
      </form>
    </div>
  )
}

function NoticeSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-3xl text-[#7C3AED] shadow-sm">
          <i className="fas fa-check" />
        </div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">배포 완료!</h3>
        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">공지사항이 워크스페이스에 등록되었으며,<br />모든 수강생에게 알림이 발송되었습니다.</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-[#7C3AED] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-700">확인</button>
      </div>
    </div>
  )
}

export default function InstructorWsDashboardApp({ page = 'dashboard' }: { page?: InstructorWsPage }) {
  const session = useMemo(() => readStoredAuthSession(), [])
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [data, setData] = useState<WorkspaceData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeSuccessOpen, setNoticeSuccessOpen] = useState(false)
  const realtimeRefreshRef = useRef(false)

  const loadData = useCallback(async (options?: { blocking?: boolean; silent?: boolean }) => {
    if (!workspaceId || !session) return
    if (options?.blocking) {
      setLoading(true)
    }
    if (!options?.silent) {
      setError(null)
    }
    try {
      const refreshedSession = await refreshStoredAuthSession()

      if (!refreshedSession?.accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      const [dashboard, tasks, events, questions] = await Promise.all([
        workspaceApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, refreshedSession),
        workspaceApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, refreshedSession),
        workspaceApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, refreshedSession),
        workspaceApiRequest<QuestionSummary[]>(`/api/workspaces/${workspaceId}/questions`, refreshedSession),
      ])
      setData((current) => ({ ...current, dashboard, tasks, events, questions }))
      setLoading(false)

      const liveRoomUrl = `${window.location.origin}${buildHref('live-meeting', workspaceId)}`
      const [notices, files, meetingNotes, meetingSettingsDoc, activityLogs] = await Promise.all([
        optionalRequest(workspaceApiRequest<WorkspaceNotice[]>(`/api/workspaces/${workspaceId}/notices`, refreshedSession), []),
        optionalRequest(workspaceApiRequest<WorkspaceFile[]>(`/api/workspaces/${workspaceId}/files`, refreshedSession), []),
        optionalRequest(workspaceApiRequest<MeetingNote[]>(`/api/workspaces/${workspaceId}/meeting-notes`, refreshedSession), []),
        optionalRequest(workspaceApiRequest<WorkspaceDocResponse | null>(`/api/workspaces/${workspaceId}/meeting-settings`, refreshedSession), null),
        optionalRequest(workspaceApiRequest<ActivityLogItem[]>(`/api/workspaces/${workspaceId}/activity-logs?limit=10`, refreshedSession), []),
      ])
      setData((current) => ({
        ...current,
        notices,
        files,
        meetingNotes,
        meetingSettings: parseMeetingSettings(meetingSettingsDoc, liveRoomUrl),
        activityLogs,
      }))
    } catch (nextError) {
      if (!options?.silent) {
        setError(nextError instanceof Error ? nextError.message : '워크스페이스 데이터를 불러오지 못했습니다.')
        setLoading(false)
      }
    } finally {
      setLoading(false)
    }
  }, [session, workspaceId])

  async function refreshRealtimeData() {
    if (!workspaceId || document.hidden || realtimeRefreshRef.current) return
    realtimeRefreshRef.current = true
    try {
      await loadData({ silent: true })
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
    void loadData({ blocking: true })
  }, [loadData, session])

  useEffect(() => {
    if (!session || !workspaceId || loading) return undefined
    const timer = window.setInterval(() => {
      void refreshRealtimeData()
    }, WORKSPACE_REFRESH_INTERVAL_MS)
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

  async function createNotice(title: string, content: string, important: boolean) {
    if (!workspaceId) return
    await createInstructorWorkspaceNotice(workspaceId, { title, content: important ? `[IMPORTANT]\n${content}` : content })
    pushWorkspaceNotification(workspaceId, {
      title: important ? '중요 공지 등록' : '공지사항 등록',
      description: `"${title}" 공지가 등록되었습니다.`,
      href: buildHref('dashboard', workspaceId),
      icon: 'fas fa-bullhorn',
    })
    await loadData()
    setNoticeSuccessOpen(true)
  }

  function renderPage() {
    switch (page) {
      case 'assignments':
        return <AssignmentsPage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'students':
        return <StudentsPage data={data} />
      case 'qna':
        return <QnaPage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'schedule':
        return <SchedulePage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'files':
        return <FilesPage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'meeting':
        return <MeetingPage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'live-meeting':
        return <LiveMeetingPage data={data} workspaceId={workspaceId} />
      default:
        return <DashboardPage data={data} workspaceId={workspaceId} onOpenNotice={() => setNoticeOpen(true)} />
    }
  }

  if (authView) {
    return <AuthModal view={authView} onViewChange={setAuthView} onAuthenticated={() => { setAuthView(null); window.location.reload() }} onClose={() => { clearStoredAuthSession(); window.location.href = '/' }} />
  }

  if (!workspaceId) {
    return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm font-bold text-gray-500">워크스페이스를 선택해주세요.</div>
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#F8F9FA] text-sm font-bold text-gray-500"><i className="fas fa-spinner fa-spin mr-2 text-[#7C3AED]" />워크스페이스 데이터를 불러오는 중입니다.</div>
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm font-bold text-red-500"><i className="fas fa-exclamation-triangle mr-2" />{error}</div>
  }

  if (page === 'live-meeting') {
    return <LiveMeetingPage data={data} workspaceId={workspaceId} />
  }

  return (
    <>
      <InstructorWsShell page={page} workspaceId={workspaceId} data={data}>
        {renderPage()}
      </InstructorWsShell>
      {noticeOpen ? <NoticeModal onClose={() => setNoticeOpen(false)} onSubmit={createNotice} /> : null}
      {noticeSuccessOpen ? <NoticeSuccessModal onClose={() => setNoticeSuccessOpen(false)} /> : null}
    </>
  )
}
