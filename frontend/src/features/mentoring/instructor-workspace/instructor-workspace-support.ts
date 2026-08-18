import { type ReactNode } from 'react'
import { readStoredAuthSession } from '../../../lib/auth-session'
import type { ApiEnvelope } from '../../project/api'
import type { CalendarEvent,InstructorWsPage,MeetingNote,MeetingSettings,QuestionSummary,TaskStatus,WorkspaceData,WorkspaceDocResponse,WorkspaceFile,WorkspaceMember,WorkspaceNotice,WorkspaceNotification,WorkspaceNotificationDraft,WorkspaceTask } from './instructor-workspace-types'


export type WorkspaceAuthSession = NonNullable<ReturnType<typeof readStoredAuthSession>>

export const PAGE_CONFIG: Record<InstructorWsPage, { path: string; label: string; title: string; icon: string; section: 'admin' | 'resources' }> = {
  dashboard: { path: '/instructor-ws-dashboard', label: '대시보드 홈', title: '워크스페이스 대시보드', icon: 'fas fa-chart-pie', section: 'admin' },
  assignments: { path: '/instructor-ws-assignments', label: '전체 과제 현황', title: '전체 과제 현황', icon: 'fas fa-tasks', section: 'admin' },
  students: { path: '/instructor-ws-students', label: '수강생 & 학습 상담', title: '수강생 & 학습 상담', icon: 'fas fa-user-graduate', section: 'admin' },
  qna: { path: '/instructor-ws-qna', label: '멘토 Q&A 관리', title: '멘토 Q&A 관리', icon: 'fas fa-comments', section: 'admin' },
  schedule: { path: '/instructor-ws-schedule', label: '공식 일정 관리', title: '공식 일정 관리', icon: 'fas fa-calendar-check', section: 'resources' },
  files: { path: '/instructor-ws-files', label: '공식 자료실 관리', title: '공식 자료실 관리', icon: 'fas fa-folder-open', section: 'resources' },
  meeting: { path: '/instructor-ws-meeting', label: '화상 멘토링', title: '화상 멘토링 관리', icon: 'fas fa-video', section: 'resources' },
  'live-meeting': { path: '/instructor-ws-live-meeting', label: '라이브 룸', title: '라이브 멘토링 룸', icon: 'fas fa-broadcast-tower', section: 'resources' },
}

export const EMPTY_DATA: WorkspaceData = {
  dashboard: null,
  tasks: [],
  events: [],
  questions: [],
  notices: [],
  files: [],
  meetingNotes: [],
  meetingSettings: null,
  activityLogs: [],
  voiceChannels: [],
}

