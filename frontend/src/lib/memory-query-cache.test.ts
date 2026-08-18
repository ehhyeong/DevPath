import { beforeEach,describe,expect,it,vi } from 'vitest'
import { getCachedQuery,invalidateCachedQueries } from './memory-query-cache'

describe('memory query cache', () => {
  beforeEach(() => {
    invalidateCachedQueries()
    vi.useRealTimers()
  })

  it('같은 키의 진행 중 요청과 TTL 안의 결과를 재사용한다', async () => {
    const load = vi.fn(async () => ({ name: 'DevPath' }))

    const first = getCachedQuery('profile', load, { ttlMs: 1000 })
    const second = getCachedQuery('profile', load, { ttlMs: 1000 })

    await expect(Promise.all([first, second])).resolves.toEqual([
      { name: 'DevPath' },
      { name: 'DevPath' },
    ])
    await expect(getCachedQuery('profile', load, { ttlMs: 1000 })).resolves.toEqual({ name: 'DevPath' })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('호출자 취소가 공유 요청과 다른 호출자를 취소하지 않는다', async () => {
    const controller = new AbortController()
    let resolveLoad: ((value: number) => void) | undefined
    const load = vi.fn(() => new Promise<number>((resolve) => {
      resolveLoad = resolve
    }))

    const cancelled = getCachedQuery('summary', load, { signal: controller.signal })
    const active = getCachedQuery('summary', load)
    controller.abort()
    resolveLoad?.(7)

    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    await expect(active).resolves.toBe(7)
    expect(load).toHaveBeenCalledTimes(1)
  })
})
