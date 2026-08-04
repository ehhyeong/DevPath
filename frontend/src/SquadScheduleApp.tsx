import { useEffect, useMemo, useState, type FormEvent } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SquadWorkspaceAside from './components/SquadWorkspaceAside'
import SquadWorkspaceHeader from './components/SquadWorkspaceHeader'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { projectApiRequest } from './features/project/api'
import { createSquadNotification, squadActorName } from './squad-notifications'

type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type CalendarView = 'month' | 'week'

const SCHEDULE_CATEGORIES = ['milestone', 'meeting', 'task-fe', 'task-be'] as const
type ScheduleCategory = typeof SCHEDULE_CATEGORIES[number]

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

type WorkspaceDashboard = {
  workspaceId: number
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  members: WorkspaceMember[]
  unresolvedTaskCount: number
}

type CalendarEvent = {
  eventId: number
  workspaceId: number
  title: string
  description?: string | null
  startAt: string
  endAt: string
  createdById: number
  createdAt?: string | null
  updatedAt?: string | null
}

type ScheduleFormState = {
  title: string
  category: ScheduleCategory
  isDeadline: boolean
  date: string
  startTime: string
  endTime: string
  description: string
}

const CATEGORY_CONFIG: Record<
  ScheduleCategory,
  {
    label: string
    shortLabel: string
    iconClass: string
    className: string
    dotClass: string
  }
