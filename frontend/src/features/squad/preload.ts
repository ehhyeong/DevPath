import { getWorkspaceAiDesign, projectApiRequest } from '../project/api'
import { squadPageLoaders } from './pages'
import { initializeWorkspaceAi } from './ai-workspace-bootstrap'

const pageDataPaths: Record<string, string[]> = {
  '/squad-dashboard': ['tasks', 'calendar-events'],
  '/squad-blueprint': ['interview/questions'],
  '/squad-workspace': ['tasks', 'api-spec'],
  '/squad-review': ['integrations', 'code-reviews'],
  '/squad-erd': ['erd', 'erd/versions', 'erd/comments'],
  '/squad-api': ['tasks', 'api-spec'],
  '/squad-schedule': ['calendar-events'],
  '/squad-files': ['files', 'files/storage'],
  '/squad-meeting': ['voice-channels'],
  '/squad-interview': ['tasks', 'interview/questions', 'interview/practice', 'api-spec', 'erd'],
  '/squad-settings': ['settings', 'integrations'],
}

export async function preloadSquadWorkspace(workspaceId: number, pathname: string, aiWorkspace = false) {
  const workspacePath = `/api/workspaces/${workspaceId}`
  const loadPage = squadPageLoaders[pathname as keyof typeof squadPageLoaders]
  if (!loadPage) return
  const dataPaths = ['dashboard', ...(pageDataPaths[pathname] ?? [])].map((path) => `${workspacePath}/${path}`)
  const prepareData = async () => {
    // 초기화 뒤에 조회해야 새 문서·작업을 캐시에 담으며, 카드 클릭도 같은 초기화 요청을 공유한다.
    if (aiWorkspace && pathname !== '/squad-files') await initializeWorkspaceAi(workspaceId)
    await Promise.allSettled([
      ...dataPaths.map((path) => projectApiRequest<unknown>(path, {}, 'required')),
      ...(aiWorkspace ? [getWorkspaceAiDesign(workspaceId)] : []),
    ])
  }

  // 다른 메뉴의 대량 조회가 목적지 요청과 DB 커넥션을 경쟁하지 않도록 목적지만 예열한다.
  await Promise.allSettled([
    loadPage(),
    prepareData(),
  ])
}
