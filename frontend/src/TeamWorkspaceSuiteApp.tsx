import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type WheelEvent as ReactWheelEvent } from 'react'
import LoginRequiredView from './components/LoginRequiredView'
import TeamWorkspaceHeader from './components/TeamWorkspaceHeader'
import UserAvatar from './components/UserAvatar'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from './lib/auth-session'
import { projectApiRequest } from './project-api'
import {
  TEAM_WORKSPACE_COLLABORATION_NAV,
  TEAM_WORKSPACE_PAGE_META,
  TEAM_WORKSPACE_RESOURCE_NAV,
  type TeamWorkspaceNavKey,
} from './team-workspace-nav'

type TeamWorkspacePage = TeamWorkspaceNavKey

type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type WorkspaceFileType = 'FILE' | 'FOLDER' | 'LINK'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  role?: string | null
  roleType?: string | null
  roleLabel?: string | null
  position?: string | null
  positionLabel?: string | null
  online?: boolean
  lastActiveAt?: string | null
}

type WorkspaceDashboard = {
  workspaceId: number
  name: string
  description?: string | null
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  members: WorkspaceMember[]
  unresolvedTaskCount: number
  activeMilestoneCount: number
  createdAt?: string | null
}

type WorkspaceTask = {
  taskId: number
  workspaceId: number
  title: string
  description?: string | null
  status: TaskStatus
  priority?: TaskPriority | null
  assigneeId?: number | null
  dueDate?: string | null
  createdById?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

type CalendarEvent = {
  eventId: number
  workspaceId: number
  title: string
  description?: string | null
  startAt: string
  endAt?: string | null
  createdById?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

type WorkspaceFile = {
  fileId: number
  workspaceId: number
  parentId?: number | null
  itemType: WorkspaceFileType
  originalFileName?: string | null
  displayName?: string | null
  fileSize?: number | null
  contentType?: string | null
  storageProvider?: string | null
  objectKey?: string | null
  uploadedById?: number | null
  uploadedByName?: string | null
  uploaderProfileImage?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type WorkspaceFileStorage = {
  usedBytes: number
  quotaBytes: number
  storageProvider?: string | null
}

type QuestionSummary = {
  id: number
  authorId: number
  authorName?: string | null
  templateType?: string | null
  difficulty?: string | null
  title: string
  adoptedAnswerId?: number | null
  qnaStatus: string
  answerCount: number
  viewCount?: number
  createdAt?: string | null
}

type QuestionDetail = QuestionSummary & {
  content?: string | null
  updatedAt?: string | null
  answers?: Array<{
    id: number
    authorId?: number | null
    authorName?: string | null
    content: string
    adopted?: boolean
    createdAt?: string | null
  }>
}

type WorkspaceDoc = {
  docId?: number | null
  workspaceId: number
  docType: string
  content?: string | null
  updatedById?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

type MeetingNote = {
  noteId: number
  workspaceId: number
  title: string
  content?: string | null
  createdById?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

type ActivityLog = {
  logId: number
  workspaceId: number
  actorId?: number | null
  activityType: string
  description: string
  createdAt?: string | null
}

type VoiceChannelSummary = {
  channelId: number
  workspaceId: number
  name: string
  description?: string | null
  activeParticipantCount: number
  currentSessionStartedAt?: string | null
  createdAt?: string | null
}

type SuiteData = {
  dashboard: WorkspaceDashboard | null
  tasks: WorkspaceTask[]
  files: WorkspaceFile[]
  storage: WorkspaceFileStorage | null
  questions: QuestionSummary[]
  events: CalendarEvent[]
  apiSpec: WorkspaceDoc | null
  erdDoc: WorkspaceDoc | null
  infraDoc: WorkspaceDoc | null
  notes: MeetingNote[]
  activities: ActivityLog[]
  voiceChannels: VoiceChannelSummary[]
}

type TaskForm = {
  title: string
  description: string
  role: string
  priority: TaskPriority
  assigneeId: string
  dueDate: string
}

type QuestionForm = {
  title: string
  content: string
  templateType: string
  difficulty: string
}

type QuestionContextPicker = 'task' | 'file' | 'api'

type QuestionContextSelection = {
  type: QuestionContextPicker
  id: string
  label: string
  description: string
  iconClassName: string
  toneClassName: string
}

type EventForm = {
  title: string
  description: string
  type: string
  date: string
  time: string
  duration: string
}

type DocForm = {
  mode: 'api' | 'erd' | 'infra'
  title: string
  content: string
  method: string
  endpoint: string
  status: string
  owner: string
  request: string
  response: string
  editingApiId?: string
}

type ArchitectureApiEndpoint = {
  id: string
  sourceIndex: number
  method: string
  endpoint: string
  description: string
  status: string
  owner: string
  request?: string
  response?: string
}

type NoteForm = {
  noteId?: number | null
  title: string
  content: string
}

const PAGE_META = TEAM_WORKSPACE_PAGE_META

const DEFAULT_DATA: SuiteData = {
  dashboard: null,
  tasks: [],
  files: [],
  storage: null,
  questions: [],
  events: [],
  apiSpec: null,
  erdDoc: null,
  infraDoc: null,
  notes: [],
  activities: [],
  voiceChannels: [],
}

const ROLE_FILTERS = ['전체 보기', '내 작업', 'Frontend', 'Backend']
const QUESTION_STATUS_FILTERS = ['전체', '답변 대기', '답변 완료', '해결됨']
const QUESTION_TAGS = ['전체', 'Frontend', 'Backend', '에러/버그', '기획/설계']
const QUESTION_ASK_TAGS = ['Frontend', 'Backend', '에러/버그', '기획/설계']
const KANBAN_COLUMNS: Array<{
  key: TaskStatus
  title: string
  shellClassName: string
  headerClassName: string
  titleClassName: string
  countClassName: string
  dotClassName: string
}> = [
  {
    key: 'TODO',
    title: '할 일 (To Do)',
    shellClassName: 'border-gray-200 bg-gray-100/50',
    headerClassName: 'border-gray-200',
    titleClassName: 'text-gray-800',
    countClassName: 'border-gray-200 text-gray-500',
    dotClassName: 'bg-gray-400',
  },
  {
    key: 'IN_PROGRESS',
    title: '진행 중 (In Progress)',
    shellClassName: 'border-blue-100 bg-blue-50/30',
    headerClassName: 'border-blue-100',
    titleClassName: 'text-blue-800',
    countClassName: 'border-blue-200 text-blue-600 shadow-sm',
    dotClassName: 'bg-blue-500',
  },
  {
    key: 'IN_REVIEW',
    title: '리뷰 대기 (In Review)',
    shellClassName: 'border-yellow-100 bg-yellow-50/30',
    headerClassName: 'border-yellow-100',
    titleClassName: 'text-yellow-800',
    countClassName: 'border-yellow-200 text-yellow-600 shadow-sm',
    dotClassName: 'bg-yellow-500',
  },
  {
    key: 'DONE',
    title: '완료 (Done)',
    shellClassName: 'border-green-100 bg-green-50/30',
    headerClassName: 'border-green-100',
    titleClassName: 'text-green-800',
    countClassName: 'border-green-200 text-green-600 shadow-sm',
    dotClassName: 'bg-green-500',
  },
]

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function parseDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '일정 미정'

  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date)
}

function formatTime(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '--:--'

  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatRelativeTime(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '방금 전'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}시간 전`

  return `${Math.floor(diffHours / 24)}일 전`
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function percent(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

function roleForTask(task: WorkspaceTask) {
  const text = `${task.title} ${task.description ?? ''}`.toLowerCase()
  if (/(front|react|next|ui|화면|프론트)/i.test(text)) return 'Frontend'
  if (/(back|api|server|spring|jpa|db|서버|백엔드)/i.test(text)) return 'Backend'
  if (/(design|designer|figma|wireframe|디자인|기획)/i.test(text)) return 'Designer'
  if (/(common|공통)/i.test(text)) return '공통'

  return '공통'
}

function stripTaskRolePrefix(description?: string | null) {
  return (description ?? '').replace(/^\[(Frontend|Backend|Designer|Design|공통|Common|Planning)\]\s*/i, '')
}

function priorityClass(priority?: TaskPriority | null) {
  if (priority === 'HIGH') return 'bg-red-50 text-red-500'
  if (priority === 'LOW') return 'bg-gray-100 text-gray-400'

  return 'bg-orange-50 text-orange-500'
}

function taskRoleBadgeClass(role: string) {
  if (role === 'Backend') return 'border-purple-200 bg-purple-50 text-purple-600'
  if (role === 'Designer' || role === 'Design') return 'border-pink-200 bg-pink-50 text-pink-600'
  if (role === '공통' || role === 'Common' || role === 'Planning') return 'border-gray-200 bg-gray-100 text-gray-600'

  return 'border-blue-200 bg-blue-50 text-blue-600'
}

function taskTicketCode(task: WorkspaceTask, role: string) {
  const prefix = role === 'Backend' ? 'BE' : role === 'Designer' || role === 'Design' ? 'DE' : role === '공통' || role === 'Common' ? 'CO' : 'FE'

  return `#${prefix}-${String(task.taskId).padStart(2, '0').slice(-2)}`
}

function normalizeMemberPosition(value?: string | null) {
  const raw = value?.trim()
  if (!raw) return null

  const compact = raw.replace(/[\s_-]/g, '').toLowerCase()
  if (/^(fe|front|frontend|프론트|프론트엔드)$/.test(compact)) return 'FE'
  if (/^(be|back|backend|server|서버|백엔드)$/.test(compact)) return 'BE'
  if (/^(design|designer|de|uiux|ui|ux|디자인|디자이너)$/.test(compact)) return 'DE'
  if (/^(pm|planner|planning|기획|기획자)$/.test(compact)) return 'PM'
  if (/^(fullstack|full|fs|풀스택)$/.test(compact)) return 'FS'
  if (/^(leader|lead|팀장)$/.test(compact)) return 'LEAD'
  if (/^(common|co|공통)$/.test(compact)) return 'CO'

  return raw.length <= 6 ? raw.toUpperCase() : raw
}

function memberAssignedPosition(member: WorkspaceMember, tasks: WorkspaceTask[]) {
  const explicit = normalizeMemberPosition(
    member.positionLabel ?? member.roleLabel ?? member.position ?? member.roleType ?? member.role,
  )
  if (explicit) return explicit

  const counts = new Map<string, number>()
  tasks
    .filter((task) => task.assigneeId === member.learnerId)
    .forEach((task) => {
      const nextPosition = normalizeMemberPosition(roleForTask(task))
      if (nextPosition) counts.set(nextPosition, (counts.get(nextPosition) ?? 0) + 1)
    })

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

function fallbackMemberPosition(index: number) {
  return index % 2 === 0 ? 'FE' : 'BE'
}

function memberPositionBadgeClass(position: string) {
  if (position === 'BE') return 'border border-purple-500/30 bg-purple-500/20 text-purple-400'
  if (position === 'DE') return 'border border-pink-500/30 bg-pink-500/20 text-pink-400'
  if (position === 'PM') return 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
  if (position === 'FS') return 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
  if (position === 'LEAD') return 'border border-red-500/30 bg-red-500/20 text-red-300'
  if (position === 'CO') return 'border border-gray-600 bg-gray-700 text-gray-300'

  return 'border border-blue-500/30 bg-blue-500/20 text-blue-400'
}

function memberPositionLightBadgeClass(position: string) {
  if (position === 'BE') return 'border border-purple-100 bg-purple-50 text-purple-600'
  if (position === 'DE') return 'border border-pink-100 bg-pink-50 text-pink-600'
  if (position === 'PM') return 'border border-amber-100 bg-amber-50 text-amber-600'
  if (position === 'FS') return 'border border-emerald-100 bg-emerald-50 text-emerald-600'
  if (position === 'LEAD') return 'border border-red-100 bg-red-50 text-red-600'
  if (position === 'CO') return 'border border-gray-200 bg-gray-100 text-gray-600'

  return 'border border-blue-100 bg-blue-50 text-blue-600'
}

function formatConnectionTime(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function formatVoiceChatTime(value: Date) {
  const hours = value.getHours()
  const minutes = String(value.getMinutes()).padStart(2, '0')
  const period = hours >= 12 ? '오후' : '오전'
  const displayHour = hours % 12 || 12

  return `${period} ${displayHour}:${minutes}`
}

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function liveMediaTracks(stream: MediaStream | null, kind: 'audio' | 'video') {
  return stream?.getTracks().filter((track) => track.kind === kind && track.readyState === 'live') ?? []
}

function setMediaTrackEnabled(stream: MediaStream | null, kind: 'audio' | 'video', enabled: boolean) {
  liveMediaTracks(stream, kind).forEach((track) => {
    track.enabled = enabled
  })
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

async function measureBrowserPing() {
  const start = performance.now()
  await fetch(`${window.location.origin}/?voicePing=${Date.now()}`, { method: 'HEAD', cache: 'no-store' })

  return Math.max(1, Math.round(performance.now() - start))
}

function priorityBadgeLabel(priority?: TaskPriority | null) {
  if (priority === 'HIGH') return '긴급'
  if (priority === 'LOW') return '낮음'

  return '보통'
}

function priorityBadgeIcon(priority?: TaskPriority | null) {
  return priority === 'HIGH' ? <i className="fas fa-fire mr-0.5"></i> : null
}

function taskStatusTitle(status: TaskStatus) {
  return KANBAN_COLUMNS.find((column) => column.key === status)?.title ?? status
}

function workspaceFileName(file: WorkspaceFile) {
  return file.displayName || file.originalFileName || `파일 #${file.fileId}`
}

function isQuestionResolved(question: QuestionSummary | QuestionDetail) {
  const detailAnswers = 'answers' in question ? question.answers : undefined

  return Boolean(question.adoptedAnswerId) || Boolean(detailAnswers?.some((answer) => answer.adopted))
}

function questionUiStatus(question: QuestionSummary | QuestionDetail) {
  const detailAnswers = 'answers' in question ? question.answers : undefined

  if (isQuestionResolved(question)) return 'resolved'
  if (question.qnaStatus === 'ANSWERED' || question.answerCount > 0 || (detailAnswers?.length ?? 0) > 0) return 'done'

  return 'wait'
}

function fileIcon(file: WorkspaceFile) {
  if (file.itemType === 'LINK') return 'fa-link text-indigo-500'
  if (file.itemType === 'FOLDER') return 'fa-folder text-yellow-500'
  if (file.contentType?.includes('image')) return 'fa-file-image text-blue-500'
  if (file.contentType?.includes('pdf')) return 'fa-file-pdf text-red-500'
  if (file.contentType?.includes('zip')) return 'fa-file-archive text-purple-500'

  return 'fa-file-lines text-gray-500'
}

function fileSourceIcon(file: WorkspaceFile) {
  if (file.itemType === 'LINK') return { icon: 'fa-link', color: 'text-gray-600', format: 'LINK' }
  if (file.contentType?.includes('pdf')) return { icon: 'fa-file-pdf', color: 'text-red-500', format: 'PDF' }
  if (file.contentType?.includes('zip')) return { icon: 'fa-file-archive', color: 'text-yellow-600', format: 'ZIP' }
  if (file.contentType?.includes('image')) return { icon: 'fa-file-image', color: 'text-blue-500', format: 'IMG' }

  return { icon: file.itemType === 'FOLDER' ? 'fa-folder' : 'fa-file-lines', color: file.itemType === 'FOLDER' ? 'text-yellow-600' : 'text-gray-600', format: file.itemType === 'FOLDER' ? 'DIR' : 'DOC' }
}

function questionSourceStatus(question: QuestionSummary) {
  const status = questionUiStatus(question)

  if (status === 'resolved') {
    return {
      label: '해결됨',
      className: 'bg-green-50 text-green-600 border-green-200',
      icon: 'fa-check-circle',
      cardClassName: 'resolved',
    }
  }

  if (status === 'done') {
    return {
      label: '답변 완료',
      className: 'bg-blue-50 text-blue-600 border-blue-200',
      icon: 'fa-comment-dots',
      cardClassName: 'done',
    }
  }

  return {
    label: '답변 대기',
    className: 'bg-red-50 text-red-500 border-red-200',
    icon: 'fa-hourglass-half',
    cardClassName: 'wait',
  }
}

function questionSourceTags(question: QuestionSummary) {
  const tags: string[] = []

  if (question.templateType === 'IMPLEMENTATION') tags.push('Frontend')
  if (question.templateType === 'CODE_REVIEW') tags.push('Backend')
  if (question.templateType === 'DEBUGGING') tags.push('에러/버그')
  if (question.templateType === 'PROJECT') tags.push('기획/설계')

  if (tags.length === 0) return ['Frontend']

  return tags
}

function templateTypeFromQuestionTags(tags: string[]) {
  if (tags.includes('에러/버그')) return 'DEBUGGING'
  if (tags.includes('Backend')) return 'CODE_REVIEW'
  if (tags.includes('Frontend')) return 'IMPLEMENTATION'

  return 'PROJECT'
}

function buildQuestionContent(content: string, contexts: QuestionContextSelection[]) {
  const trimmedContent = content.trim()

  if (contexts.length === 0) return trimmedContent

  const contextLines = contexts.map((context) => `- ${context.label}: ${context.description}`)

  return `${trimmedContent}\n\n---\n관련 컨텍스트\n${contextLines.join('\n')}`
}

function parseQuestionContent(content?: string | null) {
  const normalized = content?.trim() ?? ''
  const marker = '\n---\n관련 컨텍스트\n'
  const markerIndex = normalized.indexOf(marker)

  if (markerIndex < 0) {
    return { body: normalized, contexts: [] as string[] }
  }

  return {
    body: normalized.slice(0, markerIndex).trim(),
    contexts: normalized
      .slice(markerIndex + marker.length)
      .split('\n')
      .map((line) => line.trim().replace(/^- /, ''))
      .filter(Boolean),
  }
}

function eventSourceType(event?: CalendarEvent | null) {
  const text = `${event?.title ?? ''} ${event?.description ?? ''}`.toLowerCase()
  const type = event?.description?.match(/^\[team-schedule-type:(scrum|deadline|vacation)\]/)?.[1]

  if (type === 'deadline') {
    return { kind: 'deadline', label: '내부 마감일', dot: 'bg-orange-500', badge: 'bg-orange-500', shell: 'bg-orange-50/50 border-orange-100' }
  }
  if (/(mentor|멘토|공식|밋업|라이브)/i.test(text)) {
    return { kind: 'official', label: '멘토 공식 일정', dot: 'bg-purple-500', badge: 'bg-purple-500', shell: 'bg-purple-50/50 border-purple-100' }
  }
  if (/(deadline|마감|제출|due)/i.test(text)) {
    return { kind: 'deadline', label: '내부 마감일', dot: 'bg-orange-500', badge: 'bg-orange-500', shell: 'bg-orange-50/50 border-orange-100' }
  }

  return { kind: 'team', label: '팀 스크럼', dot: 'bg-blue-500', badge: 'bg-blue-500', shell: 'bg-blue-50/50 border-blue-100' }
}

function stripTeamScheduleType(value?: string | null) {
  return (value ?? '').replace(/^\[team-schedule-type:(scrum|deadline|vacation)\]\n?/, '').trim()
}

function buildTeamScheduleDescription(type: string, description: string) {
  return `[team-schedule-type:${type}]\n${description.trim()}`.trim()
}

function isUpcomingScheduleEvent(event: CalendarEvent) {
  const date = parseDate(event.startAt)
  if (!date) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  return date.getTime() >= today.getTime()
}

function scheduleEventTooltip(event: CalendarEvent) {
  const description = stripTeamScheduleType(event.description)
  const parts = [
    event.title,
    `${formatDate(event.startAt)} ${formatTime(event.startAt)}`,
    description,
  ].filter(Boolean)

  return parts.join('\n')
}

function scheduleEventTime(event: CalendarEvent) {
  return parseDate(event.startAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
}

function sortScheduleSidebarEvents(events: CalendarEvent[], pinnedEventIds: number[]) {
  const pinnedIds = new Set(pinnedEventIds)

  return [...events].sort((left, right) => {
    const leftPinned = pinnedIds.has(left.eventId)
    const rightPinned = pinnedIds.has(right.eventId)

    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1

    const leftUpcoming = isUpcomingScheduleEvent(left)
    const rightUpcoming = isUpcomingScheduleEvent(right)

    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1

    const leftTime = scheduleEventTime(left)
    const rightTime = scheduleEventTime(right)

    return leftUpcoming ? leftTime - rightTime : rightTime - leftTime
  })
}

function isOfficialLiveEvent(event?: CalendarEvent | null) {
  const text = `${event?.title ?? ''} ${event?.description ?? ''}`.toLowerCase()

  return /(mentor|멘토|공식|밋업|라이브|live|meetup)/i.test(text)
}

function meetingNoteKind(note: MeetingNote) {
  const text = `${note.title ?? ''} ${note.content ?? ''}`.toLowerCase()

  return /(mentor|멘토|공식|피드백|밋업)/i.test(text) ? 'mentor' : 'team'
}

function formatMeetingNoteDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '날짜 미정'

  return `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, '0')}.${`${date.getDate()}`.padStart(2, '0')}`
}

function meetingNoteSummary(note: MeetingNote) {
  const text = (note.content || '회의록 내용이 없습니다.').trim()

  return text.length > 80 ? `${text.slice(0, 80)}...` : text
}

function appendQueryParam(href: string, key: string, value?: string | number | null) {
  if (value == null || value === '') return href

  return `${href}${href.includes('?') ? '&' : '?'}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
}

function extractFirstUrl(content?: string | null) {
  return content?.match(/https?:\/\/[^\s)]+/)?.[0] ?? null
}

function stripMarkdownHeading(content?: string | null) {
  return (content ?? '').replace(/^# .+?\n\n/s, '').trim()
}

function architectureDocTitle(content: string | null | undefined, fallback: string) {
  const heading = content?.match(/^#\s+(.+)$/m)?.[1]?.trim()

  return heading || fallback
}

function apiMethodClass(method: string) {
  const normalized = method.toUpperCase()

  if (normalized === 'GET') return 'bg-blue-50 text-blue-600 border-blue-200'
  if (normalized === 'POST') return 'bg-green-50 text-green-600 border-green-200'
  if (normalized === 'DELETE') return 'bg-red-50 text-red-600 border-red-200'

  return 'bg-orange-50 text-orange-600 border-orange-200'
}

function apiStatusMeta(status: string) {
  if (/완료|done|complete/i.test(status)) {
    return { label: status || '개발 완료', className: 'bg-green-50 text-green-600', icon: 'fa-check' }
  }

  if (/연동|진행|progress|working/i.test(status)) {
    return { label: status || '프론트 연동 중', className: 'bg-yellow-50 text-yellow-600', icon: 'fa-spinner' }
  }

  return { label: status || '설계 중', className: 'bg-gray-100 text-gray-500', icon: null }
}

function parseArchitectureApiEndpoints(content?: string | null): ArchitectureApiEndpoint[] {
  if (!content?.trim()) return []

  return content
    .split('\n')
    .map((line) => line.trim().replace(/^[-*]\s*/, ''))
    .map<ArchitectureApiEndpoint | null>((line, index) => {
      const columns = line.split('|').map((part) => part.trim())
      const firstColumn = columns[0] ?? ''
      const match = firstColumn.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/i)

      if (!match) return null

      return {
        id: `${index}-${match[1]}-${match[2]}`,
        sourceIndex: index,
        method: match[1].toUpperCase(),
        endpoint: match[2],
        description: columns[1] || '설명이 등록되지 않았습니다.',
        status: columns[2] || '설계 중',
        owner: columns[3] || '담당자 미정',
        request: columns[4] || undefined,
        response: columns[5] || undefined,
      } satisfies ArchitectureApiEndpoint
    })
    .filter((endpoint): endpoint is ArchitectureApiEndpoint => endpoint !== null)
}

function buildApiEndpointLine(form: DocForm) {
  return [
    `${form.method.toUpperCase()} ${form.endpoint.trim()}`,
    form.content.trim(),
    form.status.trim() || '설계 중',
    form.owner.trim() || '담당자 미정',
    form.request.trim(),
    form.response.trim(),
  ].filter((part) => part.length > 0).join(' | ')
}

function apiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
}

function downloadUrl(fileId: number) {
  return `${apiBaseUrl()}/api/workspace-files/${fileId}/download`
}

async function downloadFileFromApi(file: WorkspaceFile) {
  const headers = new Headers()
  const session = readStoredAuthSession()

  if (session?.accessToken) {
    headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
  }

  const response = await fetch(downloadUrl(file.fileId), { headers })
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = file.originalFileName || file.displayName || `workspace-file-${file.fileId}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function toLocalDateTime(date: string, time: string) {
  return `${date}T${time || '09:00'}:00`
}

function addMinutes(localDateTime: string, minutes: number) {
  const date = new Date(localDateTime)
  if (Number.isNaN(date.getTime())) return localDateTime

  date.setMinutes(date.getMinutes() + minutes)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

function todayDateInput() {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function Sidebar({
  activePage,
  dashboard,
  tasks,
  workspaceId,
}: {
  activePage: TeamWorkspacePage
  dashboard: WorkspaceDashboard | null
  tasks: WorkspaceTask[]
  workspaceId: number | null
}) {
  const projectName = dashboard?.name?.trim() || 'Next.js 블로그 플랫폼 구축'
  const session = readStoredAuthSession()
  const currentMember = dashboard?.members.find((member) => member.learnerId === session?.userId) ?? dashboard?.members[0]
  const currentMemberPosition = currentMember ? memberAssignedPosition(currentMember, tasks) ?? fallbackMemberPosition(0) : fallbackMemberPosition(0)
  const [sidebarPinned, setSidebarPinned] = useState(false)

  return (
    <aside className={`${sidebarPinned ? 'pinned ' : ''}team-ws-sidebar group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64`}>
      <div className="flex h-20 shrink-0 cursor-pointer items-center border-b border-gray-100 px-5 transition hover:bg-gray-50">
        <a
          href="/workspace-hub"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-team text-lg font-bold text-white shadow-md"
          title="워크스페이스 허브"
        >
          <i className="fas fa-arrow-left"></i>
        </a>
        <div className="sidebar-text flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Team Workspace</p>
          <p className="w-36 truncate font-bold text-gray-900">{projectName}</p>
        </div>
        <button
          type="button"
          onClick={() => setSidebarPinned((current) => !current)}
          className="team-ws-pin-button ml-2 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-team"
          title={sidebarPinned ? '사이드바 고정 해제' : '사이드바 고정'}
        >
          <i className={sidebarPinned ? 'fas fa-thumbtack' : 'fas fa-thumbtack rotate-45'}></i>
        </button>
      </div>

      <nav className="custom-scrollbar mt-4 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3">
        <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Team Dashboard</p>
        <a href={navHref('/team-ws-dashboard', workspaceId)} className="nav-item">
          <i className="fas fa-chart-line w-6 text-center text-lg"></i>
          <span className="sidebar-text">프로젝트 대시보드</span>
        </a>
        <a href={navHref('/team-ws-milestone', workspaceId)} className="nav-item">
          <i className="fas fa-flag-checkered w-6 text-center text-lg"></i>
          <span className="sidebar-text">마일스톤 & 주간 과제</span>
        </a>

        <div className="mx-2 my-2 h-px bg-gray-100"></div>
        <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Collaboration</p>
        {TEAM_WORKSPACE_COLLABORATION_NAV.map((item) => (
          <a key={item.key} href={navHref(item.path, workspaceId)} className={`nav-item ${activePage === item.key ? 'active' : ''}`}>
            <i className={`fas ${item.icon} w-6 text-center text-lg`}></i>
            <span className="sidebar-text">{item.title}</span>
          </a>
        ))}

        <div className="mx-2 my-2 h-px bg-gray-100"></div>
        <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Resources & Live</p>
        {TEAM_WORKSPACE_RESOURCE_NAV.map((item) => (
          <a key={item.key} href={navHref(item.path, workspaceId)} className={`nav-item ${activePage === item.key ? 'active' : ''}`}>
            <i className={`fas ${item.icon} w-6 text-center text-lg`}></i>
            <span className="sidebar-text">{item.title}</span>
          </a>
        ))}
      </nav>

      <div className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
        <UserAvatar
          name={currentMember?.learnerName || '나'}
          imageUrl={currentMember?.profileImage}
          className="h-10 w-10 shrink-0 border-2 border-gray-200 bg-white"
          iconClassName="text-sm"
        />
        <div className="sidebar-text min-w-0">
          <p className="flex items-center gap-1 text-sm font-bold text-gray-900">
            <span className="truncate">{currentMember?.learnerName || '나'}</span>
            <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] ${memberPositionLightBadgeClass(currentMemberPosition)}`}>
              {currentMemberPosition}
            </span>
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500">내 역할 확인하기</p>
        </div>
      </div>
    </aside>
  )
}

function PageFrame({
  activePage,
  title,
  subtitle,
  action,
  data,
  workspaceId,
  children,
  mainClassName = 'custom-scrollbar flex-1 overflow-y-auto p-8 relative',
  contentClassName = 'mx-auto flex h-full max-w-6xl flex-col',
}: {
  activePage: TeamWorkspacePage
  title: string
  subtitle: string
  action?: ReactNode
  data: SuiteData
  workspaceId: number | null
  children: ReactNode
  mainClassName?: string
  contentClassName?: string
}) {
  const members = data.dashboard?.members ?? []
  const projectName = data.dashboard?.name?.trim() || 'AI 기반 맞춤 여행 코스 추천 서비스 구현'
  const hasPageAction = Boolean(action)

  return (
    <div className="team-ws-dashboard-page team-ws-suite-page flex h-screen overflow-hidden bg-[#F3F4F6] text-gray-800">
      <Sidebar activePage={activePage} dashboard={data.dashboard} tasks={data.tasks} workspaceId={workspaceId} />
      <div className="team-ws-main flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        <TeamWorkspaceHeader
          workspaceId={workspaceId}
          pageKey={activePage}
          projectName={projectName}
          members={members}
        />

        <main aria-label={title} data-subtitle={subtitle} data-has-page-action={hasPageAction ? 'true' : 'false'} className={mainClassName}>
          <div className={contentClassName}>{children}</div>
        </main>
      </div>
    </div>
  )
}

function EmptyPanel({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionTone = 'dark',
}: {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionTone?: 'dark' | 'team' | 'muted'
}) {
  const buttonClassName =
    actionTone === 'team'
      ? 'bg-team text-white shadow-md hover:bg-indigo-700'
      : actionTone === 'muted'
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : 'bg-gray-900 text-white shadow-md hover:bg-black'

  return (
    <div className="team-ws-empty-panel flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-8 py-20 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-2xl text-gray-300 shadow-sm">
        <i className={`fas ${icon}`}></i>
      </div>
      <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-md text-xs font-medium leading-5 text-gray-500">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={`mt-6 inline-flex h-10 items-center gap-1.5 rounded-xl px-5 text-xs font-bold transition ${buttonClassName}`}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
  iconClassName,
  description,
  panelClassName = 'w-full max-w-lg',
  headerClassName = 'items-center',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  iconClassName?: string
  description?: string
  panelClassName?: string
  headerClassName?: string
}) {
  return (
    <div className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <button type="button" aria-label="닫기" className="absolute inset-0" onClick={onClose}></button>
      <div className={`modal-content team-ws-modal-panel relative z-10 overflow-hidden rounded-3xl bg-white shadow-2xl ${panelClassName}`}>
        <div className={`flex justify-between border-b border-gray-100 bg-gray-50 p-6 ${headerClassName}`}>
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              {iconClassName ? <i className={`fas ${iconClassName} text-team`}></i> : null}
              {title}
            </h3>
            {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-900">
            <i className="fas fa-times"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function LoadingView() {
  return (
    <div className="team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-team"></div>
        <p className="text-sm font-bold text-gray-500">팀 워크스페이스를 불러오는 중입니다.</p>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800">
      <div className="team-ws-card w-[420px] border border-gray-100 bg-white p-8 text-center shadow-sm">
        <i className="fas fa-circle-exclamation mb-3 text-3xl text-red-400"></i>
        <h1 className="text-xl font-black text-gray-900">팀 워크스페이스를 열 수 없습니다.</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-gray-500">{message}</p>
        <a href="/workspace-hub" className="mt-6 inline-flex h-11 items-center rounded-xl bg-gray-900 px-5 text-sm font-black text-white hover:bg-black">
          워크스페이스 허브로 이동
        </a>
      </div>
    </div>
  )
}

function TaskCard({
  task,
  members,
  onEdit,
  onDragStart,
}: {
  task: WorkspaceTask
  members: WorkspaceMember[]
  onEdit: (task: WorkspaceTask) => void
  onDragStart: (task: WorkspaceTask) => void
}) {
  const assignee = members.find((member) => member.learnerId === task.assigneeId)
  const role = roleForTask(task)

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={() => onEdit(task)}
      className="kanban-card group cursor-grab rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${taskRoleBadgeClass(role)}`}>{role}</span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400">{taskTicketCode(task, role)}</span>
      </div>
      <h4 className="mb-2 text-sm font-bold leading-tight text-gray-900 transition group-hover:text-team">{task.title}</h4>
      <div className="mt-4 flex items-end justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <UserAvatar name={assignee?.learnerName || '미지정'} imageUrl={assignee?.profileImage} className="h-6 w-6 border border-gray-200 bg-gray-50" iconClassName="text-[10px]" />
          <span className="truncate text-[10px] font-medium text-gray-500">{assignee?.learnerName || '미지정'}</span>
        </div>
        <span className={`team-ws-card-priority rounded px-1.5 py-0.5 text-[10px] font-bold ${priorityClass(task.priority)}`}>
          {priorityBadgeIcon(task.priority)}
          {priorityBadgeLabel(task.priority)}
        </span>
      </div>
    </div>
  )
}

function KanbanPage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [filter, setFilter] = useState(ROLE_FILTERS[0])
  const [search, setSearch] = useState('')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [modalTask, setModalTask] = useState<WorkspaceTask | null>(null)
  const [form, setForm] = useState<TaskForm>({ title: '', description: '', role: 'Frontend', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)
  const session = readStoredAuthSession()
  const currentMember = data.dashboard?.members.find((member) => member.learnerId === session?.userId) ?? data.dashboard?.members[0]

  const filteredTasks = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return data.tasks.filter((task) => {
      if (filter === '내 작업' && task.assigneeId !== session?.userId) return false
      if ((filter === 'Frontend' || filter === 'Backend') && roleForTask(task) !== filter) return false
      if (!normalized) return true

      return `${task.title} ${task.description ?? ''}`.toLowerCase().includes(normalized)
    })
  }, [data.tasks, filter, search, session?.userId])

  function openModal(task?: WorkspaceTask) {
    setError(null)
    setModalTask(task ?? null)
    setTaskModalOpen(true)
    setForm({
      title: task?.title ?? '',
      description: stripTaskRolePrefix(task?.description),
      role: task ? roleForTask(task) : 'Frontend',
      priority: task?.priority ?? 'MEDIUM',
      assigneeId: task?.assigneeId ? String(task.assigneeId) : currentMember ? String(currentMember.learnerId) : '',
      dueDate: task?.dueDate ?? '',
    })
  }

  function closeTaskModal() {
    setTaskModalOpen(false)
    setModalTask(null)
    setError(null)
    setForm({ title: '', description: '', role: 'Frontend', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('작업 제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const body = JSON.stringify({
        title: form.title.trim(),
        description: `[${form.role}] ${stripTaskRolePrefix(form.description).trim()}`.trim(),
        priority: form.priority,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        dueDate: form.dueDate || null,
      })

      if (modalTask) {
        await projectApiRequest<WorkspaceTask>(`/api/workspaces/${workspaceId}/tasks/${modalTask.taskId}`, { method: 'PUT', body }, 'required')
        if (form.assigneeId) {
          await projectApiRequest<WorkspaceTask>(
            `/api/workspaces/${workspaceId}/tasks/${modalTask.taskId}/assignee`,
            { method: 'PATCH', body: JSON.stringify({ assigneeId: Number(form.assigneeId) }) },
            'required',
          )
        }
      } else {
        await projectApiRequest<WorkspaceTask>(`/api/workspaces/${workspaceId}/tasks`, { method: 'POST', body }, 'required')
      }

      setModalTask(null)
      setTaskModalOpen(false)
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '작업 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(task: WorkspaceTask, status: TaskStatus) {
    if (task.status === status) return

    await projectApiRequest<WorkspaceTask>(
      `/api/workspaces/${workspaceId}/tasks/${task.taskId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      'required',
    )
    await reload()
  }

  async function dropTask(status: TaskStatus) {
    const task = filteredTasks.find((item) => item.taskId === draggingTaskId)
    setDraggingTaskId(null)
    if (!task) return

    await updateStatus(task, status)
  }

  async function deleteTask() {
    if (!modalTask) return

    setSubmitting(true)
    setError(null)

    try {
      await projectApiRequest<void>(
        `/api/workspaces/${workspaceId}/tasks/${modalTask.taskId}`,
        { method: 'DELETE' },
        'required',
      )
      setModalTask(null)
      setTaskModalOpen(false)
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Task delete failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalTasks = data.tasks.length
  const doneTasks = data.tasks.filter((task) => task.status === 'DONE').length
  const inProgressTasks = data.tasks.filter((task) => task.status === 'IN_PROGRESS').length
  const remainingTasks = data.tasks.filter((task) => task.status === 'TODO').length
  const progressPercent = percent(doneTasks, totalTasks)

  return (
    <>
      <PageFrame
        activePage="kanban"
        title="팀 애자일 칸반 보드"
        subtitle="각 직군별 작업 현황을 공유하고 Jira처럼 티켓(이슈) 단위로 일정을 관리하세요."
        action={<button type="button" onClick={() => openModal()} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-plus mr-2"></i>새 작업 추가</button>}
        data={data}
        workspaceId={workspaceId}
        mainClassName="flex-1 flex flex-col overflow-hidden relative"
        contentClassName="flex h-full min-h-0 flex-col"
      >
        <div className="shrink-0 border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                  <i className="fas fa-columns text-team"></i>
                  팀 애자일 칸반 보드
                </h1>
                <p className="mt-2 text-sm text-gray-500">각 직군별 작업 현황을 공유하고 Jira처럼 티켓(이슈) 단위로 일정을 관리하세요.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="team-ws-kanban-search-wrap relative">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"></i>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="티켓 검색..." className="team-ws-kanban-search-input w-48 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-8 pr-4 text-xs font-medium outline-none transition placeholder:text-gray-400 focus:border-team focus:bg-white focus:ring-1 focus:ring-team" />
                </div>
                <div className="team-ws-kanban-filter-group flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {ROLE_FILTERS.map((item) => (
                    <button key={item} type="button" onClick={() => setFilter(item)} className={`kanban-filter-tab team-ws-kanban-filter-tab rounded-lg px-4 py-1.5 text-xs font-bold ${filter === item ? 'active' : ''}`}>
                      {item}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => openModal()} className="team-ws-kanban-add-button flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                  <i className="fas fa-plus"></i>
                  새 작업 추가
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex-1">
                <div className="mb-2 flex items-end justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <i className="fas fa-chart-line text-brand"></i>
                    이번 주 스프린트 목표 달성률
                  </span>
                  <span className="text-sm font-extrabold text-team">{progressPercent}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-2.5 rounded-full bg-team transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-6 border-l border-gray-200 pl-6">
                <div className="text-center">
                  <p className="mb-0.5 text-[10px] font-bold text-gray-400">전체 작업</p>
                  <p className="text-sm font-black text-gray-800">{totalTasks}</p>
                </div>
                <div className="text-center">
                  <p className="mb-0.5 text-[10px] font-bold text-gray-400">진행중/검토중</p>
                  <p className="text-sm font-black text-blue-500">{inProgressTasks}</p>
                </div>
                <div className="text-center">
                  <p className="mb-0.5 text-[10px] font-bold text-gray-400">남은 할일</p>
                  <p className="text-sm font-black text-orange-500">{remainingTasks}</p>
                </div>
                <div className="text-center">
                  <p className="mb-0.5 text-[10px] font-bold text-gray-400">완료됨</p>
                  <p className="text-sm font-black text-brand">{doneTasks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-x-auto overflow-y-hidden bg-[#F8F9FA] p-6">
          <div className="flex h-full min-w-max gap-6 pb-4">
            {KANBAN_COLUMNS.map((column) => {
              const tasks = filteredTasks.filter((task) => task.status === column.key)

              return (
                <section
                  key={column.key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void dropTask(column.key)}
                  className={`flex h-full w-80 shrink-0 flex-col rounded-2xl border ${column.shellClassName}`}
                >
                  <div className={`flex shrink-0 items-center justify-between border-b p-4 ${column.headerClassName}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${column.dotClassName}`}></span>
                      <h3 className={`text-[14px] font-extrabold ${column.titleClassName}`}>{column.title}</h3>
                    </div>
                    <span className={`rounded-md border bg-white px-2 py-0.5 text-xs font-bold ${column.countClassName}`}>{tasks.length}</span>
                  </div>
                  <div className="kanban-col custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.taskId}
                        task={task}
                        members={data.dashboard?.members ?? []}
                        onEdit={openModal}
                        onDragStart={(nextTask) => setDraggingTaskId(nextTask.taskId)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </PageFrame>

      {taskModalOpen ? (
        <Modal title={modalTask ? '작업 수정' : '새 작업 추가'} iconClassName={modalTask ? 'fa-edit' : 'fa-ticket-alt'} panelClassName="team-ws-kanban-task-modal flex max-h-[95vh] w-full max-w-lg flex-col" onClose={closeTaskModal}>
          <form onSubmit={saveTask} className="team-ws-kanban-task-form flex min-h-0 flex-1 flex-col">
            <div className="team-ws-kanban-task-body custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-800">
                  작업 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="어떤 작업을 해야 하나요?"
                  className="team-ws-kanban-task-title-input w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-team focus:ring-1 focus:ring-team"
                />
              </div>

              <div className="team-ws-kanban-task-grid grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-800">담당 직군 (Role)</label>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    className="team-ws-kanban-task-role-select w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none transition focus:border-team"
                  >
                    <option value="Frontend">Frontend (파란색)</option>
                    <option value="Backend">Backend (보라색)</option>
                    <option value="Designer">Designer (핑크색)</option>
                    <option value="공통">공통 (회색)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-800">담당자 배정</label>
                  <select
                    value={form.assigneeId}
                    onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))}
                    className="team-ws-kanban-task-assignee-select w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-team"
                  >
                    <option value="">담당자 미지정</option>
                    {(data.dashboard?.members ?? []).map((member) => (
                      <option key={member.memberId} value={member.learnerId}>
                        {member.learnerId === session?.userId ? `${member.learnerName || `팀원 ${member.learnerId}`} (나)` : member.learnerName || `팀원 ${member.learnerId}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="team-ws-kanban-task-grid grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-800">우선순위</label>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}
                    className="team-ws-kanban-task-priority-select w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-team"
                  >
                    <option value="HIGH">긴급 (High)</option>
                    <option value="MEDIUM">보통 (Medium)</option>
                    <option value="LOW">낮음 (Low)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-800">마감일 (기한)</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className="team-ws-kanban-task-date-input w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-team"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-800">상세 설명</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="작업의 구체적인 내용이나 이슈 링크 등을 기록하세요."
                  className="team-ws-kanban-task-desc h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-team focus:ring-1 focus:ring-team"
                ></textarea>
              </div>
              {error ? <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-500">{error}</p> : null}
            </div>

            <div className="team-ws-kanban-task-footer flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 p-5">
              {modalTask ? (
                <button type="button" onClick={() => void deleteTask()} disabled={submitting} className="team-ws-kanban-task-delete flex items-center gap-1 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-60">
                  <i className="fas fa-trash-alt"></i>
                  삭제
                </button>
              ) : <span></span>}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={closeTaskModal} className="team-ws-kanban-task-cancel rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
                <button type="submit" disabled={submitting} className="team-ws-kanban-task-save flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
                  <i className="fas fa-save"></i>
                  저장하기
                </button>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  )
}

function FilesPage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('전체 자료')
  const [sort, setSort] = useState('최신순')
  const [sortOpen, setSortOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file')
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [linkForm, setLinkForm] = useState({ title: '', url: '' })
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [notifyMembers, setNotifyMembers] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const files = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    const nextFiles = data.files.filter((file) => {
      if (filter === '멘토 공식 자료') return false
      if (filter === '외부 링크') return file.itemType === 'LINK'
      if (!normalized) return true

      return `${file.displayName ?? ''} ${file.originalFileName ?? ''} ${file.uploadedByName ?? ''}`.toLowerCase().includes(normalized)
    })

    if (sort === '이름순 (가나다)') {
      return nextFiles.sort((left, right) => (left.displayName ?? left.originalFileName ?? '').localeCompare(right.displayName ?? right.originalFileName ?? ''))
    }
    if (sort === '용량 큰 순') {
      return nextFiles.sort((left, right) => (right.fileSize ?? 0) - (left.fileSize ?? 0))
    }

    return nextFiles.sort((left, right) => (parseDate(right.createdAt)?.getTime() ?? 0) - (parseDate(left.createdAt)?.getTime() ?? 0))
  }, [data.files, filter, search, sort])

  function openUploadModal() {
    setUploadMode('file')
    setUploadFile(null)
    setLinkForm({ title: '', url: '' })
    setUploadTitle('')
    setUploadDescription('')
    setNotifyMembers(true)
    setUploadError(null)
    setUploadOpen(true)
  }

  function closeUploadModal() {
    setUploadOpen(false)
    setUploadError(null)
  }

  async function executeUpload(event: FormEvent) {
    event.preventDefault()
    const trimmedTitle = uploadTitle.trim()

    if (uploadMode === 'file' && !uploadFile) {
      setUploadError('업로드할 파일을 선택해주세요.')
      return
    }

    if (uploadMode === 'link' && !trimmedTitle) {
      setUploadError('자료 제목을 입력해주세요.')
      return
    }

    if (uploadMode === 'link' && !linkForm.url.trim()) {
      setUploadError('URL 링크를 입력해주세요.')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      if (uploadMode === 'link') {
        await projectApiRequest<WorkspaceFile>(
          `/api/workspaces/${workspaceId}/files/links`,
          { method: 'POST', body: JSON.stringify({ title: trimmedTitle, url: linkForm.url.trim() }) },
          'required',
        )
      } else {
        const body = new FormData()
        body.append('file', uploadFile as File)
        await projectApiRequest<WorkspaceFile>(`/api/workspaces/${workspaceId}/files`, { method: 'POST', body }, 'required')
      }

      setUploadOpen(false)
      setUploadFile(null)
      setLinkForm({ title: '', url: '' })
      setUploadTitle('')
      setUploadDescription('')
      setNotifyMembers(true)
      await reload()
    } catch (nextError) {
      setUploadError(nextError instanceof Error ? nextError.message : '자료 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  async function deleteSelectedFile() {
    if (!selectedFile) return

    await projectApiRequest<void>(`/api/workspace-files/${selectedFile.fileId}`, { method: 'DELETE' }, 'required')
    setSelectedFile(null)
    await reload()
  }

  function downloadOrOpen(file: WorkspaceFile) {
    if (file.itemType === 'LINK' && file.objectKey) {
      window.open(file.objectKey, '_blank', 'noopener,noreferrer')
      return
    }

    void downloadFileFromApi(file).catch((nextError) => {
      setDownloadError(nextError instanceof Error ? nextError.message : '다운로드에 실패했습니다.')
    })
  }

  return (
    <>
      <PageFrame
        activePage="files"
        title="팀 통합 자료실"
        subtitle="프로젝트에 필요한 기획안, 에셋 파일, 참고 링크 등을 팀원 및 멘토와 자유롭게 공유하세요."
        action={<button type="button" onClick={openUploadModal} className="team-ws-files-upload-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-cloud-upload-alt"></i>새 자료 업로드</button>}
        data={data}
        workspaceId={workspaceId}
      >
        <div className="mb-8 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-extrabold text-gray-900">
              <i className="fas fa-folder-open text-team"></i>
              팀 통합 자료실
            </h1>
            <p className="mt-2 text-sm text-gray-500">프로젝트에 필요한 기획안, 에셋 파일, 참고 링크 등을 팀원 및 멘토와 자유롭게 공유하세요.</p>
          </div>
          <button type="button" onClick={openUploadModal} className="team-ws-files-upload-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black">
            <i className="fas fa-cloud-upload-alt"></i>
            새 자료 업로드
          </button>
        </div>

        <div className="mb-6 flex shrink-0 flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="custom-scrollbar flex flex-1 gap-6 overflow-x-auto px-2">
            {[
              ['전체 자료', null],
              ['멘토 공식 자료', <span key="mentor" className="h-2 w-2 rounded-full bg-mentor"></span>],
              ['팀원 공유 자료', <span key="team" className="h-2 w-2 rounded-full bg-team"></span>],
              ['외부 링크', <i key="link" className="fas fa-link text-gray-400"></i>],
            ].map(([item, icon]) => (
              <button key={item as string} type="button" onClick={() => setFilter(item as string)} className={`filter-tab flex items-center gap-1.5 whitespace-nowrap pb-2 text-sm font-bold ${filter === item ? 'active' : 'text-gray-500'}`}>
                {icon}
                {item}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative w-full md:w-64">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="파일명 또는 작성자 검색..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm font-bold outline-none transition focus:border-team" />
            </div>

            <div className="relative inline-block text-left">
              <button type="button" onClick={() => setSortOpen((current) => !current)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
                <span>{sort}</span>
                <i className="fas fa-chevron-down text-xs text-gray-400"></i>
              </button>
              {sortOpen ? (
                <div className="dropdown-content active absolute right-0 z-20 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 text-sm shadow-lg">
                  {['최신순', '이름순 (가나다)', '용량 큰 순'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setSort(item)
                        setSortOpen(false)
                      }}
                      className={`block w-full px-4 py-2 text-left text-xs font-bold transition hover:bg-gray-50 ${sort === item ? 'text-team' : 'text-gray-600'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {data.files.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-24 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-sm">
              <i className="fas fa-folder-open text-2xl"></i>
            </div>
            <h3 className="mb-1 text-base font-extrabold text-gray-900">통합 자료실이 비어 있습니다.</h3>
            <p className="mb-6 text-xs font-medium text-gray-500">프로젝트 요구사항, 디자인 가이드라인, 참고 문서 등 팀원들과 공유할 첫 번째 자료를 올려보세요.</p>
            <button type="button" onClick={openUploadModal} className="team-ws-files-first-upload-button flex items-center gap-1.5 rounded-xl bg-team px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700">
              <i className="fas fa-cloud-upload-alt text-sm"></i>
              첫 번째 자료 업로드하기
            </button>
          </div>
        ) : (
          <div className="grid flex-1 content-start grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {files.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                  <i className="fas fa-search text-2xl text-gray-300"></i>
                </div>
                <p className="mb-1 text-sm font-bold text-gray-600">일치하는 자료가 없습니다.</p>
                <p className="text-[10px] text-gray-400">검색어를 변경하거나 다른 탭을 확인해 보세요.</p>
              </div>
            ) : files.map((file) => {
              const meta = fileSourceIcon(file)
              const isLink = file.itemType === 'LINK'

              return (
                <button key={file.fileId} type="button" onClick={() => { setDownloadError(null); setSelectedFile(file) }} className="file-card group relative rounded-2xl bg-white p-5 text-left">
                  <div className={`absolute right-4 top-4 text-2xl opacity-20 transition duration-300 group-hover:scale-110 ${meta.color}`}>
                    <i className={`fas ${meta.icon}`}></i>
                  </div>

                  <div className="relative z-10 mb-3 flex items-center gap-2">
                    <span className="rounded border border-indigo-200 bg-team-light px-1.5 py-0.5 text-[9px] font-extrabold text-team">팀원 공유</span>
                    <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">{meta.format}</span>
                  </div>
                  <h3 className={`relative z-10 mb-1 truncate pr-6 text-base font-bold text-gray-900 transition ${isLink ? 'group-hover:text-blue-500' : 'group-hover:text-team'}`}>{file.displayName || file.originalFileName || '이름 없는 자료'}</h3>
                  <p className="relative z-10 mb-4 line-clamp-2 min-h-[32px] text-[11px] text-gray-500">{file.contentType || (isLink ? '외부 링크 자료입니다.' : '팀원이 공유한 프로젝트 자료입니다.')}</p>
                  <div className="relative z-10 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex min-w-0 items-center gap-1.5 pr-2">
                      <UserAvatar name={file.uploadedByName || '팀원'} imageUrl={file.uploaderProfileImage} className="h-5 w-5 shrink-0 border border-gray-200 bg-gray-50" iconClassName="text-[8px]" />
                      <span className="truncate text-[10px] font-bold text-gray-700">{file.uploadedByName || '팀원'} <span className="font-normal text-gray-400">(Member)</span></span>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] ${isLink ? 'font-bold text-blue-500' : 'font-medium text-gray-400'}`}>
                      {isLink ? <i className="fas fa-external-link-alt"></i> : null}
                      {isLink ? '새창 열기' : formatFileSize(file.fileSize)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </PageFrame>

      {uploadOpen ? (
        <div id="uploadModal" className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={executeUpload} className="modal-content team-ws-files-upload-modal relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="team-ws-files-upload-modal-header flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-cloud-upload-alt text-team"></i>
                자료 업로드
              </h3>
              <button type="button" onClick={closeUploadModal} className="team-ws-files-upload-close flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="team-ws-files-upload-modal-body space-y-5 p-6">
              <div className="flex border-b border-gray-200">
                <button type="button" onClick={() => setUploadMode('file')} className={`team-ws-files-upload-tab flex-1 border-b-2 pb-2 text-sm font-bold ${uploadMode === 'file' ? 'border-team text-team' : 'border-transparent text-gray-400 transition hover:text-gray-600'}`}>파일 업로드</button>
                <button type="button" onClick={() => setUploadMode('link')} className={`team-ws-files-upload-tab flex-1 border-b-2 pb-2 text-sm font-bold ${uploadMode === 'link' ? 'border-team text-team' : 'border-transparent text-gray-400 transition hover:text-gray-600'}`}>외부 링크 공유</button>
              </div>

              {uploadMode === 'file' ? (
                <div id="area-file" className="space-y-5">
                  <label id="dropZone" className="upload-zone team-ws-files-upload-zone relative flex cursor-pointer flex-col items-center justify-center rounded-2xl bg-gray-50 p-8 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-team shadow-sm">
                      <i className="fas fa-file-upload text-xl"></i>
                    </div>
                    <p className="mb-1 text-sm font-bold text-gray-700">클릭하거나 파일을 끌어다 놓으세요</p>
                    <p className="text-[10px] text-gray-400">PDF, ZIP, 이미지 파일 (최대 50MB)</p>
                    <input type="file" id="fileInput" className="hidden" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
                  </label>
                </div>
              ) : (
                <div id="area-link" className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-gray-600">URL 링크 <span className="text-red-500">*</span></label>
                    <input type="url" value={linkForm.url} onChange={(event) => setLinkForm((current) => ({ ...current, url: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-team" placeholder="https://" />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">자료 제목 <span className="text-red-500">*</span></label>
                <input type="text" id="uploadTitle" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-team" placeholder="어떤 자료인지 짧고 명확하게 적어주세요" />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">설명 (선택)</label>
                <textarea id="uploadDesc" value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-team" placeholder="자료에 대한 부가 설명을 적어주세요"></textarea>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                <input type="checkbox" id="notifyMembers" checked={notifyMembers} onChange={(event) => setNotifyMembers(event.target.checked)} className="h-4 w-4 cursor-pointer rounded border-blue-300 text-team accent-team focus:ring-team" />
                <label htmlFor="notifyMembers" className="cursor-pointer select-none text-xs font-bold text-team">
                  업로드 완료 후 팀원들에게 알림 보내기
                </label>
              </div>

              {uploadError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{uploadError}</p> : null}
            </div>

            <div className="team-ws-files-upload-modal-footer flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={closeUploadModal} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">취소</button>
              <button type="submit" disabled={uploading} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
                <i className="fas fa-check"></i>
                공유하기
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedFile ? (
        <Modal title="자료 상세" panelClassName="w-full max-w-sm" headerClassName="items-start" onClose={() => setSelectedFile(null)}>
          <div className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-3xl">
                <i className={`fas ${fileIcon(selectedFile)}`}></i>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[18px] font-black text-gray-900">{selectedFile.displayName || selectedFile.originalFileName}</h3>
                <p className="mt-1 text-[12px] font-semibold text-gray-400">{formatFileSize(selectedFile.fileSize)} · {selectedFile.uploadedByName || '팀원'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-[13px] font-semibold text-gray-500">
              등록일 {formatDate(selectedFile.createdAt)} · 저장소 {selectedFile.storageProvider || 'LOCAL'}
            </div>
            {downloadError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{downloadError}</p> : null}
            <div className="mt-6 flex justify-between gap-2">
              <button type="button" onClick={() => void deleteSelectedFile()} className="h-10 rounded-xl border border-red-100 bg-red-50 px-5 text-[13px] font-black text-red-500">삭제</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setDownloadError(null); setSelectedFile(null) }} className="h-10 rounded-xl border border-gray-200 bg-white px-5 text-[13px] font-black text-gray-600">닫기</button>
                {selectedFile.itemType !== 'FOLDER' ? (
                  <button type="button" onClick={() => downloadOrOpen(selectedFile)} className="h-10 rounded-xl bg-gray-900 px-6 text-[13px] font-black text-white">
                    {selectedFile.itemType === 'LINK' ? '열기' : '다운로드'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}

function QnaPage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(QUESTION_STATUS_FILTERS[0])
  const [tag, setTag] = useState(QUESTION_TAGS[0])
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<QuestionDetail | null>(null)
  const [form, setForm] = useState<QuestionForm>({ title: '', content: '', templateType: 'PROJECT', difficulty: 'MEDIUM' })
  const [selectedQuestionTags, setSelectedQuestionTags] = useState<string[]>(['Frontend', '에러/버그'])
  const [selectedQuestionContexts, setSelectedQuestionContexts] = useState<QuestionContextSelection[]>([])
  const [contextPicker, setContextPicker] = useState<QuestionContextPicker | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const session = readStoredAuthSession()
  const currentUserId = session?.userId ?? null

  const questions = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return data.questions.filter((question) => {
      const uiStatus = questionUiStatus(question)

      if (status === '답변 대기' && uiStatus !== 'wait') return false
      if (status === '답변 완료' && uiStatus !== 'done') return false
      if (status === '해결됨' && uiStatus !== 'resolved') return false
      if (tag !== '전체' && !questionSourceTags(question).includes(tag)) return false
      if (!normalized) return true

      return `${question.title} ${question.authorName ?? ''}`.toLowerCase().includes(normalized)
    })
  }, [data.questions, search, status, tag])

  function toggleAskTag(nextTag: string) {
    setSelectedQuestionTags((current) => {
      const nextTags = current.includes(nextTag) ? current.filter((item) => item !== nextTag) : [...current, nextTag]

      return nextTags.length > 0 ? nextTags : [nextTag]
    })
  }

  function closeQuestionCreateModal() {
    setModalOpen(false)
    setContextPicker(null)
    setSelectedQuestionContexts([])
    setError(null)
  }

  function selectQuestionContext(nextContext: QuestionContextSelection) {
    setSelectedQuestionContexts((current) => {
      if (current.some((context) => context.type === nextContext.type && context.id === nextContext.id)) {
        return current
      }

      return [...current, nextContext]
    })
    setContextPicker(null)
  }

  function removeQuestionContext(nextContext: QuestionContextSelection) {
    setSelectedQuestionContexts((current) =>
      current.filter((context) => context.type !== nextContext.type || context.id !== nextContext.id),
    )
  }

  function buildTaskContext(task: WorkspaceTask): QuestionContextSelection {
    const role = roleForTask(task)
    const assignee = data.dashboard?.members.find((member) => member.learnerId === task.assigneeId)
    const assigneeName = assignee?.learnerName || (task.assigneeId ? `팀원 ${task.assigneeId}` : '담당자 미정')

    return {
      type: 'task',
      id: String(task.taskId),
      label: `칸반 ${taskTicketCode(task, role)}`,
      description: `${task.title} · ${taskStatusTitle(task.status)} · ${assigneeName}`,
      iconClassName: 'fa-columns',
      toneClassName: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    }
  }

  function buildFileContext(file: WorkspaceFile): QuestionContextSelection {
    const fileMeta = file.itemType === 'LINK' ? '링크' : file.contentType || '파일'

    return {
      type: 'file',
      id: String(file.fileId),
      label: '자료실 파일',
      description: `${workspaceFileName(file)} · ${fileMeta}`,
      iconClassName: file.itemType === 'LINK' ? 'fa-link' : 'fa-file-alt',
      toneClassName: 'border-blue-100 bg-blue-50 text-blue-700',
    }
  }

  function buildApiContext(): QuestionContextSelection {
    const preview = data.apiSpec?.content?.trim().split('\n').find(Boolean) ?? 'API 명세 문서'

    return {
      type: 'api',
      id: String(data.apiSpec?.docId ?? 'api-spec'),
      label: 'API 명세',
      description: preview.length > 80 ? `${preview.slice(0, 80)}...` : preview,
      iconClassName: 'fa-network-wired',
      toneClassName: 'border-purple-100 bg-purple-50 text-purple-700',
    }
  }

  async function openDetail(question: QuestionSummary) {
    const nextDetail = await projectApiRequest<QuestionDetail>(`/api/workspace-questions/${question.id}`, {}, 'required')
    setDetailError(null)
    setDetail(nextDetail)
  }

  async function createQuestion(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await projectApiRequest<QuestionDetail>(
        `/api/workspaces/${workspaceId}/questions`,
        {
          method: 'POST',
          body: JSON.stringify({
            templateType: templateTypeFromQuestionTags(selectedQuestionTags),
            difficulty: form.difficulty,
            title: form.title.trim(),
            content: buildQuestionContent(form.content, selectedQuestionContexts),
          }),
        },
        'required',
      )
      setModalOpen(false)
      setForm({ title: '', content: '', templateType: 'PROJECT', difficulty: 'MEDIUM' })
      setSelectedQuestionTags(['Frontend', '에러/버그'])
      setSelectedQuestionContexts([])
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '질문 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function resolveQuestion(answerId?: number) {
    if (!detail || !answerId) return

    try {
      setDetailError(null)
      const nextDetail = await projectApiRequest<QuestionDetail>(
        `/api/qna/questions/${detail.id}/answers/${answerId}/adopt`,
        { method: 'PATCH' },
        'required',
      )
      setDetail(nextDetail)
      await reload()
    } catch (nextError) {
      setDetailError(nextError instanceof Error ? nextError.message : '해결 처리에 실패했습니다.')
    }
  }

  return (
    <>
      <PageFrame
        activePage="qna"
        title="팀 멘토 Q&A"
        subtitle="태그와 검색을 활용해 팀의 질문 내역을 확인하고, 멘토에게 질문하세요."
        action={<button type="button" onClick={() => setModalOpen(true)} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-pen mr-2"></i>새 질문 작성</button>}
        data={data}
        workspaceId={workspaceId}
        contentClassName="team-ws-qna-content mx-auto flex h-full max-w-5xl flex-col"
      >
        <div className="team-ws-qna-page-heading mb-6 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="team-ws-qna-title flex items-center gap-2 text-2xl font-extrabold text-gray-900">
              <i className="fas fa-comments text-team"></i>
              멘토 Q&A 지식베이스
            </h1>
            <p className="team-ws-qna-subtitle mt-2 text-sm text-gray-500">태그와 검색을 활용해 팀의 질문 내역을 확인하고, 멘토에게 질문하세요.</p>
          </div>
          <button type="button" onClick={() => setModalOpen(true)} className="team-ws-qna-new-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black">
            <i className="fas fa-pen"></i>
            새 질문 작성
          </button>
        </div>

        <div className="team-ws-qna-filter-panel mb-6 flex shrink-0 flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="team-ws-qna-filter-top flex flex-col items-center justify-between gap-4 border-b border-gray-100 pb-4 md:flex-row">
            <div className="team-ws-qna-search-wrap relative w-full md:w-96">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="질문 내용이나 제목 검색..." className="team-ws-qna-search-input w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm font-medium outline-none transition placeholder:text-gray-400 focus:border-team focus:ring-1 focus:ring-team" />
            </div>
            <div className="team-ws-qna-status-tabs custom-scrollbar flex w-full gap-2 overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-1 md:w-auto">
              {QUESTION_STATUS_FILTERS.map((item) => (
                <button key={item} type="button" onClick={() => setStatus(item)} className={`team-ws-qna-status-tab flex items-center gap-1 whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-bold transition ${status === item ? 'active border border-gray-200 bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {item === '해결됨' ? <i className="fas fa-check-circle text-green-500"></i> : null}
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="team-ws-qna-tag-row flex flex-wrap items-center gap-2">
            <span className="team-ws-qna-tag-label mr-2 text-xs font-bold text-gray-400"><i className="fas fa-tags"></i> 카테고리 태그:</span>
            {QUESTION_TAGS.map((item) => (
              <button key={item} type="button" onClick={() => setTag(item)} className={`team-ws-qna-tag-badge rounded-full border px-3 py-1 text-[10px] font-bold transition ${tag === item ? (item === '전체' ? 'active border-gray-200 bg-gray-100 text-gray-600' : 'active border-team bg-team text-white') : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {data.questions.length === 0 ? (
          <div className="team-ws-qna-empty-state flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center shadow-sm">
            <div className="team-ws-qna-empty-icon mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300 shadow-sm">
              <i className="fas fa-comments text-2xl"></i>
            </div>
            <h3 className="team-ws-qna-empty-title mb-1 text-lg font-extrabold text-gray-900">아직 등록된 질문이 없습니다.</h3>
            <p className="team-ws-qna-empty-desc mb-6 text-sm font-medium text-gray-500">프로젝트를 진행하며 막히는 부분을 멘토님에게 가장 먼저 질문해보세요!</p>
            <button type="button" onClick={() => setModalOpen(true)} className="team-ws-qna-first-button flex items-center gap-2 rounded-xl bg-team px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700">
              <i className="fas fa-pen"></i>
              첫 번째 질문 작성하기
            </button>
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2 pb-10">
            {questions.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white py-16 text-center text-gray-500 shadow-sm">
                <i className="fas fa-search mb-3 text-3xl text-gray-300"></i>
                <p className="text-sm font-bold text-gray-700">조건에 맞는 검색 결과가 없습니다.</p>
                <p className="mt-1 text-xs text-gray-400">검색어나 태그 필터를 변경해보세요.</p>
              </div>
            ) : questions.map((question) => {
              const statusMeta = questionSourceStatus(question)
              const tags = questionSourceTags(question)

              return (
                <button key={question.id} type="button" onClick={() => openDetail(question)} className={`qna-card ${statusMeta.cardClassName} relative flex w-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-team hover:shadow-md`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={question.authorName || '팀원'} imageUrl={null} className="h-8 w-8 border border-gray-200 bg-gray-50" iconClassName="text-xs" />
                      <div className="flex flex-col">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{question.authorName || '팀원'}</span>
                          <span className="text-[9px] font-medium text-gray-400">{formatRelativeTime(question.createdAt)}</span>
                        </div>
                        <div className="flex gap-1">
                          {tags.map((item) => (
                            <span key={item} className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-600">#{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-extrabold ${statusMeta.className}`}>
                      <i className={`fas ${statusMeta.icon}`}></i>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="pl-11 pr-4">
                    <h4 className="mb-1 truncate text-sm font-extrabold text-gray-800">{question.title}</h4>
                    <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">{question.templateType || '질문 상세를 열어 내용을 확인하세요.'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </PageFrame>

      {modalOpen ? (
        <Modal
          title="새 질문 작성"
          iconClassName="fa-pen"
          description="에러 코드나 관련 파일을 첨부하면 멘토님이 더 빠르게 답변할 수 있습니다."
          panelClassName="team-ws-qna-ask-modal flex max-h-[90vh] w-full max-w-2xl flex-col"
          onClose={closeQuestionCreateModal}
        >
          <form onSubmit={createQuestion} className="team-ws-qna-ask-form flex min-h-0 flex-1 flex-col">
            <div className="team-ws-qna-ask-body custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <label className="team-ws-qna-ask-label mb-2 block text-xs font-bold text-gray-800">질문 카테고리 태그</label>
                <div className="team-ws-qna-ask-tag-list flex gap-2">
                  {QUESTION_ASK_TAGS.map((item) => (
                    <label key={item} className="team-ws-qna-ask-tag flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold transition hover:bg-gray-50">
                      <input type="checkbox" checked={selectedQuestionTags.includes(item)} onChange={() => toggleAskTag(item)} className="accent-team" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="team-ws-qna-ask-label mb-2 block text-xs font-bold text-gray-800">관련 컨텍스트 연동 (옵션)</label>
                <div className="team-ws-qna-context-list flex gap-3">
                  <button type="button" onClick={() => setContextPicker('task')} className="team-ws-qna-context-button flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-3 text-xs font-bold text-gray-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                    <i className="fas fa-columns"></i>
                    칸반 티켓 선택
                  </button>
                  <button type="button" onClick={() => setContextPicker('file')} className="team-ws-qna-context-button flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-3 text-xs font-bold text-gray-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                    <i className="fas fa-file-alt"></i>
                    자료실 파일 첨부
                  </button>
                  <button type="button" onClick={() => setContextPicker('api')} className="team-ws-qna-context-button flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-3 text-xs font-bold text-gray-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600">
                    <i className="fas fa-network-wired"></i>
                    API 명세 연동
                  </button>
                </div>
                {selectedQuestionContexts.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedQuestionContexts.map((context) => (
                      <span key={`${context.type}-${context.id}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${context.toneClassName}`}>
                        <i className={`fas ${context.iconClassName}`}></i>
                        {context.label}
                        <button type="button" aria-label={`${context.label} 제거`} onClick={() => removeQuestionContext(context)} className="ml-1 text-current opacity-60 hover:opacity-100">
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="team-ws-qna-ask-label mb-2 block text-xs font-bold text-gray-800">제목</label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="질문의 요지를 명확하게 작성해주세요." className="team-ws-qna-title-input w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-team focus:ring-1 focus:ring-team" />
              </div>

              <div>
                <div className="mb-2 flex items-end justify-between">
                  <label className="team-ws-qna-ask-label block text-xs font-bold text-gray-800">본문 (마크다운 지원)</label>
                  <span className="team-ws-qna-markdown-hint rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-400"><i className="fab fa-markdown"></i> 마크다운 및 코드 스니펫(```) 지원</span>
                </div>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  placeholder={'```javascript\n// 여기에 코드를 붙여넣으세요\n```\n\n발생한 문제 상황과 시도해본 해결 방법을 상세히 적어주세요.'}
                  className="team-ws-qna-content-textarea custom-scrollbar min-h-[200px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm font-medium outline-none transition focus:border-team focus:bg-white focus:ring-1 focus:ring-team"
                ></textarea>
              </div>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{error}</p> : null}
            </div>
            <div className="team-ws-qna-ask-footer flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-4">
              <button type="button" onClick={closeQuestionCreateModal} className="team-ws-qna-cancel-button rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50">취소</button>
              <button type="submit" disabled={submitting} className="team-ws-qna-submit-button flex items-center gap-2 rounded-xl bg-team px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60">
                <i className="fas fa-paper-plane"></i>
                질문 등록하기
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {detail ? (() => {
        const statusMeta = questionSourceStatus(detail)
        const detailStatus = questionUiStatus(detail)
        const answers = detail.answers ?? []
        const canResolve = detailStatus === 'done' && detail.authorId === currentUserId
        const tags = questionSourceTags(detail)
        const parsedContent = parseQuestionContent(detail.content)

        return (
          <Modal title="질문 상세" iconClassName={statusMeta.icon} panelClassName="flex max-h-[90vh] w-full max-w-3xl flex-col" onClose={() => setDetail(null)}>
            <div className="custom-scrollbar max-h-[72vh] overflow-y-auto p-6">
              <div className="mb-5">
                <span className={`mb-3 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-extrabold ${statusMeta.className}`}>
                  <i className={`fas ${statusMeta.icon}`}></i>
                  {statusMeta.label}
                </span>
                <h3 className="text-[19px] font-black text-gray-900">{detail.title}</h3>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={detail.authorName || '팀원'} imageUrl={null} className="h-10 w-10 border border-gray-200 bg-gray-50" iconClassName="text-sm" />
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">{detail.authorName || '팀원'}</p>
                      <p className="text-xs font-medium text-gray-400">{formatDate(detail.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((item) => (
                      <span key={item} className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-600">#{item}</span>
                    ))}
                  </div>
                </div>
                {parsedContent.contexts.length > 0 ? (
                  <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-[11px] font-extrabold text-gray-500">관련 컨텍스트</p>
                    <div className="space-y-1.5">
                      {parsedContent.contexts.map((context) => (
                        <p key={context} className="flex items-start gap-2 text-xs font-bold leading-5 text-gray-600">
                          <i className="fas fa-link mt-0.5 text-gray-400"></i>
                          <span>{context}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="whitespace-pre-line text-sm font-medium leading-7 text-gray-700">{parsedContent.body || '질문 내용이 없습니다.'}</p>
              </div>

              {answers.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {answers.map((answer) => (
                    <div key={answer.id} className="relative rounded-2xl border border-purple-200 bg-indigo-50/30 p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-team text-white shadow-sm">
                          <i className="fas fa-user-tie"></i>
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-gray-900">{answer.authorName || '멘토'}</p>
                          <p className="text-xs font-medium text-purple-500">멘토 답변 · {formatDate(answer.createdAt)}</p>
                        </div>
                      </div>
                      <p className="whitespace-pre-line border-l-4 border-team pl-4 text-sm font-medium leading-7 text-gray-700">{answer.content}</p>

                      {canResolve && answer.authorId !== currentUserId ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                          <div>
                            <p className="text-xs font-extrabold text-blue-900">답변으로 문제가 해결되었나요?</p>
                            <p className="mt-0.5 text-[11px] font-medium text-blue-600">해결 처리하면 이 질문은 해결됨 탭으로 이동합니다.</p>
                          </div>
                          <button type="button" onClick={() => void resolveQuestion(answer.id)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700">
                            <i className="fas fa-check"></i>
                            이 답변으로 해결됨
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {detailStatus === 'resolved' ? (
                    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
                      <i className="fas fa-check-circle text-lg text-green-500"></i>
                      <div>
                        <p className="text-sm font-extrabold text-green-800">이 질문은 멘토님의 답변으로 해결되었습니다.</p>
                        <p className="mt-0.5 text-xs font-medium text-green-600">채택된 답변은 해결됨 탭에서 계속 확인할 수 있습니다.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <i className="fas fa-hourglass-half mb-3 text-2xl text-gray-300"></i>
                  <p className="text-sm font-extrabold text-gray-700">멘토님이 질문을 확인 중입니다.</p>
                  <p className="mt-1 text-xs font-medium text-gray-400">답변이 등록되면 알림으로 알려드릴게요.</p>
                </div>
              )}
              {detailError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{detailError}</p> : null}
            </div>
          </Modal>
        )
      })() : null}
      {contextPicker ? (() => {
        const pickerTitle = contextPicker === 'task' ? '칸반 티켓 선택' : contextPicker === 'file' ? '자료실 파일 첨부' : 'API 명세 연동'
        const pickerIcon = contextPicker === 'task' ? 'fa-columns' : contextPicker === 'file' ? 'fa-file-alt' : 'fa-network-wired'
        const fileCandidates = data.files.filter((file) => file.itemType !== 'FOLDER')
        const hasApiSpec = Boolean(data.apiSpec?.content?.trim())

        return (
          <Modal title={pickerTitle} iconClassName={pickerIcon} panelClassName="flex max-h-[86vh] w-full max-w-xl flex-col" onClose={() => setContextPicker(null)}>
            <div className="custom-scrollbar max-h-[62vh] space-y-3 overflow-y-auto p-6">
              {contextPicker === 'task' ? (
                data.tasks.length > 0 ? data.tasks.map((task) => {
                  const context = buildTaskContext(task)
                  const selected = selectedQuestionContexts.some((item) => item.type === context.type && item.id === context.id)

                  return (
                    <button key={task.taskId} type="button" onClick={() => selectQuestionContext(context)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${selected ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-gray-900">{task.title}</p>
                        <p className="mt-1 text-xs font-bold text-gray-400">{context.description}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {selected ? '선택됨' : '선택'}
                      </span>
                    </button>
                  )
                }) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <i className="fas fa-columns mb-3 text-2xl text-gray-300"></i>
                    <p className="text-sm font-extrabold text-gray-700">선택할 칸반 티켓이 없습니다.</p>
                    <p className="mt-1 text-xs font-medium text-gray-400">칸반 보드에서 작업을 먼저 생성해주세요.</p>
                  </div>
                )
              ) : null}

              {contextPicker === 'file' ? (
                fileCandidates.length > 0 ? fileCandidates.map((file) => {
                  const context = buildFileContext(file)
                  const selected = selectedQuestionContexts.some((item) => item.type === context.type && item.id === context.id)

                  return (
                    <button key={file.fileId} type="button" onClick={() => selectQuestionContext(context)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${selected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                          <i className={`fas ${fileIcon(file)}`}></i>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-gray-900">{workspaceFileName(file)}</p>
                          <p className="mt-1 text-xs font-bold text-gray-400">{file.uploadedByName || '팀원'} · {formatDate(file.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {selected ? '첨부됨' : '첨부'}
                      </span>
                    </button>
                  )
                }) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <i className="fas fa-file-alt mb-3 text-2xl text-gray-300"></i>
                    <p className="text-sm font-extrabold text-gray-700">첨부할 자료실 파일이 없습니다.</p>
                    <p className="mt-1 text-xs font-medium text-gray-400">자료실에 파일이나 링크를 먼저 등록해주세요.</p>
                  </div>
                )
              ) : null}

              {contextPicker === 'api' ? (
                hasApiSpec ? (() => {
                  const context = buildApiContext()
                  const selected = selectedQuestionContexts.some((item) => item.type === context.type && item.id === context.id)

                  return (
                    <button type="button" onClick={() => selectQuestionContext(context)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${selected ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-gray-900">API 명세 문서</p>
                        <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-gray-400">{context.description}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${selected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {selected ? '연동됨' : '연동'}
                      </span>
                    </button>
                  )
                })() : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <i className="fas fa-network-wired mb-3 text-2xl text-gray-300"></i>
                    <p className="text-sm font-extrabold text-gray-700">등록된 API 명세가 없습니다.</p>
                    <p className="mt-1 text-xs font-medium text-gray-400">아키텍처 페이지에서 API 명세를 먼저 저장해주세요.</p>
                  </div>
                )
              ) : null}
            </div>
          </Modal>
        )
      })() : null}
    </>
  )
}

function SchedulePage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState<EventForm>({ title: '', description: '', type: 'scrum', date: todayDateInput(), time: '10:00', duration: '60' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [optimisticEvents, setOptimisticEvents] = useState<CalendarEvent[]>([])
  const [recentEventIds, setRecentEventIds] = useState<number[]>([])
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [scheduleNotice, setScheduleNotice] = useState<{ title: string; messageLines: string[] } | null>(null)
  const events = useMemo(() => {
    const existingIds = new Set(data.events.map((event) => event.eventId))

    return [
      ...data.events,
      ...optimisticEvents.filter((event) => !existingIds.has(event.eventId)),
    ].sort((left, right) => (parseDate(left.startAt)?.getTime() ?? 0) - (parseDate(right.startAt)?.getTime() ?? 0))
  }, [data.events, optimisticEvents])
  const upcoming = useMemo(() => sortScheduleSidebarEvents(events, recentEventIds), [events, recentEventIds])
  const [monthBase, setMonthBase] = useState(() => new Date())
  const monthLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(monthBase)
  const todayKey = todayDateInput()
  const calendarDays = useMemo(() => {
    const first = new Date(monthBase.getFullYear(), monthBase.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`

      return {
        key,
        day: date.getDate(),
        currentMonth: date.getMonth() === monthBase.getMonth(),
        events: events.filter((item) => item.startAt?.startsWith(key)).slice(0, 2),
      }
    })
  }, [events, monthBase])

  async function createEvent(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('일정 제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const startAt = toLocalDateTime(form.date, form.time)
      const createdEvent = await projectApiRequest<CalendarEvent>(
        `/api/workspaces/${workspaceId}/calendar-events`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: form.title.trim(),
            description: buildTeamScheduleDescription(form.type, form.description),
            startAt,
            endAt: addMinutes(startAt, Number(form.duration) || 60),
          }),
        },
        'required',
      )
      setOptimisticEvents((current) => [createdEvent, ...current.filter((event) => event.eventId !== createdEvent.eventId)])
      setRecentEventIds((current) => [createdEvent.eventId, ...current.filter((eventId) => eventId !== createdEvent.eventId)].slice(0, 6))
      setModalOpen(false)
      setForm({ title: '', description: '', type: 'scrum', date: todayDateInput(), time: '10:00', duration: '60' })
      setScheduleNotice({ title: '일정 등록 완료!', messageLines: ['우리 팀 캘린더에 성공적으로', '추가되었습니다.'] })
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '일정 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteEvent() {
    if (!deleteTarget) return

    setSubmitting(true)
    setDeleteError(null)

    try {
      await projectApiRequest<void>(`/api/calendar-events/${deleteTarget.eventId}`, { method: 'DELETE' }, 'required')
      setOptimisticEvents((current) => current.filter((event) => event.eventId !== deleteTarget.eventId))
      setRecentEventIds((current) => current.filter((eventId) => eventId !== deleteTarget.eventId))
      setSelectedEvent(null)
      setDeleteTarget(null)
      setScheduleNotice({ title: '일정 삭제 완료!', messageLines: ['선택한 일정이 캘린더에서', '삭제되었습니다.'] })
      await reload()
    } catch (nextError) {
      setDeleteError(nextError instanceof Error ? nextError.message : '일정 삭제에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function openAddEvent(date?: string) {
    setError(null)
    setForm({ title: '', description: '', type: 'scrum', date: date ?? todayDateInput(), time: '10:00', duration: '60' })
    setModalOpen(true)
  }

  return (
    <>
      <PageFrame
        activePage="schedule"
        title="팀 캘린더 & 스크럼"
        subtitle="멘토의 공식 일정과 우리 팀의 자체 일정(스크럼, 기획 마감 등)을 한 곳에서 관리하세요."
        action={<button type="button" onClick={() => openAddEvent()} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-plus mr-2"></i>팀 일정 추가</button>}
        data={data}
        workspaceId={workspaceId}
        mainClassName="team-ws-schedule-main custom-scrollbar flex-1 overflow-hidden p-5 lg:p-6 relative"
        contentClassName="team-ws-schedule-content mx-auto flex h-full min-h-0 max-w-6xl flex-col"
      >
        <div className="team-ws-schedule-heading mb-4 flex shrink-0 flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
              <i className="fas fa-calendar-alt text-team"></i>
              팀 캘린더 & 스크럼
            </h1>
            <p className="mt-1 text-xs leading-5 text-gray-500">멘토의 공식 일정과 우리 팀의 자체 일정(스크럼, 기획 마감 등)을 한 곳에서 관리하세요.</p>
          </div>
          <button type="button" onClick={() => openAddEvent()} className="flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg transition hover:bg-black">
            <i className="fas fa-plus"></i>
            팀 일정 추가
          </button>
        </div>

        <div className="team-ws-schedule-layout grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5">
          <section className="team-ws-schedule-calendar-panel flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm xl:p-5 lg:col-span-2">
            <div className="team-ws-schedule-month-header mb-3 flex shrink-0 items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-900">{monthLabel}</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMonthBase((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50">
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button type="button" onClick={() => setMonthBase((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50">
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
            <div className="team-ws-schedule-legend mb-2 flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] font-bold text-gray-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500"></span> 멘토 공식</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> 팀 스크럼/회의</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500"></span> 팀 내부 마감일</span>
            </div>
            <div className="calendar-grid team-ws-schedule-calendar-grid">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className={`calendar-header ${day === '일' ? 'text-red-500' : day === '토' ? 'text-blue-500' : ''}`}>{day}</div>
              ))}
              {calendarDays.map((day) => (
                <div key={day.key} onClick={() => openAddEvent(day.key)} className={`calendar-day ${day.currentMonth ? '' : 'other-month'} ${day.key === todayKey ? 'today' : ''}`}>
                  <span className="text-xs font-bold">{day.day}</span>
                  <div className="mt-2 space-y-1">
                    {day.events.map((event) => {
                      const meta = eventSourceType(event)
                      const tooltip = scheduleEventTooltip(event)

                      return (
                        <div key={event.eventId} title={tooltip} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(event) }} className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight text-white shadow-sm ${meta.badge}`}>
                          {formatTime(event.startAt)} {event.title}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="team-ws-schedule-upcoming-panel flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm xl:p-5">
            <h3 className="mb-3 flex shrink-0 items-center gap-2 border-b border-gray-100 pb-2 text-sm font-extrabold text-gray-900">
              <i className="fas fa-list-ul text-team"></i>
              다가오는 일정
            </h3>
            {upcoming.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-2xl text-gray-300">
                  <i className="far fa-calendar-times"></i>
                </div>
                <p className="mb-1 text-sm font-bold text-gray-500">등록된 일정이 없습니다</p>
                <p className="text-[10px] leading-relaxed text-gray-400">우측 상단의 '팀 일정 추가' 버튼을 눌러<br />새로운 일정을 만들어보세요.</p>
              </div>
            ) : (
              <div className="team-ws-schedule-upcoming-list custom-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {upcoming.map((event) => {
                  const meta = eventSourceType(event)
                  const tooltip = scheduleEventTooltip(event)

                  return (
                  <div key={event.eventId} title={tooltip} onClick={() => setSelectedEvent(event)} className={`team-ws-schedule-upcoming-card relative cursor-pointer rounded-xl border px-3 py-2.5 transition hover:-translate-y-0.5 ${meta.shell}`}>
                    <div className="mb-1 flex items-start justify-between">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${meta.badge}`}>{meta.label}</span>
                    </div>
                    <h3 className="mb-0 line-clamp-1 text-[13px] font-bold text-gray-900" title={tooltip}>{event.title}</h3>
                    <p className="text-[10px] font-bold text-gray-500"><i className="far fa-clock mr-0.5"></i> {formatDate(event.startAt)} {formatTime(event.startAt)}</p>
                  </div>
                  )
                })}
              </div>
            )}
          </aside>
        </div>
      </PageFrame>

      {modalOpen ? (
        <Modal title="팀 일정 추가" iconClassName="fa-plus-circle" panelClassName="w-full max-w-md" onClose={() => setModalOpen(false)}>
          <form onSubmit={createEvent}>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">일정 유형 <span className="text-red-500">*</span></label>
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none transition focus:border-team">
                  <option value="scrum">🔵 스크럼 / 팀 회의</option>
                  <option value="deadline">🟠 팀 내부 마감일 (공식 아님)</option>
                  <option value="vacation">⚪ 개인 휴가 / 부재 알림</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">일정 제목 <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="예) 주간 스프린트 회의" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-team" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">날짜 <span className="text-red-500">*</span></label>
                  <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-team" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">시간</label>
                  <input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-team" />
                </div>
              </div>
              <select value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} className="hidden">
                <option value="30">30분</option>
                <option value="60">1시간</option>
                <option value="90">1시간 30분</option>
                <option value="120">2시간</option>
              </select>
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">상세 설명</label>
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="팀원들에게 안내할 상세 내용을 입력하세요." className="h-24 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-team"></textarea>
              </div>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
                <i className="fas fa-save"></i>
                추가하기
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {selectedEvent ? (() => {
        const meta = eventSourceType(selectedEvent)
        const description = stripTeamScheduleType(selectedEvent.description)
        const tooltip = scheduleEventTooltip(selectedEvent)
        const isOfficial = meta.kind === 'official'

        return (
          <div className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <button type="button" aria-label="닫기" className="absolute inset-0" onClick={() => setSelectedEvent(null)}></button>
            <div className="modal-content team-ws-modal-panel team-ws-event-detail-modal relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="team-ws-event-detail-header flex justify-between border-b border-gray-100 bg-gray-50">
                <div className="min-w-0">
                  <span className={`team-ws-event-detail-badge text-white ${meta.badge}`}>{isOfficial ? '멘토 공식 일정' : '우리 팀 자체 일정'}</span>
                  <h3 className="team-ws-event-detail-title truncate text-gray-900" title={tooltip}>{selectedEvent.title}</h3>
                  <p className="team-ws-event-detail-time font-bold text-gray-500" title={tooltip}>
                    <i className="far fa-clock"></i> {formatDate(selectedEvent.startAt)} {formatTime(selectedEvent.startAt)}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedEvent(null)} className="team-ws-event-detail-close flex shrink-0 items-center justify-center border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="team-ws-event-detail-body">
                <p className="team-ws-event-detail-label font-bold text-gray-400">상세 안내</p>
                <div className="team-ws-event-detail-desc border border-gray-100 bg-gray-50 font-medium leading-relaxed text-gray-700">
                  {description || '상세 설명이 없습니다.'}
                </div>
              </div>

              <div className="team-ws-event-detail-footer flex items-center justify-between border-t border-gray-100 bg-white">
                {isOfficial ? <div></div> : (
                  <button type="button" onClick={() => { setDeleteError(null); setDeleteTarget(selectedEvent) }} className="team-ws-event-detail-delete border border-red-100 bg-red-50 font-bold text-red-500 transition hover:bg-red-100">
                    <i className="fas fa-trash-alt"></i> 일정 삭제
                  </button>
                )}
                <button type="button" onClick={() => setSelectedEvent(null)} className="team-ws-event-detail-confirm bg-gray-900 font-bold text-white shadow-md transition hover:bg-black">확인</button>
              </div>
            </div>
          </div>
        )
      })() : null}

      {deleteTarget ? (
        <div id="deleteEventModal" className="modal-overlay active fixed inset-0 z-[1060] flex items-center justify-center p-4">
          <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setDeleteTarget(null); setDeleteError(null) }}></button>
          <div className="modal-content team-ws-schedule-delete-modal relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 shadow-sm">
              <i className="fas fa-trash-alt text-2xl"></i>
            </div>
            <h3 className="mb-2 text-xl font-extrabold text-gray-900">일정 삭제</h3>
            <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">
              우리 팀 캘린더에서 이 일정을<br />삭제하시겠습니까?
            </p>
            {deleteError ? <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-500">{deleteError}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={submitting} className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60">취소</button>
              <button type="button" onClick={() => void deleteEvent()} disabled={submitting} className="rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-600 disabled:opacity-60">
                삭제하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scheduleNotice ? (
        <div id="successModal" className="modal-overlay active fixed inset-0 z-[1060] flex items-center justify-center p-4">
          <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setScheduleNotice(null)}></button>
          <div className="modal-content team-ws-schedule-success-modal relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="team-ws-schedule-success-icon mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-indigo-100 bg-team-light shadow-sm">
              <i className="fas fa-check text-3xl text-team"></i>
            </div>
            <h3 className="mb-2 text-xl font-extrabold text-gray-900">{scheduleNotice.title}</h3>
            <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">
              {scheduleNotice.messageLines[0]}<br />{scheduleNotice.messageLines[1]}
            </p>
            <button type="button" onClick={() => setScheduleNotice(null)} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
          </div>
        </div>
      ) : null}
    </>
  )
}

function ArchitecturePage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [tab, setTab] = useState<'api' | 'erd' | 'infra'>('api')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedApi, setSelectedApi] = useState<ArchitectureApiEndpoint | null>(null)
  const session = readStoredAuthSession()
  const currentMember = data.dashboard?.members.find((member) => member.learnerId === session?.userId)
  const defaultOwner = currentMember?.learnerName || ''
  const [form, setForm] = useState<DocForm>({
    mode: 'api',
    title: '',
    content: '',
    method: 'GET',
    endpoint: '',
    status: '설계 중',
    owner: defaultOwner,
    request: '',
    response: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const apiEndpoints = useMemo(() => parseArchitectureApiEndpoints(data.apiSpec?.content), [data.apiSpec?.content])

  async function saveDoc(event: FormEvent) {
    event.preventDefault()

    if (form.mode === 'api' && (!form.endpoint.trim() || !form.content.trim())) {
      setError('엔드포인트와 설명을 입력해주세요.')
      return
    }

    if (form.mode !== 'api' && !form.content.trim()) {
      setError('저장할 내용을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const endpoint = form.mode === 'erd'
        ? `/api/workspaces/${workspaceId}/docs/erd`
        : form.mode === 'infra'
          ? `/api/workspaces/${workspaceId}/docs/infra`
          : `/api/workspaces/${workspaceId}/api-spec`
      const previousContent = form.mode === 'api' ? data.apiSpec?.content?.trim() : ''
      const nextApiLine = form.mode === 'api' ? buildApiEndpointLine(form) : ''
      const nextContent = form.mode === 'api'
        ? form.editingApiId
          ? (() => {
              const lines = (data.apiSpec?.content ?? '').split('\n')
              const target = apiEndpoints.find((endpoint) => endpoint.id === form.editingApiId)

              if (!target || target.sourceIndex < 0 || target.sourceIndex >= lines.length) {
                return [previousContent, nextApiLine].filter(Boolean).join('\n')
              }

              lines[target.sourceIndex] = nextApiLine

              return lines.join('\n').trim()
            })()
          : [previousContent, nextApiLine].filter(Boolean).join('\n')
        : `${form.title.trim() ? `# ${form.title.trim()}\n\n` : ''}${form.content.trim()}`
      await projectApiRequest<WorkspaceDoc>(endpoint, { method: 'PUT', body: JSON.stringify({ content: nextContent }) }, 'required')
      setModalOpen(false)
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '문서 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function openDocModal(mode: 'api' | 'erd' | 'infra') {
    setForm({
      mode,
      title: mode === 'api' ? '새 API 명세' : mode === 'erd' ? 'ERD 원본 링크' : '인프라 구조도',
      content: mode === 'api' ? '' : mode === 'erd' ? stripMarkdownHeading(data.erdDoc?.content) : stripMarkdownHeading(data.infraDoc?.content),
      method: 'GET',
      endpoint: '',
      status: '설계 중',
      owner: defaultOwner,
      request: '',
      response: '',
      editingApiId: undefined,
    })
    setError(null)
    setModalOpen(true)
  }

  function openApiEditModal(endpoint: ArchitectureApiEndpoint) {
    setForm({
      mode: 'api',
      title: 'API 명세',
      content: endpoint.description,
      method: endpoint.method,
      endpoint: endpoint.endpoint,
      status: endpoint.status,
      owner: endpoint.owner,
      request: endpoint.request ?? '',
      response: endpoint.response ?? '',
      editingApiId: endpoint.id,
    })
    setSelectedApi(null)
    setError(null)
    setModalOpen(true)
  }

  const activeContent = tab === 'api' ? data.apiSpec?.content : tab === 'erd' ? data.erdDoc?.content : data.infraDoc?.content
  const activeDocTitle = tab === 'erd'
    ? architectureDocTitle(data.erdDoc?.content, '데이터베이스 ERD')
    : architectureDocTitle(data.infraDoc?.content, '시스템 인프라 아키텍처')
  const activeDocUrl = tab === 'api' ? extractFirstUrl(data.apiSpec?.content) : extractFirstUrl(activeContent)

  return (
    <>
      <PageFrame
        activePage="architecture"
        title="아키텍처 & API 설계"
        subtitle="프론트엔드와 백엔드가 데이터 구조와 API 스펙을 공유하고 합의하는 공간입니다."
        action={<div className="flex gap-2">{tab === 'api' ? <><button type="button" onClick={() => openDocModal('erd')} className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-[13px] font-black text-gray-700 shadow-sm hover:bg-gray-50"><i className="fas fa-link mr-1.5 text-gray-400"></i>외부 링크 연동</button><button type="button" onClick={() => openDocModal('api')} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-plus mr-1.5"></i>새 API 추가</button></> : <button type="button" onClick={() => openDocModal(tab)} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-link mr-1.5"></i>{tab === 'erd' ? 'ERD 링크 연동' : '구조도 연동'}</button>}</div>}
        data={data}
        workspaceId={workspaceId}
        mainClassName="flex-1 flex overflow-hidden relative"
        contentClassName="flex h-full min-w-0 flex-1"
      >
        <section className="z-10 flex h-full min-w-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="shrink-0 px-8 pt-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h1 className="mb-2 flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                  <i className="fas fa-project-diagram text-team"></i>
                  아키텍처 & API 설계
                </h1>
                <p className="mb-4 text-sm text-gray-500">프론트엔드와 백엔드가 데이터 구조와 API 스펙을 공유하고 합의하는 공간입니다.</p>
              </div>
              <div className="mb-4 flex shrink-0 gap-2">
                {tab === 'api' ? (
                  <>
                    <button type="button" onClick={() => openDocModal('erd')} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
                      <i className="fas fa-link text-gray-400"></i>
                      외부 링크 연동
                    </button>
                    <button type="button" onClick={() => openDocModal('api')} className="flex items-center gap-1.5 rounded-lg bg-team px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700">
                      <i className="fas fa-plus"></i>
                      새 API 추가
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => openDocModal(tab)} className="flex items-center gap-1.5 rounded-lg bg-team px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700">
                    <i className="fas fa-link"></i>
                    {tab === 'erd' ? 'ERD 링크 연동' : '구조도 연동'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-6 border-b border-gray-200 px-8">
              {[
                ['api', 'API 명세서'],
                ['erd', 'ERD (DB 설계)'],
                ['infra', '인프라 구조도'],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key as 'api' | 'erd' | 'infra')} className={`arch-tab pb-3 text-sm font-bold ${tab === key ? 'active' : 'text-gray-500'}`}>
                  {label}
                </button>
              ))}
          </div>

          <div className="custom-scrollbar relative flex-1 overflow-y-auto bg-gray-50 p-6">
              {tab === 'api' ? (
                apiEndpoints.length > 0 ? (
                  <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-extrabold text-gray-800">REST API Endpoints</h3>
                      <div className="flex items-center gap-3">
                        {activeDocUrl ? (
                          <a href={activeDocUrl} target="_blank" rel="noreferrer" className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm transition hover:text-team">
                            <i className="fas fa-external-link-alt mr-1"></i>
                            문서 링크 열기
                          </a>
                        ) : null}
                        <button type="button" onClick={() => openDocModal('api')} className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm transition hover:text-team">
                          <i className="fas fa-plus mr-1"></i>
                          엔드포인트 추가
                        </button>
                      </div>
                    </div>
                    <div className="custom-scrollbar flex-1 overflow-y-auto">
                      <table className="w-full border-collapse text-left">
                        <thead className="border-b border-gray-100 bg-white text-[10px] font-bold uppercase text-gray-400">
                          <tr>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3">Endpoint</th>
                            <th className="px-4 py-3">설명</th>
                            <th className="px-4 py-3">상태</th>
                            <th className="px-4 py-3">담당</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                          {apiEndpoints.map((endpoint) => {
                            const statusMeta = apiStatusMeta(endpoint.status)

                            return (
                              <tr key={endpoint.id} onClick={() => setSelectedApi(endpoint)} className="api-row cursor-pointer transition hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${apiMethodClass(endpoint.method)}`}>{endpoint.method}</span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-800">{endpoint.endpoint}</td>
                                <td className="px-4 py-3 text-xs font-medium text-gray-600">{endpoint.description}</td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}>
                                    {statusMeta.icon ? <i className={`fas ${statusMeta.icon} mr-0.5 ${statusMeta.icon === 'fa-spinner' ? 'fa-spin' : ''}`}></i> : null}
                                    {statusMeta.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <UserAvatar name={endpoint.owner} imageUrl={null} className="h-5 w-5 border border-gray-200 bg-gray-50" iconClassName="text-[8px]" />
                                    <span className="text-xs text-gray-700">{endpoint.owner}</span>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : activeContent ? (
                  <div className="min-h-[520px] rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-extrabold text-gray-800">API 명세 원문</h3>
                      <button type="button" onClick={() => openDocModal('api')} className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm transition hover:text-team">
                        <i className="fas fa-plus mr-1"></i>
                        엔드포인트 추가
                      </button>
                    </div>
                    <pre className="custom-scrollbar whitespace-pre-wrap p-6 text-[13px] font-medium leading-6 text-gray-700">{activeContent}</pre>
                  </div>
                ) : (
                  <EmptyPanel icon="fa-network-wired" title="아직 등록된 API 명세서가 없습니다." description="프론트엔드와 통신할 첫 번째 API 규격을 추가해보세요." actionLabel="새 API 추가하기" actionTone="team" onAction={() => openDocModal('api')} />
                )
              ) : activeContent ? (
                <div className="group relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-extrabold text-gray-800">{activeDocTitle}</h3>
                      <span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] text-purple-600">최근 수정: {formatRelativeTime(tab === 'erd' ? data.erdDoc?.updatedAt : data.infraDoc?.updatedAt)}</span>
                    </div>
                    {activeDocUrl ? (
                      <a href={activeDocUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:text-team">
                        <i className="fas fa-external-link-alt"></i>
                        원본 보기
                      </a>
                    ) : (
                      <button type="button" onClick={() => openDocModal(tab)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:text-team">
                        <i className="fas fa-pen"></i>
                        내용 수정
                      </button>
                    )}
                  </div>
                  <div className="custom-scrollbar flex flex-1 items-center justify-center overflow-auto bg-[#f8f9fa] p-6">
                    {activeDocUrl ? (
                      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                        <i className={`fas ${tab === 'erd' ? 'fa-database text-purple-500' : 'fa-sitemap text-indigo-500'} mb-4 text-5xl opacity-70`}></i>
                        <p className="text-sm font-extrabold text-gray-900">{activeDocTitle}</p>
                        <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs font-medium text-gray-500">{activeDocUrl}</p>
                        <a href={activeDocUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                          <i className="fas fa-external-link-alt"></i>
                          외부 툴에서 전체화면 보기
                        </a>
                      </div>
                    ) : (
                      <pre className="w-full whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-6 text-[13px] font-medium leading-6 text-gray-700 shadow-sm">{stripMarkdownHeading(activeContent)}</pre>
                    )}
                  </div>
                </div>
              ) : tab === 'erd' ? (
                <EmptyPanel icon="fa-database" title="연동된 ERD 다이어그램이 없습니다." description="데이터베이스 모델링 문서(ERDCloud, Draw.io 등)를 연동해 공유하세요." actionLabel="외부 링크 연동하기" onAction={() => openDocModal('erd')} />
              ) : (
                <EmptyPanel icon="fa-sitemap" title="시스템 아키텍처 구조도가 없습니다." description="서버, 배포, 외부 API 연동 등 전체 시스템 아키텍처 다이어그램을 연동하세요." actionLabel="아키텍처 링크 연동하기" onAction={() => openDocModal('infra')} />
              )}
          </div>
        </section>

          <aside className="hidden h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-gray-50 lg:flex">
            <div className="border-b border-gray-200 bg-white px-6 py-5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                <i className="fas fa-history text-team"></i>
                변경 이력 (Changelog)
              </h3>
              <p className="mt-1 text-[10px] text-gray-500">API 명세 및 설계 수정 내역 타임라인</p>
            </div>
            {data.activities.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 pb-10 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-300 shadow-inner">
                  <i className="fas fa-wind"></i>
                </div>
                <p className="text-xs font-bold text-gray-500">아직 변경 이력이 없습니다.</p>
                <p className="mt-1 text-[10px] leading-relaxed text-gray-400">API나 아키텍처 문서가<br />수정되면 이곳에 기록됩니다.</p>
              </div>
            ) : (
              <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
                <div className="team-ws-architecture-changelog-list relative ml-3 space-y-6">
                  {data.activities.slice(0, 8).map((activity, index) => (
                    <div key={activity.logId} className="team-ws-architecture-changelog-item relative pl-5">
                      <span className={`team-ws-architecture-changelog-dot absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${index === 0 ? 'bg-team shadow-[0_0_0_3px_rgba(79,70,229,0.12)]' : 'bg-gray-300'}`}></span>
                      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <p className="text-[12px] font-black leading-5 text-gray-800">{activity.description}</p>
                        <p className="mt-1 text-[10px] font-bold text-gray-400">{formatRelativeTime(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
      </PageFrame>

      {modalOpen ? (
        <Modal
          title={form.mode === 'api' ? (form.editingApiId ? 'API 수정' : '새 API 추가') : form.mode === 'erd' ? 'ERD 외부 링크 연동' : '구조도 외부 링크 연동'}
          iconClassName={form.mode === 'api' ? (form.editingApiId ? 'fa-pen' : 'fa-plus') : 'fa-link'}
          description={form.mode === 'api' ? '프론트와 백엔드가 함께 확인할 REST API 명세를 정리하세요.' : '팀원이 바로 열어볼 수 있는 외부 문서 링크와 설명을 연결하세요.'}
          panelClassName="team-ws-architecture-doc-modal flex max-h-[90vh] w-full max-w-2xl flex-col"
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={saveDoc} className="team-ws-architecture-doc-form flex min-h-0 flex-1 flex-col">
            <div className="team-ws-architecture-doc-body custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
              {form.mode === 'api' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                    <div>
                      <label className="team-ws-architecture-doc-label mb-2 block text-xs font-bold text-gray-800">Method</label>
                      <select value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))} className="team-ws-architecture-doc-select h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold outline-none focus:border-team">
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="team-ws-architecture-doc-label mb-2 block text-xs font-bold text-gray-800">Endpoint</label>
                      <input value={form.endpoint} onChange={(event) => setForm((current) => ({ ...current, endpoint: event.target.value }))} placeholder="/api/workspaces/{workspaceId}/..." className="team-ws-architecture-doc-input h-11 w-full rounded-xl border border-gray-200 px-4 font-mono text-sm font-semibold outline-none focus:border-team" />
                    </div>
                  </div>
                  <div>
                    <label className="team-ws-architecture-doc-label mb-2 block text-xs font-bold text-gray-800">설명</label>
                    <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="이 API를 어떤 화면과 동작에 사용하는지 적어주세요." className="team-ws-architecture-doc-textarea h-24 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm font-medium outline-none focus:border-team"></textarea>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="team-ws-architecture-doc-label mb-2 block text-xs font-bold text-gray-800">상태</label>
                      <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="team-ws-architecture-doc-select h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold outline-none focus:border-team">
                        {['설계 중', '프론트 연동 중', '개발 완료'].map((statusOption) => (
                          <option key={statusOption} value={statusOption}>{statusOption}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="team-ws-architecture-doc-label mb-2 block text-xs font-bold text-gray-800">담당</label>
                      <input value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} placeholder="담당자 이름" className="team-ws-architecture-doc-input h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold outline-none focus:border-team" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="team-ws-architecture-code-label mb-2 block text-[10px] font-bold uppercase text-gray-400">Request 예시</label>
                      <textarea value={form.request} onChange={(event) => setForm((current) => ({ ...current, request: event.target.value }))} placeholder='{"keyword":"react"}' className="team-ws-architecture-code-textarea h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs outline-none focus:border-team"></textarea>
                    </div>
                    <div>
                      <label className="team-ws-architecture-code-label mb-2 block text-[10px] font-bold uppercase text-gray-400">Response 예시</label>
                      <textarea value={form.response} onChange={(event) => setForm((current) => ({ ...current, response: event.target.value }))} placeholder='{"status":200,"data":{}}' className="team-ws-architecture-code-textarea h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs outline-none focus:border-team"></textarea>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="team-ws-architecture-doc-label mb-2 block text-xs font-bold text-gray-800">문서 제목</label>
                    <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={form.mode === 'erd' ? '데이터베이스 ERD' : '인프라 구조도'} className="team-ws-architecture-doc-input h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold outline-none focus:border-team" />
                  </div>
                  <div>
                    <label className="team-ws-architecture-doc-label mb-2 block text-xs font-bold text-gray-800">외부 서비스 URL 또는 설명</label>
                    <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="https://... 또는 팀원이 참고할 설명을 입력하세요." className="team-ws-architecture-doc-textarea h-28 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm font-medium outline-none focus:border-team"></textarea>
                  </div>
                </>
              )}
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{error}</p> : null}
            </div>
            <div className="team-ws-architecture-doc-footer flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-4">
              <button type="button" onClick={() => setModalOpen(false)} className="team-ws-architecture-cancel-button rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50">취소</button>
              <button type="submit" disabled={submitting} className="team-ws-architecture-submit-button flex items-center gap-2 rounded-xl bg-team px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60">
                <i className="fas fa-save"></i>
                저장
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {selectedApi ? (() => {
        const statusMeta = apiStatusMeta(selectedApi.status)

        return (
          <Modal
            title={selectedApi.endpoint}
            panelClassName="flex max-h-[90vh] w-full max-w-2xl flex-col"
            headerClassName="items-center"
            onClose={() => setSelectedApi(null)}
          >
            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${apiMethodClass(selectedApi.method)}`}>
                  {selectedApi.method}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}>
                  {statusMeta.icon ? <i className={`fas ${statusMeta.icon} mr-0.5 ${statusMeta.icon === 'fa-spinner' ? 'fa-spin' : ''}`}></i> : null}
                  {statusMeta.label}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <UserAvatar name={selectedApi.owner} imageUrl={null} className="h-6 w-6 border border-gray-200 bg-gray-50" iconClassName="text-[9px]" />
                  <span className="text-xs font-bold text-gray-600">{selectedApi.owner}</span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">Description</h4>
                <p className="text-sm font-medium leading-6 text-gray-800">{selectedApi.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-400">Request Body / Query</h4>
                  <pre className="custom-scrollbar min-h-[132px] overflow-x-auto rounded border border-gray-200 bg-white p-3 font-mono text-xs leading-5 text-gray-800">{selectedApi.request || '등록된 Request 예시가 없습니다.'}</pre>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-400">Response</h4>
                  <pre className="custom-scrollbar min-h-[132px] overflow-x-auto rounded border border-gray-200 bg-white p-3 font-mono text-xs leading-5 text-gray-800">{selectedApi.response || '등록된 Response 예시가 없습니다.'}</pre>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setSelectedApi(null)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">닫기</button>
              <button type="button" onClick={() => openApiEditModal(selectedApi)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">수정하기</button>
            </div>
          </Modal>
        )
      })() : null}
    </>
  )
}

function MeetingPage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null)
  const [noteFilter, setNoteFilter] = useState<'all' | 'mentor' | 'team'>('all')
  const [form, setForm] = useState<NoteForm>({ noteId: null, title: '', content: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const liveMeetingEvent = useMemo(
    () => data.events.filter((event) => isOfficialLiveEvent(event)).sort((left, right) => (parseDate(left.startAt)?.getTime() ?? 0) - (parseDate(right.startAt)?.getTime() ?? 0))[0] ?? null,
    [data.events],
  )
  const voiceChannel = data.voiceChannels[0] ?? null
  const voiceParticipantCount = voiceChannel?.activeParticipantCount ?? 0
  const hasLiveMeeting = Boolean(liveMeetingEvent)
  const hasVoiceSession = voiceParticipantCount > 0
  const voiceHref = appendQueryParam(navHref('/team-voice-channel', workspaceId), 'channelId', voiceChannel?.channelId)

  async function saveNote(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('회의록 제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (form.noteId) {
        await projectApiRequest<MeetingNote>(
          `/api/meeting-notes/${form.noteId}`,
          { method: 'PUT', body: JSON.stringify({ title: form.title.trim(), content: form.content.trim() }) },
          'required',
        )
      } else {
        await projectApiRequest<MeetingNote>(
          `/api/workspaces/${workspaceId}/meeting-notes`,
          { method: 'POST', body: JSON.stringify({ title: form.title.trim(), content: form.content.trim() }) },
          'required',
        )
      }
      setModalOpen(false)
      setForm({ noteId: null, title: '', content: '' })
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '회의록 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function openNoteModal(note?: MeetingNote) {
    setError(null)
    setSelectedNote(null)
    setForm({ noteId: note?.noteId ?? null, title: note?.title ?? '', content: note?.content ?? '' })
    setModalOpen(true)
  }

  async function deleteNote(noteId: number) {
    if (!window.confirm('정말 이 회의록을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) return

    await projectApiRequest<void>(`/api/meeting-notes/${noteId}`, { method: 'DELETE' }, 'required')
    setSelectedNote(null)
    await reload()
  }

  const filteredNotes = useMemo(() => {
    if (noteFilter === 'all') return data.notes
    return data.notes.filter((note) => meetingNoteKind(note) === noteFilter)
  }, [data.notes, noteFilter])

  return (
    <>
      <PageFrame
        activePage="meeting"
        title="라이브 밋업 & 회의장"
        subtitle="멘토님이 주관하는 공식 밋업에 참여하거나, 팀원들끼리 모여 자유롭게 화면을 공유하며 회의하세요."
        action={<button type="button" onClick={() => openNoteModal()} className="team-ws-meeting-write-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-pen-nib"></i>팀 회의록 작성</button>}
        data={data}
        workspaceId={workspaceId}
        contentClassName="mx-auto max-w-6xl space-y-8"
      >
        <div className="flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
              <i className="fas fa-video text-team"></i>
              라이브 밋업 & 회의장
            </h1>
            <p className="mt-2 text-sm text-gray-500">멘토 공식 밋업에 참여하거나 팀원끼리 자유롭게 회의하세요.</p>
          </div>
          <button type="button" onClick={() => openNoteModal()} className="team-ws-meeting-write-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black">
            <i className="fas fa-pen-nib"></i>
            팀 회의록 작성
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex h-full flex-col space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <i className={`fas fa-broadcast-tower ${hasLiveMeeting ? 'animate-pulse text-red-500' : 'text-gray-400'}`}></i>
              멘토 공식 라이브 밋업
            </h3>
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {hasLiveMeeting ? (
                <>
                  <div className="relative flex h-32 shrink-0 flex-col justify-end bg-mentor p-6">
                    <div className="absolute inset-0 opacity-20"></div>
                    <span className="relative z-10 mb-2 w-fit rounded bg-red-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm">ON AIR</span>
                    <h4 className="relative z-10 text-lg font-black leading-tight text-white">{liveMeetingEvent?.title}</h4>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className="far fa-calendar-alt"></i></div>
                        <span>{formatDate(liveMeetingEvent?.startAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className="far fa-clock"></i></div>
                        <span>{formatTime(liveMeetingEvent?.startAt)} ~ {formatTime(liveMeetingEvent?.endAt)}</span>
                      </div>
                    </div>
                    <p className="mb-6 flex-1 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs font-medium leading-relaxed text-gray-500">
                      {liveMeetingEvent?.description || '멘토 공식 밋업 일정입니다.'}
                    </p>
                    <a href={navHref('/team-ws-live-meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                      <i className="fas fa-sign-in-alt"></i>
                      밋업 입장하기
                    </a>
                    <button type="button" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50">
                      <i className="fas fa-link"></i>
                      외부 링크 복사
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-2xl text-gray-300 shadow-sm">
                    <i className="fas fa-video-slash"></i>
                  </div>
                  <h4 className="mb-2 text-base font-extrabold text-gray-900">진행 중인 공식 밋업이 없습니다.</h4>
                  <p className="mb-6 max-w-[250px] text-xs font-medium leading-relaxed text-gray-500">다음 라이브 밋업 일정이 확정되면 멘토님이 이곳을 통해 알림을 드릴 예정입니다.</p>
                  <button type="button" disabled className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-400">
                    <i className="fas fa-sign-in-alt"></i>
                    밋업 입장하기
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex h-full flex-col space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <i className={`fas fa-headset ${hasVoiceSession ? 'text-team' : 'text-gray-400'}`}></i>
              우리 팀 상시 회의장 (음성 채널)
            </h3>
            <div className={`group relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-white ${hasVoiceSession ? 'border border-team shadow-lg' : 'border border-gray-200 shadow-sm'}`}>
              {hasVoiceSession ? <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-team opacity-10 blur-3xl transition duration-700 group-hover:scale-150"></div> : null}
              <div className={`relative z-10 shrink-0 border-b p-6 ${hasVoiceSession ? 'border-gray-100 bg-team-light' : 'border-gray-50 bg-gray-50'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-sm font-extrabold ${hasVoiceSession ? 'text-team' : 'text-gray-600'}`}>
                    <i className={`fas fa-circle text-[8px] ${hasVoiceSession ? 'animate-pulse text-green-500' : 'text-gray-400'}`}></i>
                    {voiceChannel?.name || '팀 보이스 챗'}
                  </span>
                  <span className={`rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold ${hasVoiceSession ? 'border-indigo-200 text-team' : 'border-gray-200 text-gray-500'}`}>
                    {voiceParticipantCount}명 접속 중
                  </span>
                </div>
                <p className={`text-xs font-medium ${hasVoiceSession ? 'text-indigo-800' : 'text-gray-500'}`}>
                  {voiceChannel?.description || '버튼 클릭 한 번으로 팀원들과 바로 대화하고 화면을 공유하세요.'}
                </p>
              </div>

              <div className="relative z-10 flex flex-1 flex-col bg-white p-6">
                {hasVoiceSession ? (
                  <div className="mb-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-400 bg-white text-green-500 shadow-sm">
                      <i className="fas fa-headset text-xl"></i>
                    </div>
                    <p className="mb-1 text-xs font-bold text-gray-700">현재 음성 채널이 열려 있습니다.</p>
                    <p className="text-[10px] font-medium text-team">{voiceParticipantCount}명이 접속 중입니다.</p>
                  </div>
                ) : (
                  <div className="mb-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center">
                    <div className="mb-3 flex -space-x-2 opacity-30 grayscale">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-400"><i className="fas fa-user"></i></div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-400"><i className="fas fa-user"></i></div>
                    </div>
                    <p className="mb-1 text-xs font-bold text-gray-600">현재 접속 중인 멤버가 없습니다.</p>
                    <p className="text-[10px] font-medium text-gray-400">가장 먼저 채널에 접속하여 회의를 시작해보세요.</p>
                  </div>
                )}
                <a href={voiceHref} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition ${hasVoiceSession ? 'bg-team hover:bg-indigo-700' : 'bg-gray-900 hover:bg-black'}`}>
                  <i className="fas fa-phone-alt"></i>
                  {hasVoiceSession ? '음성 채널 연결' : '채널 연결하기'}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gray-100"></div>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              <i className="fas fa-archive text-gray-400"></i>
              회의록 아카이브
            </h2>
            <div className="team-ws-meeting-filter-group flex gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {[
                ['all', '전체'],
                ['mentor', '멘토 공식'],
                ['team', '팀 회의록'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNoteFilter(key as 'all' | 'mentor' | 'team')}
                  className={`team-ws-meeting-filter-button rounded-lg px-4 py-1.5 text-[11px] font-bold transition ${
                    noteFilter === key
                      ? key === 'mentor'
                        ? 'border border-purple-200 bg-purple-100 text-purple-700 shadow-sm'
                        : key === 'team'
                          ? 'border border-indigo-200 bg-indigo-100 text-team shadow-sm'
                          : 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {data.notes.length === 0 ? (
            <div className="team-ws-meeting-note-empty col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-sm">
                <i className="fas fa-pen-nib text-2xl"></i>
              </div>
              <h3 className="mb-1 text-base font-extrabold text-gray-900">아직 등록된 팀 회의록이 없습니다.</h3>
              <p className="mb-6 text-xs font-medium text-gray-500">킥오프 미팅, 스크럼 등 팀원들과 나눈 중요한 회의 내용을 기록하고 아카이빙 해보세요.</p>
              <button type="button" onClick={() => openNoteModal()} className="team-ws-meeting-first-button flex items-center gap-1.5 rounded-xl bg-team px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700">
                <i className="fas fa-plus"></i>
                첫 번째 회의록 작성하기
              </button>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="team-ws-meeting-note-empty col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300 shadow-sm">
                <i className="fas fa-archive text-2xl"></i>
              </div>
              <h3 className="mb-1 text-sm font-bold text-gray-700">해당 분류의 회의록이 없습니다.</h3>
              <p className="text-xs text-gray-400">새로운 회의록을 작성하거나 다른 필터를 확인해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note) => {
                const noteKind = meetingNoteKind(note)

                return (
                  <button key={note.noteId} type="button" onClick={() => setSelectedNote(note)} className="team-ws-meeting-note-card hover-card flex h-full cursor-pointer flex-col rounded-2xl bg-white p-5 text-left">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      {noteKind === 'mentor' ? (
                        <span className="team-ws-meeting-note-badge flex items-center gap-1 rounded border border-purple-200 bg-mentor-light px-1.5 py-0.5 text-[9px] font-extrabold text-mentor"><i className="fas fa-check-circle"></i> 멘토 공식</span>
                      ) : (
                        <span className="team-ws-meeting-note-badge flex items-center gap-1 rounded border border-indigo-200 bg-team-light px-1.5 py-0.5 text-[9px] font-extrabold text-team"><i className="fas fa-users"></i> 팀 회의록</span>
                      )}
                      <span className="team-ws-meeting-note-date shrink-0 text-[10px] font-bold text-gray-400">{formatMeetingNoteDate(note.createdAt)}</span>
                    </div>
                    <h4 className="team-ws-meeting-note-title mb-2 line-clamp-2 text-sm font-extrabold leading-tight text-gray-900">{note.title}</h4>
                    <p className="team-ws-meeting-note-summary line-clamp-2 flex-1 whitespace-pre-line text-xs leading-relaxed text-gray-500">{meetingNoteSummary(note)}</p>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </PageFrame>

      {modalOpen ? (
        <div id="teamNoteModal" className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <button type="button" aria-label="닫기" className="absolute inset-0" onClick={() => setModalOpen(false)}></button>
          <form onSubmit={saveNote} className="modal-content team-ws-meeting-note-modal relative z-10 flex w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl">
            <div className="team-ws-meeting-note-modal-header flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <div>
                <h3 className="team-ws-meeting-note-modal-title flex items-center gap-2 text-lg font-extrabold text-gray-900">
                  <i className={`fas ${form.noteId ? 'fa-edit' : 'fa-pen-nib'} text-team`}></i>
                  {form.noteId ? '팀 회의록 수정' : '팀 회의록 작성'}
                </h3>
                <p className="team-ws-meeting-note-modal-desc mt-1 text-xs text-gray-500">회의에서 결정된 사항들을 기록해두면 훌륭한 프로젝트 산출물이 됩니다.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="team-ws-meeting-note-modal-close flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="team-ws-meeting-note-modal-body space-y-4 p-6">
              <div>
                <label className="team-ws-meeting-note-modal-label mb-2 block text-xs font-bold text-gray-800">회의 주제 및 제목</label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="예: 프론트엔드/백엔드 API 연동 모의 회의" className="team-ws-meeting-note-modal-input w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-team focus:ring-1 focus:ring-team" />
              </div>
              <div>
                <label className="team-ws-meeting-note-modal-label mb-2 block text-xs font-bold text-gray-800">회의록 내용 (마크다운 지원)</label>
                <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="결정된 사항, 문제점, 향후 계획 등을 자유롭게 작성해주세요." className="team-ws-meeting-note-modal-textarea custom-scrollbar h-48 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm font-medium outline-none transition focus:border-team focus:ring-1 focus:ring-team"></textarea>
              </div>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{error}</p> : null}
            </div>

            <div className="team-ws-meeting-note-modal-footer flex shrink-0 gap-3 border-t border-gray-100 bg-white p-4">
              <button type="button" onClick={() => setModalOpen(false)} className="team-ws-meeting-note-cancel flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-200">취소</button>
              <button type="submit" disabled={submitting} className="team-ws-meeting-note-save flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
                <i className="fas fa-check"></i>
                {form.noteId ? '수정 완료' : '작성 완료'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {selectedNote ? (() => {
        const noteKind = meetingNoteKind(selectedNote)

        return (
          <div id="noteDetailModal" className="modal-overlay active fixed inset-0 z-[1060] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <button type="button" aria-label="닫기" className="absolute inset-0" onClick={() => setSelectedNote(null)}></button>
            <div className="modal-content team-ws-meeting-note-detail-modal relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="team-ws-meeting-note-detail-header flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
                <div className="min-w-0 pr-8">
                  {noteKind === 'mentor' ? (
                    <span className="team-ws-meeting-detail-badge mb-2 inline-flex items-center gap-1 rounded border border-purple-200 bg-mentor-light px-2 py-0.5 text-[10px] font-extrabold text-mentor"><i className="fas fa-check-circle"></i> 멘토 공식</span>
                  ) : (
                    <span className="team-ws-meeting-detail-badge mb-2 inline-flex items-center gap-1 rounded border border-indigo-200 bg-team-light px-2 py-0.5 text-[10px] font-extrabold text-team"><i className="fas fa-users"></i> 팀 회의록</span>
                  )}
                  <h3 className="team-ws-meeting-note-detail-title text-xl font-extrabold leading-tight text-gray-900">{selectedNote.title}</h3>
                  <p className="team-ws-meeting-note-detail-date mt-2 text-xs font-bold text-gray-400">{formatMeetingNoteDate(selectedNote.createdAt)}</p>
                </div>
                <button type="button" onClick={() => setSelectedNote(null)} className="team-ws-meeting-note-detail-close flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="team-ws-meeting-note-detail-body custom-scrollbar flex-1 overflow-y-auto p-6">
                <div className="team-ws-meeting-note-detail-content whitespace-pre-line text-sm font-medium leading-relaxed text-gray-700">
                  {selectedNote.content || '회의록 내용이 없습니다.'}
                </div>
              </div>

              <div className="team-ws-meeting-note-detail-footer flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 p-4">
                {noteKind === 'team' ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void deleteNote(selectedNote.noteId)} className="team-ws-meeting-note-detail-action flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-50">
                      <i className="fas fa-trash-alt"></i>
                      삭제
                    </button>
                    <button type="button" onClick={() => openNoteModal(selectedNote)} className="team-ws-meeting-note-detail-action flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
                      <i className="fas fa-edit"></i>
                      수정
                    </button>
                  </div>
                ) : <div></div>}
                <button type="button" onClick={() => setSelectedNote(null)} className="team-ws-meeting-note-detail-close-action rounded-xl bg-gray-900 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-black">닫기</button>
              </div>
            </div>
          </div>
        )
      })() : null}
    </>
  )
}

function RealtimePage({
  page,
  data,
  workspaceId,
}: {
  page: 'live-meeting' | 'voice-channel'
  data: SuiteData
  workspaceId: number
}) {
  const localCameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareStageRef = useRef<HTMLDivElement | null>(null)
  const localMediaStreamRef = useRef<MediaStream | null>(null)
  const screenShareStreamRef = useRef<MediaStream | null>(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(true)
  const [deafened, setDeafened] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [screenShareFullscreen, setScreenShareFullscreen] = useState(false)
  const [screenShareZoom, setScreenShareZoom] = useState(1)
  const [screenShareTransformOrigin, setScreenShareTransformOrigin] = useState('50% 50%')
  const [cameraStreamActive, setCameraStreamActive] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [connectionSeconds, setConnectionSeconds] = useState(0)
  const [networkPing, setNetworkPing] = useState<number | null>(null)
  const [pingState, setPingState] = useState<'measuring' | 'connected' | 'unstable'>('measuring')
  const [speaking, setSpeaking] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{ id: number; text: string; createdAt: Date }>>([])
  const members = useMemo(() => data.dashboard?.members ?? [], [data.dashboard?.members])
  const isLive = page === 'live-meeting'
  const liveMeetingEvent = data.events.filter((event) => isOfficialLiveEvent(event)).sort((left, right) => (parseDate(left.startAt)?.getTime() ?? 0) - (parseDate(right.startAt)?.getTime() ?? 0))[0] ?? null
  const voiceChannel = data.voiceChannels[0] ?? null
  const voiceParticipantCount = voiceChannel?.activeParticipantCount ?? 0
  const hasLiveMeeting = Boolean(liveMeetingEvent)
  const hasVoiceSession = voiceParticipantCount > 0
  const title = isLive ? liveMeetingEvent?.title || '라이브 밋업' : voiceChannel?.name || '음성 채널 채팅'
  const session = readStoredAuthSession()
  const currentMember = members.find((member) => member.learnerId === session?.userId) ?? members[0] ?? null
  const orderedMembers = useMemo(() => {
    if (!currentMember) return members

    return [currentMember, ...members.filter((member) => member.memberId !== currentMember.memberId)]
  }, [currentMember, members])
  const visibleVoiceCount = Math.max(1, Math.min(orderedMembers.length || 1, voiceParticipantCount || (hasVoiceSession ? orderedMembers.length : 1)))
  const voiceMembers = orderedMembers.slice(0, visibleVoiceCount)
  const currentMemberPosition = currentMember ? memberAssignedPosition(currentMember, data.tasks) ?? fallbackMemberPosition(0) : 'FE'
  const pingToneClass = pingState === 'connected'
    ? networkPing !== null && networkPing > 300
      ? 'text-red-400'
      : networkPing !== null && networkPing > 150
        ? 'text-yellow-400'
        : 'text-green-500'
    : pingState === 'measuring'
      ? 'text-yellow-400'
      : 'text-red-400'
  const pingLabel = pingState === 'connected' && networkPing !== null ? `${networkPing}ms` : '측정 중'
  const pingStatusLabel = pingState === 'unstable' ? '연결 불안정' : pingState === 'measuring' ? '측정 중' : '음성 연결됨'

  useEffect(() => {
    if (isLive) return undefined

    const timer = window.setInterval(() => {
      setConnectionSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    let alive = true

    const updatePing = async () => {
      try {
        const nextPing = await measureBrowserPing()
        if (!alive) return
        setNetworkPing(nextPing)
        setPingState('connected')
      } catch {
        if (!alive) return
        setNetworkPing(null)
        setPingState('unstable')
      }
    }

    void updatePing()
    const timer = window.setInterval(() => {
      void updatePing()
    }, 5000)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    return () => {
      stopMediaStream(localMediaStreamRef.current)
      localMediaStreamRef.current = null
      stopMediaStream(screenShareStreamRef.current)
      screenShareStreamRef.current = null
    }
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    let cancelled = false

    const enableDefaultMicrophone = async () => {
      await Promise.resolve()
      if (cancelled) return

      if (liveMediaTracks(localMediaStreamRef.current, 'audio').length > 0) {
        setMediaTrackEnabled(localMediaStreamRef.current, 'audio', true)
        setMuted(false)
        setDeafened(false)
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMuted(true)
        setMediaError('이 브라우저는 마이크 장치를 지원하지 않습니다.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stopMediaStream(stream)
          return
        }

        const targetStream = localMediaStreamRef.current ?? new MediaStream()
        localMediaStreamRef.current = targetStream
        targetStream.getAudioTracks().forEach((track) => {
          targetStream.removeTrack(track)
          track.stop()
        })
        stream.getTracks().forEach((track) => {
          if (track.kind === 'audio') {
            track.enabled = true
            targetStream.addTrack(track)
            track.addEventListener('ended', () => {
              setMuted(true)
              setSpeaking(false)
            })
            return
          }

          track.stop()
        })

        setMuted(false)
        setDeafened(false)
        setMediaError(null)
      } catch {
        if (cancelled) return
        setMuted(true)
        setSpeaking(false)
        setMediaError('마이크 권한을 허용해야 음성 채널에서 말할 수 있습니다.')
      }
    }

    void enableDefaultMicrophone()

    return () => {
      cancelled = true
    }
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    const video = localCameraVideoRef.current
    if (!video) return undefined

    const stream = !cameraOff && cameraStreamActive ? localMediaStreamRef.current : null
    video.srcObject = stream
    if (stream) void video.play().catch(() => undefined)

    return () => {
      video.srcObject = null
    }
  }, [cameraOff, cameraStreamActive, isLive])

  useEffect(() => {
    if (isLive) return undefined

    const video = screenShareVideoRef.current
    if (!video) return undefined

    const stream = screenSharing ? screenShareStreamRef.current : null
    video.srcObject = stream
    if (stream) void video.play().catch(() => undefined)

    return () => {
      video.srcObject = null
    }
  }, [isLive, screenSharing])

  useEffect(() => {
    if (isLive) return undefined

    const syncFullscreenState = () => {
      setScreenShareFullscreen(document.fullscreenElement === screenShareStageRef.current)
    }

    document.addEventListener('fullscreenchange', syncFullscreenState)

    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    const toggleSpeaking = (event: KeyboardEvent) => {
      const hasEnabledAudio = liveMediaTracks(localMediaStreamRef.current, 'audio').some((track) => track.enabled)
      if (event.key.toLowerCase() === 'p' && hasEnabledAudio && !muted && !deafened) {
        setSpeaking((current) => !current)
      }
    }

    window.addEventListener('keydown', toggleSpeaking)

    return () => window.removeEventListener('keydown', toggleSpeaking)
  }, [deafened, isLive, muted])

  function sendMessage(event: FormEvent) {
    event.preventDefault()
    if (!message.trim()) return

    setMessages((current) => [...current, { id: Date.now(), text: message.trim(), createdAt: new Date() }])
    setMessage('')
  }

  function installLocalTracks(stream: MediaStream, kind: 'audio' | 'video') {
    const targetStream = localMediaStreamRef.current ?? new MediaStream()
    localMediaStreamRef.current = targetStream

    targetStream
      .getTracks()
      .filter((track) => track.kind === kind)
      .forEach((track) => {
        targetStream.removeTrack(track)
        track.stop()
      })

    stream.getTracks().forEach((track) => {
      if (track.kind === kind) {
        targetStream.addTrack(track)
        return
      }

      track.stop()
    })
  }

  async function ensureAudioTrack() {
    if (liveMediaTracks(localMediaStreamRef.current, 'audio').length > 0) return true

    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('이 브라우저는 마이크 장치를 지원하지 않습니다.')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      installLocalTracks(stream, 'audio')
      liveMediaTracks(localMediaStreamRef.current, 'audio').forEach((track) => {
        track.addEventListener('ended', () => {
          setMuted(true)
          setSpeaking(false)
        })
      })
      setMediaError(null)
      return true
    } catch {
      setMuted(true)
      setSpeaking(false)
      setMediaError('마이크 권한을 허용해야 음성 채널에서 말할 수 있습니다.')
      return false
    }
  }

  async function toggleMic() {
    if (muted || deafened) {
      const hasAudioTrack = await ensureAudioTrack()
      if (!hasAudioTrack) return

      setMediaTrackEnabled(localMediaStreamRef.current, 'audio', true)
      setDeafened(false)
      setMuted(false)
      return
    }

    setMediaTrackEnabled(localMediaStreamRef.current, 'audio', false)
    setMuted(true)
    setSpeaking(false)
  }

  async function toggleCamera() {
    if (!cameraOff && cameraStreamActive) {
      liveMediaTracks(localMediaStreamRef.current, 'video').forEach((track) => {
        localMediaStreamRef.current?.removeTrack(track)
        track.stop()
      })
      setCameraOff(true)
      setCameraStreamActive(false)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraOff(true)
      setCameraStreamActive(false)
      setMediaError('이 브라우저는 카메라 장치를 지원하지 않습니다.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      installLocalTracks(stream, 'video')
      liveMediaTracks(localMediaStreamRef.current, 'video').forEach((track) => {
        track.addEventListener('ended', () => {
          setCameraOff(true)
          setCameraStreamActive(false)
        })
      })
      setCameraOff(false)
      setCameraStreamActive(true)
      setMediaError(null)
    } catch {
      setCameraOff(true)
      setCameraStreamActive(false)
      setMediaError('카메라 권한을 허용해야 내 캠 화면을 표시할 수 있습니다.')
    }
  }

  function toggleDeafen() {
    if (!deafened) {
      setMediaTrackEnabled(localMediaStreamRef.current, 'audio', false)
      setDeafened(true)
      setMuted(true)
      setSpeaking(false)
      return
    }

    setDeafened(false)
  }

  function handleScreenShareWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()

    const bounds = event.currentTarget.getBoundingClientRect()
    const originX = clampNumber(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100)
    const originY = clampNumber(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100)
    const zoomDelta = event.deltaY < 0 ? 0.18 : -0.18

    setScreenShareTransformOrigin(`${originX.toFixed(1)}% ${originY.toFixed(1)}%`)
    setScreenShareZoom((current) => Number(clampNumber(current + zoomDelta, 1, 4).toFixed(2)))
  }

  function resetScreenShareZoom() {
    setScreenShareZoom(1)
    setScreenShareTransformOrigin('50% 50%')
  }

  async function toggleScreenShareFullscreen() {
    const stage = screenShareStageRef.current
    if (!stage) return

    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen()
        return
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }

      await stage.requestFullscreen()
      setMediaError(null)
    } catch {
      setMediaError('브라우저가 화면 공유 전체화면 전환을 차단했습니다.')
    }
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      stopMediaStream(screenShareStreamRef.current)
      screenShareStreamRef.current = null
      resetScreenShareZoom()
      if (document.fullscreenElement === screenShareStageRef.current) {
        void document.exitFullscreen().catch(() => undefined)
      }
      setScreenSharing(false)
      return
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError('이 브라우저는 화면 공유를 지원하지 않습니다.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      screenShareStreamRef.current = stream
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          stopMediaStream(screenShareStreamRef.current)
          screenShareStreamRef.current = null
          resetScreenShareZoom()
          if (document.fullscreenElement === screenShareStageRef.current) {
            void document.exitFullscreen().catch(() => undefined)
          }
          setScreenSharing(false)
        })
      })
      resetScreenShareZoom()
      setScreenSharing(true)
      setMediaError(null)
    } catch {
      resetScreenShareZoom()
      setScreenSharing(false)
      setMediaError('화면 공유 권한을 허용해야 내 화면을 공유할 수 있습니다.')
    }
  }

  function leaveVoiceChannel() {
    if (window.confirm('음성 채널 연결을 끊으시겠습니까?')) {
      window.location.assign(navHref('/team-ws-meeting', workspaceId))
    }
  }

  if (!isLive) {
    const renderedVoiceMembers = voiceMembers.length > 0 ? voiceMembers : [null]

    return (
      <div className="team-ws-dashboard-page team-ws-realtime-page flex h-screen flex-col overflow-hidden bg-[#0B0F19] text-white">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-[#111827] px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button type="button" onClick={leaveVoiceChannel} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white" title="회의장으로 돌아가기">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                <span className={`flex items-center gap-1 text-[10px] font-extrabold ${pingToneClass}`}>
                  <i className="fas fa-signal"></i>
                  Ping: {pingLabel} ({pingStatusLabel})
                </span>
                <span className="rounded border border-indigo-500/30 bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-400">상시 회의장</span>
              </div>
              <h1 className="flex items-center gap-2 truncate text-sm font-bold text-white">
                <i className="fas fa-volume-up text-team"></i>
                {voiceChannel?.name || '우리 팀 보이스 챗'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 font-mono text-xs text-green-400">
              <i className="far fa-clock"></i>
              <span>{formatConnectionTime(connectionSeconds)}</span>
            </div>
            <button type="button" onClick={() => setChatOpen((current) => !current)} className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${chatOpen ? 'bg-team text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`} title={chatOpen ? '채팅 닫기' : '채팅 열기'}>
              <i className="fas fa-comment-alt"></i>
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <main className="custom-scrollbar relative flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
              <div className="h-96 w-96 rounded-full bg-team blur-[100px]"></div>
            </div>

            {mediaError ? (
              <div className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-500/30 bg-red-500/15 px-4 py-2 text-xs font-bold text-red-200 shadow-lg backdrop-blur">
                <i className="fas fa-triangle-exclamation"></i>
                {mediaError}
              </div>
            ) : null}

            {screenSharing ? (
              <div ref={screenShareStageRef} onWheel={handleScreenShareWheel} className="team-ws-screen-share-stage relative z-10 mb-8 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-700 bg-black shadow-2xl">
                <video
                  ref={screenShareVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-contain opacity-95 transition-transform duration-150 ease-out"
                  style={{ transform: `scale(${screenShareZoom})`, transformOrigin: screenShareTransformOrigin }}
                />
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                  <i className="fas fa-desktop text-team"></i>
                  내 화면 공유 중
                </div>
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <span className="rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">{Math.round(screenShareZoom * 100)}%</span>
                  {screenShareZoom > 1 ? (
                    <button type="button" onClick={() => { setScreenShareZoom(1); setScreenShareTransformOrigin('50% 50%') }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-white transition hover:bg-white/20" title="확대 초기화">
                      <i className="fas fa-rotate-left text-xs"></i>
                    </button>
                  ) : null}
                  <button type="button" onClick={() => { void toggleScreenShareFullscreen() }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-white transition hover:bg-white/20" title={screenShareFullscreen ? '전체화면 종료' : '전체화면으로 보기'}>
                    <i className={`fas ${screenShareFullscreen ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
                  </button>
                </div>
              </div>
            ) : null}

            <div className={`z-10 flex flex-wrap justify-center transition-all duration-500 ${screenSharing ? '-mt-8 scale-75 gap-6' : 'gap-12'}`}>
              {renderedVoiceMembers.map((member, index) => {
                const isCurrentMember = !member || member.learnerId === currentMember?.learnerId
                const displayName = member?.learnerName?.trim() || (isCurrentMember ? '나' : `팀원 ${index + 1}`)
                const position = member ? memberAssignedPosition(member, data.tasks) ?? fallbackMemberPosition(index) : currentMemberPosition
                const remoteMuted = !isCurrentMember && index >= 2
                const memberMuted = isCurrentMember ? muted : remoteMuted
                const memberSpeaking = isCurrentMember ? speaking && !muted && !deafened : index === 1 && hasVoiceSession && !remoteMuted
                const showLocalCameraPreview = isCurrentMember && !cameraOff && cameraStreamActive
                const badgeClassName = memberMuted
                  ? 'bg-red-500 text-white'
                  : memberSpeaking
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400'

                return (
                  <div key={member?.memberId ?? 'current-user'} className={`avatar-float flex flex-col items-center gap-3 ${memberSpeaking ? 'is-speaking' : ''} ${memberMuted ? 'opacity-50' : ''}`} style={{ animationDelay: `${index}s` }}>
                    <div className="relative">
                      {showLocalCameraPreview ? (
                        <video ref={localCameraVideoRef} autoPlay muted playsInline className="team-ws-voice-avatar h-24 w-24 rounded-full border-4 border-gray-700 bg-gray-950 object-cover shadow-lg transition-all duration-300" />
                      ) : (
                        <UserAvatar name={displayName} imageUrl={member?.profileImage} className="team-ws-voice-avatar h-24 w-24 border-4 border-gray-700 bg-gray-800 shadow-lg transition-all duration-300" iconClassName="text-3xl" />
                      )}
                      <div className={`absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0F19] ${badgeClassName}`}>
                        <i className={`fas ${memberMuted ? 'fa-microphone-slash text-xs' : 'fa-microphone'}`}></i>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className={`flex items-center justify-center gap-1 text-sm font-bold ${memberMuted ? 'text-gray-400' : 'text-white'}`}>
                        {displayName}
                        <span className={`rounded px-1 py-0.5 text-[9px] ${memberPositionBadgeClass(position)}`}>{position}</span>
                      </p>
                    </div>
                  </div>
                )
              })}

              {voiceMembers.length <= 1 ? (
                <div className="flex animate-pulse flex-col items-center gap-3">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-gray-800 text-gray-600">
                    <i className="fas fa-user-plus text-xl"></i>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-500">팀원 대기 중...</p>
                  </div>
                </div>
              ) : null}
            </div>
          </main>

          <aside className={`team-ws-voice-chat-sidebar flex h-full shrink-0 flex-col overflow-hidden bg-[#111827] transition-all duration-300 ${chatOpen ? 'w-80 border-l border-gray-800 opacity-100' : 'w-0 border-none opacity-0'}`}>
            <div className="shrink-0 border-b border-gray-800 bg-gray-900/50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white"><i className="fas fa-hashtag text-gray-500"></i> 음성 채널 채팅</h3>
              <p className="mt-1 text-[10px] text-gray-400">링크나 코드를 공유할 때 사용하세요.</p>
            </div>

            <div className={`custom-scrollbar flex-1 overflow-y-auto p-4 ${messages.length === 0 ? 'flex flex-col items-center justify-center' : 'space-y-4'}`}>
              {messages.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-800 bg-gray-800/50 text-gray-400">
                    <i className="fas fa-comment-alt-slash text-base"></i>
                  </div>
                  <p className="text-xs font-semibold text-gray-300">음성 채널 채팅에 오신 것을 환영합니다.</p>
                  <p className="mx-auto mt-1 max-w-[190px] text-[11px] leading-normal text-gray-500">아직 주고받은 메시지가 없습니다. 팀원들과 대화를 시작해보세요.</p>
                </div>
              ) : (
                messages.map((item) => (
                  <div key={item.id} className="flex w-full flex-row-reverse items-start gap-3">
                    <UserAvatar name={currentMember?.learnerName || '나'} imageUrl={currentMember?.profileImage} className="h-8 w-8 border border-gray-700 bg-gray-800" iconClassName="text-xs" />
                    <div className="flex min-w-0 flex-col items-end">
                      <div className="mb-0.5 flex flex-row-reverse items-center gap-2">
                        <span className="text-xs font-bold text-white">{currentMember?.learnerName || '나'}</span>
                        <span className={`rounded px-1 py-0.5 text-[9px] ${memberPositionBadgeClass(currentMemberPosition)}`}>{currentMemberPosition}</span>
                        <span className="text-[9px] text-gray-500">{formatVoiceChatTime(item.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-line break-all rounded-b-xl rounded-tl-xl border border-indigo-500 bg-team p-2.5 text-right text-xs leading-relaxed text-white shadow-md">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendMessage} className="shrink-0 border-t border-gray-800 bg-gray-900 p-4">
              <div className="flex gap-2 rounded-xl border border-gray-700 bg-gray-800 p-2 transition focus-within:border-team">
                <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="메시지 보내기..." className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-gray-500" />
                <button type="submit" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-team text-white transition hover:bg-indigo-500">
                  <i className="fas fa-paper-plane text-xs"></i>
                </button>
              </div>
            </form>
          </aside>
        </div>

        <footer className="relative z-30 flex h-20 shrink-0 items-center justify-center border-t border-gray-800 bg-[#111827] px-6 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 md:gap-5">
            <button type="button" onClick={() => { void toggleMic() }} className={`team-ws-voice-control-button group relative flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-md transition ${muted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
              <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{muted ? '마이크 켜기' : '마이크 끄기'}</span>
            </button>

            <button type="button" onClick={() => { void toggleCamera() }} className={`team-ws-voice-control-button group relative flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-md transition ${cameraOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
              <i className={`fas ${cameraOff ? 'fa-video-slash' : 'fa-video'}`}></i>
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{cameraOff ? '캠 켜기' : '캠 끄기'}</span>
            </button>

            <button type="button" onClick={toggleDeafen} className={`team-ws-voice-control-button group relative flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-md transition ${deafened ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
              <i className={`fas ${deafened ? 'fa-deaf' : 'fa-headphones'}`}></i>
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{deafened ? '헤드셋 켜기' : '헤드셋 소리 끄기'}</span>
            </button>

            <button type="button" onClick={() => { void toggleScreenShare() }} className={`team-ws-voice-control-button group relative flex h-12 w-12 items-center justify-center rounded-full text-lg transition ${screenSharing ? 'bg-team text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:bg-indigo-500' : 'bg-gray-700 text-white shadow-md hover:bg-gray-600'}`}>
              <i className="fas fa-desktop"></i>
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{screenSharing ? '공유 중지하기' : '화면 공유하기'}</span>
            </button>

            <div className="mx-2 h-8 w-px bg-gray-700"></div>

            <button type="button" onClick={leaveVoiceChannel} className="flex h-12 w-14 items-center justify-center rounded-2xl bg-red-600 text-xl text-white shadow-lg shadow-red-900/50 transition hover:bg-red-700" title="채널 나가기">
              <i className="fas fa-phone-slash"></i>
            </button>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="team-ws-dashboard-page team-ws-realtime-page flex h-screen overflow-hidden bg-[#0F172A] text-white">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 bg-[#111827] px-6">
          <div className="flex min-w-0 items-center gap-3">
            <a href={navHref('/team-ws-meeting', workspaceId)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gray-300 hover:bg-white/20">
              <i className="fas fa-arrow-left"></i>
            </a>
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-black">{title}</h1>
              <p className={`text-[11px] font-bold ${isLive ? (hasLiveMeeting ? 'text-emerald-400' : 'text-gray-400') : hasVoiceSession ? 'text-emerald-400' : 'text-gray-400'}`}>
                {isLive ? (hasLiveMeeting ? 'LIVE 대기실' : '밋업 대기 중') : hasVoiceSession ? `${voiceParticipantCount}명 접속 중` : '음성 연결 대기 중'}
              </p>
            </div>
          </div>
          <a href={navHref('/team-ws-meeting', workspaceId)} className="h-10 rounded-xl bg-red-500 px-4 text-[13px] font-black leading-10 text-white hover:bg-red-600">
            {isLive ? '밋업 나가기' : '채널 나가기'}
          </a>
        </header>

        <section className="flex min-h-0 flex-1 overflow-hidden">
          {isLive ? (
            <main className="relative flex flex-1 flex-col gap-4 p-4">
              {hasLiveMeeting ? (
                <div className="video-container group relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-lg">
                  <img src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" alt="Mentor Screen Share" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-md">
                      <i className="fas fa-desktop text-mentor"></i>
                      {liveMeetingEvent?.title}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-lg">
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="h-96 w-96 rounded-full bg-team blur-[100px]"></div>
                  </div>
                  <div className="relative z-10 mb-6 flex h-24 w-24 animate-pulse items-center justify-center rounded-full border-2 border-dashed border-indigo-500/50 bg-gray-900/50 text-indigo-400">
                    <i className="fas fa-video text-3xl"></i>
                  </div>
                  <h2 className="relative z-10 mb-2 text-xl font-bold text-white">밋업 시작 대기 중</h2>
                  <p className="relative z-10 max-w-sm text-center text-sm leading-relaxed text-gray-400">등록된 공식 라이브 밋업 일정이 없습니다.<br />일정 페이지에서 멘토 밋업 일정을 등록하면 이곳에 표시됩니다.</p>
                </div>
              )}

              <div className="grid h-40 shrink-0 grid-cols-5 gap-3">
                {(hasLiveMeeting ? members.slice(0, 5) : []).map((member, index) => (
                  <div key={member.memberId} className={`group relative overflow-hidden rounded-2xl bg-gray-800 ${index === 0 ? 'border-2 border-team shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'border border-gray-700'}`}>
                    <UserAvatar name={member.learnerName || (index === 0 ? '나' : `팀원 ${index + 1}`)} imageUrl={member.profileImage} className="absolute inset-0 h-full w-full rounded-none border-0 bg-gray-700 object-cover" iconClassName="text-4xl" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
                      <i className={`fas ${index === 0 ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-500'}`}></i>
                      {member.learnerName || (index === 0 ? '나 (FE)' : `팀원 ${index + 1}`)}
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 5 - (hasLiveMeeting ? members.slice(0, 5).length : 0)) }, (_, index) => (
                  <div key={`waiting-${index}`} className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-700 bg-gray-800/30">
                    <i className="fas fa-user-plus mb-2 text-xl text-gray-600 transition group-hover:text-gray-500"></i>
                    <span className="text-[10px] font-medium text-gray-500 transition group-hover:text-gray-400">대기 중</span>
                  </div>
                ))}
              </div>
            </main>
          ) : (
            <main className="custom-scrollbar relative flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
                <div className="h-96 w-96 rounded-full bg-team blur-[100px]"></div>
              </div>
              <div className="z-10 flex flex-col items-center gap-4 transition-all duration-500">
                <div className={`avatar-float flex h-28 w-28 items-center justify-center rounded-full border-4 shadow-lg ${hasVoiceSession ? 'is-speaking border-green-400 bg-gray-800 text-green-400' : 'border-dashed border-gray-800 bg-gray-900 text-gray-600'}`}>
                  <i className={`fas ${hasVoiceSession ? 'fa-headset' : 'fa-user-plus'} text-3xl`}></i>
                </div>
                <p className="text-sm font-bold text-white">{hasVoiceSession ? `${voiceParticipantCount}명 접속 중` : '팀원 대기 중...'}</p>
                <p className="max-w-sm text-center text-xs leading-relaxed text-gray-500">
                  {hasVoiceSession ? `${voiceChannel?.name || '음성 채널'}에서 실시간 회의가 진행 중입니다.` : '실제 음성 채널 참가자가 생기면 접속 상태가 표시됩니다.'}
                </p>
              </div>
            </main>
          )}
        </section>

        <footer className="flex h-[84px] shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-[#111827]">
          <button type="button" onClick={() => setMuted((current) => !current)} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${muted ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/20'}`}>
            <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          <button type="button" onClick={() => setCameraOff((current) => !current)} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${cameraOff ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/20'}`}>
            <i className={`fas ${cameraOff ? 'fa-video-slash' : 'fa-video'}`}></i>
          </button>
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg text-gray-200 hover:bg-white/20">
            <i className="fas fa-desktop"></i>
          </button>
          {isLive ? (
            <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg text-gray-200 hover:bg-white/20">
              <i className="fas fa-hand"></i>
            </button>
          ) : null}
        </footer>
      </main>

      <aside className="hidden w-[360px] shrink-0 flex-col border-l border-white/10 bg-[#111827] lg:flex">
        <div className="flex h-[68px] items-center border-b border-white/10 px-5">
          <h2 className="text-[15px] font-black">{isLive ? '실시간 채팅' : '음성 채널 채팅'}</h2>
          <span className="ml-auto rounded-lg bg-white/10 px-2 py-1 text-[11px] font-black text-gray-300">참여자 {members.length}</span>
        </div>
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="mt-20 text-center">
              <i className="far fa-comments mb-3 text-4xl text-gray-600"></i>
              <p className="text-[13px] font-bold text-gray-400">아직 주고받은 메시지가 없습니다. 팀원들과 대화를 시작해보세요.</p>
            </div>
          ) : (
            messages.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/10 p-3">
                <p className="mb-1 text-[11px] font-black text-team">나</p>
                <p className="text-[13px] font-medium leading-5 text-gray-100">{item.text}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendMessage} className="flex h-[76px] items-center gap-2 border-t border-white/10 p-4">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="메시지 입력..." className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-[13px] font-semibold text-white outline-none placeholder:text-gray-500 focus:border-team" />
          <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-xl bg-team text-white">
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </aside>
    </div>
  )
}

async function loadSuiteData(workspaceId: number, signal: AbortSignal): Promise<SuiteData> {
  const [dashboard, tasks, files, storage, questions, events, apiSpec, erdDoc, infraDoc, notes, activities, voiceChannels] = await Promise.all([
    projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, { signal }, 'required'),
    projectApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, { signal }, 'required').catch(() => []),
    projectApiRequest<WorkspaceFile[]>(`/api/workspaces/${workspaceId}/files`, { signal }, 'required').catch(() => []),
    projectApiRequest<WorkspaceFileStorage>(`/api/workspaces/${workspaceId}/files/storage`, { signal }, 'required').catch(() => null),
    projectApiRequest<QuestionSummary[]>(`/api/workspaces/${workspaceId}/questions`, { signal }, 'required').catch(() => []),
    projectApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, { signal }, 'required').catch(() => []),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/api-spec`, { signal }, 'required').catch(() => null),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/docs/erd`, { signal }, 'required').catch(() => null),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/docs/infra`, { signal }, 'required').catch(() => null),
    projectApiRequest<MeetingNote[]>(`/api/workspaces/${workspaceId}/meeting-notes`, { signal }, 'required').catch(() => []),
    projectApiRequest<ActivityLog[]>(`/api/workspaces/${workspaceId}/activities/recent`, { signal }, 'required').catch(() => []),
    projectApiRequest<VoiceChannelSummary[]>(`/api/workspaces/${workspaceId}/voice-channels`, { signal }, 'required').catch(() => []),
  ])

  return {
    dashboard,
    tasks: tasks ?? [],
    files: files ?? [],
    storage,
    questions: questions ?? [],
    events: events ?? [],
    apiSpec,
    erdDoc,
    infraDoc,
    notes: notes ?? [],
    activities: activities ?? [],
    voiceChannels: voiceChannels ?? [],
  }
}

export default function TeamWorkspaceSuiteApp({ page }: { page?: TeamWorkspacePage }) {
  const activePage = page ?? 'kanban'
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [data, setData] = useState<SuiteData>(DEFAULT_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousTitle = document.title

    html.classList.add('team-ws-dashboard-document')
    body.classList.add('team-ws-dashboard-body')
    document.title = `DevPath - ${PAGE_META[activePage].title}`

    return () => {
      html.classList.remove('team-ws-dashboard-document')
      body.classList.remove('team-ws-dashboard-body')
      document.title = previousTitle
    }
  }, [activePage])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())

    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
  }, [])

  const reload = useMemo(() => {
    return async () => {
      if (!workspaceId) return

      const nextData = await loadSuiteData(workspaceId, new AbortController().signal)
      setData(nextData)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!session || !workspaceId) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const currentWorkspaceId = workspaceId

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const nextData = await loadSuiteData(currentWorkspaceId, controller.signal)
        if (controller.signal.aborted) return
        setData(nextData)
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setError(nextError instanceof Error ? nextError.message : '팀 워크스페이스 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [session, workspaceId])

  if (!session) {
    return <LoginRequiredView message="팀 워크스페이스는 로그인한 사용자만 접근할 수 있습니다." />
  }

  if (!workspaceId) {
    return <ErrorState message="workspaceId가 없습니다. 워크스페이스 허브에서 다시 진입해주세요." />
  }

  if (loading) {
    return <LoadingView />
  }

  if (error && !data.dashboard) {
    return <ErrorState message={error} />
  }

  if (activePage === 'kanban') return <KanbanPage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'files') return <FilesPage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'qna') return <QnaPage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'schedule') return <SchedulePage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'architecture') return <ArchitecturePage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'meeting') return <MeetingPage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'live-meeting') return <RealtimePage page="live-meeting" data={data} workspaceId={workspaceId} />

  return <RealtimePage page="voice-channel" data={data} workspaceId={workspaceId} />
}