export const WORKSPACE_NOTIFICATION_EVENT = 'devpath-instructor-ws-notification'
export const MAX_WORKSPACE_NOTIFICATIONS = 40
export const WORKSPACE_REFRESH_INTERVAL_MS = 5000
export const INSTRUCTOR_WS_UI_LOCK_CLASSES = [
  "bg-[#F3F4F6]! text-[#1F2937]! font-['Pretendard',sans-serif]! text-[16px]! leading-[24px]!",
  "[&_button]:font-['Pretendard',sans-serif]! [&_input]:font-['Pretendard',sans-serif]! [&_select]:font-['Pretendard',sans-serif]! [&_textarea]:font-['Pretendard',sans-serif]!",
  '[&_.text-2xl]:text-[24px]! [&_.text-2xl]:leading-[32px]! [&_.text-xl]:text-[20px]! [&_.text-xl]:leading-[28px]! [&_.text-lg]:text-[18px]! [&_.text-lg]:leading-[28px]!',
  '[&_.text-sm]:text-[14px]! [&_.text-sm]:leading-[20px]! [&_button]:text-[14px]! [&_button]:leading-[20px]! [&_input]:text-[14px]! [&_input]:leading-[20px]! [&_textarea]:text-[14px]! [&_textarea]:leading-[20px]!',
  String.raw`[&_.text-xs]:text-[12px]! [&_.text-xs]:leading-[16px]! [&_.text-\[11px\]]:text-[11px]! [&_.text-\[11px\]]:leading-[16px]! [&_.text-\[10px\]]:text-[10px]! [&_.text-\[10px\]]:leading-[14px]! [&_.text-\[9px\]]:text-[9px]! [&_.text-\[9px\]]:leading-[12px]!`,
  '[&_.workspace-nav-item]:flex! [&_.workspace-nav-item]:items-center! [&_.workspace-nav-item]:rounded-[0.75rem]! [&_.workspace-nav-item]:px-[1rem]! [&_.workspace-nav-item]:py-[0.75rem]! [&_.workspace-nav-item]:text-[#6B7280]! [&_.workspace-nav-item]:text-[14px]! [&_.workspace-nav-item]:leading-[20px]! [&_.workspace-nav-item]:font-[500]! [&_.workspace-nav-item]:[transition:color_0.2s_ease,background_0.2s_ease,transform_0.2s_ease]!',
  '[&_.workspace-nav-item:hover]:bg-[#F9FAFB]! [&_.workspace-nav-item:hover]:text-[#111827]! [&_.workspace-nav-item:hover]:[transform:translateX(2px)]!',
  '[&_.workspace-nav-item.active]:bg-[#111827]! [&_.workspace-nav-item.active]:text-[#ffffff]! [&_.workspace-nav-item.active]:font-[700]! [&_.workspace-nav-item.active_i]:text-[#A78BFA]!',
  '[&_.sidebar-text]:w-0! [&_.sidebar-text]:ml-0! [&_.sidebar-text]:overflow-hidden! [&_.sidebar-text]:whitespace-nowrap! [&_.sidebar-text]:opacity-0! [&_.sidebar-text]:[transition:width_0.25s_ease,margin-left_0.25s_ease,opacity_0.2s_ease]!',
  '[&_.instructor-ws-sidebar:hover_.sidebar-text]:w-auto! [&_.instructor-ws-sidebar:hover_.sidebar-text]:ml-[0.75rem]! [&_.instructor-ws-sidebar:hover_.sidebar-text]:opacity-100!',
  '[&_.workspace-sidebar-section-title]:h-0! [&_.workspace-sidebar-section-title]:overflow-hidden! [&_.workspace-sidebar-section-title]:opacity-0! [&_.workspace-sidebar-section-title]:[transition:height_0.3s_ease,margin_0.3s_ease,opacity_0.3s_ease]!',
  '[&_.instructor-ws-sidebar:hover_.workspace-sidebar-section-title]:h-auto! [&_.instructor-ws-sidebar:hover_.workspace-sidebar-section-title]:mt-[1.5rem]! [&_.instructor-ws-sidebar:hover_.workspace-sidebar-section-title]:mb-[0.5rem]! [&_.instructor-ws-sidebar:hover_.workspace-sidebar-section-title]:opacity-100!',
].join(' ')

