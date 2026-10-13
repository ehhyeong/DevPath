import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateCachedQueries } from '../../lib/memory-query-cache'
import { projectApiRequest } from './api'

const auth = vi.hoisted(() => ({ session: { userId: 77, accessToken: 'test-token', tokenType: 'Bearer' } }))
vi.mock('../../lib/auth-session', () => ({
  readStoredAuthSession: () => auth.session,
  refreshStoredAuthSession: async () => auth.session,
  expireStoredAuthSession: vi.fn(),
}))

describe('프로젝트 조회 캐시', () => {
  beforeEach(() => {
    invalidateCachedQueries()
    auth.session.userId = 77
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, data: { title: 'DB 조회 결과' } }), { status: 200 })))
  })

  it('팀채팅의 캐시 우회 조회가 다른 페이지의 정상 조회 결과를 삭제하지 않는다', async () => {
    const path = '/api/workspaces/42/tasks'
    await projectApiRequest(path, {}, 'required')
    await projectApiRequest('/api/lounge/chats/messages?loungeId=42', {}, 'required', { cache: false })
    await projectApiRequest(path, {}, 'required')
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === path)).toHaveLength(1)
  })

  it('작업 저장 후에는 DB에서 다시 조회하고 다른 사용자의 결과를 재사용하지 않는다', async () => {
    const path = '/api/workspaces/42/tasks'
    await projectApiRequest(path, {}, 'required')
    await projectApiRequest(path, { method: 'POST', body: '{}' }, 'required')
    await projectApiRequest(path, {}, 'required')
    auth.session.userId = 88
    await projectApiRequest(path, {}, 'required')
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('워크스페이스의 조회 결과는 30초가 지나면 DB에서 다시 가져온다', async () => {
    vi.useFakeTimers()
    try {
      await projectApiRequest('/api/workspaces/42/tasks', {}, 'required')
      vi.advanceTimersByTime(29_000)
      await projectApiRequest('/api/workspaces/42/tasks', {}, 'required')
      expect(fetch).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(1001)
      await projectApiRequest('/api/workspaces/42/tasks', {}, 'required')
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally { vi.useRealTimers() }
  })
})
