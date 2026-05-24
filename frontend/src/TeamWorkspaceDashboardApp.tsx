import { useEffect, useMemo, useState } from 'react'
import LoginRequiredView from './components/LoginRequiredView'
import TeamWorkspaceHeader from './components/TeamWorkspaceHeader'
import UserAvatar from './components/UserAvatar'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from './lib/auth-session'
import { projectApiRequest } from './project-api'
import { TEAM_WORKSPACE_COLLABORATION_NAV, TEAM_WORKSPACE_RESOURCE_NAV } from './team-workspace-nav'

type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type MilestoneStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CLOSED'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName: string
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

type Milestone = {
  milestoneId: number
  workspaceId: number
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  status: MilestoneStatus
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

type Notice = {
  id: number
  workspaceId: number
  title: string
  content?: string | null
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

type RoleKey = 'frontend' | 'backend' | 'design' | 'planning'

type RoleStat = {
  key: RoleKey
  label: string
  icon: string
  color: string
  sampleTitle: string
  total: number
  done: number
  progress: number
}

const ROLE_META: Record<RoleKey, { label: string; icon: string; color: string; keywords: string[] }> = {
  frontend: {
    label: 'Frontend',
    icon: 'fa-code',
    color: '#2563eb',
    keywords: ['frontend', 'front', 'react', 'vue', 'ui', 'ux', '화면', '프론트'],
  },
  backend: {
    label: 'Backend',
    icon: 'fa-server',
    color: '#16a34a',
    keywords: ['backend', 'back', 'api', 'server', 'spring', 'jpa', 'db', '서버', '백엔드'],
  },
  design: {
    label: 'Design',
    icon: 'fa-pen-nib',
    color: '#7c3aed',
    keywords: ['design', 'figma', 'wireframe', 'prototype', '디자인', '와이어프레임'],
  },
  planning: {
    label: 'Planning',
    icon: 'fa-list-check',
    color: '#ea580c',
    keywords: ['plan', 'docs', 'document', '기획', '문서', '요구사항', '회의'],
  },
}

const TEAM_TECH_CANDIDATES = [
  { label: 'React', keywords: ['react', 'frontend', '프론트'] },
  { label: 'Spring Boot', keywords: ['spring', 'boot', 'backend', '백엔드'] },
  { label: 'JPA', keywords: ['jpa', 'hibernate'] },
  { label: 'PostgreSQL', keywords: ['postgres', 'postgresql', 'db'] },
  { label: 'Redis', keywords: ['redis'] },
  { label: 'Figma', keywords: ['figma', 'design', '디자인'] },
  { label: 'REST API', keywords: ['api', 'rest'] },
]

function getWorkspaceIdFromUrl() {
  const value = new URLSearchParams(window.location.search).get('workspaceId')
  const parsed = value ? Number(value) : NaN

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function percent(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

function formatShortDate(value?: string | null) {
  if (!value) return '일정 미정'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '일정 미정'

  const today = new Date()
  if (
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  ) {
    return '오늘'
  }

  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(value?: string | null) {
  if (!value) return '시간 미정'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '시간 미정'

  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

function formatRelativeTime(value?: string | null) {
  if (!value) return '방금'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '방금'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 1) return '방금'
  if (diffMinutes < 60) return `${diffMinutes}분 전`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}시간 전`

  return `${Math.floor(diffHours / 24)}일 전`
}

function roleKeyForTask(task: WorkspaceTask): RoleKey {
  const text = `${task.title} ${task.description ?? ''}`.toLowerCase()
  const matched = (Object.keys(ROLE_META) as RoleKey[]).find((key) =>
    ROLE_META[key].keywords.some((keyword) => text.includes(keyword)),
  )

  return matched ?? 'planning'
}

function activityIcon(type: string) {
  if (type.includes('TASK')) return { icon: 'fa-tasks', color: 'text-blue-500', bg: 'bg-blue-50' }
  if (type.includes('FILE')) return { icon: 'fa-folder-open', color: 'text-purple-500', bg: 'bg-purple-50' }
  if (type.includes('NOTICE')) return { icon: 'fa-bullhorn', color: 'text-emerald-500', bg: 'bg-emerald-50' }
  if (type.includes('MEETING')) return { icon: 'fa-headset', color: 'text-red-500', bg: 'bg-red-50' }

  return { icon: 'fa-circle', color: 'text-gray-500', bg: 'bg-gray-50' }
}

function scheduleItemClass(index: number) {
  if (index === 0) return 'border-brand/20 bg-brand/10'
  if (index === 1) return 'border-red-100 bg-red-50'
  return 'border-gray-100 bg-gray-50'
}

function scheduleDateClass(index: number) {
  if (index === 0) return 'text-brand'
  if (index === 1) return 'text-red-500'
  return 'text-gray-500'
}

function isJoinableScheduleEvent(event: CalendarEvent) {
  const text = `${event.title} ${event.description ?? ''}`.toLowerCase()

  return /(scrum|meeting|meetup|live|voice|스크럼|회의|미팅|밋업|라이브|보이스|화상)/i.test(text)
}

function scheduleJoinPath(event: CalendarEvent) {
  const text = `${event.title} ${event.description ?? ''}`.toLowerCase()

  return /(voice|보이스|스크럼)/i.test(text) ? '/team-voice-channel' : '/team-ws-meeting'
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800">
      <div className="team-ws-card w-[420px] border border-gray-100 bg-white p-8 text-center shadow-sm">
        <i className="fas fa-circle-exclamation mb-3 text-3xl text-red-400"></i>
        <h1 className="text-xl font-black text-gray-900">팀 프로젝트 대시보드를 열 수 없습니다</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-gray-500">{message}</p>
        <a
          href="/workspace-hub"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-gray-900 px-5 text-sm font-black text-white hover:bg-black"
        >
          워크스페이스 허브로 이동
        </a>
      </div>
    </div>
  )
}

export default function TeamWorkspaceDashboardApp() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarPinned, setSidebarPinned] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousTitle = document.title

    html.classList.add('team-ws-dashboard-document')
    body.classList.add('team-ws-dashboard-body')
    document.title = 'DevPath - 팀 프로젝트 대시보드'

    return () => {
      html.classList.remove('team-ws-dashboard-document')
      body.classList.remove('team-ws-dashboard-body')
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())

    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
  }, [])

  useEffect(() => {
    if (!session || !workspaceId) {
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadDashboard() {
      setLoading(true)
      setError(null)

      try {
        const [dashboardData, taskData, milestoneData, eventData, noticeData, activityData] = await Promise.all([
          projectApiRequest<WorkspaceDashboard>(
            `/api/workspaces/${workspaceId}/dashboard`,
            { signal: controller.signal },
            'required',
          ),
          projectApiRequest<WorkspaceTask[]>(
            `/api/workspaces/${workspaceId}/tasks`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<Milestone[]>(
            `/api/workspaces/${workspaceId}/milestones`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<CalendarEvent[]>(
            `/api/workspaces/${workspaceId}/calendar-events`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<Notice[]>(
            `/api/workspaces/${workspaceId}/notices`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<ActivityLog[]>(
            `/api/workspaces/${workspaceId}/activities/recent`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
        ])

        if (controller.signal.aborted) return

        setDashboard(dashboardData)
        setTasks(taskData ?? [])
        setMilestones((milestoneData ?? []).sort((left, right) => {
          const leftTime = new Date(left.dueDate ?? left.createdAt ?? '').getTime()
          const rightTime = new Date(right.dueDate ?? right.createdAt ?? '').getTime()

          return (Number.isNaN(leftTime) ? 0 : leftTime) - (Number.isNaN(rightTime) ? 0 : rightTime)
        }))
        setEvents((eventData ?? []).sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()))
        setNotices(noticeData ?? [])
        setActivities(activityData ?? [])
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setError(nextError instanceof Error ? nextError.message : '팀 프로젝트 대시보드를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => controller.abort()
  }, [session, workspaceId])

  const memberById = useMemo(() => {
    const map = new Map<number, WorkspaceMember>()
    dashboard?.members.forEach((member) => map.set(member.learnerId, member))
    return map
  }, [dashboard])

  const hasDashboardData =
    tasks.length > 0 || milestones.length > 0 || events.length > 0 || notices.length > 0 || activities.length > 0
  const doneTasks = tasks.filter((task) => task.status === 'DONE').length
  const doingTasks = tasks.filter((task) => task.status === 'IN_PROGRESS').length
  const todoTasks = tasks.filter((task) => task.status === 'TODO').length
  const completedMilestones = milestones.filter((milestone) => milestone.status === 'DONE' || milestone.status === 'CLOSED').length
  const progressPercent = milestones.length > 0 ? percent(completedMilestones, milestones.length) : percent(doneTasks, tasks.length)
  const currentMilestoneIndex = milestones.findIndex((milestone) => milestone.status !== 'DONE' && milestone.status !== 'CLOSED')
  const upcomingEvents = events.slice(0, 3)
  const mentorNotes = notices.slice(0, 2)
  const currentMember = session?.userId ? memberById.get(session.userId) : null
  const currentUserName = currentMember?.learnerName ?? session?.name ?? '사용자'
  const activeMembers = dashboard?.members ?? []

  const roleStats = useMemo<RoleStat[]>(() => {
    const totals = new Map<RoleKey, { total: number; done: number; sampleTitle: string }>()

    tasks.forEach((task) => {
      const key = roleKeyForTask(task)
      const current = totals.get(key) ?? { total: 0, done: 0, sampleTitle: task.title }

      totals.set(key, {
        total: current.total + 1,
        done: current.done + (task.status === 'DONE' ? 1 : 0),
        sampleTitle: current.sampleTitle || task.title,
      })
    })

    return (Object.keys(ROLE_META) as RoleKey[])
      .map((key) => {
        const current = totals.get(key) ?? { total: 0, done: 0, sampleTitle: '' }
        const meta = ROLE_META[key]

        return {
          key,
          label: meta.label,
          icon: meta.icon,
          color: meta.color,
          sampleTitle: current.sampleTitle,
          total: current.total,
          done: current.done,
          progress: percent(current.done, current.total),
        }
      })
      .filter((role) => role.total > 0)
  }, [tasks])

  const techStack = useMemo(() => {
    const text = [
      dashboard?.name,
      dashboard?.description,
      ...tasks.flatMap((task) => [task.title, task.description ?? '']),
      ...milestones.flatMap((milestone) => [milestone.title, milestone.description ?? '']),
    ]
      .join(' ')
      .toLowerCase()

    const matched = TEAM_TECH_CANDIDATES.filter((candidate) =>
      candidate.keywords.some((keyword) => text.includes(keyword)),
    ).map((candidate) => candidate.label)

    return matched.length > 0 ? matched.slice(0, 5) : hasDashboardData ? ['React', 'Spring Boot', 'REST API'] : []
  }, [dashboard, hasDashboardData, milestones, tasks])

  const projectName = dashboard?.name?.trim() || 'AI 기반 맞춤형 여행 코스 추천 서비스'
  const projectDescription =
    dashboard?.description?.trim() || '사용자의 취향을 분석하여 최적의 여행 루트를 생성해주는 웹 서비스 구축'
  const milestoneTotal = milestones.length > 0 ? milestones.length : 5
  const milestoneStep = hasDashboardData
    ? Math.max(1, currentMilestoneIndex >= 0 ? currentMilestoneIndex + 1 : milestones.length || 1)
    : 1
  const submittedMilestones = milestones.length > 0 ? completedMilestones : hasDashboardData ? doneTasks : 0
  const weeklyMilestoneTotal = milestones.length > 0 ? milestones.length : hasDashboardData ? Math.max(tasks.length, 1) : 0
  const weeklyRate = weeklyMilestoneTotal > 0 ? percent(submittedMilestones, weeklyMilestoneTotal) : 0

  function goTo(path: string) {
    window.location.assign(navHref(path, workspaceId))
  }

  if (!session) {
    return <LoginRequiredView message="팀 프로젝트 대시보드는 로그인한 사용자만 접근할 수 있습니다." />
  }

  if (!workspaceId) {
    return <ErrorState message="workspaceId가 없습니다. 워크스페이스 허브에서 다시 진입해주세요." />
  }

  if (loading) {
    return (
      <div className="team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-team"></div>
          <p className="text-sm font-bold text-gray-500">팀 프로젝트 대시보드를 불러오는 중입니다.</p>
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return <ErrorState message={error} />
  }

  return (
    <div className="team-ws-dashboard-page flex h-screen overflow-hidden bg-[#F3F4F6] text-gray-800">
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

        <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3">
          <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Team Dashboard</p>
          <a href={navHref('/team-ws-dashboard', workspaceId)} className="nav-item active">
            <i className="fas fa-chart-line w-6 text-center text-lg"></i>
            <span className="sidebar-text">프로젝트 대시보드</span>
          </a>
          <a href={navHref('/team-ws-milestone', workspaceId)} className="nav-item">
            <div className="relative w-6 text-center text-lg">
              <i className="fas fa-flag-checkered"></i>
              {hasDashboardData ? <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full border border-white bg-red-500"></span> : null}
            </div>
            <span className="sidebar-text">마일스톤 & 역할별 과제</span>
          </a>

          <div className="mx-2 my-2 h-px bg-gray-100"></div>
          <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Collaboration</p>

          {TEAM_WORKSPACE_COLLABORATION_NAV.map((item) => (
            <a key={item.key} href={navHref(item.path, workspaceId)} className="nav-item">
              <i className={`fas ${item.icon} w-6 text-center text-lg`}></i>
              <span className="sidebar-text">{item.title}</span>
            </a>
          ))}

          <div className="mx-2 my-2 h-px bg-gray-100"></div>
          <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Resources & Live</p>

          {TEAM_WORKSPACE_RESOURCE_NAV.map((item) => (
            <a key={item.key} href={navHref(item.path, workspaceId)} className="nav-item">
              <i className={`fas ${item.icon} w-6 text-center text-lg`}></i>
              <span className="sidebar-text">{item.title}</span>
            </a>
          ))}
        </nav>

        <a href="/profile" className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
          <UserAvatar name={currentUserName} imageUrl={currentMember?.profileImage} className="h-10 w-10 border-2 border-gray-200 bg-white" iconClassName="text-sm" />
          <div className="sidebar-text">
            <p className="flex items-center gap-1 text-sm font-bold text-gray-900">
              나({currentUserName})
              <span className="rounded border border-blue-100 bg-blue-50 px-1 py-0.5 text-[9px] text-blue-600">Frontend</span>
            </p>
            <p className="mt-0.5 text-[10px] text-gray-500">내 역할 확인하기</p>
          </div>
        </a>
      </aside>

      <div className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        <TeamWorkspaceHeader
          workspaceId={workspaceId}
          pageKey="dashboard"
          projectName={projectName}
          members={activeMembers}
        />

        <main className="custom-scrollbar flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:flex-row">
              <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-team opacity-5 blur-3xl"></div>

              <div className="relative z-10 flex flex-1 items-center gap-6">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-indigo-100 bg-indigo-50">
                  <i className="fas fa-plane-departure text-3xl text-team"></i>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-gray-900">{projectName}</h2>
                  </div>
                  <p className="mb-3 text-sm text-gray-500">{projectDescription}</p>
                  <div className="flex gap-2 text-xs font-bold">
                    {techStack.length > 0 ? (
                      techStack.map((tech) => (
                        <span key={tech} className="rounded bg-gray-100 px-2 py-1 text-gray-600">
                          {tech}
                        </span>
                      ))
                    ) : (
                      <span className="rounded border border-dashed border-gray-200 bg-gray-100 px-2 py-1 text-gray-400">+ 스택 추가</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative z-10 w-full rounded-2xl border border-gray-100 bg-gray-50 p-5 transition hover:shadow-md md:w-96">
                <button type="button" onClick={() => goTo('/team-ws-milestone')} className="mb-2 flex w-full cursor-pointer items-end justify-between text-left">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">전체 프로덕트 완성도</p>
                    <p className={`text-xl font-extrabold ${hasDashboardData ? 'text-team' : 'text-gray-800'}`}>
                      Milestone {milestoneStep} <span className="text-sm font-medium text-gray-500">/ {milestoneTotal}단계</span>
                    </p>
                  </div>
                  <span className={`text-sm font-extrabold ${hasDashboardData ? 'text-gray-800' : 'text-gray-400'}`}>{progressPercent}%</span>
                </button>
                <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-2 bg-team transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className="mt-4 grid cursor-pointer grid-cols-2 gap-2 text-center">
                  <button type="button" onClick={() => goTo('/team-ws-kanban')} className="rounded-xl border border-gray-100 bg-white p-2.5 transition hover:border-team">
                    <p className="mb-1 text-[10px] font-bold text-gray-500">칸반 티켓 현황</p>
                    <p className={`text-xs font-extrabold ${hasDashboardData ? 'text-gray-800' : 'text-gray-300'}`}>
                      <span className={hasDashboardData ? 'text-gray-400' : ''} title="할 일">{todoTasks}</span> ·{' '}
                      <span className={hasDashboardData ? 'text-blue-500' : ''} title="진행 중">{doingTasks}</span> ·{' '}
                      <span className={hasDashboardData ? 'text-brand' : ''} title="완료">{doneTasks}</span>
                    </p>
                  </button>
                  <button type="button" onClick={() => goTo('/team-ws-milestone')} className="rounded-xl border border-gray-100 bg-white p-2.5 transition hover:border-team">
                    <p className="mb-1 text-[10px] font-bold text-gray-500">이번 주 마일스톤 제출률</p>
                    <p className={`text-xs font-extrabold ${hasDashboardData ? 'text-gray-800' : 'text-gray-400'}`}>
                      {submittedMilestones} / {weeklyMilestoneTotal}{' '}
                      <span className={`ml-0.5 text-[10px] ${hasDashboardData ? 'text-brand' : ''}`}>({weeklyRate}%)</span>
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between border-b border-gray-50 pb-3">
                    <h3 className="flex items-center gap-2 font-extrabold text-gray-900">
                      <i className={`fas fa-users-cog ${hasDashboardData ? 'text-brand' : 'text-gray-400'}`}></i> 직군별 이번 주 미션 현황
                    </h3>
                    <button type="button" onClick={() => goTo('/team-ws-kanban')} className="rounded px-2 py-1 text-xs font-bold text-gray-400 transition hover:bg-gray-50 hover:text-team">
                      팀 칸반 보기 <i className="fas fa-chevron-right ml-0.5 text-[10px]"></i>
                    </button>
                  </div>

                  {roleStats.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="w-16 rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-center text-xs font-bold text-blue-600">Frontend</span>
                            <span className="truncate text-xs font-medium text-gray-600">메인 랜딩 페이지 및 추천 결과 UI 퍼블리싱</span>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-green-500">
                            <i className="fas fa-check-circle"></i> 제출 완료
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-1.5 bg-blue-500" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="w-16 rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-center text-xs font-bold text-purple-600">Backend</span>
                            <span className="truncate text-xs font-medium text-gray-600">OpenAI API 연동 및 추천 알고리즘 로직 작성</span>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-yellow-500">
                            <i className="fas fa-spinner fa-spin"></i> 작업 중
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-1.5 bg-purple-500" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-300 shadow-sm">
                        <i className="fas fa-clipboard-list text-xl"></i>
                      </div>
                      <p className="text-sm font-bold text-gray-700">아직 등록된 미션이 없습니다</p>
                      <p className="mb-4 mt-1 text-xs text-gray-500">칸반 보드에서 이번 주에 진행할 첫 번째 작업을 생성해보세요.</p>
                      <button type="button" onClick={() => goTo('/team-ws-kanban')} className="team-dashboard-source-button flex items-center gap-2 rounded-lg bg-team px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700">
                        <i className="fas fa-plus"></i> 새 작업 만들기
                      </button>
                    </div>
                  )}

                  <div className={`mt-5 flex items-center justify-between rounded-xl border p-4 ${hasDashboardData ? 'border-indigo-100 bg-team-light' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                      <p className={`mb-0.5 text-[10px] font-bold ${hasDashboardData ? 'text-team' : 'text-gray-500'}`}>
                        {hasDashboardData ? '내 담당 파트: Frontend' : '환영합니다!'}
                      </p>
                      <p className={`text-sm font-bold ${hasDashboardData ? 'text-gray-900' : 'text-gray-800'}`}>
                        {hasDashboardData ? '제출된 과제에 대한 멘토 리뷰가 도착했습니다.' : '팀 워크스페이스 셋업을 완료해주세요.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => goTo(hasDashboardData ? '/team-ws-milestone' : '/team-ws-architecture')}
                      className={hasDashboardData
                        ? 'team-dashboard-source-button rounded-lg bg-team px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700'
                        : 'team-dashboard-source-button rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50'}
                    >
                      {hasDashboardData ? '피드백 확인하기' : '아키텍처 설계 시작하기'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <i className="fas fa-history text-gray-400"></i> 최근 팀 활동 타임라인
                    </h3>
                    <span className="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
                      {hasDashboardData ? '실시간 연동 중' : '실시간 연동 대기중'}
                    </span>
                  </div>

                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.slice(0, 3).map((activity) => {
                        const icon = activityIcon(activity.activityType)
                        const actor = activity.actorId ? memberById.get(activity.actorId) : null

                        return (
                          <div key={activity.logId} className="flex items-start gap-4">
                            <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-100 ${icon.bg} ${icon.color}`}>
                              <i className={`fas ${icon.icon}`}></i>
                            </div>
                            <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:bg-gray-100">
                              <div className="mb-1 flex justify-between gap-3">
                                <p className="text-xs font-bold text-gray-900">
                                  <span className="text-blue-600">{actor?.learnerName ?? '팀원'}</span>님이{' '}
                                  <strong className={icon.color}>{activity.description}</strong>
                                </p>
                                <span className="shrink-0 text-[10px] text-gray-400">{formatRelativeTime(activity.createdAt)}</span>
                              </div>
                              <p className="text-[11px] text-gray-500">{activity.activityType}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <i className="fas fa-wind mb-3 text-4xl text-gray-200"></i>
                      <p className="text-sm font-bold text-gray-600">아직 팀 활동 내역이 없습니다.</p>
                      <p className="mt-1 text-[11px] text-gray-400">자료를 업로드하거나 API를 업데이트하면 이곳에 기록됩니다.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <i className={`far fa-calendar-alt ${upcomingEvents.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}></i> 오늘의 일정 & 스크럼
                    </h3>
                    <button type="button" onClick={() => goTo('/team-ws-schedule')} className="text-[10px] text-gray-400 transition hover:text-brand">
                      <i className="fas fa-external-link-alt"></i>
                    </button>
                  </div>

                  {upcomingEvents.length > 0 ? (
                    <ul className="mb-4 space-y-3">
                      {upcomingEvents.map((event, index) => {
                        const joinable = isJoinableScheduleEvent(event)

                        return (
                          <li key={event.eventId} className={`flex items-center justify-between rounded-xl border p-3 ${scheduleItemClass(index)}`}>
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="shrink-0 text-center">
                                <p className={`text-[9px] font-black ${scheduleDateClass(index)}`}>{formatShortDate(event.startAt)}</p>
                                <p className={`text-sm font-black ${scheduleDateClass(index)}`}>{formatTime(event.startAt)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="flex items-center gap-1 truncate text-xs font-bold text-gray-900">
                                  {event.title}
                                  {joinable ? <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand"></span> : null}
                                </p>
                                {event.description ? <p className="truncate text-[10px] text-gray-500">{event.description}</p> : null}
                              </div>
                            </div>
                            {joinable ? (
                              <button type="button" onClick={() => goTo(scheduleJoinPath(event))} className="team-dashboard-scrum-button rounded-lg bg-brand px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-green-600">
                                참여하기
                              </button>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="mb-4 rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 p-6 text-center">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-gray-50 bg-white text-gray-300 shadow-sm">
                        <i className="far fa-calendar-times"></i>
                      </div>
                      <p className="text-xs font-bold text-gray-600">오늘 예정된 일정이 없습니다</p>
                      <p className="mb-3 mt-1 text-[10px] text-gray-400">데일리 스크럼이나 회의를 예약해보세요.</p>
                      <button type="button" onClick={() => goTo('/team-ws-schedule')} className="text-[10px] font-bold text-team hover:underline">
                        일정 등록하러 가기 →
                      </button>
                    </div>
                  )}

                  <button type="button" onClick={() => goTo('/team-ws-meeting')} className="team-dashboard-meeting-button flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
                    <i className={`fas fa-video ${upcomingEvents.length > 0 ? 'text-brand' : 'text-gray-400'}`}></i> 화상 회의장 입장
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-6 text-white shadow-lg">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white opacity-5 blur-xl"></div>
                  <h3 className="mb-3 text-sm font-extrabold text-gray-100">
                    <i className={`fas fa-chalkboard-teacher mr-1 ${mentorNotes.length > 0 ? 'text-mentor' : 'text-gray-400'}`}></i> 멘토 코멘트 & 피드백
                  </h3>
                  {mentorNotes.length > 0 ? (
                    <>
                      <div className="mb-4 flex items-start gap-3">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Annie" className="h-10 w-10 shrink-0 rounded-full border border-gray-700 bg-gray-800" alt="mentor" />
                        <p className="text-xs font-medium leading-relaxed text-gray-300">
                          "여러분 2주차 기획과 API 명세서를 훌륭하게 합의하셨네요! 이번 주부터 시작되는 실제 기능 개발 단계에서는 파트 간 소통이 가장 중요합니다. 어려운 점은 언제든 Q&A에 남겨주세요."
                        </p>
                      </div>
                      <button type="button" onClick={() => goTo('/team-ws-qna')} className="team-dashboard-mentor-button flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 py-2 text-xs font-bold text-white transition hover:bg-gray-700">
                        멘토에게 질문하기 <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] text-white">1</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-500">
                          <i className="fas fa-user-tie"></i>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-bold text-gray-400">담당 멘토 배정 완료</p>
                          <p className="text-xs font-medium leading-relaxed text-gray-300">
                            "환영합니다! 이번 프로젝트의 멘토링을 담당하게 되었습니다. 기획 단계부터 꼼꼼히 설정해 주시고, 궁금한 점이 생기면 언제든 Q&A에 남겨주세요."
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => goTo('/team-ws-qna')} className="team-dashboard-mentor-button flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 py-2 text-xs font-bold text-gray-400 transition hover:bg-gray-700">
                        멘토에게 첫 질문 남기기
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
