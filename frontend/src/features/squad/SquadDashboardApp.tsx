import { useAuthSession } from '../../lib/useAuthSession'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import AuthModal, { type AuthView } from '../../components/AuthModal'
import SquadWorkspaceAside from '../../components/SquadWorkspaceAside'
import SquadWorkspaceHeader from '../../components/SquadWorkspaceHeader'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import { projectApiRequest } from '../project/api'
import { createSquadNotification, squadActorName } from './notifications'
import SquadDashboardContent from './SquadDashboardContent'
import type { AiWorkspacePageProps } from './AiWorkspaceDesignPanels'
import { getWorkspaceIdFromUrl,percent,readSidebarPinned,statusLabel,storeSidebarPinned } from './squad-dashboard-support'

import type {
  ActivityLog,
  CalendarEvent,
  Notice,
  TeamMessage,
  VoiceChannel,
  WorkspaceDashboard,
  WorkspaceErdChange,
  WorkspaceMember,
  WorkspaceTask,
} from './dashboard-types'

export default function SquadDashboardApp({ aiWorkspace = false, design }: AiWorkspacePageProps = {}) {
  const workspaceId = useMemo(() => getWorkspaceIdFromUrl(), [])
  const [session,setSession] = useAuthSession()
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [roadmapToday, setRoadmapToday] = useState(() => new Date().toDateString())
  const [notices, setNotices] = useState<Notice[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [erdChanges, setErdChanges] = useState<WorkspaceErdChange[]>([])
  const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([])
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [noticeType, setNoticeType] = useState<'important' | 'normal'>('important')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [sidebarPinned, setSidebarPinned] = useState(readSidebarPinned)
  const dashboardRefreshRef = useRef(false)

  const loadDashboardData = useCallback(async (options?: { signal?: AbortSignal; blocking?: boolean; silent?: boolean }) => {
    if (!workspaceId) {
      return
    }

    if (options?.blocking) {
      setLoading(true)
    }
    if (!options?.silent) {
      setError(null)
    }

    try {
      const [dashboardData, taskData, eventData, noticeData, activityData, erdChangeData, voiceChannelData, messageData] =
        await Promise.all([
          projectApiRequest<WorkspaceDashboard>(
            `/api/workspaces/${workspaceId}/dashboard`,
            { signal: options?.signal },
            'required',
          ),
          projectApiRequest<WorkspaceTask[]>(
            `/api/workspaces/${workspaceId}/tasks`,
            { signal: options?.signal },
            'required',
          ),
          projectApiRequest<CalendarEvent[]>(
            `/api/workspaces/${workspaceId}/calendar-events`,
            { signal: options?.signal },
            'required',
          ),
          projectApiRequest<Notice[]>(
            `/api/workspaces/${workspaceId}/notices`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<ActivityLog[]>(
            `/api/workspaces/${workspaceId}/activities/recent`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<WorkspaceErdChange[]>(
            `/api/workspaces/${workspaceId}/erd/recent-changes`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<VoiceChannel[]>(
            `/api/workspaces/${workspaceId}/voice-channels`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<TeamMessage[]>(
            `/api/lounge/chats/messages?loungeId=${workspaceId}`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
        ])

      if (options?.signal?.aborted) {
        return
      }

      setDashboard(dashboardData)
      setTasks(taskData ?? [])
      setEvents((eventData ?? []).sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()))
      setNotices(noticeData ?? [])
      setActivities(activityData ?? [])
      setErdChanges(erdChangeData ?? [])
      setVoiceChannels(voiceChannelData ?? [])
      setMessages(messageData ?? [])
    } catch (loadError) {
      if (!options?.signal?.aborted && !options?.silent) {
        const message = loadError instanceof Error ? loadError.message : '스쿼드 대시보드를 불러오지 못했습니다.'
        setError(message)
      }
    } finally {
      if (!options?.signal?.aborted && options?.blocking) {
        setLoading(false)
      }
    }
  }, [workspaceId])

  useEffect(() => {
    document.title = 'DevPath - 스쿼드 대시보드'
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
    const currentSession = readStoredAuthSession()
    setSession(currentSession)

    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    if (!currentSession?.accessToken) {
      setLoading(false)
      setAuthView('login')
      showAuthToast({ message: '스쿼드 대시보드는 로그인 후 이용할 수 있습니다.', durationMs: 2200 })
      return
    }

    const controller = new AbortController()
    void loadDashboardData({ signal: controller.signal, blocking: true })

    return () => controller.abort()
  }, [loadDashboardData, setSession, workspaceId])

  useEffect(() => {
    if (!workspaceId || !session?.accessToken || loading) {
      return undefined
    }

    async function refreshDashboardData() {
      if (document.hidden || dashboardRefreshRef.current) {
        return
      }

      dashboardRefreshRef.current = true
      try {
        // API 캐시가 같은 객체를 반환해도 자정 이후 로드맵 날짜는 갱신한다.
        setRoadmapToday(new Date().toDateString())
        await loadDashboardData({ silent: true })
      } finally {
        dashboardRefreshRef.current = false
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshDashboardData()
    }, 5000)
    const refreshOnFocus = () => {
      void refreshDashboardData()
    }
    const refreshOnVisible = () => {
      if (!document.hidden) {
        void refreshDashboardData()
      }
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [loadDashboardData, loading, session?.accessToken, workspaceId])

  const memberById = useMemo(() => {
    const map = new Map<number, WorkspaceMember>()
    dashboard?.members.forEach((member) => map.set(member.learnerId, member))
    return map
  }, [dashboard])

  const currentMember = session?.userId ? memberById.get(session.userId) : null
  const currentUserName = currentMember?.learnerName ?? session?.name ?? '사용자'
  const activeMembers = dashboard?.members ?? []
  const myTasks = tasks.filter((task) => session?.userId && task.assigneeId === session.userId)
  const taskTotal = myTasks.length
  const todoCount = myTasks.filter((task) => task.status === 'TODO').length
  const doingCount = myTasks.filter((task) => task.status === 'IN_PROGRESS').length
  const doneCount = myTasks.filter((task) => task.status === 'DONE').length
  const liveVoiceChannel = voiceChannels.find((channel) => (channel.activeParticipantCount ?? 0) > 0)
  const goalRemainingPercent = aiWorkspace
    ? taskTotal > 0 ? 100 - Math.round(doneCount / taskTotal * 100) : 100
    : taskTotal > 0 ? Math.max(0, 100 - percent(doneCount, taskTotal)) : 35
  const hasAnyDashboardData =
    taskTotal > 0 || events.length > 0 || notices.length > 0 || activities.length > 0 || messages.length > 0
  const hasDashboardBodyData =
    taskTotal > 0 || events.length > 0 || notices.length > 0 || activities.length > 0 || erdChanges.length > 0 || Boolean(liveVoiceChannel)
  const upcomingEvents = events.slice(0, 3)
  const sideProjectName = dashboard?.name ?? '새로운 스쿼드'

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

  async function createNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !noticeTitle.trim() || !noticeContent.trim()) {
      return
    }

    const title = noticeType === 'important' ? `[필독] ${noticeTitle.trim()}` : noticeTitle.trim()

    try {
      const created = await projectApiRequest<Notice>(
        `/api/workspaces/${workspaceId}/notices`,
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            content: noticeContent.trim(),
          }),
        },
        'required',
      )

      setNotices((current) => [created, ...current])
      setNoticeTitle('')
      setNoticeContent('')
      setNoticeType('important')
      setNoticeModalOpen(false)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-dashboard',
        message: `${squadActorName(session?.name)}님이 공지 "${created.title}"을 등록했습니다.`,
        targetPath: '/squad-dashboard',
      })
      showAuthToast({ message: '공지사항이 등록되었습니다.', durationMs: 1800 })
    } catch (noticeError) {
      const message = noticeError instanceof Error ? noticeError.message : '공지사항을 등록하지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    }
  }

  function toggleSidebarPin(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    setSidebarPinned((current) => {
      const next = !current
      storeSidebarPinned(next)
      return next
    })
  }

  if (error && !dashboard) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <i className="fas fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
          <p className="font-extrabold text-gray-900">{error}</p>
          <a href="/workspace-hub" className="inline-flex mt-5 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
            워크스페이스로 돌아가기
          </a>
        </div>
        {authView ? (
          <AuthModal
            view={authView}
            onClose={() => setAuthView(null)}
            onViewChange={setAuthView}
            onAuthenticated={handleAuthenticated}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div aria-busy={loading} className="squad-dashboard-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800 [&_.squad-dashboard-fade-in]:[animation:squadDashboardFadeIn_0.4s_ease-in-out_forwards]">
      <SquadWorkspaceAside
        aiWorkspace={aiWorkspace}
        activePage="dashboard"
        workspaceId={workspaceId}
        projectName={sideProjectName}
        pinned={sidebarPinned}
        onTogglePinned={toggleSidebarPin}
        reviewBadgeCount={aiWorkspace ? 0 : hasAnyDashboardData ? 1 : 0}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          aiWorkspace={aiWorkspace}
          workspaceId={workspaceId}
          projectName={dashboard?.name ?? '새 스쿼드 프로젝트'}
          members={activeMembers}
          statusLabel={hasAnyDashboardData ? statusLabel(dashboard?.status) : '시작 전'}
          statusActive={hasAnyDashboardData}
          currentUserName={currentUserName}
          onLogout={handleLogout}
        />

        <SquadDashboardContent tasks={tasks} workspaceId={workspaceId} notices={notices} activities={activities} erdChanges={erdChanges} memberById={memberById} currentUserName={currentUserName} doingCount={doingCount} doneCount={doneCount} goalRemainingPercent={goalRemainingPercent} hasDashboardBodyData={hasDashboardBodyData} liveVoiceChannel={liveVoiceChannel} taskTotal={taskTotal} todoCount={todoCount} upcomingEvents={upcomingEvents} calendarEvents={events} workspaceCreatedAt={dashboard?.createdAt} roadmapToday={roadmapToday} onOpenNotice={() => setNoticeModalOpen(true)} design={aiWorkspace ? design : null} />
      </div>

      {noticeModalOpen ? (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1050]">
          <form onSubmit={createNotice} className="bg-white w-full max-w-md rounded-2xl shadow-xl relative overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2"><i className="fas fa-bullhorn text-brand"></i> 새 공지사항 등록</h3>
              <button type="button" onClick={() => setNoticeModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-900 shadow-sm flex items-center justify-center transition"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">분류 <span className="text-red-500">*</span></label>
                <select value={noticeType} onChange={(event) => setNoticeType(event.target.value as 'important' | 'normal')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand bg-white font-medium shadow-sm transition">
                  <option value="important">🚨 필독 (중요)</option>
                  <option value="normal">📌 일반</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">제목 <span className="text-red-500">*</span></label>
                <input type="text" value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm transition" placeholder="공지 제목을 입력하세요" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">내용 <span className="text-red-500">*</span></label>
                <textarea value={noticeContent} onChange={(event) => setNoticeContent(event.target.value)} className="w-full border border-gray-200 rounded-xl p-4 text-sm h-32 resize-none outline-none focus:border-brand font-medium shadow-sm transition custom-scrollbar" placeholder="팀원들에게 알릴 내용을 입력하세요"></textarea>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setNoticeModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm">취소</button>
              <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-md flex items-center gap-1">
                <i className="fas fa-check"></i> 등록하기
              </button>
            </div>
          </form>
        </div>
      ) : null}


      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}
