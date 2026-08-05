import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import AuthModal,{ type AuthView } from '../../components/AuthModal'
import { clearStoredAuthSession,readStoredAuthSession,refreshStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import {
createInstructorWorkspaceNotice
} from './instructor-workspace/instructor-workspace-api'

import { AssignmentsPage } from './instructor-workspace/instructor-workspace-assignments-page'
import { DashboardPage } from './instructor-workspace/instructor-workspace-dashboard-page'
import { FilesPage } from './instructor-workspace/instructor-workspace-files-page'
import { LiveMeetingPage } from './instructor-workspace/instructor-workspace-live-meeting-page'
import { MeetingPage } from './instructor-workspace/instructor-workspace-meeting-page'
import { NoticeModal,NoticeSuccessModal } from './instructor-workspace/instructor-workspace-notice-modals'
import { QnaPage } from './instructor-workspace/instructor-workspace-qna-page'
import { SchedulePage } from './instructor-workspace/instructor-workspace-schedule-page'
import { InstructorWsShell } from './instructor-workspace/instructor-workspace-shared'
import { StudentsPage } from './instructor-workspace/instructor-workspace-students-page'
import { EMPTY_DATA,PAGE_CONFIG,WORKSPACE_REFRESH_INTERVAL_MS,buildHref,getWorkspaceIdFromUrl,optionalRequest,parseMeetingSettings,pushWorkspaceNotification,workspaceApiRequest } from './instructor-workspace/instructor-workspace-support'
import type {
ActivityLogItem,
CalendarEvent,
InstructorWsPage,
MeetingNote,
QuestionSummary,
VoiceChannelSummary,
WorkspaceDashboard,
WorkspaceData,
WorkspaceDocResponse,
WorkspaceFile,
WorkspaceNotice,
WorkspaceTask
} from './instructor-workspace/instructor-workspace-types'


export default function InstructorWsDashboardApp({ page = 'dashboard' }: { page?: InstructorWsPage }) {
  const session = useMemo(() => readStoredAuthSession(), [])
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [data, setData] = useState<WorkspaceData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeSuccessOpen, setNoticeSuccessOpen] = useState(false)
  const realtimeRefreshRef = useRef(false)

  const loadData = useCallback(async (options?: { blocking?: boolean; silent?: boolean }) => {
    if (!workspaceId || !session) return
    if (options?.blocking) {
      setLoading(true)
    }
    if (!options?.silent) {
      setError(null)
    }
    try {
      const refreshedSession = await refreshStoredAuthSession()

      if (!refreshedSession?.accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      const [dashboard, tasks, events, questions, voiceChannels] = await Promise.all([
        workspaceApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, refreshedSession),
        workspaceApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, refreshedSession),
        workspaceApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, refreshedSession),
        workspaceApiRequest<QuestionSummary[]>(`/api/workspaces/${workspaceId}/questions`, refreshedSession),
        optionalRequest(workspaceApiRequest<VoiceChannelSummary[]>(`/api/workspaces/${workspaceId}/voice-channels`, refreshedSession), []),
      ])
      setData((current) => ({ ...current, dashboard, tasks, events, questions, voiceChannels }))
      setLoading(false)

      const liveRoomUrl = `${window.location.origin}${buildHref('live-meeting', workspaceId)}`
      const [notices, files, meetingNotes, meetingSettingsDoc, activityLogs] = await Promise.all([
        optionalRequest(workspaceApiRequest<WorkspaceNotice[]>(`/api/workspaces/${workspaceId}/notices`, refreshedSession), []),
        optionalRequest(workspaceApiRequest<WorkspaceFile[]>(`/api/workspaces/${workspaceId}/files`, refreshedSession), []),
        optionalRequest(workspaceApiRequest<MeetingNote[]>(`/api/workspaces/${workspaceId}/meeting-notes`, refreshedSession), []),
        optionalRequest(workspaceApiRequest<WorkspaceDocResponse | null>(`/api/workspaces/${workspaceId}/meeting-settings`, refreshedSession), null),
        optionalRequest(workspaceApiRequest<ActivityLogItem[]>(`/api/workspaces/${workspaceId}/activity-logs?limit=10`, refreshedSession), []),
      ])
      setData((current) => ({
        ...current,
        notices,
        files,
        meetingNotes,
        meetingSettings: parseMeetingSettings(meetingSettingsDoc, liveRoomUrl),
        activityLogs,
      }))
    } catch (nextError) {
      if (!options?.silent) {
        setError(nextError instanceof Error ? nextError.message : '워크스페이스 데이터를 불러오지 못했습니다.')
        setLoading(false)
      }
    } finally {
      setLoading(false)
    }
  }, [session, workspaceId])

  const refreshRealtimeData = useCallback(async () => {
    if (!workspaceId || document.hidden || realtimeRefreshRef.current) return
    realtimeRefreshRef.current = true
    try {
      await loadData({ silent: true })
    } finally {
      realtimeRefreshRef.current = false
    }
  }, [loadData, workspaceId])

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
    void loadData({ blocking: true })
  }, [loadData, session])

  useEffect(() => {
    if (!session || !workspaceId || loading) return undefined
    const timer = window.setInterval(() => {
      void refreshRealtimeData()
    }, WORKSPACE_REFRESH_INTERVAL_MS)
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

  async function createNotice(title: string, content: string, important: boolean) {
    if (!workspaceId) return
    await createInstructorWorkspaceNotice(workspaceId, { title, content: important ? `[IMPORTANT]\n${content}` : content })
    pushWorkspaceNotification(workspaceId, {
      title: important ? '중요 공지 등록' : '공지사항 등록',
      description: `"${title}" 공지가 등록되었습니다.`,
      href: buildHref('dashboard', workspaceId),
      icon: 'fas fa-bullhorn',
    })
    await loadData()
    setNoticeSuccessOpen(true)
  }

  function renderPage() {
    switch (page) {
      case 'assignments':
        return <AssignmentsPage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'students':
        return <StudentsPage data={data} />
      case 'qna':
        return <QnaPage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'schedule':
        return <SchedulePage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'files':
        return <FilesPage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'meeting':
        return <MeetingPage data={data} workspaceId={workspaceId} reload={loadData} />
      case 'live-meeting':
        return <LiveMeetingPage data={data} workspaceId={workspaceId} />
      default:
        return <DashboardPage data={data} workspaceId={workspaceId} onOpenNotice={() => setNoticeOpen(true)} />
    }
  }

  if (authView) {
    return <AuthModal view={authView} onViewChange={setAuthView} onAuthenticated={() => { setAuthView(null); window.location.reload() }} onClose={() => { clearStoredAuthSession(); window.location.href = '/' }} />
  }

  if (!workspaceId) {
    return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm font-bold text-gray-500">워크스페이스를 선택해주세요.</div>
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#F8F9FA] text-sm font-bold text-gray-500"><i className="fas fa-spinner fa-spin mr-2 text-[#7C3AED]" />워크스페이스 데이터를 불러오는 중입니다.</div>
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center bg-gray-100 text-sm font-bold text-red-500"><i className="fas fa-exclamation-triangle mr-2" />{error}</div>
  }

  if (page === 'live-meeting') {
    return <LiveMeetingPage data={data} workspaceId={workspaceId} />
  }

  return (
    <>
      <InstructorWsShell page={page} workspaceId={workspaceId} data={data}>
        {renderPage()}
      </InstructorWsShell>
      {noticeOpen ? <NoticeModal onClose={() => setNoticeOpen(false)} onSubmit={createNotice} /> : null}
      {noticeSuccessOpen ? <NoticeSuccessModal onClose={() => setNoticeSuccessOpen(false)} /> : null}
    </>
  )
}
