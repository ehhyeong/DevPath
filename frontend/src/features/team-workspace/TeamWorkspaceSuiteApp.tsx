import { useEffect,useMemo,useState } from 'react'
import LoginRequiredView from '../../components/LoginRequiredView'
import { AUTH_SESSION_SYNC_EVENT,readStoredAuthSession } from '../../lib/auth-session'

import {
loadTeamWorkspaceSuiteData
} from './suite/api'
import { ArchitecturePage } from './suite/team-workspace-architecture-page'
import { FilesPage } from './suite/team-workspace-files-page'
import { KanbanPage } from './suite/team-workspace-kanban-page'
import { MeetingPage } from './suite/team-workspace-meeting-page'
import { QnaPage } from './suite/team-workspace-qna-page'
import { RealtimePage } from './suite/team-workspace-realtime-page'
import { SchedulePage } from './suite/team-workspace-schedule-page'
import { ErrorState,LoadingView } from './suite/team-workspace-suite-shared'
import { DEFAULT_DATA,PAGE_META } from './suite/team-workspace-suite-support'
import type {
SuiteData,
TeamWorkspacePage
} from './suite/types'
import {
getWorkspaceIdFromUrl
} from './suite/utils'












export default function TeamWorkspaceSuiteApp({ page }: { page?: TeamWorkspacePage }) {
  const activePage = page ?? 'kanban'
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [data, setData] = useState<SuiteData>(DEFAULT_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')
    const previousTitle = document.title

    html.classList.add('team-ws-dashboard-document', 'h-full!', 'overflow-hidden!')
    body.classList.add('team-ws-dashboard-body', 'h-full!', 'overflow-hidden!', 'bg-[#F3F4F6]!')
    root?.classList.add('h-screen!')
    document.title = `DevPath - ${PAGE_META[activePage].title}`

    return () => {
      html.classList.remove('team-ws-dashboard-document', 'h-full!', 'overflow-hidden!')
      body.classList.remove('team-ws-dashboard-body', 'h-full!', 'overflow-hidden!', 'bg-[#F3F4F6]!')
      root?.classList.remove('h-screen!')
      document.title = previousTitle
    }
  }, [activePage])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())

    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
  }, [])

  const reload = useMemo(() => {
    return async () => {
      if (!workspaceId) return

      const nextData = await loadTeamWorkspaceSuiteData(workspaceId, new AbortController().signal)
      setData(nextData)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!session || !workspaceId) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const currentWorkspaceId = workspaceId

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const nextData = await loadTeamWorkspaceSuiteData(currentWorkspaceId, controller.signal)
        if (controller.signal.aborted) return
        setData(nextData)
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setError(nextError instanceof Error ? nextError.message : '팀 워크스페이스 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [session, workspaceId])

  if (!session) {
    return <LoginRequiredView message="팀 워크스페이스는 로그인한 사용자만 접근할 수 있습니다." />
  }

  if (!workspaceId) {
    return <ErrorState message="workspaceId가 없습니다. 워크스페이스 허브에서 다시 진입해주세요." />
  }

  if (loading) {
    return <LoadingView />
  }

  if (error && !data.dashboard) {
    return <ErrorState message={error} />
  }

  if (activePage === 'kanban') return <KanbanPage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'files') return <FilesPage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'qna') return <QnaPage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'schedule') return <SchedulePage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'architecture') return <ArchitecturePage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'meeting') return <MeetingPage data={data} workspaceId={workspaceId} reload={reload} />
  if (activePage === 'live-meeting') return <RealtimePage page="live-meeting" data={data} workspaceId={workspaceId} />

  return <RealtimePage page="voice-channel" data={data} workspaceId={workspaceId} />
}
