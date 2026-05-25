import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import {
  clearStoredAuthSession,
  getPostLoginRedirect,
  readStoredAuthSession,
} from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { projectApiRequest } from './project-api'

export type MentoringCommonPage =
  | 'dashboard'
  | 'workspace'
  | 'curriculum'
  | 'qna'
  | 'schedule'
  | 'files'
  | 'meeting'
  | 'live-meeting'
  | 'erd'

type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type QnaStatus = 'OPEN' | 'ANSWERED' | 'CLOSED'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  joinedAt?: string | null
  lastActiveAt?: string | null
  online?: boolean
}

type WorkspaceDashboard = {
  workspaceId: number
  name: string
  description?: string | null
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  ownerName?: string | null
  ownerProfileImage?: string | null
  ownerBio?: string | null
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

type QuestionSummary = {
  id: number
  authorId: number
  authorName?: string | null
  title: string
  qnaStatus?: QnaStatus | null
  answerCount: number
  viewCount: number
  createdAt?: string | null
  templateType?: string | null
  difficulty?: string | null
}

type Answer = {
  id: number
  authorId: number
  authorName?: string | null
  content: string
  createdAt?: string | null
}

type QuestionDetail = QuestionSummary & {
  content: string
  answers: Answer[]
}

type WorkspaceFile = {
  fileId: number
  workspaceId: number
  parentId?: number | null
  itemType: 'FILE' | 'FOLDER' | 'LINK'
  originalFileName?: string | null
  displayName?: string | null
  fileSize: number
  contentType?: string | null
  objectKey?: string | null
  uploadedById?: number | null
  uploadedByName?: string | null
  uploaderProfileImage?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type WorkspaceErdDocument = {
  workspaceId: number
  projectName?: string | null
  mermaidCode?: string | null
  schemaJson?: string | null
  version?: number | null
  updatedById?: number | null
  updatedByName?: string | null
  updatedAt?: string | null
  members?: WorkspaceMember[] | null
}

type WorkspaceErdVersion = {
  versionId: number
  workspaceId: number
  version: number
  mermaidCode?: string | null
  schemaJson?: string | null
  summary?: string | null
  updatedById?: number | null
  updatedByName?: string | null
  createdAt?: string | null
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

type VoiceChannel = {
  channelId: number
  workspaceId: number
  creatorId?: number | null
  creatorName?: string | null
  name: string
  description?: string | null
  activeParticipantCount?: number | null
  currentSessionStartedAt?: string | null
  createdAt?: string | null
}

type VoiceParticipant = {
  participantId: number
  channelId: number
  userId: number
  userName?: string | null
  active?: boolean | null
  muted?: boolean | null
  handRaised?: boolean | null
  speaking?: boolean | null
  joinedAt?: string | null
}

type VoiceChatMessage = {
  messageId: number
  channelId: number
  senderId: number
  senderName?: string | null
  content: string
  createdAt?: string | null
}

type VoiceMinutes = {
  channelId: number
  recording?: boolean | null
  transcript?: string | null
  summary?: string | null
  updatedByUserId?: number | null
  updatedByUserName?: string | null
  updatedAt?: string | null
}

type WorkspaceNotice = {
  id: number
  workspaceId: number
  title: string
  content: string
  createdAt?: string | null
  updatedAt?: string | null
}

type MentoringWorkspaceData = {
  dashboard: WorkspaceDashboard | null
  tasks: WorkspaceTask[]
  events: CalendarEvent[]
  questions: QuestionSummary[]
  files: WorkspaceFile[]
  erd: WorkspaceErdDocument | null
  erdVersions: WorkspaceErdVersion[]
  meetingNotes: MeetingNote[]
  voiceChannels: VoiceChannel[]
  notices: WorkspaceNotice[]
}

type PageConfig = {
  path: string
  label: string
  title: string
  icon: string
}

const PAGE_CONFIG: Record<MentoringCommonPage, PageConfig> = {
  dashboard: {
    path: '/mentoring-dashboard',
    label: '멘토링 대시보드',
    title: '멘토링 대시보드',
    icon: 'fas fa-home',
  },
  curriculum: {
    path: '/mentoring-curriculum',
    label: '주차별 미션 & 피드백',
    title: '주차별 미션 & 피드백',
    icon: 'fas fa-tasks',
  },
  qna: {
    path: '/mentoring-qna',
    label: '멘토 Q&A',
    title: '멘토 Q&A',
    icon: 'fas fa-comments',
  },
  workspace: {
    path: '/mentoring-workspace',
    label: '개인 칸반',
    title: '개인 칸반',
    icon: 'fas fa-columns',
  },
  schedule: {
    path: '/mentoring-schedule',
    label: '일정',
    title: '일정',
    icon: 'fas fa-calendar-alt',
  },
  files: {
    path: '/mentoring-files',
    label: '자료실',
    title: '자료실',
    icon: 'fas fa-folder-open',
  },
  meeting: {
    path: '/mentoring-meeting',
    label: '화상 멘토링',
    title: '화상 멘토링',
    icon: 'fas fa-video',
  },
  'live-meeting': {
    path: '/mentoring-live-meeting',
    label: '라이브 룸',
    title: '라이브 룸',
    icon: 'fas fa-headset',
  },
  erd: {
    path: '/mentoring-erd',
    label: 'ERD 설계',
    title: 'ERD 설계',
    icon: 'fas fa-project-diagram',
  },
}

const NAV_SECTIONS = [
  {
    title: 'Mentoring Core',
    items: ['dashboard', 'curriculum', 'qna'] as MentoringCommonPage[],
  },
  {
    title: 'Collaboration',
    items: ['workspace', 'schedule', 'files', 'meeting', 'live-meeting', 'erd'] as MentoringCommonPage[],
  },
]

const EMPTY_DATA: MentoringWorkspaceData = {
  dashboard: null,
  tasks: [],
  events: [],
  questions: [],
  files: [],
  erd: null,
  erdVersions: [],
  meetingNotes: [],
  voiceChannels: [],
  notices: [],
}

const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string; tone: string; countTone: string }> = [
  {
    status: 'TODO',
    label: 'To Do',
    tone: 'text-gray-800',
    countTone: 'bg-gray-200 text-gray-600',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    tone: 'text-[#00C471]',
    countTone: 'bg-green-100 text-[#00C471]',
  },
  {
    status: 'DONE',
    label: 'Done',
    tone: 'text-gray-500',
    countTone: 'bg-gray-200 text-gray-500',
  },
]

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const parsed = Number(params.get('workspaceId') ?? params.get('mentoringId'))

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function getChannelIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const parsed = Number(params.get('channelId'))

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function buildHref(page: MentoringCommonPage, workspaceId: number | null, extra?: URLSearchParams) {
  const params = new URLSearchParams(extra)

  if (workspaceId) {
    params.set('workspaceId', String(workspaceId))
  }

  const query = params.toString()

  return query ? `${PAGE_CONFIG[page].path}?${query}` : PAGE_CONFIG[page].path
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function optionalRequest<T>(request: Promise<T>, fallback: T) {
  try {
    return await request
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    return fallback
  }
}

function parseDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value?: string | null) {
  const date = parseDate(value)

  if (!date) {
    return '날짜 없음'
  }

  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value)

  if (!date) {
    return '시간 없음'
  }

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(value?: string | null) {
  const date = parseDate(value)

  if (!date) {
    return '방금 전'
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) {
    return '방금 전'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  if (diffDays < 7) {
    return `${diffDays}일 전`
  }

  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB'
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function percent(done: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((done / total) * 100)
}

function statusLabel(status?: TaskStatus | null) {
  switch (status) {
    case 'TODO':
      return '대기'
    case 'IN_PROGRESS':
      return '진행 중'
    case 'DONE':
      return '완료'
    default:
      return '대기'
  }
}

function priorityLabel(priority?: TaskPriority | null) {
  switch (priority) {
    case 'HIGH':
      return '긴급'
    case 'MEDIUM':
      return '보통'
    case 'LOW':
      return '낮음'
    default:
      return '보통'
  }
}

function questionStatusLabel(status?: QnaStatus | null) {
  if (status === 'ANSWERED' || status === 'CLOSED') {
    return '답변 완료'
  }

  return '답변 대기'
}

function initials(name?: string | null) {
  const trimmed = name?.trim()

  if (!trimmed) {
    return 'U'
  }

  return trimmed.slice(0, 2).toUpperCase()
}

function sameOrFuture(value?: string | null) {
  const date = parseDate(value)

  return date ? date.getTime() >= Date.now() - 86400000 : false
}

function sortByRecent<T extends { createdAt?: string | null; updatedAt?: string | null }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = parseDate(left.updatedAt ?? left.createdAt)?.getTime() ?? 0
    const rightTime = parseDate(right.updatedAt ?? right.createdAt)?.getTime() ?? 0

    return rightTime - leftTime
  })
}

type ErdColumnSchema = {
  name: string
  type?: string | null
  key?: string | null
  primary?: boolean | null
  foreign?: boolean | null
}

type ErdTableSchema = {
  name: string
  columns?: ErdColumnSchema[] | null
  x?: number | null
  y?: number | null
}

type ErdRelationshipSchema = {
  from: string
  to: string
  label?: string | null
  type?: string | null
}

type ParsedErdSchema = {
  tables: ErdTableSchema[]
  relationships: ErdRelationshipSchema[]
}

function parseErdSchema(schemaJson?: string | null, mermaidCode?: string | null): ParsedErdSchema {
  if (schemaJson?.trim()) {
    try {
      const parsed = JSON.parse(schemaJson) as Partial<ParsedErdSchema>

      return {
        tables: Array.isArray(parsed.tables) ? parsed.tables : [],
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
      }
    } catch {
      // Fall through to the Mermaid parser.
    }
  }

  return parseMermaidErd(mermaidCode)
}

function parseMermaidErd(mermaidCode?: string | null): ParsedErdSchema {
  if (!mermaidCode?.trim()) {
    return { tables: [], relationships: [] }
  }

  const tables = new Map<string, ErdTableSchema>()
  const relationships: ErdRelationshipSchema[] = []
  let activeTable: ErdTableSchema | null = null

  mermaidCode.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim()

    if (!line || line === 'erDiagram') {
      return
    }

    const tableStart = line.match(/^([A-Za-z0-9_]+)\s*\{$/)
    if (tableStart) {
      activeTable = { name: tableStart[1], columns: [] }
      tables.set(activeTable.name, activeTable)
      return
    }

    if (line === '}') {
      activeTable = null
      return
    }

    if (activeTable) {
      const [type = 'VARCHAR', name = 'column', key] = line.split(/\s+/)
      activeTable.columns = [
        ...(activeTable.columns ?? []),
        {
          name,
          type,
          key,
          primary: key === 'PK',
          foreign: key === 'FK',
        },
      ]
      return
    }

    const relation = line.match(/^([A-Za-z0-9_]+)\s+[|}{o]+--[|}{o]+\s+([A-Za-z0-9_]+)\s*:?\s*(.*)$/)
    if (relation) {
      relationships.push({
        from: relation[1],
        to: relation[2],
        label: relation[3] || null,
      })
      tables.set(relation[1], tables.get(relation[1]) ?? { name: relation[1], columns: [] })
      tables.set(relation[2], tables.get(relation[2]) ?? { name: relation[2], columns: [] })
    }
  })

  return { tables: [...tables.values()], relationships }
}

