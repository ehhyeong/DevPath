import { lazy, Suspense, useEffect, useState } from 'react'
import { RouteErrorBoundary, RouteLoadingView } from '../../components/AppRouteStates'
import AiSquadWorkspaceApp from './AiSquadWorkspaceApp'
import { squadDashboardPage, squadPageLoaders } from './pages'
import { readWorkspaceIdFromLocation } from '../../lib/location-state'
import SquadWorkspaceTools from './SquadWorkspaceTools'
import { useAuthSession } from '../../lib/useAuthSession'
import { navigateTo } from '../../lib/spa-navigation'
import { projectApiRequest } from '../project/api'

type SquadPagePath = keyof typeof squadPageLoaders

const squadPages = {
  '/squad-dashboard': squadDashboardPage,
  '/squad-blueprint': lazy(squadPageLoaders['/squad-blueprint']),
  '/squad-workspace': lazy(squadPageLoaders['/squad-workspace']),
  '/squad-review': lazy(squadPageLoaders['/squad-review']),
  '/squad-erd': lazy(squadPageLoaders['/squad-erd']),
  '/squad-api': lazy(squadPageLoaders['/squad-api']),
  '/squad-schedule': lazy(squadPageLoaders['/squad-schedule']),
  '/squad-files': lazy(squadPageLoaders['/squad-files']),
  '/squad-meeting': lazy(squadPageLoaders['/squad-meeting']),
  '/squad-interview': lazy(squadPageLoaders['/squad-interview']),
  '/squad-settings': lazy(squadPageLoaders['/squad-settings']),
}

const pageTitles: Record<SquadPagePath, string> = {
  '/squad-dashboard': 'DevPath - 스쿼드 대시보드',
  '/squad-blueprint': 'DevPath - AI 설계서',
  '/squad-workspace': 'DevPath - 작업 현황판',
  '/squad-review': 'DevPath - 코드 피드백',
  '/squad-erd': 'DevPath - ERD 설계',
  '/squad-api': 'DevPath - API 명세서',
  '/squad-schedule': 'DevPath - 일정 관리',
  '/squad-files': 'DevPath - 팀 자료실',
  '/squad-meeting': 'DevPath - 음성 회의',
  '/squad-interview': 'DevPath - 면접 준비',
  '/squad-settings': 'DevPath - 스쿼드 설정',
}

function getCurrentSquadPagePath(): SquadPagePath {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
  return pathname in squadPageLoaders ? pathname as SquadPagePath : '/squad-dashboard'
}

export default function SquadHubApp() {
  const currentPath = getCurrentSquadPagePath()
  const aiFromUrl = new URLSearchParams(window.location.search).get('ai') === '1'
  const workspaceId = readWorkspaceIdFromLocation()
  const [session] = useAuthSession()
  const scope = `${session?.userId}:${workspaceId}`
  const [layout, setLayout] = useState<{ scope: string; aiWorkspace: boolean; failed: boolean } | null>(null)
  const [retry, setRetry] = useState(0)
  const needsLayoutLookup = Boolean(workspaceId && session?.accessToken && !aiFromUrl)
  const resolvedLayout = layout?.scope === scope ? layout : null
  const aiWorkspace = aiFromUrl || Boolean(needsLayoutLookup && resolvedLayout?.aiWorkspace)
  const [visitedPaths, setVisitedPaths] = useState<Set<SquadPagePath>>(() => new Set([currentPath]))
  const renderedPaths = visitedPaths.has(currentPath)
    ? visitedPaths
    : new Set([...visitedPaths, currentPath])

  useEffect(() => {
    if (!needsLayoutLookup) return
    const controller = new AbortController()
    setLayout(null)
    // 초대 직전의 가입 목록 캐시를 피하고 저장된 화면 유형을 확인해 팀원에게도 같은 레이아웃을 연다.
    void projectApiRequest<Array<{ projectId: number; dashboardUrl: string }>>(
      '/api/workspaces/hub/projects', { signal: controller.signal }, 'required', { cache: false },
    ).then((projects) => {
      if (controller.signal.aborted) return
      const project = projects.find((item) => item.projectId === workspaceId)
      const ai = Boolean(project && new URL(project.dashboardUrl, window.location.origin).searchParams.get('ai') === '1')
      setLayout({ scope, aiWorkspace: ai, failed: false })
      if (ai) {
        const url = new URL(window.location.href)
        url.searchParams.set('ai', '1')
        navigateTo(`${url.pathname}${url.search}${url.hash}`, { replace: true })
      }
    }).catch(() => {
      if (!controller.signal.aborted) setLayout({ scope, aiWorkspace: false, failed: true })
    })
    return () => controller.abort()
  }, [needsLayoutLookup, workspaceId, scope, retry])

  useEffect(() => {
    setVisitedPaths((current) => current.has(currentPath) ? current : new Set([...current, currentPath]))
    document.title = aiWorkspace && currentPath === '/squad-meeting'
      ? 'DevPath - 화상 회의'
      : pageTitles[currentPath]
  }, [aiWorkspace, currentPath])

  if (needsLayoutLookup && !resolvedLayout) return <RouteLoadingView />
  if (needsLayoutLookup && resolvedLayout?.failed) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F9FA]">
      <p role="alert" className="text-sm font-bold text-gray-600">워크스페이스 정보를 불러오지 못했습니다.</p>
      <button type="button" onClick={() => setRetry((current) => current + 1)} className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700">다시 시도</button>
    </main>
  )

  return <>
    {aiWorkspace ? <AiSquadWorkspaceApp /> : Array.from(renderedPaths).map((path) => {
      const Page = squadPages[path]

      return (
        <div key={path} className={path === currentPath ? 'contents' : 'hidden'} aria-hidden={path !== currentPath}>
          <RouteErrorBoundary resetKey={path}>
            <Suspense fallback={null}>
              <Page />
            </Suspense>
          </RouteErrorBoundary>
        </div>
      )
    })}
    {workspaceId ? <SquadWorkspaceTools key={workspaceId} workspaceId={workspaceId} /> : null}
  </>
}
