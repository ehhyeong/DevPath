import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import UserAvatar from './components/UserAvatar'
import { userApi } from './lib/api'
import {
  getPostLoginRedirect,
  readStoredAuthSession,
} from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from './lib/profile-sync'
import {
  createMentoringCalendarEvent,
  createMentoringFileLink,
  createMentoringMeetingNote,
  createMentoringQuestion,
  createMentoringTask,
  createMentoringVoiceChannel,
  fetchMentoringQuestionDetail,
  joinMentoringVoiceChannel,
  leaveMentoringVoiceChannel,
  loadMentoringHeaderNotifications,
  loadMentoringLiveChannelData,
  loadMentoringWorkspaceData,
  saveMentoringErd,
  sendMentoringDirectMessage,
  sendMentoringVoiceMessage,
  updateMentoringTaskStatus,
  uploadMentoringWorkspaceFile,
} from './mentoring-common-workspace-api'

import type {
  CalendarEvent,
  MeetingNote,
  MentoringCommonPage,
  MentoringHeaderNotification,
  MentoringWorkspaceData,
  PageConfig,
  QuestionDetail,
  QuestionSummary,
  TaskPriority,
  TaskStatus,
  VoiceChannel,
  VoiceChatMessage,
  VoiceMinutes,
  VoiceParticipant,
  WorkspaceDashboard,
  WorkspaceErdDocument,
  WorkspaceErdVersion,
  WorkspaceFile,
  WorkspaceMember,
  WorkspaceTask,
} from './mentoring-common-workspace-types'

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
    items: ['workspace', 'schedule', 'files', 'meeting', 'erd'] as MentoringCommonPage[],
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

function buildMentoringNotificationHref(path: string, workspaceId: number | null) {
  const normalizedPath = path.endsWith('.html') ? path.replace(/\.html$/, '') : path
  const basePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  const [pathname, queryString] = basePath.split('?')
  const params = new URLSearchParams(queryString)

  if (workspaceId) {
    params.set('workspaceId', String(workspaceId))
  }

  const query = params.toString()

  return query ? `${pathname}?${query}` : pathname
}

