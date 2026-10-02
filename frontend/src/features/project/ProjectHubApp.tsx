import { lazy, Suspense, useEffect, useState } from 'react'

const projectHubPageLoaders = {
  '/lounge-dashboard': () => import('../community/LoungeDashboardApp'),
  '/community-lounge': () => import('../community/CommunityLoungeApp'),
  '/mentoring-hub': () => import('../mentoring/MentoringHubApp'),
  '/workspace-hub': () => import('./WorkspaceHubApp'),
  '/dev-showcase': () => import('../community/DevShowcaseApp'),
}

type ProjectHubPath = keyof typeof projectHubPageLoaders

const projectHubPages = {
  '/lounge-dashboard': lazy(projectHubPageLoaders['/lounge-dashboard']),
  '/community-lounge': lazy(projectHubPageLoaders['/community-lounge']),
  '/mentoring-hub': lazy(projectHubPageLoaders['/mentoring-hub']),
  '/workspace-hub': lazy(projectHubPageLoaders['/workspace-hub']),
  '/dev-showcase': lazy(projectHubPageLoaders['/dev-showcase']),
}

const pageTitles: Record<ProjectHubPath, string> = {
  '/lounge-dashboard': 'DevPath - 프로젝트 라운지',
  '/community-lounge': 'DevPath - 팀 찾기 라운지',
  '/mentoring-hub': 'DevPath - 멘토링 찾기',
  '/workspace-hub': 'DevPath - 워크스페이스 허브',
  '/dev-showcase': 'DevPath - 런칭 쇼케이스',
}

function getCurrentProjectHubPath(): ProjectHubPath {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
  return pathname in projectHubPageLoaders ? pathname as ProjectHubPath : '/lounge-dashboard'
}

export function preloadProjectHubPage(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const pagePath = normalizedPathname in projectHubPageLoaders
    ? normalizedPathname as ProjectHubPath
    : '/lounge-dashboard'

  return projectHubPageLoaders[pagePath]()
}

function ProjectHubPageLoadingView() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#F8F9FA] text-sm font-semibold text-gray-500" role="status">
      <i className="fas fa-circle-notch fa-spin mr-2 text-[#00c471]" aria-hidden="true" />
      프로젝트 화면을 준비하는 중입니다.
    </div>
  )
}

export default function ProjectHubApp() {
  const currentPath = getCurrentProjectHubPath()
  const [visitedPaths, setVisitedPaths] = useState<Set<ProjectHubPath>>(() => new Set([currentPath]))
  const renderedPaths = visitedPaths.has(currentPath)
    ? visitedPaths
    : new Set([...visitedPaths, currentPath])

  useEffect(() => {
    setVisitedPaths((current) => current.has(currentPath) ? current : new Set([...current, currentPath]))
    document.title = pageTitles[currentPath]
  }, [currentPath])

  return Array.from(renderedPaths).map((path) => {
    const Page = projectHubPages[path]

    return (
      <div key={path} className={path === currentPath ? 'contents' : 'hidden'} aria-hidden={path !== currentPath}>
        <Suspense fallback={<ProjectHubPageLoadingView />}>
          <Page />
        </Suspense>
      </div>
    )
  })
}
