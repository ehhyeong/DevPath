import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateCachedQueries } from '../../lib/memory-query-cache'
import { invalidateProjectApiCache, projectApiRequest } from '../project/api'
import { initializeWorkspaceAi } from './ai-workspace-bootstrap'

const auth = vi.hoisted(() => ({ userId: 77 }))
vi.mock('../../lib/auth-session', () => ({ refreshStoredAuthSession: async () => auth }))
vi.mock('../project/api', async (importOriginal) => ({ ...await importOriginal<typeof import('../project/api')>(), projectApiRequest: vi.fn(async () => null) }))

describe('AI 첫 진입 초기화 공유', () => {
  beforeEach(() => {
    invalidateCachedQueries()
    auth.userId = 77
    vi.mocked(projectApiRequest).mockReset().mockResolvedValue(null)
  })

  it('카드 예열과 화면 진입이 진행 중 초기화를 공유하고 조회 무효화 뒤에도 재초기화하지 않는다', async () => {
    let finish!: () => void
    vi.mocked(projectApiRequest).mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve(null) }))
    const preload = initializeWorkspaceAi(42)
    const entry = initializeWorkspaceAi(42)
    await Promise.resolve()
    expect(projectApiRequest).toHaveBeenCalledTimes(1)
    finish()
    await Promise.all([preload, entry])
    invalidateProjectApiCache()
    await initializeWorkspaceAi(42)
    expect(projectApiRequest).toHaveBeenCalledTimes(1)
  })

  it('다른 사용자와 프로젝트는 별도 초기화하고 실패한 요청은 재시도한다', async () => {
    vi.mocked(projectApiRequest).mockRejectedValueOnce(new Error('초기화 실패'))
    await expect(initializeWorkspaceAi(42)).rejects.toThrow('초기화 실패')
    await initializeWorkspaceAi(42)
    await initializeWorkspaceAi(43)
    auth.userId = 88
    await initializeWorkspaceAi(42)
    expect(projectApiRequest).toHaveBeenCalledTimes(4)
  })
})
