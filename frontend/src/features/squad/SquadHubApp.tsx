import { lazy, Suspense, useEffect, useState } from 'react'
import { RouteErrorBoundary } from '../../components/AppRouteStates'
import AiSquadWorkspaceApp from './AiSquadWorkspaceApp'
import { squadDashboardPage, squadPageLoaders } from './pages'

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
  const aiWorkspace = new URLSearchParams(window.location.search).get('ai') === '1'
  const [visitedPaths, setVisitedPaths] = useState<Set<SquadPagePath>>(() => new Set([currentPath]))
  const renderedPaths = visitedPaths.has(currentPath)
    ? visitedPaths
    : new Set([...visitedPaths, currentPath])

  useEffect(() => {
    setVisitedPaths((current) => current.has(currentPath) ? current : new Set([...current, currentPath]))
    document.title = aiWorkspace && currentPath === '/squad-meeting'
      ? 'DevPath - 화상 회의'
      : pageTitles[currentPath]
  }, [aiWorkspace, currentPath])

  if (aiWorkspace) {
    return <AiSquadWorkspaceApp />
  }

  return Array.from(renderedPaths).map((path) => {
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
  })
}
