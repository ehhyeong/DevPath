import { useCallback, useEffect, useMemo, useState } from 'react'
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

type WorkspaceNotice = {
  id: number
  workspaceId: number
  title: string
  content: string
  createdAt?: string | null
  updatedAt?: string | null
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

type InstructorWsPage = 'dashboard' | 'assignments' | 'students' | 'qna' | 'schedule' | 'files' | 'meeting'

type PageConfig = { path: string; label: string; icon: string; section: string }

/* ────────────────────────────── constants ────────────────────────────── */

const PAGE_CONFIG: Record<InstructorWsPage, PageConfig> = {
  dashboard: { path: '/instructor-ws-dashboard', label: '대시보드 홈', icon: 'fas fa-chart-pie', section: 'admin' },
  assignments: { path: '/instructor-ws-assignments', label: '전체 과제 현황', icon: 'fas fa-tasks', section: 'admin' },
  students: { path: '/instructor-ws-students', label: '수강생 & 학습 상담', icon: 'fas fa-user-graduate', section: 'admin' },
  qna: { path: '/instructor-ws-qna', label: '멘토 Q&A 관리', icon: 'fas fa-comments', section: 'admin' },
  schedule: { path: '/instructor-ws-schedule', label: '공식 일정 관리', icon: 'fas fa-calendar-alt', section: 'resources' },
  files: { path: '/instructor-ws-files', label: '공식 자료실 관리', icon: 'fas fa-folder-open', section: 'resources' },
  meeting: { path: '/instructor-ws-meeting', label: '화상 멘토링 (Live)', icon: 'fas fa-video', section: 'resources' },
}

const NAV_SECTIONS: Array<{ title: string; items: InstructorWsPage[] }> = [
  { title: 'Workspace (Admin)', items: ['dashboard', 'assignments', 'students', 'qna'] },
  { title: 'Resources & Live', items: ['schedule', 'files', 'meeting'] },
]

/* ────────────────────────────── helpers ────────────────────────────── */

function getWorkspaceIdFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search)
  const parsed = Number(params.get('workspaceId'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function buildHref(page: InstructorWsPage, workspaceId: number | null) {
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

function isTomorrow(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate()
}

function avatarUrl(name?: string | null): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name ?? 'default')}`
}

async function optionalRequest<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try { return await promise } catch { return fallback }
}

/* ────────────────────────────── component ────────────────────────────── */

export default function InstructorWsDashboardApp() {
  const session = readStoredAuthSession()
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(null)

  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [questions, setQuestions] = useState<QuestionSummary[]>([])
  const [notices, setNotices] = useState<WorkspaceNotice[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])

  // notice modal state
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [successModalOpen, setSuccessModalOpen] = useState(false)

  // noti popup
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
        const [dash, taskList, eventList, questionList, noticeList, logList] = await Promise.all([
          projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, { signal: controller.signal }, 'required'),
          projectApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, { signal: controller.signal }, 'required'),
          projectApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, { signal: controller.signal }, 'required'),
          projectApiRequest<QuestionSummary[]>(`/api/workspaces/${workspaceId}/questions`, { signal: controller.signal }, 'required'),
          optionalRequest(projectApiRequest<WorkspaceNotice[]>(`/api/workspaces/${workspaceId}/notices`, { signal: controller.signal }, 'required'), []),
          optionalRequest(projectApiRequest<ActivityLogItem[]>(`/api/workspaces/${workspaceId}/activity-logs?limit=10`, { signal: controller.signal }, 'required'), []),
        ])
        if (controller.signal.aborted) return
        setDashboard(dash)
        setTasks(taskList)
        setEvents(eventList)
        setQuestions(questionList)
        setNotices(noticeList)
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
  const pendingReviewCount = tasks.filter((t) => t.status === 'TODO').length
  const unansweredQnaCount = questions.filter((q) => q.qnaStatus === 'OPEN').length
  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length
  const avgProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // upcoming events (today & future, sorted)
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return events
      .filter((e) => new Date(e.startAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3)
  }, [events])

  const todayEvent = upcomingEvents.find((e) => isToday(e.startAt)) ?? null

  // at-risk members: members who have no completed tasks
  const atRiskMembers = useMemo(() => {
    if (!dashboard) return []
    const completedByMember = new Map<number, number>()
    for (const t of tasks) {
      if (t.status === 'DONE' && t.assigneeId) {
        completedByMember.set(t.assigneeId, (completedByMember.get(t.assigneeId) ?? 0) + 1)
      }
    }
    return dashboard.members
      .filter((m) => !completedByMember.has(m.learnerId))
      .slice(0, 5)
  }, [dashboard, tasks])

  // recent action-required items (activity logs or recent tasks/questions)
  const actionItems = useMemo(() => {
    const items: Array<{ type: 'task' | 'question' | 'log'; title: string; detail: string; time: string; icon: string; iconBg: string; iconColor: string }> = []

    for (const log of activityLogs.slice(0, 3)) {
      items.push({
        type: 'log',
        title: `${log.actorName ?? '시스템'} — ${log.targetTitle ?? log.actionType}`,
        detail: log.description ?? '',
        time: relativeTime(log.createdAt),
        icon: 'fas fa-bolt',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-500',
      })
    }

    for (const t of tasks.filter((t) => t.status === 'TODO').slice(0, 2)) {
      items.push({
        type: 'task',
        title: `새 과제 제출: ${t.title}`,
        detail: t.description ?? '',
        time: relativeTime(t.createdAt),
        icon: 'fas fa-code-branch',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-500',
      })
    }

    for (const q of questions.filter((q) => q.qnaStatus === 'OPEN').slice(0, 2)) {
      items.push({
        type: 'question',
        title: `${q.authorName ?? '수강생'}님이 질문을 남겼습니다.`,
        detail: q.title,
        time: relativeTime(q.createdAt),
        icon: 'fas fa-question',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
      })
    }

    return items.slice(0, 4)
  }, [activityLogs, tasks, questions])

  /* ── notice submit ── */
  const handleSendNotice = useCallback(async () => {
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      alert('제목과 상세 내용을 모두 입력해주세요.')
      return
    }
    if (!workspaceId) return
    try {
      const created = await projectApiRequest<WorkspaceNotice>(
        `/api/workspaces/${workspaceId}/notices`,
        { method: 'POST', body: JSON.stringify({ title: noticeTitle.trim(), content: noticeContent.trim() }) },
        'required',
      )
      setNotices((prev) => [created, ...prev])
      setNoticeModalOpen(false)
      setNoticeTitle('')
      setNoticeContent('')
      setSuccessModalOpen(true)
    } catch {
      alert('공지사항 등록에 실패했습니다.')
    }
  }, [noticeTitle, noticeContent, workspaceId])

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
  const isEmpty = memberCount === 0 && tasks.length === 0 && questions.length === 0

  /* ────────────────────────────── render ────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden text-gray-800" onClick={() => setNotiOpen(false)}>

      {/* ── sidebar ── */}
      <aside className="group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64">
        {/* back to instructor-mentoring */}
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
                const hasBadge = (key === 'assignments' && pendingReviewCount > 0) || (key === 'qna' && unansweredQnaCount > 0)
                const badgeCount = key === 'assignments' ? pendingReviewCount : unansweredQnaCount
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
              {section !== NAV_SECTIONS[NAV_SECTIONS.length - 1] ? <div className="mx-2 my-4 h-px bg-gray-100" /> : null}
            </div>
          ))}
        </nav>

        <div className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
          <img src={avatarUrl(dashboard?.ownerName)} className="h-10 w-10 shrink-0 rounded-full border-2 border-[#7C3AED] shadow-sm" alt="" />
          <div className="sidebar-text" style={{ opacity: 0, width: 0, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'all 0.3s ease' }}>
            <p className="text-sm font-bold text-gray-900">{dashboard?.ownerName ?? '강사'}</p>
            <p className="mt-0.5 inline-block rounded bg-[#7C3AED] px-1.5 py-0.5 text-[10px] font-bold text-white">Instructor</p>
          </div>
        </div>
      </aside>

      {/* ── main ── */}
      <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#F8F9FA]">

        {/* header */}
        <header className="relative z-30 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white px-8 shadow-sm">
          <div className="flex flex-1 items-center gap-3 font-bold text-gray-800">
            <span className="rounded-md bg-gray-900 px-2 py-1 text-[10px] tracking-wider text-white">ADMIN</span>
            <span>{wsName}</span>
            <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]"><i className="fas fa-users mr-1" />{dashboard?.type === 'MENTORING' ? '멘토링' : dashboard?.type === 'SQUAD' ? '스쿼드' : dashboard?.type === 'SOLO' ? '개인' : dashboard?.type ?? ''}</span>
          </div>
          <div className="relative flex items-center gap-4">
            <button type="button" className="relative p-2 text-gray-400 transition hover:text-[#00C471]" onClick={(e) => { e.stopPropagation(); setNotiOpen((prev) => !prev) }}>
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
                    <p className="flex flex-col items-center p-8 text-center text-xs text-gray-400">
                      <i className="far fa-bell-slash mb-2 text-2xl text-gray-300" />
                      새로운 알림이 없습니다.
                    </p>
                  ) : activityLogs.slice(0, 5).map((log) => (
                    <div key={log.logId} className="cursor-pointer border-b border-gray-50 p-3 hover:bg-gray-50">
                      <p className="text-xs text-gray-800"><strong>{log.actorName ?? '시스템'}</strong> {log.description ?? log.actionType}</p>
                      <span className="mt-1 inline-block text-[10px] font-bold text-[#00C471]">{relativeTime(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {/* content */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl space-y-6">

            {/* title row */}
            <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                  <i className="fas fa-chart-pie text-[#7C3AED]" /> 워크스페이스 대시보드
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  {isEmpty ? '새로운 멘토링이 개설되었습니다! 기본적인 일정을 세팅하고 수강생들을 맞이하세요.' : '현재 진행 중인 멘토링의 주요 현황을 한눈에 파악하고 수강생들을 관리하세요.'}
                </p>
              </div>
              <button type="button" onClick={() => { setNoticeTitle(''); setNoticeContent(''); setNoticeModalOpen(true) }} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black">
                <i className="fas fa-bullhorn" /> 새 공지사항 작성
              </button>
            </div>

            {/* ── stat cards ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* participants */}
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${isEmpty ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-500'}`}><i className="fas fa-users" /></div>
                <div>
                  <p className="mb-0.5 text-[10px] font-extrabold text-gray-400">참여 수강생</p>
                  <p className="text-2xl font-black text-gray-900">{memberCount}<span className="ml-1 text-sm font-medium text-gray-500">명</span></p>
                </div>
              </div>
              {/* pending review */}
              <div className="group relative flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-red-200" onClick={() => { window.location.href = buildHref('assignments', workspaceId) }}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl transition group-hover:scale-110 ${isEmpty ? 'bg-gray-50 text-gray-400' : 'bg-red-50 text-red-500'}`}><i className="fas fa-code-branch" /></div>
                <div>
                  <p className="mb-0.5 text-[10px] font-extrabold text-gray-400">리뷰 대기중 과제</p>
                  <p className={`text-2xl font-black ${pendingReviewCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>{pendingReviewCount}<span className="ml-1 text-sm font-medium text-gray-500">건</span></p>
                </div>
              </div>
              {/* unanswered Q&A */}
              <div className="group relative flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-yellow-200" onClick={() => { window.location.href = buildHref('qna', workspaceId) }}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl transition group-hover:scale-110 ${isEmpty ? 'bg-gray-50 text-gray-400' : 'bg-yellow-50 text-yellow-500'}`}><i className="fas fa-question-circle" /></div>
                <div>
                  <p className="mb-0.5 text-[10px] font-extrabold text-gray-400">미답변 Q&A</p>
                  <p className={`text-2xl font-black ${unansweredQnaCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{unansweredQnaCount}<span className="ml-1 text-sm font-medium text-gray-500">건</span></p>
                </div>
              </div>
              {/* avg progress */}
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${isEmpty ? 'bg-gray-50 text-gray-400' : 'bg-[#00C471]/10 text-[#00C471]'}`}><i className="fas fa-flag-checkered" /></div>
                <div className="w-full flex-1">
                  <p className="mb-0.5 flex justify-between text-[10px] font-extrabold text-gray-400">
                    <span>평균 진도율</span> <span className={isEmpty ? 'text-gray-400' : 'text-[#00C471]'}>{avgProgress}%</span>
                  </p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                    <div className={`h-1.5 rounded-full ${isEmpty ? 'bg-gray-300' : 'bg-[#00C471]'}`} style={{ width: `${avgProgress}%` }} />
                  </div>
                  <p className="mt-1.5 text-[9px] text-gray-400">{isEmpty ? '1주차 시작 대기 중' : `완료 ${doneTasks}/${totalTasks} 건`}</p>
                </div>
              </div>
            </div>

            {/* ── main grid ── */}
            <div className="flex flex-col items-start gap-6 lg:flex-row">

              {/* left 2/3 */}
              <div className="flex w-full flex-col gap-6 lg:w-2/3">

                {/* week status */}
                <div className={`relative shrink-0 overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${isEmpty ? 'border-gray-200' : 'border-[#7C3AED]'}`}>
                  {!isEmpty ? <div className="absolute top-0 right-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#7C3AED] opacity-10 blur-2xl" /> : null}
                  <div className="relative z-10 mb-4 flex items-start justify-between">
                    <div>
                      <span className={`mb-2 inline-block rounded border px-2 py-1 text-[10px] font-extrabold ${isEmpty ? 'border-gray-200 bg-gray-100 text-gray-500' : 'border-purple-200 bg-[#EDE9FE] text-[#7C3AED]'}`}>THIS WEEK {isEmpty ? '(시작 전)' : ''}</span>
                      <h3 className={`text-lg font-extrabold ${isEmpty ? 'text-gray-400' : 'text-gray-900'}`}>
                        {isEmpty ? '아직 첫 주차 학습이 시작되지 않았습니다.' : (dashboard?.description ?? wsName)}
                      </h3>
                    </div>
                    {!isEmpty ? (
                      <button type="button" onClick={() => { window.location.href = buildHref('assignments', workspaceId) }} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-black">
                        제출 현황 상세 보기
                      </button>
                    ) : null}
                  </div>
                  <div className="relative z-10 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="mb-2 flex justify-between text-xs font-bold text-gray-700">
                      <span>이번 주 과제 제출률</span>
                      <span>{doneTasks} / {totalTasks} 건 완료</span>
                    </div>
                    <div className="mb-2 flex h-2 overflow-hidden rounded-full">
                      {totalTasks > 0 ? (
                        <>
                          <div className="bg-green-500" style={{ width: `${(doneTasks / totalTasks) * 100}%` }} title={`완료 (${doneTasks}건)`} />
                          <div className="bg-yellow-400" style={{ width: `${(tasks.filter((t) => t.status === 'IN_PROGRESS').length / totalTasks) * 100}%` }} title="진행 중" />
                          <div className="bg-gray-200" style={{ width: `${(tasks.filter((t) => t.status === 'TODO').length / totalTasks) * 100}%` }} title="대기" />
                        </>
                      ) : <div className="w-full bg-gray-200" />}
                    </div>
                    <div className="flex justify-end gap-4 text-[10px] font-bold text-gray-500">
                      {totalTasks > 0 ? (
                        <>
                          <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500" /> 완료 ({doneTasks})</span>
                          <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-yellow-400" /> 진행 중 ({tasks.filter((t) => t.status === 'IN_PROGRESS').length})</span>
                          <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-gray-200" /> 대기 ({tasks.filter((t) => t.status === 'TODO').length})</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-gray-300" /> 수강생들의 제출을 기다리고 있습니다</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* action items */}
                <div className="shrink-0 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900">
                    <i className={`fas fa-bolt ${actionItems.length > 0 ? 'text-yellow-500' : 'text-gray-300'}`} /> 강사 액션 필요 (최근 활동)
                  </h3>
                  {actionItems.length > 0 ? (
                    <div className="space-y-3">
                      {actionItems.map((item, idx) => (
                        <div key={idx} className="hover-card flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4" onClick={() => { if (item.type === 'task') window.location.href = buildHref('assignments', workspaceId); if (item.type === 'question') window.location.href = buildHref('qna', workspaceId) }}>
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${item.iconBg} ${item.iconColor}`}><i className={item.icon} /></div>
                            <div>
                              <p className="mb-1 text-xs font-bold text-gray-900">{item.title}</p>
                              <p className="text-[10px] text-gray-500">{item.detail}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-gray-400">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 px-4 py-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl text-gray-400"><i className="fas fa-inbox" /></div>
                      <h4 className="mb-1 text-sm font-bold text-gray-700">아직 확인해야 할 내역이 없습니다.</h4>
                      <p className="text-xs text-gray-500">수강생들이 과제를 제출하거나 Q&A에 질문을 남기면<br />이곳에 가장 먼저 알림이 표시됩니다.</p>
                    </div>
                  )}
                </div>

                {/* at-risk students */}
                <div className={`group relative flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${atRiskMembers.length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
                  {atRiskMembers.length > 0 ? <div className="absolute top-0 right-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-100 opacity-20 blur-2xl" /> : null}
                  <div className="relative z-10 mb-4 flex shrink-0 items-center justify-between border-b border-gray-50 pb-3">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <i className={`fas ${atRiskMembers.length > 0 ? 'fa-exclamation-triangle text-red-500' : 'fa-shield-alt text-[#00C471]'}`} /> 집중 케어 필요 수강생
                    </h3>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${atRiskMembers.length > 0 ? 'border-red-100 bg-red-50 text-red-500' : 'border-green-100 bg-green-50 text-green-600'}`}>
                      {atRiskMembers.length > 0 ? `위험군 ${atRiskMembers.length}명` : '안정적'}
                    </span>
                  </div>
                  {atRiskMembers.length > 0 ? (
                    <div className="custom-scrollbar relative z-10 flex-1 space-y-3 overflow-y-auto pr-1">
                      {atRiskMembers.map((member) => (
                        <div key={member.memberId} className="hover-card flex items-center justify-between rounded-xl border border-red-100 bg-red-50/30 p-4">
                          <div className="flex items-center gap-3">
                            <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-10 w-10 shrink-0 rounded-full border border-red-200 bg-white" alt="" />
                            <div>
                              <p className="mb-0.5 text-xs font-bold text-gray-900">{member.learnerName ?? '수강생'} <span className="ml-1 text-[10px] font-bold text-red-500">과제 미완료</span></p>
                              <p className="text-[10px] text-gray-500">마지막 접속: {member.lastActiveAt ? relativeTime(member.lastActiveAt) : '정보 없음'}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => { alert(`${member.learnerName ?? '수강생'}에게 1:1 DM을 보냅니다.`) }} className="ml-2 shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[10px] font-bold text-red-600 shadow-sm transition hover:bg-red-50">
                            <i className="fas fa-paper-plane mr-1" /> DM 보내기
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 px-4 py-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-2xl text-[#00C471]"><i className="fas fa-smile" /></div>
                      <h4 className="mb-1 text-sm font-bold text-gray-700">위험군 수강생이 없습니다!</h4>
                      <p className="text-xs text-gray-500">진도율이 저조하거나 미제출이 반복되는 수강생이 발생하면<br />이곳에 자동으로 필터링되어 나타납니다.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* right 1/3 */}
              <div className="sticky top-0 flex w-full flex-col gap-6 lg:w-1/3">

                {/* notices */}
                <div className="flex shrink-0 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between border-b border-gray-50 pb-3">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <i className="fas fa-bell text-gray-400" /> 배포한 공지사항
                    </h3>
                  </div>
                  {notices.length > 0 ? (
                    <div className="custom-scrollbar max-h-[220px] space-y-3 overflow-y-auto pr-1">
                      {notices.map((notice) => (
                        <div key={notice.id} className="group relative rounded-xl border border-gray-100 bg-white p-4 transition hover:bg-gray-50">
                          <div className="mb-2 flex items-start justify-between">
                            <span className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-500">공지</span>
                            <span className="text-[9px] text-gray-400">{relativeTime(notice.createdAt)}</span>
                          </div>
                          <p className="mb-1 line-clamp-1 text-xs font-bold text-gray-900">{notice.title}</p>
                          <p className="line-clamp-2 text-[10px] text-gray-500">{notice.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-400"><i className="fas fa-bullhorn" /></div>
                      <h4 className="mb-1 text-xs font-bold text-gray-700">등록된 공지사항이 없습니다.</h4>
                      <p className="mb-4 text-[10px] text-gray-500">학습 시작 전, 전체 수강생을 환영하는<br />첫 인사 공지를 작성해 보세요!</p>
                      <button type="button" onClick={() => { setNoticeTitle(''); setNoticeContent(''); setNoticeModalOpen(true) }} className="rounded-lg bg-[#EDE9FE] px-4 py-2 text-[10px] font-bold text-[#7C3AED] transition hover:bg-[#7C3AED] hover:text-white">
                        첫 공지 작성하기
                      </button>
                    </div>
                  )}
                </div>

                {/* schedule & live */}
                <div className={`group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${upcomingEvents.length > 0 ? 'border-[#7C3AED]' : 'border-gray-200'}`}>
                  {upcomingEvents.length > 0 ? <div className="absolute top-0 right-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#7C3AED] opacity-10 blur-2xl" /> : null}
                  <div className="relative z-10 mb-4 flex items-center justify-between border-b border-gray-50 pb-3">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <i className={`fas ${upcomingEvents.length > 0 ? 'fa-calendar-check text-[#7C3AED]' : 'fa-calendar text-gray-400'}`} /> 일정 및 라이브
                    </h3>
                    {upcomingEvents.length > 0 ? (
                      <a href={buildHref('schedule', workspaceId)} className="text-[10px] font-bold text-gray-500 hover:text-[#7C3AED]">전체보기 <i className="fas fa-chevron-right ml-0.5" /></a>
                    ) : null}
                  </div>
                  {upcomingEvents.length > 0 ? (
                    <div className="relative z-10 space-y-4">
                      {todayEvent ? (
                        <div className="hover-card relative overflow-hidden rounded-xl bg-gray-900 p-4 text-white shadow-md">
                          <div className="absolute -top-4 -right-4 h-16 w-16 animate-pulse rounded-full bg-red-500 opacity-20" />
                          <div className="mb-2 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-red-400">Today Live</span>
                          </div>
                          <h4 className="mb-1 text-sm font-bold">{todayEvent.title}</h4>
                          <p className="mb-3 text-xs text-gray-400"><i className="far fa-clock mr-1" /> 오늘 {formatScheduleTime(todayEvent.startAt)}{todayEvent.endAt ? ` - ${formatScheduleTime(todayEvent.endAt)}` : ''}</p>
                          <button type="button" onClick={() => { window.location.href = buildHref('meeting', workspaceId) }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700">
                            <i className="fas fa-video" /> 라이브 룸 열기
                          </button>
                        </div>
                      ) : null}
                      {upcomingEvents.filter((e) => e !== todayEvent).map((event) => (
                        <div key={event.eventId} className={`border-l-2 pl-3 ${isTomorrow(event.startAt) ? 'border-red-400' : 'border-gray-300'}`}>
                          <p className={`mb-0.5 text-[10px] font-bold ${isTomorrow(event.startAt) ? 'text-red-500' : 'text-gray-500'}`}>
                            {isTomorrow(event.startAt) ? 'D-1 마감 (내일)' : new Date(event.startAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                          </p>
                          <p className="text-xs font-bold text-gray-800">{event.title}</p>
                          <p className="mt-0.5 text-[10px] text-gray-500">{formatScheduleTime(event.startAt)}{event.endAt ? ` - ${formatScheduleTime(event.endAt)}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-400"><i className="far fa-calendar-plus" /></div>
                      <h4 className="mb-1 text-xs font-bold text-gray-700">다가오는 공식 일정이 없습니다.</h4>
                      <p className="mb-4 text-[10px] text-gray-500">라이브 밋업(Live), 과제 마감일 등<br />주요 일정을 캘린더에 미리 등록하세요.</p>
                      <a href={buildHref('schedule', workspaceId)} className="rounded-lg bg-gray-100 px-4 py-2 text-[10px] font-bold text-gray-600 transition hover:bg-gray-200">
                        새 일정 등록하러 가기
                      </a>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── notice modal ── */}
      {noticeModalOpen ? (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-bullhorn text-[#7C3AED]" /> 새 공지사항 작성
              </h3>
              <button type="button" onClick={() => setNoticeModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
            </div>
            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">공지 제목 <span className="text-red-500">*</span></label>
                <input type="text" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="수강생들에게 보일 제목을 입력하세요." />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">상세 내용 <span className="text-red-500">*</span></label>
                <textarea value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} className="h-32 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="안내할 내용을 상세히 적어주세요." />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setNoticeModalOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
              <button type="button" onClick={() => { void handleSendNotice() }} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                <i className="fas fa-paper-plane" /> 작성 및 푸시 알림 전송
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── success modal ── */}
      {successModalOpen ? (
        <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSuccessModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 shadow-sm">
              <i className="fas fa-check text-3xl text-[#7C3AED]" />
            </div>
            <h3 className="mb-2 text-xl font-extrabold text-gray-900">배포 완료!</h3>
            <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">공지사항이 워크스페이스에 등록되었으며,<br />모든 수강생에게 알림이 발송되었습니다.</p>
            <button type="button" onClick={() => setSuccessModalOpen(false)} className="w-full rounded-xl bg-[#7C3AED] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-700">확인</button>
          </div>
        </div>
      ) : null}

      {/* sidebar hover styles injected globally */}
      <style>{`
        aside:hover .sidebar-text { opacity: 1 !important; width: auto !important; margin-left: 0.75rem; }
        aside:hover .sidebar-section-title { opacity: 1 !important; height: auto !important; margin-bottom: 0.5rem; margin-top: 1.5rem; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #D1D5DB; border-radius: 5px; }
        .hover-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
        .hover-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border-color: #7C3AED; }
      `}</style>
    </div>
  )
}