function getErdTablePosition(table: ErdTableSchema, index: number) {
  const fallbackPositions = [
    { x: 140, y: 130 },
    { x: 540, y: 130 },
    { x: 140, y: 360 },
    { x: 540, y: 360 },
    { x: 900, y: 250 },
    { x: 900, y: 500 },
  ]
  const fallback = fallbackPositions[index % fallbackPositions.length]

  return {
    x: typeof table.x === 'number' ? table.x : fallback.x,
    y: typeof table.y === 'number' ? table.y : fallback.y,
  }
}

function Avatar({
  name,
  image,
  className = 'h-10 w-10',
  textClassName = 'text-xs',
}: {
  name?: string | null
  image?: string | null
  className?: string
  textClassName?: string
}) {
  if (image) {
    return <img src={image} alt="" className={`${className} rounded-full object-cover`} />
  }

  return (
    <div
      className={`${className} rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center font-extrabold text-gray-500 ${textClassName}`}
    >
      {initials(name)}
    </div>
  )
}

function EmptyPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white/70 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-2xl text-gray-300">
        <i className={icon}></i>
      </div>
      <p className="text-sm font-extrabold text-gray-800">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-gray-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function SectionCard({
  title,
  icon,
  children,
  action,
  className = '',
}: {
  title: string
  icon: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-5 flex items-center justify-between border-b border-gray-50 pb-3">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
          <i className={icon}></i>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[#00C471] px-5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-[#00C471] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  required?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      className="h-[42px] w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
      placeholder={placeholder}
    />
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows?: number
  required?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      rows={rows}
      className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium leading-relaxed text-gray-800 outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
      placeholder={placeholder}
    />
  )
}

function MentoringShell({
  page,
  workspaceId,
  dashboard,
  memberName,
  memberProfileImage,
  children,
}: {
  page: MentoringCommonPage
  workspaceId: number | null
  dashboard: WorkspaceDashboard | null
  memberName?: string | null
  memberProfileImage?: string | null
  children: ReactNode
}) {
  const pageConfig = PAGE_CONFIG[page]
  const projectName = dashboard?.name ?? '멘토링 워크스페이스'

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F4F6] text-gray-800">
      <aside className="group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64">
        <a
          href="/workspace-hub"
          className="flex h-20 shrink-0 cursor-pointer items-center border-b border-gray-100 px-5 transition hover:bg-gray-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white shadow-md">
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mentoring</p>
            <p className="w-36 truncate font-bold text-gray-900">{projectName}</p>
          </div>
        </a>

        <nav className="custom-scrollbar mt-2 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="h-0 overflow-hidden px-4 text-[10px] font-bold uppercase text-gray-400 opacity-0 transition-all duration-300 group-hover:mt-6 group-hover:mb-2 group-hover:h-auto group-hover:opacity-100">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = item === page

                return (
                  <a
                    key={item}
                    href={buildHref(item, workspaceId)}
                    className={
                      active
                        ? 'flex cursor-pointer items-center rounded-xl bg-[#EDE9FE] px-4 py-3 font-bold text-[#7C3AED] transition'
                        : 'flex cursor-pointer items-center rounded-xl px-4 py-3 font-medium text-gray-500 transition hover:translate-x-0.5 hover:bg-gray-50 hover:text-gray-900'
                    }
                  >
                    <i className={`${PAGE_CONFIG[item].icon} w-6 text-center text-lg`}></i>
                    <span className="ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
                      {PAGE_CONFIG[item].label}
                    </span>
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
          <Avatar name={memberName} image={memberProfileImage} className="h-10 w-10 shrink-0" />
          <div className="ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
            <p className="text-sm font-bold text-gray-900">{memberName ?? '학습자'}</p>
            <p className="mt-0.5 inline-block rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-[#00C471]">
              Mentee
            </p>
          </div>
        </div>
      </aside>

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-30 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 font-bold text-gray-800">
            <span className="rounded-md border border-purple-100 bg-[#EDE9FE] px-2 py-1 text-xs text-[#7C3AED]">
              Mentoring
            </span>
            <span className="truncate">{projectName}</span>
            <span className="ml-2 rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              <i className="fas fa-puzzle-piece mr-1"></i>
              공통 과제형
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative p-2 text-gray-400 transition hover:text-[#00C471]"
              title="알림"
            >
              <i className="far fa-bell text-lg"></i>
            </button>
            <button
              type="button"
              onClick={() => clearStoredAuthSession()}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            >
              로그아웃
            </button>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-2">
              <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                <i className={`${pageConfig.icon} text-[#00C471]`}></i>
                {pageConfig.title}
              </h1>
              <p className="text-sm text-gray-500">
                실제 워크스페이스 데이터를 기준으로 멘토링 공통과제 진행 상태를 관리합니다.
              </p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

function DashboardPage({
  data,
  personalTasks,
  progressPercent,
  currentWeek,
  workspaceId,
}: {
  data: MentoringWorkspaceData
  personalTasks: WorkspaceTask[]
  progressPercent: number
  currentWeek: number
  workspaceId: number | null
}) {
  const dashboard = data.dashboard
  const doneCount = personalTasks.filter((task) => task.status === 'DONE').length
  const activeTask = personalTasks.find((task) => task.status !== 'DONE')
  const upcomingEvents = data.events.filter((event) => sameOrFuture(event.startAt)).slice(0, 3)
  const recentFiles = sortByRecent(data.files).slice(0, 3)
  const pendingQuestions = data.questions.filter((question) => question.qnaStatus !== 'ANSWERED' && question.qnaStatus !== 'CLOSED')
  const latestNote = sortByRecent(data.meetingNotes)[0]
  const notices = sortByRecent(data.notices).slice(0, 3)
  const hasBodyData =
    personalTasks.length > 0 ||
    upcomingEvents.length > 0 ||
    recentFiles.length > 0 ||
    data.questions.length > 0 ||
    data.meetingNotes.length > 0 ||
    data.notices.length > 0 ||
    Boolean(data.erd?.mermaidCode)

  return (
    <>
      <section className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:flex-row">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED] opacity-5 blur-3xl"></div>
        <div className="relative z-10 flex flex-1 items-center gap-6">
          <Avatar
            name={dashboard?.ownerName}
            image={dashboard?.ownerProfileImage}
            className="h-20 w-20 shrink-0 border-4 border-white shadow-md"
            textClassName="text-lg"
          />
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded border border-purple-200 bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">
                MENTOR
              </span>
              <h2 className="truncate text-2xl font-extrabold text-gray-900">
                {dashboard?.ownerName ?? '멘토 정보 없음'}
              </h2>
            </div>
            <p className="mb-3 line-clamp-2 text-sm text-gray-500">
              {dashboard?.ownerBio ?? '등록된 멘토 소개가 없습니다.'}
            </p>
            <SecondaryButton onClick={() => showAuthToast({ message: '멘토 DM 기능은 연결된 메시지 API 범위에서 준비 중입니다.' })}>
              <i className="fas fa-envelope"></i>
              멘토에게 DM 보내기
            </SecondaryButton>
          </div>
        </div>

        <a
          href={buildHref('curriculum', workspaceId)}
          className="relative z-10 w-full rounded-2xl border border-gray-100 bg-gray-50 p-5 transition hover:shadow-md md:w-72"
        >
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400">나의 멘토링 진행률</p>
              <p className="text-xl font-extrabold text-[#00C471]">
                Week {currentWeek} <span className="text-sm font-medium text-gray-500">/ 4주</span>
              </p>
            </div>
            <span className="text-sm font-extrabold text-gray-800">{progressPercent}%</span>
          </div>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-[#00C471] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="flex items-center justify-end gap-1 text-right text-[10px] text-gray-500">
            완료까지 <strong className="text-[#00C471]">{Math.max(0, 4 - currentWeek)}주</strong> 남았습니다.
            <i className="fas fa-arrow-right text-[8px] text-[#00C471]"></i>
          </p>
        </a>
      </section>

      {!hasBodyData ? (
        <EmptyPanel
          icon="fas fa-seedling"
          title="아직 멘토링 데이터가 없습니다"
          description="과제, 일정, 질문, 자료가 등록되면 이 대시보드에 실제 데이터로 채워집니다."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SectionCard title="이번 주 미션" icon="fas fa-flag-checkered text-[#7C3AED]">
              {activeTask ? (
                <div className="rounded-2xl border-l-4 border-l-[#7C3AED] bg-white p-1">
                  <div className="rounded-xl bg-gray-50 p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <span className="mb-2 inline-block rounded border border-purple-200 bg-[#EDE9FE] px-2 py-1 text-[10px] font-extrabold text-[#7C3AED]">
                          THIS WEEK
                        </span>
                        <h3 className="text-xl font-extrabold text-gray-900">{activeTask.title}</h3>
                      </div>
                      <span className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-bold text-yellow-600">
                        {statusLabel(activeTask.status)}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
                      {activeTask.description ?? '상세 설명이 등록되지 않았습니다.'}
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-gray-400">
                      <span>
                        <i className="far fa-clock mr-1"></i>
                        {activeTask.dueDate ? `${formatDate(activeTask.dueDate)} 마감` : '기한 없음'}
                      </span>
                      <span>
                        <i className="fas fa-fire mr-1 text-red-500"></i>
                        {priorityLabel(activeTask.priority)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyPanel
                  icon="fas fa-check"
                  title="남은 미션이 없습니다"
                  description="현재 등록된 개인 과제가 모두 완료됐습니다."
                />
              )}
            </SectionCard>

            <SectionCard
              title="최근 자료"
              icon="fas fa-folder-open text-yellow-500"
              action={
                <a href={buildHref('files', workspaceId)} className="text-xs font-bold text-gray-400 transition hover:text-[#00C471]">
                  전체보기 <i className="fas fa-chevron-right ml-0.5 text-[10px]"></i>
                </a>
              }
            >
              {recentFiles.length > 0 ? (
                <div className="space-y-3">
                  {recentFiles.map((file) => (
                    <div key={file.fileId} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500">
                        <i className={file.itemType === 'LINK' ? 'fas fa-link' : 'fas fa-file-alt'}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900">{file.displayName ?? file.originalFileName ?? '자료'}</p>
                        <p className="text-xs text-gray-400">
                          {file.uploadedByName ?? '업로더 정보 없음'} · {formatRelativeTime(file.createdAt)}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{formatFileSize(file.fileSize)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel icon="fas fa-folder-open" title="자료가 없습니다" description="멘토가 등록한 자료나 학습자가 올린 파일이 아직 없습니다." />
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="요약" icon="fas fa-chart-pie text-[#00C471]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[10px] font-bold text-gray-400">완료 과제</p>
                  <p className="mt-1 text-2xl font-extrabold text-gray-900">
                    {doneCount}
                    <span className="text-sm text-gray-400">/{personalTasks.length}</span>
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[10px] font-bold text-gray-400">대기 질문</p>
                  <p className="mt-1 text-2xl font-extrabold text-gray-900">{pendingQuestions.length}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[10px] font-bold text-gray-400">예정 일정</p>
                  <p className="mt-1 text-2xl font-extrabold text-gray-900">{upcomingEvents.length}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[10px] font-bold text-gray-400">회의록</p>
                  <p className="mt-1 text-2xl font-extrabold text-gray-900">{data.meetingNotes.length}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="멘토 공지" icon="fas fa-bullhorn text-[#7C3AED]">
              {notices.length > 0 ? (
                <div className="space-y-3">
                  {notices.map((notice) => (
                    <article key={notice.id} className="rounded-xl border border-purple-100 bg-[#EDE9FE]/60 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">
                          NOTICE
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-gray-400">{formatRelativeTime(notice.createdAt)}</span>
                      </div>
                      <h3 className="line-clamp-1 text-sm font-extrabold text-gray-900">{notice.title}</h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{notice.content}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyPanel icon="fas fa-bullhorn" title="등록된 공지가 없습니다" description="멘토 공지가 등록되면 이 영역에 실제 데이터로 표시됩니다." />
              )}
            </SectionCard>

            <SectionCard title="다가오는 라이브" icon="fas fa-video text-red-500">
              {upcomingEvents[0] ? (
                <div className="rounded-2xl border border-purple-100 bg-[#EDE9FE]/60 p-4">
                  <p className="text-sm font-extrabold text-gray-900">{upcomingEvents[0].title}</p>
                  <p className="mt-2 text-xs font-bold text-[#7C3AED]">{formatDateTime(upcomingEvents[0].startAt)}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                    {upcomingEvents[0].description ?? '상세 일정 설명이 없습니다.'}
                  </p>
                </div>
              ) : (
                <EmptyPanel icon="far fa-calendar" title="예정된 일정이 없습니다" description="등록된 일정이 생기면 이곳에 표시됩니다." />
              )}
            </SectionCard>

            <SectionCard title="최근 회의록" icon="fas fa-clipboard-list text-blue-500">
              {latestNote ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-extrabold text-gray-900">{latestNote.title}</p>
                  <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-gray-500">
                    {latestNote.content ?? '회의록 내용이 비어 있습니다.'}
                  </p>
                  <p className="mt-3 text-[10px] font-bold text-gray-400">{formatRelativeTime(latestNote.createdAt)}</p>
                </div>
              ) : (
                <EmptyPanel icon="fas fa-clipboard" title="회의록이 없습니다" description="멘토링 회의록이 등록되면 확인할 수 있습니다." />
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </>
  )
}

function WorkspacePage({
  tasks,
  members,
  memberNameById,
  search,
  setSearch,
  onCreateTask,
  onUpdateTaskStatus,
  submitting,
}: {
  tasks: WorkspaceTask[]
  members: WorkspaceMember[]
  memberNameById: Map<number, string>
  search: string
  setSearch: (value: string) => void
  onCreateTask: (payload: { title: string; description: string; priority: TaskPriority; dueDate: string }) => Promise<void>
  onUpdateTaskStatus: (task: WorkspaceTask, status: TaskStatus) => Promise<void>
  submitting: boolean
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const loweredSearch = search.trim().toLowerCase()
  const filteredTasks = loweredSearch
    ? tasks.filter((task) => `${task.title} ${task.description ?? ''}`.toLowerCase().includes(loweredSearch))
    : tasks

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateTask({ title, description, priority, dueDate })
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setDueDate('')
    setFormOpen(false)
  }

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <div className="flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-gray-500">나의 과제 진행 상황과 개인 학습 일정을 한눈에 관리합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center">
            <i className="fas fa-search absolute left-3.5 text-xs text-gray-400"></i>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="과제 제목, 내용 검색"
              className="h-[38px] w-60 rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs font-medium outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
            />
          </div>
          <PrimaryButton onClick={() => setFormOpen((open) => !open)}>
            <i className="fas fa-plus"></i>
            과제 추가
          </PrimaryButton>
        </div>
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_140px_140px_auto]">
          <TextInput value={title} onChange={setTitle} placeholder="과제 제목" required />
          <TextInput value={description} onChange={setDescription} placeholder="과제 설명" />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className="h-[42px] rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-600 outline-none focus:border-[#00C471]"
          >
            <option value="LOW">낮음</option>
            <option value="MEDIUM">보통</option>
            <option value="HIGH">긴급</option>
          </select>
          <TextInput value={dueDate} onChange={setDueDate} placeholder="마감일" type="date" />
          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            저장
          </PrimaryButton>
        </form>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyPanel
          icon="fas fa-columns"
          title="등록된 과제가 없습니다"
          description="멘토가 부여한 공통 과제나 직접 추가한 개인 과제가 여기에 표시됩니다."
          action={
            <PrimaryButton onClick={() => setFormOpen(true)}>
              <i className="fas fa-plus"></i>
              첫 과제 추가
            </PrimaryButton>
          }
        />
      ) : (
        <div className="custom-scrollbar flex min-h-[560px] gap-6 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = filteredTasks.filter((task) => task.status === column.status)

            return (
              <section key={column.status} className="flex h-full min-w-[320px] flex-1 flex-col rounded-2xl border border-gray-200/60 bg-gray-100/50 p-4">
                <div className="mb-4 flex items-center justify-between px-1">
                  <h3 className={`text-sm font-extrabold ${column.tone}`}>
                    {column.label}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${column.countTone}`}>{columnTasks.length}</span>
                  </h3>
                </div>

                <div className="custom-scrollbar flex min-h-[120px] flex-1 flex-col gap-3 overflow-y-auto">
                  {columnTasks.length > 0 ? (
                    columnTasks.map((task) => (
                      <article
                        key={task.taskId}
                        className={`rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#00C471] hover:shadow-md ${
                          task.status === 'DONE' ? 'border-gray-200 bg-gray-50 opacity-75' : task.priority === 'HIGH' ? 'border-red-200' : 'border-gray-200'
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">
                            {statusLabel(task.status)}
                          </span>
                          {task.priority === 'HIGH' ? (
                            <span className="flex items-center gap-1 rounded border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                              <i className="fas fa-fire"></i>
                              긴급
                            </span>
                          ) : null}
                        </div>
                        <h4 className="mb-1 text-sm font-bold text-gray-900">{task.title}</h4>
                        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
                          {task.description ?? '설명 없음'}
                        </p>
                        <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-bold text-gray-400">
                          <span>
                            <i className="far fa-clock mr-1"></i>
                            {task.dueDate ? `${formatDate(task.dueDate)} 마감` : '기한 없음'}
                          </span>
                          <span>{task.assigneeId ? memberNameById.get(task.assigneeId) ?? `#${task.assigneeId}` : members[0]?.learnerName ?? '미배정'}</span>
                        </div>
                        <div className="flex gap-1">
                          {STATUS_COLUMNS.filter((target) => target.status !== task.status).map((target) => (
                            <button
                              type="button"
                              key={target.status}
                              onClick={() => void onUpdateTaskStatus(task, target.status)}
                              className="h-7 flex-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 transition hover:bg-gray-50"
                            >
                              {target.label}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white/60 text-xs font-bold text-gray-400">
                      표시할 과제가 없습니다.
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CurriculumPage({
  tasks,
  questions,
  progressPercent,
}: {
  tasks: WorkspaceTask[]
  questions: QuestionSummary[]
  progressPercent: number
}) {
  const weeks = useMemo(() => {
    const buckets = [1, 2, 3, 4].map((week) => ({ week, tasks: [] as WorkspaceTask[] }))
    tasks.forEach((task, index) => {
      buckets[Math.min(3, index % 4)].tasks.push(task)
    })

    return buckets
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <EmptyPanel
        icon="fas fa-tasks"
        title="등록된 커리큘럼 미션이 없습니다"
        description="공통 과제나 개인 과제가 등록되면 주차별 미션 목록에 실제 데이터로 표시됩니다."
      />
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        {weeks.map((week) => {
          const weekDone = week.tasks.filter((task) => task.status === 'DONE').length

          return (
            <article key={week.week} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <span className="mb-2 inline-block rounded border border-purple-200 bg-[#EDE9FE] px-2 py-1 text-[10px] font-extrabold text-[#7C3AED]">
                    WEEK {week.week}
                  </span>
                  <h3 className="text-lg font-extrabold text-gray-900">
                    {week.tasks[0]?.title ?? `Week ${week.week} 미션`}
                  </h3>
                </div>
                <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-500">
                  {weekDone}/{week.tasks.length} 완료
                </span>
              </div>

              {week.tasks.length > 0 ? (
                <div className="space-y-3">
                  {week.tasks.map((task) => (
                    <div key={task.taskId} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className={task.status === 'DONE' ? 'mt-0.5 text-[#00C471]' : 'mt-0.5 text-gray-300'}>
                        <i className={task.status === 'DONE' ? 'fas fa-check-circle' : 'far fa-circle'}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900">{task.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                          {task.description ?? '미션 설명이 등록되지 않았습니다.'}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{task.dueDate ? formatDate(task.dueDate) : '기한 없음'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-100 bg-gray-50 p-6 text-center text-xs font-bold text-gray-400">
                  이 주차에 연결된 미션이 없습니다.
                </div>
              )}
            </article>
          )
        })}
      </section>

      <aside className="space-y-6">
        <SectionCard title="전체 진행률" icon="fas fa-chart-line text-[#00C471]">
          <p className="text-4xl font-extrabold text-gray-900">{progressPercent}%</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
            <div className="h-3 rounded-full bg-[#00C471]" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </SectionCard>

        <SectionCard title="피드백 상태" icon="fas fa-comment-dots text-[#7C3AED]">
          <div className="space-y-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-[10px] font-bold text-gray-400">등록 질문</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">{questions.length}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-[10px] font-bold text-gray-400">답변 완료</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">
                {questions.filter((question) => question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED').length}
              </p>
            </div>
          </div>
        </SectionCard>
      </aside>
    </div>
  )
}

function QnaPage({
  questions,
  questionDetails,
  expandedQuestionId,
  onToggleQuestion,
  onCreateQuestion,
  submitting,
}: {
  questions: QuestionSummary[]
  questionDetails: Map<number, QuestionDetail>
  expandedQuestionId: number | null
  onToggleQuestion: (questionId: number) => void
  onCreateQuestion: (payload: { title: string; content: string; difficulty: string; templateType: string }) => Promise<void>
  submitting: boolean
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'answered' | 'pending'>('all')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const filteredQuestions = questions.filter((question) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'answered' && (question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED')) ||
      (filter === 'pending' && question.qnaStatus !== 'ANSWERED' && question.qnaStatus !== 'CLOSED')
    const matchesSearch = search.trim()
      ? `${question.title} ${question.authorName ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
      : true

    return matchesFilter && matchesSearch
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateQuestion({ title, content, difficulty, templateType: 'PROJECT' })
    setTitle('')
    setContent('')
    setDifficulty('MEDIUM')
    setFormOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <p className="text-sm text-gray-500">학습 중 생긴 오류와 궁금한 점을 멘토에게 질문합니다.</p>
        <PrimaryButton onClick={() => setFormOpen((open) => !open)}>
          <i className="fas fa-pen"></i>
          질문 작성하기
        </PrimaryButton>
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <TextInput value={title} onChange={setTitle} placeholder="질문 제목" required />
          <TextArea value={content} onChange={setContent} placeholder="질문 내용을 입력하세요" rows={6} required />
          <div className="flex justify-end gap-2">
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="h-[42px] rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-600 outline-none focus:border-[#00C471]"
            >
              <option value="EASY">쉬움</option>
              <option value="MEDIUM">보통</option>
              <option value="HARD">어려움</option>
            </select>
            <PrimaryButton type="submit" disabled={submitting}>
              질문 등록
            </PrimaryButton>
          </div>
        </form>
      ) : null}

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex gap-6 px-2">
          {[
            ['all', '전체 질문'],
            ['answered', '답변 완료'],
            ['pending', '답변 대기'],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setFilter(key as 'all' | 'answered' | 'pending')}
              className={
                filter === key
                  ? 'border-b-2 border-[#7C3AED] pb-1 text-sm font-extrabold text-[#7C3AED]'
                  : 'border-b-2 border-transparent pb-1 text-sm font-medium text-gray-500 transition hover:text-gray-800'
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full shrink-0 md:w-64">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"></i>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-[42px] w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
            placeholder="질문 내용 검색"
          />
        </div>
      </div>

      {questions.length === 0 ? (
        <EmptyPanel
          icon="far fa-comments"
          title="질문이 없습니다"
          description="멘토에게 물어볼 내용을 작성하면 이곳에 실제 질문 목록이 표시됩니다."
          action={
            <PrimaryButton onClick={() => setFormOpen(true)}>
              <i className="fas fa-pen"></i>
              첫 질문 작성
            </PrimaryButton>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => {
            const expanded = expandedQuestionId === question.id
            const detail = questionDetails.get(question.id)
            const answered = question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED'

            return (
              <article key={question.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300">
                <button
                  type="button"
                  onClick={() => onToggleQuestion(question.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left transition hover:bg-gray-50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span
                      className={
                        answered
                          ? 'shrink-0 rounded bg-green-50 px-2 py-1 text-[10px] font-extrabold text-[#00C471]'
                          : 'shrink-0 rounded bg-gray-100 px-2 py-1 text-[10px] font-extrabold text-gray-500'
                      }
                    >
                      {questionStatusLabel(question.qnaStatus)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold text-gray-900">{question.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">{question.authorName ?? '작성자 정보 없음'}</span>
                        <span className="text-[10px] text-gray-400">· {formatRelativeTime(question.createdAt)}</span>
                        <span className="text-[10px] text-gray-400">· 답변 {question.answerCount}</span>
                      </div>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-down text-gray-400 transition ${expanded ? 'rotate-180' : ''}`}></i>
                </button>

                {expanded ? (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-6">
                    {detail ? (
                      <div className="space-y-6">
                        <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-gray-700">{detail.content}</p>
                        <div className="space-y-3">
                          {detail.answers.length > 0 ? (
                            detail.answers.map((answer) => (
                              <div key={answer.id} className="rounded-xl border border-purple-100 bg-white p-4">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-[#7C3AED]">{answer.authorName ?? '멘토'}</span>
                                  <span className="text-[10px] font-bold text-gray-400">{formatRelativeTime(answer.createdAt)}</span>
                                </div>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{answer.content}</p>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-xl border border-gray-200 bg-white p-4 text-center text-xs font-bold text-gray-400">
                              아직 등록된 답변이 없습니다.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs font-bold text-gray-400">질문 상세를 불러오는 중입니다.</p>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SchedulePage({
  events,
  onCreateEvent,
  submitting,
}: {
  events: CalendarEvent[]
  onCreateEvent: (payload: { title: string; description: string; startAt: string; endAt: string }) => Promise<void>
  submitting: boolean
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const sortedEvents = [...events].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateEvent({ title, description, startAt, endAt })
    setTitle('')
    setDescription('')
    setStartAt('')
    setEndAt('')
    setFormOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">멘토링 일정과 라이브 세션 일정을 실제 캘린더 데이터로 표시합니다.</p>
        <PrimaryButton onClick={() => setFormOpen((open) => !open)}>
          <i className="fas fa-plus"></i>
          일정 추가
        </PrimaryButton>
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_210px_210px_auto]">
          <TextInput value={title} onChange={setTitle} placeholder="일정 제목" required />
          <TextInput value={description} onChange={setDescription} placeholder="일정 설명" />
          <TextInput value={startAt} onChange={setStartAt} placeholder="시작" type="datetime-local" required />
          <TextInput value={endAt} onChange={setEndAt} placeholder="종료" type="datetime-local" required />
          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            저장
          </PrimaryButton>
        </form>
      ) : null}

      {events.length === 0 ? (
        <EmptyPanel
          icon="far fa-calendar"
          title="등록된 일정이 없습니다"
          description="멘토링 일정이 생성되면 이곳에 실제 일정 목록으로 표시됩니다."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedEvents.map((event) => {
            const startDate = parseDate(event.startAt)

            return (
              <article key={event.eventId} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-purple-100 bg-[#EDE9FE] text-[#7C3AED]">
                  <span className="text-[10px] font-extrabold uppercase">
                    {startDate ? startDate.toLocaleString('en-US', { month: 'short' }) : 'Now'}
                  </span>
                  <span className="text-2xl font-extrabold">{startDate ? startDate.getDate() : '--'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-gray-900">{event.title}</p>
                  <p className="mt-1 text-xs font-bold text-[#00C471]">{formatDateTime(event.startAt)}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">
                    {event.description ?? '일정 설명이 없습니다.'}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilesPage({
  files,
  onUploadFile,
  submitting,
}: {
  files: WorkspaceFile[]
  onUploadFile: (file: File) => Promise<void>
  submitting: boolean
}) {
  const [search, setSearch] = useState('')
  const filteredFiles = search.trim()
    ? files.filter((file) => `${file.displayName ?? file.originalFileName ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    : files

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    await onUploadFile(file)
    event.target.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <p className="text-sm text-gray-500">멘토링 자료와 제출 파일을 실제 워크스페이스 파일 저장소에서 관리합니다.</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"></i>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-[38px] w-60 rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-xs font-medium outline-none focus:border-[#00C471]"
              placeholder="자료 검색"
            />
          </div>
          <label className="inline-flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#00C471] px-5 text-sm font-bold text-white shadow-md transition hover:bg-green-600">
            <i className="fas fa-upload"></i>
            파일 업로드
            <input type="file" className="hidden" disabled={submitting} onChange={(event) => void handleChange(event)} />
          </label>
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyPanel
          icon="fas fa-cloud-upload-alt"
          title="등록된 자료가 없습니다"
          description="업로드한 파일과 멘토가 공유한 자료가 실제 데이터로 이곳에 표시됩니다."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredFiles.map((file) => (
            <article key={file.fileId} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-xl text-gray-500">
                  <i className={file.itemType === 'LINK' ? 'fas fa-link' : file.itemType === 'FOLDER' ? 'fas fa-folder' : 'fas fa-file-alt'}></i>
                </div>
                <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-extrabold text-gray-500">{file.itemType}</span>
              </div>
              <h3 className="truncate text-sm font-extrabold text-gray-900">{file.displayName ?? file.originalFileName ?? '자료'}</h3>
              <p className="mt-2 text-xs text-gray-400">
                {file.uploadedByName ?? '업로더 정보 없음'} · {formatRelativeTime(file.createdAt)}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400">{formatFileSize(file.fileSize)}</span>
                {file.itemType === 'FILE' ? (
                  <a
                    href={`/api/workspace-files/${file.fileId}/download`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-bold text-gray-500 transition hover:bg-gray-50"
                  >
                    다운로드
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function ErdPage({
  erd,
  versions,
  onSaveErd,
  submitting,
}: {
  erd: WorkspaceErdDocument | null
  versions: WorkspaceErdVersion[]
  onSaveErd: (payload: { mermaidCode: string; schemaJson: string; changeSummary: string }) => Promise<void>
  submitting: boolean
}) {
  const [mermaidCode, setMermaidCode] = useState(erd?.mermaidCode ?? '')
  const [changeSummary, setChangeSummary] = useState('')
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null)
  const schema = useMemo(() => parseErdSchema(erd?.schemaJson, mermaidCode), [erd?.schemaJson, mermaidCode])
  const tablePositions = useMemo(
    () => new Map(schema.tables.map((table, index) => [table.name, getErdTablePosition(table, index)])),
    [schema.tables],
  )
  const selectedTable = schema.tables.find((table) => table.name === selectedTableName) ?? schema.tables[0] ?? null
  const selectedColumns = selectedTable?.columns ?? []

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextSchemaJson = erd?.schemaJson?.trim() ? erd.schemaJson : JSON.stringify(schema)
    await onSaveErd({ mermaidCode, schemaJson: nextSchemaJson, changeSummary })
    setChangeSummary('')
  }

  return (
    <form onSubmit={handleSubmit} className="-mx-2 -mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <i className="fas fa-project-diagram text-[#00C471]"></i>
            시각적 ERD 설계
          </h2>
          <div className="mx-1 h-5 w-px bg-gray-300"></div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
            onClick={() => showAuthToast({ message: '현재 ERD 테이블 추가는 Mermaid 또는 schemaJson 저장 데이터로 관리됩니다.' })}
          >
            <i className="fas fa-plus"></i>
            테이블 추가
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="mr-2 text-xs font-bold text-gray-500">
            <i className="fas fa-cloud-upload-alt mr-1 text-[#00C471]"></i>
            모든 변경사항 저장됨
          </div>
          <button
            type="button"
            onClick={() => showAuthToast({ message: 'ERD 내보내기는 캔버스 저장 API가 붙으면 연결됩니다.' })}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <i className="fas fa-download"></i>
            내보내기
          </button>
          <button
            type="submit"
            disabled={submitting || !mermaidCode.trim()}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className="fas fa-save"></i>
            버전 저장
          </button>
        </div>
      </div>

      <div className="flex h-[720px] min-h-[620px] overflow-hidden">
        <section
          className="relative min-w-0 flex-1 overflow-hidden bg-[#F8F9FA]"
          style={{
            backgroundImage: 'radial-gradient(#D1D5DB 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="absolute left-4 top-4 z-30 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-md">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00C471]/10 text-[#00C471]" title="선택 도구">
              <i className="fas fa-mouse-pointer"></i>
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900" title="관계선 연결">
              <i className="fas fa-link"></i>
            </button>
            <div className="mx-auto my-1 h-px w-6 bg-gray-200"></div>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50" title="선택 삭제">
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>

          <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" viewBox="0 0 1220 720" preserveAspectRatio="xMinYMin meet">
            {schema.relationships.map((relationship, index) => {
              const from = tablePositions.get(relationship.from)
              const to = tablePositions.get(relationship.to)

              if (!from || !to) {
                return null
              }

              const x1 = from.x + 240
              const y1 = from.y + 54
              const x2 = to.x
              const y2 = to.y + 54
              const midX = (x1 + x2) / 2

              return (
                <g key={`${relationship.from}-${relationship.to}-${index}`}>
                  <path
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    className="fill-none stroke-[#9CA3AF] transition"
                    strokeWidth="2.5"
                  />
                  <text x={midX} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="fill-gray-500 text-[11px] font-bold">
                    {relationship.type ?? relationship.label ?? '1:N'}
                  </text>
                </g>
              )
            })}
          </svg>

          {schema.tables.length === 0 ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white text-3xl text-gray-300 shadow-sm">
                <i className="fas fa-project-diagram"></i>
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-gray-600">생성된 테이블이 없습니다</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                Mermaid ERD 또는 schemaJson 데이터가 저장되면 실제 테이블 카드가 표시됩니다.
              </p>
            </div>
          ) : null}

          <div className="relative z-10 h-full w-full">
            {schema.tables.map((table, index) => {
              const position = tablePositions.get(table.name) ?? getErdTablePosition(table, index)
              const active = selectedTable?.name === table.name

              return (
                <button
                  type="button"
                  key={table.name}
                  onClick={() => setSelectedTableName(table.name)}
                  className={`absolute flex w-[240px] flex-col overflow-hidden rounded-lg border-2 bg-white text-left shadow-xl transition ${
                    active ? 'border-[#00C471] ring-4 ring-[#00C471]/15' : 'border-gray-200 hover:border-[#00C471]/70'
                  }`}
                  style={{ left: position.x, top: position.y }}
                >
                  <div className="flex w-full items-center justify-between border-b border-gray-900 bg-gray-800 px-3 py-2.5 text-sm font-bold text-white">
                    <span className="w-full truncate text-center">{table.name}</span>
                  </div>
                  <div className="w-full bg-white text-xs">
                    {(table.columns ?? []).slice(0, 7).map((column) => {
                      const key = column.key?.toUpperCase()
                      const primary = column.primary || key === 'PK'
                      const foreign = column.foreign || key === 'FK'

                      return (
                        <div
                          key={`${table.name}-${column.name}`}
                          className={`flex items-center justify-between border-b border-gray-100 px-3 py-2 ${
                            primary ? 'bg-yellow-50/70' : foreign ? 'bg-gray-50' : 'bg-white'
                          }`}
                        >
                          <span className={`min-w-0 truncate font-bold ${primary ? 'text-gray-900' : 'text-gray-700'}`}>
                            {primary ? <i className="fas fa-key mr-1.5 text-yellow-500"></i> : null}
                            {foreign ? <i className="fas fa-link mr-1.5 text-gray-400"></i> : null}
                            {column.name}
                          </span>
                          <span className="ml-2 shrink-0 font-mono text-gray-500">{column.type ?? 'VARCHAR'}</span>
                        </div>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="z-20 flex h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-white shadow-sm">
          {selectedTable ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                <h3 className="text-sm font-extrabold text-gray-900">
                  <i className="fas fa-sliders-h mr-1 text-[#00C471]"></i>
                  테이블 속성 편집
                </h3>
              </div>

              <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-600">테이블 명</label>
                  <div className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900">
                    {selectedTable.name}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-end justify-between border-b border-gray-100 pb-2">
                    <label className="block text-xs font-extrabold text-gray-900">Columns</label>
                    <button
                      type="button"
                      className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold text-[#00C471] shadow-sm transition hover:bg-green-100"
                      onClick={() => showAuthToast({ message: '컬럼 추가는 ERD 저장 데이터 편집 API가 붙으면 연결됩니다.' })}
                    >
                      + 컬럼 추가
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedColumns.map((column) => {
                      const key = column.key?.toUpperCase()
                      const primary = column.primary || key === 'PK'
                      const foreign = column.foreign || key === 'FK'

                      return (
                        <div key={`${selectedTable.name}-panel-${column.name}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-extrabold text-gray-900">{column.name}</span>
                            <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-gray-500">{column.type ?? 'VARCHAR'}</span>
                          </div>
                          <div className="flex gap-2 text-[10px] font-bold">
                            {primary ? <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700">PK</span> : null}
                            {foreign ? <span className="rounded bg-gray-200 px-2 py-0.5 text-gray-600">FK</span> : null}
                            {!primary && !foreign ? <span className="rounded bg-white px-2 py-0.5 text-gray-400">COLUMN</span> : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-600">Mermaid 원문</label>
                  <textarea
                    value={mermaidCode}
                    onChange={(event) => setMermaidCode(event.target.value)}
                    rows={8}
                    className="custom-scrollbar w-full resize-none rounded-xl border border-gray-200 bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-100 outline-none transition focus:border-[#00C471]"
                    placeholder="erDiagram"
                    required
                  />
                </div>

                <TextInput value={changeSummary} onChange={setChangeSummary} placeholder="변경 요약" />
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-white p-4">
                <p className="mb-3 text-[10px] font-bold text-gray-400">
                  최근 저장 v{erd?.version ?? 0} · {erd?.updatedAt ? formatRelativeTime(erd.updatedAt) : '저장 이력 없음'}
                </p>
                <button
                  type="button"
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-100"
                  onClick={() => showAuthToast({ message: '테이블 삭제는 ERD 저장 데이터 편집 API가 붙으면 연결됩니다.', variant: 'error' })}
                >
                  <i className="fas fa-trash-alt mr-1"></i>
                  이 테이블 삭제
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-2xl text-gray-300">
                <i className="fas fa-mouse-pointer"></i>
              </div>
              <p className="mb-1 text-sm font-bold text-gray-700">선택된 요소가 없습니다.</p>
              <p className="text-xs leading-relaxed text-gray-500">캔버스에서 테이블을 선택하세요.</p>
            </div>
          )}
        </aside>
      </div>

      <div className="border-t border-gray-100 bg-gray-50 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {versions.slice(0, 3).map((version) => (
            <div key={version.versionId} className="rounded-xl border border-gray-100 bg-white p-3">
              <p className="text-xs font-extrabold text-gray-900">v{version.version}</p>
              <p className="mt-1 line-clamp-1 text-[11px] text-gray-500">{version.summary ?? '변경 요약 없음'}</p>
              <p className="mt-2 text-[10px] font-bold text-gray-400">{formatRelativeTime(version.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>
    </form>
  )
}

function MeetingPage({
  meetingNotes,
  voiceChannels,
  workspaceId,
  onCreateMeetingNote,
  onCreateVoiceChannel,
  submitting,
}: {
  meetingNotes: MeetingNote[]
  voiceChannels: VoiceChannel[]
  workspaceId: number | null
  onCreateMeetingNote: (payload: { title: string; content: string }) => Promise<void>
  onCreateVoiceChannel: (payload: { name: string; description: string }) => Promise<void>
  submitting: boolean
}) {
  const [noteFormOpen, setNoteFormOpen] = useState(false)
  const [channelFormOpen, setChannelFormOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [channelName, setChannelName] = useState('')
  const [channelDescription, setChannelDescription] = useState('')

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateMeetingNote({ title: noteTitle, content: noteContent })
    setNoteTitle('')
    setNoteContent('')
    setNoteFormOpen(false)
  }

  async function submitChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateVoiceChannel({ name: channelName, description: channelDescription })
    setChannelName('')
    setChannelDescription('')
    setChannelFormOpen(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">화상 멘토링 회의록을 실제 문서 API로 관리합니다.</p>
          <PrimaryButton onClick={() => setNoteFormOpen((open) => !open)}>
            <i className="fas fa-plus"></i>
            회의록 작성
          </PrimaryButton>
        </div>

        {noteFormOpen ? (
          <form onSubmit={submitNote} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <TextInput value={noteTitle} onChange={setNoteTitle} placeholder="회의록 제목" required />
            <TextArea value={noteContent} onChange={setNoteContent} placeholder="회의 내용을 입력하세요" rows={8} />
            <div className="flex justify-end">
              <PrimaryButton type="submit" disabled={submitting}>
                저장
              </PrimaryButton>
            </div>
          </form>
        ) : null}

        {meetingNotes.length === 0 ? (
          <EmptyPanel icon="fas fa-clipboard-list" title="회의록이 없습니다" description="라이브 멘토링 후 정리된 회의록이 실제 데이터로 표시됩니다." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortByRecent(meetingNotes).map((note) => (
              <article key={note.noteId} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded bg-[#EDE9FE] px-2 py-1 text-[10px] font-extrabold text-[#7C3AED]">회의록</span>
                  <span className="text-[10px] font-bold text-gray-400">{formatRelativeTime(note.createdAt)}</span>
                </div>
                <h3 className="text-base font-extrabold text-gray-900">{note.title}</h3>
                <p className="mt-3 line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-gray-500">
                  {note.content ?? '회의록 내용이 비어 있습니다.'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <SectionCard
          title="라이브 채널"
          icon="fas fa-video text-red-500"
          action={
            <button type="button" onClick={() => setChannelFormOpen((open) => !open)} className="text-xs font-bold text-gray-400 hover:text-[#00C471]">
              채널 생성
            </button>
          }
        >
          {channelFormOpen ? (
            <form onSubmit={submitChannel} className="mb-4 space-y-3">
              <TextInput value={channelName} onChange={setChannelName} placeholder="채널 이름" required />
              <TextArea value={channelDescription} onChange={setChannelDescription} placeholder="채널 설명" rows={3} />
              <PrimaryButton type="submit" disabled={submitting} className="w-full">
                채널 저장
              </PrimaryButton>
            </form>
          ) : null}

          {voiceChannels.length > 0 ? (
            <div className="space-y-3">
              {voiceChannels.map((channel) => {
                const params = new URLSearchParams()
                params.set('channelId', String(channel.channelId))

                return (
                  <a
                    key={channel.channelId}
                    href={buildHref('live-meeting', workspaceId, params)}
                    className="block rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-[#7C3AED] hover:bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-extrabold text-gray-900">{channel.name}</p>
                      <span className="rounded bg-white px-2 py-1 text-[10px] font-bold text-gray-500">
                        {channel.activeParticipantCount ?? 0}명
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                      {channel.description ?? '채널 설명이 없습니다.'}
                    </p>
                  </a>
                )
              })}
            </div>
          ) : (
            <EmptyPanel icon="fas fa-video-slash" title="라이브 채널이 없습니다" description="화상 멘토링 채널을 생성하면 라이브 룸으로 이동할 수 있습니다." />
          )}
        </SectionCard>
      </aside>
    </div>
  )
}

function LiveMeetingPage({
  workspaceId,
  channels,
  selectedChannelId,
  participants,
  messages,
  minutes,
  onJoin,
  onLeave,
  onSendMessage,
  submitting,
}: {
  workspaceId: number | null
  channels: VoiceChannel[]
  selectedChannelId: number | null
  participants: VoiceParticipant[]
  messages: VoiceChatMessage[]
  minutes: VoiceMinutes | null
  onJoin: (channelId: number) => Promise<void>
  onLeave: (channelId: number) => Promise<void>
  onSendMessage: (channelId: number, content: string) => Promise<void>
  submitting: boolean
}) {
  const [message, setMessage] = useState('')
  const selectedChannel =
    channels.find((channel) => channel.channelId === selectedChannelId) ?? channels[0] ?? null

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedChannel || !message.trim()) {
      return
    }

    await onSendMessage(selectedChannel.channelId, message)
    setMessage('')
  }

  if (!selectedChannel) {
    return (
      <EmptyPanel
        icon="fas fa-video-slash"
        title="열 수 있는 라이브 채널이 없습니다"
        description="화상 멘토링 채널을 먼저 생성하면 이 페이지에서 실제 참여자와 채팅 기록을 확인할 수 있습니다."
        action={
          <a href={buildHref('meeting', workspaceId)} className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#00C471] px-5 text-sm font-bold text-white">
            회의 관리로 이동
          </a>
        }
      />
    )
  }

  return (
    <div className="grid h-[calc(100dvh-220px)] min-h-[620px] gap-6 lg:grid-cols-[1fr_360px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-gray-950 text-white shadow-xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="text-sm font-extrabold">{selectedChannel.name}</p>
            <p className="text-xs text-gray-400">{selectedChannel.description ?? '라이브 멘토링 룸'}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void onJoin(selectedChannel.channelId)}
              disabled={submitting}
              className="h-9 rounded-lg bg-[#00C471] px-4 text-xs font-bold text-white transition hover:bg-green-600 disabled:opacity-60"
            >
              참여
            </button>
            <button
              type="button"
              onClick={() => void onLeave(selectedChannel.channelId)}
              disabled={submitting}
              className="h-9 rounded-lg bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              나가기
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {participants.length > 0 ? (
            participants.map((participant) => (
              <div key={participant.participantId} className="flex min-h-[180px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <Avatar name={participant.userName} className="h-20 w-20 border border-white/10 bg-white/10 text-white" textClassName="text-xl" />
                <p className="mt-4 text-sm font-extrabold">{participant.userName ?? `사용자 ${participant.userId}`}</p>
                <p className="mt-1 text-xs text-gray-400">{participant.muted ? '마이크 꺼짐' : '마이크 켜짐'}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-center">
              <i className="fas fa-user-friends mb-3 text-3xl text-white/20"></i>
              <p className="text-sm font-bold text-gray-300">현재 참여자가 없습니다.</p>
              <p className="mt-2 text-xs text-gray-500">참여 버튼을 누르면 실제 음성 채널 참여 API가 호출됩니다.</p>
            </div>
          )}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col gap-6">
        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <h3 className="text-sm font-extrabold text-gray-900">
              <i className="fas fa-comments mr-2 text-[#7C3AED]"></i>
              라이브 채팅
            </h3>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length > 0 ? (
              messages.map((chat) => (
                <div key={chat.messageId} className="rounded-xl bg-gray-50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-gray-900">{chat.senderName ?? `#${chat.senderId}`}</span>
                    <span className="text-[10px] font-bold text-gray-400">{formatRelativeTime(chat.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">{chat.content}</p>
                </div>
              ))
            ) : (
              <p className="flex h-full items-center justify-center text-center text-xs font-bold text-gray-400">
                아직 채팅 메시지가 없습니다.
              </p>
            )}
          </div>
          <form onSubmit={submitMessage} className="border-t border-gray-100 p-3">
            <div className="flex gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium outline-none"
                placeholder="메시지 보내기"
              />
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="h-8 w-8 shrink-0 rounded-xl bg-[#00C471] text-xs text-white disabled:opacity-60"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-extrabold text-gray-900">
            <i className="fas fa-clipboard-list mr-2 text-[#00C471]"></i>
            AI 회의록
          </h3>
          <p className="line-clamp-5 whitespace-pre-line text-xs leading-relaxed text-gray-500">
            {minutes?.summary || minutes?.transcript || '회의록 데이터가 아직 없습니다.'}
          </p>
        </section>
      </aside>
    </div>
  )
}

function MentoringCommonWorkspaceApp({ page }: { page: MentoringCommonPage }) {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const selectedChannelId = useMemo(getChannelIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [data, setData] = useState<MentoringWorkspaceData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null)
  const [questionDetails, setQuestionDetails] = useState<Map<number, QuestionDetail>>(new Map())
  const [liveParticipants, setLiveParticipants] = useState<VoiceParticipant[]>([])
  const [liveMessages, setLiveMessages] = useState<VoiceChatMessage[]>([])
  const [liveMinutes, setLiveMinutes] = useState<VoiceMinutes | null>(null)
  const [liveReloadKey, setLiveReloadKey] = useState(0)

  useEffect(() => {
    document.title = `DevPath - ${PAGE_CONFIG[page].title}`
    document.documentElement.classList.add('internal-page-scroll-document')
    document.body.classList.add('internal-page-scroll-body')

    return () => {
      document.documentElement.classList.remove('internal-page-scroll-document')
      document.body.classList.remove('internal-page-scroll-body')
    }
  }, [page])

  useEffect(() => {
    const currentSession = readStoredAuthSession()
    setSession(currentSession)

    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return undefined
    }

    if (!currentSession?.accessToken) {
      setAuthView('login')
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [
          dashboard,
          tasks,
          events,
          questions,
          files,
          erd,
          erdVersions,
          meetingNotes,
          voiceChannels,
          notices,
        ] = await Promise.all([
          projectApiRequest<WorkspaceDashboard>(
            `/api/workspaces/${workspaceId}/dashboard`,
            { signal: controller.signal },
            'required',
          ),
          projectApiRequest<WorkspaceTask[]>(
            `/api/workspaces/${workspaceId}/tasks`,
            { signal: controller.signal },
            'required',
          ),
          projectApiRequest<CalendarEvent[]>(
            `/api/workspaces/${workspaceId}/calendar-events`,
            { signal: controller.signal },
            'required',
          ),
          projectApiRequest<QuestionSummary[]>(
            `/api/workspaces/${workspaceId}/questions`,
            { signal: controller.signal },
            'required',
          ),
          projectApiRequest<WorkspaceFile[]>(
            `/api/workspaces/${workspaceId}/files`,
            { signal: controller.signal },
            'required',
          ),
          optionalRequest(
            projectApiRequest<WorkspaceErdDocument>(
              `/api/workspaces/${workspaceId}/erd`,
              { signal: controller.signal },
              'required',
            ),
            null,
          ),
          optionalRequest(
            projectApiRequest<WorkspaceErdVersion[]>(
              `/api/workspaces/${workspaceId}/erd/versions`,
              { signal: controller.signal },
              'required',
            ),
            [],
          ),
          projectApiRequest<MeetingNote[]>(
            `/api/workspaces/${workspaceId}/meeting-notes`,
            { signal: controller.signal },
            'required',
          ),
          projectApiRequest<VoiceChannel[]>(
            `/api/workspaces/${workspaceId}/voice-channels`,
            { signal: controller.signal },
            'required',
          ),
          optionalRequest(
            projectApiRequest<WorkspaceNotice[]>(
              `/api/workspaces/${workspaceId}/notices`,
              { signal: controller.signal },
              'required',
            ),
            [],
          ),
        ])

        if (controller.signal.aborted) {
          return
        }

        setData({
          dashboard,
          tasks: sortByRecent(tasks ?? []),
          events: [...(events ?? [])].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()),
          questions: sortByRecent(questions ?? []),
          files: sortByRecent(files ?? []),
          erd,
          erdVersions: sortByRecent(erdVersions ?? []),
          meetingNotes: sortByRecent(meetingNotes ?? []),
          voiceChannels: voiceChannels ?? [],
          notices: sortByRecent(notices ?? []),
        })
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : '멘토링 워크스페이스 데이터를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => controller.abort()
  }, [workspaceId, reloadKey])

  const selectedChannel =
    data.voiceChannels.find((channel) => channel.channelId === selectedChannelId) ?? data.voiceChannels[0] ?? null
  const selectedLiveChannelId = selectedChannel?.channelId ?? null

  useEffect(() => {
    if (page !== 'live-meeting' || !selectedLiveChannelId || !session?.accessToken) {
      setLiveParticipants([])
      setLiveMessages([])
      setLiveMinutes(null)
      return undefined
    }

    const controller = new AbortController()

    async function loadLiveData() {
      try {
        const [participants, messages, minutes] = await Promise.all([
          projectApiRequest<VoiceParticipant[]>(
            `/api/voice-channels/${selectedLiveChannelId}/participants`,
            { signal: controller.signal },
            'required',
          ),
          projectApiRequest<VoiceChatMessage[]>(
            `/api/voice-channels/${selectedLiveChannelId}/chat-messages`,
            { signal: controller.signal },
            'required',
          ),
          optionalRequest(
            projectApiRequest<VoiceMinutes>(
              `/api/voice-channels/${selectedLiveChannelId}/minutes`,
              { signal: controller.signal },
              'required',
            ),
            null,
          ),
        ])

        if (!controller.signal.aborted) {
          setLiveParticipants(participants ?? [])
          setLiveMessages(messages ?? [])
          setLiveMinutes(minutes)
        }
      } catch (liveError) {
        if (!controller.signal.aborted) {
          showAuthToast({
            message: liveError instanceof Error ? liveError.message : '라이브 데이터를 불러오지 못했습니다.',
            variant: 'error',
          })
        }
      }
    }

    void loadLiveData()

    return () => controller.abort()
  }, [page, selectedLiveChannelId, session?.accessToken, liveReloadKey])

  const memberById = useMemo(() => {
    const map = new Map<number, WorkspaceMember>()
    data.dashboard?.members.forEach((member) => {
      map.set(member.learnerId, member)
    })

    return map
  }, [data.dashboard?.members])

  const memberNameById = useMemo(() => {
    const map = new Map<number, string>()
    data.dashboard?.members.forEach((member) => {
      if (member.learnerName) {
        map.set(member.learnerId, member.learnerName)
      }
    })

    return map
  }, [data.dashboard?.members])

  const currentMember = session?.userId ? memberById.get(session.userId) : null
  const assignedTasks = session?.userId ? data.tasks.filter((task) => task.assigneeId === session.userId) : []
  const personalTasks = assignedTasks.length > 0 ? assignedTasks : data.tasks
  const doneTaskCount = personalTasks.filter((task) => task.status === 'DONE').length
  const progressPercent = percent(doneTaskCount, personalTasks.length)
  const currentWeek = personalTasks.length === 0 ? 1 : Math.min(4, Math.max(1, Math.ceil(Math.max(progressPercent, 1) / 25)))

  function refreshAll() {
    setReloadKey((key) => key + 1)
  }

  function refreshLive() {
    setLiveReloadKey((key) => key + 1)
    refreshAll()
  }

  async function withSubmit(action: () => Promise<void>, successMessage: string) {
    setSubmitting(true)

    try {
      await action()
      showAuthToast({ message: successMessage })
      refreshAll()
    } catch (submitError) {
      showAuthToast({
        message: submitError instanceof Error ? submitError.message : '요청을 처리하지 못했습니다.',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function createTask(payload: { title: string; description: string; priority: TaskPriority; dueDate: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: payload.title,
              description: payload.description || null,
              priority: payload.priority,
              assigneeId: session?.userId ?? null,
              dueDate: payload.dueDate || null,
            }),
          },
          'required',
        ).then(() => undefined),
      '과제를 추가했습니다.',
    )
  }

  async function updateTaskStatus(task: WorkspaceTask, status: TaskStatus) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks/${task.taskId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          },
          'required',
        ).then(() => undefined),
      '과제 상태를 변경했습니다.',
    )
  }

  async function createQuestion(payload: { title: string; content: string; difficulty: string; templateType: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        projectApiRequest<QuestionDetail>(
          `/api/workspaces/${workspaceId}/questions`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: payload.title,
              content: payload.content,
              difficulty: payload.difficulty,
              templateType: payload.templateType,
            }),
          },
          'required',
        ).then(() => undefined),
      '질문을 등록했습니다.',
    )
  }

  async function toggleQuestion(questionId: number) {
    if (expandedQuestionId === questionId) {
      setExpandedQuestionId(null)
      return
    }

    setExpandedQuestionId(questionId)

    if (questionDetails.has(questionId)) {
      return
    }

    try {
      const detail = await projectApiRequest<QuestionDetail>(
        `/api/workspace-questions/${questionId}`,
        {},
        'required',
      )
      setQuestionDetails((previous) => {
        const next = new Map(previous)
        next.set(questionId, detail)
        return next
      })
    } catch (detailError) {
      showAuthToast({
        message: detailError instanceof Error ? detailError.message : '질문 상세를 불러오지 못했습니다.',
        variant: 'error',
      })
    }
  }

  async function createEvent(payload: { title: string; description: string; startAt: string; endAt: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        projectApiRequest<CalendarEvent>(
          `/api/workspaces/${workspaceId}/calendar-events`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: payload.title,
              description: payload.description || null,
              startAt: payload.startAt,
              endAt: payload.endAt,
            }),
          },
          'required',
        ).then(() => undefined),
      '일정을 추가했습니다.',
    )
  }

  async function uploadFile(file: File) {
    if (!workspaceId) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    await withSubmit(
      () =>
        projectApiRequest<WorkspaceFile>(
          `/api/workspaces/${workspaceId}/files`,
          {
            method: 'POST',
            body: formData,
          },
          'required',
        ).then(() => undefined),
      '파일을 업로드했습니다.',
    )
  }

  async function saveErd(payload: { mermaidCode: string; schemaJson: string; changeSummary: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        projectApiRequest<WorkspaceErdDocument>(
          `/api/workspaces/${workspaceId}/erd`,
          {
            method: 'PUT',
            body: JSON.stringify({
              mermaidCode: payload.mermaidCode,
              schemaJson: payload.schemaJson || null,
              changeSummary: payload.changeSummary || null,
            }),
          },
          'required',
        ).then(() => undefined),
      'ERD를 저장했습니다.',
    )
  }

  async function createMeetingNote(payload: { title: string; content: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        projectApiRequest<MeetingNote>(
          `/api/workspaces/${workspaceId}/meeting-notes`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: payload.title,
              content: payload.content || null,
            }),
          },
          'required',
        ).then(() => undefined),
      '회의록을 저장했습니다.',
    )
  }

  async function createVoiceChannel(payload: { name: string; description: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        projectApiRequest<VoiceChannel>(
          '/api/voice-channels',
          {
            method: 'POST',
            body: JSON.stringify({
              workspaceId,
              name: payload.name,
              description: payload.description || null,
            }),
          },
          'required',
        ).then(() => undefined),
      '라이브 채널을 생성했습니다.',
    )
  }

  async function joinChannel(channelId: number) {
    await withSubmit(
      () =>
        projectApiRequest<VoiceParticipant>(
          `/api/voice-channels/${channelId}/join`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
          'required',
        ).then(() => undefined),
      '라이브 채널에 참여했습니다.',
    )
    refreshLive()
  }

  async function leaveChannel(channelId: number) {
    await withSubmit(
      () =>
        projectApiRequest<VoiceParticipant>(
          `/api/voice-channels/${channelId}/leave`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
          'required',
        ).then(() => undefined),
      '라이브 채널에서 나갔습니다.',
    )
    refreshLive()
  }

  async function sendLiveMessage(channelId: number, content: string) {
    setSubmitting(true)

    try {
      await projectApiRequest<VoiceChatMessage>(
        `/api/voice-channels/${channelId}/chat-messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        },
        'required',
      )
      setLiveReloadKey((key) => key + 1)
    } catch (messageError) {
      showAuthToast({
        message: messageError instanceof Error ? messageError.message : '메시지를 보내지 못했습니다.',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
    setReloadKey((key) => key + 1)
  }

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return (
          <DashboardPage
            data={data}
            personalTasks={personalTasks}
            progressPercent={progressPercent}
            currentWeek={currentWeek}
            workspaceId={workspaceId}
          />
        )
      case 'workspace':
        return (
          <WorkspacePage
            tasks={personalTasks}
            members={data.dashboard?.members ?? []}
            memberNameById={memberNameById}
            search={taskSearch}
            setSearch={setTaskSearch}
            onCreateTask={createTask}
            onUpdateTaskStatus={updateTaskStatus}
            submitting={submitting}
          />
        )
      case 'curriculum':
        return <CurriculumPage tasks={personalTasks} questions={data.questions} progressPercent={progressPercent} />
      case 'qna':
        return (
          <QnaPage
            questions={data.questions}
            questionDetails={questionDetails}
            expandedQuestionId={expandedQuestionId}
            onToggleQuestion={(questionId) => void toggleQuestion(questionId)}
            onCreateQuestion={createQuestion}
            submitting={submitting}
          />
        )
      case 'schedule':
        return <SchedulePage events={data.events} onCreateEvent={createEvent} submitting={submitting} />
      case 'files':
        return <FilesPage files={data.files} onUploadFile={uploadFile} submitting={submitting} />
      case 'erd':
        return (
          <ErdPage
            key={`${data.erd?.version ?? 0}-${data.erd?.updatedAt ?? 'empty'}`}
            erd={data.erd}
            versions={data.erdVersions}
            onSaveErd={saveErd}
            submitting={submitting}
          />
        )
      case 'meeting':
        return (
          <MeetingPage
            meetingNotes={data.meetingNotes}
            voiceChannels={data.voiceChannels}
            workspaceId={workspaceId}
            onCreateMeetingNote={createMeetingNote}
            onCreateVoiceChannel={createVoiceChannel}
            submitting={submitting}
          />
        )
      case 'live-meeting':
        return (
          <LiveMeetingPage
            workspaceId={workspaceId}
            channels={data.voiceChannels}
            selectedChannelId={selectedChannelId}
            participants={liveParticipants}
            messages={liveMessages}
            minutes={liveMinutes}
            onJoin={joinChannel}
            onLeave={leaveChannel}
            onSendMessage={sendLiveMessage}
            submitting={submitting}
          />
        )
    }
  }

  return (
    <>
      <MentoringShell
        page={page}
        workspaceId={workspaceId}
        dashboard={data.dashboard}
        memberName={currentMember?.learnerName ?? session?.name}
        memberProfileImage={currentMember?.profileImage}
      >
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-100 bg-white text-sm font-bold text-gray-400">
            멘토링 워크스페이스 데이터를 불러오는 중입니다.
          </div>
        ) : error ? (
          <EmptyPanel icon="fas fa-circle-exclamation" title="데이터를 불러오지 못했습니다" description={error} />
        ) : (
          renderPage()
        )}
      </MentoringShell>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </>
  )
}

export default MentoringCommonWorkspaceApp
