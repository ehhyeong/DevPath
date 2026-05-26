import { useEffect, useMemo, useState } from 'react'
import { projectApiRequest } from './project-api'
import AuthModal, { type AuthView } from './components/AuthModal'
import { clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'

/* ────────────────────────────── types ────────────────────────────── */

type WorkspaceDashboard = {
  workspaceId: number
  name: string
  description?: string | null
  type: string
  status: string
  ownerId: number
  ownerName?: string | null
  members: WorkspaceMember[]
  unresolvedTaskCount: number
  activeMilestoneCount: number
  createdAt?: string | null
}

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  lastActiveAt?: string | null
  online?: boolean
}

type WorkspaceTask = {
  taskId: number
  workspaceId: number
  title: string
  description?: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority?: string | null
  assigneeId?: number | null
  assigneeName?: string | null
  dueDate?: string | null
  createdById?: number | null
  createdAt?: string | null
}

type CalendarEvent = {
  eventId: number
  workspaceId: number
  title: string
  description?: string | null
  startAt: string
  endAt?: string | null
  createdAt?: string | null
}

type QuestionSummary = {
  id: number
  authorId: number
  authorName?: string | null
  title: string
  qnaStatus?: 'OPEN' | 'ANSWERED' | 'CLOSED' | null
  answerCount: number
  createdAt?: string | null
}

type MilestoneItem = {
  milestoneId: number
  workspaceId: number
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | string
  createdById?: number | null
  createdAt?: string | null
}

type ActivityLogItem = {
  logId: number
  workspaceId: number
  actorId?: number | null
  actorName?: string | null
  actionType: string
  targetType?: string | null
  targetTitle?: string | null
  description?: string | null
  createdAt?: string | null
}

type InstructorTeamWsPage = 'dashboard' | 'milestone' | 'kanban' | 'architecture' | 'qna' | 'schedule' | 'files' | 'meeting'

type PageConfig = { path: string; label: string; icon: string }

/* ────────────────────────────── constants ────────────────────────────── */

const PAGE_CONFIG: Record<InstructorTeamWsPage, PageConfig> = {
  dashboard: { path: '/instructor-team-ws-dashboard', label: '대시보드 모니터링', icon: 'fas fa-chart-line' },
  milestone: { path: '/instructor-team-ws-milestone', label: '마일스톤 & 피드백', icon: 'fas fa-flag-checkered' },
  kanban: { path: '/instructor-team-ws-kanban', label: '팀 칸반 모니터링', icon: 'fas fa-columns' },
  architecture: { path: '/instructor-team-ws-architecture', label: '아키텍처 설계 리뷰', icon: 'fas fa-project-diagram' },
  qna: { path: '/instructor-team-ws-qna', label: '멘토 Q&A 관리', icon: 'fas fa-comments' },
  schedule: { path: '/instructor-team-ws-schedule', label: '공식 일정 관리', icon: 'fas fa-calendar-alt' },
  files: { path: '/instructor-team-ws-files', label: '통합 자료실 관리', icon: 'fas fa-folder-open' },
  meeting: { path: '/instructor-team-ws-meeting', label: '화상 멘토링 관리', icon: 'fas fa-video' },
}

const NAV_SECTIONS: Array<{ title: string; items: InstructorTeamWsPage[]; hasDivider: boolean }> = [
  { title: 'Workspace (Admin)', items: ['dashboard', 'milestone'], hasDivider: true },
  { title: 'Team Management', items: ['kanban', 'architecture', 'qna'], hasDivider: true },
  { title: 'Resources & Live', items: ['schedule', 'files', 'meeting'], hasDivider: false },
]

/* ────────────────────────────── helpers ────────────────────────────── */

function getWorkspaceIdFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search)
  const parsed = Number(params.get('workspaceId'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function buildHref(page: InstructorTeamWsPage, workspaceId: number | null) {
  const params = new URLSearchParams()
  if (workspaceId) params.set('workspaceId', String(workspaceId))
  const qs = params.toString()
  return `${PAGE_CONFIG[page].path}${qs ? `?${qs}` : ''}`
}

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function formatScheduleTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isToday(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function avatarUrl(name?: string | null): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name ?? 'default')}`
}

async function optionalRequest<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try { return await promise } catch { return fallback }
}

/* ────────────────────────────── component ────────────────────────────── */

export default function InstructorTeamWsDashboardApp() {
  const session = readStoredAuthSession()
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(null)

  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [questions, setQuestions] = useState<QuestionSummary[]>([])
  const [milestones, setMilestones] = useState<MilestoneItem[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])

  const [notiOpen, setNotiOpen] = useState(false)

  /* ── auth guard ── */
  useEffect(() => {
    if (!session) {
      showAuthToast('로그인이 필요합니다.')
      setAuthView('login')
    }
  }, [session])

  /* ── load data ── */
  useEffect(() => {
    if (!workspaceId || !session) return
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [dash, taskList, eventList, questionList, milestoneList, logList] = await Promise.all([
          projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, { signal: controller.signal }, 'required'),
          projectApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, { signal: controller.signal }, 'required'),
          projectApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, { signal: controller.signal }, 'required'),
          optionalRequest(projectApiRequest<QuestionSummary[]>(`/api/workspaces/${workspaceId}/questions`, { signal: controller.signal }, 'required'), []),
          optionalRequest(projectApiRequest<MilestoneItem[]>(`/api/workspaces/${workspaceId}/milestones`, { signal: controller.signal }, 'required'), []),
          optionalRequest(projectApiRequest<ActivityLogItem[]>(`/api/workspaces/${workspaceId}/activity-logs?limit=10`, { signal: controller.signal }, 'required'), []),
        ])
        if (controller.signal.aborted) return
        setDashboard(dash)
        setTasks(taskList)
        setEvents(eventList)
        setQuestions(questionList)
        setMilestones(milestoneList)
        setActivityLogs(logList)
      } catch (err: unknown) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '데이터 로딩 실패')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [workspaceId, session])

  /* ── derived stats ── */
  const memberCount = dashboard?.members.length ?? 0
  const unansweredQnaCount = questions.filter((q) => q.qnaStatus === 'OPEN').length

  // active milestone for progress card
  const activeMilestone = useMemo(() => {
    return milestones.find((m) => m.status === 'ACTIVE') ?? null
  }, [milestones])

  // milestone completion: members who have at least one DONE task
  const milestoneCompletionCount = useMemo(() => {
    if (!dashboard || memberCount === 0) return 0
    const completedMembers = new Set<number>()
    for (const t of tasks) {
      if (t.status === 'DONE' && t.assigneeId) completedMembers.add(t.assigneeId)
    }
    return completedMembers.size
  }, [dashboard, memberCount, tasks])

  const milestoneProgress = memberCount > 0 ? Math.round((milestoneCompletionCount / memberCount) * 100) : 0

  // member task map: for each member, find their latest task
  const memberTaskMap = useMemo(() => {
    const map = new Map<number, WorkspaceTask>()
    // sort tasks by createdAt desc and pick the first per assignee
    const sorted = [...tasks].sort((a, b) => new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime())
    for (const t of sorted) {
      if (t.assigneeId && !map.has(t.assigneeId)) {
        map.set(t.assigneeId, t)
      }
    }
    return map
  }, [tasks])

  // health status based on data
  const healthStatus = useMemo(() => {
    if (memberCount === 0) return { label: '분석 대기', color: 'text-gray-400', desc: '아직 수집된 프로젝트 활동 데이터가 없습니다. 팀원들의 첫 마일스톤 제출 및 커밋이 시작되면 건강도가 자동 분석됩니다.' }
    const overdue = tasks.filter((t) => t.status === 'TODO' && t.dueDate && new Date(t.dueDate) < new Date()).length
    if (overdue > memberCount / 2) return { label: '주의', color: 'text-red-500', desc: '다수의 팀원이 마일스톤 제출을 지연하고 있습니다. 독려가 필요합니다.' }
    if (overdue > 0) return { label: '양호', color: 'text-green-500', desc: '대부분의 파트가 일정을 준수하고 있습니다. 일부 팀원의 마일스톤 제출을 독려해주세요.' }
    return { label: '양호', color: 'text-green-500', desc: '모든 팀원이 일정을 잘 준수하고 있습니다.' }
  }, [memberCount, tasks])

  // action items: pending review tasks + unanswered questions
  const actionItems = useMemo(() => {
    const items: Array<{ title: string; detail: string; href: string }> = []
    for (const t of tasks.filter((t) => t.status === 'TODO').slice(0, 3)) {
      const memberName = dashboard?.members.find((m) => m.learnerId === t.assigneeId)?.learnerName ?? t.assigneeName ?? '팀원'
      items.push({ title: `${memberName} 과제 리뷰하기`, detail: t.title, href: buildHref('milestone', workspaceId) })
    }
    for (const q of questions.filter((q) => q.qnaStatus === 'OPEN').slice(0, 3)) {
      items.push({ title: `${q.authorName ?? '팀원'} Q&A 답변하기`, detail: q.title, href: buildHref('qna', workspaceId) })
    }
    return items.slice(0, 4)
  }, [tasks, questions, dashboard, workspaceId])

  // upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return events
      .filter((e) => new Date(e.startAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3)
  }, [events])

  const isEmpty = memberCount === 0 && tasks.length === 0 && questions.length === 0

  /* ── auth modal ── */
  if (authView) {
    return <AuthModal view={authView} onViewChange={setAuthView} onAuthenticated={() => { setAuthView(null); window.location.reload() }} onClose={() => { clearStoredAuthSession(); window.location.href = '/' }} />
  }

  /* ── loading / error ── */
  if (!workspaceId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="font-bold text-gray-500">워크스페이스를 선택해주세요.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">
        <i className="fas fa-spinner fa-spin mr-2 text-[#7C3AED]" />
        <span className="font-bold text-gray-500">대시보드를 불러오는 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="font-bold text-red-500"><i className="fas fa-exclamation-triangle mr-2" />{error}</p>
      </div>
    )
  }

  const wsName = dashboard?.name ?? '워크스페이스'

  /* ── task status helpers ── */
  function taskStatusBadge(t: WorkspaceTask) {
    if (t.status === 'DONE') return { label: 'Pass 완료', cls: 'text-green-600 bg-green-100', icon: 'fas fa-check mr-1' }
    if (t.status === 'TODO' && t.dueDate && new Date(t.dueDate) < new Date()) return { label: '제출 지연', cls: 'text-red-500 bg-red-50', icon: '' }
    if (t.status === 'TODO') return { label: '과제 제출 (리뷰 요망)', cls: 'text-yellow-600 bg-yellow-100', icon: '' }
    return { label: '진행 중', cls: 'text-blue-600 bg-blue-100', icon: '' }
  }

  /* ────────────────────────────── render ────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden text-gray-800" onClick={() => setNotiOpen(false)}>

      {/* ── sidebar ── */}
      <aside className="group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64">
        <div className="flex h-20 shrink-0 cursor-pointer items-center border-b border-gray-100 px-5 transition hover:bg-gray-50" onClick={() => { window.location.href = '/instructor-mentoring' }}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white shadow-md">
            <i className="fas fa-arrow-left" />
          </div>
          <div className="sidebar-text flex flex-col" style={{ opacity: 0, width: 0, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'all 0.3s ease' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">강사 센터로 복귀</p>
            <p className="w-36 truncate font-bold text-gray-900">{wsName}</p>
          </div>
        </div>

        <nav className="custom-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400" style={{ opacity: 0, height: 0, overflow: 'hidden', transition: 'all 0.3s ease' }}>{section.title}</p>
              {section.items.map((key) => {
                const config = PAGE_CONFIG[key]
                const isActive = key === 'dashboard'
                const hasBadge = (key === 'milestone' && dashboard !== null && dashboard.activeMilestoneCount > 0) || (key === 'qna' && unansweredQnaCount > 0)
                const badgeCount = key === 'milestone' ? (dashboard?.activeMilestoneCount ?? 0) : unansweredQnaCount
                return (
                  <a key={key} href={buildHref(key, workspaceId)} className={`nav-item flex items-center rounded-xl px-4 py-3 font-medium transition ${isActive ? 'bg-gray-900 font-bold text-white' : 'cursor-pointer text-gray-500 hover:translate-x-0.5 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <div className="relative w-6 text-center text-lg">
                      <i className={`${config.icon}${isActive ? ' text-purple-400' : ''}`} />
                      {hasBadge ? <span className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full border border-white bg-red-500" /> : null}
                    </div>
                    <span className="sidebar-text flex-1" style={{ opacity: 0, width: 0, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'all 0.3s ease' }}>
                      {config.label}
                      {hasBadge ? <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600">{badgeCount}</span> : null}
                    </span>
                  </a>
                )
              })}
              {section.hasDivider ? <div className="mx-2 my-4 h-px bg-gray-100" /> : null}
            </div>
          ))}
        </nav>

        <div className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
          <img src={avatarUrl(dashboard?.ownerName)} className="h-10 w-10 shrink-0 rounded-full border-2 border-[#7C3AED] shadow-sm" alt="" />
          <div className="sidebar-text" style={{ opacity: 0, width: 0, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'all 0.3s ease' }}>
            <p className="text-sm font-bold text-gray-900">{dashboard?.ownerName ?? '강사'}</p>
            <p className="mt-0.5 inline-block rounded bg-[#7C3AED] px-1.5 py-0.5 text-[10px] font-bold text-white">Instructor (PM)</p>
          </div>
        </div>
      </aside>

      {/* ── main ── */}
      <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#F8F9FA]">

        {/* header */}
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-8 shadow-sm">
          <div className="flex items-center gap-3 font-bold text-gray-800">
            {isEmpty ? (
              <>
                <span className="rounded-md bg-gray-400 px-2 py-1 text-[10px] tracking-wider text-white">NEW</span>
                <span className="italic text-gray-400">프로젝트명을 입력하거나 팀을 매칭해주세요</span>
                <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-extrabold text-gray-400"><i className="fas fa-puzzle-piece mr-1" />설정 대기 중</span>
              </>
            ) : (
              <>
                <span className="rounded-md bg-gray-900 px-2 py-1 text-[10px] tracking-wider text-white">ADMIN</span>
                <span>{wsName}</span>
                <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]"><i className="fas fa-puzzle-piece mr-1" />팀 프로젝트형</span>
              </>
            )}
          </div>

          <div className="relative flex items-center gap-4">
            {/* team member avatars */}
            <div className="mr-2 flex items-center gap-2 border-r border-gray-200 pr-4">
              <span className="text-[10px] font-bold text-gray-500">담당 팀원 ({memberCount}명)</span>
              {memberCount > 0 ? (
                <div className="flex -space-x-2">
                  {dashboard!.members.slice(0, 5).map((m) => (
                    <img key={m.memberId} src={m.profileImage ?? avatarUrl(m.learnerName)} className="h-8 w-8 rounded-full border-2 border-white bg-blue-50" title={m.learnerName ?? '팀원'} alt="" />
                  ))}
                  {memberCount > 5 ? <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-bold text-gray-500">+{memberCount - 5}</div> : null}
                </div>
              ) : (
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:border-[#7C3AED] hover:text-[#7C3AED]" title="팀원 초대/배정">
                  <i className="fas fa-plus text-xs" />
                </button>
              )}
            </div>

            {/* noti button */}
            <button type="button" className={`relative p-2 transition ${activityLogs.length > 0 ? 'text-gray-400 hover:text-[#7C3AED]' : 'text-gray-300 hover:text-gray-500'}`} onClick={(e) => { e.stopPropagation(); setNotiOpen((prev) => !prev) }}>
              <i className="far fa-bell text-lg" />
              {activityLogs.length > 0 ? <span className="absolute top-1 right-1 h-2 w-2 rounded-full border border-white bg-red-500" /> : null}
            </button>

            {notiOpen ? (
              <div className="absolute top-12 right-0 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-gray-50 p-4">
                  <h3 className="text-sm font-bold">알림 (강사용)</h3>
                </div>
                <div className="custom-scrollbar max-h-60 overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <p className="flex flex-col items-center p-6 text-center text-xs text-gray-400">
                      <i className="far fa-bell-slash mb-2 text-2xl text-gray-200" />
                      새로운 알림이 없습니다.
                    </p>
                  ) : activityLogs.slice(0, 5).map((log) => (
                    <div key={log.logId} className="cursor-pointer border-b border-gray-50 p-3 hover:bg-gray-50">
                      <p className="text-xs text-gray-800"><strong>{log.actorName ?? '시스템'}</strong> {log.description ?? log.actionType}</p>
                      <span className="mt-1 inline-block text-[10px] font-bold text-[#7C3AED]">{relativeTime(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {/* content */}
        <main className="custom-scrollbar flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl space-y-6">

            {/* 1. 프로젝트 건강도 카드 */}
            <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:flex-row">
              {!isEmpty ? <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#7C3AED] opacity-5 blur-3xl" /> : <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-gray-100 opacity-50 blur-3xl" />}

              <div className="relative z-10 flex flex-1 items-center gap-6">
                <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl ${isEmpty ? 'border border-dashed border-gray-200 bg-gray-50 text-gray-300' : 'border-2 border-purple-100 bg-purple-50 text-[#7C3AED]'}`}>
                  <i className="fas fa-heartbeat text-3xl" />
                </div>
                <div>
                  <h2 className={`mb-1 text-xl font-extrabold ${isEmpty ? 'text-gray-400' : 'text-gray-900'}`}>
                    현재 팀 프로젝트 건강도: <span className={isEmpty ? 'font-medium text-gray-400' : healthStatus.color}>{healthStatus.label}</span>
                  </h2>
                  <p className="text-xs text-gray-400">{healthStatus.desc}</p>
                </div>
              </div>

              {/* 목표 달성률 */}
              <div className={`relative z-10 w-full rounded-2xl border p-5 md:w-80 ${isEmpty ? 'border-dashed border-gray-100 bg-gray-50/50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">이번 주 목표 달성률</p>
                    <p className={`text-sm font-extrabold ${isEmpty ? 'text-gray-400' : 'text-gray-900'}`}>
                      {activeMilestone ? activeMilestone.title : (isEmpty ? '설정된 마일스톤 없음' : `마일스톤 ${milestones.length > 0 ? milestones.length : 0}개`)}
                    </p>
                  </div>
                  <span className={`text-sm font-extrabold ${isEmpty ? 'text-gray-400' : 'text-[#7C3AED]'}`}>
                    {milestoneProgress}% ({milestoneCompletionCount}/{memberCount}명)
                  </span>
                </div>
                <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className={`h-2 transition-all duration-1000 ${isEmpty ? 'w-0 bg-gray-300' : 'bg-[#7C3AED]'}`} style={{ width: isEmpty ? '0%' : `${milestoneProgress}%` }} />
                </div>
                <button type="button" onClick={() => { window.location.href = buildHref('milestone', workspaceId) }} className={`w-full rounded-lg border py-2 text-xs font-bold shadow-sm transition ${isEmpty ? 'border-gray-200 bg-white text-purple-600 hover:border-purple-200 hover:bg-purple-50' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                  {isEmpty ? <><i className="fas fa-plus-circle mr-1" /> 주차별 마일스톤 등록하기</> : '팀원별 제출 현황 및 피드백 작성'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

              <div className="space-y-6 lg:col-span-2">

                {/* 2. 직군별 작업 모니터링 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-5 flex items-center gap-2 border-b border-gray-50 pb-3 font-extrabold text-gray-900">
                    <i className="fas fa-search-location text-gray-400" /> 직군별 작업 모니터링
                  </h3>

                  {memberCount > 0 && tasks.length > 0 ? (
                    <div className="space-y-4">
                      {dashboard!.members.map((member) => {
                        const task = memberTaskMap.get(member.learnerId)
                        if (!task) return null
                        const badge = taskStatusBadge(task)
                        const isOverdue = task.status === 'TODO' && task.dueDate && new Date(task.dueDate) < new Date()
                        return (
                          <div key={member.memberId} className={`flex items-center justify-between rounded-xl border p-3 ${isOverdue ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-center gap-4">
                              <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-10 w-10 shrink-0 rounded-full border border-gray-200 bg-white" alt="" />
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {member.learnerName ?? '팀원'}
                                  {isOverdue ? (
                                    <span className="ml-1 text-[10px] font-medium text-red-500"><i className="fas fa-exclamation-triangle" /> {task.title} 미제출</span>
                                  ) : (
                                    <span className="ml-1 text-[10px] font-medium text-gray-500">{task.title}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${badge.cls}`}>
                                {badge.icon ? <i className={badge.icon} /> : null}{badge.label}
                              </span>
                              {task.status === 'TODO' ? (
                                isOverdue ? (
                                  <button type="button" onClick={() => { alert(`${member.learnerName ?? '팀원'} 학생에게 독려 메시지를 발송했습니다.`) }} className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-[10px] font-bold text-red-500 shadow-sm transition hover:bg-red-50">DM 독려</button>
                                ) : (
                                  <button type="button" onClick={() => { window.location.href = buildHref('milestone', workspaceId) }} className="rounded-md bg-gray-900 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-black">리뷰하기</button>
                                )
                              ) : (
                                <button type="button" className="cursor-not-allowed rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-600 opacity-50" disabled>완료됨</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gray-200 bg-gray-50 text-gray-300">
                        <i className="fas fa-tasks text-xl" />
                      </div>
                      <p className="mb-1 text-sm font-bold text-gray-700">모니터링할 작업 내역이 없습니다.</p>
                      <p className="max-w-sm text-xs text-gray-400">팀원들이 칸반 보드에 카드를 등록하거나 개발 작업을 개시하면 실시간 직군 현황이 여기에 요약 배포됩니다.</p>
                      <button type="button" onClick={() => { window.location.href = buildHref('kanban', workspaceId) }} className="mt-4 rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-black">
                        팀 칸반 보드 확인하기
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. 팀 주요 활동 로그 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <i className="fas fa-history text-gray-400" /> 팀 주요 활동 로그
                    </h3>
                  </div>

                  {activityLogs.length > 0 ? (
                    <div className="space-y-4">
                      {activityLogs.slice(0, 5).map((log) => (
                        <div key={log.logId} className="flex items-start gap-4">
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-500"><i className="fas fa-file-alt" /></div>
                          <div className="flex-1 cursor-pointer rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:bg-gray-100">
                            <div className="mb-1 flex justify-between">
                              <p className="text-xs font-bold text-gray-900"><span className="text-purple-600">{log.actorName ?? '시스템'}</span> {log.targetTitle ?? log.actionType}</p>
                              <span className="text-[10px] text-gray-400">{relativeTime(log.createdAt)}</span>
                            </div>
                            {log.description ? <p className="text-[11px] text-gray-500">{log.description}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-100 bg-gray-50/30 py-10 text-center">
                      <div className="mb-2 text-3xl text-gray-200"><i className="fas fa-stream" /></div>
                      <p className="text-xs text-gray-400">워크스페이스 내에서 발생한 최근 활동 로그가 없습니다.</p>
                    </div>
                  )}
                </div>

              </div>

              <div className="space-y-6">

                {/* 4. 강사 Action Required */}
                <div className={`relative rounded-2xl border p-6 shadow-sm ${actionItems.length > 0 ? 'border-purple-100 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`mb-4 flex items-center gap-2 text-sm font-extrabold ${actionItems.length > 0 ? 'text-[#7C3AED]' : 'text-gray-500'}`}>
                    <i className={actionItems.length > 0 ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} /> 강사 Action Required
                  </h3>

                  {actionItems.length > 0 ? (
                    <ul className="space-y-3">
                      {actionItems.map((item, idx) => (
                        <li key={idx} className="flex cursor-pointer items-center justify-between rounded-xl border border-transparent bg-white p-3 shadow-sm transition hover:border-[#7C3AED]" onClick={() => { window.location.href = item.href }}>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{item.title}</p>
                            <p className="text-[10px] text-gray-500">{item.detail}</p>
                          </div>
                          <i className="fas fa-chevron-right text-xs text-gray-300" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-500">
                        <i className="fas fa-smile-beam" />
                      </div>
                      <p className="mb-0.5 text-xs font-bold text-gray-800">대기 중인 요청 없음</p>
                      <p className="text-[10px] text-gray-400">현재 즉시 검토하거나 답변해야 할 마일스톤 피드백이나 Q&A가 없습니다.</p>
                    </div>
                  )}
                </div>

                {/* 5. 팀 공식 & 스크럼 일정 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <i className="far fa-calendar-check text-gray-400" /> 팀 공식 & 스크럼 일정
                    </h3>
                    <button type="button" onClick={() => { window.location.href = buildHref('schedule', workspaceId) }} className="rounded p-1 text-[10px] text-gray-400 transition hover:text-[#7C3AED]"><i className="fas fa-external-link-alt" /></button>
                  </div>

                  {upcomingEvents.length > 0 ? (
                    <ul className="mb-4 space-y-3">
                      {upcomingEvents.map((event) => {
                        const today = isToday(event.startAt)
                        return (
                          <li key={event.eventId} className={`flex items-center justify-between rounded-xl border p-3 ${today ? 'border-purple-100 bg-purple-50' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <p className={`text-[9px] font-black ${today ? 'text-[#7C3AED]' : 'text-gray-500'}`}>{today ? '오늘' : new Date(event.startAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</p>
                                <p className={`text-sm font-black ${today ? 'text-[#7C3AED]' : 'text-gray-700'}`}>{formatScheduleTime(event.startAt)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{event.title}</p>
                                <p className="text-[10px] text-gray-500">{event.description ?? ''}</p>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="mb-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-100 bg-gray-50/50 py-6 text-center">
                      <p className="mb-1 text-xs font-medium text-gray-400">다가오는 일정이 없습니다.</p>
                      <p className="text-[10px] text-gray-400">라이브 멘토링이나 코드 리뷰 일정을 추가해보세요.</p>
                    </div>
                  )}

                  <button type="button" onClick={() => { window.location.href = buildHref('meeting', workspaceId) }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-black">
                    <i className="fas fa-video" /> 호스트로 밋업 시작하기
                  </button>
                </div>

              </div>
            </div>

          </div>
        </main>
      </div>

      {/* sidebar hover styles */}
      <style>{`
        aside:hover .sidebar-text { opacity: 1 !important; width: auto !important; margin-left: 0.75rem; }
        aside:hover .sidebar-section-title { opacity: 1 !important; height: auto !important; margin-bottom: 0.5rem; margin-top: 1.5rem; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #D1D5DB; border-radius: 5px; }
      `}</style>
    </div>
  )
}
