import { useEffect, useMemo, useState, type FormEvent } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SquadWorkspaceAside from './components/SquadWorkspaceAside'
import SquadWorkspaceHeader from './components/SquadWorkspaceHeader'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { projectApiRequest } from './project-api'
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

    html.classList.add('squad-dashboard-document')
    body.classList.add('squad-dashboard-body')

    return () => {
      html.classList.remove('squad-dashboard-document')
      body.classList.remove('squad-dashboard-body')
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
        className={`event-pill w-full text-left rounded-lg border font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${config.className} ${isDeadline ? 'deadline-event-pill' : ''} ${
          mode === 'week'
            ? 'week-event-pill px-2.5 py-2 text-xs mb-2 flex flex-col gap-1 bg-white'
            : 'month-event-pill px-1.5 py-1 text-[10px] mb-1 flex items-center gap-1 bg-white truncate'
        }`}
        title={event.title}
      >
        <span className={`flex items-center min-w-0 ${mode === 'week' ? 'gap-1.5' : 'gap-1'}`}>
          <i className={`${config.iconClass} shrink-0 ${mode === 'week' ? 'text-[11px]' : 'text-[10px]'}`}></i>
          <span className={mode === 'week' ? 'leading-snug break-words whitespace-normal' : 'truncate'}>{event.title}</span>
        </span>
        {mode === 'week' ? (
          <span className="text-[10px] opacity-75 font-extrabold flex items-center gap-1">
            <span>{`${formatTime(event.startAt)}-${formatTime(event.endAt)}`}</span>
            {isDeadline ? <span className="deadline-event-dday">{getDday(event.startAt)}</span> : null}
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
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
        {renderAuthModal()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
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
    <div className="squad-dashboard-page squad-schedule-page flex h-screen overflow-hidden text-gray-800">
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
          <div className="schedule-page-toolbar px-8 py-6 shrink-0 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
            <div className="flex items-center gap-4">
              <h1 className="schedule-page-title text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-calendar-alt text-brand"></i> 프로젝트 캘린더
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="schedule-view-group flex bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-inner mr-0 md:mr-2">
                <button
                  type="button"
                  onClick={() => setView('month')}
                  className={`schedule-view-tab px-4 py-1.5 rounded-lg text-xs font-bold transition ${view === 'month' ? 'active' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  월간 (Month)
                </button>
                <button
                  type="button"
                  onClick={() => setView('week')}
                  className={`schedule-view-tab px-4 py-1.5 rounded-lg text-xs font-bold transition ${view === 'week' ? 'active' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  주간 (Week)
                </button>
              </div>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="schedule-add-button px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-black transition shadow-lg flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> 일정 추가
              </button>
            </div>
          </div>

          <div className="schedule-content-wrap flex-1 flex overflow-hidden bg-[#F3F4F6] p-6 gap-6">
              <section className="schedule-calendar-panel flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-w-0">
                <div className="schedule-calendar-header p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                  <h2 className="schedule-current-date text-xl font-extrabold text-gray-900 flex items-center gap-2">
                    <span>{displayLabel}</span>
                  </h2>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => navigateDate(-1)}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition"
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 h-8 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition"
                    >
                      오늘
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateDate(1)}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition"
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 shrink-0">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <div key={label} className={`schedule-weekday py-3 text-center text-xs font-extrabold ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'}`}>
                      {label}
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-gray-100">
                  <div className={`grid grid-cols-7 gap-px min-h-full ${view === 'month' ? 'schedule-month-grid' : 'schedule-week-grid'}`}>
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
                          className={`calendar-cell group relative text-left flex flex-col border-r border-b border-gray-100 min-w-0 ${
                            view === 'month' && !isCurrentMonth ? 'bg-gray-50/70' : 'bg-white'
                          } ${view === 'month' ? 'month-calendar-cell p-2' : 'week-calendar-cell p-3'}`}
                        >
                          <div className={`text-center ${view === 'month' ? 'month-date-wrap mb-1.5' : 'mb-4 pb-2 border-b border-gray-100'}`}>
                            <span
                              className={
                                isToday
                                  ? `${view === 'month' ? 'month-date-badge w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} bg-brand text-white rounded-full inline-flex items-center justify-center font-black shadow-md`
                                  : `${view === 'month' ? 'month-date-badge w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} text-gray-700 inline-flex items-center justify-center font-bold`
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
                  <div className="schedule-upcoming-header p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="schedule-upcoming-title font-extrabold text-gray-900 flex items-center gap-2">
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
                            className={`w-full text-left p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition ${isDeadline ? 'deadline-upcoming-card' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <span className={`${config.className} text-[9px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 border`}>
                                <i className={`${config.iconClass} text-[10px]`}></i> {config.shortLabel}
                              </span>
                              {dday ? (
                                <span className={`${isDeadline ? 'deadline-upcoming-badge' : dday === 'D-Day' ? 'bg-red-500 text-white animate-pulse' : 'bg-red-100 text-red-600 border border-red-200'} text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm`}>
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
        <div className="modal active squad-schedule-modal fixed inset-0 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <form onSubmit={saveSchedule} className="squad-schedule-modal-content bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden flex flex-col">
            <div className="squad-schedule-modal-header p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="squad-schedule-modal-title text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-calendar-plus text-brand"></i> {editingEvent ? '일정 수정' : '새 일정 등록'}
              </h3>
              <button type="button" onClick={closeModal} className="squad-schedule-modal-close text-gray-400 hover:text-gray-900 bg-white border border-gray-200 w-8 h-8 rounded-full flex items-center justify-center transition shadow-sm">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="squad-schedule-modal-body p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="squad-schedule-modal-label block text-xs font-bold text-gray-700 mb-2">일정 제목 <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={(changeEvent) => setForm((current) => ({ ...current, title: changeEvent.target.value }))}
                  className="squad-schedule-modal-control w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm font-bold"
                  placeholder="예. 결제 모듈 API 구현"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="squad-schedule-modal-label block text-xs font-bold text-gray-700 mb-2">일정 분류</label>
                  <select
                    value={form.category}
                    onChange={(changeEvent) => {
                      const value = changeEvent.target.value
                      if (isScheduleCategory(value)) {
                        setForm((current) => ({ ...current, category: value }))
                      }
                    }}
                    className="squad-schedule-modal-control w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm bg-white cursor-pointer"
                  >
                    {SCHEDULE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {CATEGORY_CONFIG[category].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="squad-schedule-modal-label block text-xs font-bold text-gray-700 mb-2">날짜</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(changeEvent) => setForm((current) => ({ ...current, date: changeEvent.target.value }))}
                    className="squad-schedule-modal-control w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm font-bold text-gray-700 cursor-pointer bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="squad-schedule-modal-label block text-xs font-bold text-gray-700 mb-2">시작 시간</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(changeEvent) => setForm((current) => ({ ...current, startTime: changeEvent.target.value }))}
                    className="squad-schedule-modal-control w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm font-bold text-gray-700 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="squad-schedule-modal-label block text-xs font-bold text-gray-700 mb-2">종료 시간</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(changeEvent) => setForm((current) => ({ ...current, endTime: changeEvent.target.value }))}
                    className="squad-schedule-modal-control w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm font-bold text-gray-700 cursor-pointer bg-white"
                  />
                </div>
              </div>

              <label className="squad-schedule-deadline-toggle flex items-center justify-between gap-3 border border-gray-200 rounded-xl bg-gray-50 px-3 py-2 cursor-pointer">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="squad-schedule-deadline-icon flex items-center justify-center rounded-lg bg-white text-red-500 border border-red-100">
                    <i className="fas fa-hourglass-half"></i>
                  </span>
                  <span className="min-w-0">
                    <span className="squad-schedule-deadline-title block font-extrabold text-gray-800">마감 일정</span>
                    <span className="squad-schedule-deadline-copy block font-bold text-gray-400">D-Day</span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isDeadline}
                  onChange={(changeEvent) => setForm((current) => ({ ...current, isDeadline: changeEvent.target.checked }))}
                  className="squad-schedule-deadline-input accent-brand cursor-pointer"
                />
              </label>

              <div>
                <label className="squad-schedule-modal-label block text-xs font-bold text-gray-700 mb-2">메모 <span className="text-gray-400 font-normal">선택</span></label>
                <textarea
                  value={form.description}
                  onChange={(changeEvent) => setForm((current) => ({ ...current, description: changeEvent.target.value }))}
                  className="squad-schedule-modal-textarea w-full h-24 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm resize-none"
                  placeholder="일정 설명이나 준비물을 적어두세요."
                />
              </div>
            </div>

            <div className="squad-schedule-modal-footer p-5 border-t border-gray-100 bg-gray-50 flex justify-between gap-2 shrink-0">
              <div>
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={deleteSchedule}
                    disabled={saving}
                    className="squad-schedule-modal-action px-4 py-2.5 text-sm font-bold text-red-500 bg-white border border-red-100 rounded-xl hover:bg-red-50 transition shadow-sm disabled:opacity-60"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="squad-schedule-modal-action px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="squad-schedule-modal-action squad-schedule-modal-save px-6 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-md flex items-center gap-1.5 disabled:opacity-60"
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
