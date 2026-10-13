import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWorkspaceAiDesign, projectApiRequest } from '../project/api'
import { preloadSquadWorkspace } from './preload'
import { invalidateCachedQueries } from '../../lib/memory-query-cache'

vi.mock('../project/api', () => ({ projectApiRequest: vi.fn(async () => []), getWorkspaceAiDesign: vi.fn(async () => ({})) }))
vi.mock('./pages', () => ({ squadPageLoaders: {
  '/squad-dashboard': vi.fn(async () => ({})),
  '/squad-workspace': vi.fn(async () => ({})),
  '/squad-files': vi.fn(async () => ({})),
  '/squad-interview': vi.fn(async () => ({})),
} }))

describe('스쿼드 목적지 사전 조회', () => {
  beforeEach(() => { vi.clearAllMocks(); invalidateCachedQueries() })

  it('자료실 이동은 자료실과 공통 헤더 데이터만 조회한다', async () => {
    await preloadSquadWorkspace(42, '/squad-files')
    expect(vi.mocked(projectApiRequest).mock.calls.map(([path]) => path)).toEqual([
      '/api/workspaces/42/dashboard', '/api/workspaces/42/files', '/api/workspaces/42/files/storage',
    ])
    expect(getWorkspaceAiDesign).not.toHaveBeenCalled()
  })

  it('AI 작업 현황판에는 작업·API와 설계를 미리 조회하고 다른 메뉴는 조회하지 않는다', async () => {
    await preloadSquadWorkspace(42, '/squad-workspace', true)
    expect(vi.mocked(projectApiRequest).mock.calls.map(([path]) => path)).toEqual([
      '/api/workspaces/hub/projects/42/ai-design/initialize',
      '/api/workspaces/42/dashboard', '/api/workspaces/42/tasks', '/api/workspaces/42/api-spec',
    ])
    expect(getWorkspaceAiDesign).toHaveBeenCalledWith(42)
  })

  it('AI 대시보드 카드 준비는 핵심 조회만 예열하고 부가 위젯은 실제 화면에 맡긴다', async () => {
    await preloadSquadWorkspace(42, '/squad-dashboard', true)
    expect(vi.mocked(projectApiRequest).mock.calls.map(([path]) => path)).toEqual([
      '/api/workspaces/hub/projects/42/ai-design/initialize',
      '/api/workspaces/42/dashboard', '/api/workspaces/42/tasks', '/api/workspaces/42/calendar-events',
    ])
    expect(getWorkspaceAiDesign).toHaveBeenCalledWith(42)
  })

  it('면접 사전 조회는 질문과 개인 기록을 우선하고 작업·API·ERD 조회는 뒤로 미룬다', async () => {
    await preloadSquadWorkspace(42, '/squad-interview', true)
    expect(vi.mocked(projectApiRequest).mock.calls.map(([path]) => path)).toEqual([
      '/api/workspaces/hub/projects/42/ai-design/initialize', '/api/workspaces/42/dashboard',
      '/api/workspaces/42/interview/questions', '/api/workspaces/42/interview/practice',
    ])
  })
})