function renderMentoringNotificationMessage(notification: MentoringHeaderNotification) {
  const highlight = notification.highlightText?.trim()

  if (!highlight || !notification.message.includes(highlight)) {
    return notification.message
  }

  const [before, ...rest] = notification.message.split(highlight)
  const after = rest.join(highlight)

  return (
    <>
      {before}
      <strong>{highlight}</strong>
      {after}
    </>
  )
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

function initials(name?: string | null) {
  const trimmed = name?.trim()

  if (!trimmed) {
    return 'U'
  }

  return trimmed.slice(0, 2).toUpperCase()
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
  id?: string | null
  name: string
  columns?: ErdColumnSchema[] | null
  x?: number | null
  y?: number | null
}

type ErdRelationshipSchema = {
  id?: string | null
  from: string
  to: string
  label?: string | null
  type?: string | null
}

type ParsedErdSchema = {
  tables: ErdTableSchema[]
  relationships: ErdRelationshipSchema[]
}

type ErdTool = 'select' | 'connect'
type ErdRelationType = '1:1' | '1:N' | 'N:M'
type ErdDragState = {
  tableId: string
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

const ERD_TABLE_WIDTH = 240
const ERD_HEADER_HEIGHT = 41
const ERD_COLUMN_HEIGHT = 33

function getErdRelationshipId(relationship: ErdRelationshipSchema) {
  return relationship.id ?? `${relationship.from}-${relationship.to}`
}

function getErdRelationCardinality(type?: string | null) {
  switch (type) {
    case '1:1':
      return { source: '1', target: '1' }
    case 'N:M':
      return { source: 'N', target: 'N' }
    case '1:N':
    default:
      return { source: '1', target: 'N' }
  }
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

function toErdSlug(value: string) {
  const slug = value.trim().replace(/[^A-Za-z0-9_가-힣-]+/g, '-').replace(/-+/g, '-')

  return slug || 'table'
}

function makeErdTableId(table: ErdTableSchema, index: number) {
  return table.id?.trim() || `table-${toErdSlug(table.name)}-${index + 1}`
}

function normalizeErdSchema(schema: ParsedErdSchema): ParsedErdSchema {
  const tables = schema.tables.map((table, index) => {
    const position = getErdTablePosition(table, index)

    return {
      ...table,
      id: makeErdTableId(table, index),
      name: table.name?.trim() || 'Unnamed',
      columns: table.columns ?? [],
      x: position.x,
      y: position.y,
    }
  })
  const tableByName = new Map(tables.map((table) => [table.name, table]))
  const tableById = new Map(tables.map((table) => [table.id ?? table.name, table]))
  const relationships = schema.relationships.reduce<ErdRelationshipSchema[]>((items, relationship, index) => {
    const from = tableById.get(relationship.from) ?? tableByName.get(relationship.from)
    const to = tableById.get(relationship.to) ?? tableByName.get(relationship.to)

    if (!from || !to) {
      return items
    }

    items.push({
      ...relationship,
      id: relationship.id?.trim() || `conn-${index + 1}`,
      from: from.id ?? from.name,
      to: to.id ?? to.name,
      type: (relationship.type ?? relationship.label ?? '1:N') as ErdRelationType,
    })

    return items
  }, [])

  return { tables, relationships }
}

function erdRelationToMermaid(type?: string | null) {
  switch (type) {
    case '1:1':
      return '||--||'
    case 'N:M':
      return '}o--o{'
    case '1:N':
    default:
      return '||--o{'
  }
}

function generateMermaidErd(tables: ErdTableSchema[], relationships: ErdRelationshipSchema[]) {
  const tableById = new Map(tables.map((table) => [table.id ?? table.name, table]))
  const lines = ['erDiagram']

  relationships.forEach((relationship) => {
    const from = tableById.get(relationship.from)
    const to = tableById.get(relationship.to)

    if (!from || !to) {
      return
    }

    lines.push(`  ${from.name || 'Unnamed'} ${erdRelationToMermaid(relationship.type)} ${to.name || 'Unnamed'} : ${relationship.type ?? '1:N'}`)
  })

  tables.forEach((table) => {
    lines.push(`  ${table.name || 'Unnamed'} {`)
    ;(table.columns ?? []).forEach((column) => {
      const key = column.primary ? ' PK' : column.foreign ? ' FK' : ''
      lines.push(`    ${column.type || 'VARCHAR'} ${column.name || 'column'}${key}`)
    })
    lines.push('  }')
  })

  return lines.join('\n')
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

function DashboardInlineEmpty({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: string
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`mentoring-dashboard-inline-empty ${className}`}>
      <div className="mentoring-dashboard-inline-empty-icon">
        <i className={icon}></i>
      </div>
      <p className="mentoring-dashboard-inline-empty-title">{title}</p>
      <p className="mentoring-dashboard-inline-empty-copy">{description}</p>
      {action ? <div className="mentoring-dashboard-inline-empty-action">{action}</div> : null}
    </div>
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

function SourceFormModal({
  open,
  title,
  icon,
  widthClass = 'max-w-md',
  bodyClass = 'p-6 space-y-5',
  onClose,
  onSubmit,
  children,
  footer,
}: {
  open: boolean
  title: string
  icon?: string
  widthClass?: string
  bodyClass?: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  footer: ReactNode
}) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className={`modal-content relative w-full overflow-hidden rounded-3xl bg-white shadow-2xl ${widthClass}`}>
        <form onSubmit={onSubmit}>
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              {icon ? <i className={`${icon} text-brand`}></i> : null}
              {title}
            </h3>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className={bodyClass}>{children}</div>

          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">{footer}</div>
        </form>
      </div>
    </div>
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
  const sourceBodyOwnsHeading = ['dashboard', 'curriculum', 'qna', 'workspace', 'schedule', 'files', 'meeting', 'erd'].includes(page)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<MentoringHeaderNotification[]>([])
  const [clearedNotifications, setClearedNotifications] = useState(false)
  const [noticeModal, setNoticeModal] = useState<{ title: string; body: string; timeLabel?: string | null } | null>(null)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const visibleNotifications = workspaceId && !clearedNotifications ? notifications : []
  const hasNotifications = visibleNotifications.length > 0
  const notificationTitle = page === 'dashboard' ? '새로운 알림' : '알림'

  useEffect(() => {
    if (!workspaceId) {
      setNotifications([])
      setClearedNotifications(false)
      return undefined
    }

    const controller = new AbortController()

    loadMentoringHeaderNotifications(workspaceId, page, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setNotifications(items ?? [])
          setClearedNotifications(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setNotifications([])
          setClearedNotifications(false)
        }
      })

    return () => controller.abort()
  }, [page, workspaceId])

  function openNotification(notification: MentoringHeaderNotification) {
    if (notification.modalTitle || notification.modalBody) {
      setNoticeModal({
        title: notification.modalTitle ?? '멘토 공지사항',
        body: notification.modalBody ?? notification.message,
        timeLabel: notification.timeLabel,
      })
      setNotificationOpen(false)
      return
    }

    if (notification.targetPath) {
      window.location.assign(buildMentoringNotificationHref(notification.targetPath, workspaceId))
    }
  }

  return (
    <div className={`mentoring-common-page mentoring-common-${page}-page flex h-screen overflow-hidden bg-[#F3F4F6] text-gray-800`}>
      <aside className={`${sidebarPinned ? 'pinned ' : ''}mentoring-common-sidebar group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64`}>
        <div className="flex h-20 shrink-0 cursor-pointer items-center border-b border-gray-100 px-5 transition hover:bg-gray-50">
          <a href="/workspace-hub" className="flex min-w-0 flex-1 items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white shadow-md">
              <i className="fas fa-arrow-left"></i>
            </div>
            <div className="mentoring-sidebar-text ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mentoring</p>
              <p className="w-36 truncate font-bold text-gray-900">{projectName}</p>
            </div>
          </a>
          <button
            type="button"
            onClick={() => setSidebarPinned((current) => !current)}
            className="mentoring-sidebar-pin ml-0 flex h-7 w-0 items-center justify-center overflow-hidden rounded-md text-gray-400 opacity-0 transition-all duration-300 hover:bg-gray-100 hover:text-[#7C3AED] group-hover:ml-2 group-hover:w-7 group-hover:opacity-100"
            title={sidebarPinned ? '사이드바 고정 해제' : '사이드바 고정'}
          >
            <i className={sidebarPinned ? 'fas fa-thumbtack text-xs' : 'fas fa-thumbtack rotate-45 text-xs'}></i>
          </button>
        </div>

        <nav className="custom-scrollbar mt-2 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mentoring-sidebar-section h-0 overflow-hidden px-4 text-[10px] font-bold uppercase text-gray-400 opacity-0 transition-all duration-300 group-hover:mt-6 group-hover:mb-2 group-hover:h-auto group-hover:opacity-100">
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
                    <span className="mentoring-sidebar-text ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
                      {PAGE_CONFIG[item].label}
                    </span>
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
          <UserAvatar
            name={memberName ?? 'Mentee'}
            imageUrl={memberProfileImage}
            className="h-10 w-10 shrink-0 bg-white"
            iconClassName="text-sm"
            alt={`${memberName ?? 'Mentee'} profile`}
          />
          <div className="mentoring-sidebar-text ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
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
          </div>

          <div className="relative flex items-center gap-4">
            <button
              type="button"
              className="relative p-2 text-gray-400 transition hover:text-[#00C471]"
              title="알림"
              onClick={() => setNotificationOpen((open) => !open)}
            >
              <i className="far fa-bell text-lg"></i>
              {hasNotifications ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-red-500"></span> : null}
            </button>

            {notificationOpen ? (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-50 p-4">
                  <h3 className="text-sm font-bold">{notificationTitle}</h3>
                  <button
                    type="button"
                    className="text-xs text-gray-400 transition hover:text-gray-600"
                    onClick={() => setClearedNotifications(true)}
                  >
                    지우기
                  </button>
                </div>
                <div className="custom-scrollbar max-h-60 overflow-y-auto">
                  {visibleNotifications.length > 0 ? (
                    visibleNotifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className="block w-full cursor-pointer border-b border-gray-50 p-3 text-left transition hover:bg-gray-50"
                        onClick={() => openNotification(notification)}
                      >
                        <p className="text-xs leading-relaxed text-gray-800">
                          {renderMentoringNotificationMessage(notification)}
                        </p>
                        {notification.actionLabel ? (
                          <span className="mt-1 inline-block text-[10px] font-bold text-[#00C471]">
                            {notification.actionLabel}
                          </span>
                        ) : null}
                        <span className={`${notification.actionLabel ? 'ml-2' : ''} mt-1 inline-block text-[10px] text-gray-400`}>
                          {notification.timeLabel}
                        </span>
                      </button>
                    ))
                  ) : page === 'dashboard' ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-70">
                      <i className="far fa-bell-slash mb-2 text-2xl text-gray-300"></i>
                      <p className="text-center text-xs text-gray-400">새로운 알림이 없습니다.</p>
                    </div>
                  ) : (
                    <p className="p-6 text-center text-xs text-gray-400">새로운 알림이 없습니다.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <div className="mentoring-common-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
          <div className="mentoring-common-container mx-auto max-w-6xl space-y-6">
            {sourceBodyOwnsHeading ? null : (
              <div className="mentoring-common-page-heading flex flex-col gap-2">
                <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                  <i className={`${pageConfig.icon} text-[#00C471]`}></i>
                  {pageConfig.title}
                </h1>
                <p className="text-sm text-gray-500">
                  실제 워크스페이스 데이터를 기준으로 멘토링 공통과제 진행 상태를 관리합니다.
                </p>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>

      {noticeModal ? (
        <div className="modal-overlay active fixed inset-0 z-[1040] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="modal-content w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-bullhorn text-yellow-500"></i>
                {noticeModal.title}
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"
                onClick={() => setNoticeModal(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="custom-scrollbar max-h-[60vh] overflow-y-auto bg-[#F8F9FA] p-8">
              <p className="text-sm font-medium leading-relaxed text-gray-600">{noticeModal.body}</p>
              {noticeModal.timeLabel ? <p className="mt-4 text-xs font-bold text-gray-400">{noticeModal.timeLabel}</p> : null}
            </div>
            <div className="border-t border-gray-100 bg-white p-4">
              <button
                type="button"
                className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
                onClick={() => setNoticeModal(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DashboardPage({
  data,
  personalTasks,
  progressPercent,
  currentWeek,
  workspaceId,
  onSendMentorDm,
  submitting,
}: {
  data: MentoringWorkspaceData
  personalTasks: WorkspaceTask[]
  progressPercent: number
  currentWeek: number
  workspaceId: number | null
  onSendMentorDm: (content: string) => Promise<void>
  submitting: boolean
}) {
  const [dmModalOpen, setDmModalOpen] = useState(false)
  const [dmContent, setDmContent] = useState('')
  const dashboard = data.dashboard
  const activeTasks = personalTasks.filter((task) => task.status !== 'DONE').slice(0, 2)
  const activeTask = activeTasks[0]
  const recentFiles = sortByRecent(data.files).slice(0, 3)
  const notices = sortByRecent(data.notices).slice(0, 3)
  const answeredQuestions = data.questions
    .filter((question) => question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED')
    .slice(0, 2)
  const recentQuestions = sortByRecent(data.questions).slice(0, 2)

  async function submitMentorDm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!dmContent.trim()) {
      showAuthToast({ message: '메시지 내용을 입력해주세요.', variant: 'error' })
      return
    }

    await onSendMentorDm(dmContent)
    setDmContent('')
    setDmModalOpen(false)
  }

  return (
    <>
      <section className="mentoring-dashboard-hero relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:flex-row">
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
            <SecondaryButton
              className="mentoring-dashboard-dm-button"
              onClick={() => {
                setDmContent('')
                setDmModalOpen(true)
              }}
              disabled={!dashboard?.ownerId}
            >
              <i className="fas fa-envelope"></i>
              멘토에게 DM 보내기
            </SecondaryButton>
          </div>
        </div>

        <a
          href={buildHref('curriculum', workspaceId)}
          className="mentoring-dashboard-progress-card relative z-10 w-full rounded-2xl border border-gray-100 bg-gray-50 p-5 transition hover:shadow-md md:w-72"
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

      <div className="mentoring-dashboard-grid grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="mentoring-dashboard-main-col space-y-6 lg:col-span-2">
            <SectionCard title="이번 주 미션" icon="fas fa-flag-checkered text-[#7C3AED]" className="mentoring-dashboard-card mentoring-dashboard-mission-card">
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
                    <div className="mentoring-dashboard-mission-footer mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-5 text-[10px] font-bold text-gray-400">
                      <div className="flex items-center gap-3">
                        <span>
                          <i className="far fa-clock mr-1"></i>
                          {activeTask.dueDate ? `${formatDate(activeTask.dueDate)} 마감` : '기한 없음'}
                        </span>
                        <span>
                          <i className="fas fa-fire mr-1 text-red-500"></i>
                          {priorityLabel(activeTask.priority)}
                        </span>
                      </div>
                      <a href={buildHref('curriculum', workspaceId)} className="mentoring-dashboard-submit-button">
                        <i className="fas fa-upload"></i>
                        과제 제출하기
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <DashboardInlineEmpty
                  icon="fas fa-tasks"
                  title="진행 중인 미션이 없습니다."
                  description="멘토가 공통 과제를 등록하면 이번 주 미션으로 표시됩니다."
                  action={
                    <a href={buildHref('curriculum', workspaceId)} className="mentoring-dashboard-outline-button">
                      커리큘럼으로 이동
                    </a>
                  }
                />
              )}
            </SectionCard>

            <SectionCard
              title="최근 자료"
              icon="fas fa-folder-open text-yellow-500"
              className="mentoring-dashboard-card mentoring-dashboard-files-card"
              action={
                <a href={buildHref('files', workspaceId)} className="mentoring-dashboard-card-link">
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
                <DashboardInlineEmpty
                  icon="fas fa-file-alt"
                  title="아직 등록된 자료가 없습니다."
                  description="학습을 지원하는 첫 번째 자료가 공유되면 이곳에 표시됩니다."
                  className="mentoring-dashboard-files-empty"
                  action={
                    <a href={buildHref('files', workspaceId)} className="mentoring-dashboard-outline-button">
                      + 자료 업로드 하러가기
                    </a>
                  }
                />
              )}
            </SectionCard>
          </div>

          <div className="mentoring-dashboard-side-col space-y-6">
            <SectionCard title="내 과제 피드백 현황" icon="fas fa-code-branch text-[#00C471]" className="mentoring-dashboard-card mentoring-dashboard-summary-card">
              {answeredQuestions.length > 0 ? (
                <div className="space-y-3">
                  {answeredQuestions.map((question) => (
                    <a key={question.id} href={buildHref('qna', workspaceId)} className="mentoring-dashboard-feedback-item">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="mentoring-dashboard-feedback-badge">Feedback Arrived</span>
                        <span className="text-[10px] font-bold text-gray-500">{formatRelativeTime(question.createdAt)}</span>
                      </div>
                      <p className="line-clamp-2 text-xs font-bold leading-tight text-gray-900">{question.title}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <DashboardInlineEmpty
                  icon="fas fa-comment-dots"
                  title="아직 온 피드백이 없습니다."
                  description="과제를 제출하면 멘토의 리뷰가 이곳에 표시됩니다."
                  action={
                    <a href={buildHref('curriculum', workspaceId)} className="mentoring-dashboard-outline-button">
                      피드백 게시판 이동
                    </a>
                  }
                />
              )}
            </SectionCard>

            <SectionCard
              title="멘토 공지사항"
              icon="fas fa-bullhorn text-yellow-500"
              className="mentoring-dashboard-card mentoring-dashboard-notice-card"
              action={
                <a href={buildHref('curriculum', workspaceId)} className="mentoring-dashboard-card-link">
                  전체보기 <i className="fas fa-chevron-right"></i>
                </a>
              }
            >
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
                <DashboardInlineEmpty icon="fas fa-bullhorn" title="등록된 공지사항이 없습니다." description="새로운 공지가 올라오면 이곳에 표시됩니다." />
              )}
            </SectionCard>

            <SectionCard
              title="오늘의 개인 할 일"
              icon="fas fa-columns text-green-500"
              className="mentoring-dashboard-card mentoring-dashboard-live-card"
              action={<span className={activeTasks.length > 0 ? 'mentoring-dashboard-count-badge active' : 'mentoring-dashboard-count-badge'}>진행 중 {activeTasks.length}</span>}
            >
              {activeTasks.length > 0 ? (
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <a key={task.taskId} href={buildHref('workspace', workspaceId)} className="mentoring-dashboard-task-item">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="mentoring-dashboard-task-source">{task.dueDate ? formatDate(task.dueDate) : '개인 학습'}</span>
                        <span className={task.priority === 'HIGH' ? 'mentoring-dashboard-priority-badge high' : 'mentoring-dashboard-priority-badge'}>
                          {priorityLabel(task.priority)}
                        </span>
                      </div>
                      <h4 className="mb-1 line-clamp-1 text-xs font-bold text-gray-900">{task.title}</h4>
                      <p className="line-clamp-1 text-[11px] text-gray-500">{task.description ?? '상세 설명이 없습니다.'}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-gray-400">
                        <span>
                          <i className="far fa-clock"></i> {task.dueDate ? `${formatDate(task.dueDate)} 마감` : '기한 없음'}
                        </span>
                        <span>{statusLabel(task.status)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <DashboardInlineEmpty icon="fas fa-tasks" title="진행 중인 할 일이 없습니다." description="이번 주 학습 목표를 세우고 일정을 관리해보세요." />
              )}
              <a href={buildHref('workspace', workspaceId)} className="mentoring-dashboard-wide-button">
                개인 칸반보드로 이동
              </a>
            </SectionCard>

            <SectionCard title="멘토 Q&A" icon="fas fa-question-circle text-blue-500" className="mentoring-dashboard-card mentoring-dashboard-note-card">
              {recentQuestions.length > 0 ? (
                <div className="space-y-4">
                  {recentQuestions.map((question) => {
                    const answered = question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED'

                    return (
                      <a key={question.id} href={buildHref('qna', workspaceId)} className="mentoring-dashboard-qna-item">
                        <div className="mb-1.5 flex items-start gap-2">
                          <span className={answered ? 'mentoring-dashboard-qna-badge answered' : 'mentoring-dashboard-qna-badge'}>
                            {answered ? '답변 완료' : '답변 대기'}
                          </span>
                          <p className="line-clamp-1 text-xs font-bold text-gray-800">{question.title}</p>
                        </div>
                        <p className="truncate rounded-lg border border-gray-100 bg-gray-50 p-2 pl-11 text-[10px] font-medium text-gray-500">
                          답변 {question.answerCount}개 · 조회 {question.viewCount}
                        </p>
                      </a>
                    )
                  })}
                </div>
              ) : (
                <DashboardInlineEmpty icon="fas fa-question" title="등록된 질문이 없습니다." description="막히는 부분이 있다면 언제든지 멘토에게 물어보세요." />
              )}
              <a href={buildHref('qna', workspaceId)} className="mentoring-dashboard-wide-button white">
                Q&A 전체 보기 / 질문 남기기
              </a>
            </SectionCard>
          </div>
      </div>

      {dmModalOpen ? (
        <div className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={submitMentorDm} className="modal-content w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-envelope text-[#00C471]"></i>
                멘토에게 메시지 보내기
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition hover:text-gray-900"
                onClick={() => setDmModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <Avatar
                name={dashboard?.ownerName}
                image={dashboard?.ownerProfileImage}
                className="h-10 w-10 border border-gray-200 bg-white"
                textClassName="text-xs"
              />
              <div>
                <p className="mb-0.5 text-[10px] font-bold text-[#7C3AED]">받는 사람</p>
                <p className="text-sm font-bold text-gray-900">{dashboard?.ownerName ?? '멘토'} 멘토님</p>
              </div>
            </div>
            <textarea
              value={dmContent}
              onChange={(event) => setDmContent(event.target.value)}
              className="h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm shadow-sm outline-none transition focus:border-[#00C471]"
              placeholder="질문이나 요청사항을 예의를 갖춰 작성해주세요. (학습 관련 세부 질문은 가급적 Q&A 게시판을 이용해 주세요!)"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                onClick={() => setDmModalOpen(false)}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting || !dmContent.trim()}
                className="flex items-center gap-2 rounded-xl bg-[#00C471] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className="fas fa-paper-plane"></i>
                전송
              </button>
            </div>
          </form>
        </div>
      ) : null}
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
  const [filter, setFilter] = useState<'all' | 'urgent'>('all')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('3주차 미션')
  const [urgent, setUrgent] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const loweredSearch = search.trim().toLowerCase()
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = loweredSearch
      ? `${task.title} ${task.description ?? ''}`.toLowerCase().includes(loweredSearch)
      : true
    const matchesFilter = filter === 'all' || task.priority === 'HIGH'

    return matchesSearch && matchesFilter
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateTask({ title, description, priority: urgent ? 'HIGH' : 'MEDIUM', dueDate })
    setTitle('')
    setDescription('')
    setCategory('3주차 미션')
    setUrgent(false)
    setDueDate('')
    setFormOpen(false)
  }

  return (
    <div className="mentoring-source-workspace flex min-h-[calc(100vh-160px)] flex-col overflow-hidden">
      <div className="mb-6 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <i className="fas fa-columns text-brand"></i>
            개인 칸반 (To-do)
          </h1>
          <p className="mt-2 text-sm text-gray-500">나의 과제 진행 상황과 개인 학습 일정을 한눈에 관리하세요.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative flex w-44 items-center md:w-60">
            <i className="fas fa-search absolute left-3.5 text-xs text-gray-400"></i>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="할 일 제목, 내용 검색..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs font-medium shadow-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
            />
          </div>
          <div className="hidden rounded-xl border border-gray-200 bg-white p-1 shadow-sm md:flex md:gap-1">
            {[
              ['all', '전체'],
              ['urgent', '긴급'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => setFilter(key as 'all' | 'urgent')}
                className={
                  filter === key
                    ? 'rounded-lg bg-gray-100 px-4 py-1.5 text-xs font-bold text-gray-800 transition'
                    : 'flex items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-bold text-gray-500 transition hover:text-gray-800'
                }
              >
                {key === 'urgent' ? <i className="fas fa-fire text-red-500"></i> : null}
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600"
          >
            <i className="fas fa-plus"></i>
            새 할 일 추가
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex min-h-[520px] flex-1 gap-6 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = filteredTasks.filter((task) => task.status === column.status)

          return (
            <section key={column.status} className="mentoring-source-kanban-col flex min-w-[320px] flex-1 flex-col rounded-2xl border border-gray-200/70 bg-gray-100/70 p-4">
              <div className="mb-4 flex items-center justify-between px-1">
                <h3 className={`text-sm font-extrabold ${column.tone}`}>
                  {column.label}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${column.countTone}`}>{columnTasks.length}</span>
                </h3>
              </div>

              <div className="custom-scrollbar flex min-h-[360px] flex-1 flex-col gap-3 overflow-y-auto">
                {columnTasks.map((task) => {
                  const nextStatus = task.status === 'TODO' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'DONE' : 'TODO'
                  const assigneeName = task.assigneeId ? memberNameById.get(task.assigneeId) ?? `#${task.assigneeId}` : members[0]?.learnerName ?? '미배정'
                  const done = task.status === 'DONE'

                  return (
                    <article
                      key={task.taskId}
                      onDoubleClick={() => void onUpdateTaskStatus(task, nextStatus)}
                      className={`rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#00C471] hover:shadow-md ${
                        done ? 'border-gray-200 bg-gray-50 opacity-75' : task.priority === 'HIGH' ? 'border-red-200' : 'border-gray-200'
                      }`}
                      title="더블클릭하면 다음 상태로 이동합니다."
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">
                          {task.createdById ? '3주차 미션' : '개인 학습'}
                        </span>
                        {task.priority === 'HIGH' ? (
                          <span className="flex items-center gap-1 rounded border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            <i className="fas fa-exclamation-circle"></i>
                            긴급
                          </span>
                        ) : null}
                      </div>
                      <h4 className={`mb-1 text-sm font-bold ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</h4>
                      <p className="mb-3 line-clamp-2 min-h-[32px] text-xs leading-relaxed text-gray-500">
                        {task.description ?? '설명 없음'}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-gray-400">
                        <span>
                          <i className="far fa-clock mr-1"></i>
                          {task.dueDate ? `${formatDate(task.dueDate)} 마감` : '기한 없음'}
                        </span>
                        <span className="truncate">{assigneeName}</span>
                      </div>
                    </article>
                  )
                })}
                {columnTasks.length === 0 ? (
                  <div className="mt-auto mb-[220px] flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-center text-xs font-bold text-gray-400">
                    <i className="fas fa-inbox mb-3 text-2xl text-gray-300"></i>
                    <p>
                      {column.status === 'TODO'
                        ? '현재 대기 중인 작업이 없습니다.'
                        : column.status === 'IN_PROGRESS'
                          ? '현재 진행 중인 작업이 없습니다.'
                          : '완료된 작업이 없습니다.'}
                    </p>
                    <p className="mt-1 font-medium">
                      {column.status === 'TODO'
                        ? '카드를 이곳으로 드래그하거나 새 할 일을 추가하세요.'
                        : column.status === 'IN_PROGRESS'
                          ? '카드를 이곳으로 드래그하세요.'
                          : '카드를 이곳으로 드래그하세요.'}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>

      <SourceFormModal
        open={formOpen}
        title="새 할 일 추가"
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        footer={
          <>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
              취소
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
              <i className="fas fa-save"></i>
              저장
            </button>
          </>
        }
      >
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            할 일 제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="예: Redis 설정 파일 작성하기"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">상세 내용</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-24 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="필요한 작업이나 메모를 기록하세요."
          ></textarea>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-600">카테고리</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none transition focus:border-brand"
            >
              <option value="1주차 미션">1주차 미션</option>
              <option value="2주차 미션">2주차 미션</option>
              <option value="3주차 미션">3주차 미션</option>
              <option value="개인 학습">개인 학습</option>
              <option value="포트폴리오">포트폴리오</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-600">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(event) => setUrgent(event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand accent-red-500 focus:ring-brand"
          />
          <span className="select-none text-sm font-bold text-red-600">🔥 긴급으로 설정 (최우선 처리 필요)</span>
        </label>
      </SourceFormModal>
    </div>
  )
}

function CurriculumPage({
  tasks,
  progressPercent,
}: {
  tasks: WorkspaceTask[]
  progressPercent: number
}) {
  const sourceProgressPercent = Math.max(progressPercent, 75)
  const reviewTask = tasks.find((task) => task.priority === 'HIGH') ?? tasks[1] ?? tasks[0]
  const currentTask = tasks.find((task) => task.status !== 'DONE') ?? tasks[2] ?? tasks[0]

  if (tasks.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="space-y-1">
            <span className="inline-block rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-brand">
              <i className="fas fa-users mr-1"></i>
              공통 과제형
            </span>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">주차별 미션 및 피드백</h1>
            <p className="text-sm text-gray-500">이곳에서 모든 주차의 목표를 확인하고, 과제를 제출하고, 멘토와 리뷰를 주고받습니다.</p>
          </div>
          <div className="w-full shrink-0 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:w-60">
            <div className="mb-1.5 flex items-end justify-between">
              <span className="text-xs font-bold text-gray-400">전체 학습 진행률</span>
              <span className="text-xs font-extrabold text-gray-400">0% (진행 전)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-gray-300" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-4xl text-gray-300 shadow-inner">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <h3 className="mb-3 text-xl font-extrabold text-gray-900">아직 등록된 커리큘럼이 없습니다</h3>
          <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-gray-500">
            멘토가 첫 번째 주차 미션과 커리큘럼을 준비하고 있습니다.
            <br />
            새로운 미션이 등록되면 이곳 타임라인에 표시됩니다.
          </p>
          <button type="button" disabled className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-6 py-3 text-sm font-bold text-gray-400">
            <i className="fas fa-hourglass-half"></i>
            미션 등록 대기 중...
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="space-y-1">
          <span className="inline-block rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-brand">
            <i className="fas fa-users mr-1"></i>
            공통 과제형
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">주차별 미션 및 피드백</h1>
          <p className="text-sm text-gray-500">이곳에서 모든 주차의 목표를 확인하고, 과제를 제출하고, 멘토와 리뷰를 주고받습니다.</p>
        </div>

        <div className="w-full shrink-0 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:w-60">
          <div className="mb-1.5 flex items-end justify-between">
            <span className="text-xs font-bold text-gray-400">전체 학습 진행률</span>
            <span className="text-xs font-extrabold text-mentor">{sourceProgressPercent}% (3주차 진행 중)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-mentor transition-all duration-1000" style={{ width: `${sourceProgressPercent}%` }}></div>
          </div>
        </div>
      </div>

      <div className="relative ml-6 space-y-10 border-l-2 border-gray-200 pb-10">
        <div className="relative pl-8">
          <div className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-brand text-white shadow-sm">
            <i className="fas fa-check text-[10px]"></i>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 opacity-80 shadow-sm transition hover:opacity-100">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-gray-400">WEEK 1</span>
                <h3 className="text-lg font-bold text-gray-900">요구사항 분석 및 ERD 설계</h3>
              </div>
              <span className="rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-brand">
                <i className="fas fa-check-circle mr-1"></i>
                PASS
              </span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-600">비즈니스 요구사항을 분석하여 핵심 엔티티를 정의하고, 정규화를 거쳐 실제 데이터베이스 ERD를 설계합니다.</p>
            <button type="button" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-purple-100 bg-[#EDE9FE] px-3 py-1.5 text-[10px] font-bold text-mentor shadow-sm transition hover:bg-purple-200">
              <i className="fas fa-book-open"></i>
              1주차 학습 자료 및 가이드
            </button>
            <div className="flex items-center justify-between rounded-xl border border-green-100 bg-[#EBFDF5]/50 p-4">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-bold text-brand">최종 멘토 총평</p>
                <p className="truncate pr-4 text-sm font-medium text-gray-700">전체적인 테이블 구조가 요구사항을 잘 반영하고 있습니다. 아주 훌륭합니다!</p>
              </div>
              <button type="button" className="shrink-0 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-brand hover:text-brand">
                리뷰 기록 보기
              </button>
            </div>
          </div>
        </div>

        <div className="relative pl-8">
          <div className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-red-400 text-white shadow-sm">
            <i className="fas fa-exclamation text-[10px]"></i>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-red-300 bg-white p-6 shadow-md">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-red-400"></div>
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-red-500">WEEK 2</span>
                <h3 className="text-lg font-bold text-gray-900">{reviewTask?.title ?? '회원/상품 기능 구현 및 단위 테스트'}</h3>
              </div>
              <span className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-500">
                <i className="fas fa-exclamation-circle"></i>
                수정 요청됨
              </span>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-gray-600">{reviewTask?.description ?? 'Spring Boot를 이용해 핵심 도메인 로직을 구현하고, JUnit5를 이용해 단위 테스트를 작성합니다.'}</p>
            <button type="button" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-purple-100 bg-[#EDE9FE] px-3 py-1.5 text-[10px] font-bold text-mentor shadow-sm transition hover:bg-purple-200">
              <i className="fas fa-book-open"></i>
              2주차 학습 자료 및 가이드
            </button>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900">
                  <i className="fas fa-comments mr-1 text-brand"></i>
                  진행 중인 피드백
                </h4>
                <a href="#" className="text-xs font-bold text-blue-600 hover:underline">
                  <i className="fab fa-github"></i>
                  내 제출 코드 보기
                </a>
              </div>
              <div className="mb-5 flex items-start gap-3">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-backend" alt="" className="h-8 w-8 rounded-full border border-gray-200 bg-white" />
                <div className="relative flex-1 rounded-b-xl rounded-tr-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="absolute -left-1.5 top-3 h-3 w-3 -rotate-45 border-l border-t border-gray-100 bg-white"></div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">멘토 코드마스터 J</span>
                    <span className="text-[10px] text-gray-400">어제 14:30</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-gray-700">상품 재고 차감 로직에서 동시성 이슈가 발생할 수 있습니다. 코드 라인에 남겨둔 코멘트를 확인하시고 다시 올려주세요!</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-brand hover:text-brand">
                  <i className="fas fa-history mr-1"></i>
                  전체 기록 보기
                </button>
                <button type="button" className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600">
                  <i className="fas fa-reply"></i>
                  수정본 제출하기
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative pl-8">
          <div className="timeline-pulse absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-mentor text-white">
            <i className="fas fa-spinner fa-spin text-[10px]"></i>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-mentor bg-white p-6 shadow-md">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-mentor"></div>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-mentor">WEEK 3 (CURRENT)</span>
                <h3 className="text-xl font-bold text-gray-900">{currentTask?.title ?? 'Redis & Kafka를 활용한 부하 분산'}</h3>
              </div>
              <span className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-bold text-yellow-600">새 과제 진행 중</span>
            </div>
            <div className="mb-5 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-700">
              <p>{currentTask?.description ?? '대용량 트래픽 상황을 가정하여, 선착순 쿠폰 발급 API의 병목을 해결하는 것이 이번 주 핵심 과제입니다.'}</p>
            </div>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button type="button" className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-[#EDE9FE] px-4 py-2.5 text-xs font-bold text-mentor shadow-sm transition hover:bg-purple-200">
                <i className="fas fa-book-reader text-sm"></i>
                학습 자료 및 가이드라인 보기
              </button>
              <button type="button" className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-200">
                <i className="fas fa-plus text-green-600"></i>
                내 개인 칸반에 태스크로 추가하기
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <i className="far fa-clock text-gray-400"></i>
                마감 기한: <span className="text-red-500">{currentTask?.dueDate ? `${formatDate(currentTask.dueDate)} 23:59` : '2026.02.24 (화) 23:59'}</span>
              </div>
              <button type="button" className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600">
                <i className="fas fa-upload"></i>
                첫 과제 제출하기
              </button>
            </div>
          </div>
        </div>

        <div className="relative pl-8 opacity-50">
          <div className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#F3F4F6] bg-gray-200 text-gray-400 shadow-sm">
            <i className="fas fa-lock text-[10px]"></i>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
            <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-gray-400">WEEK 4</span>
            <h3 className="text-lg font-bold text-gray-500">성능 튜닝 및 최종 프로젝트 수료</h3>
          </div>
        </div>
      </div>
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
  const [privateQuestion, setPrivateQuestion] = useState(false)
  const answeredCount = questions.filter((question) => question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED').length
  const pendingCount = questions.length - answeredCount
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
    setPrivateQuestion(false)
    setFormOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <i className="fas fa-comments text-blue-500"></i>
            멘토 Q&A
          </h1>
          <p className="mt-2 text-sm text-gray-500">학습 중 발생한 오류나 궁금한 점을 멘토님에게 자유롭게 질문하세요.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600"
        >
          <i className="fas fa-pen"></i>
          질문 작성하기
        </button>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="custom-scrollbar flex gap-6 overflow-x-auto px-2">
          {[
            ['all', questions.length === 0 ? `전체 질문 (${questions.length})` : '전체 질문'],
            ['answered', questions.length === 0 ? `답변 완료 (${answeredCount})` : '답변 완료'],
            ['pending', questions.length === 0 ? `답변 대기중 (${pendingCount})` : '답변 대기중'],
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
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
            placeholder="질문 내용 검색..."
          />
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300 shadow-inner">
            <i className="fas fa-comment-slash text-4xl"></i>
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-900">등록된 질문이 없습니다</h3>
          <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400">
            멘토링 진행 중 궁금한 로직, 아키텍처 구성, 디버깅 이슈 등이 있다면 가장 먼저 질문을 남겨보세요!
          </p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-600"
          >
            <i className="fas fa-pen text-xs"></i>
            첫 질문 작성하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-xs font-bold text-gray-400">
              조건에 맞는 질문이 없습니다.
            </div>
          ) : null}
          {filteredQuestions.map((question) => {
            const expanded = expandedQuestionId === question.id
            const detail = questionDetails.get(question.id)
            const answered = question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED'

            return (
              <article key={question.id} className="qna-card overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300">
                <button
                  type="button"
                  onClick={() => onToggleQuestion(question.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left transition hover:bg-gray-50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span
                      className={
                        answered
                          ? 'shrink-0 rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-extrabold text-blue-600'
                          : 'shrink-0 rounded bg-gray-100 px-2 py-1 text-[10px] font-extrabold text-gray-500'
                      }
                    >
                      {answered ? '답변완료' : '답변대기'}
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
                              <div key={answer.id} className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-[#7C3AED]">{answer.authorName ?? '멘토'}</span>
                                  <span className="text-[10px] font-bold text-gray-400">{formatRelativeTime(answer.createdAt)}</span>
                                </div>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{answer.content}</p>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-xl border border-gray-200 bg-white p-4 text-center text-xs font-bold text-gray-400 shadow-sm">
                              멘토 답변을 기다리고 있습니다.
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

      <SourceFormModal
        open={formOpen}
        title="질문 작성하기"
        icon="fas fa-pen"
        widthClass="max-w-2xl"
        bodyClass="custom-scrollbar max-h-[70vh] overflow-y-auto p-6 space-y-5"
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        footer={
          <>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
              취소
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
              등록하기
            </button>
          </>
        }
      >
        <div className="flex items-center justify-end">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 transition hover:bg-gray-100">
            <input
              type="checkbox"
              checked={privateQuestion}
              onChange={(event) => setPrivateQuestion(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 bg-white text-brand accent-brand focus:ring-brand"
            />
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <i className="fas fa-lock text-gray-400"></i>
              멘토에게만 비공개로 문의하기
            </span>
          </label>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            질문 제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="무엇이 궁금하신가요? 핵심을 요약해주세요."
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            상세 내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
            className="h-40 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="발생한 문제 상황, 시도해본 방법, 첨부할 코드나 로그를 상세히 적어주시면 멘토님이 더 빠르고 정확하게 답변을 드릴 수 있습니다."
          ></textarea>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">파일 및 이미지 첨부 (선택)</label>
          <div className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:bg-gray-50">
            <i className="fas fa-cloud-upload-alt mb-1 text-3xl text-gray-400"></i>
            <p className="text-sm font-bold text-gray-600">클릭하거나 파일을 이곳으로 드래그하세요.</p>
            <p className="text-xs text-gray-400">지원 확장자: .txt, .log, .png, .jpg (최대 10MB)</p>
          </div>
        </div>
        <select
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        >
          <option value="MEDIUM">보통</option>
        </select>
      </SourceFormModal>
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
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const sortedEvents = [...events].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())
  const sourceEventDays = [5, 6, 10, 12, 19, 20, 24, 27]
  const eventsByDay = new Map<number, CalendarEvent[]>()

  sortedEvents.forEach((event, index) => {
    const parsed = parseDate(event.startAt)
    const day = parsed && parsed.getFullYear() === 2026 && parsed.getMonth() === 1 ? parsed.getDate() : sourceEventDays[index % sourceEventDays.length]
    const dayEvents = eventsByDay.get(day) ?? []

    dayEvents.push(event)
    eventsByDay.set(day, dayEvents)
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const time = eventTime || '09:00'
    const [hour = '09', minute = '00'] = time.split(':')
    const endHour = String((Number(hour) + 1) % 24).padStart(2, '0')

    await onCreateEvent({
      title,
      description,
      startAt: `${eventDate}T${time}`,
      endAt: `${eventDate}T${endHour}:${minute}`,
    })
    setTitle('')
    setDescription('')
    setEventDate('')
    setEventTime('')
    setFormOpen(false)
  }

  function eventTone(event: CalendarEvent) {
    const eventText = `${event.title} ${event.description ?? ''}`

    if (eventText.includes('마감') || eventText.includes('과제')) {
      return 'bg-red-50 text-red-500 border-red-100'
    }

    if (eventText.includes('멘토') || eventText.includes('화상') || eventText.includes('라이브')) {
      return 'bg-purple-50 text-mentor border-purple-100'
    }

    return 'bg-green-50 text-brand border-green-100'
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:flex-wrap">
      <section className="min-w-0 flex-1">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
              <i className="fas fa-calendar-alt text-brand"></i>
              팀 및 개인 일정
            </h1>
            <p className="mt-2 text-sm text-gray-500">멘토님의 공식 일정과 나의 개인 학습 플랜을 관리하세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50">
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="w-24 text-center text-lg font-bold text-gray-900">2026. 02</span>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center text-xs font-extrabold">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
              <div key={day} className={`py-3 ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7 gap-[1px] bg-gray-100">
            {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => {
              const dayEvents = eventsByDay.get(day) ?? []

              return (
                <div key={day} className={`mentoring-source-calendar-day min-h-[100px] p-2 ${day === 19 ? 'bg-green-50/40' : 'bg-white'}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${day === 19 ? 'bg-brand text-white' : 'text-gray-500'}`}>{day}</span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.eventId} className={`line-clamp-1 rounded border px-1.5 py-1 text-[10px] font-bold ${eventTone(event)}`}>
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 ? <div className="px-1.5 text-[10px] font-bold text-gray-400">+{dayEvents.length - 2}</div> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <aside className="w-full shrink-0 space-y-6 lg:w-80">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600"
        >
          <i className="fas fa-plus"></i>
          내 개인 일정 추가하기
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-extrabold text-gray-900">일정 범례</h3>
          <div className="space-y-3 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-mentor"></span>
              멘토 공식 일정
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-brand"></span>
              개인 학습 일정
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400"></span>
              과제 마감
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <i className="far fa-clock text-brand"></i>
            다가오는 일정
          </h3>
          {sortedEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-gray-300">
                <i className="far fa-calendar"></i>
              </div>
              <p className="mb-2 text-sm font-extrabold text-gray-900">등록된 일정이 없습니다</p>
              <p className="mb-5 text-xs leading-relaxed text-gray-500">아직 예정된 일정이 없습니다. 개인 학습 목표나 일정을 등록해 보세요!</p>
              <button type="button" onClick={() => setFormOpen(true)} className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-600">
                첫 일정 등록하기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEvents.slice(0, 5).map((event) => (
                <div key={event.eventId} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-brand"></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{event.title}</p>
                    <p className="mt-1 text-xs font-bold text-gray-400">{formatDateTime(event.startAt)}</p>
                    {event.description ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{event.description}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <SourceFormModal
        open={formOpen}
        title="개인 일정 추가"
        icon="fas fa-plus-circle"
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        footer={
          <>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
              취소
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
              <i className="fas fa-save"></i>
              저장
            </button>
          </>
        }
      >
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            일정 제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="예: 인프런 강의 3섹션 수강"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-600">
              날짜 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              required
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-600">시간</label>
            <input
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">상세 메모</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-24 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="메모할 내용을 적어주세요."
          ></textarea>
        </div>
      </SourceFormModal>
    </div>
  )
}

function FilesPage({
  files,
  onUploadFile,
  onCreateLink,
  submitting,
}: {
  files: WorkspaceFile[]
  onUploadFile: (file: File) => Promise<void>
  onCreateLink: (payload: { title: string; url: string }) => Promise<void>
  submitting: boolean
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'official' | 'shared' | 'link'>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadUrl, setUploadUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const loweredSearch = search.trim().toLowerCase()
  const fileFilterTabs: Array<{ key: 'all' | 'official' | 'shared' | 'link'; label: string; icon: ReactNode }> = [
    { key: 'all', label: '전체 자료', icon: null },
    { key: 'official', label: '멘토 공식 자료', icon: <span className="h-2 w-2 rounded-full bg-mentor"></span> },
    { key: 'shared', label: '멘티 공유 자료', icon: <span className="h-2 w-2 rounded-full bg-blue-500"></span> },
    { key: 'link', label: '외부 링크', icon: <i className="fas fa-link text-gray-400"></i> },
  ]
  const decoratedFiles = files.map((file, index) => {
    const kind: 'official' | 'shared' | 'link' =
      file.itemType === 'LINK'
        ? 'link'
        : index < 2 || file.uploadedByName?.includes('멘토')
          ? 'official'
          : 'shared'

    return { file, kind }
  })
  const filteredFiles = decoratedFiles.filter(({ file, kind }) => {
    const matchesFilter = filter === 'all' || kind === filter
    const matchesSearch = loweredSearch
      ? `${file.displayName ?? file.originalFileName ?? ''} ${file.uploadedByName ?? ''}`.toLowerCase().includes(loweredSearch)
      : true

    return matchesFilter && matchesSearch
  })

  function openUploadModal() {
    setUploadMode('file')
    setUploadTitle('')
    setUploadDescription('')
    setUploadUrl('')
    setSelectedFile(null)
    setUploadOpen(true)
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setSelectedFile(file)
    setUploadTitle((current) => current || file.name)
    event.target.value = ''
  }

  async function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (uploadMode === 'link') {
      await onCreateLink({ title: uploadTitle, url: uploadUrl })
    } else if (selectedFile) {
      await onUploadFile(selectedFile)
    } else {
      showAuthToast({ message: '업로드할 파일을 선택해주세요.', variant: 'error' })
      return
    }

    setUploadOpen(false)
    setUploadTitle('')
    setUploadDescription('')
    setUploadUrl('')
    setSelectedFile(null)
  }

  function fileBadge(kind: 'official' | 'shared' | 'link') {
    switch (kind) {
      case 'official':
        return { label: '멘토 공식 자료', className: 'border-purple-100 bg-purple-50 text-mentor' }
      case 'shared':
        return { label: '멘티 공유 자료', className: 'border-blue-100 bg-blue-50 text-blue-600' }
      case 'link':
        return { label: '외부 링크', className: 'border-gray-200 bg-gray-50 text-gray-500' }
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <i className="fas fa-folder-open text-brand"></i>
            자료실 (Files)
          </h1>
          <p className="mt-2 text-sm text-gray-500">멘토님이 올려주신 공식 가이드라인과 동료들이 공유한 자료를 확인하세요.</p>
        </div>
        <button type="button" onClick={openUploadModal} className="inline-flex h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-md transition hover:bg-green-600">
          <i className="fas fa-cloud-upload-alt"></i>
          자료 업로드 / 링크 공유
        </button>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div className="custom-scrollbar flex gap-6 overflow-x-auto px-2">
          {fileFilterTabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={
                filter === tab.key
                  ? 'flex items-center gap-1.5 border-b-2 border-brand pb-2 text-sm font-extrabold text-brand'
                  : 'flex items-center gap-1.5 border-b-2 border-transparent pb-2 text-sm font-medium text-gray-500 transition hover:text-gray-800'
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full shrink-0 md:w-72">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-[42px] w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="파일명 또는 작성자 검색..."
          />
        </div>
      </div>

      {files.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-2xl text-gray-300">
            <i className="fas fa-folder-open"></i>
          </div>
          <h3 className="mb-2 text-sm font-extrabold text-gray-900">등록된 자료가 없습니다</h3>
          <p className="mb-6 max-w-sm text-center text-xs leading-relaxed text-gray-500">
            팀원들과 공유할 첫 번째 파일을 업로드하거나 참고 링크를 추가해 보세요.
          </p>
          <button type="button" onClick={openUploadModal} className="inline-flex h-[38px] items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs font-bold text-white shadow-sm shadow-green-100 transition hover:bg-green-600">
            <i className="fas fa-cloud-upload-alt"></i>
            자료 업로드하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFiles.length === 0 ? (
            <div className="col-span-full flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-xs font-bold text-gray-400">
              조건에 맞는 자료가 없습니다.
            </div>
          ) : null}
          {filteredFiles.map(({ file, kind }) => {
            const badge = fileBadge(kind)
            const title = file.displayName ?? file.originalFileName ?? '자료'

            return (
              <article key={file.fileId} className="file-card group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-md">
                <i className={`${file.itemType === 'LINK' ? 'fas fa-link' : file.itemType === 'FOLDER' ? 'fas fa-folder' : 'fas fa-file-alt'} absolute right-4 top-4 text-4xl text-gray-100 transition group-hover:text-green-50`}></i>
                <span className={`relative z-10 mb-4 inline-flex rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${badge.className}`}>
                  {badge.label}
                </span>
                <h3 className="relative z-10 mb-2 line-clamp-2 min-h-[40px] text-sm font-extrabold leading-tight text-gray-900">{title}</h3>
                <p className="relative z-10 mb-6 line-clamp-3 min-h-[48px] text-xs leading-relaxed text-gray-500">
                  {file.contentType ? `${file.contentType} 형식의 학습 자료입니다.` : file.itemType === 'LINK' ? '외부 참고 링크를 통해 내용을 확인할 수 있습니다.' : '멘토링 진행에 필요한 참고 자료입니다.'}
                </p>
                <div className="relative z-10 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {file.uploaderProfileImage ? (
                      <img src={file.uploaderProfileImage} alt="" className="h-6 w-6 rounded-full border border-gray-200 object-cover" />
                    ) : (
                      <i className="fas fa-user-circle text-xl text-gray-300"></i>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-gray-700">{file.uploadedByName ?? '업로더 정보 없음'}</p>
                      <p className="text-[9px] font-bold text-gray-400">{formatRelativeTime(file.createdAt)}</p>
                    </div>
                  </div>
                  {file.itemType === 'FILE' ? (
                    <a
                      href={`/api/workspace-files/${file.fileId}/download`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-bold text-gray-500 transition hover:bg-gray-50"
                    >
                      {formatFileSize(file.fileSize)}
                    </a>
                  ) : (
                    <a
                      href={file.objectKey ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-bold text-gray-500 transition hover:bg-gray-50"
                    >
                      열기
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <SourceFormModal
        open={uploadOpen}
        title="자료 업로드"
        icon="fas fa-cloud-upload-alt"
        widthClass="max-w-lg"
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUploadSubmit}
        footer={
          <>
            <button type="button" onClick={() => setUploadOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
              취소
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
              등록하기
            </button>
          </>
        }
      >
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={uploadMode === 'file' ? 'flex-1 border-b-2 border-brand pb-2 text-sm font-bold text-brand' : 'flex-1 border-b-2 border-transparent pb-2 text-sm font-bold text-gray-400 transition hover:text-gray-600'}
          >
            파일 업로드
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('link')}
            className={uploadMode === 'link' ? 'flex-1 border-b-2 border-brand pb-2 text-sm font-bold text-brand' : 'flex-1 border-b-2 border-transparent pb-2 text-sm font-bold text-gray-400 transition hover:text-gray-600'}
          >
            외부 링크 공유
          </button>
        </div>

        {uploadMode === 'file' ? (
          <div className="space-y-5">
            <label className="upload-zone relative flex cursor-pointer flex-col items-center justify-center rounded-2xl bg-gray-50 p-8">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm">
                <i className="fas fa-file-upload text-xl"></i>
              </div>
              <p className="mb-1 text-sm font-bold text-gray-700">클릭하거나 파일을 이곳에 드롭하세요</p>
              <p className="text-[10px] text-gray-400">PDF, ZIP, 이미지 파일 (최대 50MB)</p>
              {selectedFile ? <p className="mt-3 max-w-full truncate rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-sm">{selectedFile.name}</p> : null}
              <input type="file" className="hidden" disabled={submitting} onChange={handleFileSelect} />
            </label>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-600">
                URL 링크 <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={uploadUrl}
                onChange={(event) => setUploadUrl(event.target.value)}
                required={uploadMode === 'link'}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="https://"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            자료 제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={uploadTitle}
            onChange={(event) => setUploadTitle(event.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="자료의 핵심 내용을 요약해주세요."
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">설명 (선택)</label>
          <textarea
            value={uploadDescription}
            onChange={(event) => setUploadDescription(event.target.value)}
            className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="다른 팀원들이 이 자료를 어떻게 활용하면 좋을지 적어주세요."
          ></textarea>
        </div>
      </SourceFormModal>
    </div>
  )
}

function ErdPage({
  erd,
  onSaveErd,
  submitting,
}: {
  erd: WorkspaceErdDocument | null
  versions: WorkspaceErdVersion[]
  onSaveErd: (payload: { mermaidCode: string; schemaJson: string; changeSummary: string }) => Promise<void>
  submitting: boolean
}) {
  const initialSchema = useMemo(
    () => normalizeErdSchema(parseErdSchema(erd?.schemaJson, erd?.mermaidCode ?? '')),
    [erd?.schemaJson, erd?.mermaidCode],
  )
  const [tables, setTables] = useState<ErdTableSchema[]>(initialSchema.tables)
  const [relationships, setRelationships] = useState<ErdRelationshipSchema[]>(initialSchema.relationships)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(initialSchema.tables[0]?.id ?? null)
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null)
  const [tool, setTool] = useState<ErdTool>('select')
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null)
  const [relationModalOpen, setRelationModalOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [dragState, setDragState] = useState<ErdDragState | null>(null)
  const [tableCounter, setTableCounter] = useState(initialSchema.tables.length + 1)
  const [connectionCounter, setConnectionCounter] = useState(initialSchema.relationships.length + 1)
  const [dirty, setDirty] = useState(false)
  const tableById = useMemo(() => new Map(tables.map((table) => [table.id ?? table.name, table])), [tables])
  const selectedTable = selectedTableId ? tableById.get(selectedTableId) ?? null : null
  const selectedRelationship = selectedRelationshipId
    ? relationships.find((relationship) => getErdRelationshipId(relationship) === selectedRelationshipId) ?? null
    : null
  const selectedColumns = selectedTable?.columns ?? []
  const generatedMermaidCode = useMemo(() => generateMermaidErd(tables, relationships), [tables, relationships])

  useEffect(() => {
    setTables(initialSchema.tables)
    setRelationships(initialSchema.relationships)
    setSelectedTableId(initialSchema.tables[0]?.id ?? null)
    setSelectedRelationshipId(null)
    setTool('select')
    setConnectSourceId(null)
    setPendingTargetId(null)
    setRelationModalOpen(false)
    setSaveModalOpen(false)
    setDragState(null)
    setTableCounter(initialSchema.tables.length + 1)
    setConnectionCounter(initialSchema.relationships.length + 1)
    setDirty(false)
  }, [initialSchema])

  function markDirty() {
    setDirty(true)
  }

  function activateTool(nextTool: ErdTool) {
    setTool(nextTool)
    setConnectSourceId(null)
    setPendingTargetId(null)
    setRelationModalOpen(false)
    setSelectedRelationshipId(null)

    if (nextTool === 'connect') {
      setSelectedTableId(null)
    }
  }

  function getTableId(table: ErdTableSchema) {
    return table.id ?? table.name
  }

  function getTableHeight(table: ErdTableSchema) {
    return ERD_HEADER_HEIGHT + Math.max(1, table.columns?.length ?? 0) * ERD_COLUMN_HEIGHT
  }

  function getConnectionGeometry(relationship: ErdRelationshipSchema) {
    const source = tableById.get(relationship.from)
    const target = tableById.get(relationship.to)

    if (!source || !target) {
      return null
    }

    const sourceX = source.x ?? 0
    const sourceY = source.y ?? 0
    const targetX = target.x ?? 0
    const targetY = target.y ?? 0
    const sourceLeftSide = sourceX > targetX
    const x1 = sourceLeftSide ? sourceX : sourceX + ERD_TABLE_WIDTH
    const x2 = sourceLeftSide ? targetX + ERD_TABLE_WIDTH : targetX
    const y1 = sourceY + getTableHeight(source) / 2
    const y2 = targetY + getTableHeight(target) / 2
    const controlOffset = Math.max(80, Math.abs(x2 - x1) / 2)
    const c1x = sourceLeftSide ? x1 - controlOffset : x1 + controlOffset
    const c2x = sourceLeftSide ? x2 + controlOffset : x2 - controlOffset
    const sourceBadgeOffset = sourceLeftSide ? -20 : 20
    const targetBadgeOffset = sourceLeftSide ? 20 : -20

    return {
      path: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2 - 12,
      startX: x1,
      startY: y1,
      endX: x2,
      endY: y2,
      sourceBadgeX: x1 + sourceBadgeOffset,
      sourceBadgeY: y1,
      targetBadgeX: x2 + targetBadgeOffset,
      targetBadgeY: y2,
    }
  }

  function handleCanvasClick() {
    if (tool === 'connect') {
      setConnectSourceId(null)
      setPendingTargetId(null)
      setSelectedRelationshipId(null)
      return
    }

    setSelectedTableId(null)
    setSelectedRelationshipId(null)
  }

  function handleTableClick(tableId: string) {
    if (tool === 'connect') {
      setSelectedRelationshipId(null)

      if (!connectSourceId) {
        setConnectSourceId(tableId)
        return
      }

      if (connectSourceId === tableId) {
        setConnectSourceId(null)
        return
      }

      setPendingTargetId(tableId)
      setRelationModalOpen(true)
      return
    }

    setSelectedTableId(tableId)
    setSelectedRelationshipId(null)
  }

  function addTable() {
    const nextId = `table-${tableCounter}`
    const offset = (tableCounter - 1) * 24

    setTables((current) => [
      ...current,
      {
        id: nextId,
        name: 'New_Table',
        x: 200 + (offset % 96),
        y: 150 + (offset % 96),
        columns: [{ name: 'id', type: 'BIGINT', key: 'PK', primary: true, foreign: false }],
      },
    ])
    setTableCounter((current) => current + 1)
    setSelectedTableId(nextId)
    activateTool('select')
    markDirty()
  }

  function deleteSelectedTable() {
    if (!selectedTableId || !window.confirm('정말 이 테이블을 삭제하시겠습니까?')) {
      return
    }

    const nextSelectedTable = tables.find((table) => getTableId(table) !== selectedTableId)

    setTables((current) => current.filter((table) => getTableId(table) !== selectedTableId))
    setSelectedTableId(nextSelectedTable ? getTableId(nextSelectedTable) : null)
    setSelectedRelationshipId(null)
    setRelationships((current) =>
      current.filter((relationship) => relationship.from !== selectedTableId && relationship.to !== selectedTableId),
    )
    markDirty()
  }

  function updateTableName(tableId: string, nextName: string) {
    setTables((current) =>
      current.map((table) => (getTableId(table) === tableId ? { ...table, name: nextName } : table)),
    )
    markDirty()
  }

  function updateTablePosition(tableId: string, x: number, y: number) {
    setTables((current) =>
      current.map((table) => (getTableId(table) === tableId ? { ...table, x, y } : table)),
    )
    markDirty()
  }

  function updateColumn(tableId: string, index: number, patch: Partial<ErdColumnSchema>) {
    setTables((current) =>
      current.map((table) => {
        if (getTableId(table) !== tableId) {
          return table
        }

        return {
          ...table,
          columns: (table.columns ?? []).map((column, columnIndex) =>
            columnIndex === index ? { ...column, ...patch } : column,
          ),
        }
      }),
    )
    markDirty()
  }

  function toggleColumnKey(tableId: string, index: number, key: 'PK' | 'FK', checked: boolean) {
    updateColumn(tableId, index, {
      key: checked ? key : null,
      primary: key === 'PK' ? checked : false,
      foreign: key === 'FK' ? checked : false,
    })
  }

  function addColumn(tableId: string) {
    setTables((current) =>
      current.map((table) => {
        if (getTableId(table) !== tableId) {
          return table
        }

        return {
          ...table,
          columns: [...(table.columns ?? []), { name: 'new_col', type: 'VARCHAR', key: null, primary: false, foreign: false }],
        }
      }),
    )
    markDirty()
  }

  function removeColumn(tableId: string, index: number) {
    setTables((current) =>
      current.map((table) => {
        if (getTableId(table) !== tableId) {
          return table
        }

        return {
          ...table,
          columns: (table.columns ?? []).filter((_, columnIndex) => columnIndex !== index),
        }
      }),
    )
    markDirty()
  }

  function startTableDrag(event: ReactPointerEvent<HTMLDivElement>, table: ErdTableSchema) {
    if (tool === 'connect') {
      return
    }

    const tableElement = event.currentTarget.closest('[data-erd-table]') as HTMLDivElement | null
    const tableId = getTableId(table)

    event.preventDefault()
    event.stopPropagation()
    tableElement?.setPointerCapture(event.pointerId)
    setSelectedTableId(tableId)
    setSelectedRelationshipId(null)
    setDragState({
      tableId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: table.x ?? 0,
      originY: table.y ?? 0,
    })
  }

  function moveTableDrag(event: ReactPointerEvent<HTMLDivElement>, tableId: string) {
    if (!dragState || dragState.tableId !== tableId || dragState.pointerId !== event.pointerId) {
      return
    }

    updateTablePosition(
      tableId,
      Math.max(0, dragState.originX + event.clientX - dragState.startX),
      Math.max(0, dragState.originY + event.clientY - dragState.startY),
    )
  }

  function endTableDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragState(null)
  }

  function confirmConnection(type: ErdRelationType) {
    if (!connectSourceId || !pendingTargetId) {
      return
    }

    const existingRelationship = relationships.find(
      (relationship) =>
        (relationship.from === connectSourceId && relationship.to === pendingTargetId) ||
        (relationship.from === pendingTargetId && relationship.to === connectSourceId),
    )

    if (existingRelationship) {
      const existingRelationshipId = getErdRelationshipId(existingRelationship)

      setRelationships((current) =>
        current.map((relationship) =>
          getErdRelationshipId(relationship) === existingRelationshipId
            ? { ...relationship, from: connectSourceId, to: pendingTargetId, label: type, type }
            : relationship,
        ),
      )
      setSelectedRelationshipId(existingRelationshipId)
      showAuthToast({ message: '기존 관계 타입을 갱신했습니다.' })
    } else {
      const nextRelationshipId = `conn-${connectionCounter}`

      setRelationships((current) => [
        ...current,
        {
          id: nextRelationshipId,
          from: connectSourceId,
          to: pendingTargetId,
          label: type,
          type,
        },
      ])
      setConnectionCounter((current) => current + 1)
      setSelectedRelationshipId(nextRelationshipId)
    }

    setTool('select')
    setSelectedTableId(null)
    setRelationModalOpen(false)
    setConnectSourceId(null)
    setPendingTargetId(null)
    markDirty()
  }

  function cancelConnection() {
    setRelationModalOpen(false)
    setConnectSourceId(null)
    setPendingTargetId(null)
  }

  function selectRelationship(relationship: ErdRelationshipSchema) {
    setSelectedRelationshipId(getErdRelationshipId(relationship))
    setSelectedTableId(null)
    setTool('select')
    setConnectSourceId(null)
    setPendingTargetId(null)
    setRelationModalOpen(false)
  }

  function updateRelationshipType(connectionId: string, type: ErdRelationType) {
    setRelationships((current) =>
      current.map((relationship) =>
        getErdRelationshipId(relationship) === connectionId ? { ...relationship, label: type, type } : relationship,
      ),
    )
    markDirty()
  }

  function deleteConnection(connectionId?: string | null) {
    if (!connectionId) {
      return
    }

    setRelationships((current) => current.filter((relationship) => getErdRelationshipId(relationship) !== connectionId))
    setSelectedRelationshipId((current) => (current === connectionId ? null : current))
    markDirty()
  }

  function deleteSelectedElement() {
    if (selectedRelationshipId) {
      deleteConnection(selectedRelationshipId)
      return
    }

    deleteSelectedTable()
  }

  async function handleSave() {
    await onSaveErd({
      mermaidCode: generatedMermaidCode,
      schemaJson: JSON.stringify({ tables, relationships }),
      changeSummary: 'ERD Visual Builder update',
    })
    setSaveModalOpen(false)
    setDirty(false)
  }

  const selectedTablePanelId = selectedTable ? getTableId(selectedTable) : null
  const selectedRelationshipSource = selectedRelationship ? tableById.get(selectedRelationship.from) ?? null : null
  const selectedRelationshipTarget = selectedRelationship ? tableById.get(selectedRelationship.to) ?? null : null
  const selectedRelationshipType = (selectedRelationship?.type ?? selectedRelationship?.label ?? '1:N') as ErdRelationType

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
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
            onClick={addTable}
          >
            <i className="fas fa-plus"></i>
            테이블 추가
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="mr-2 text-xs font-bold text-gray-500">
            <i className="fas fa-cloud-upload-alt mr-1 text-[#00C471]"></i>
            {dirty ? '저장되지 않은 변경사항 있음' : '모든 변경사항 저장됨'}
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
            type="button"
            onClick={() => setSaveModalOpen(true)}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className="fas fa-save"></i>
            버전 저장
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section
          className="relative min-w-0 flex-1 overflow-hidden bg-[#F8F9FA]"
          style={{
            backgroundImage: 'radial-gradient(#D1D5DB 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
          onClick={handleCanvasClick}
        >
          <div className="absolute left-4 top-4 z-30 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-md">
            <button
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                tool === 'select' ? 'bg-[#00C471]/10 text-[#00C471]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="선택 도구"
              onClick={(event) => {
                event.stopPropagation()
                activateTool('select')
              }}
            >
              <i className="fas fa-mouse-pointer"></i>
            </button>
            <button
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                tool === 'connect' ? 'bg-[#00C471]/10 text-[#00C471]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="관계선 연결"
              onClick={(event) => {
                event.stopPropagation()
                activateTool('connect')
              }}
            >
              <i className="fas fa-link"></i>
            </button>
            <div className="mx-auto my-1 h-px w-6 bg-gray-200"></div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              title="선택 삭제"
              disabled={!selectedTableId && !selectedRelationshipId}
              onClick={(event) => {
                event.stopPropagation()
                deleteSelectedElement()
              }}
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>

          {tool === 'connect' ? (
            <div className="absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-lg">
              {connectSourceId ? '연결할 대상 테이블을 클릭하세요.' : '연결할 시작 테이블을 클릭하세요.'}
            </div>
          ) : null}

          <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible">
            {relationships.map((relationship) => {
              const geometry = getConnectionGeometry(relationship)

              if (!geometry) {
                return null
              }

              const relationshipId = getErdRelationshipId(relationship)
              const selected = selectedRelationshipId === relationshipId

              return (
                <path
                  key={relationshipId}
                  d={geometry.path}
                  className={`connection-line pointer-events-auto ${selected ? 'selected' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectRelationship(relationship)
                  }}
                />
              )
            })}
          </svg>

          <div className="pointer-events-none absolute inset-0 z-[6]">
            {relationships.map((relationship) => {
              const geometry = getConnectionGeometry(relationship)

              if (!geometry) {
                return null
              }

              const relationshipId = getErdRelationshipId(relationship)
              const selected = selectedRelationshipId === relationshipId
              const cardinality = getErdRelationCardinality(relationship.type ?? relationship.label)

              return (
                <div key={`overlay-${relationshipId}`}>
                  <span className={`erd-anchor-dot ${selected ? 'selected' : ''}`} style={{ left: geometry.startX, top: geometry.startY }} />
                  <span className={`erd-anchor-dot ${selected ? 'selected' : ''}`} style={{ left: geometry.endX, top: geometry.endY }} />
                  <span
                    className={`erd-cardinality-badge ${cardinality.source === 'N' ? 'many' : 'one'} ${selected ? 'selected' : ''}`}
                    style={{ left: geometry.sourceBadgeX, top: geometry.sourceBadgeY }}
                  >
                    {cardinality.source}
                  </span>
                  <span
                    className={`erd-cardinality-badge ${cardinality.target === 'N' ? 'many' : 'one'} ${selected ? 'selected' : ''}`}
                    style={{ left: geometry.targetBadgeX, top: geometry.targetBadgeY }}
                  >
                    {cardinality.target}
                  </span>
                  <button
                    type="button"
                    className={`erd-relation-label pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-gray-500 shadow-sm transition hover:border-[#00C471] hover:bg-green-50 hover:text-[#00C471] ${
                      selected ? 'selected' : ''
                    }`}
                    style={{ left: geometry.labelX, top: geometry.labelY }}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectRelationship(relationship)
                    }}
                  >
                    {relationship.type ?? relationship.label ?? '1:N'}
                  </button>
                </div>
              )
            })}
          </div>

          {tables.length === 0 ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white text-3xl text-gray-300 shadow-sm">
                <i className="fas fa-project-diagram"></i>
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-gray-600">생성된 테이블이 없습니다</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                상단의 <span className="mx-1 rounded bg-gray-100 px-2 py-0.5 font-bold text-gray-600">+ 테이블 추가</span> 버튼을 눌러
                <br />
                새로운 ERD 설계를 시작해 보세요.
              </p>
            </div>
          ) : null}

          <div className="relative z-10 h-full w-full">
            {tables.map((table) => {
              const tableId = getTableId(table)
              const active = selectedTableId === tableId
              const connectSource = connectSourceId === tableId

              return (
                <div
                  data-erd-table="true"
                  role="button"
                  tabIndex={0}
                  key={tableId}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleTableClick(tableId)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleTableClick(tableId)
                    }
                  }}
                  onPointerMove={(event) => moveTableDrag(event, tableId)}
                  onPointerUp={endTableDrag}
                  onPointerCancel={endTableDrag}
                  className={`erd-visual-table absolute flex w-[240px] flex-col overflow-hidden rounded-lg border-2 bg-white text-left shadow-xl transition ${
                    active
                      ? 'selected border-[#00C471] ring-4 ring-[#00C471]/15'
                      : connectSource
                        ? 'connect-source border-blue-500'
                        : 'border-gray-200 hover:border-[#00C471]/70'
                  }`}
                  style={{ left: table.x ?? 0, top: table.y ?? 0 }}
                >
                  <div
                    className={`table-header flex w-full items-center justify-between border-b border-gray-900 bg-gray-800 px-3 py-2.5 text-sm font-bold text-white ${
                      tool === 'connect' ? 'cursor-pointer' : 'cursor-move'
                    }`}
                    onPointerDown={(event) => startTableDrag(event, table)}
                  >
                    <span className="w-full truncate text-center">{table.name || 'Unnamed'}</span>
                  </div>
                  <div className="w-full bg-white text-xs">
                    {(table.columns ?? []).length > 0 ? (
                      (table.columns ?? []).map((column, index) => {
                        const key = column.key?.toUpperCase()
                        const primary = column.primary || key === 'PK'
                        const foreign = column.foreign || key === 'FK'

                        return (
                          <div
                            key={`${tableId}-${column.name}-${index}`}
                            className={`flex min-h-[33px] items-center justify-between border-b border-gray-100 px-3 py-2 ${
                              primary ? 'bg-yellow-50/70' : foreign ? 'bg-gray-50' : 'bg-white'
                            }`}
                          >
                            <span className={`min-w-0 truncate font-bold ${primary ? 'text-gray-900' : 'text-gray-700'}`}>
                              {primary ? <i className="fas fa-key mr-1.5 text-yellow-500"></i> : null}
                              {foreign ? <i className="fas fa-link mr-1.5 text-gray-400"></i> : null}
                              {column.name || 'col'}
                            </span>
                            <span className="ml-2 shrink-0 font-mono text-gray-500">{column.type ?? 'VARCHAR'}</span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex min-h-[33px] items-center justify-center border-b border-gray-100 px-3 py-2 text-xs font-bold text-gray-300">
                        컬럼 없음
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="z-20 flex h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-white shadow-sm">
          {selectedTable && selectedTablePanelId ? (
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
                  <input
                    type="text"
                    value={selectedTable.name}
                    onChange={(event) => updateTableName(selectedTablePanelId, event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none transition focus:border-[#00C471] focus:ring-4 focus:ring-[#00C471]/10"
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-end justify-between border-b border-gray-100 pb-2">
                    <label className="block text-xs font-extrabold text-gray-900">컬럼 (Columns)</label>
                    <button
                      type="button"
                      className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold text-[#00C471] shadow-sm transition hover:bg-green-100"
                      onClick={() => addColumn(selectedTablePanelId)}
                    >
                      + 컬럼 추가
                    </button>
                  </div>
                  <div className="erd-column-list space-y-3">
                    {selectedColumns.length > 0 ? (
                      selectedColumns.map((column, index) => {
                        const key = column.key?.toUpperCase()
                        const primary = column.primary || key === 'PK'
                        const foreign = column.foreign || key === 'FK'

                        return (
                          <div
                            key={`${selectedTablePanelId}-panel-${column.name}-${index}`}
                            className="erd-column-editor grid items-start gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                          >
                            <i className="fas fa-grip-lines mt-2 cursor-move text-xs text-gray-300"></i>
                            <div className="erd-column-main flex min-w-0 flex-col gap-2">
                              <div className="erd-column-row grid min-w-0 gap-2">
                                <input
                                  type="text"
                                  value={column.name}
                                  onChange={(event) => updateColumn(selectedTablePanelId, index, { name: event.target.value })}
                                  className="erd-column-name-input min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-bold outline-none transition focus:border-[#00C471] focus:bg-white"
                                  style={{ height: 26 }}
                                />
                                <select
                                  value={column.type ?? 'VARCHAR'}
                                  onChange={(event) => updateColumn(selectedTablePanelId, index, { type: event.target.value })}
                                  className="erd-column-type-select w-24 rounded-lg border border-gray-200 bg-gray-50 px-1 py-1.5 font-mono text-[10px] outline-none transition focus:border-[#00C471]"
                                  style={{ width: 86, height: 26 }}
                                >
                                  <option>BIGINT</option>
                                  <option>INT</option>
                                  <option>VARCHAR</option>
                                  <option>DATETIME</option>
                                </select>
                              </div>
                              <div className="erd-column-flags flex items-center gap-4 pl-1">
                                <label
                                  className={`erd-column-flag-label flex cursor-pointer items-center gap-1 text-[10px] font-bold ${
                                    primary ? 'text-yellow-600' : 'text-gray-400'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-yellow-500"
                                    checked={primary}
                                    onChange={(event) => toggleColumnKey(selectedTablePanelId, index, 'PK', event.target.checked)}
                                  />
                                  PK
                                </label>
                                <label
                                  className={`erd-column-flag-label flex cursor-pointer items-center gap-1 text-[10px] font-bold ${
                                    foreign ? 'text-blue-600' : 'text-gray-400'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-blue-500"
                                    checked={foreign}
                                    onChange={(event) => toggleColumnKey(selectedTablePanelId, index, 'FK', event.target.checked)}
                                  />
                                  FK
                                </label>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="erd-column-delete-button mt-0.5 p-1 text-gray-300 transition hover:text-red-500"
                              onClick={() => removeColumn(selectedTablePanelId, index)}
                              aria-label="컬럼 삭제"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        )
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs font-bold text-gray-400">
                        컬럼이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-white p-4">
                <p className="mb-3 text-[10px] font-bold text-gray-400">
                  최근 저장 v{erd?.version ?? 0} · {erd?.updatedAt ? formatRelativeTime(erd.updatedAt) : '저장 이력 없음'}
                </p>
                <button
                  type="button"
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-100"
                  onClick={deleteSelectedTable}
                >
                  <i className="fas fa-trash-alt mr-1"></i>
                  이 테이블 삭제
                </button>
              </div>
            </>
          ) : selectedRelationship && selectedRelationshipId ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                <h3 className="text-sm font-extrabold text-gray-900">
                  <i className="fas fa-link mr-1 text-[#00C471]"></i>
                  관계선 속성
                </h3>
              </div>

              <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Connection</p>
                  <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                    <span className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-center">
                      {selectedRelationshipSource?.name ?? selectedRelationship.from}
                    </span>
                    <i className="fas fa-arrow-right text-xs text-[#00C471]"></i>
                    <span className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-center">
                      {selectedRelationshipTarget?.name ?? selectedRelationship.to}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-xs font-extrabold text-gray-900">관계 타입</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1:1', '1:N', 'N:M'] as ErdRelationType[]).map((type) => (
                      <button
                        type="button"
                        key={type}
                        className={`rounded-xl border px-2 py-2 text-xs font-extrabold transition ${
                          selectedRelationshipType === type
                            ? 'border-[#00C471] bg-green-50 text-[#00C471]'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-[#00C471] hover:text-[#00C471]'
                        }`}
                        onClick={() => updateRelationshipType(selectedRelationshipId, type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-white p-4">
                <button
                  type="button"
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-100"
                  onClick={() => deleteConnection(selectedRelationshipId)}
                >
                  <i className="fas fa-trash-alt mr-1"></i>
                  선택한 관계선 삭제
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

      {relationModalOpen ? (
        <div className="modal-overlay active fixed inset-0 z-[1100] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="modal-content w-full max-w-xs overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="mb-4 text-lg font-extrabold text-gray-900">관계 타입 선택</h3>
            <p className="mb-6 text-xs text-gray-500">두 테이블 간의 관계(Relation)를 선택하세요.</p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="rounded-xl border border-gray-200 py-3 font-bold text-gray-700 shadow-sm transition hover:border-[#00C471] hover:bg-green-50 hover:text-[#00C471]"
                onClick={() => confirmConnection('1:1')}
              >
                1 : 1 관계
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#00C471] bg-green-50 py-3 font-bold text-[#00C471] shadow-sm transition hover:bg-green-100"
                onClick={() => confirmConnection('1:N')}
              >
                1 : N 관계
              </button>
              <button
                type="button"
                className="rounded-xl border border-gray-200 py-3 font-bold text-gray-700 shadow-sm transition hover:border-[#00C471] hover:bg-green-50 hover:text-[#00C471]"
                onClick={() => confirmConnection('N:M')}
              >
                N : M 관계
              </button>
            </div>

            <button type="button" className="mt-6 text-xs font-bold text-gray-400 transition hover:text-gray-700" onClick={cancelConnection}>
              취소
            </button>
          </div>
        </div>
      ) : null}

      {saveModalOpen ? (
        <div className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="modal-content w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-save text-[#00C471]"></i>
                ERD 저장
              </h3>
              <button type="button" className="text-gray-400 transition hover:text-gray-900" onClick={() => setSaveModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mt-10 flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-700"
                onClick={() => setSaveModalOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-xl bg-gray-900 px-8 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                onClick={handleSave}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}

function MeetingPage({
  meetingNotes,
  voiceChannels,
  workspaceId,
}: {
  meetingNotes: MeetingNote[]
  voiceChannels: VoiceChannel[]
  workspaceId: number | null
  onCreateMeetingNote: (payload: { title: string; content: string }) => Promise<void>
  onCreateVoiceChannel: (payload: { name: string; description: string }) => Promise<void>
  submitting: boolean
}) {
  const [selectedSummary, setSelectedSummary] = useState<MeetingNote | null>(null)
  const liveChannel = voiceChannels[0] ?? null
  const liveParams = new URLSearchParams()

  if (liveChannel) {
    liveParams.set('channelId', String(liveChannel.channelId))
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
      <div className="mb-8 shrink-0">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
          <i className="fas fa-video text-red-500"></i>
          화상 멘토링 (Live)
        </h1>
        <p className="mt-2 text-sm text-gray-500">정규 라이브 밋업에 참여하거나, 지난 밋업의 회의록 및 요약본을 확인할 수 있습니다.</p>
      </div>

      {liveChannel ? (
        <div className="relative mb-10 shrink-0 overflow-hidden rounded-3xl border-2 border-mentor bg-white p-8 shadow-md">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-mentor opacity-5 blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="w-full flex-1 text-center md:text-left">
              <div className="mb-3 flex items-center justify-center gap-2 md:justify-start">
                <span className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-extrabold text-red-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                  LIVE SOON
                </span>
                <span className="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">
                  <i className="far fa-clock"></i>
                  {' '}
                  {liveChannel.currentSessionStartedAt ? formatDateTime(liveChannel.currentSessionStartedAt) : '내일 20:00 예정'}
                </span>
              </div>
              <h2 className="mb-2 text-2xl font-extrabold text-gray-900 md:text-3xl">{liveChannel.name}</h2>
              <p className="mx-auto mb-6 max-w-2xl text-sm font-medium leading-relaxed text-gray-600 md:mx-0">
                {liveChannel.description ?? '멘토와 함께 이번 주차 핵심 과제 리뷰와 Q&A 세션을 진행합니다. 시작 전 안내에 맞춰 입장해주세요!'}
              </p>
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-backend" alt="" className="h-8 w-8 rounded-full border border-gray-200" />
                <div className="text-left">
                  <p className="text-[10px] font-bold leading-none text-mentor">주관 멘토</p>
                  <p className="text-xs font-bold text-gray-800">{liveChannel.creatorName ?? '코드마스터 J'}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center md:w-64">
              <i className="fas fa-video mb-3 text-3xl text-mentor"></i>
              <p className="mb-1 text-sm font-bold text-gray-900">입장 코드가 필요 없습니다.</p>
              <p className="mb-4 text-[10px] text-gray-500">시작 10분 전부터 입장 가능합니다.</p>
              <a href={buildHref('live-meeting', workspaceId, liveParams)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-mentor py-3 text-sm font-bold text-white shadow-md transition hover:bg-purple-700">
                <i className="fas fa-sign-in-alt"></i>
                밋업 입장하기
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative mb-10 shrink-0 overflow-hidden rounded-3xl border-2 border-mentor bg-white p-8 shadow-md">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-200 opacity-20 blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300">
              <i className="fas fa-video-slash text-2xl"></i>
            </div>
            <h2 className="mb-2 text-xl font-extrabold text-gray-900 md:text-2xl">예정된 라이브 밋업이 없습니다</h2>
            <p className="mx-auto mb-6 max-w-lg text-sm font-medium leading-relaxed text-gray-500">
              멘토님이 다음 화상 멘토링 일정을 조율 중입니다.
              <br />
              일정이 확정되면 이곳에 안내될 예정입니다.
            </p>
            <span className="inline-block rounded border border-gray-200 bg-gray-100 px-3 py-1.5 text-[10px] font-bold text-gray-600">
              <i className="fas fa-clock mr-1"></i>
              일정 대기 중
            </span>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <i className="fas fa-file-alt text-gray-400"></i>
          지난 라이브 요약 및 회의록
        </h3>

        {meetingNotes.length === 0 ? (
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto pr-2 pb-4 md:grid-cols-2">
            <div className="col-span-1 flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-12 md:col-span-2">
              <div className="mb-3 text-3xl text-gray-300">
                <i className="fas fa-folder-open"></i>
              </div>
              <h4 className="mb-1 text-sm font-extrabold text-gray-900">등록된 회의록이 없습니다</h4>
              <p className="text-xs text-gray-400">라이브 멘토링이 진행된 후, 회의록과 요약본이 이곳에 누적됩니다.</p>
            </div>
          </div>
        ) : (
          <div className="custom-scrollbar grid flex-1 grid-cols-1 gap-4 overflow-y-auto pr-2 pb-4 md:grid-cols-2">
            {meetingNotes.map((note, index) => (
              <article
                key={note.noteId}
                onClick={() => setSelectedSummary(note)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${index === 0 ? 'border-purple-100 bg-purple-50 text-mentor' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>
                      {index === 0 ? `WEEK ${meetingNotes.length}` : `WEEK ${Math.max(1, meetingNotes.length - index)}`}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{note.createdAt ? formatDate(note.createdAt) : '진행 기록'}</span>
                  </div>
                  <h4 className="mb-1 truncate text-sm font-bold text-gray-900 transition group-hover:text-brand">{note.title}</h4>
                  <p className="w-64 truncate text-xs text-gray-500 md:w-80">{note.content ?? '라이브 멘토링 회의록입니다.'}</p>
                </div>

                <div className="ml-4 flex shrink-0 flex-col gap-2">
                  <button type="button" onClick={(event) => { event.stopPropagation(); showAuthToast({ message: 'VOD 페이지로 이동합니다.' }) }} className="flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 shadow-sm transition hover:bg-red-500 hover:text-white" title="다시보기">
                    <i className="fas fa-play"></i>
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedSummary(note) }} className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-sm transition group-hover:bg-green-50 group-hover:text-brand" title="회의록 보기">
                    <i className="fas fa-file-alt"></i>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedSummary ? (
        <div className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="modal-content relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
              <div className="pr-8">
                <span className="mb-2 inline-block rounded border border-purple-200 bg-mentor-light px-2 py-1 text-[10px] font-extrabold text-mentor">Meeting Minutes</span>
                <h3 className="text-xl font-extrabold leading-tight text-gray-900">{selectedSummary.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSummary(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-white p-8">
              <div>
                <h4 className="mb-2 text-sm font-bold text-brand">
                  <i className="fas fa-check-circle mr-1"></i>
                  이번 세션 핵심 요약
                </h4>
                <div className="whitespace-pre-line rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm leading-relaxed text-gray-700">
                  {selectedSummary.content ?? '회의록 내용이 비어 있습니다.'}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold text-blue-500">
                  <i className="fas fa-question-circle mr-1"></i>
                  라이브 Q&A 아카이브
                </h4>
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="mb-1 text-xs font-bold text-gray-800">Q. 라이브에서 다룬 질문은 어디에서 확인하나요?</p>
                  <p className="text-sm leading-relaxed text-gray-600">A. 멘토링이 종료된 뒤 정리된 회의록과 요약본이 이 영역에 누적됩니다.</p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setSelectedSummary(null)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
  const [accountProfile, setAccountProfile] = useState<{ name: string | null; profileImage: string | null } | null>(null)

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
    if (!session?.accessToken) {
      setAccountProfile(null)
      return undefined
    }

    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted) {
          setAccountProfile({ name: profile.name, profileImage: profile.profileImage })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAccountProfile(null)
        }
      })

    return () => controller.abort()
  }, [session?.accessToken, session?.userId])

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

    const targetWorkspaceId = workspaceId
    const controller = new AbortController()

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const nextData = await loadMentoringWorkspaceData(targetWorkspaceId, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        setData({
          dashboard: nextData.dashboard,
          tasks: sortByRecent(nextData.tasks ?? []),
          events: [...(nextData.events ?? [])].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()),
          questions: sortByRecent(nextData.questions ?? []),
          files: sortByRecent(nextData.files ?? []),
          erd: nextData.erd,
          erdVersions: sortByRecent(nextData.erdVersions ?? []),
          meetingNotes: sortByRecent(nextData.meetingNotes ?? []),
          voiceChannels: nextData.voiceChannels ?? [],
          notices: sortByRecent(nextData.notices ?? []),
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

  useEffect(() => {
    if (!session?.userId) {
      return undefined
    }

    const currentUserId = session.userId

    function syncProfile(event: Event) {
      const profileEvent = event as CustomEvent<ProfileSyncPayload>

      if (!profileEvent.detail) {
        return
      }

      const nextName = profileEvent.detail.name.trim()
      const nextProfileImage = profileEvent.detail.profileImage

      setAccountProfile({ name: nextName || null, profileImage: nextProfileImage })

      setData((current) => {
        if (!current.dashboard) {
          return current
        }

        let memberChanged = false
        const members = current.dashboard.members.map((member) => {
          if (member.learnerId !== currentUserId) {
            return member
          }

          memberChanged = true

          return {
            ...member,
            learnerName: nextName || member.learnerName,
            profileImage: nextProfileImage,
          }
        })

        if (current.dashboard.ownerId !== currentUserId && !memberChanged) {
          return current
        }

        return {
          ...current,
          dashboard: {
            ...current.dashboard,
            ownerName: current.dashboard.ownerId === currentUserId
              ? nextName || current.dashboard.ownerName
              : current.dashboard.ownerName,
            ownerProfileImage: current.dashboard.ownerId === currentUserId
              ? nextProfileImage
              : current.dashboard.ownerProfileImage,
            members,
          },
        }
      })
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfile)

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfile)
    }
  }, [session?.userId])

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
        const { participants, messages, minutes } = await loadMentoringLiveChannelData(selectedLiveChannelId, controller.signal)

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
  const currentMemberName = accountProfile?.name || currentMember?.learnerName || session?.name
  const currentMemberProfileImage = accountProfile ? accountProfile.profileImage : currentMember?.profileImage
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
        createMentoringTask(workspaceId, {
          title: payload.title,
          description: payload.description || null,
          priority: payload.priority,
          assigneeId: session?.userId ?? null,
          dueDate: payload.dueDate || null,
        }).then(() => undefined),
      '과제를 추가했습니다.',
    )
  }

  async function updateTaskStatus(task: WorkspaceTask, status: TaskStatus) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        updateMentoringTaskStatus(workspaceId, task.taskId, status).then(() => undefined),
      '과제 상태를 변경했습니다.',
    )
  }

  async function sendMentorDm(content: string) {
    const mentorId = data.dashboard?.ownerId
    if (!workspaceId || !mentorId) {
      showAuthToast({ message: '멘토 정보를 찾지 못했습니다.', variant: 'error' })
      return
    }

    await withSubmit(
      () =>
        sendMentoringDirectMessage(workspaceId, mentorId, content).then(() => undefined),
      '멘토님에게 메시지가 전송되었습니다.',
    )
  }

  async function createQuestion(payload: { title: string; content: string; difficulty: string; templateType: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringQuestion(workspaceId, {
          title: payload.title,
          content: payload.content,
          difficulty: payload.difficulty,
          templateType: payload.templateType,
        }).then(() => undefined),
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
      const detail = await fetchMentoringQuestionDetail(questionId)
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
        createMentoringCalendarEvent(workspaceId, {
          title: payload.title,
          description: payload.description || null,
          startAt: payload.startAt,
          endAt: payload.endAt,
        }).then(() => undefined),
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
        uploadMentoringWorkspaceFile(workspaceId, formData).then(() => undefined),
      '파일을 업로드했습니다.',
    )
  }

  async function createFileLink(payload: { title: string; url: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringFileLink(workspaceId, { title: payload.title, url: payload.url, parentId: null }).then(() => undefined),
      '링크를 공유했습니다.',
    )
  }

  async function saveErd(payload: { mermaidCode: string; schemaJson: string; changeSummary: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        saveMentoringErd(workspaceId, {
          mermaidCode: payload.mermaidCode,
          schemaJson: payload.schemaJson || null,
          changeSummary: payload.changeSummary || null,
        }).then(() => undefined),
      'ERD를 저장했습니다.',
    )
  }

  async function createMeetingNote(payload: { title: string; content: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringMeetingNote(workspaceId, { title: payload.title, content: payload.content || null }).then(() => undefined),
      '회의록을 저장했습니다.',
    )
  }

  async function createVoiceChannel(payload: { name: string; description: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringVoiceChannel(workspaceId, { name: payload.name, description: payload.description || null }).then(() => undefined),
      '라이브 채널을 생성했습니다.',
    )
  }

  async function joinChannel(channelId: number) {
    await withSubmit(
      () =>
        joinMentoringVoiceChannel(channelId).then(() => undefined),
      '라이브 채널에 참여했습니다.',
    )
    refreshLive()
  }

  async function leaveChannel(channelId: number) {
    await withSubmit(
      () =>
        leaveMentoringVoiceChannel(channelId).then(() => undefined),
      '라이브 채널에서 나갔습니다.',
    )
    refreshLive()
  }

  async function sendLiveMessage(channelId: number, content: string) {
    setSubmitting(true)

    try {
      await sendMentoringVoiceMessage(channelId, content)
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
            onSendMentorDm={sendMentorDm}
            submitting={submitting}
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
        return <CurriculumPage tasks={personalTasks} progressPercent={progressPercent} />
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
        return <FilesPage files={data.files} onUploadFile={uploadFile} onCreateLink={createFileLink} submitting={submitting} />
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
        memberName={currentMemberName}
        memberProfileImage={currentMemberProfileImage}
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