export function getWorkspaceIdFromUrl(): number | null {
  const parsed = Number(new URLSearchParams(window.location.search).get('workspaceId'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function buildHref(page: InstructorWsPage, workspaceId: number | null) {
  return `${PAGE_CONFIG[page].path}${workspaceId ? `?workspaceId=${workspaceId}` : ''}`
}

export function workspaceNotificationStorageKey(workspaceId: number | null) {
  return `devpath:instructor-ws:${workspaceId ?? 'none'}:notifications`
}

export function workspaceNotificationReadStorageKey(workspaceId: number | null) {
  return `devpath:instructor-ws:${workspaceId ?? 'none'}:notifications:read`
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

export function readStoredWorkspaceNotifications(workspaceId: number | null) {
  return readStoredArray<WorkspaceNotification>(workspaceNotificationStorageKey(workspaceId))
}

export function writeStoredWorkspaceNotifications(workspaceId: number | null, notifications: WorkspaceNotification[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(workspaceNotificationStorageKey(workspaceId), JSON.stringify(notifications.slice(0, MAX_WORKSPACE_NOTIFICATIONS)))
}

export function readWorkspaceNotificationIds(workspaceId: number | null) {
  return readStoredArray<string>(workspaceNotificationReadStorageKey(workspaceId))
}

export function writeWorkspaceNotificationIds(workspaceId: number | null, ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(workspaceNotificationReadStorageKey(workspaceId), JSON.stringify(ids.slice(-200)))
}

export function pushWorkspaceNotification(workspaceId: number | null, draft: WorkspaceNotificationDraft) {
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

export function buildVoiceSignalingUrl(channelId: number, accessToken: string) {
  const configuredUrl = (import.meta.env.VITE_VOICE_SIGNALING_URL as string | undefined)?.trim()
  const fallbackUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/voice-signaling`
  const url = new URL(configuredUrl || fallbackUrl, window.location.href)
  url.searchParams.set('channelId', String(channelId))
  url.searchParams.set('token', accessToken)
  return url.toString()
}

export function avatarUrl(seed?: string | null) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'mentor')}`
}

export function optionalRequest<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback)
}

export async function workspaceApiRequest<T>(
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

export function formatDate(value?: string | null) {
  if (!value) return '일정 없음'
  return new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
}

export function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export type CalendarEventType = 'meetup' | 'deadline' | 'special'

export const EVENT_TYPE_META = 'DP_EVENT_TYPE'
export const MEETING_NOTE_META = 'DP_MEETING_NOTE'

export const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; icon: string; badge: string; dot: string }> = {
  meetup: { label: '라이브 밋업', icon: 'fas fa-video', badge: 'bg-blue-500 text-white', dot: 'bg-blue-500' },
  deadline: { label: '과제 마감', icon: 'fas fa-flag-checkered', badge: 'bg-red-500 text-white', dot: 'bg-red-500' },
  special: { label: '특별 세션', icon: 'fas fa-star', badge: 'bg-[#7C3AED] text-white', dot: 'bg-[#7C3AED]' },
}

export const EVENT_LIST_TONE: Record<CalendarEventType, { border: string; bg: string; badge: string }> = {
  meetup: { border: 'border-blue-100', bg: 'bg-blue-50/50', badge: 'bg-blue-500 text-white' },
  deadline: { border: 'border-red-100', bg: 'bg-red-50/50', badge: 'bg-red-500 text-white' },
  special: { border: 'border-purple-100', bg: 'bg-purple-50/50', badge: 'bg-[#7C3AED] text-white' },
}

export function encodeEventDescription(type: CalendarEventType, description: string) {
  return `[${EVENT_TYPE_META}:${type}]\n${description.trim()}`
}

export function eventTypeOf(event: CalendarEvent): CalendarEventType {
  const matched = event.description?.match(new RegExp(`\\[${EVENT_TYPE_META}:(meetup|deadline|special)\\]`))
  if (matched?.[1]) return matched[1] as CalendarEventType
  const text = `${event.title} ${event.description ?? ''}`
  if (/마감|deadline/i.test(text)) return 'deadline'
  if (/특강|special/i.test(text)) return 'special'
  return 'meetup'
}

export function eventDescriptionOf(event: CalendarEvent) {
  return (event.description ?? '').replace(new RegExp(`\\[${EVENT_TYPE_META}:(meetup|deadline|special)\\]\\n?`), '').trim()
}

export function encodeMeetingNoteContent(week: string, date: string, content: string) {
  return `[${MEETING_NOTE_META}:${JSON.stringify({ week, date })}]\n${content.trim()}`
}

export function meetingNoteMetaOf(note: MeetingNote) {
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

export function meetingNoteContentOf(note: MeetingNote) {
  return (note.content ?? '').replace(new RegExp(`\\[${MEETING_NOTE_META}:.*?\\]\\n?`), '').trim()
}

export function meetingNoteDateLabel(value?: string | null) {
  if (!value) return '일자 없음'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll('-', '.')
  return formatDate(value)
}

export function parseMeetingSettings(doc: WorkspaceDocResponse | null | undefined, fallbackLink: string): MeetingSettings | null {
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

export function buildDefaultMeetingSettings(nextMeetup: CalendarEvent | null, liveRoomUrl: string): MeetingSettings {
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

export function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function workspaceFileName(file: WorkspaceFile) {
  return file.displayName ?? file.originalFileName ?? '자료'
}

export function workspaceFileTone(file: WorkspaceFile) {
  if (file.itemType === 'LINK') return { icon: 'fas fa-link', color: 'text-blue-500' }
  const name = workspaceFileName(file).toLowerCase()
  if (name.endsWith('.pdf')) return { icon: 'fas fa-file-pdf', color: 'text-red-500' }
  if (name.endsWith('.zip') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz')) return { icon: 'fas fa-file-archive', color: 'text-yellow-600' }
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(name)) return { icon: 'fas fa-image', color: 'text-green-500' }
  return { icon: 'far fa-file-alt', color: 'text-[#7C3AED]' }
}

export function workspaceFileKind(file: WorkspaceFile, ownerId?: number | null) {
  if (file.itemType === 'LINK') return 'link'
  if (ownerId && file.uploadedById && file.uploadedById !== ownerId) return 'shared'
  return 'official'
}

export function isQuestionAnswered(question: QuestionSummary) {
  return question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED'
}

export function isReviewWaiting(task: WorkspaceTask) {
  return task.status === 'IN_REVIEW' || task.status === 'IN_PROGRESS'
}

export function notificationTime(value?: string | null) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : new Date().toISOString()
}

export function buildWorkspaceNotifications(data: WorkspaceData, workspaceId: number | null, localNotifications: WorkspaceNotification[]) {
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

export function noticeImportant(notice: WorkspaceNotice) {
  return notice.content.startsWith('[IMPORTANT]\n')
}

export function noticeContent(notice: WorkspaceNotice) {
  return notice.content.replace(/^\[IMPORTANT\]\n?/, '')
}

export function isSameDay(value: string, date: Date) {
  const target = new Date(value)
  return target.getFullYear() === date.getFullYear()
    && target.getMonth() === date.getMonth()
    && target.getDate() === date.getDate()
}

export type AssignmentReviewStatus = 'wait' | 'reject' | 'pass' | 'missing'

export type AssignmentStudentRow = {
  member: WorkspaceMember
  task: WorkspaceTask | null
  status: AssignmentReviewStatus
  submittedAt: string
  message: string
  mentorComment: string
  prUrl: string
}

export type AssignmentSuccessMessage = {
  title: string
  description: ReactNode
}

export function buildAssignmentStudentRow(member: WorkspaceMember, task: WorkspaceTask | null): AssignmentStudentRow {
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

export function assignmentReviewStatus(task: WorkspaceTask | null): AssignmentReviewStatus {
  if (!task) return 'missing'
  if (task.status === 'DONE') return 'pass'
  if (task.status === 'TODO') {
    const text = `${task.title} ${task.description ?? ''}`
    return /수정\s*요청|반려|reject/i.test(text) ? 'reject' : 'missing'
  }
  return 'wait'
}

export function assignmentStatusLabel(status: AssignmentReviewStatus) {
  if (status === 'pass') return 'Pass 완료'
  if (status === 'reject') return '수정 요청됨'
  if (status === 'wait') return '리뷰 대기중'
  return '미제출'
}

export function assignmentWeekState(week: number, currentWeek: number) {
  if (week < currentWeek) return '완료'
  if (week === currentWeek) return '진행 중'
  return '예정'
}

export function assignmentSummary(task: WorkspaceTask | null) {
  if (!task?.description?.trim()) return '멘토가 과제 제목과 가이드라인을 등록하면 수강생 화면에 공식 과제로 표시됩니다.'
  return task.description.split('\n').find((line) => line.trim())?.trim() ?? task.description.trim()
}

export function assignmentGuideline(task: WorkspaceTask | null) {
  if (!task?.description?.trim()) return ''
  const lines = task.description.split('\n')
  return lines.slice(1).join('\n').trim() || task.description
}

export function assignmentSubmissionMessage(task: WorkspaceTask | null) {
  if (!task) return '아직 제출된 과제가 없습니다.'
  return task.description?.trim() || '제출물이 등록되어 리뷰를 기다리고 있습니다.'
}

export function assignmentMentorComment(task: WorkspaceTask | null, status: AssignmentReviewStatus) {
  if (status === 'pass') return '요구사항을 충족하여 Pass 처리된 과제입니다.'
  if (status === 'reject') return '보완이 필요한 항목이 있어 수정 요청 상태입니다.'
  if (task?.description?.trim()) return '제출물을 확인한 뒤 구체적인 개선 포인트를 남겨주세요.'
  return '아직 멘토 피드백이 등록되지 않았습니다.'
}

export type StudentProgressRow = {
  member: WorkspaceMember
  weeks: StudentWeekProgress[]
  progress: number
  qnaCount: number
  currentWeek: number
  stalledWeek: number | null
  lagging: boolean
}

export type StudentWeekProgress = {
  week: number
  task: WorkspaceTask | null
  status: TaskStatus | 'MISSING' | 'UPCOMING'
}

export function inferAssignmentWeek(task: WorkspaceTask, fallback: number) {
  const matched = task.title.match(/(?:week\s*|)([1-4])\s*(?:주차|week)?/i)
  const parsed = matched ? Number(matched[1]) : NaN
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? parsed : fallback
}

export function compareTasksByAssignmentOrder(left: WorkspaceTask, right: WorkspaceTask) {
  const leftDate = left.dueDate ?? left.createdAt ?? ''
  const rightDate = right.dueDate ?? right.createdAt ?? ''
  if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)
  return left.taskId - right.taskId
}

export function inferCurrentAssignmentWeek(tasks: WorkspaceTask[]) {
  const weeks = tasks.map((task, index) => inferAssignmentWeek(task, (index % 4) + 1))
  return Math.min(4, Math.max(1, ...weeks))
}

export function buildStudentWeekProgress(tasks: WorkspaceTask[], currentWeek: number): StudentWeekProgress[] {
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

export function studentWeekIcon(status: StudentWeekProgress['status']) {
  if (status === 'DONE') return 'fas fa-check-circle text-green-500'
  if (status === 'IN_REVIEW') return 'fas fa-hourglass-half text-yellow-500'
  if (status === 'IN_PROGRESS') return 'fas fa-hourglass-half text-yellow-500'
  if (status === 'MISSING') return 'fas fa-times-circle text-red-500'
  return 'fas fa-circle text-gray-200'
}

export function studentWeekTitle(week: StudentWeekProgress) {
  if (week.status === 'DONE') return `${week.week}주차 Pass`
  if (week.status === 'IN_REVIEW' || week.status === 'IN_PROGRESS') return `${week.week}주차 리뷰 대기중`
  if (week.status === 'MISSING') return `${week.week}주차 미제출 (지연)`
  return `${week.week}주차 미진행`
}

export function studentHistoryTone(status: StudentWeekProgress['status']) {
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

export type LivePeer = {
  userId: number
  userName: string
  cameraStream: MediaStream | null
  screenStream: MediaStream | null
  screenSharing: boolean
}

export type LivePeerTransceivers = {
  microphone: RTCRtpTransceiver
  camera: RTCRtpTransceiver
  screen: RTCRtpTransceiver
}

export type LiveSignalMessage = {
  type: 'peer-list' | 'peer-joined' | 'peer-left' | 'offer' | 'answer' | 'ice-candidate' | 'camera-start' | 'screen-share-start' | 'screen-share-stop' | 'error'
  peers?: Array<{ userId: number; userName: string }>
  fromUserId?: number
  fromUserName?: string
  targetUserId?: number
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>
  detail?: string
}