> = {
  milestone: {
    label: '마일스톤',
    shortLabel: 'MILESTONE',
    iconClass: 'fas fa-flag-checkered',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  meeting: {
    label: '회의 / 미팅',
    shortLabel: 'MEETING',
    iconClass: 'fas fa-comments',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  'task-fe': {
    label: '개발 프론트',
    shortLabel: 'FRONT',
    iconClass: 'fas fa-laptop-code',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  'task-be': {
    label: '개발 백엔드',
    shortLabel: 'BACKEND',
    iconClass: 'fas fa-server',
    className: 'bg-pink-100 text-pink-700 border-pink-200',
    dotClass: 'bg-pink-500',
  },
}

const CATEGORY_PREFIX_PATTERN = /^\[schedule-category:(milestone|meeting|task-fe|task-be)\]\n?/
const DEADLINE_PREFIX_PATTERN = /^\[schedule-deadline:(true|false)\]\n?/
const DEADLINE_METADATA_PATTERN = /(^|\n)\[schedule-deadline:true\](\n|$)/
const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function isScheduleCategory(value: string): value is ScheduleCategory {
  return SCHEDULE_CATEGORIES.includes(value as ScheduleCategory)
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toLocalDateTimeString(date: Date) {
  return `${formatDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function buildMonthDates(baseDate: Date) {
  const firstOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const firstVisible = addDays(firstOfMonth, -firstOfMonth.getDay())

  return Array.from({ length: 42 }, (_, index) => addDays(firstVisible, index))
}

function buildWeekDates(baseDate: Date) {
  const firstVisible = startOfWeek(baseDate)

  return Array.from({ length: 7 }, (_, index) => addDays(firstVisible, index))
}

function eventDateKey(event: CalendarEvent) {
  const date = new Date(event.startAt)

  if (Number.isNaN(date.getTime())) {
    return event.startAt.slice(0, 10)
  }

  return formatDateKey(date)
}

function formatDisplayDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }

  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

function formatTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(11, 16) || '--:--'
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function timeValue(value?: string | null, fallback = '10:00') {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseCategory(event: CalendarEvent): ScheduleCategory {
  const description = event.description ?? ''
  const match = description.match(CATEGORY_PREFIX_PATTERN)

  if (match?.[1] && isScheduleCategory(match[1])) {
    return match[1]
  }

  const haystack = `${event.title} ${description}`.toLowerCase()

  if (/(회의|미팅|meeting|sync|standup)/i.test(haystack)) {
    return 'meeting'
  }

  if (/(마감|스프린트|milestone|deadline|release)/i.test(haystack)) {
    return 'milestone'
  }

  if (/(api|db|spring|server|backend|백엔드|서버)/i.test(haystack)) {
    return 'task-be'
  }

  return 'task-fe'
}

function isDeadlineEvent(event: CalendarEvent) {
  return DEADLINE_METADATA_PATTERN.test(event.description ?? '')
}

function stripCategoryDescription(description?: string | null) {
  let content = description ?? ''
  let stripped = content

  do {
    content = stripped
    stripped = content.replace(CATEGORY_PREFIX_PATTERN, '').replace(DEADLINE_PREFIX_PATTERN, '')
  } while (content !== stripped)

  return stripped.trim()
}

function buildCategoryDescription(category: ScheduleCategory, description: string, isDeadline: boolean) {
  const content = description.trim()
  const metadata = [`[schedule-category:${category}]`]

  if (isDeadline) {
    metadata.push('[schedule-deadline:true]')
  }

  return content ? `${metadata.join('\n')}\n${content}` : metadata.join('\n')
}

function createEmptyForm(dateKey = formatDateKey(new Date())): ScheduleFormState {
  return {
    title: '',
    category: 'milestone',
    isDeadline: false,
    date: dateKey,
    startTime: '10:00',
    endTime: '11:00',
    description: '',
  }
}

function formFromEvent(event: CalendarEvent): ScheduleFormState {
  return {
    title: event.title,
    category: parseCategory(event),
    isDeadline: isDeadlineEvent(event),
    date: eventDateKey(event),
    startTime: timeValue(event.startAt, '10:00'),
    endTime: timeValue(event.endAt, '11:00'),
    description: stripCategoryDescription(event.description),
  }
}

function normalizeEndAt(startAt: string, endAt: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)

  if (Number.isNaN(start.getTime())) {
    return endAt
  }

  if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    const next = new Date(start)
    next.setHours(next.getHours() + 1)
    return toLocalDateTimeString(next)
  }

  return endAt
}

function getDday(value: string) {
  const today = startOfDay(new Date())
  const target = startOfDay(new Date(value))

  if (Number.isNaN(target.getTime())) {
    return ''
  }

  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)

  if (diff === 0) {
    return 'D-Day'
  }

  if (diff < 0) {
    return `D+${Math.abs(diff)}`
  }

  return `D-${diff}`
}

function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())
}

export default function SquadScheduleApp() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState<ScheduleFormState>(() => createEmptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.title = 'DevPath - 일정 관리'
    const html = document.documentElement
    const body = document.body

    const root = document.getElementById('root')
    const appViewport = document.querySelector<HTMLElement>('.app-viewport')
    html.classList.add('h-full!', 'overflow-hidden!')
    body.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    root?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    appViewport?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')

    return () => {
      html.classList.remove('h-full!', 'overflow-hidden!')
      body.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      root?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      appViewport?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    const currentSession = readStoredAuthSession()

    if (!currentSession?.accessToken) {
      setLoading(false)
      setAuthView('login')
      showAuthToast({ message: '스쿼드 일정은 로그인 후 이용할 수 있습니다.', durationMs: 2200 })
      return
    }

    let ignore = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [dashboardData, eventData] = await Promise.all([
          projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, {}, 'required'),
          projectApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, {}, 'required'),
        ])

        if (ignore) {
          return
        }

        setDashboard(dashboardData)
        setEvents(sortEvents(eventData ?? []))
      } catch {
        if (!ignore) {
          setError('일정 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [workspaceId])

  const members = dashboard?.members ?? []
  const projectName = dashboard?.name ?? '스쿼드 일정'
  const todayKey = formatDateKey(new Date())
  const visibleDates = useMemo(
    () => (view === 'month' ? buildMonthDates(currentDate) : buildWeekDates(currentDate)),
    [currentDate, view],
  )
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>()

    for (const event of events) {
      const key = eventDateKey(event)
      const dayEvents = grouped.get(key) ?? []
      dayEvents.push(event)
      grouped.set(key, dayEvents)
    }

    return grouped
  }, [events])
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date())

    return events.filter((event) => startOfDay(new Date(event.startAt)).getTime() >= today.getTime())
  }, [events])
  const displayLabel =
    view === 'month'
      ? `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
      : `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${Math.floor((currentDate.getDate() - 1) / 7) + 1}주차`

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
    setAuthView('login')
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
    window.location.reload()
  }

  function navigateDate(amount: number) {
    setCurrentDate((date) => {
      const next = new Date(date)

      if (view === 'month') {
        next.setMonth(next.getMonth() + amount)
      } else {
        next.setDate(next.getDate() + amount * 7)
      }

      return next
    })
  }

  function openCreateModal(dateKey = formatDateKey(currentDate)) {
    setEditingEvent(null)
    setForm(createEmptyForm(dateKey))
    setModalOpen(true)
  }

  function openEditModal(event: CalendarEvent) {
    setEditingEvent(event)
    setForm(formFromEvent(event))
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingEvent(null)
    setForm(createEmptyForm(formatDateKey(currentDate)))
  }

  async function saveSchedule(event: FormEvent) {
    event.preventDefault()

    if (!workspaceId || !form.title.trim() || !form.date) {
      showAuthToast({ message: '일정 제목과 날짜를 입력해주세요.', variant: 'error' })
      return
    }

    setSaving(true)

    const startAt = `${form.date}T${form.startTime || '10:00'}:00`
    const endAt = normalizeEndAt(startAt, `${form.date}T${form.endTime || '11:00'}:00`)
    const payload = {
      title: form.title.trim(),
      description: buildCategoryDescription(form.category, form.description, form.isDeadline),
      startAt,
      endAt,
    }

    try {
      const saved = editingEvent
        ? await projectApiRequest<CalendarEvent>(
            `/api/calendar-events/${editingEvent.eventId}`,
            {
              method: 'PATCH',
              body: JSON.stringify(payload),
            },
            'required',
          )
        : await projectApiRequest<CalendarEvent>(
            `/api/workspaces/${workspaceId}/calendar-events`,
            {
              method: 'POST',
              body: JSON.stringify(payload),
            },
            'required',
          )

      setEvents((current) => {
        const next = editingEvent
          ? current.map((item) => (item.eventId === saved.eventId ? saved : item))
          : [...current, saved]

        return sortEvents(next)
      })
      closeModal()
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-schedule',
        message: `${squadActorName(session?.name)}님이 일정 "${saved.title}"을 ${editingEvent ? '수정' : '등록'}했습니다.`,
        targetPath: '/squad-schedule',
      })
      showAuthToast(editingEvent ? '일정이 수정되었습니다.' : '새 일정이 등록되었습니다.')
    } catch {
      showAuthToast({ message: '일정을 저장하지 못했습니다.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteSchedule() {
    if (!editingEvent) {
      return
    }

    setSaving(true)

    try {
      await projectApiRequest<void>(
        `/api/calendar-events/${editingEvent.eventId}`,
        {
          method: 'DELETE',
        },
        'required',
      )
      setEvents((current) => current.filter((item) => item.eventId !== editingEvent.eventId))
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-schedule',
        message: `${squadActorName(session?.name)}님이 일정 "${editingEvent.title}"을 삭제했습니다.`,
        targetPath: '/squad-schedule',
      })
      closeModal()
      showAuthToast('일정이 삭제되었습니다.')
    } catch {
      showAuthToast({ message: '일정을 삭제하지 못했습니다.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }


  function renderEventPill(event: CalendarEvent, mode: CalendarView) {
    const category = parseCategory(event)
    const config = CATEGORY_CONFIG[category]
    const isDeadline = isDeadlineEvent(event)

    return (
      <button
        key={event.eventId}
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation()
          openEditModal(event)
        }}
        className={`event-pill relative z-[1] w-full cursor-pointer text-left box-border border font-bold shadow-sm transition hover:-translate-y-[1px] hover:shadow-md ${config.className} ${isDeadline ? 'deadline-event-pill border-[#fecaca]! [box-shadow:inset_3px_0_0_#ef4444,0_1px_2px_rgba(185,28,28,0.08)]!' : ''} ${
          mode === 'week'
            ? 'week-event-pill px-2.5 py-2 text-xs mb-2 flex flex-col gap-1 bg-white'
            : 'month-event-pill mb-[4px]! flex min-h-[24px] items-center gap-[4px]! truncate rounded-[4px]! bg-white px-[6px]! py-[4px]! text-[10px]! leading-[12px]!'
        }`}
        title={event.title}
      >
        <span className={`flex items-center min-w-0 ${mode === 'week' ? 'gap-1.5' : 'gap-1'}`}>
          <i className={`${config.iconClass} shrink-0 ${mode === 'week' ? 'text-[11px]' : 'text-[10px]! leading-[12px]!'}`}></i>
          <span className={mode === 'week' ? 'leading-snug break-words whitespace-normal' : 'truncate text-[10px]! leading-[12px]!' }>{event.title}</span>
        </span>
        {mode === 'week' ? (
          <span className="text-[10px] opacity-75 font-extrabold flex items-center gap-1">
            <span>{`${formatTime(event.startAt)}-${formatTime(event.endAt)}`}</span>
            {isDeadline ? <span className="deadline-event-dday h-[16px] rounded-[999px] bg-[#fee2e2] px-[5px] text-[9px]! leading-[16px]! text-[#dc2626]">{getDday(event.startAt)}</span> : null}
          </span>
        ) : null}
      </button>
    )
  }

  function renderAuthModal() {
    return authView ? (
      <AuthModal
        view={authView}
        onClose={() => setAuthView(null)}
        onViewChange={setAuthView}
        onAuthenticated={handleAuthenticated}
      />
    ) : null
  }

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
        {renderAuthModal()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <i className="fas fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
          <p className="font-extrabold text-gray-900">{error}</p>
          <a href="/workspace-hub" className="inline-flex mt-5 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
            워크스페이스로 돌아가기
          </a>
        </div>
        {renderAuthModal()}
      </div>
    )
  }

  return (
    <div className="squad-dashboard-page squad-schedule-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
      <SquadWorkspaceAside activePage="schedule" workspaceId={workspaceId} projectName={projectName} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          workspaceId={workspaceId}
          projectName={projectName}
          members={members}
          statusLabel="진행 중"
          currentUserName={session?.name}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="schedule-page-toolbar z-10 flex min-h-[97px] shrink-0 flex-col justify-between gap-4 border-b border-gray-100 bg-white px-[32px]! py-[24px]! md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <h1 className="schedule-page-title m-0 flex items-center gap-2 text-[24px]! leading-[32px]! font-extrabold text-gray-900">
                <i className="fas fa-calendar-alt text-brand"></i> 프로젝트 캘린더
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="schedule-view-group mr-[8px]! flex h-[40px] rounded-[12px] border border-gray-200 bg-gray-50 p-[4px]! shadow-inner">
                <button
                  type="button"
                  onClick={() => setView('month')}
                  className={`schedule-view-tab inline-flex h-[30px] min-w-[98px] items-center justify-center whitespace-nowrap rounded-[8px] border border-transparent px-[16px]! py-0! text-[12px]! leading-[16px]! font-[700]! transition box-border ${view === 'month' ? 'active border-[#E5E7EB] bg-white text-[#111827] [box-shadow:0_1px_2px_rgba(15,23,42,0.08)]' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  월간 (Month)
                </button>
                <button
                  type="button"
                  onClick={() => setView('week')}
                  className={`schedule-view-tab inline-flex h-[30px] min-w-[98px] items-center justify-center whitespace-nowrap rounded-[8px] border border-transparent px-[16px]! py-0! text-[12px]! leading-[16px]! font-[700]! transition box-border ${view === 'week' ? 'active border-[#E5E7EB] bg-white text-[#111827] [box-shadow:0_1px_2px_rgba(15,23,42,0.08)]' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  주간 (Week)
                </button>
              </div>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="schedule-add-button flex h-[42px] items-center gap-[8px] whitespace-nowrap rounded-[12px] bg-gray-900 px-[20px]! py-0! text-[14px]! leading-[20px]! font-bold text-white shadow-lg transition hover:bg-black"
              >
                <i className="fas fa-plus"></i> 일정 추가
              </button>
            </div>
          </div>

          <div className="schedule-content-wrap flex flex-1 gap-[24px]! overflow-hidden bg-[#F3F4F6] p-[24px]!">
              <section className="schedule-calendar-panel flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-w-0">
                <div className="schedule-calendar-header flex min-h-[69px] shrink-0 items-center justify-between border-b border-gray-100 bg-white p-[20px]!">
                  <h2 className="schedule-current-date m-0 flex items-center gap-2 text-[20px]! leading-[28px]! font-extrabold text-gray-900">
                    <span>{displayLabel}</span>
                  </h2>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => navigateDate(-1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[12px]! leading-[16px]! text-gray-600 transition hover:bg-gray-50"
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date())}
                      className="h-8 rounded-lg border border-gray-200 px-3 text-[12px]! leading-[16px]! font-bold text-gray-700 transition hover:bg-gray-50"
                    >
                      오늘
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateDate(1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[12px]! leading-[16px]! text-gray-600 transition hover:bg-gray-50"
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 shrink-0">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <div key={label} className={`schedule-weekday py-[12px]! text-center text-[12px]! leading-[16px]! font-extrabold ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'}`}>
                      {label}
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-gray-100">
                  <div className={`grid min-h-full grid-cols-7 gap-px ${view === 'month' ? 'schedule-month-grid h-full min-h-0! [grid-template-rows:repeat(6,minmax(0,1fr))] [grid-auto-rows:minmax(0,1fr)]' : 'schedule-week-grid [grid-template-rows:minmax(0,1fr)]'}`}>
                    {visibleDates.map((date) => {
                      const key = formatDateKey(date)
                      const dayEvents = eventsByDate.get(key) ?? []
                      const isToday = key === todayKey
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth()

                      return (
                        <div
                          key={key}
                          role="button"
                          tabIndex={0}
                          onClick={() => openCreateModal(key)}
                          onKeyDown={(keyEvent) => {
                            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                              keyEvent.preventDefault()
                              openCreateModal(key)
                            }
                          }}
                          className={`calendar-cell group relative flex min-w-0 cursor-pointer flex-col border-r border-b border-gray-100 text-left [transition:background-color_0.2s] ${
                            view === 'month' && !isCurrentMonth ? 'bg-gray-50/70' : 'bg-white'
                          } ${view === 'month' ? 'month-calendar-cell min-h-0 overflow-hidden p-[8px]!' : 'week-calendar-cell min-h-full p-3'}`}
                        >
                          <div className={`text-center ${view === 'month' ? 'month-date-wrap mb-[6px]!' : 'mb-4 pb-2 border-b border-gray-100'}`}>
                            <span
                              className={
                                isToday
                                  ? `${view === 'month' ? 'month-date-badge h-[24px]! w-[24px]! text-[12px]! leading-[16px]!' : 'w-8 h-8 text-sm'} bg-brand text-white rounded-full inline-flex items-center justify-center font-black shadow-md`
                                  : `${view === 'month' ? 'month-date-badge h-[24px]! w-[24px]! text-[12px]! leading-[16px]!' : 'w-8 h-8 text-sm'} text-gray-700 inline-flex items-center justify-center font-bold`
                              }
                            >
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                            {dayEvents.map((item) => renderEventPill(item, view))}
                          </div>
                          <span className="absolute inset-0 bg-gray-50/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                            <i className={`fas fa-plus text-gray-400 ${view === 'month' ? 'text-xl' : 'text-3xl'}`}></i>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>

              <aside className="w-80 flex flex-col gap-4 shrink-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="schedule-upcoming-header flex min-h-[65px] shrink-0 items-center justify-between border-b border-gray-100 bg-[linear-gradient(to_right,#F9FAFB,#fff)] p-[20px]!">
                    <h3 className="schedule-upcoming-title m-0 flex items-center gap-2 text-[16px]! leading-[24px]! font-extrabold text-gray-900">
                      <i className="fas fa-flag-checkered text-brand"></i> 다가오는 일정
                    </h3>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{upcomingEvents.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => {
                        const category = parseCategory(event)
                        const config = CATEGORY_CONFIG[category]
                        const dday = getDday(event.startAt)
                        const isDeadline = isDeadlineEvent(event)

                        return (
                          <button
                            key={event.eventId}
                            type="button"
                            onClick={() => openEditModal(event)}
                            className={`w-full rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:shadow-md ${isDeadline ? 'deadline-upcoming-card border-[#fecaca]! [box-shadow:inset_3px_0_0_#ef4444,0_1px_3px_rgba(185,28,28,0.08)]!' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <span className={`${config.className} text-[9px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 border`}>
                                <i className={`${config.iconClass} text-[10px]`}></i> {config.shortLabel}
                              </span>
                              {dday ? (
                                <span className={`${isDeadline ? 'deadline-upcoming-badge border border-[#ef4444]! bg-[#ef4444]! text-white!' : dday === 'D-Day' ? 'bg-red-500 text-white animate-pulse' : 'bg-red-100 text-red-600 border border-red-200'} text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm`}>
                                  {dday}
                                </span>
                              ) : null}
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{event.title}</h4>
                            <div className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                              <i className="far fa-calendar-alt"></i> {formatDisplayDate(event.startAt)} {formatTime(event.startAt)}
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="text-center text-xs text-gray-400 font-bold py-10">다가오는 일정이 없습니다.</div>
                    )}
                  </div>
                </div>
              </aside>
          </div>
        </main>
      </div>

      {modalOpen ? (
        <div className="squad-schedule-modal fixed inset-0 z-[1050]! flex items-center justify-center bg-gray-900/60 p-4 opacity-100 visible [transition:opacity_0.2s,visibility_0.2s] backdrop-blur-sm">
          <form onSubmit={saveSchedule} className="squad-schedule-modal-content relative flex max-h-[calc(100vh-32px)] w-[448px]! max-w-[calc(100vw-32px)]! flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl">
            <div className="squad-schedule-modal-header flex min-h-[72px] shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-[24px]! py-[20px]!">
              <h3 className="squad-schedule-modal-title m-0 flex items-center gap-2 text-[18px]! leading-[28px]! font-extrabold text-gray-900">
                <i className="fas fa-calendar-plus text-brand"></i> {editingEvent ? '일정 수정' : '새 일정 등록'}
              </h3>
              <button type="button" onClick={closeModal} className="squad-schedule-modal-close flex h-[32px]! w-[32px]! items-center justify-center rounded-full border border-gray-200 bg-white p-0! text-gray-400 shadow-sm transition box-border hover:text-gray-900">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="squad-schedule-modal-body custom-scrollbar space-y-5 overflow-y-auto px-[24px]! py-[18px]!">
              <div>
                <label className="squad-schedule-modal-label mb-[6px]! block text-[11px]! leading-[16px]! font-bold text-gray-700">일정 제목 <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={(changeEvent) => setForm((current) => ({ ...current, title: changeEvent.target.value }))}
                  className="squad-schedule-modal-control h-[38px]! w-full rounded-[12px] border border-gray-200 px-[14px]! py-0! text-[13px]! leading-[18px]! font-bold shadow-sm transition box-border outline-none focus:border-brand"
                  placeholder="예. 결제 모듈 API 구현"
                />
              </div>

              <div className="mt-[14px]! grid grid-cols-2 gap-[12px]!">
                <div>
                  <label className="squad-schedule-modal-label mb-[6px]! block text-[11px]! leading-[16px]! font-bold text-gray-700">일정 분류</label>
                  <select
                    value={form.category}
                    onChange={(changeEvent) => {
                      const value = changeEvent.target.value
                      if (isScheduleCategory(value)) {
                        setForm((current) => ({ ...current, category: value }))
                      }
                    }}
                    className="squad-schedule-modal-control h-[38px]! w-full cursor-pointer rounded-[12px] border border-gray-200 bg-white px-[14px]! py-0! text-[13px]! leading-[18px]! font-medium shadow-sm box-border outline-none focus:border-brand"
                  >
                    {SCHEDULE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {CATEGORY_CONFIG[category].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="squad-schedule-modal-label mb-[6px]! block text-[11px]! leading-[16px]! font-bold text-gray-700">날짜</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(changeEvent) => setForm((current) => ({ ...current, date: changeEvent.target.value }))}
                    className="squad-schedule-modal-control h-[38px]! w-full cursor-pointer rounded-[12px] border border-gray-200 bg-white px-[14px]! py-0! text-[13px]! leading-[18px]! font-bold text-gray-700 shadow-sm transition box-border outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="mt-[14px]! grid grid-cols-2 gap-[12px]!">
                <div>
                  <label className="squad-schedule-modal-label mb-[6px]! block text-[11px]! leading-[16px]! font-bold text-gray-700">시작 시간</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(changeEvent) => setForm((current) => ({ ...current, startTime: changeEvent.target.value }))}
                    className="squad-schedule-modal-control h-[38px]! w-full cursor-pointer rounded-[12px] border border-gray-200 bg-white px-[14px]! py-0! text-[13px]! leading-[18px]! font-bold text-gray-700 shadow-sm transition box-border outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="squad-schedule-modal-label mb-[6px]! block text-[11px]! leading-[16px]! font-bold text-gray-700">종료 시간</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(changeEvent) => setForm((current) => ({ ...current, endTime: changeEvent.target.value }))}
                    className="squad-schedule-modal-control h-[38px]! w-full cursor-pointer rounded-[12px] border border-gray-200 bg-white px-[14px]! py-0! text-[13px]! leading-[18px]! font-bold text-gray-700 shadow-sm transition box-border outline-none focus:border-brand"
                  />
                </div>
              </div>

              <label className="squad-schedule-deadline-toggle mt-[14px]! flex min-h-[42px] cursor-pointer items-center justify-between gap-3 rounded-[12px] border border-gray-200 bg-gray-50 px-[12px]! py-[8px]!">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="squad-schedule-deadline-icon flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-red-100 bg-white text-[11px]! leading-[26px]! text-red-500">
                    <i className="fas fa-hourglass-half"></i>
                  </span>
                  <span className="min-w-0">
                    <span className="squad-schedule-deadline-title block text-[12px]! leading-[16px]! font-extrabold text-gray-800">마감 일정</span>
                    <span className="squad-schedule-deadline-copy block text-[10px]! leading-[12px]! font-bold text-gray-400">D-Day</span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isDeadline}
                  onChange={(changeEvent) => setForm((current) => ({ ...current, isDeadline: changeEvent.target.checked }))}
                  className="squad-schedule-deadline-input h-[16px]! w-[16px]! cursor-pointer accent-brand box-border"
                />
              </label>

              <div className="mt-[14px]!">
                <label className="squad-schedule-modal-label mb-[6px]! block text-[11px]! leading-[16px]! font-bold text-gray-700">메모 <span className="text-gray-400 font-normal">선택</span></label>
                <textarea
                  value={form.description}
                  onChange={(changeEvent) => setForm((current) => ({ ...current, description: changeEvent.target.value }))}
                  className="squad-schedule-modal-textarea h-[68px]! w-full resize-none rounded-[12px] border border-gray-200 px-[14px]! py-[10px]! text-[13px]! leading-[18px]! shadow-sm transition box-border outline-none focus:border-brand"
                  placeholder="일정 설명이나 준비물을 적어두세요."
                />
              </div>
            </div>

            <div className="squad-schedule-modal-footer flex min-h-[66px] shrink-0 justify-between gap-2 border-t border-gray-100 bg-gray-50 px-[20px]! py-[14px]!">
              <div>
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={deleteSchedule}
                    disabled={saving}
                    className="squad-schedule-modal-action h-[38px] rounded-[12px] border border-red-100 bg-white px-4 py-0! text-[13px]! leading-[18px]! font-bold text-red-500 shadow-sm transition box-border hover:bg-red-50 disabled:opacity-60"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="squad-schedule-modal-action h-[38px] rounded-[12px] border border-gray-200 bg-white px-5 py-0! text-[13px]! leading-[18px]! font-bold text-gray-600 shadow-sm transition box-border hover:bg-gray-50">
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="squad-schedule-modal-action squad-schedule-modal-save flex h-[38px] items-center gap-1.5 rounded-[12px] bg-gray-900 px-6 py-0! text-[13px]! leading-[18px]! font-bold text-white shadow-md transition box-border hover:bg-black disabled:opacity-60"
                >
                  <i className="fas fa-save"></i> {editingEvent ? '수정하기' : '추가하기'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {renderAuthModal()}
    </div>
  )
}
