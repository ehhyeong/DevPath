import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import AuthModal,{ type AuthView } from '../../components/AuthModal'
import { clearStoredAuthSession,readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import {
loadInstructorTeamWorkspaceData
} from './instructor/instructor-api'

import { ArchitecturePage } from './instructor/instructor-team-workspace-architecture-page'
import { DashboardPage } from './instructor/instructor-team-workspace-dashboard-page'
import { FilesPage } from './instructor/instructor-team-workspace-files-page'
import { KanbanPage } from './instructor/instructor-team-workspace-kanban-page'
import { LiveMeetingPage } from './instructor/instructor-team-workspace-live-meeting-page'
import { MeetingPage } from './instructor/instructor-team-workspace-meeting-page'
import { MilestonePage } from './instructor/instructor-team-workspace-milestone-page'
import { QnaPage } from './instructor/instructor-team-workspace-qna-page'
import { SchedulePage } from './instructor/instructor-team-workspace-schedule-page'
import { TeamShell } from './instructor/instructor-team-workspace-shared'
import { VoiceChannelPage } from './instructor/instructor-team-workspace-voice-channel-page'
import type {
InstructorTeamWsPage,
TeamData
} from './instructor/instructor-types'
import { EMPTY_DATA,PAGE_CONFIG,TEAM_WORKSPACE_REFRESH_INTERVAL_MS,getWorkspaceIdFromUrl } from './instructor/instructor-workspace-support'


export default function InstructorTeamWsDashboardApp({ page = 'dashboard' }: { page?: InstructorTeamWsPage }) {
  const session = useMemo(() => readStoredAuthSession(), [])
  const workspaceId = useMemo(() => getWorkspaceIdFromUrl(), [])
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [data, setData] = useState<TeamData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const realtimeRefreshRef = useRef(false)

  async function reload() {
    if (!workspaceId) return
    setData(await loadInstructorTeamWorkspaceData(workspaceId))
  }

  const refreshRealtimeData = useCallback(async () => {
    if (!workspaceId || document.hidden || realtimeRefreshRef.current) return
    realtimeRefreshRef.current = true
    try {
      setData(await loadInstructorTeamWorkspaceData(workspaceId))
    } catch {
      // 실시간 보조 갱신 실패는 화면을 에러 상태로 밀지 않는다.
    } finally {
      realtimeRefreshRef.current = false
    }
  }, [workspaceId])

  useEffect(() => {
    document.title = `DevPath - ${PAGE_CONFIG[page].title}`
  }, [page])

  useEffect(() => {
    if (!session) {
      showAuthToast('로그인이 필요합니다.')
      setAuthView('login')
      setLoading(false)
      return
    }
    if (!workspaceId) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    loadInstructorTeamWorkspaceData(workspaceId, controller.signal)
      .then(setData)
      .catch((nextError) => {
        if (!controller.signal.aborted) setError(nextError instanceof Error ? nextError.message : '데이터 로딩 실패')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [session, workspaceId])

  useEffect(() => {
    if (!session || !workspaceId || loading) return undefined
    const timer = window.setInterval(() => {
      void refreshRealtimeData()
    }, TEAM_WORKSPACE_REFRESH_INTERVAL_MS)
    const refreshOnFocus = () => {
      void refreshRealtimeData()
    }
    const refreshOnVisible = () => {
      if (!document.hidden) void refreshRealtimeData()
    }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [session, workspaceId, loading, refreshRealtimeData])

  if (authView) {
    return <AuthModal view={authView} onViewChange={setAuthView} onAuthenticated={() => { setAuthView(null); window.location.reload() }} onClose={() => { clearStoredAuthSession(); window.location.href = '/' }} />
  }
  if (!workspaceId) return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm font-bold text-gray-500">워크스페이스를 선택해주세요.</div>
  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8F9FA] text-sm font-bold text-gray-500"><i className="fas fa-spinner fa-spin mr-2 text-[#7C3AED]" />팀 프로젝트 워크스페이스를 불러오는 중입니다.</div>
  if (error) return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm font-bold text-red-500"><i className="fas fa-exclamation-triangle mr-2" />{error}</div>
  if (page === 'live-meeting') return <LiveMeetingPage data={data} workspaceId={workspaceId} />
  if (page === 'voice-channel') return <VoiceChannelPage data={data} workspaceId={workspaceId} />

  const content =
    page === 'milestone' ? <MilestonePage data={data} workspaceId={workspaceId} reload={reload} />
      : page === 'kanban' ? <KanbanPage data={data} workspaceId={workspaceId} reload={reload} />
        : page === 'architecture' ? <ArchitecturePage data={data} workspaceId={workspaceId} reload={reload} />
          : page === 'qna' ? <QnaPage data={data} workspaceId={workspaceId} reload={reload} />
            : page === 'schedule' ? <SchedulePage data={data} workspaceId={workspaceId} reload={reload} />
              : page === 'files' ? <FilesPage data={data} workspaceId={workspaceId} reload={reload} />
                : page === 'meeting' ? <MeetingPage data={data} workspaceId={workspaceId} reload={reload} />
                  : <DashboardPage data={data} workspaceId={workspaceId} />

  return <TeamShell page={page} workspaceId={workspaceId} data={data}>{content}</TeamShell>
}
